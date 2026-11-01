import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

test('firestore.rules enforces teacher class ownership, student submission immutability, private submission isolation, and sanitized leaderboard fields', () => {
  // 1. Default deny all
  assert.ok(
    rulesContent.includes('match /{document=**}') &&
      rulesContent.includes('allow read, write: if false;'),
    'firestore.rules must have a default deny-all rule'
  );

  // 2. Teacher can only create/update/delete their own classes (teacherUid == request.auth.uid)
  assert.ok(
    rulesContent.includes('request.resource.data.teacherUid == request.auth.uid'),
    'Teacher class creation must enforce teacherUid == request.auth.uid'
  );
  assert.ok(
    rulesContent.includes('request.resource.data.teacherUid == resource.data.teacherUid'),
    'Teacher class update must keep teacherUid immutable'
  );

  // 3. Decks & Assignments: only class members can read; only class teacher can write
  assert.ok(
    rulesContent.includes('match /decks/{deckId}') &&
      rulesContent.includes('allow read: if isClassMember(classId);') &&
      rulesContent.includes('allow create, update: if isClassTeacher(classId)'),
    'Decks must be readable by class members and writable only by the class teacher'
  );
  assert.ok(
    rulesContent.includes('match /assignments/{assignmentId}') &&
      rulesContent.includes('allow read: if isClassMember(classId);') &&
      rulesContent.includes('allow create, update: if isClassTeacher(classId)'),
    'Assignments must be readable by class members and writable only by the class teacher'
  );

  // 4. Submissions:
  // - Student can only read their own submission (resource.data.studentUid == request.auth.uid) or teacher can read
  // - Student can only create with studentUid == request.auth.uid
  // - Student CANNOT update score after submission (allow update: if false;)
  assert.ok(
    rulesContent.includes('match /submissions/{submissionId}'),
    'firestore.rules must define /classes/{classId}/submissions/{submissionId}'
  );
  assert.ok(
    rulesContent.includes('resource.data.studentUid == request.auth.uid'),
    'Students must not be able to read other students submissions'
  );
  assert.ok(
    rulesContent.includes('request.resource.data.studentUid == request.auth.uid'),
    'Students must only create submissions with their own studentUid'
  );
  assert.ok(
    rulesContent.includes('allow update: if false;'),
    'Students must NOT be able to modify their score after submitting'
  );

  // 5. Leaderboard: exposes only studentUid, studentCode, name, hskLevel, score, timeSeconds, streak, updatedAt
  assert.ok(
    rulesContent.includes('match /leaderboard/{studentUid}') &&
      rulesContent.includes('request.resource.data.keys().hasOnly(['),
    'Leaderboard must restrict fields to sanitized public fields only'
  );

  // 6. Personal SRS: users/{studentUid}/srs/{wordId} isolated per student UID
  assert.ok(
    rulesContent.includes('match /users/{studentUid}/srs/{wordId}') &&
      rulesContent.includes('allow read: if isOwner(studentUid);'),
    'Personal SRS records must only be readable/writable by the owning student UID'
  );
});

test(
  'Firestore Emulator live rules verification (@firebase/rules-unit-testing)',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const {
      initializeTestEnvironment,
      assertSucceeds,
      assertFails,
    } = await import('@firebase/rules-unit-testing');
    const { doc, getDoc, setDoc, updateDoc } = await import('firebase/firestore');

    const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
    const testEnv = await initializeTestEnvironment({
      projectId: 'demo-hanu-hsk-test',
      firestore: {
        host,
        port: Number(portStr || 8080),
        rules: rulesContent,
      },
    });

    try {
      const teacher1Db = testEnv.authenticatedContext('teacher-1', {
        email: 'teacher1@hanu.edu.vn',
        email_verified: true,
      }).firestore();
      const teacher2Db = testEnv.authenticatedContext('teacher-2', {
        email: 'teacher2@hanu.edu.vn',
        email_verified: true,
      }).firestore();
      const student1Db = testEnv.authenticatedContext('student-1').firestore();
      const student2Db = testEnv.authenticatedContext('student-2').firestore();

      // 1. Teacher 1 creates their own class
      await assertSucceeds(
        setDoc(doc(teacher1Db, 'classes/class-101'), {
          teacherUid: 'teacher-1',
          name: 'HSK 3 Lớp Tối 246',
          hskLevel: 'HSK 3',
          joinCode: '722229',
          createdAt: '2026-10-31T08:00:00.000Z',
        })
      );

      // Teacher 2 cannot overwrite Teacher 1's class
      await assertFails(
        updateDoc(doc(teacher2Db, 'classes/class-101'), {
          name: 'Lớp bị chiếm quyền',
        })
      );

      // 2. Student 1 joins class-101
      await assertSucceeds(
        setDoc(doc(student1Db, 'classes/class-101/students/student-1'), {
          studentUid: 'student-1',
          name: 'Lưu Thị Minh Thư',
          studentCode: 'HV-001',
          hskLevel: 'HSK 3',
          joinedAt: '2026-10-31T08:05:00.000Z',
        })
      );

      // 3. Teacher 1 publishes a deck & assignment; Student 1 (member) can read, Student 2 (non-member) cannot
      await assertSucceeds(
        setDoc(doc(teacher1Db, 'classes/class-101/decks/default-deck'), {
          title: 'Từ vựng Buổi 14',
          teacherUid: 'teacher-1',
          slides: [],
          updatedAt: '2026-10-31T08:10:00.000Z',
        })
      );
      await assertSucceeds(getDoc(doc(student1Db, 'classes/class-101/decks/default-deck')));
      await assertFails(getDoc(doc(student2Db, 'classes/class-101/decks/default-deck')));

      // 4. Student 1 submits homework with studentUid == 'student-1'
      await assertSucceeds(
        setDoc(doc(student1Db, 'classes/class-101/submissions/sub-1'), {
          studentUid: 'student-1',
          studentCode: 'HV-001',
          studentName: 'Lưu Thị Minh Thư',
          assignmentId: 'hw-14',
          score: 95,
          answers: { q1: 'A' },
          submittedAt: '2026-10-31T08:15:00.000Z',
        })
      );

      // Student 1 CANNOT modify score after submitting
      await assertFails(
        updateDoc(doc(student1Db, 'classes/class-101/submissions/sub-1'), {
          score: 100,
        })
      );

      // Student 2 CANNOT read Student 1's submission
      await assertFails(getDoc(doc(student2Db, 'classes/class-101/submissions/sub-1')));

      // 5. Student 1 can read/write their own SRS but not Student 2's SRS
      await assertSucceeds(
        setDoc(doc(student1Db, 'users/student-1/srs/word-wennuan'), {
          wordId: 'word-wennuan',
          hanzi: '温暖',
          learned: true,
          updatedAt: '2026-10-31T08:20:00.000Z',
        })
      );
      await assertFails(getDoc(doc(student2Db, 'users/student-1/srs/word-wennuan')));
    } finally {
      await testEnv.cleanup();
    }
  }
);
