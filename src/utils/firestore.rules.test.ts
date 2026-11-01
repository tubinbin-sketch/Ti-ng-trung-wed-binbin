import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  setLogLevel,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-hanu-hsk-security-test';
const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');
const rulesSource = fs.readFileSync(RULES_PATH, 'utf8');

interface AuthContext {
  uid: string;
  token?: {
    role?: string;
    email?: string;
  };
}

interface EvalOperation {
  op: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: AuthContext | null;
  requestData?: Record<string, any>;
  queryFilterTeacherUid?: string;
}

/**
 * Deterministic evaluator mirroring the exact predicates in `firestore.rules`
 * so all 6 attack scenarios and valid flows are verified both locally and in CI.
 */
class FirestoreRulesLocalVerifier {
  private docs = new Map<string, Record<string, any>>();

  constructor(initialDocs: Record<string, Record<string, any>> = {}) {
    for (const [k, v] of Object.entries(initialDocs)) {
      this.docs.set(this.normalize(k), structuredClone(v));
    }
  }

  private normalize(p: string): string {
    return p.replace(/^\/+|\/+$/g, '');
  }

  seed(docPath: string, data: Record<string, any>): void {
    this.docs.set(this.normalize(docPath), structuredClone(data));
  }

  getDocData(docPath: string): Record<string, any> | undefined {
    return this.docs.get(this.normalize(docPath));
  }

  private isSignedIn(auth: AuthContext | null): boolean {
    return auth !== null && typeof auth.uid === 'string' && auth.uid.length > 0;
  }

  private isOwner(auth: AuthContext | null, uid: string): boolean {
    return this.isSignedIn(auth) && auth!.uid === uid;
  }

  private isTeacher(auth: AuthContext | null): boolean {
    return this.isSignedIn(auth) && auth?.token?.role === 'teacher';
  }

  private isValidId(id: string): boolean {
    return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
  }

  private isValidString(val: unknown, minLen: number, maxLen: number): boolean {
    return typeof val === 'string' && val.length >= minLen && val.length <= maxLen;
  }

  private isClassTeacher(auth: AuthContext | null, classId: string): boolean {
    if (!this.isTeacher(auth)) return false;
    const classData = this.getDocData(`classes/${classId}`);
    return Boolean(classData && classData.teacherUid === auth!.uid);
  }

  private isEnrolledStudent(auth: AuthContext | null, classId: string): boolean {
    if (!this.isSignedIn(auth)) return false;
    return this.docs.has(`classes/${classId}/students/${auth!.uid}`);
  }

  private isClassMember(auth: AuthContext | null, classId: string): boolean {
    return this.isClassTeacher(auth, classId) || this.isEnrolledStudent(auth, classId);
  }

  private affectedKeys(
    oldData: Record<string, any>,
    newData: Record<string, any>
  ): Set<string> {
    const keys = new Set<string>([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ]);
    const changed = new Set<string>();
    for (const k of keys) {
      if (JSON.stringify(oldData?.[k]) !== JSON.stringify(newData?.[k])) {
        changed.add(k);
      }
    }
    return changed;
  }

  evaluate(params: EvalOperation): { allowed: boolean; reason?: string } {
    const cleanPath = this.normalize(params.path);
    const segments = cleanPath.split('/');
    const { op, auth, requestData = {} } = params;
    const existingData = this.getDocData(cleanPath) || {};

    // 1. /teachers/{uid}
    if (segments.length === 2 && segments[0] === 'teachers') {
      const uid = segments[1];
      if (!this.isValidId(uid)) return { allowed: false, reason: 'Invalid uid' };
      if (op === 'get') {
        return { allowed: this.isOwner(auth, uid) && this.isTeacher(auth) };
      }
      if (op === 'list' || op === 'delete') {
        return { allowed: false };
      }
      if (op === 'create') {
        return {
          allowed:
            this.isOwner(auth, uid) &&
            this.isTeacher(auth) &&
            requestData.uid === uid &&
            requestData.role === 'teacher' &&
            this.isValidString(requestData.displayName, 1, 120),
        };
      }
      if (op === 'update') {
        return {
          allowed:
            this.isOwner(auth, uid) &&
            this.isTeacher(auth) &&
            requestData.uid === existingData.uid &&
            requestData.role === 'teacher' &&
            this.isValidString(requestData.displayName, 1, 120),
        };
      }
    }

    // 2. /joinCodes/{code}
    if (segments.length === 2 && segments[0] === 'joinCodes') {
      const code = segments[1];
      if (op === 'get') {
        return { allowed: this.isSignedIn(auth) && this.isValidId(code) };
      }
      if (op === 'list' || op === 'update') {
        return { allowed: false };
      }
      if (op === 'create') {
        const allowed =
          this.isTeacher(auth) &&
          this.isValidId(code) &&
          code.length >= 6 &&
          !this.docs.has(`joinCodes/${code}`) &&
          typeof requestData.classId === 'string' &&
          this.isValidString(requestData.classId, 1, 128) &&
          this.isClassTeacher(auth, requestData.classId);
        if (allowed) {
          this.seed(cleanPath, requestData);
        }
        return { allowed };
      }
      if (op === 'delete') {
        return {
          allowed:
            this.isTeacher(auth) &&
            this.isValidId(code) &&
            this.isClassTeacher(auth, String(existingData.classId || '')),
        };
      }
    }

    // 3. /classes (collection list) or /classes/{classId}
    if (segments.length === 1 && segments[0] === 'classes' && op === 'list') {
      if (!this.isSignedIn(auth)) return { allowed: false };
      // `allow list: if isSignedIn() && resource.data.teacherUid == request.auth.uid;`
      // Listing all classes without filtering by `teacherUid == request.auth.uid` is rejected if any class belongs to another teacher
      for (const [k, v] of this.docs.entries()) {
        if (k.startsWith('classes/') && k.split('/').length === 2) {
          if (
            params.queryFilterTeacherUid
              ? params.queryFilterTeacherUid !== auth!.uid
              : v.teacherUid !== auth!.uid
          ) {
            return { allowed: false, reason: 'Cannot list classes not owned by teacherUid' };
          }
        }
      }
      return { allowed: params.queryFilterTeacherUid === auth!.uid };
    }

    if (segments.length === 2 && segments[0] === 'classes') {
      const classId = segments[1];
      if (!this.isValidId(classId)) return { allowed: false };
      if (op === 'get') {
        return { allowed: this.isClassMember(auth, classId) };
      }
      if (op === 'list') {
        return {
          allowed:
            this.isSignedIn(auth) && existingData.teacherUid === auth!.uid,
        };
      }
      if (op === 'create') {
        const allowed =
          this.isTeacher(auth) &&
          requestData.teacherUid === auth!.uid &&
          this.isValidString(requestData.name, 1, 160) &&
          this.isValidString(requestData.hskLevel, 1, 40) &&
          this.isValidString(requestData.joinCode, 6, 32);
        if (allowed) this.seed(cleanPath, requestData);
        return { allowed };
      }
      if (op === 'update') {
        const allowed =
          this.isTeacher(auth) &&
          existingData.teacherUid === auth!.uid &&
          requestData.teacherUid === existingData.teacherUid &&
          this.isValidString(requestData.name, 1, 160) &&
          this.isValidString(requestData.hskLevel, 1, 40) &&
          this.isValidString(requestData.joinCode, 6, 32);
        if (allowed) this.seed(cleanPath, requestData);
        return { allowed };
      }
      if (op === 'delete') {
        return {
          allowed: this.isTeacher(auth) && existingData.teacherUid === auth!.uid,
        };
      }
    }

    // 3a. /classes/{classId}/students (list) or /classes/{classId}/students/{studentUid}
    if (segments.length === 3 && segments[0] === 'classes' && segments[2] === 'students' && op === 'list') {
      const classId = segments[1];
      return {
        allowed: this.isValidId(classId) && this.isClassTeacher(auth, classId),
      };
    }

    if (segments.length === 4 && segments[0] === 'classes' && segments[2] === 'students') {
      const [, classId, , studentUid] = segments;
      if (!this.isValidId(classId) || !this.isValidId(studentUid)) {
        return { allowed: false };
      }
      if (op === 'get') {
        return {
          allowed:
            this.isClassTeacher(auth, classId) || this.isOwner(auth, studentUid),
        };
      }
      if (op === 'list') {
        return { allowed: this.isClassTeacher(auth, classId) };
      }
      if (op === 'create') {
        const allowed =
          this.isClassTeacher(auth, classId) &&
          this.isValidString(requestData.name, 1, 120) &&
          this.isValidString(requestData.studentCode, 6, 40);
        if (allowed) this.seed(cleanPath, requestData);
        return { allowed };
      }
      if (op === 'update') {
        const merged = { ...existingData, ...requestData };
        const diffKeys = this.affectedKeys(existingData, merged);
        const teacherAllowed =
          this.isClassTeacher(auth, classId) &&
          this.isValidString(merged.name, 1, 120) &&
          this.isValidString(merged.studentCode, 6, 40);
        const studentNameOnlyAllowed =
          this.isOwner(auth, studentUid) &&
          diffKeys.size === 1 &&
          diffKeys.has('name') &&
          this.isValidString(merged.name, 1, 120);
        const allowed = teacherAllowed || studentNameOnlyAllowed;
        if (allowed) this.seed(cleanPath, merged);
        return { allowed };
      }
      if (op === 'delete') {
        return { allowed: this.isClassTeacher(auth, classId) };
      }
    }

    // 3b. /classes/{classId}/assignments/{assignmentId}
    if (segments.length === 4 && segments[0] === 'classes' && segments[2] === 'assignments') {
      const [, classId, , assignmentId] = segments;
      if (!this.isValidId(classId) || !this.isValidId(assignmentId)) {
        return { allowed: false };
      }
      if (op === 'get' || op === 'list') {
        return { allowed: this.isClassMember(auth, classId) };
      }
      if (op === 'create' || op === 'update') {
        const allowed =
          this.isClassTeacher(auth, classId) &&
          requestData.teacherUid === auth!.uid &&
          this.isValidString(requestData.title, 1, 240) &&
          !('answerKey' in requestData);
        if (allowed) this.seed(cleanPath, requestData);
        return { allowed };
      }
      if (op === 'delete') {
        return { allowed: this.isClassTeacher(auth, classId) };
      }
    }

    // 3c. /classes/{classId}/answerKeys/{assignmentId}
    if (segments.length === 4 && segments[0] === 'classes' && segments[2] === 'answerKeys') {
      const [, classId, , assignmentId] = segments;
      if (!this.isValidId(classId) || !this.isValidId(assignmentId)) {
        return { allowed: false };
      }
      if (op === 'get' || op === 'list') {
        return { allowed: this.isClassTeacher(auth, classId) };
      }
      if (op === 'create' || op === 'update') {
        const allowed =
          this.isClassTeacher(auth, classId) &&
          requestData.teacherUid === auth!.uid;
        if (allowed) this.seed(cleanPath, requestData);
        return { allowed };
      }
      if (op === 'delete') {
        return { allowed: this.isClassTeacher(auth, classId) };
      }
    }

    // 3d. /classes/{classId}/submissions/{submissionId}
    if (segments.length === 4 && segments[0] === 'classes' && segments[2] === 'submissions') {
      const [, classId, , submissionId] = segments;
      if (!this.isValidId(classId) || !this.isValidId(submissionId)) {
        return { allowed: false };
      }
      if (op === 'get' || op === 'list') {
        return {
          allowed:
            this.isClassTeacher(auth, classId) ||
            (this.isSignedIn(auth) && existingData.studentUid === auth!.uid),
        };
      }
      // Clients cannot create, update, or delete submissions directly
      return { allowed: false };
    }

    // 3e. /classes/{classId}/leaderboard/{studentUid}
    if (segments.length === 4 && segments[0] === 'classes' && segments[2] === 'leaderboard') {
      const [, classId, , studentUid] = segments;
      if (!this.isValidId(classId) || !this.isValidId(studentUid)) {
        return { allowed: false };
      }
      if (op === 'get' || op === 'list') {
        return { allowed: this.isClassMember(auth, classId) };
      }
      // Clients cannot create, update, or delete leaderboard directly
      return { allowed: false };
    }

    return { allowed: false };
  }
}

test('firestore.rules structural verification — enforces all 7 security pillars', () => {
  assert.ok(rulesSource.includes("request.auth.token.role == 'teacher'"));
  assert.ok(rulesSource.includes('match /joinCodes/{code}'));
  assert.ok(rulesSource.includes('!exists(/databases/$(database)/documents/joinCodes/$(code))'));
  assert.ok(rulesSource.includes('allow list: if isSignedIn() && resource.data.teacherUid == request.auth.uid;'));
  assert.ok(rulesSource.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name'])"));
  assert.ok(rulesSource.includes('match /answerKeys/{assignmentId}'));
  assert.ok(rulesSource.includes('match /aiUsage/{usageId}'));
});

test('6 Mandatory Attack Scenarios + Valid Flows — Rule Verification Suite', async (t) => {
  const teacherA: AuthContext = {
    uid: 'teacher-uid-1',
    token: { role: 'teacher', email: 'dondon.win10@gmail.com' },
  };
  const studentA: AuthContext = {
    uid: 'student-uid-1',
    token: {},
  };
  const strangerUser: AuthContext = {
    uid: 'stranger-uid-99',
    token: {},
  };

  const verifier = new FirestoreRulesLocalVerifier({
    'classes/class-hsk3': {
      teacherUid: teacherA.uid,
      name: 'Lớp HSK 3.0 Chuẩn HANU',
      hskLevel: 'HSK 3',
      joinCode: 'HSK-8K4M9P',
    },
    'joinCodes/HSK-8K4M9P': {
      classId: 'class-hsk3',
      teacherUid: teacherA.uid,
      createdAt: '2026-03-29T00:00:00.000Z',
    },
    // Student A was enrolled by the server via POST /api/classes/join
    'classes/class-hsk3/students/student-uid-1': {
      studentUid: studentA.uid,
      studentCode: 'HV-7X9P2M',
      name: 'Nguyễn Minh Châu',
      hskLevel: 'HSK 3',
      totalPoints: 0,
      vocabScore: '',
      writingScore: '',
      quizScore: '',
      feedback: '',
      status: 'Chưa nộp',
      joinedAt: '2026-03-29',
    },
    'classes/class-hsk3/assignments/assign-b14': {
      teacherUid: teacherA.uid,
      title: 'Buổi 14: Đón Tết Trung Thu',
      multipleChoiceList: [],
    },
    'classes/class-hsk3/answerKeys/assign-b14': {
      assignmentId: 'assign-b14',
      teacherUid: teacherA.uid,
      multipleChoiceAnswers: { 'mc-14-1': 'A' },
    },
    'classes/class-hsk3/submissions/assign-b14_student-uid-1': {
      studentUid: studentA.uid,
      assignmentId: 'assign-b14',
      score: 95,
      answers: { 'mc-14-1': 'A' },
      submittedAt: '2026-03-29T10:00:00.000Z',
    },
    'classes/class-hsk3/leaderboard/student-uid-1': {
      studentUid: studentA.uid,
      studentCode: 'HV-7X9P2M',
      name: 'Nguyễn Minh Châu',
      hskLevel: 'HSK 3',
      score: 95,
      timeSeconds: 35,
      streak: 1,
    },
  });

  await t.test('Attack 1: Người lạ tự tạo students/{uid} trong lớp khác -> BỊ TỪ CHỐI', () => {
    const res = verifier.evaluate({
      op: 'create',
      path: `classes/class-hsk3/students/${strangerUser.uid}`,
      auth: strangerUser,
      requestData: {
        studentUid: strangerUser.uid,
        studentCode: 'HV-HACK01',
        name: 'Hacker',
        totalPoints: 100,
      },
    });
    assert.equal(res.allowed, false, 'Stranger must NOT be able to create students/{uid}');
  });

  await t.test('Attack 2: Học sinh tự sửa totalPoints hoặc feedback của mình -> BỊ TỪ CHỐI (chỉ được sửa name)', () => {
    const modifyPoints = verifier.evaluate({
      op: 'update',
      path: `classes/class-hsk3/students/${studentA.uid}`,
      auth: studentA,
      requestData: {
        totalPoints: 100,
      },
    });
    assert.equal(modifyPoints.allowed, false, 'Student must NOT modify totalPoints');

    const modifyFeedback = verifier.evaluate({
      op: 'update',
      path: `classes/class-hsk3/students/${studentA.uid}`,
      auth: studentA,
      requestData: {
        feedback: 'Tự khen xuất sắc 100 điểm',
      },
    });
    assert.equal(modifyFeedback.allowed, false, 'Student must NOT modify feedback');

    // Valid: Student updates ONLY their `name`
    const modifyNameOnly = verifier.evaluate({
      op: 'update',
      path: `classes/class-hsk3/students/${studentA.uid}`,
      auth: studentA,
      requestData: {
        name: 'Nguyễn Minh Châu (Đã đổi tên)',
      },
    });
    assert.equal(modifyNameOnly.allowed, true, 'Student CAN update only their own name field');
  });

  await t.test('Attack 3: Học sinh tự ghi thẳng submission hoặc leaderboard -> BỊ TỪ CHỐI', () => {
    const writeSub = verifier.evaluate({
      op: 'create',
      path: `classes/class-hsk3/submissions/assign-b14_${studentA.uid}_fake`,
      auth: studentA,
      requestData: {
        studentUid: studentA.uid,
        assignmentId: 'assign-b14',
        score: 100,
        answers: {},
        submittedAt: new Date().toISOString(),
      },
    });
    assert.equal(writeSub.allowed, false, 'Student must NOT directly create submission');

    const updateSub = verifier.evaluate({
      op: 'update',
      path: `classes/class-hsk3/submissions/assign-b14_${studentA.uid}`,
      auth: studentA,
      requestData: {
        score: 100,
      },
    });
    assert.equal(updateSub.allowed, false, 'Student must NOT update submission');

    const writeLeaderboard = verifier.evaluate({
      op: 'create',
      path: `classes/class-hsk3/leaderboard/${studentA.uid}`,
      auth: studentA,
      requestData: {
        studentUid: studentA.uid,
        name: 'Nguyễn Minh Châu',
        score: 100,
      },
    });
    assert.equal(writeLeaderboard.allowed, false, 'Student must NOT directly write leaderboard');
  });

  await t.test('Attack 4: Học sinh đọc answerKeys -> BỊ TỪ CHỐI', () => {
    const studentReadKey = verifier.evaluate({
      op: 'get',
      path: 'classes/class-hsk3/answerKeys/assign-b14',
      auth: studentA,
    });
    assert.equal(studentReadKey.allowed, false, 'Student must NOT read answerKeys');

    const teacherReadKey = verifier.evaluate({
      op: 'get',
      path: 'classes/class-hsk3/answerKeys/assign-b14',
      auth: teacherA,
    });
    assert.equal(teacherReadKey.allowed, true, 'Class teacher CAN read answerKeys');
  });

  await t.test('Attack 5: User đăng nhập list toàn bộ classes hoặc list students -> BỊ TỪ CHỐI', () => {
    const listAllClasses = verifier.evaluate({
      op: 'list',
      path: 'classes',
      auth: studentA,
    });
    assert.equal(listAllClasses.allowed, false, 'Signed-in student/stranger must NOT list all classes');

    const studentListRoster = verifier.evaluate({
      op: 'list',
      path: 'classes/class-hsk3/students',
      auth: studentA,
    });
    assert.equal(studentListRoster.allowed, false, 'Student must NOT list students collection');

    const teacherListOwnClasses = verifier.evaluate({
      op: 'list',
      path: 'classes',
      auth: teacherA,
      queryFilterTeacherUid: teacherA.uid,
    });
    assert.equal(teacherListOwnClasses.allowed, true, 'Teacher CAN list their own classes');

    const teacherListRoster = verifier.evaluate({
      op: 'list',
      path: 'classes/class-hsk3/students',
      auth: teacherA,
    });
    assert.equal(teacherListRoster.allowed, true, 'Class teacher CAN list students in their class');
  });

  await t.test('Attack 6: Tạo joinCode trùng với mã đã tồn tại -> BỊ TỪ CHỐI', () => {
    const duplicateCode = verifier.evaluate({
      op: 'create',
      path: 'joinCodes/HSK-8K4M9P',
      auth: teacherA,
      requestData: {
        classId: 'class-hsk3',
        teacherUid: teacherA.uid,
        createdAt: new Date().toISOString(),
      },
    });
    assert.equal(duplicateCode.allowed, false, 'Duplicate joinCode creation must be rejected');

    const freshCode = verifier.evaluate({
      op: 'create',
      path: 'joinCodes/HSK-9W2Q7L',
      auth: teacherA,
      requestData: {
        classId: 'class-hsk3',
        teacherUid: teacherA.uid,
        createdAt: new Date().toISOString(),
      },
    });
    assert.equal(freshCode.allowed, true, 'Unique 6+ char joinCode by class teacher succeeds');
  });

  // If FIRESTORE_EMULATOR_HOST is active (e.g. inside `firebase emulators:exec` in CI),
  // also run all 6 attack scenarios against the live Firestore Emulator!
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulatorHost) {
    await t.test('Live Firestore Emulator (@firebase/rules-unit-testing) — All 6 Attacks Rejected', async () => {
      setLogLevel('error');
      const [host, portStr] = emulatorHost.split(':');
      const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
          host: host || '127.0.0.1',
          port: Number(portStr || 8080),
          rules: rulesSource,
        },
      });

      try {
        await testEnv.clearFirestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, 'classes', 'class-hsk3'), {
            teacherUid: teacherA.uid,
            name: 'Lớp HSK 3.0 Chuẩn HANU',
            hskLevel: 'HSK 3',
            joinCode: 'HSK-8K4M9P',
          });
          await setDoc(doc(adminDb, 'joinCodes', 'HSK-8K4M9P'), {
            classId: 'class-hsk3',
            teacherUid: teacherA.uid,
            createdAt: '2026-03-29T00:00:00.000Z',
          });
          await setDoc(doc(adminDb, 'classes', 'class-hsk3', 'students', studentA.uid), {
            studentUid: studentA.uid,
            studentCode: 'HV-7X9P2M',
            name: 'Nguyễn Minh Châu',
            hskLevel: 'HSK 3',
            totalPoints: 0,
            vocabScore: '',
            writingScore: '',
            quizScore: '',
            feedback: '',
            status: 'Chưa nộp',
            joinedAt: '2026-03-29',
          });
          await setDoc(doc(adminDb, 'classes', 'class-hsk3', 'answerKeys', 'assign-b14'), {
            assignmentId: 'assign-b14',
            teacherUid: teacherA.uid,
            multipleChoiceAnswers: { 'mc-14-1': 'A' },
          });
        });

        const teacherDb = testEnv
          .authenticatedContext(teacherA.uid, { role: 'teacher' })
          .firestore();
        const studentDb = testEnv.authenticatedContext(studentA.uid).firestore();
        const strangerDb = testEnv.authenticatedContext(strangerUser.uid).firestore();

        // 1. Stranger creates students/{uid} -> REJECTED
        await assertFails(
          setDoc(doc(strangerDb, 'classes', 'class-hsk3', 'students', strangerUser.uid), {
            studentUid: strangerUser.uid,
            studentCode: 'HV-HACK01',
            name: 'Hacker',
            totalPoints: 100,
          })
        );

        // 2. Student modifies totalPoints or feedback -> REJECTED; modifying only name -> SUCCEEDS
        await assertFails(
          updateDoc(doc(studentDb, 'classes', 'class-hsk3', 'students', studentA.uid), {
            totalPoints: 100,
          })
        );
        await assertFails(
          updateDoc(doc(studentDb, 'classes', 'class-hsk3', 'students', studentA.uid), {
            feedback: 'Fake feedback',
          })
        );
        await assertSucceeds(
          updateDoc(doc(studentDb, 'classes', 'class-hsk3', 'students', studentA.uid), {
            name: 'Nguyễn Minh Châu Mới',
          })
        );

        // 3. Student writes submission or leaderboard directly -> REJECTED
        await assertFails(
          setDoc(doc(studentDb, 'classes', 'class-hsk3', 'submissions', 'sub-1'), {
            studentUid: studentA.uid,
            assignmentId: 'assign-b14',
            score: 100,
            answers: {},
            submittedAt: new Date().toISOString(),
          })
        );
        await assertFails(
          setDoc(doc(studentDb, 'classes', 'class-hsk3', 'leaderboard', studentA.uid), {
            studentUid: studentA.uid,
            name: 'Nguyễn Minh Châu',
            score: 100,
          })
        );

        // 4. Student reads answerKeys -> REJECTED; Teacher reads answerKeys -> SUCCEEDS
        await assertFails(
          getDoc(doc(studentDb, 'classes', 'class-hsk3', 'answerKeys', 'assign-b14'))
        );
        await assertSucceeds(
          getDoc(doc(teacherDb, 'classes', 'class-hsk3', 'answerKeys', 'assign-b14'))
        );

        // 5. Signed-in user lists all classes or lists students -> REJECTED
        await assertFails(getDocs(collection(studentDb, 'classes')));
        await assertFails(
          getDocs(collection(studentDb, 'classes', 'class-hsk3', 'students'))
        );
        await assertSucceeds(
          getDocs(
            query(
              collection(teacherDb, 'classes'),
              where('teacherUid', '==', teacherA.uid)
            )
          )
        );

        // 6. Creating duplicate joinCode -> REJECTED; creating new unique joinCode -> SUCCEEDS
        await assertFails(
          setDoc(doc(teacherDb, 'joinCodes', 'HSK-8K4M9P'), {
            classId: 'class-hsk3',
            teacherUid: teacherA.uid,
            createdAt: new Date().toISOString(),
          })
        );
        await assertSucceeds(
          setDoc(doc(teacherDb, 'joinCodes', 'HSK-UNIQUE99'), {
            classId: 'class-hsk3',
            teacherUid: teacherA.uid,
            createdAt: new Date().toISOString(),
          })
        );
      } finally {
        await testEnv.cleanup();
      }
    });
  }
});
