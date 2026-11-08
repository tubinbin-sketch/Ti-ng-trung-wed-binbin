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
import { getActiveServerStore } from '../services/storeAndGradingService';

function sanitizeClientSubmittedAnswers(rawAnswers: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  const forbiddenKeys = new Set([
    '__proto__',
    'constructor',
    'prototype',
    'answerKey',
    'vocabScore',
    'writingScore',
    'quizScore',
    'totalPoints',
    'attemptCount',
    'maxAttempts',
    'status',
    'timeSeconds',
    'teacherUid',
  ]);
  for (const [key, value] of Object.entries(rawAnswers)) {
    if (forbiddenKeys.has(key)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

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
      res.status(bootstrapRate.httpStatus || 429).json({
        error:
          bootstrapRate.error ||
          'Bạn đã gửi quá nhiều yêu cầu xác thực Giảng viên. Vui lòng thử lại sau ít phút.',
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
      res.status(joinRate.httpStatus || 429).json({
        error:
          joinRate.error ||
          'Bạn đã thử nhập mã lớp quá nhiều lần. Vui lòng đợi 10 phút trước khi thử lại.',
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
   * 4C. Teacher Reset / Re-issue Student Code Slot (P1 Atomic Transaction):
   * POST /api/classes/:classId/students/:studentCode/reset-slot
   * Atomically unbinds `studentUid`, enforces `studentCode` uniqueness, updates locks,
   * and preserves all student submission/score/learning history.
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
      res.status(resetRate.httpStatus || 429).json({
        error:
          resetRate.error ||
          'Bạn đã gửi quá nhiều yêu cầu cấp lại mã học viên. Vui lòng thử lại sau ít phút.',
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
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');
    const regenerateCode = Boolean(req.body?.regenerateCode);
    const requestedNewCode =
      typeof req.body?.newStudentCode === 'string' ? req.body.newStudentCode.trim() : undefined;

    if (
      !classId ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(classId) ||
      !targetCode ||
      targetCode.length > 32
    ) {
      res.status(400).json({ error: 'Thiếu hoặc sai định dạng classId / studentCode.' });
      return;
    }

    const activeServerStore = getActiveServerStore();
    try {
      if (typeof activeServerStore.resetStudentSlotTransaction === 'function') {
        const txResult = await activeServerStore.resetStudentSlotTransaction({
          classId,
          targetStudentCode: targetCode,
          teacherUid: verifiedUser.uid,
          regenerateCode,
          requestedNewCode,
          nowIso: new Date().toISOString(),
        });

        if (txResult.status === 'error') {
          res.status(txResult.httpStatus).json({ error: txResult.error });
          return;
        }

        res.status(200).json({
          ok: true,
          previousStudentCode: txResult.previousStudentCode,
          studentCode: txResult.studentCode,
          slotId: txResult.slotId,
          preservedRecord: txResult.preservedRecord,
        });
        return;
      }

      res.status(500).json({
        error: 'Cơ chế giao dịch cấp lại mã học viên chưa sẵn sàng.',
      });
    } catch (err) {
      console.error('[server] reset-slot error', err);
      res.status(500).json({
        error: 'Không thể cấp lại mã học viên lúc này. Vui lòng thử lại sau.',
      });
    }
  });

  /**
   * 4D-Start. Server-Side Assignment Timer Start Route (P1 Hardened):
   * POST /api/assignments/start
   * Body: { classId, assignmentId }
   * Verifies student enrollment, assignment existence, teacher ownership, active status,
   * and records an authoritative server-side `startedAtMs` timestamp at
   * `classes/{classId}/assignmentStarts/{assignmentId}_{uid}`.
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
      res.status(startRate.httpStatus || 429).json({
        error:
          startRate.error ||
          'Bạn đã gửi quá nhiều yêu cầu bắt đầu làm bài. Vui lòng đợi 1 phút trước khi thử lại.',
      });
      return;
    }

    if (
      req.body?.studentUid !== undefined &&
      String(req.body.studentUid).trim() !== '' &&
      String(req.body.studentUid).trim() !== verifiedUser.uid
    ) {
      res.status(403).json({
        error: 'Forbidden: Không được phép giả mạo studentUid của học viên khác.',
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
      if (typeof activeServerStore.startAssignmentTransaction === 'function') {
        const txResult = await activeServerStore.startAssignmentTransaction({
          classId,
          assignmentId,
          uid: verifiedUser.uid,
          nowMs: Date.now(),
        });

        if (txResult.status === 'error') {
          res.status(txResult.httpStatus).json({ error: txResult.error });
          return;
        }

        res.status(200).json({
          ok: true,
          classId: txResult.classId,
          assignmentId: txResult.assignmentId,
          startedAtMs: txResult.startedAtMs,
          startedAt: txResult.startedAt,
        });
        return;
      }

      res.status(500).json({
        error: 'Cơ chế khởi tạo phiên làm bài chưa sẵn sàng.',
      });
    } catch (err) {
      console.error('[server] /api/assignments/start error', err);
      res.status(500).json({
        error: 'Không thể khởi tạo phiên làm bài lúc này.',
      });
    }
  });

  /**
   * 4D. Server-Side Homework Grading Route (P1 Hardened): POST /api/submissions
   * Body: { classId, assignmentId, answers, submissionNonce? }
   * Executes a single atomic transaction (`submitAssignmentTransaction`) that verifies
   * student membership, assignment/answerKey ownership & active status, checks `attemptCount < maxAttempts`,
   * blocks replay nonces, grades against `classes/{classId}/answerKeys/{assignmentId}`,
   * computes server-authoritative `timeSeconds`, and writes `submissions`, `leaderboard`, and `students`.
   */
  app.post('/api/submissions', async (req, res) => {
    const verifiedUser = await authenticateBearerRequest(req, res);
    if (!verifiedUser) return;

    if (
      req.body?.studentUid !== undefined &&
      String(req.body.studentUid).trim() !== '' &&
      String(req.body.studentUid).trim() !== verifiedUser.uid
    ) {
      res.status(403).json({
        error: 'Forbidden: Không được phép nộp bài thay cho studentUid khác.',
      });
      return;
    }

    if (
      req.body?.answerKey !== undefined ||
      (req.body?.answers &&
        typeof req.body.answers === 'object' &&
        'answerKey' in req.body.answers)
    ) {
      res.status(400).json({
        error: 'Bad Request: Không chấp nhận answerKey do client gửi lên.',
      });
      return;
    }

    const classId = String(req.body?.classId || '').trim();
    const assignmentId = String(req.body?.assignmentId || 'default-assignment').trim();
    const rawAnswers =
      req.body?.answers &&
      typeof req.body.answers === 'object' &&
      !Array.isArray(req.body.answers)
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
    if (!rawAnswers) {
      res.status(400).json({ error: 'Thiếu dữ liệu bài làm (answers).' });
      return;
    }

    const answers = sanitizeClientSubmittedAnswers(rawAnswers);
    const rawNonce =
      typeof req.body?.submissionNonce === 'string'
        ? req.body.submissionNonce
        : typeof req.headers['x-submission-nonce'] === 'string'
        ? req.headers['x-submission-nonce']
        : '';
    const submissionNonce = rawNonce.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);

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
          submissionNonce: submissionNonce || undefined,
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

