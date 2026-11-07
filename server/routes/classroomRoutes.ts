import { Express } from 'express';
import {
  authenticateBearerRequest,
  checkJoinClassRateLimit,
  checkSharedRateLimit,
  isEmailInTeacherAllowlist,
  isTeacherUserAuthorized,
  RATE_LIMIT_SCOPES,
  resolveClientIp,
} from '../middleware/authAndRateLimitMiddleware';
import {
  generateServerRandomCode,
  getActiveServerStore,
} from '../services/storeAndGradingService';

export function registerClassroomRoutes(app: Express): void {
  /**
   * 4A. Teacher Bootstrap Route: POST /api/teachers/bootstrap
   * Verifies that the authenticated user's email is verified (`emailVerified === true`)
   * AND present in TEACHER_EMAIL_ALLOWLIST, sets custom claim `role = 'teacher'`,
   * and creates/updates `/teachers/{uid}`.
   */
  app.post('/api/teachers/bootstrap', async (req, res) => {
    const verifiedUser = await authenticateBearerRequest(req, res);
    if (!verifiedUser) return;

    const rateKey = `${verifiedUser.uid}:${resolveClientIp(req)}`;
    const bootstrapRate = await checkSharedRateLimit({
      scope: 'teacher_bootstrap',
      key: rateKey,
      maxRequests: RATE_LIMIT_SCOPES.teacher_bootstrap.maxRequests,
      windowMs: RATE_LIMIT_SCOPES.teacher_bootstrap.windowMs,
      memoryCheck: () => checkJoinClassRateLimit(`bootstrap:${rateKey}`),
    });
    if (!bootstrapRate.allowed) {
      res.status(429).json({
        error: 'Bạn đã gửi quá nhiều yêu cầu xác thực Giảng viên. Vui lòng thử lại sau ít phút.',
      });
      return;
    }

    const email = (verifiedUser.email || '').trim().toLowerCase();
    if (verifiedUser.emailVerified !== true) {
      res.status(403).json({
        error: 'Email tài khoản chưa được xác thực (yêu cầu emailVerified === true).',
      });
      return;
    }
    if (!isEmailInTeacherAllowlist(email)) {
      res.status(403).json({
        error: `Email "${email || '(ẩn danh)'}" không nằm trong danh sách Giảng viên được cấp phép (TEACHER_EMAIL_ALLOWLIST).`,
      });
      return;
    }

    const activeServerStore = getActiveServerStore();
    try {
      await activeServerStore.setTeacherCustomClaim(verifiedUser.uid);
      const nowIso = new Date().toISOString();
      const displayName = String(
        req.body?.displayName || verifiedUser.name || email.split('@')[0] || 'Giảng viên HANU'
      )
        .trim()
        .slice(0, 120);

      const teacherDoc = {
        uid: verifiedUser.uid,
        email,
        displayName,
        role: 'teacher',
        updatedAt: nowIso,
      };

      await activeServerStore.setDoc(`teachers/${verifiedUser.uid}`, teacherDoc, { merge: true });

      res.status(200).json({
        ok: true,
        role: 'teacher',
        teacher: teacherDoc,
      });
    } catch (err) {
      console.error('[server] /api/teachers/bootstrap error', err);
      res.status(500).json({
        error: 'Không thể thiết lập quyền Giảng viên lúc này. Vui lòng thử lại sau.',
      });
    }
  });

  /**
   * 4B. Server-Mediated Class Joining Route: POST /api/classes/join
   * Body: { joinCode: string, studentCode?: string }
   * Uses an atomic transaction (`claimStudentSlotTransaction`) to verify joinCode -> classId,
   * enforce studentCode slot uniqueness against race conditions, and write `classes/{classId}/students/{uid}`.
   */
  app.post('/api/classes/join', async (req, res) => {
    const verifiedUser = await authenticateBearerRequest(req, res);
    if (!verifiedUser) return;

    const rateKey = `${verifiedUser.uid}:${resolveClientIp(req)}`;
    const joinRate = await checkSharedRateLimit({
      scope: 'join_class',
      key: rateKey,
      maxRequests: RATE_LIMIT_SCOPES.join_class.maxRequests,
      windowMs: RATE_LIMIT_SCOPES.join_class.windowMs,
      memoryCheck: () => checkJoinClassRateLimit(rateKey),
    });
    if (!joinRate.allowed) {
      res.status(429).json({
        error: 'Bạn đã thử nhập mã lớp quá nhiều lần. Vui lòng đợi 10 phút trước khi thử lại.',
      });
      return;
    }

    const cleanJoinCode = String(req.body?.joinCode || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');
    const cleanStudentCode = String(req.body?.studentCode || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');

    if (cleanJoinCode.length < 6 || cleanJoinCode.length > 32) {
      res.status(400).json({
        error: 'Mã lớp (joinCode) không hợp lệ (tối thiểu 6 ký tự).',
      });
      return;
    }

    const activeServerStore = getActiveServerStore();
    try {
      const nowIso = new Date().toISOString();
      if (typeof activeServerStore.claimStudentSlotTransaction === 'function') {
        const txResult = await activeServerStore.claimStudentSlotTransaction({
          joinCode: cleanJoinCode,
          studentCode: cleanStudentCode,
          uid: verifiedUser.uid,
          userName: verifiedUser.name,
          nowIso,
        });

        if (txResult.status === 'error') {
          res.status(txResult.httpStatus).json({ error: txResult.error });
          return;
        }

        res.status(200).json({
          classroom: txResult.classroom,
          studentRecord: txResult.studentRecord,
        });
        return;
      }

      res.status(500).json({
        error: 'Cơ chế giao dịch nhận lớp chưa sẵn sàng.',
      });
    } catch (err) {
      console.error('[server] /api/classes/join error', err);
      res.status(500).json({
        error: 'Không thể tham gia lớp học lúc này. Vui lòng thử lại sau.',
      });
    }
  });

  /**
   * 4C. Teacher Reset / Re-issue Student Code Slot:
   * POST /api/classes/:classId/students/:studentCode/reset-slot
   * Allows the class teacher to unbind `studentUid` (and optionally regenerate a new random 6-char code)
   * when a student changes devices.
   */
  app.post('/api/classes/:classId/students/:studentCode/reset-slot', async (req, res) => {
    const verifiedUser = await authenticateBearerRequest(req, res);
    if (!verifiedUser) return;

    const rateKey = `${verifiedUser.uid}:${resolveClientIp(req)}`;
    const resetRate = await checkSharedRateLimit({
      scope: 'reset_student_slot',
      key: rateKey,
      maxRequests: RATE_LIMIT_SCOPES.reset_student_slot.maxRequests,
      windowMs: RATE_LIMIT_SCOPES.reset_student_slot.windowMs,
    });
    if (!resetRate.allowed) {
      res.status(429).json({
        error: 'Bạn đã gửi quá nhiều yêu cầu cấp lại mã học viên. Vui lòng thử lại sau ít phút.',
      });
      return;
    }

    if (!(await isTeacherUserAuthorized(verifiedUser))) {
      res.status(403).json({
        error:
          'Forbidden: Tài khoản Giảng viên chưa được cấp quyền hoặc đã bị thu hồi khỏi TEACHER_EMAIL_ALLOWLIST.',
      });
      return;
    }

    const classId = String(req.params.classId || '').trim();
    const targetCode = String(req.params.studentCode || '')
      .trim()
      .toUpperCase();
    const regenerateCode = Boolean(req.body?.regenerateCode);

    if (!classId || !targetCode) {
      res.status(400).json({ error: 'Thiếu classId hoặc studentCode.' });
      return;
    }

    const activeServerStore = getActiveServerStore();
    try {
      const classData = await activeServerStore.getDoc(`classes/${classId}`);
      if (!classData || classData.teacherUid !== verifiedUser.uid) {
        res.status(403).json({
          error: 'Forbidden: Chỉ Giảng viên chủ nhiệm lớp mới có quyền cấp lại mã học viên.',
        });
        return;
      }

      const allStudentDocs = await activeServerStore.listCollection(
        `classes/${classId}/students`
      );
      const matchingDocs = allStudentDocs.filter(
        (d) => String(d.data.studentCode || '').toUpperCase() === targetCode
      );

      if (matchingDocs.length === 0) {
        res.status(404).json({ error: `Không tìm thấy mã học viên "${targetCode}" trong lớp.` });
        return;
      }

      const nextStudentCode = regenerateCode ? generateServerRandomCode('HV', 6) : targetCode;
      const nowIso = new Date().toISOString();
      let baseRecord = matchingDocs[0].data;

      for (const docItem of matchingDocs) {
        const oldUid = String(docItem.data.studentUid || '').trim();
        if (oldUid && docItem.id === oldUid) {
          baseRecord = docItem.data;
          await activeServerStore.deleteDoc(`classes/${classId}/students/${oldUid}`);
        } else {
          await activeServerStore.deleteDoc(`classes/${classId}/students/${docItem.id}`);
        }
      }

      // Clear previous studentCode lock so the re-issued slot can be claimed cleanly
      await activeServerStore.deleteDoc(`classes/${classId}/studentCodeLocks/${targetCode}`);
      if (nextStudentCode !== targetCode) {
        await activeServerStore.deleteDoc(`classes/${classId}/studentCodeLocks/${nextStudentCode}`);
      }

      const newSlotId = `slot-${nextStudentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      const updatedSlot = {
        ...baseRecord,
        studentUid: '',
        studentCode: nextStudentCode,
        updatedAt: nowIso,
      };

      await activeServerStore.setDoc(`classes/${classId}/students/${newSlotId}`, updatedSlot);

      res.status(200).json({
        ok: true,
        previousStudentCode: targetCode,
        studentCode: nextStudentCode,
        slotId: newSlotId,
      });
    } catch (err) {
      console.error('[server] reset-slot error', err);
      res.status(500).json({
        error: 'Không thể cấp lại mã học viên lúc này. Vui lòng thử lại sau.',
      });
    }
  });

  /**
   * 4D-Start. Server-Side Assignment Timer Start Route: POST /api/assignments/start
   * Body: { classId, assignmentId }
   * Records an authoritative server-side `startedAtMs` timestamp at
   * `classes/{classId}/assignmentStarts/{assignmentId}_{uid}` so `/api/submissions`
   * computes elapsed `timeSeconds` without trusting client-reported timers.
   */
  app.post('/api/assignments/start', async (req, res) => {
    const verifiedUser = await authenticateBearerRequest(req, res);
    if (!verifiedUser) return;

    const rateKey = `${verifiedUser.uid}:${resolveClientIp(req)}`;
    const startRate = await checkSharedRateLimit({
      scope: 'assignment_start',
      key: rateKey,
      maxRequests: RATE_LIMIT_SCOPES.assignment_start.maxRequests,
      windowMs: RATE_LIMIT_SCOPES.assignment_start.windowMs,
    });
    if (!startRate.allowed) {
      res.status(429).json({
        error: 'Bạn đã gửi quá nhiều yêu cầu bắt đầu làm bài. Vui lòng đợi 1 phút trước khi thử lại.',
      });
      return;
    }

    const classId = String(req.body?.classId || '').trim();
    const assignmentId = String(req.body?.assignmentId || 'default-assignment').trim();

    if (!classId || !/^[a-zA-Z0-9_-]{1,128}$/.test(classId)) {
      res.status(400).json({ error: 'classId không hợp lệ.' });
      return;
    }
    if (!assignmentId || !/^[a-zA-Z0-9_-]{1,128}$/.test(assignmentId)) {
      res.status(400).json({ error: 'assignmentId không hợp lệ.' });
      return;
    }

    const activeServerStore = getActiveServerStore();
    try {
      const studentDoc = await activeServerStore.getDoc(
        `classes/${classId}/students/${verifiedUser.uid}`
      );
      if (!studentDoc) {
        res.status(403).json({
          error: 'Forbidden: Bạn chưa tham gia lớp học này.',
        });
        return;
      }

      const startId = `${assignmentId}_${verifiedUser.uid}`;
      const startPath = `classes/${classId}/assignmentStarts/${startId}`;
      const existingStart = await activeServerStore.getDoc(startPath);
      const existingSub = await activeServerStore.getDoc(
        `classes/${classId}/submissions/${startId}`
      );

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();

      // Preserve initial start time if an active unsubmitted session already exists
      if (existingStart && Number(existingStart.startedAtMs || 0) > 0 && !existingSub) {
        res.status(200).json({
          ok: true,
          classId,
          assignmentId,
          startedAtMs: Number(existingStart.startedAtMs),
          startedAt: String(existingStart.startedAt || nowIso),
        });
        return;
      }

      await activeServerStore.setDoc(startPath, {
        classId,
        assignmentId,
        studentUid: verifiedUser.uid,
        startedAtMs: nowMs,
        startedAt: nowIso,
      });

      res.status(200).json({
        ok: true,
        classId,
        assignmentId,
        startedAtMs: nowMs,
        startedAt: nowIso,
      });
    } catch (err) {
      console.error('[server] /api/assignments/start error', err);
      res.status(500).json({
        error: 'Không thể khởi tạo phiên làm bài lúc này.',
      });
    }
  });

  /**
   * 4D. Server-Side Homework Grading Route: POST /api/submissions
   * Body: { classId, assignmentId, answers }
   * Executes a single atomic transaction (`submitAssignmentTransaction`) that verifies
   * student membership, checks `attemptCount < maxAttempts`, grades against
   * `classes/{classId}/answerKeys/{assignmentId}`, computes server-authoritative `timeSeconds`,
   * and writes `submissions`, `leaderboard`, and `students`.
   */
  app.post('/api/submissions', async (req, res) => {
    const verifiedUser = await authenticateBearerRequest(req, res);
    if (!verifiedUser) return;

    const classId = String(req.body?.classId || '').trim();
    const assignmentId = String(req.body?.assignmentId || 'default-assignment').trim();
    const answers =
      req.body?.answers && typeof req.body.answers === 'object'
        ? (req.body.answers as Record<string, any>)
        : null;

    if (!classId || !/^[a-zA-Z0-9_-]{1,128}$/.test(classId)) {
      res.status(400).json({ error: 'classId không hợp lệ.' });
      return;
    }
    if (!assignmentId || !/^[a-zA-Z0-9_-]{1,128}$/.test(assignmentId)) {
      res.status(400).json({ error: 'assignmentId không hợp lệ.' });
      return;
    }
    if (!answers) {
      res.status(400).json({ error: 'Thiếu dữ liệu bài làm (answers).' });
      return;
    }

    const activeServerStore = getActiveServerStore();
    try {
      const configuredMax = Number(process.env.MAX_SUBMISSION_ATTEMPTS || 1);
      if (typeof activeServerStore.submitAssignmentTransaction === 'function') {
        const txResult = await activeServerStore.submitAssignmentTransaction({
          classId,
          assignmentId,
          uid: verifiedUser.uid,
          userName: verifiedUser.name,
          answers,
          configuredMaxAttempts: configuredMax,
          nowMs: Date.now(),
        });

        if (txResult.status === 'error') {
          res.status(txResult.httpStatus).json({ error: txResult.error });
          return;
        }

        res.status(200).json(txResult.payload);
        return;
      }

      res.status(500).json({
        error: 'Cơ chế giao dịch chấm bài chưa sẵn sàng.',
      });
    } catch (err) {
      console.error('[server] /api/submissions error', err);
      res.status(500).json({
        error: 'Không thể chấm bài trên server lúc này. Vui lòng thử lại sau.',
      });
    }
  });
}
