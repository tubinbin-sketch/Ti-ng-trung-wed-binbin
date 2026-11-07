import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken as getAppCheckToken,
  type AppCheck,
} from 'firebase/app-check';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  linkWithPopup,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  enableNetwork,
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
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';
import {
  INITIAL_VOCAB_SLIDES,
  type VocabSlide,
} from './data/chineseData';
import {
  ClassStudentRecord,
  generateRandomJoinCode,
  generateRandomStudentCode,
  registerFirebaseAppCheckGetter,
  registerFirebaseTokenGetter,
} from './utils/chineseEngine';
import {
  extractAssignmentAnswerKey,
  sanitizeAssignmentForPublic,
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

function createFirestoreInstance(): Firestore {
  if (typeof window !== 'undefined') {
    try {
      return initializeFirestore(
        app,
        {
          experimentalAutoDetectLongPolling: true,
        },
        firebaseConfig.firestoreDatabaseId
      );
    } catch {
      // Fallback if Firestore was already initialized in this tab
    }
  }
  return getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);

let appCheckInstance: AppCheck | null = null;
if (typeof window !== 'undefined') {
  const recaptchaSiteKey = (envConfig.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim();
  const isValidSiteKey =
    recaptchaSiteKey.length >= 20 &&
    recaptchaSiteKey.toLowerCase() !== 'disabled' &&
    recaptchaSiteKey.toLowerCase() !== 'false' &&
    recaptchaSiteKey.toLowerCase() !== 'none';
  if (isValidSiteKey) {
    try {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // Ignore if App Check is already initialized
    }
  } else if (envConfig.PROD) {
    console.warn(
      '[Firebase App Check] VITE_RECAPTCHA_ENTERPRISE_SITE_KEY chưa được cấu hình lúc build production. Header X-Firebase-AppCheck sẽ rỗng; nếu server bật ENFORCE_APP_CHECK=true (mặc định trên production), các request /api/* sẽ trả về 401.'
    );
  }
}

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

// Register Firebase ID Token & App Check Token providers for Gemini AI server routes (/api/hanzi/enrich, /api/hanzi/suggest, /api/binbin/chat)
registerFirebaseTokenGetter(async () => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
});

registerFirebaseAppCheckGetter(async () => {
  if (!appCheckInstance) return '';
  try {
    const appCheckTokenResult = await getAppCheckToken(appCheckInstance, false);
    return appCheckTokenResult?.token || '';
  } catch {
    return '';
  }
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
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    await enableNetwork(db).catch(() => {});
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error('Please check your Firebase configuration.');
      }
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
 * Returns Authorization header with current Firebase user's ID Token
 * and X-Firebase-AppCheck header (when App Check is configured) for server routes.
 */
export async function getFirebaseAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'X-Firebase-AppCheck': '',
  };
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // Ignore token refresh errors
  }

  if (appCheckInstance) {
    try {
      const appCheckTokenResult = await getAppCheckToken(appCheckInstance, false);
      if (appCheckTokenResult?.token) {
        headers['X-Firebase-AppCheck'] = appCheckTokenResult.token;
      }
    } catch {
      // Ignore App Check token errors when not enforced
    }
  }

  return headers;
}

/**
 * Generates a unique random joinCode (at least 6 random characters, never derived from uid)
 * and verifies that `/joinCodes/{code}` does not already exist.
 */
async function reserveUniqueRandomJoinCode(
  classId: string,
  teacherUid: string,
  preferredCode?: string
): Promise<string> {
  const nowIso = new Date().toISOString();
  const cleanPreferred = (preferredCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate =
      attempt === 0 && cleanPreferred.length >= 6
        ? cleanPreferred.slice(0, 32)
        : generateRandomJoinCode('HSK');

    try {
      const existingSnap = await getDoc(doc(db, 'joinCodes', candidate));
      if (existingSnap.exists()) {
        if (existingSnap.data()?.classId === classId) {
          return candidate;
        }
        continue;
      }

      await setDoc(doc(db, 'joinCodes', candidate), {
        classId,
        teacherUid,
        createdAt: nowIso,
      });
      return candidate;
    } catch {
      // If reservation failed due to collision, retry with a fresh random code
    }
  }

  const fallbackCode = generateRandomJoinCode('HSK');
  await setDoc(doc(db, 'joinCodes', fallbackCode), {
    classId,
    teacherUid,
    createdAt: nowIso,
  });
  return fallbackCode;
}

/**
 * Teacher Google Sign-In via Firebase Auth Popup.
 * Calls server `/api/teachers/bootstrap` to verify `TEACHER_EMAIL_ALLOWLIST` and set custom claim `role = 'teacher'`,
 * refreshes the ID token so Firestore security rules recognize `request.auth.token.role == 'teacher'`,
 * and ensures at least one default class exists for the teacher.
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
  const displayName = (
    user.displayName ||
    user.email?.split('@')[0] ||
    'Giảng viên HANU'
  ).slice(0, 120);

  const authHeaders = await getFirebaseAuthHeaders();
  const bootstrapRes = await fetch('/api/teachers/bootstrap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ displayName }),
  });

  if (!bootstrapRes.ok) {
    let errMsg = 'Tài khoản Google này không nằm trong danh sách Giảng viên được cấp phép (TEACHER_EMAIL_ALLOWLIST).';
    try {
      const errData = await bootstrapRes.json();
      if (errData?.error) errMsg = String(errData.error);
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  // Force token refresh so custom claim `role: 'teacher'` is immediately available to Firestore rules
  await user.getIdToken(true);

  const allClasses = await fetchTeacherClasses(user.uid, displayName);
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

    // Bootstrap a default class for this teacher using a random joinCode (never derived from uid)
    const classId = `lop-hsk3-${Date.now().toString(36)}`;
    const randomJoinCode = generateRandomJoinCode('HANU');
    const nowIso = new Date().toISOString();
    const newClass: ClassroomMetadata = {
      id: classId,
      teacherUid,
      teacherName: teacherDisplayName.slice(0, 120),
      name: 'Lớp HSK 3.0 Chuẩn HANU',
      hskLevel: 'HSK 3',
      joinCode: randomJoinCode,
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

    const verifiedJoinCode = await reserveUniqueRandomJoinCode(
      classId,
      teacherUid,
      randomJoinCode
    );
    if (verifiedJoinCode !== randomJoinCode) {
      newClass.joinCode = verifiedJoinCode;
      await updateDoc(doc(db, 'classes', classId), { joinCode: verifiedJoinCode });
    }

    // Seed default vocabulary deck ONLY (do NOT auto-create Buổi 14 assignment; teacher chooses via "Thêm bài mẫu")
    await setDoc(doc(db, 'classes', classId, 'decks', 'main'), {
      id: 'main',
      title: 'Bộ từ vựng HSK 3.0 Trọng tâm',
      hskLevel: 'HSK 3',
      teacherUid,
      slides: INITIAL_VOCAB_SLIDES,
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

  const candidateJoinCode = (
    params.joinCode?.trim() || generateRandomJoinCode('HSK')
  )
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');

  const safeJoinCode =
    candidateJoinCode.length >= 6 ? candidateJoinCode.slice(0, 32) : generateRandomJoinCode('HSK');

  const classId = `lop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const metadata: ClassroomMetadata = {
    id: classId,
    teacherUid: params.teacherUid,
    teacherName: params.teacherName.slice(0, 120),
    name: params.name.trim().slice(0, 160),
    hskLevel: params.hskLevel.trim().slice(0, 40) || 'HSK 3',
    joinCode: safeJoinCode,
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

    const reservedCode = await reserveUniqueRandomJoinCode(
      classId,
      metadata.teacherUid,
      metadata.joinCode
    );
    if (reservedCode !== metadata.joinCode) {
      metadata.joinCode = reservedCode;
      await updateDoc(doc(db, 'classes', classId), { joinCode: reservedCode });
    }

    await setDoc(doc(db, 'classes', classId, 'decks', 'main'), {
      id: 'main',
      title: `Bài giảng ${metadata.name}`,
      hskLevel: metadata.hskLevel,
      teacherUid: metadata.teacherUid,
      slides: INITIAL_VOCAB_SLIDES,
      updatedAt: nowIso,
    });

    return metadata;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `classes/${classId}`);
  }
}

/**
 * Student joins a class exclusively through the server (`POST /api/classes/join`).
 * The server verifies the Firebase ID token, checks `joinCodes/{joinCode}`, verifies the
 * teacher-issued `studentCode` slot is unclaimed, and writes `classes/{classId}/students/{uid}`.
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

  if (!cleanJoinCode || cleanJoinCode.length < 6) {
    throw new Error('Vui lòng nhập Mã lớp hợp lệ (tối thiểu 6 ký tự) do Giảng viên cung cấp.');
  }

  let currentUser = auth.currentUser;
  if (params.useGooglePopup) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    if (currentUser && currentUser.isAnonymous) {
      try {
        const linked = await linkWithPopup(currentUser, provider);
        currentUser = linked.user;
      } catch {
        const cred = await signInWithPopup(auth, provider);
        currentUser = cred.user;
      }
    } else {
      const cred = await signInWithPopup(auth, provider);
      currentUser = cred.user;
    }
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

  const authHeaders = await getFirebaseAuthHeaders();
  const response = await fetch('/api/classes/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      joinCode: cleanJoinCode,
      studentCode: cleanStudentCode || undefined,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      String(
        payload?.error ||
          'Không thể tham gia lớp học. Vui lòng kiểm tra lại Mã lớp và Mã học sinh.'
      )
    );
  }

  return {
    user: currentUser,
    classroom: payload.classroom as ClassroomMetadata,
    studentRecord: payload.studentRecord as ClassStudentRecord,
  };
}

/**
 * Links an anonymous student account to Google via `linkWithPopup` so their UID,
 * SRS flashcards, and class progress are preserved across devices.
 */
export async function linkAnonymousStudentWithGoogle(): Promise<User> {
  const currentUser = auth.currentUser;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (!currentUser) {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  }

  if (!currentUser.isAnonymous) {
    return currentUser;
  }

  const linkedCred = await linkWithPopup(currentUser, provider);
  return linkedCred.user;
}

/**
 * Teacher resets or re-issues a student's code slot (`POST /api/classes/:classId/students/:studentCode/reset-slot`)
 * so the student can bind a new device if they lost an unlinked anonymous session.
 */
export async function resetTeacherStudentSlotInFirestore(
  classId: string,
  studentCode: string,
  regenerateCode = false
): Promise<{ studentCode: string; slotId: string }> {
  const authHeaders = await getFirebaseAuthHeaders();
  const response = await fetch(
    `/api/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(
      studentCode
    )}/reset-slot`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ regenerateCode }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      String(payload?.error || 'Không thể cấp lại mã học viên lúc này.')
    );
  }

  return {
    studentCode: String(payload.studentCode || studentCode),
    slotId: String(payload.slotId || ''),
  };
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

/**
 * Splits an assignment into:
 * 1. Sanitized public questions at `/classes/{classId}/assignments/{assignmentId}` (readable by class members)
 * 2. Confidential answer key at `/classes/{classId}/answerKeys/{assignmentId}` (readable ONLY by the class teacher & server)
 */
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
  const nowIso = new Date().toISOString();

  const sanitizedAssignment = sanitizeAssignmentForPublic(assignment);
  const answerKey = extractAssignmentAnswerKey(assignment, teacherUid, 1);

  try {
    await setDoc(doc(db, 'classes', classId, 'assignments', assignmentId), {
      ...sanitizedAssignment,
      id: assignmentId,
      title: (assignment.sessionTitle || assignment.fileName || 'Bài tập HSK 3.0').slice(
        0,
        240
      ),
      teacherUid,
      updatedAt: nowIso,
    });

    await setDoc(doc(db, 'classes', classId, 'answerKeys', assignmentId), {
      ...answerKey,
      assignmentId,
      teacherUid,
      updatedAt: nowIso,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveTeacherStudentSlotToFirestore(
  classId: string,
  student: ClassStudentRecord
): Promise<void> {
  const cleanStudentCode =
    student.studentCode.trim().toUpperCase().slice(0, 40) ||
    generateRandomStudentCode('HV');
  const docId =
    student.id || `slot-${cleanStudentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
  const path = `classes/${classId}/students/${docId}`;
  const points = Number(student.totalPoints || 0);
  try {
    await setDoc(
      doc(db, 'classes', classId, 'students', docId),
      {
        studentUid:
          student.id.startsWith('slot-') || student.id.startsWith('st-')
            ? ''
            : student.id,
        studentCode: cleanStudentCode,
        name: student.name.trim().slice(0, 120),
        hskLevel: student.hskLevel || 'HSK 3',
        joinedAt: new Date().toISOString().slice(0, 10),
        vocabScore: points > 0 ? student.vocabScore || '' : '',
        writingScore: points > 0 ? student.writingScore || '' : '',
        quizScore: points > 0 ? student.quizScore || '' : '',
        totalPoints: points,
        status: points > 0 ? student.status || 'Đã chấm tự động' : 'Chưa nộp',
        feedback: points > 0 ? student.feedback || '' : '',
        timeSeconds: points > 0 ? Number(student.timeSeconds || 0) : 0,
        streak: points > 0 ? Number(student.streak || 0) : 0,
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
    if (studentCode) {
      const slotId = `slot-${studentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      await deleteDoc(doc(db, 'classes', classId, 'students', slotId)).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface ServerSubmissionResponse {
  submissionId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  attemptCount: number;
  maxAttempts: number;
  quizScore: string;
  vocabScore: string;
  writingScore: string;
  reviewWords: string[];
  status: 'Đã chấm tự động' | 'Cần kèm thêm';
  feedback: string;
  timeSeconds: number;
  streak: number;
}

/**
 * Notifies the server (`POST /api/assignments/start`) that the authenticated student
 * has begun working on `assignmentId` in `classId` so the server records an authoritative
 * `startedAtMs` timestamp for leaderboard ranking.
 */
export async function startStudentAssignmentOnServer(params: {
  classId: string;
  assignmentId: string;
}): Promise<{ ok: boolean; startedAtMs?: number }> {
  if (!params.classId || !params.assignmentId) {
    return { ok: false };
  }
  try {
    const authHeaders = await getFirebaseAuthHeaders();
    const response = await fetch('/api/assignments/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        classId: params.classId,
        assignmentId: params.assignmentId,
      }),
    });
    if (!response.ok) {
      return { ok: false };
    }
    const payload = await response.json().catch(() => ({}));
    return {
      ok: true,
      startedAtMs: typeof payload?.startedAtMs === 'number' ? payload.startedAtMs : undefined,
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Student submits an assignment through the server (`POST /api/submissions`).
 * The server verifies class membership, checks maxAttempts, grades against `answerKeys`,
 * computes server-authoritative elapsed `timeSeconds`, and writes `submissions/{assignmentId}_{uid}`,
 * `leaderboard/{uid}`, and `students/{uid}` inside a single atomic transaction.
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
}): Promise<ServerSubmissionResponse> {
  const authHeaders = await getFirebaseAuthHeaders();
  const response = await fetch('/api/submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      classId: params.classId,
      assignmentId: params.assignmentId || 'default-assignment',
      answers: params.answers || {},
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      String(payload?.error || 'Không thể nộp bài tập lên máy chủ lúc này.')
    );
  }

  return {
    submissionId: String(payload.submissionId || `${params.assignmentId}_${params.studentUid}`),
    score: Number(payload.score ?? params.score ?? 0),
    correctCount: Number(payload.correctCount ?? 0),
    totalQuestions: Number(payload.totalQuestions ?? 1),
    attemptCount: Number(payload.attemptCount ?? 1),
    maxAttempts: Number(payload.maxAttempts ?? 1),
    quizScore: String(payload.quizScore || ''),
    vocabScore: String(payload.vocabScore || ''),
    writingScore: String(payload.writingScore || ''),
    reviewWords: Array.isArray(payload.reviewWords) ? payload.reviewWords : [],
    status:
      payload.status === 'Cần kèm thêm' ? 'Cần kèm thêm' : 'Đã chấm tự động',
    feedback: String(payload.feedback || ''),
    timeSeconds: Number(payload.timeSeconds ?? 300),
    streak: Number(payload.streak ?? 1),
  };
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

  const rating = typeof rec.rating === 'string' ? rec.rating : '';
  const defaultIntervalDays =
    rating === 'mastered' ? 4 : rating === 'good' ? 1 : learned ? 3 : 0;
  const defaultEaseFactor =
    rating === 'forgot' || rating === 'again'
      ? 1.3
      : rating === 'hard'
      ? 1.8
      : rating === 'mastered'
      ? 2.8
      : 2.5;

  try {
    await setDoc(
      doc(db, 'users', studentUid, 'srs', cleanWordId),
      {
        wordId: cleanWordId,
        hanzi: hanzi.slice(0, 40),
        learned,
        intervalDays: Number(rec.intervalDays ?? defaultIntervalDays),
        easeFactor: Number(rec.easeFactor ?? defaultEaseFactor),
        repetitions: Number(rec.repetitions ?? rec.reviewCount ?? (learned ? 1 : 0)),
        dueAt: Number(
          rec.nextReviewTimestamp ?? rec.nextReviewAt ?? rec.dueAt ?? Date.now()
        ),
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
      void error;
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
      (err) => void err
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
      (err) => void err
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
              timeSeconds: Number(data.timeSeconds || 0),
              streak: Number(data.streak || 0),
              updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
            });
          });
          params.onLeaderboardUpdate(list);
        }
      },
      (err) => void err
    )
  );

  // 4. Students roster listener:
  // Teachers can list the full roster (`isClassTeacher`); students listen ONLY to their own document (`students/{uid}`).
  if (params.isTeacher) {
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
                  vocabScore: String(data.vocabScore ?? ''),
                  writingScore: String(data.writingScore ?? ''),
                  quizScore: String(data.quizScore ?? ''),
                  totalPoints: Number(data.totalPoints || 0),
                  status:
                    (data.status as ClassStudentRecord['status']) ||
                    'Chưa nộp',
                  feedback: String(data.feedback ?? ''),
                  timeSeconds: Number(data.timeSeconds || 0),
                  streak: Number(data.streak || 0),
                  lastSubmittedAt: data.lastSubmittedAt
                    ? String(data.lastSubmittedAt)
                    : undefined,
                });
              }
            });
            params.onStudentsUpdate(Array.from(byCode.values()));
          }
        },
        (err) => void err
      )
    );
  } else if (params.currentUid) {
    unsubs.push(
      onSnapshot(
        doc(db, 'classes', params.classId, 'students', params.currentUid),
        (docSnap) => {
          if (docSnap.exists() && params.onStudentsUpdate) {
            const data = docSnap.data();
            const code = String(data.studentCode || docSnap.id).toUpperCase();
            params.onStudentsUpdate([
              {
                id: docSnap.id,
                studentCode: code,
                name: String(data.name || code),
                hskLevel:
                  (data.hskLevel as ClassStudentRecord['hskLevel']) || 'HSK 3',
                vocabScore: String(data.vocabScore ?? ''),
                writingScore: String(data.writingScore ?? ''),
                quizScore: String(data.quizScore ?? ''),
                totalPoints: Number(data.totalPoints || 0),
                status:
                  (data.status as ClassStudentRecord['status']) || 'Chưa nộp',
                feedback: String(data.feedback ?? ''),
                timeSeconds: Number(data.timeSeconds || 0),
                streak: Number(data.streak || 0),
                lastSubmittedAt: data.lastSubmittedAt
                  ? String(data.lastSubmittedAt)
                  : undefined,
              },
            ]);
          }
        },
        (err) => void err
      )
    );
  }

  // 5. Submissions listener (Teacher reads all class submissions; Student reads only their own submissions)
  if (params.onSubmissionsUpdate && (params.isTeacher || params.currentUid)) {
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
        (err) => void err
      )
    );
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}

/**
 * Legacy JSON Data Migration Tool:
 * Parses a legacy JSON backup file and creates/updates the class, joinCode, student roster, vocabulary deck, and assignment in Firestore.
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
  const joinCode = generateRandomJoinCode('HANU');
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

  // 1. Ensure class document and joinCodes mapping exist
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

  batch.set(doc(db, 'joinCodes', joinCode), {
    classId,
    teacherUid,
    createdAt: nowIso,
  });

  // 2. Write vocabulary slide deck
  batch.set(doc(db, 'classes', classId, 'decks', 'main'), {
    id: 'main',
    title: 'Bộ từ vựng HSK 3.0 (Khôi phục từ JSON)',
    hskLevel: 'HSK 3',
    teacherUid,
    slides,
    updatedAt: nowIso,
  });

  // 3. Write custom assignment (sanitized) + answerKey if present
  if (customAssignment && (customAssignment.sessionTitle || customAssignment.fileName)) {
    const assignId = customAssignment.id || 'default-assignment';
    const sanitized = sanitizeAssignmentForPublic(customAssignment);
    const answerKey = extractAssignmentAnswerKey(customAssignment, teacherUid, 1);

    batch.set(doc(db, 'classes', classId, 'assignments', assignId), {
      ...sanitized,
      id: assignId,
      title: (
        customAssignment.sessionTitle ||
        customAssignment.fileName ||
        'Bài tập HSK 3.0'
      ).slice(0, 240),
      teacherUid,
      updatedAt: nowIso,
    });

    batch.set(doc(db, 'classes', classId, 'answerKeys', assignId), {
      ...answerKey,
      assignmentId: assignId,
      teacherUid,
      updatedAt: nowIso,
    });
  }

  // 4. Write students with random codes if missing
  let studentsCount = 0;
  for (const st of students) {
    if (!st || !st.name) continue;
    const rawCode = String(st.studentCode || '').trim().toUpperCase();
    const cleanCode = (
      rawCode.length >= 6 ? rawCode : generateRandomStudentCode('HV')
    ).slice(0, 40);
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
      vocabScore: String(st.vocabScore ?? ''),
      writingScore: String(st.writingScore ?? ''),
      quizScore: String(st.quizScore ?? ''),
      totalPoints: score,
      status: String(st.status || (score > 0 ? 'Đã chấm tự động' : 'Chưa nộp')),
      feedback: String(st.feedback ?? ''),
      timeSeconds: Number(st.timeSeconds || 0),
      streak: Number(st.streak || 0),
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
