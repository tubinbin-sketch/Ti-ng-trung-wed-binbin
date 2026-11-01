import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  app,
  createInMemoryServerStoreAdapter,
  getAiDailyLimit,
  resetAllRateLimitersForTest,
  setAppCheckVerifierForTest,
  setFirebaseTokenVerifierForTest,
  setServerStoreAdapterForTest,
} from '../../server';
import {
  extractAssignmentAnswerKey,
  PRESET_ASSIGNMENT_BUOI_14,
  sanitizeAssignmentForPublic,
} from './assignmentParser';

async function startEphemeralServer(): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  return await new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise<void>((resClose) => {
            server.close(() => resClose());
          }),
      });
    });
  });
}

test('Server Security & Classroom API Suite (Bootstrap, Join, Grading, AI Quota & App Check)', async (t) => {
  const store = createInMemoryServerStoreAdapter();
  setServerStoreAdapterForTest(store);
  resetAllRateLimitersForTest();

  setFirebaseTokenVerifierForTest(async (token: string) => {
    if (token === 'token-teacher-allowlisted') {
      return {
        uid: 'teacher-uid-1',
        email: 'dondon.win10@gmail.com',
        name: 'GV Nguyễn Văn Thụ',
        role: 'teacher',
      };
    }
    if (token === 'token-teacher-unauthorized') {
      return {
        uid: 'user-not-teacher',
        email: 'random.stranger@example.com',
        name: 'Người lạ',
      };
    }
    if (token === 'token-student-1') {
      return {
        uid: 'student-uid-1',
        name: 'Nguyễn Minh Châu',
        signInProvider: 'anonymous',
      };
    }
    if (token === 'token-student-2') {
      return {
        uid: 'student-uid-2',
        name: 'Phạm Gia Bảo',
        signInProvider: 'anonymous',
      };
    }
    if (token === 'token-anon-unenrolled') {
      return {
        uid: 'anon-unenrolled-99',
        signInProvider: 'anonymous',
      };
    }
    throw new Error('Invalid token');
  });

  const { baseUrl, close } = await startEphemeralServer();

  t.after(async () => {
    setFirebaseTokenVerifierForTest(null);
    setAppCheckVerifierForTest(null);
    setServerStoreAdapterForTest(null);
    await close();
  });

  await t.test('1. AI_DAILY_LIMIT defaults to 60 (matching .env.example)', () => {
    const prev = process.env.AI_DAILY_LIMIT;
    delete process.env.AI_DAILY_LIMIT;
    assert.equal(getAiDailyLimit(), 60);
    if (prev !== undefined) process.env.AI_DAILY_LIMIT = prev;
  });

  await t.test('2. POST /api/teachers/bootstrap enforces TEACHER_EMAIL_ALLOWLIST and sets custom claim role=teacher', async () => {
    // Unauthorized email is rejected with 403
    const deniedRes = await fetch(`${baseUrl}/api/teachers/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-teacher-unauthorized',
      },
      body: JSON.stringify({ displayName: 'Fake Teacher' }),
    });
    assert.equal(deniedRes.status, 403);

    // Allowlisted email succeeds and sets custom claim role = 'teacher'
    const okRes = await fetch(`${baseUrl}/api/teachers/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-teacher-allowlisted',
      },
      body: JSON.stringify({ displayName: 'GV Nguyễn Văn Thụ' }),
    });
    assert.equal(okRes.status, 200);
    const okData = await okRes.json();
    assert.equal(okData.role, 'teacher');
    assert.deepEqual(store.claims.get('teacher-uid-1'), { role: 'teacher' });
  });

  await t.test('3. Sanitize public assignment vs private answerKey', () => {
    const sanitized = sanitizeAssignmentForPublic(PRESET_ASSIGNMENT_BUOI_14);
    for (const mc of sanitized.multipleChoiceList) {
      for (const opt of mc.options) {
        assert.equal(opt.isCorrect, false, 'Public assignment must strip isCorrect answers');
      }
    }
    for (const so of sanitized.sentenceOrderingList) {
      assert.equal(so.correctTokens.length, 0, 'Public assignment must strip correctTokens');
      assert.equal(so.modelSentence, '', 'Public assignment must strip modelSentence');
    }
    for (const es of sanitized.essayList) {
      assert.equal(es.sampleSentence, '', 'Public assignment must strip sampleSentence');
    }

    const key = extractAssignmentAnswerKey(PRESET_ASSIGNMENT_BUOI_14, 'teacher-uid-1');
    assert.equal(key.multipleChoiceAnswers['mc-14-1'], 'A');
    assert.equal(key.multipleChoiceAnswers['mc-14-2'], 'B');
    assert.equal(key.multipleChoiceAnswers['mc-14-3'], 'C');
    assert.deepEqual(key.sentenceOrderingAnswers['so-14-1'], [
      '春天',
      '的',
      '阳光',
      '非常',
      '温暖',
      '。',
    ]);
  });

  await t.test('4. POST /api/classes/join verifies joinCode, studentCode slot, prevents slot hijacking, and initializes zeroed student record', async () => {
    // Seed class, joinCode, and teacher-issued random student slot
    await store.setDoc('classes/class-hsk3', {
      teacherUid: 'teacher-uid-1',
      teacherName: 'GV Nguyễn Văn Thụ',
      name: 'Lớp HSK 3.0 Thực Tế',
      hskLevel: 'HSK 3',
      joinCode: 'HSK-8K4M9P',
      createdAt: '2026-03-29T00:00:00.000Z',
    });
    await store.setDoc('joinCodes/HSK-8K4M9P', {
      classId: 'class-hsk3',
      teacherUid: 'teacher-uid-1',
      createdAt: '2026-03-29T00:00:00.000Z',
    });
    await store.setDoc('classes/class-hsk3/students/slot-hv-7x9p2m', {
      studentUid: '',
      studentCode: 'HV-7X9P2M',
      name: 'Nguyễn Minh Châu',
      hskLevel: 'HSK 3',
      totalPoints: 0,
      vocabScore: '',
      writingScore: '',
      quizScore: '',
      feedback: '',
      status: 'Chưa nộp',
      timeSeconds: 0,
      streak: 0,
      joinedAt: '2026-03-29',
    });

    // Student 1 joins with valid joinCode + studentCode
    const joinRes1 = await fetch(`${baseUrl}/api/classes/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-student-1',
      },
      body: JSON.stringify({
        joinCode: 'HSK-8K4M9P',
        studentCode: 'HV-7X9P2M',
      }),
    });
    assert.equal(joinRes1.status, 200);
    const joinData1 = await joinRes1.json();
    assert.equal(joinData1.classroom.id, 'class-hsk3');
    assert.equal(joinData1.studentRecord.id, 'student-uid-1');
    assert.equal(joinData1.studentRecord.totalPoints, 0);
    assert.equal(joinData1.studentRecord.writingScore, '');
    assert.equal(joinData1.studentRecord.feedback, '');

    // Student 2 tries to claim the SAME studentCode 'HV-7X9P2M' -> REJECTED with 409 Conflict!
    const hijackRes = await fetch(`${baseUrl}/api/classes/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-student-2',
      },
      body: JSON.stringify({
        joinCode: 'HSK-8K4M9P',
        studentCode: 'HV-7X9P2M',
      }),
    });
    assert.equal(hijackRes.status, 409);
  });

  await t.test('5. POST /api/submissions grades on server using answerKeys, updates leaderboard & students, and blocks duplicate submissions', async () => {
    const answerKey = extractAssignmentAnswerKey(
      PRESET_ASSIGNMENT_BUOI_14,
      'teacher-uid-1',
      1
    );
    await store.setDoc('classes/class-hsk3/answerKeys/assign-b14', answerKey);

    // Unenrolled Student 2 tries to submit -> REJECTED with 403 Forbidden
    const unenrolledRes = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-student-2',
      },
      body: JSON.stringify({
        classId: 'class-hsk3',
        assignmentId: 'assign-b14',
        answers: { mcAnswers: { 'mc-14-1': 'A' } },
      }),
    });
    assert.equal(unenrolledRes.status, 403);

    // Enrolled Student 1 submits all correct answers -> Graded 100/100 on server
    const validSubRes = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-student-1',
      },
      body: JSON.stringify({
        classId: 'class-hsk3',
        assignmentId: 'assign-b14',
        timeSeconds: 42,
        answers: {
          mcAnswers: {
            'mc-14-1': 'A',
            'mc-14-2': 'B',
            'mc-14-3': 'C',
          },
          selectedTokensMap: {
            'so-14-1': ['春天', '的', '阳光', '非常', '温暖', '。'],
            'so-14-2': ['咱们', '一起', '看', '个', '电影', '吧', '。'],
          },
          essayAnswers: {
            'es-14-1': '老师的关怀让我感到很温暖。',
            'es-14-2': '请问我可以在这里换人民币吗？',
          },
        },
      }),
    });
    assert.equal(validSubRes.status, 200);
    const gradedData = await validSubRes.json();
    assert.equal(gradedData.score, 100);
    assert.equal(gradedData.correctCount, 7);
    assert.equal(gradedData.totalQuestions, 7);

    // Verify leaderboard and student record were updated by the server
    const lbDoc = await store.getDoc('classes/class-hsk3/leaderboard/student-uid-1');
    assert.ok(lbDoc);
    assert.equal(lbDoc.score, 100);

    const stDoc = await store.getDoc('classes/class-hsk3/students/student-uid-1');
    assert.ok(stDoc);
    assert.equal(stDoc.totalPoints, 100);

    // Second submission by Student 1 for the same assignment -> REJECTED with 409 Conflict
    const duplicateSubRes = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-student-1',
      },
      body: JSON.stringify({
        classId: 'class-hsk3',
        assignmentId: 'assign-b14',
        answers: { mcAnswers: { 'mc-14-1': 'A' } },
      }),
    });
    assert.equal(duplicateSubRes.status, 409);
  });

  await t.test('6. AI routes block anonymous users not in any class, track aiUsage/{uid}_{YYYY-MM-DD} in Firestore, and verify App Check when enabled', async () => {
    const commonHeaders = {
      'Content-Type': 'application/json',
      Origin: baseUrl,
    };

    // Unenrolled anonymous user is blocked with 403 Forbidden
    const anonAiRes = await fetch(`${baseUrl}/api/binbin/chat`, {
      method: 'POST',
      headers: {
        ...commonHeaders,
        Authorization: 'Bearer token-anon-unenrolled',
      },
      body: JSON.stringify({ prompt: 'Giải thích từ 温暖' }),
    });
    assert.equal(anonAiRes.status, 403);

    // Enrolled Student 1 passes authorization and increments `aiUsage/student-uid-1_{YYYY-MM-DD}`
    const enrolledAiRes = await fetch(`${baseUrl}/api/binbin/chat`, {
      method: 'POST',
      headers: {
        ...commonHeaders,
        Authorization: 'Bearer token-student-1',
      },
      body: JSON.stringify({ prompt: 'Giải thích từ 温暖' }),
    });
    // Without GEMINI_API_KEY in test env, route handler returns 401 after passing protectAiRoute middleware
    assert.notEqual(enrolledAiRes.status, 403);
    const today = new Date().toISOString().slice(0, 10);
    const usageDoc = await store.getDoc(`aiUsage/student-uid-1_${today}`);
    assert.ok(usageDoc, 'aiUsage document must be created in Firestore transaction');
    assert.equal(usageDoc.count, 1);

    // App Check verification when ENFORCE_APP_CHECK=true
    process.env.ENFORCE_APP_CHECK = 'true';
    setAppCheckVerifierForTest(async (appCheckToken: string) => {
      if (appCheckToken === 'valid-app-check-token') {
        return { appId: 'hanu-app-id' };
      }
      throw new Error('Invalid App Check token');
    });

    const missingAppCheckRes = await fetch(`${baseUrl}/api/binbin/chat`, {
      method: 'POST',
      headers: {
        ...commonHeaders,
        Authorization: 'Bearer token-student-1',
      },
      body: JSON.stringify({ prompt: 'Giải thích từ 温暖' }),
    });
    assert.equal(missingAppCheckRes.status, 401);

    const validAppCheckRes = await fetch(`${baseUrl}/api/binbin/chat`, {
      method: 'POST',
      headers: {
        ...commonHeaders,
        Authorization: 'Bearer token-student-1',
        'X-Firebase-AppCheck': 'valid-app-check-token',
      },
      body: JSON.stringify({ prompt: 'Giải thích từ 温暖' }),
    });
    assert.notEqual(validAppCheckRes.status, 403);
    process.env.ENFORCE_APP_CHECK = 'false';
  });
});
