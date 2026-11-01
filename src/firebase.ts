import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';
import {
  INITIAL_VOCAB_SLIDES,
  type VocabSlide,
} from './data/chineseData';
import {
  ClassStudentRecord,
  registerFirebaseTokenGetter,
} from './utils/chineseEngine';
import {
  PRESET_ASSIGNMENT_BUOI_14,
  type UploadedAssignmentPackage,
} from './utils/assignmentParser';
import type { SrsWordRecord } from './utils/hskStudyHelpers';

const envConfig =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : ({} as Record<string, string>);

function resolveValidDatabaseId(candidate?: string, fallback?: string): string {
  const cleanFallback = (fallback || '').trim();
  if (cleanFallback && !cleanFallback.includes('.')) {
    return cleanFallback;
  }
  const cleanCandidate = (candidate || '').trim();
  if (cleanCandidate && !cleanCandidate.includes('.')) {
    return cleanCandidate;
  }
  return '(default)';
}

export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || envConfig.VITE_FIREBASE_API_KEY,
  authDomain: firebaseAppletConfig.authDomain || envConfig.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseAppletConfig.projectId || envConfig.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseAppletConfig.storageBucket || envConfig.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    firebaseAppletConfig.messagingSenderId || envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseAppletConfig.appId || envConfig.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: resolveValidDatabaseId(
    envConfig.VITE_FIRESTORE_DATABASE_ID,
    (firebaseAppletConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId
  ),
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

let emulatorsConnected = false;
if (
  typeof window !== 'undefined' &&
  !emulatorsConnected &&
  envConfig.VITE_USE_FIREBASE_EMULATOR === 'true'
) {
  emulatorsConnected = true;
  try {
    connectAuthEmulator(
      auth,
      envConfig.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099',
      { disableWarnings: true }
    );
    connectFirestoreEmulator(
      db,
      envConfig.VITE_FIRESTORE_EMULATOR_HOST || '127.0.0.1',
      Number(envConfig.VITE_FIRESTORE_EMULATOR_PORT || 8080)
    );
  } catch {
    // Emulator already connected
  }
}

// Register Firebase ID Token provider for Gemini AI server routes (/api/hanzi/enrich, /api/hanzi/suggest, /api/binbin/chat)
registerFirebaseTokenGetter(async () => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export interface ClassroomMetadata {
  id: string;
  teacherUid: string;
  teacherName?: string;
  name: string;
  hskLevel: string;
  joinCode: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FirestoreSubmissionDoc {
  id: string;
  studentUid: string;
  studentCode?: string;
  studentName?: string;
  assignmentId: string;
  score: number;
  answers: Record<string, unknown>;
  submittedAt: string;
}

export interface FirestoreLeaderboardDoc {
  studentUid: string;
  studentCode: string;
  name: string;
  hskLevel: string;
  score: number;
  timeSeconds: number;
  streak: number;
  updatedAt?: string;
}

/**
 * Returns Authorization header with current Firebase user's ID Token for server-side Gemini AI routes.
 */
export async function getFirebaseAuthHeaders(): Promise<Record<string, string>> {
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch {
    // Ignore token refresh errors
  }
  return {};
}

/**
 * Teacher Google Sign-In via Firebase Auth Popup.
 * Automatically creates/updates `/teachers/{uid}` and ensures at least one default class exists for the teacher.
 */
export async function signInTeacherWithGoogle(): Promise<{
  user: User;
  classroom: ClassroomMetadata;
  allClasses: ClassroomMetadata[];
}> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const user = cred.user;
  const nowIso = new Date().toISOString();

  const teacherPath = `teachers/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'teachers', user.uid),
      {
        uid: user.uid,
        email: user.email || '',
        displayName: (
          user.displayName ||
          user.email?.split('@')[0] ||
          'Giảng viên HANU'
        ).slice(0, 120),
        photoURL: user.photoURL || '',
        role: 'teacher',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, teacherPath);
  }

  const allClasses = await fetchTeacherClasses(
    user.uid,
    user.displayName || 'Giảng viên HANU'
  );
  return {
    user,
    classroom: allClasses[0],
    allClasses,
  };
}

export async function fetchTeacherClasses(
  teacherUid: string,
  teacherDisplayName = 'Giảng viên HANU'
): Promise<ClassroomMetadata[]> {
  const classesPath = 'classes';
  try {
    const q = query(collection(db, 'classes'), where('teacherUid', '==', teacherUid));
    const snap = await getDocs(q);
    const list: ClassroomMetadata[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Omit<ClassroomMetadata, 'id'>;
      list.push({
        ...data,
        id: docSnap.id,
      });
    });

    if (list.length > 0) {
      return list;
    }

    // Bootstrap a default class for this teacher
    const defaultJoinCode = `HANU-${teacherUid.slice(0, 4).toUpperCase()}`;
    const classId = `lop-hsk3-${teacherUid.slice(0, 8).toLowerCase()}`;
    const nowIso = new Date().toISOString();
    const newClass: ClassroomMetadata = {
      id: classId,
      teacherUid,
      teacherName: teacherDisplayName.slice(0, 120),
      name: 'Lớp HSK 3.0 Chuẩn HANU',
      hskLevel: 'HSK 3',
      joinCode: defaultJoinCode,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'classes', classId), {
      teacherUid: newClass.teacherUid,
      teacherName: newClass.teacherName,
      name: newClass.name,
      hskLevel: newClass.hskLevel,
      joinCode: newClass.joinCode,
      createdAt: newClass.createdAt,
      updatedAt: newClass.updatedAt,
    });

    // Seed default deck & assignment for the new class
    await setDoc(doc(db, 'classes', classId, 'decks', 'main'), {
      id: 'main',
      title: 'Bộ từ vựng HSK 3.0 Trọng tâm',
      hskLevel: 'HSK 3',
      teacherUid,
      slides: INITIAL_VOCAB_SLIDES,
      updatedAt: nowIso,
    });

    await setDoc(doc(db, 'classes', classId, 'assignments', PRESET_ASSIGNMENT_BUOI_14.id), {
      ...PRESET_ASSIGNMENT_BUOI_14,
      title: PRESET_ASSIGNMENT_BUOI_14.sessionTitle,
      teacherUid,
      updatedAt: nowIso,
    });

    return [newClass];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, classesPath);
  }
}

export async function createNewTeacherClass(
  paramsOrName:
    | {
        teacherUid?: string;
        teacherName?: string;
        name: string;
        hskLevel: string;
        joinCode?: string;
      }
    | string,
  hskLevelArg = 'HSK 1–3'
): Promise<ClassroomMetadata> {
  const currentUser = auth.currentUser;
  const params =
    typeof paramsOrName === 'string'
      ? {
          teacherUid: currentUser?.uid || 'teacher',
          teacherName: currentUser?.displayName || 'Giáo viên HSK',
          name: paramsOrName,
          hskLevel: hskLevelArg,
        }
      : {
          teacherUid: paramsOrName.teacherUid || currentUser?.uid || 'teacher',
          teacherName: paramsOrName.teacherName || currentUser?.displayName || 'Giáo viên HSK',
          name: paramsOrName.name,
          hskLevel: paramsOrName.hskLevel || 'HSK 3',
          joinCode: paramsOrName.joinCode,
        };

  const cleanJoinCode = (
    params.joinCode?.trim() ||
    `HSK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  )
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');

  const classId = `lop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const metadata: ClassroomMetadata = {
    id: classId,
    teacherUid: params.teacherUid,
    teacherName: params.teacherName.slice(0, 120),
    name: params.name.trim().slice(0, 160),
    hskLevel: params.hskLevel.trim().slice(0, 40) || 'HSK 3',
    joinCode: cleanJoinCode.slice(0, 32),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await setDoc(doc(db, 'classes', classId), {
      teacherUid: metadata.teacherUid,
      teacherName: metadata.teacherName,
      name: metadata.name,
      hskLevel: metadata.hskLevel,
      joinCode: metadata.joinCode,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
    });

    await setDoc(doc(db, 'classes', classId, 'decks', 'main'), {
      id: 'main',
      title: `Bài giảng ${metadata.name}`,
      hskLevel: metadata.hskLevel,
      teacherUid: metadata.teacherUid,
      slides: INITIAL_VOCAB_SLIDES,
      updatedAt: nowIso,
    });

    await setDoc(doc(db, 'classes', classId, 'assignments', PRESET_ASSIGNMENT_BUOI_14.id), {
      ...PRESET_ASSIGNMENT_BUOI_14,
      title: PRESET_ASSIGNMENT_BUOI_14.sessionTitle,
      teacherUid: metadata.teacherUid,
      updatedAt: nowIso,
    });

    return metadata;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `classes/${classId}`);
  }
}

/**
 * Student joins a class using `joinCode` (Mã lớp) + `studentCode` (Mã học sinh do GV cấp),
 * or signs in with Google first and enters `joinCode` (+ optional `studentCode`).
 * Guarantees each student has their own Firebase Auth UID and cannot impersonate another student.
 */
export async function joinClassAsStudent(params: {
  joinCode: string;
  studentCode?: string;
  useGooglePopup?: boolean;
}): Promise<{
  user: User;
  classroom: ClassroomMetadata;
  studentRecord: ClassStudentRecord;
}> {
  const cleanJoinCode = params.joinCode.trim().toUpperCase();
  const cleanStudentCode = (params.studentCode || '').trim().toUpperCase();

  if (!cleanJoinCode) {
    throw new Error('Vui lòng nhập Mã lớp (joinCode) do Giảng viên cung cấp.');
  }

  let currentUser = auth.currentUser;
  if (params.useGooglePopup) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    currentUser = cred.user;
  } else if (!currentUser) {
    try {
      const anonCred = await signInAnonymously(auth);
      currentUser = anonCred.user;
    } catch {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      currentUser = cred.user;
    }
  }

  if (!currentUser) {
    throw new Error('Không thể khởi tạo phiên xác thực Firebase cho học viên.');
  }

  // Find class by joinCode
  const classesSnap = await getDocs(
    query(collection(db, 'classes'), where('joinCode', '==', cleanJoinCode))
  );

  if (classesSnap.empty) {
    throw new Error(
      `Không tìm thấy lớp học với mã lớp "${cleanJoinCode}". Vui lòng kiểm tra lại.`
    );
  }

  const classDocSnap = classesSnap.docs[0];
  const classId = classDocSnap.id;
  const classData = classDocSnap.data() as Omit<ClassroomMetadata, 'id'>;
  const classroom: ClassroomMetadata = {
    ...classData,
    id: classId,
  };

  // Check if this uid already has a student document in `/classes/{classId}/students/{uid}`
  const ownStudentDocRef = doc(db, 'classes', classId, 'students', currentUser.uid);
  const ownStudentSnap = await getDoc(ownStudentDocRef);
  const nowIso = new Date().toISOString();

  if (ownStudentSnap.exists()) {
    const existingData = ownStudentSnap.data();
    if (cleanStudentCode && existingData.studentCode !== cleanStudentCode) {
      throw new Error(
        `Tài khoản của bạn đã gắn với mã học viên ${existingData.studentCode}. Bạn không thể đổi sang mã ${cleanStudentCode} của học viên khác.`
      );
    }
    const record: ClassStudentRecord = {
      id: currentUser.uid,
      studentCode: String(existingData.studentCode || 'HV-001'),
      name: String(existingData.name || 'Học viên'),
      hskLevel: (existingData.hskLevel as ClassStudentRecord['hskLevel']) || 'HSK 3',
      vocabScore: String(existingData.vocabScore || '0/18 từ'),
      writingScore: String(existingData.writingScore || '0% độ chuẩn nét'),
      quizScore: String(existingData.quizScore || '0/10 câu đúng'),
      totalPoints: Number(existingData.totalPoints || 0),
      status: (existingData.status as ClassStudentRecord['status']) || 'Đang nộp bài',
      feedback: String(existingData.feedback || 'Đã tham gia lớp học.'),
      timeSeconds: Number(existingData.timeSeconds || 30),
      streak: Number(existingData.streak || 1),
    };
    return { user: currentUser, classroom, studentRecord: record };
  }

  // Look up teacher-issued student slots in `/classes/{classId}/students`
  const studentsColRef = collection(db, 'classes', classId, 'students');
  const studentsSnap = await getDocs(studentsColRef);

  let matchedPreRegisteredSlot: { docId: string; data: Record<string, unknown> } | null =
    null as { docId: string; data: Record<string, unknown> } | null;
  studentsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const code = String(data.studentCode || '').toUpperCase();
    if (cleanStudentCode && code === cleanStudentCode) {
      matchedPreRegisteredSlot = { docId: docSnap.id, data };
    }
  });

  if (matchedPreRegisteredSlot) {
    const slotData = matchedPreRegisteredSlot.data;
    const boundUid = String(slotData.studentUid || '');
    if (boundUid && boundUid !== currentUser.uid) {
      throw new Error(
        `Mã học sinh "${cleanStudentCode}" đã được kích hoạt bởi một tài khoản khác. Bạn không thể chọn mã của bạn học khác.`
      );
    }

    const studentName = String(
      slotData.name || currentUser.displayName || cleanStudentCode
    ).slice(0, 120);
    const hskLevel = (slotData.hskLevel as ClassStudentRecord['hskLevel']) || 'HSK 3';
    const joinedAt = String(slotData.joinedAt || nowIso.slice(0, 10));

    // Create canonical `/classes/{classId}/students/{currentUser.uid}` document for security rules (`isEnrolledStudent`)
    await setDoc(ownStudentDocRef, {
      studentUid: currentUser.uid,
      studentCode: cleanStudentCode,
      name: studentName,
      hskLevel,
      joinedAt,
      vocabScore: String(slotData.vocabScore || '0/18 từ'),
      writingScore: String(slotData.writingScore || '0% độ chuẩn nét'),
      quizScore: String(slotData.quizScore || '0/10 câu đúng'),
      totalPoints: Number(slotData.totalPoints || 0),
      status: String(slotData.status || 'Đã chấm tự động'),
      feedback: String(slotData.feedback || 'Đã tham gia lớp học.'),
      timeSeconds: Number(slotData.timeSeconds || 30),
      streak: Number(slotData.streak || 1),
    });

    if (matchedPreRegisteredSlot.docId !== currentUser.uid) {
      try {
        await updateDoc(
          doc(db, 'classes', classId, 'students', matchedPreRegisteredSlot.docId),
          {
            studentUid: currentUser.uid,
            studentCode: cleanStudentCode,
            name: studentName,
          }
        );
      } catch {
        // Ignore if rule prevents updating non-uid slot
      }
    }

    const record: ClassStudentRecord = {
      id: currentUser.uid,
      studentCode: cleanStudentCode,
      name: studentName,
      hskLevel,
      vocabScore: String(slotData.vocabScore || '0/18 từ'),
      writingScore: String(slotData.writingScore || '0% độ chuẩn nét'),
      quizScore: String(slotData.quizScore || '0/10 câu đúng'),
      totalPoints: Number(slotData.totalPoints || 0),
      status: (slotData.status as ClassStudentRecord['status']) || 'Đã chấm tự động',
      feedback: String(slotData.feedback || 'Đã tham gia lớp học.'),
      timeSeconds: Number(slotData.timeSeconds || 30),
      streak: Number(slotData.streak || 1),
    };
    return { user: currentUser, classroom, studentRecord: record };
  }

  // If the student signed in with Google and joined by class code
  if (currentUser.displayName || currentUser.email) {
    const generatedCode =
      cleanStudentCode || `HV-${currentUser.uid.slice(0, 5).toUpperCase()}`;
    const studentName = (
      currentUser.displayName ||
      currentUser.email?.split('@')[0] ||
      generatedCode
    ).slice(0, 120);

    await setDoc(ownStudentDocRef, {
      studentUid: currentUser.uid,
      studentCode: generatedCode,
      name: studentName,
      hskLevel: 'HSK 3',
      joinedAt: nowIso.slice(0, 10),
      vocabScore: '0/18 từ',
      writingScore: '90% độ chuẩn nét',
      quizScore: '0/10 câu đúng',
      totalPoints: 0,
      status: 'Đang nộp bài',
      feedback: 'Học viên mới tham gia lớp học qua Google Auth.',
      timeSeconds: 30,
      streak: 1,
    });

    return {
      user: currentUser,
      classroom,
      studentRecord: {
        id: currentUser.uid,
        studentCode: generatedCode,
        name: studentName,
        hskLevel: 'HSK 3',
        vocabScore: '0/18 từ',
        writingScore: '90% độ chuẩn nét',
        quizScore: '0/10 câu đúng',
        totalPoints: 0,
        status: 'Đang nộp bài',
        feedback: 'Học viên mới tham gia lớp học qua Google Auth.',
        timeSeconds: 30,
        streak: 1,
      },
    };
  }

  throw new Error(
    `Mã học sinh "${cleanStudentCode || '(trống)'}" chưa được Giảng viên cấp trong lớp "${classroom.name}". Vui lòng nhập đúng Mã học sinh hoặc Đăng nhập bằng Google.`
  );
}

export async function signOutFirebaseUser(): Promise<void> {
  await signOut(auth);
}

export async function saveTeacherDeckToFirestore(
  classId: string,
  slidesOrTeacherUid: VocabSlide[] | string,
  maybeSlides?: VocabSlide[],
  title = 'Bộ từ vựng HSK 3.0 Trọng tâm'
): Promise<void> {
  const teacherUid =
    typeof slidesOrTeacherUid === 'string'
      ? slidesOrTeacherUid
      : auth.currentUser?.uid || 'teacher';
  const slides = Array.isArray(slidesOrTeacherUid)
    ? slidesOrTeacherUid
    : maybeSlides || [];
  const deckPath = `classes/${classId}/decks/main`;
  try {
    await setDoc(doc(db, 'classes', classId, 'decks', 'main'), {
      id: 'main',
      title: title.slice(0, 200),
      hskLevel: 'HSK 3',
      teacherUid,
      slides,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, deckPath);
  }
}

export async function saveTeacherAssignmentToFirestore(
  classId: string,
  assignmentOrTeacherUid: UploadedAssignmentPackage | string,
  maybeAssignment?: UploadedAssignmentPackage
): Promise<void> {
  const teacherUid =
    typeof assignmentOrTeacherUid === 'string'
      ? assignmentOrTeacherUid
      : auth.currentUser?.uid || 'teacher';
  const assignment =
    typeof assignmentOrTeacherUid === 'string'
      ? maybeAssignment!
      : assignmentOrTeacherUid;
  if (!assignment) return;
  const assignmentId = assignment.id || 'default-assignment';
  const path = `classes/${classId}/assignments/${assignmentId}`;
  try {
    await setDoc(doc(db, 'classes', classId, 'assignments', assignmentId), {
      ...assignment,
      id: assignmentId,
      title: (assignment.sessionTitle || assignment.fileName || 'Bài tập HSK 3.0').slice(
        0,
        240
      ),
      teacherUid,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveTeacherStudentSlotToFirestore(
  classId: string,
  student: ClassStudentRecord
): Promise<void> {
  const docId =
    student.id || `slot-${student.studentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
  const path = `classes/${classId}/students/${docId}`;
  try {
    await setDoc(
      doc(db, 'classes', classId, 'students', docId),
      {
        studentUid:
          student.id.startsWith('slot-') || student.id.startsWith('st-')
            ? ''
            : student.id,
        studentCode: student.studentCode.trim().toUpperCase().slice(0, 40),
        name: student.name.trim().slice(0, 120),
        hskLevel: student.hskLevel || 'HSK 3',
        joinedAt: new Date().toISOString().slice(0, 10),
        vocabScore: student.vocabScore || '0/18 từ',
        writingScore: student.writingScore || '90% độ chuẩn nét',
        quizScore: student.quizScore || '0/10 câu đúng',
        totalPoints: Number(student.totalPoints || 0),
        status: student.status || 'Đã chấm tự động',
        feedback: student.feedback || '',
        timeSeconds: Number(student.timeSeconds || 30),
        streak: Number(student.streak || 1),
      },
      { merge: true }
    );

    // Also update leaderboard summary for this student
    await setDoc(
      doc(db, 'classes', classId, 'leaderboard', docId),
      {
        studentUid: docId,
        studentCode: student.studentCode.trim().toUpperCase().slice(0, 40),
        name: student.name.trim().slice(0, 120),
        hskLevel: student.hskLevel || 'HSK 3',
        score: Math.max(0, Math.min(100, Number(student.totalPoints || 0))),
        timeSeconds: Number(student.timeSeconds || 30),
        streak: Number(student.streak || 1),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTeacherStudentSlotFromFirestore(
  classId: string,
  studentId: string,
  studentCode?: string
): Promise<void> {
  const path = `classes/${classId}/students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId, 'students', studentId));
    await deleteDoc(doc(db, 'classes', classId, 'leaderboard', studentId)).catch(
      () => {}
    );
    if (studentCode) {
      const slotId = `slot-${studentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      await deleteDoc(doc(db, 'classes', classId, 'students', slotId)).catch(() => {});
      await deleteDoc(doc(db, 'classes', classId, 'leaderboard', slotId)).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Student submits an assignment to `/classes/{classId}/submissions/{submissionId}`
 * and updates `/classes/{classId}/leaderboard/{studentUid}`.
 * Note: Security rules enforce `studentUid == request.auth.uid` and forbid modifying a submission once created.
 */
export async function submitStudentAssignmentToFirestore(params: {
  classId: string;
  studentUid: string;
  studentCode: string;
  studentName: string;
  hskLevel: string;
  assignmentId: string;
  score: number;
  answers: Record<string, unknown>;
  timeSeconds?: number;
  streak?: number;
  learnedVocabCount?: number;
  totalVocabCount?: number;
  writingAccuracy?: number;
  quizCorrectCount?: number;
  quizTotalCount?: number;
  reviewWords?: string[];
}): Promise<string> {
  const submissionId = `sub-${params.studentUid}-${Date.now()}`;
  const subPath = `classes/${params.classId}/submissions/${submissionId}`;
  const nowIso = new Date().toISOString();
  const clampedScore = Math.max(0, Math.min(100, Math.round(params.score)));

  try {
    await setDoc(doc(db, 'classes', params.classId, 'submissions', submissionId), {
      studentUid: params.studentUid,
      studentCode: params.studentCode.slice(0, 40),
      studentName: params.studentName.slice(0, 120),
      assignmentId: (params.assignmentId || 'default-assignment').slice(0, 120),
      score: clampedScore,
      answers: params.answers || {},
      submittedAt: nowIso,
    });

    await setDoc(
      doc(db, 'classes', params.classId, 'leaderboard', params.studentUid),
      {
        studentUid: params.studentUid,
        studentCode: params.studentCode.slice(0, 40),
        name: params.studentName.slice(0, 120),
        hskLevel: (params.hskLevel || 'HSK 3').slice(0, 40),
        score: clampedScore,
        timeSeconds: Math.max(1, Math.round(params.timeSeconds || 20)),
        streak: Math.max(1, Math.round(params.streak || 1)),
        updatedAt: nowIso,
      }
    );

    return submissionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, subPath);
  }
}

/**
 * Saves a student's personal SRS flashcard progress and "đã thuộc" state to `/users/{studentUid}/srs/{wordId}`.
 */
export async function saveStudentSrsWordToFirestore(
  studentUid: string,
  wordId: string,
  hanziOrRecord:
    | string
    | (Partial<SrsWordRecord> & {
        hanzi?: string;
        pinyin?: string;
        meaning?: string;
        learned?: boolean;
      }),
  learnedArg?: boolean,
  srsRecordArg?: SrsWordRecord
): Promise<void> {
  if (!studentUid || !wordId) return;
  const cleanWordId = wordId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  const path = `users/${studentUid}/srs/${cleanWordId}`;
  const isObj = typeof hanziOrRecord === 'object' && hanziOrRecord !== null;
  const hanzi = isObj ? String(hanziOrRecord.hanzi || wordId) : String(hanziOrRecord || wordId);
  const learned = isObj ? Boolean(hanziOrRecord.learned) : Boolean(learnedArg);
  const rec: Record<string, unknown> = isObj
    ? (hanziOrRecord as Record<string, unknown>)
    : ((srsRecordArg as unknown as Record<string, unknown>) || {});

  try {
    await setDoc(
      doc(db, 'users', studentUid, 'srs', cleanWordId),
      {
        wordId: cleanWordId,
        hanzi: hanzi.slice(0, 40),
        learned,
        intervalDays: Number(rec.intervalDays ?? (learned ? 3 : 0)),
        easeFactor: Number(rec.easeFactor ?? 2.5),
        repetitions: Number(rec.repetitions ?? (learned ? 1 : 0)),
        dueAt: Number(rec.nextReviewAt ?? rec.dueAt ?? Date.now()),
        lastReviewedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToStudentSrs(
  studentUid: string,
  onUpdate: (
    srsMap: Record<
      string,
      {
        wordId: string;
        hanzi: string;
        learned: boolean;
        intervalDays: number;
        easeFactor: number;
        repetitions: number;
        dueAt: number;
      }
    >
  ) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'users', studentUid, 'srs'),
    (snap) => {
      const map: Record<
        string,
        {
          wordId: string;
          hanzi: string;
          learned: boolean;
          intervalDays: number;
          easeFactor: number;
          repetitions: number;
          dueAt: number;
        }
      > = {};
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        map[docSnap.id] = {
          wordId: String(d.wordId || docSnap.id),
          hanzi: String(d.hanzi || ''),
          learned: Boolean(d.learned),
          intervalDays: Number(d.intervalDays || 0),
          easeFactor: Number(d.easeFactor || 2.5),
          repetitions: Number(d.repetitions || 0),
          dueAt: Number(d.dueAt || Date.now()),
        };
      });
      onUpdate(map);
    },
    (error) => {
      console.warn('SRS subscription warning:', error.message);
    }
  );
}

/**
 * Subscribes in real-time to a classroom's decks, assignments, leaderboard, and (for teachers) students & submissions.
 */
export function subscribeToClassroom(
  classIdOrParams:
    | string
    | {
        classId: string;
        isTeacher: boolean;
        currentUid: string;
        onDeckUpdate?: (slides: VocabSlide[]) => void;
        onAssignmentUpdate?: (assignment: UploadedAssignmentPackage) => void;
        onStudentsUpdate?: (students: ClassStudentRecord[]) => void;
        onLeaderboardUpdate?: (entries: FirestoreLeaderboardDoc[]) => void;
        onSubmissionsUpdate?: (submissions: FirestoreSubmissionDoc[]) => void;
      },
  roleArg?: 'teacher' | 'student',
  callbacksArg?: {
    onDeckSlides?: (slides: VocabSlide[]) => void;
    onAssignment?: (assignment: UploadedAssignmentPackage) => void;
    onStudentsRoster?: (students: ClassStudentRecord[]) => void;
    onLeaderboard?: (
      entries: Array<FirestoreLeaderboardDoc & { uid?: string }>
    ) => void;
  }
): Unsubscribe {
  const params =
    typeof classIdOrParams === 'string'
      ? {
          classId: classIdOrParams,
          isTeacher: roleArg === 'teacher',
          currentUid: auth.currentUser?.uid || '',
          onDeckUpdate: callbacksArg?.onDeckSlides,
          onAssignmentUpdate: callbacksArg?.onAssignment,
          onStudentsUpdate: callbacksArg?.onStudentsRoster,
          onLeaderboardUpdate: callbacksArg?.onLeaderboard
            ? (entries: FirestoreLeaderboardDoc[]) =>
                callbacksArg.onLeaderboard!(
                  entries.map((e) => ({ ...e, uid: e.studentUid }))
                )
            : undefined,
        }
      : classIdOrParams;

  const unsubs: Unsubscribe[] = [];

  // 1. Decks listener
  unsubs.push(
    onSnapshot(
      collection(db, 'classes', params.classId, 'decks'),
      (snap) => {
        if (!snap.empty && params.onDeckUpdate) {
          const deckData = snap.docs[0].data();
          if (Array.isArray(deckData.slides) && deckData.slides.length > 0) {
            params.onDeckUpdate(deckData.slides as VocabSlide[]);
          }
        }
      },
      (err) => console.warn('Deck listener info:', err.message)
    )
  );

  // 2. Assignments listener
  unsubs.push(
    onSnapshot(
      collection(db, 'classes', params.classId, 'assignments'),
      (snap) => {
        if (!snap.empty && params.onAssignmentUpdate) {
          const data = snap.docs[0].data() as UploadedAssignmentPackage;
          params.onAssignmentUpdate({
            ...data,
            id: snap.docs[0].id,
          });
        }
      },
      (err) => console.warn('Assignment listener info:', err.message)
    )
  );

  // 3. Leaderboard listener (sanitized public class summary)
  unsubs.push(
    onSnapshot(
      collection(db, 'classes', params.classId, 'leaderboard'),
      (snap) => {
        if (params.onLeaderboardUpdate) {
          const list: FirestoreLeaderboardDoc[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({
              studentUid: String(data.studentUid || d.id),
              studentCode: String(data.studentCode || ''),
              name: String(data.name || ''),
              hskLevel: String(data.hskLevel || 'HSK 3'),
              score: Number(data.score || 0),
              timeSeconds: Number(data.timeSeconds || 25),
              streak: Number(data.streak || 1),
              updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
            });
          });
          params.onLeaderboardUpdate(list);
        }
      },
      (err) => console.warn('Leaderboard listener info:', err.message)
    )
  );

  // 4. Students roster listener
  unsubs.push(
    onSnapshot(
      collection(db, 'classes', params.classId, 'students'),
      (snap) => {
        if (params.onStudentsUpdate) {
          const byCode = new Map<string, ClassStudentRecord>();
          snap.forEach((d) => {
            const data = d.data();
            const code = String(data.studentCode || d.id).toUpperCase();
            const existing = byCode.get(code);
            if (!existing || (data.studentUid && d.id === data.studentUid)) {
              byCode.set(code, {
                id: String(data.studentUid || d.id),
                studentCode: code,
                name: String(data.name || code),
                hskLevel:
                  (data.hskLevel as ClassStudentRecord['hskLevel']) || 'HSK 3',
                vocabScore: String(data.vocabScore || '18/18 từ'),
                writingScore: String(data.writingScore || '92% độ chuẩn nét'),
                quizScore: String(data.quizScore || '9/10 câu đúng'),
                totalPoints: Number(data.totalPoints || 0),
                status:
                  (data.status as ClassStudentRecord['status']) ||
                  'Đã chấm tự động',
                feedback: String(data.feedback || 'Đã đồng bộ trên Firestore.'),
                timeSeconds: Number(data.timeSeconds || 30),
                streak: Number(data.streak || 1),
                lastSubmittedAt: data.lastSubmittedAt
                  ? String(data.lastSubmittedAt)
                  : undefined,
              });
            }
          });
          params.onStudentsUpdate(Array.from(byCode.values()));
        }
      },
      (err) => console.warn('Students listener info:', err.message)
    )
  );

  // 5. Submissions listener (Teacher reads all class submissions; Student reads only their own submissions)
  const subQuery = params.isTeacher
    ? collection(db, 'classes', params.classId, 'submissions')
    : query(
        collection(db, 'classes', params.classId, 'submissions'),
        where('studentUid', '==', params.currentUid)
      );

  unsubs.push(
    onSnapshot(
      subQuery,
      (snap) => {
        if (params.onSubmissionsUpdate) {
          const subs: FirestoreSubmissionDoc[] = [];
          snap.forEach((d) => {
            const data = d.data();
            subs.push({
              id: d.id,
              studentUid: String(data.studentUid || ''),
              studentCode: data.studentCode ? String(data.studentCode) : undefined,
              studentName: data.studentName ? String(data.studentName) : undefined,
              assignmentId: String(data.assignmentId || 'default-assignment'),
              score: Number(data.score || 0),
              answers: (data.answers as Record<string, unknown>) || {},
              submittedAt: String(data.submittedAt || ''),
            });
          });
          params.onSubmissionsUpdate(subs);
        }
      },
      (err) => console.warn('Submissions listener info:', err.message)
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

/**
 * Legacy JSON Data Migration Tool (Mục 5):
 * Parses a legacy JSON backup file (from `exportFullSystemBackupToFile` or `data/classroom-state.json`)
 * and creates/updates the class, student roster, vocabulary deck, assignment, and leaderboard in Firestore.
 */
export async function importLegacyBackupToFirestore(
  paramsOrBackupObj:
    | {
        rawJson: string;
        teacherUid: string;
        teacherName: string;
        targetClassId?: string;
      }
    | Record<string, unknown>,
  classNameOverride?: string
): Promise<{
  classId: string;
  joinCode: string;
  studentsCount: number;
  slidesCount: number;
  hasAssignment: boolean;
  importedStudents: number;
  importedSlides: number;
  classDoc: ClassroomMetadata;
}> {
  let parsed: Record<string, unknown>;
  let teacherUid = auth.currentUser?.uid || 'teacher';
  let teacherName = auth.currentUser?.displayName || 'Giáo viên HSK';
  let targetClassId: string | undefined;

  if (
    typeof paramsOrBackupObj === 'object' &&
    paramsOrBackupObj !== null &&
    typeof (paramsOrBackupObj as any).rawJson === 'string'
  ) {
    const p = paramsOrBackupObj as {
      rawJson: string;
      teacherUid: string;
      teacherName: string;
      targetClassId?: string;
    };
    teacherUid = p.teacherUid || teacherUid;
    teacherName = p.teacherName || teacherName;
    targetClassId = p.targetClassId;
    try {
      parsed = JSON.parse(p.rawJson);
    } catch {
      throw new Error('File JSON không đúng định dạng.');
    }
  } else {
    parsed = (paramsOrBackupObj as Record<string, unknown>) || {};
  }

  const nowIso = new Date().toISOString();
  const classId = targetClassId || `lop-migrated-${Date.now().toString(36)}`;
  const joinCode = `HANU-${classId.slice(-4).toUpperCase()}`;
  const className = (
    classNameOverride || 'Lớp HSK 3.0 (Đã khôi phục từ JSON)'
  ).slice(0, 160);

  const slides: VocabSlide[] = Array.isArray(parsed.slides)
    ? (parsed.slides as VocabSlide[])
    : INITIAL_VOCAB_SLIDES;
  const students: ClassStudentRecord[] = Array.isArray(parsed.roster)
    ? (parsed.roster as ClassStudentRecord[])
    : Array.isArray(parsed.students)
    ? (parsed.students as ClassStudentRecord[])
    : [];
  const customAssignment = (parsed.assignment ||
    parsed.customAssignment) as UploadedAssignmentPackage | undefined;

  const batch = writeBatch(db);

  const classDoc: ClassroomMetadata = {
    id: classId,
    teacherUid,
    teacherName: teacherName.slice(0, 120),
    name: className,
    hskLevel: 'HSK 3',
    joinCode,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Ensure class document exists
  batch.set(
    doc(db, 'classes', classId),
    {
      teacherUid,
      teacherName: teacherName.slice(0, 120),
      name: className,
      hskLevel: 'HSK 3',
      joinCode,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  // 2. Write vocabulary slide deck
  batch.set(doc(db, 'classes', classId, 'decks', 'main'), {
    id: 'main',
    title: 'Bộ từ vựng HSK 3.0 (Khôi phục từ JSON)',
    hskLevel: 'HSK 3',
    teacherUid,
    slides,
    updatedAt: nowIso,
  });

  // 3. Write custom assignment if present
  if (customAssignment && (customAssignment.sessionTitle || customAssignment.fileName)) {
    const assignId = customAssignment.id || 'default-assignment';
    batch.set(doc(db, 'classes', classId, 'assignments', assignId), {
      ...customAssignment,
      id: assignId,
      title: (
        customAssignment.sessionTitle ||
        customAssignment.fileName ||
        'Bài tập HSK 3.0'
      ).slice(0, 240),
      teacherUid,
      updatedAt: nowIso,
    });
  }

  // 4. Write students and leaderboard entries
  let studentsCount = 0;
  for (const st of students) {
    if (!st || !st.name) continue;
    const cleanCode = String(
      st.studentCode || `HV-${String(studentsCount + 1).padStart(3, '0')}`
    )
      .trim()
      .toUpperCase()
      .slice(0, 40);
    const slotId = `slot-${cleanCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
    const score = Math.max(
      0,
      Math.min(100, Number(st.totalPoints ?? (st as any).totalScore ?? 0))
    );

    batch.set(doc(db, 'classes', classId, 'students', slotId), {
      studentUid: '',
      studentCode: cleanCode,
      name: String(st.name).trim().slice(0, 120),
      hskLevel: String(st.hskLevel || 'HSK 3').slice(0, 40),
      joinedAt: nowIso.slice(0, 10),
      vocabScore: String(st.vocabScore || '18/18 từ'),
      writingScore: String(st.writingScore || '90% độ chuẩn nét'),
      quizScore: String(st.quizScore || '9/10 câu đúng'),
      totalPoints: score,
      status: String(st.status || 'Đã chấm tự động'),
      feedback: String(st.feedback || 'Khôi phục từ file backup JSON.'),
      timeSeconds: Number(st.timeSeconds || 30),
      streak: Number(st.streak || 1),
    });

    batch.set(doc(db, 'classes', classId, 'leaderboard', slotId), {
      studentUid: slotId,
      studentCode: cleanCode,
      name: String(st.name).trim().slice(0, 120),
      hskLevel: String(st.hskLevel || 'HSK 3').slice(0, 40),
      score,
      timeSeconds: Number(st.timeSeconds || 30),
      streak: Number(st.streak || 1),
      updatedAt: nowIso,
    });

    studentsCount++;
  }

  try {
    await batch.commit();
    return {
      classId,
      joinCode,
      studentsCount,
      slidesCount: slides.length,
      importedStudents: studentsCount,
      importedSlides: slides.length,
      classDoc,
      hasAssignment: Boolean(
        customAssignment?.sessionTitle || customAssignment?.fileName
      ),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `classes/${classId}`);
  }
}

export { onAuthStateChanged, type User };
