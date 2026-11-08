import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR =
  path.basename(__dirname) === 'dist-server'
    ? path.resolve(__dirname, '..')
    : path.basename(__dirname) === 'services' && path.basename(path.dirname(__dirname)) === 'server'
    ? path.resolve(__dirname, '..', '..')
    : __dirname;

// Load Firebase project ID and Firestore Database ID from environment or firebase-applet-config.json
let defaultFirebaseProjectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  '';

let defaultFirestoreDatabaseId =
  process.env.FIRESTORE_DATABASE_ID ||
  process.env.VITE_FIRESTORE_DATABASE_ID ||
  '';

try {
  const configPath = path.resolve(ROOT_DIR, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!defaultFirebaseProjectId && parsed?.projectId) {
      defaultFirebaseProjectId = String(parsed.projectId);
    }
    if (
      !defaultFirestoreDatabaseId &&
      parsed?.firestoreDatabaseId &&
      !String(parsed.firestoreDatabaseId).includes('.')
    ) {
      defaultFirestoreDatabaseId = String(parsed.firestoreDatabaseId);
    }
  }
} catch {
  // ignore
}

if (!defaultFirestoreDatabaseId || defaultFirestoreDatabaseId.includes('.')) {
  defaultFirestoreDatabaseId = '(default)';
}

function ensureFirebaseAdminApp() {
  if (getAdminApps().length > 0) {
    return getAdminApps()[0]!;
  }
  const serviceAccountJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      return initializeAdminApp({
        credential: cert(credentials),
        projectId: credentials.project_id || defaultFirebaseProjectId || undefined,
      });
    } catch {
      // Fallback to application default / projectId initialization
    }
  }
  return initializeAdminApp(
    defaultFirebaseProjectId ? { projectId: defaultFirebaseProjectId } : undefined
  );
}

export const firebaseAdminApp = ensureFirebaseAdminApp();
export const adminDb =
  defaultFirestoreDatabaseId && defaultFirestoreDatabaseId !== '(default)'
    ? getAdminFirestore(firebaseAdminApp, defaultFirestoreDatabaseId)
    : getAdminFirestore(firebaseAdminApp);

// ============================================================================
// P2: RATE LIMIT DATA PRIVACY (HMAC-SHA256 KEY HASHING & FIRESTORE TTL POLICY)
// ============================================================================
/**
 * Retention window after a rate-limit window expires before Firestore TTL deletes the document.
 * Configure Firestore TTL policy on collection group `rateLimits` targeting field `expiresAt`.
 */
export const RATE_LIMIT_TTL_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_IN_MEMORY_RATE_LIMIT_DOCS = 5_000;

const ephemeralFallbackHmacSecret = crypto.randomBytes(32).toString('hex');

function getRateLimitHmacSecret(): string {
  const configured = (process.env.RATE_LIMIT_HMAC_SECRET || '').trim();
  if (configured.length >= 16) {
    return configured;
  }
  const projectSeed =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    defaultFirebaseProjectId ||
    '';
  if (projectSeed) {
    return `hanu-rl-hmac-v1:${projectSeed}`;
  }
  return ephemeralFallbackHmacSecret;
}

/**
 * Hashes a raw rate-limit identifier (such as IP or UID:IP) using HMAC-SHA256
 * so raw IP addresses, emails, or tokens are never persisted in Firestore `rateLimits/*`.
 */
export function hashRateLimitIdentifier(rawIdentifier: string, customSecret?: string): string {
  const clean = (rawIdentifier || 'unknown').trim();
  const secret =
    customSecret && customSecret.trim().length >= 8
      ? customSecret.trim()
      : getRateLimitHmacSecret();
  return crypto.createHmac('sha256', secret).update(clean).digest('hex').slice(0, 32);
}

/**
 * Builds a privacy-safe Firestore document ID `${scope}_${hmacHash}` for `rateLimits/{bucketId}`.
 * Preserves the scope prefix for operational metrics while never exposing raw IPs or tokens.
 */
export function buildPrivacySafeRateLimitBucketId(
  scope: string,
  rawKey: string,
  customSecret?: string
): string {
  const safeScope =
    scope
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 48) || 'general';
  // If rawKey is already a 32-hex HMAC digest, avoid double-hashing
  const isAlreadyHashed = /^[a-f0-9]{32}$/.test(rawKey.trim());
  const digest = isAlreadyHashed
    ? rawKey.trim()
    : hashRateLimitIdentifier(rawKey, customSecret);
  return `${safeScope}_${digest}`;
}

function normalizeRateLimitBucketId(bucketId: string): {
  safeId: string;
  scope: string;
  keyHash: string;
} {
  const knownScopes = [
    'api_general',
    'teacher_bootstrap',
    'ai_minute',
    'join_class',
    'assignment_start',
    'reset_student_slot',
  ];
  for (const sc of knownScopes) {
    if (bucketId.startsWith(`${sc}_`)) {
      const rawRemainder = bucketId.slice(sc.length + 1);
      const safeId = buildPrivacySafeRateLimitBucketId(sc, rawRemainder);
      return {
        safeId,
        scope: sc,
        keyHash: safeId.slice(sc.length + 1),
      };
    }
  }
  const safeId = buildPrivacySafeRateLimitBucketId('custom', bucketId);
  return {
    safeId,
    scope: 'custom',
    keyHash: safeId.slice('custom_'.length),
  };
}

// ============================================================================
// SERVER STORE ADAPTER (FIRESTORE ADMIN SDK + TESTABLE IN-MEMORY ADAPTER)
// ============================================================================
export interface ServerAnswerKeyRecord {
  assignmentId: string;
  teacherUid: string;
  classId?: string;
  multipleChoiceAnswers: Record<string, string>;
  sentenceOrderingAnswers: Record<string, string[]>;
  essayModels: Record<string, { targetWord: string; sampleSentence: string }>;
  maxAttempts?: number;
  updatedAt?: string;
}

export interface ClaimStudentSlotParams {
  joinCode: string;
  studentCode: string;
  uid: string;
  userName?: string;
  nowIso: string;
}

export type ClaimStudentSlotResult =
  | {
      status: 'ok';
      classroom: Record<string, any>;
      studentRecord: Record<string, any>;
    }
  | {
      status: 'error';
      httpStatus: number;
      error: string;
    };

export interface ResetStudentSlotParams {
  classId: string;
  targetStudentCode: string;
  teacherUid: string;
  regenerateCode: boolean;
  requestedNewCode?: string;
  nowIso: string;
}

export type ResetStudentSlotResult =
  | {
      status: 'ok';
      previousStudentCode: string;
      studentCode: string;
      slotId: string;
      preservedRecord: Record<string, any>;
    }
  | {
      status: 'error';
      httpStatus: number;
      error: string;
    };

export interface StartAssignmentTransactionParams {
  classId: string;
  assignmentId: string;
  uid: string;
  nowMs: number;
}

export type StartAssignmentTransactionResult =
  | {
      status: 'ok';
      classId: string;
      assignmentId: string;
      startedAtMs: number;
      startedAt: string;
    }
  | {
      status: 'error';
      httpStatus: number;
      error: string;
    };

export interface SubmitAssignmentTransactionParams {
  classId: string;
  assignmentId: string;
  uid: string;
  userName?: string;
  answers: Record<string, any>;
  configuredMaxAttempts: number;
  nowMs: number;
  submissionNonce?: string;
}

export type SubmitAssignmentTransactionResult =
  | {
      status: 'ok';
      payload: {
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
      };
    }
  | {
      status: 'error';
      httpStatus: number;
      error: string;
    };

export interface ServerStoreAdapter {
  getDoc(docPath: string): Promise<Record<string, any> | null>;
  setDoc(docPath: string, data: Record<string, any>, options?: { merge?: boolean }): Promise<void>;
  deleteDoc(docPath: string): Promise<void>;
  listCollection(collectionPath: string): Promise<Array<{ id: string; data: Record<string, any> }>>;
  incrementAiUsageTransaction(
    usageId: string,
    uid: string,
    dateStr: string,
    dailyLimit: number
  ): Promise<{ allowed: boolean; count: number; dailyLimit: number }>;
  incrementRateLimitTransaction(
    bucketId: string,
    maxRequests: number,
    windowMs: number,
    nowMs?: number
  ): Promise<{ allowed: boolean; count: number; resetAt: number }>;
  claimStudentSlotTransaction?(params: ClaimStudentSlotParams): Promise<ClaimStudentSlotResult>;
  resetStudentSlotTransaction?(params: ResetStudentSlotParams): Promise<ResetStudentSlotResult>;
  startAssignmentTransaction?(
    params: StartAssignmentTransactionParams
  ): Promise<StartAssignmentTransactionResult>;
  submitAssignmentTransaction?(
    params: SubmitAssignmentTransactionParams
  ): Promise<SubmitAssignmentTransactionResult>;
  setTeacherCustomClaim(uid: string): Promise<void>;
}

const SERVER_RANDOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateServerRandomCode(prefix = 'HV', length = 6): string {
  const safeLen = Math.max(6, Math.min(24, Math.floor(length)));
  let rand = '';
  for (let i = 0; i < safeLen; i++) {
    rand += SERVER_RANDOM_ALPHABET[crypto.randomInt(0, SERVER_RANDOM_ALPHABET.length)];
  }
  return `${prefix}-${rand}`;
}

/**
 * Computes authoritative elapsed time on the server without trusting client `timeSeconds`.
 * - If a server-recorded `startedAtMs` exists, computes `Math.round((submittedAtMs - startedAtMs) / 1000)`
 *   clamped to `[minFloorSeconds, 3600]`, where `minFloorSeconds = Math.max(5, totalQuestions * 2)`.
 * - If `startedAtMs` is absent or invalid, applies a conservative unverified default penalty (`300s`),
 *   preventing clients from forging fast leaderboard times by skipping `/api/assignments/start`.
 */
export function computeServerAuthoritativeTimeSeconds(params: {
  startedAtMs?: number | null;
  submittedAtMs: number;
  totalQuestions: number;
}): number {
  const { startedAtMs, submittedAtMs, totalQuestions } = params;
  const safeQuestions = Math.max(1, Math.floor(Number(totalQuestions || 1)));
  const minFloorSeconds = Math.max(5, safeQuestions * 2);
  const maxCeilingSeconds = 3600;
  const unverifiedPenaltySeconds = Math.max(minFloorSeconds, 300);

  if (
    typeof startedAtMs === 'number' &&
    Number.isFinite(startedAtMs) &&
    startedAtMs > 0 &&
    submittedAtMs >= startedAtMs
  ) {
    const elapsedSeconds = Math.round((submittedAtMs - startedAtMs) / 1000);
    return Math.max(minFloorSeconds, Math.min(maxCeilingSeconds, elapsedSeconds));
  }

  return unverifiedPenaltySeconds;
}

/**
 * Built-in server fallback answer keys for preset assignments (`assign-b14`, `assign-b15`, `speedtest-10`)
 * when a teacher assigns a preset package before saving a custom answerKey doc.
 */
export const BUILTIN_SERVER_ANSWER_KEYS: Record<string, ServerAnswerKeyRecord> = {
  'assign-b14': {
    assignmentId: 'assign-b14',
    teacherUid: 'system',
    multipleChoiceAnswers: {
      'mc-14-1': 'A',
      'mc-14-2': 'B',
      'mc-14-3': 'C',
    },
    sentenceOrderingAnswers: {
      'so-14-1': ['春天', '的', '阳光', '非常', '温暖', '。'],
      'so-14-2': ['咱们', '一起', '看', '个', '电影', '吧', '。'],
    },
    essayModels: {
      'es-14-1': { targetWord: '温暖', sampleSentence: '老师的关怀让我感到很温暖。' },
      'es-14-2': { targetWord: '换', sampleSentence: '请问，我可以在这里换人民币吗？' },
    },
    maxAttempts: 1,
  },
  'assign-b15': {
    assignmentId: 'assign-b15',
    teacherUid: 'system',
    multipleChoiceAnswers: {
      'mc-15-1': 'A',
      'mc-15-2': 'B',
      'mc-15-3': 'C',
    },
    sentenceOrderingAnswers: {
      'so-15-1': ['下午', '我', '想', '去', '超市', '买', '一件', '外套', '。'],
      'so-15-2': ['这些', '东西', '一共', '是', '多少', '钱', '？'],
    },
    essayModels: {
      'es-15-1': { targetWord: '贵', sampleSentence: '这个手机太贵了，我不买。' },
      'es-15-2': { targetWord: '一件', sampleSentence: '妈妈送给我一件很漂亮的衣服。' },
    },
    maxAttempts: 1,
  },
  'speedtest-10': {
    assignmentId: 'speedtest-10',
    teacherUid: 'system',
    multipleChoiceAnswers: {
      'stq-1': 'B. wēn nuǎn',
      'stq-2': 'C. 咱们 (zánmen)',
      'stq-3': 'A. 办法 (bànfǎ - cách giải quyết)',
      'stq-4': 'D. 我明天去图书馆复习。',
      'stq-5': 'B. Khá là / rất (nhấn mạnh mức độ vừa phải, tự nhiên)',
      'stq-6': 'C. Bộ Tài gẩy (扌)',
      'stq-7': 'D. Thanh 2 (ní hǎo / hén hǎo)',
      'stq-8': 'A. Chăm sóc, quan tâm',
      'stq-9': 'B. 我很愿意帮助你。',
      'stq-10': 'C. 一年有四个季节：春、夏、秋、冬。',
    },
    sentenceOrderingAnswers: {},
    essayModels: {},
    maxAttempts: 1,
  },
};

const DISALLOWED_ASSIGNMENT_STATUSES = new Set([
  'closed',
  'archived',
  'draft',
  'disabled',
  'locked',
  'expired',
]);

/**
 * Validates that:
 * 1. The classroom `classes/${classId}` exists.
 * 2. The student `classes/${classId}/students/${uid}` is an enrolled member of `classId`.
 * 3. The assignment exists and was assigned to `classId` by the class teacher (`assignments/${assignmentId}` or `answerKeys/${assignmentId}`).
 * 4. The assignment is currently in an active/open state (`status`, `isClosed`, `enabled`, `closedAt`, `dueDate`).
 * 5. The `answerKey` belongs to `assignmentId` and `classId` / `classData.teacherUid` (preventing cross-class access or answerKey tampering).
 */
export function validateAssignmentAndAnswerKeyAuthorization(params: {
  classId: string;
  assignmentId: string;
  uid: string;
  nowMs: number;
  classData: Record<string, any> | null;
  studentDoc: Record<string, any> | null;
  assignmentDoc: Record<string, any> | null;
  storedAnswerKey: ServerAnswerKeyRecord | null;
}):
  | {
      ok: true;
      answerKey: ServerAnswerKeyRecord;
      studentDoc: Record<string, any>;
    }
  | {
      ok: false;
      httpStatus: number;
      error: string;
    } {
  const {
    classId,
    assignmentId,
    uid,
    nowMs,
    classData,
    studentDoc,
    assignmentDoc,
    storedAnswerKey,
  } = params;

  if (!classData) {
    return {
      ok: false,
      httpStatus: 404,
      error: 'Lớp học không tồn tại trên hệ thống.',
    };
  }

  if (!studentDoc) {
    return {
      ok: false,
      httpStatus: 403,
      error: 'Forbidden: Bạn chưa tham gia lớp học này.',
    };
  }

  const boundUid = String(studentDoc.studentUid || '').trim();
  if (boundUid && boundUid !== uid) {
    return {
      ok: false,
      httpStatus: 403,
      error: 'Forbidden: Hồ sơ học viên không khớp với tài khoản đang đăng nhập.',
    };
  }

  const classTeacherUid = String(classData.teacherUid || '').trim();

  // Assignment must actually exist and be assigned to this class (via assignments/{assignmentId} or answerKeys/{assignmentId})
  if (!assignmentDoc && !storedAnswerKey) {
    return {
      ok: false,
      httpStatus: 404,
      error: `Bài tập "${assignmentId}" không tồn tại hoặc chưa được Giảng viên giao cho lớp học này.`,
    };
  }

  if (assignmentDoc) {
    const docAssignmentId = String(assignmentDoc.id || assignmentDoc.assignmentId || '').trim();
    if (docAssignmentId && docAssignmentId !== assignmentId) {
      return {
        ok: false,
        httpStatus: 403,
        error: 'Forbidden: Mã bài tập (assignmentId) không khớp với dữ liệu bài giao của lớp.',
      };
    }

    const docClassId = String(assignmentDoc.classId || '').trim();
    if (docClassId && docClassId !== classId) {
      return {
        ok: false,
        httpStatus: 403,
        error: 'Forbidden: Bài tập này thuộc lớp học khác, không thể truy cập chéo lớp.',
      };
    }

    const docTeacherUid = String(assignmentDoc.teacherUid || '').trim();
    if (
      docTeacherUid &&
      classTeacherUid &&
      docTeacherUid !== classTeacherUid &&
      docTeacherUid !== 'system'
    ) {
      return {
        ok: false,
        httpStatus: 403,
        error: 'Forbidden: Bài tập không do Giảng viên chủ nhiệm lớp này giao.',
      };
    }

    const rawStatus = String(assignmentDoc.status || 'active')
      .trim()
      .toLowerCase();
    if (
      DISALLOWED_ASSIGNMENT_STATUSES.has(rawStatus) ||
      assignmentDoc.isClosed === true ||
      assignmentDoc.enabled === false
    ) {
      return {
        ok: false,
        httpStatus: 403,
        error: 'Forbidden: Bài tập này hiện đã đóng hoặc chưa được phép làm bài.',
      };
    }

    if (assignmentDoc.closedAt) {
      const closedAtMs = Date.parse(String(assignmentDoc.closedAt));
      if (Number.isFinite(closedAtMs) && closedAtMs > 0 && nowMs > closedAtMs) {
        return {
          ok: false,
          httpStatus: 403,
          error: 'Forbidden: Bài tập này đã hết thời hạn nộp bài.',
        };
      }
    }
  }

  if (storedAnswerKey) {
    const keyAssignmentId = String(storedAnswerKey.assignmentId || '').trim();
    if (keyAssignmentId && keyAssignmentId !== assignmentId) {
      return {
        ok: false,
        httpStatus: 403,
        error: 'Forbidden: Đáp án (answerKey) không khớp với mã bài tập được yêu cầu.',
      };
    }

    const keyClassId = String((storedAnswerKey as Record<string, any>).classId || '').trim();
    if (keyClassId && keyClassId !== classId) {
      return {
        ok: false,
        httpStatus: 403,
        error: 'Forbidden: Đáp án (answerKey) không thuộc lớp học này.',
      };
    }

    const keyTeacherUid = String(storedAnswerKey.teacherUid || '').trim();
    if (
      keyTeacherUid &&
      classTeacherUid &&
      keyTeacherUid !== classTeacherUid &&
      keyTeacherUid !== 'system'
    ) {
      return {
        ok: false,
        httpStatus: 403,
        error: 'Forbidden: Đáp án (answerKey) không thuộc Giảng viên chủ nhiệm lớp này.',
      };
    }
  }

  const resolvedAnswerKey: ServerAnswerKeyRecord | null =
    storedAnswerKey || (assignmentDoc ? BUILTIN_SERVER_ANSWER_KEYS[assignmentId] || null : null);

  if (!resolvedAnswerKey) {
    return {
      ok: false,
      httpStatus: 404,
      error: `Không tìm thấy đáp án chấm điểm cho bài tập "${assignmentId}".`,
    };
  }

  return {
    ok: true,
    answerKey: resolvedAnswerKey,
    studentDoc,
  };
}

function matchesExpectedMultipleChoiceOption(actualRaw: string, expectedRaw: string): boolean {
  const actual = actualRaw.trim().toUpperCase();
  const expected = expectedRaw.trim().toUpperCase();
  if (!actual || !expected) return false;
  if (actual === expected) return true;
  if (expected.length === 1 && actual.startsWith(`${expected}.`)) return true;
  if (actual.length === 1 && expected.startsWith(`${actual}.`)) return true;
  return false;
}

export function gradeSubmissionPayloadOnServer(params: {
  answerKey: ServerAnswerKeyRecord;
  answers: Record<string, any>;
}): {
  score: number;
  correctCount: number;
  totalQuestions: number;
  quizScore: string;
  vocabScore: string;
  writingScore: string;
  reviewWords: string[];
  status: 'Đã chấm tự động' | 'Cần kèm thêm';
  feedback: string;
} {
  const { answerKey, answers } = params;
  const mcAnswers =
    (answers?.mcAnswers as Record<string, string> | undefined) ||
    (answers?.speedTestAnswers as Record<string, string> | undefined) ||
    (answers as Record<string, string>) ||
    {};
  const selectedTokensMap =
    (answers?.selectedTokensMap as Record<string, string[]> | undefined) || {};
  const essayAnswers =
    (answers?.essayAnswers as Record<string, string> | undefined) || {};

  let correctCount = 0;
  let totalQuestions = 0;
  const reviewWordsSet = new Set<string>();

  for (const [qId, expectedKey] of Object.entries(answerKey.multipleChoiceAnswers || {})) {
    totalQuestions += 1;
    const actual = String(mcAnswers[qId] ?? (answers as any)?.[qId] ?? '').trim();
    if (matchesExpectedMultipleChoiceOption(actual, String(expectedKey))) {
      correctCount += 1;
    }
  }

  for (const [qId, expectedTokens] of Object.entries(answerKey.sentenceOrderingAnswers || {})) {
    if (!Array.isArray(expectedTokens) || expectedTokens.length === 0) continue;
    totalQuestions += 1;
    const rawSubmitted = selectedTokensMap[qId] ?? (answers as any)?.[qId];
    const actualSentence = Array.isArray(rawSubmitted)
      ? rawSubmitted.join('').replace(/\s+/g, '')
      : String(rawSubmitted || '').replace(/\s+/g, '');
    const expectedSentence = expectedTokens.join('').replace(/\s+/g, '');
    if (actualSentence && actualSentence === expectedSentence) {
      correctCount += 1;
    }
  }

  for (const [qId, model] of Object.entries(answerKey.essayModels || {})) {
    totalQuestions += 1;
    const actualText = String(essayAnswers[qId] ?? (answers as any)?.[qId] ?? '').trim();
    const targetWord = String(model?.targetWord || '').trim();
    if (actualText.length >= 2 && (!targetWord || actualText.includes(targetWord))) {
      correctCount += 1;
    } else if (targetWord) {
      reviewWordsSet.add(targetWord);
    }
  }

  if (totalQuestions === 0) {
    totalQuestions = 1;
  }

  const score = Math.max(0, Math.min(100, Math.round((correctCount / totalQuestions) * 100)));
  const reviewWords = Array.from(reviewWordsSet);
  const learnedVocab = Math.max(0, Math.min(18, Math.round((score / 100) * 18)));
  const writingPct = score > 0 ? Math.min(100, Math.max(60, score)) : 0;
  const status: 'Đã chấm tự động' | 'Cần kèm thêm' =
    score < 90 ? 'Cần kèm thêm' : 'Đã chấm tự động';
  const feedback =
    reviewWords.length > 0
      ? `Chấm điểm trên Server đạt ${score}/100đ (${correctCount}/${totalQuestions} câu đúng) · Cần ôn lại: ${reviewWords.join(', ')}.`
      : `Hoàn thành bài tập đạt ${score}/100đ (${correctCount}/${totalQuestions} câu đúng), chấm tự động trên Server.`;

  return {
    score,
    correctCount,
    totalQuestions,
    quizScore: `${correctCount}/${totalQuestions} câu đúng`,
    vocabScore: `${learnedVocab}/18 từ`,
    writingScore: score > 0 ? `${writingPct}% độ chuẩn nét` : '',
    reviewWords,
    status,
    feedback,
  };
}

function selectRichestStudentRecord(
  docsList: Array<{ id: string; data: Record<string, any> }>
): Record<string, any> {
  let chosen = docsList[0]!.data;
  for (const item of docsList) {
    const d = item.data;
    const oldUid = String(d.studentUid || '').trim();
    const hasHigherScore = Number(d.totalPoints || 0) > Number(chosen.totalPoints || 0);
    const isBoundUidDoc = Boolean(oldUid && item.id === oldUid);
    if (isBoundUidDoc || hasHigherScore) {
      chosen = {
        ...chosen,
        ...d,
        totalPoints: Math.max(Number(chosen.totalPoints || 0), Number(d.totalPoints || 0)),
        streak: Math.max(Number(chosen.streak || 0), Number(d.streak || 0)),
        vocabScore: d.vocabScore || chosen.vocabScore || '',
        writingScore: d.writingScore || chosen.writingScore || '',
        quizScore: d.quizScore || chosen.quizScore || '',
        feedback: d.feedback || chosen.feedback || '',
        status:
          d.status && d.status !== 'Chưa nộp'
            ? d.status
            : chosen.status || 'Chưa nộp',
        reviewWords:
          Array.isArray(d.reviewWords) && d.reviewWords.length > 0
            ? d.reviewWords
            : Array.isArray(chosen.reviewWords)
            ? chosen.reviewWords
            : [],
        timeSeconds: Number(d.timeSeconds || chosen.timeSeconds || 0),
        lastSubmittedAt: d.lastSubmittedAt || chosen.lastSubmittedAt,
      };
    }
  }
  return chosen;
}

const firestoreServerStoreAdapter: ServerStoreAdapter = {
  async getDoc(docPath: string) {
    const snap = await adminDb.doc(docPath).get();
    return snap.exists ? (snap.data() as Record<string, any>) : null;
  },
  async setDoc(docPath: string, data: Record<string, any>, options?: { merge?: boolean }) {
    if (options?.merge) {
      await adminDb.doc(docPath).set(data, { merge: true });
    } else {
      await adminDb.doc(docPath).set(data);
    }
  },
  async deleteDoc(docPath: string) {
    await adminDb.doc(docPath).delete();
  },
  async listCollection(collectionPath: string) {
    const snap = await adminDb.collection(collectionPath).get();
    return snap.docs.map((d) => ({
      id: d.id,
      data: d.data() as Record<string, any>,
    }));
  },
  async incrementAiUsageTransaction(
    usageId: string,
    uid: string,
    dateStr: string,
    dailyLimit: number
  ) {
    const docRef = adminDb.doc(`aiUsage/${usageId}`);
    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const currentCount = snap.exists ? Number(snap.data()?.count || 0) : 0;
      if (currentCount >= dailyLimit) {
        return { allowed: false, count: currentCount, dailyLimit };
      }
      const nextCount = currentCount + 1;
      const nowMs = Date.now();
      const expiresAtDate = new Date(nowMs + 2 * RATE_LIMIT_TTL_RETENTION_MS);
      tx.set(
        docRef,
        {
          uid,
          date: dateStr,
          count: nextCount,
          updatedAt: new Date(nowMs).toISOString(),
          expiresAt: expiresAtDate,
          expiresAtIso: expiresAtDate.toISOString(),
        },
        { merge: true }
      );
      return { allowed: true, count: nextCount, dailyLimit };
    });
  },
  async incrementRateLimitTransaction(
    bucketId: string,
    maxRequests: number,
    windowMs: number,
    nowMs = Date.now()
  ) {
    const { safeId, scope, keyHash } = normalizeRateLimitBucketId(bucketId);
    const docRef = adminDb.doc(`rateLimits/${safeId}`);
    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const data = snap.exists ? (snap.data() as Record<string, any>) : null;
      const existingResetAt = Number(data?.resetAt || 0);
      const existingCount = Number(data?.count || 0);

      if (!data || nowMs > existingResetAt) {
        const resetAt = nowMs + windowMs;
        const expiresAtDate = new Date(resetAt + RATE_LIMIT_TTL_RETENTION_MS);
        tx.set(docRef, {
          bucketId: safeId,
          scope,
          keyHash,
          count: 1,
          resetAt,
          expiresAt: expiresAtDate,
          expiresAtIso: expiresAtDate.toISOString(),
          updatedAt: new Date(nowMs).toISOString(),
        });
        return { allowed: true, count: 1, resetAt };
      }

      if (existingCount >= maxRequests) {
        return { allowed: false, count: existingCount, resetAt: existingResetAt };
      }

      const nextCount = existingCount + 1;
      const expiresAtDate = new Date(existingResetAt + RATE_LIMIT_TTL_RETENTION_MS);
      tx.set(
        docRef,
        {
          bucketId: safeId,
          scope,
          keyHash,
          count: nextCount,
          resetAt: existingResetAt,
          expiresAt: expiresAtDate,
          expiresAtIso: expiresAtDate.toISOString(),
          updatedAt: new Date(nowMs).toISOString(),
        },
        { merge: true }
      );
      return { allowed: true, count: nextCount, resetAt: existingResetAt };
    });
  },
  async claimStudentSlotTransaction(params: ClaimStudentSlotParams): Promise<ClaimStudentSlotResult> {
    const { joinCode, studentCode, uid, userName, nowIso } = params;
    const joinCodeRef = adminDb.doc(`joinCodes/${joinCode}`);

    return await adminDb.runTransaction(async (tx) => {
      const joinCodeSnap = await tx.get(joinCodeRef);
      const joinCodeDoc = joinCodeSnap.exists ? (joinCodeSnap.data() as Record<string, any>) : null;
      if (!joinCodeDoc || !joinCodeDoc.classId) {
        return {
          status: 'error',
          httpStatus: 404,
          error: `Không tìm thấy lớp học với mã lớp "${joinCode}".`,
        };
      }

      const classId = String(joinCodeDoc.classId);
      const classRef = adminDb.doc(`classes/${classId}`);
      const ownStudentRef = adminDb.doc(`classes/${classId}/students/${uid}`);
      const userRef = adminDb.doc(`users/${uid}`);

      const [classSnap, ownStudentSnap, userSnap] = await Promise.all([
        tx.get(classRef),
        tx.get(ownStudentRef),
        tx.get(userRef),
      ]);

      if (!classSnap.exists) {
        return {
          status: 'error',
          httpStatus: 404,
          error: 'Lớp học không còn tồn tại trên hệ thống.',
        };
      }

      const classData = classSnap.data() as Record<string, any>;
      const classroom = {
        id: classId,
        teacherUid: String(classData.teacherUid || ''),
        teacherName: String(classData.teacherName || 'Giảng viên HSK'),
        name: String(classData.name || 'Lớp HSK 3.0'),
        hskLevel: String(classData.hskLevel || 'HSK 3'),
        joinCode: String(classData.joinCode || joinCode),
        createdAt: String(classData.createdAt || nowIso),
        updatedAt: classData.updatedAt ? String(classData.updatedAt) : undefined,
      };

      if (ownStudentSnap.exists) {
        const existingOwnStudent = ownStudentSnap.data() as Record<string, any>;
        if (
          studentCode &&
          existingOwnStudent.studentCode &&
          String(existingOwnStudent.studentCode).toUpperCase() !== studentCode
        ) {
          return {
            status: 'error',
            httpStatus: 403,
            error: `Tài khoản của bạn đã gắn với mã học sinh ${existingOwnStudent.studentCode}. Không thể đổi sang mã ${studentCode}.`,
          };
        }

        return {
          status: 'ok',
          classroom,
          studentRecord: {
            id: uid,
            studentCode: String(existingOwnStudent.studentCode || studentCode),
            name: String(existingOwnStudent.name || userName || 'Học viên'),
            hskLevel: String(existingOwnStudent.hskLevel || classroom.hskLevel),
            vocabScore: String(existingOwnStudent.vocabScore ?? ''),
            writingScore: String(existingOwnStudent.writingScore ?? ''),
            quizScore: String(existingOwnStudent.quizScore ?? ''),
            totalPoints: Number(existingOwnStudent.totalPoints || 0),
            status: String(existingOwnStudent.status || 'Chưa nộp'),
            feedback: String(existingOwnStudent.feedback ?? ''),
            timeSeconds: Number(existingOwnStudent.timeSeconds || 0),
            streak: Number(existingOwnStudent.streak || 0),
            reviewWords: Array.isArray(existingOwnStudent.reviewWords)
              ? existingOwnStudent.reviewWords
              : [],
          },
        };
      }

      if (!studentCode || studentCode.length < 6) {
        return {
          status: 'error',
          httpStatus: 400,
          error: 'Vui lòng nhập Mã học sinh hợp lệ (tối thiểu 6 ký tự) do Giảng viên cấp.',
        };
      }

      const slotSlug = studentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const canonicalSlotRef = adminDb.doc(`classes/${classId}/students/slot-${slotSlug}`);
      const lockRef = adminDb.doc(`classes/${classId}/studentCodeLocks/${studentCode}`);
      const slotQuery = adminDb
        .collection(`classes/${classId}/students`)
        .where('studentCode', '==', studentCode);

      const [canonicalSlotSnap, lockSnap, querySnap] = await Promise.all([
        tx.get(canonicalSlotRef),
        tx.get(lockRef),
        tx.get(slotQuery),
      ]);

      const lockData = lockSnap.exists ? (lockSnap.data() as Record<string, any>) : null;
      const lockedUid = String(lockData?.studentUid || '').trim();
      if (lockedUid && lockedUid !== uid) {
        return {
          status: 'error',
          httpStatus: 409,
          error: `Mã học sinh "${studentCode}" đã được kích hoạt bởi một tài khoản khác.`,
        };
      }

      let matchedSlotId: string | null = null;
      let matchedSlotData: Record<string, any> | null = null;

      if (canonicalSlotSnap.exists) {
        matchedSlotId = canonicalSlotSnap.id;
        matchedSlotData = canonicalSlotSnap.data() as Record<string, any>;
      }

      for (const docSnap of querySnap.docs) {
        const d = docSnap.data() as Record<string, any>;
        const boundUid = String(d.studentUid || '').trim();
        if (boundUid && boundUid !== uid) {
          return {
            status: 'error',
            httpStatus: 409,
            error: `Mã học sinh "${studentCode}" đã được kích hoạt bởi một tài khoản khác.`,
          };
        }
        if (!matchedSlotData) {
          matchedSlotId = docSnap.id;
          matchedSlotData = d;
        }
      }

      if (!matchedSlotData || !matchedSlotId) {
        return {
          status: 'error',
          httpStatus: 404,
          error: `Mã học sinh "${studentCode}" chưa được Giảng viên cấp trong lớp "${classroom.name}".`,
        };
      }

      const existingBoundUid = String(matchedSlotData.studentUid || '').trim();
      if (existingBoundUid && existingBoundUid !== uid) {
        return {
          status: 'error',
          httpStatus: 409,
          error: `Mã học sinh "${studentCode}" đã được kích hoạt bởi một tài khoản khác.`,
        };
      }

      const studentName = String(matchedSlotData.name || userName || studentCode)
        .trim()
        .slice(0, 120);
      const hskLevel = String(matchedSlotData.hskLevel || classroom.hskLevel || 'HSK 3');
      const joinedAt = String(matchedSlotData.joinedAt || nowIso.slice(0, 10));

      const newStudentDoc = {
        studentUid: uid,
        studentCode,
        name: studentName,
        hskLevel,
        joinedAt,
        vocabScore: String(matchedSlotData.vocabScore ?? ''),
        writingScore: String(matchedSlotData.writingScore ?? ''),
        quizScore: String(matchedSlotData.quizScore ?? ''),
        totalPoints: Number(matchedSlotData.totalPoints || 0),
        status: String(matchedSlotData.status || 'Chưa nộp'),
        feedback: String(matchedSlotData.feedback ?? ''),
        timeSeconds: Number(matchedSlotData.timeSeconds || 0),
        streak: Number(matchedSlotData.streak || 0),
        reviewWords: Array.isArray(matchedSlotData.reviewWords) ? matchedSlotData.reviewWords : [],
        updatedAt: nowIso,
      };

      tx.set(ownStudentRef, newStudentDoc);
      tx.set(lockRef, {
        studentCode,
        studentUid: uid,
        claimedAt: nowIso,
      });

      if (matchedSlotId !== uid) {
        tx.set(
          adminDb.doc(`classes/${classId}/students/${matchedSlotId}`),
          {
            ...matchedSlotData,
            studentUid: uid,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      }

      const existingUserDoc = userSnap.exists ? (userSnap.data() as Record<string, any>) : null;
      const prevClasses = Array.isArray(existingUserDoc?.enrolledClassIds)
        ? (existingUserDoc!.enrolledClassIds as string[])
        : [];
      const nextClasses = Array.from(new Set([...prevClasses, classId]));

      tx.set(
        userRef,
        {
          uid,
          enrolledClassIds: nextClasses,
          activeClassId: classId,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      return {
        status: 'ok',
        classroom,
        studentRecord: {
          id: uid,
          ...newStudentDoc,
        },
      };
    });
  },
  async resetStudentSlotTransaction(
    params: ResetStudentSlotParams
  ): Promise<ResetStudentSlotResult> {
    const {
      classId,
      targetStudentCode,
      teacherUid,
      regenerateCode,
      requestedNewCode,
      nowIso,
    } = params;
    const classRef = adminDb.doc(`classes/${classId}`);
    const studentsCol = adminDb.collection(`classes/${classId}/students`);
    const oldLockRef = adminDb.doc(`classes/${classId}/studentCodeLocks/${targetStudentCode}`);

    return await adminDb.runTransaction(async (tx) => {
      const [classSnap, allStudentsSnap, oldLockSnap] = await Promise.all([
        tx.get(classRef),
        tx.get(studentsCol),
        tx.get(oldLockRef),
      ]);

      if (!classSnap.exists) {
        return {
          status: 'error',
          httpStatus: 404,
          error: 'Lớp học không tồn tại trên hệ thống.',
        };
      }

      const classData = classSnap.data() as Record<string, any>;
      if (String(classData.teacherUid || '') !== teacherUid) {
        return {
          status: 'error',
          httpStatus: 403,
          error: 'Forbidden: Chỉ Giảng viên chủ nhiệm lớp mới có quyền cấp lại mã học viên.',
        };
      }

      const allStudentDocs = allStudentsSnap.docs.map((d) => ({
        id: d.id,
        data: d.data() as Record<string, any>,
      }));

      const matchingDocs = allStudentDocs.filter(
        (d) => String(d.data.studentCode || '').toUpperCase() === targetStudentCode
      );

      if (matchingDocs.length === 0) {
        return {
          status: 'error',
          httpStatus: 404,
          error: `Không tìm thấy mã học viên "${targetStudentCode}" trong lớp.`,
        };
      }

      const existingCodesInClass = new Set(
        allStudentDocs
          .map((d) => String(d.data.studentCode || '').toUpperCase())
          .filter((code) => Boolean(code) && code !== targetStudentCode)
      );

      let nextStudentCode = targetStudentCode;
      if (requestedNewCode) {
        const cleanRequested = requestedNewCode
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_-]/g, '');
        if (cleanRequested.length < 6 || cleanRequested.length > 40) {
          return {
            status: 'error',
            httpStatus: 400,
            error: 'Mã học viên mới không hợp lệ (tối thiểu 6 ký tự).',
          };
        }
        if (existingCodesInClass.has(cleanRequested)) {
          return {
            status: 'error',
            httpStatus: 409,
            error: `Mã học viên "${cleanRequested}" đã tồn tại trong lớp. Vui lòng chọn mã khác.`,
          };
        }
        nextStudentCode = cleanRequested;
      } else if (regenerateCode) {
        let generated = '';
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = generateServerRandomCode('HV', 6);
          if (candidate !== targetStudentCode && !existingCodesInClass.has(candidate)) {
            generated = candidate;
            break;
          }
        }
        if (!generated) {
          return {
            status: 'error',
            httpStatus: 409,
            error: 'Không thể tạo mã học viên mới duy nhất lúc này. Vui lòng thử lại.',
          };
        }
        nextStudentCode = generated;
      }

      let newLockSnap = oldLockSnap;
      const newLockRef = adminDb.doc(`classes/${classId}/studentCodeLocks/${nextStudentCode}`);
      if (nextStudentCode !== targetStudentCode) {
        newLockSnap = await tx.get(newLockRef);
        if (newLockSnap.exists) {
          const lockOwner = String(newLockSnap.data()?.studentUid || '').trim();
          if (lockOwner) {
            return {
              status: 'error',
              httpStatus: 409,
              error: `Mã học viên "${nextStudentCode}" đã tồn tại trong lớp.`,
            };
          }
        }
      }

      const baseRecord = selectRichestStudentRecord(matchingDocs);
      const newSlotId = `slot-${nextStudentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      const newSlotRef = adminDb.doc(`classes/${classId}/students/${newSlotId}`);

      const preservedSlotRecord: Record<string, any> = {
        ...baseRecord,
        studentUid: '',
        studentCode: nextStudentCode,
        name: String(baseRecord.name || nextStudentCode).trim().slice(0, 120),
        hskLevel: String(baseRecord.hskLevel || classData.hskLevel || 'HSK 3'),
        joinedAt: String(baseRecord.joinedAt || nowIso.slice(0, 10)),
        vocabScore: baseRecord.vocabScore ?? '',
        writingScore: baseRecord.writingScore ?? '',
        quizScore: baseRecord.quizScore ?? '',
        totalPoints: Number(baseRecord.totalPoints || 0),
        status: String(baseRecord.status || 'Chưa nộp'),
        feedback: String(baseRecord.feedback ?? ''),
        timeSeconds: Number(baseRecord.timeSeconds || 0),
        streak: Number(baseRecord.streak || 0),
        reviewWords: Array.isArray(baseRecord.reviewWords) ? baseRecord.reviewWords : [],
        updatedAt: nowIso,
      };
      if (baseRecord.lastSubmittedAt) {
        preservedSlotRecord.lastSubmittedAt = String(baseRecord.lastSubmittedAt);
      }

      for (const docItem of matchingDocs) {
        if (docItem.id !== newSlotId) {
          tx.delete(adminDb.doc(`classes/${classId}/students/${docItem.id}`));
        }
      }

      tx.set(newSlotRef, preservedSlotRecord);

      if (nextStudentCode !== targetStudentCode) {
        tx.delete(oldLockRef);
      }
      tx.set(newLockRef, {
        studentCode: nextStudentCode,
        studentUid: '',
        resetByTeacherUid: teacherUid,
        updatedAt: nowIso,
      });

      return {
        status: 'ok',
        previousStudentCode: targetStudentCode,
        studentCode: nextStudentCode,
        slotId: newSlotId,
        preservedRecord: preservedSlotRecord,
      };
    });
  },
  async startAssignmentTransaction(
    params: StartAssignmentTransactionParams
  ): Promise<StartAssignmentTransactionResult> {
    const { classId, assignmentId, uid, nowMs } = params;
    const classRef = adminDb.doc(`classes/${classId}`);
    const studentRef = adminDb.doc(`classes/${classId}/students/${uid}`);
    const assignmentRef = adminDb.doc(`classes/${classId}/assignments/${assignmentId}`);
    const answerKeyRef = adminDb.doc(`classes/${classId}/answerKeys/${assignmentId}`);
    const startId = `${assignmentId}_${uid}`;
    const startRef = adminDb.doc(`classes/${classId}/assignmentStarts/${startId}`);
    const submissionRef = adminDb.doc(`classes/${classId}/submissions/${startId}`);

    return await adminDb.runTransaction(async (tx) => {
      const [
        classSnap,
        studentSnap,
        assignmentSnap,
        answerKeySnap,
        startSnap,
        submissionSnap,
      ] = await Promise.all([
        tx.get(classRef),
        tx.get(studentRef),
        tx.get(assignmentRef),
        tx.get(answerKeyRef),
        tx.get(startRef),
        tx.get(submissionRef),
      ]);

      const authCheck = validateAssignmentAndAnswerKeyAuthorization({
        classId,
        assignmentId,
        uid,
        nowMs,
        classData: classSnap.exists ? (classSnap.data() as Record<string, any>) : null,
        studentDoc: studentSnap.exists ? (studentSnap.data() as Record<string, any>) : null,
        assignmentDoc: assignmentSnap.exists
          ? (assignmentSnap.data() as Record<string, any>)
          : null,
        storedAnswerKey: answerKeySnap.exists
          ? (answerKeySnap.data() as ServerAnswerKeyRecord)
          : null,
      });

      if (!authCheck.ok) {
        return {
          status: 'error',
          httpStatus: authCheck.httpStatus,
          error: authCheck.error,
        };
      }

      const nowIso = new Date(nowMs).toISOString();
      const existingStart = startSnap.exists ? (startSnap.data() as Record<string, any>) : null;
      const existingSub = submissionSnap.exists
        ? (submissionSnap.data() as Record<string, any>)
        : null;

      if (existingStart && Number(existingStart.startedAtMs || 0) > 0 && !existingSub) {
        return {
          status: 'ok',
          classId,
          assignmentId,
          startedAtMs: Number(existingStart.startedAtMs),
          startedAt: String(existingStart.startedAt || nowIso),
        };
      }

      tx.set(startRef, {
        classId,
        assignmentId,
        studentUid: uid,
        startedAtMs: nowMs,
        startedAt: nowIso,
      });

      return {
        status: 'ok',
        classId,
        assignmentId,
        startedAtMs: nowMs,
        startedAt: nowIso,
      };
    });
  },
  async submitAssignmentTransaction(
    params: SubmitAssignmentTransactionParams
  ): Promise<SubmitAssignmentTransactionResult> {
    const {
      classId,
      assignmentId,
      uid,
      userName,
      answers,
      configuredMaxAttempts,
      nowMs,
      submissionNonce,
    } = params;
    const classRef = adminDb.doc(`classes/${classId}`);
    const studentRef = adminDb.doc(`classes/${classId}/students/${uid}`);
    const assignmentRef = adminDb.doc(`classes/${classId}/assignments/${assignmentId}`);
    const answerKeyRef = adminDb.doc(`classes/${classId}/answerKeys/${assignmentId}`);
    const submissionId = `${assignmentId}_${uid}`;
    const submissionRef = adminDb.doc(`classes/${classId}/submissions/${submissionId}`);
    const startRef = adminDb.doc(`classes/${classId}/assignmentStarts/${submissionId}`);
    const leaderboardRef = adminDb.doc(`classes/${classId}/leaderboard/${uid}`);

    return await adminDb.runTransaction(async (tx) => {
      const [
        classSnap,
        studentSnap,
        assignmentSnap,
        answerKeySnap,
        submissionSnap,
        startSnap,
      ] = await Promise.all([
        tx.get(classRef),
        tx.get(studentRef),
        tx.get(assignmentRef),
        tx.get(answerKeyRef),
        tx.get(submissionRef),
        tx.get(startRef),
      ]);

      const authCheck = validateAssignmentAndAnswerKeyAuthorization({
        classId,
        assignmentId,
        uid,
        nowMs,
        classData: classSnap.exists ? (classSnap.data() as Record<string, any>) : null,
        studentDoc: studentSnap.exists ? (studentSnap.data() as Record<string, any>) : null,
        assignmentDoc: assignmentSnap.exists
          ? (assignmentSnap.data() as Record<string, any>)
          : null,
        storedAnswerKey: answerKeySnap.exists
          ? (answerKeySnap.data() as ServerAnswerKeyRecord)
          : null,
      });

      if (!authCheck.ok) {
        return {
          status: 'error',
          httpStatus: authCheck.httpStatus,
          error: authCheck.error,
        };
      }

      const { answerKey, studentDoc } = authCheck;

      const maxAttempts = Math.max(
        1,
        Math.floor(Number(answerKey.maxAttempts || configuredMaxAttempts || 1))
      );
      const existingSub = submissionSnap.exists
        ? (submissionSnap.data() as Record<string, any>)
        : null;
      const prevAttempts = existingSub ? Number(existingSub.attemptCount || 1) : 0;

      if (
        submissionNonce &&
        existingSub?.submissionNonce &&
        String(existingSub.submissionNonce) === submissionNonce
      ) {
        return {
          status: 'error',
          httpStatus: 409,
          error: 'Yêu cầu nộp bài bị trùng lặp (replay request detected).',
        };
      }

      if (prevAttempts >= maxAttempts) {
        return {
          status: 'error',
          httpStatus: 409,
          error: `Bạn đã nộp bài tập này (${prevAttempts}/${maxAttempts} lượt cho phép).`,
        };
      }

      const startData = startSnap.exists ? (startSnap.data() as Record<string, any>) : null;
      if (startData) {
        if (
          (startData.studentUid && String(startData.studentUid) !== uid) ||
          (startData.classId && String(startData.classId) !== classId) ||
          (startData.assignmentId && String(startData.assignmentId) !== assignmentId)
        ) {
          return {
            status: 'error',
            httpStatus: 403,
            error: 'Forbidden: Dữ liệu phiên bắt đầu làm bài không hợp lệ.',
          };
        }
      }

      const studentCode = String(studentDoc.studentCode || 'HV-RANDOM');
      const slotId = `slot-${studentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      const slotRef = adminDb.doc(`classes/${classId}/students/${slotId}`);
      const slotSnap = slotId !== uid ? await tx.get(slotRef) : null;

      const graded = gradeSubmissionPayloadOnServer({
        answerKey,
        answers,
      });

      const startedAtMs = Number(startData?.startedAtMs || 0);
      const timeSeconds = computeServerAuthoritativeTimeSeconds({
        startedAtMs: startedAtMs > 0 ? startedAtMs : null,
        submittedAtMs: nowMs,
        totalQuestions: graded.totalQuestions,
      });

      const nowIso = new Date(nowMs).toISOString();
      const prevStreak = Number(studentDoc.streak || 0);
      const nextStreak = prevStreak + 1;
      const attemptCount = prevAttempts + 1;
      const studentName = String(studentDoc.name || userName || 'Học viên');
      const hskLevel = String(studentDoc.hskLevel || 'HSK 3');

      const submissionDoc: Record<string, any> = {
        id: submissionId,
        studentUid: uid,
        studentCode,
        studentName,
        assignmentId,
        score: graded.score,
        attemptCount,
        quizScore: graded.quizScore,
        vocabScore: graded.vocabScore,
        writingScore: graded.writingScore,
        reviewWords: graded.reviewWords,
        feedback: graded.feedback,
        answers,
        timeSeconds,
        submittedAt: nowIso,
      };
      if (submissionNonce) {
        submissionDoc.submissionNonce = submissionNonce;
      }

      tx.set(submissionRef, submissionDoc);
      tx.set(leaderboardRef, {
        studentUid: uid,
        studentCode,
        name: studentName,
        hskLevel,
        score: graded.score,
        timeSeconds,
        streak: nextStreak,
        updatedAt: nowIso,
      });

      if (startData) {
        tx.set(
          startRef,
          {
            lastSubmittedAtMs: nowMs,
            consumedAttemptCount: attemptCount,
            ...(submissionNonce ? { lastSubmissionNonce: submissionNonce } : {}),
          },
          { merge: true }
        );
      }

      const updatedStudentFields = {
        vocabScore: graded.vocabScore,
        writingScore: graded.writingScore,
        quizScore: graded.quizScore,
        totalPoints: graded.score,
        status: graded.status,
        feedback: graded.feedback,
        reviewWords: graded.reviewWords,
        timeSeconds,
        streak: nextStreak,
        lastSubmittedAt: nowIso,
        updatedAt: nowIso,
      };

      tx.set(studentRef, updatedStudentFields, { merge: true });

      if (slotSnap && slotSnap.exists) {
        tx.set(
          slotRef,
          {
            ...updatedStudentFields,
            studentUid: uid,
          },
          { merge: true }
        );
      }

      return {
        status: 'ok',
        payload: {
          submissionId,
          score: graded.score,
          correctCount: graded.correctCount,
          totalQuestions: graded.totalQuestions,
          attemptCount,
          maxAttempts,
          quizScore: graded.quizScore,
          vocabScore: graded.vocabScore,
          writingScore: graded.writingScore,
          reviewWords: graded.reviewWords,
          status: graded.status,
          feedback: graded.feedback,
          timeSeconds,
          streak: nextStreak,
        },
      };
    });
  },
  async setTeacherCustomClaim(uid: string) {
    await getAdminAuth(firebaseAdminApp).setCustomUserClaims(uid, { role: 'teacher' });
  },
};

let activeServerStore: ServerStoreAdapter = firestoreServerStoreAdapter;

export function getActiveServerStore(): ServerStoreAdapter {
  return activeServerStore;
}

export function setServerStoreAdapterForTest(adapter: ServerStoreAdapter | null): void {
  activeServerStore = adapter || firestoreServerStoreAdapter;
}

export function createInMemoryServerStoreAdapter(): ServerStoreAdapter & {
  docs: Map<string, Record<string, any>>;
  claims: Map<string, Record<string, any>>;
} {
  const docs = new Map<string, Record<string, any>>();
  const claims = new Map<string, Record<string, any>>();

  const normalize = (p: string) => p.replace(/^\/+|\/+$/g, '');

  // Promise-queue mutex to guarantee strict serializability for transactions in concurrent unit tests
  let txQueue: Promise<unknown> = Promise.resolve();
  const runAtomic = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = txQueue.then(fn, fn);
    txQueue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };

  return {
    docs,
    claims,
    async getDoc(docPath: string) {
      const key = normalize(docPath);
      const found = docs.get(key);
      return found ? structuredClone(found) : null;
    },
    async setDoc(docPath: string, data: Record<string, any>, options?: { merge?: boolean }) {
      const key = normalize(docPath);
      if (options?.merge && docs.has(key)) {
        docs.set(key, { ...structuredClone(docs.get(key)!), ...structuredClone(data) });
      } else {
        docs.set(key, structuredClone(data));
      }
    },
    async deleteDoc(docPath: string) {
      docs.delete(normalize(docPath));
    },
    async listCollection(collectionPath: string) {
      const prefix = `${normalize(collectionPath)}/`;
      const results: Array<{ id: string; data: Record<string, any> }> = [];
      for (const [k, v] of docs.entries()) {
        if (k.startsWith(prefix)) {
          const remainder = k.slice(prefix.length);
          if (!remainder.includes('/')) {
            results.push({ id: remainder, data: structuredClone(v) });
          }
        }
      }
      return results;
    },
    async incrementAiUsageTransaction(
      usageId: string,
      uid: string,
      dateStr: string,
      dailyLimit: number
    ) {
      return await runAtomic(async () => {
        const key = normalize(`aiUsage/${usageId}`);
        const existing = docs.get(key);
        const currentCount = existing ? Number(existing.count || 0) : 0;
        if (currentCount >= dailyLimit) {
          return { allowed: false, count: currentCount, dailyLimit };
        }
        const nextCount = currentCount + 1;
        const nowMs = Date.now();
        const expiresAtDate = new Date(nowMs + 2 * RATE_LIMIT_TTL_RETENTION_MS);
        docs.set(key, {
          uid,
          date: dateStr,
          count: nextCount,
          updatedAt: new Date(nowMs).toISOString(),
          expiresAt: expiresAtDate,
          expiresAtIso: expiresAtDate.toISOString(),
        });
        return { allowed: true, count: nextCount, dailyLimit };
      });
    },
    async incrementRateLimitTransaction(
      bucketId: string,
      maxRequests: number,
      windowMs: number,
      nowMs = Date.now()
    ) {
      return await runAtomic(async () => {
        const { safeId, scope, keyHash } = normalizeRateLimitBucketId(bucketId);
        const key = normalize(`rateLimits/${safeId}`);
        const existing = docs.get(key);
        const existingResetAt = Number(existing?.resetAt || 0);
        const existingCount = Number(existing?.count || 0);

        // Opportunistic bounded eviction so rateLimits documents cannot grow unbounded
        let rateLimitDocCount = 0;
        for (const [docKey, docVal] of docs.entries()) {
          if (docKey.startsWith('rateLimits/')) {
            rateLimitDocCount += 1;
            if (nowMs > Number(docVal?.resetAt || 0) && rateLimitDocCount > 250) {
              docs.delete(docKey);
              rateLimitDocCount -= 1;
            }
          }
        }
        if (rateLimitDocCount >= MAX_IN_MEMORY_RATE_LIMIT_DOCS) {
          for (const docKey of docs.keys()) {
            if (docKey.startsWith('rateLimits/')) {
              docs.delete(docKey);
              break;
            }
          }
        }

        if (!existing || nowMs > existingResetAt) {
          const resetAt = nowMs + windowMs;
          const expiresAtDate = new Date(resetAt + RATE_LIMIT_TTL_RETENTION_MS);
          docs.set(key, {
            bucketId: safeId,
            scope,
            keyHash,
            count: 1,
            resetAt,
            expiresAt: expiresAtDate,
            expiresAtIso: expiresAtDate.toISOString(),
            updatedAt: new Date(nowMs).toISOString(),
          });
          return { allowed: true, count: 1, resetAt };
        }

        if (existingCount >= maxRequests) {
          return { allowed: false, count: existingCount, resetAt: existingResetAt };
        }

        const nextCount = existingCount + 1;
        const expiresAtDate = new Date(existingResetAt + RATE_LIMIT_TTL_RETENTION_MS);
        docs.set(key, {
          bucketId: safeId,
          scope,
          keyHash,
          count: nextCount,
          resetAt: existingResetAt,
          expiresAt: expiresAtDate,
          expiresAtIso: expiresAtDate.toISOString(),
          updatedAt: new Date(nowMs).toISOString(),
        });
        return { allowed: true, count: nextCount, resetAt: existingResetAt };
      });
    },
    async claimStudentSlotTransaction(
      params: ClaimStudentSlotParams
    ): Promise<ClaimStudentSlotResult> {
      return await runAtomic(async () => {
        const { joinCode, studentCode, uid, userName, nowIso } = params;
        const joinCodeDoc = docs.get(normalize(`joinCodes/${joinCode}`));
        if (!joinCodeDoc || !joinCodeDoc.classId) {
          return {
            status: 'error',
            httpStatus: 404,
            error: `Không tìm thấy lớp học với mã lớp "${joinCode}".`,
          };
        }

        const classId = String(joinCodeDoc.classId);
        const classData = docs.get(normalize(`classes/${classId}`));
        if (!classData) {
          return {
            status: 'error',
            httpStatus: 404,
            error: 'Lớp học không còn tồn tại trên hệ thống.',
          };
        }

        const classroom = {
          id: classId,
          teacherUid: String(classData.teacherUid || ''),
          teacherName: String(classData.teacherName || 'Giảng viên HSK'),
          name: String(classData.name || 'Lớp HSK 3.0'),
          hskLevel: String(classData.hskLevel || 'HSK 3'),
          joinCode: String(classData.joinCode || joinCode),
          createdAt: String(classData.createdAt || nowIso),
          updatedAt: classData.updatedAt ? String(classData.updatedAt) : undefined,
        };

        const ownStudentKey = normalize(`classes/${classId}/students/${uid}`);
        const existingOwnStudent = docs.get(ownStudentKey);
        if (existingOwnStudent) {
          if (
            studentCode &&
            existingOwnStudent.studentCode &&
            String(existingOwnStudent.studentCode).toUpperCase() !== studentCode
          ) {
            return {
              status: 'error',
              httpStatus: 403,
              error: `Tài khoản của bạn đã gắn với mã học sinh ${existingOwnStudent.studentCode}. Không thể đổi sang mã ${studentCode}.`,
            };
          }

          return {
            status: 'ok',
            classroom,
            studentRecord: {
              id: uid,
              studentCode: String(existingOwnStudent.studentCode || studentCode),
              name: String(existingOwnStudent.name || userName || 'Học viên'),
              hskLevel: String(existingOwnStudent.hskLevel || classroom.hskLevel),
              vocabScore: String(existingOwnStudent.vocabScore ?? ''),
              writingScore: String(existingOwnStudent.writingScore ?? ''),
              quizScore: String(existingOwnStudent.quizScore ?? ''),
              totalPoints: Number(existingOwnStudent.totalPoints || 0),
              status: String(existingOwnStudent.status || 'Chưa nộp'),
              feedback: String(existingOwnStudent.feedback ?? ''),
              timeSeconds: Number(existingOwnStudent.timeSeconds || 0),
              streak: Number(existingOwnStudent.streak || 0),
              reviewWords: Array.isArray(existingOwnStudent.reviewWords)
                ? structuredClone(existingOwnStudent.reviewWords)
                : [],
            },
          };
        }

        if (!studentCode || studentCode.length < 6) {
          return {
            status: 'error',
            httpStatus: 400,
            error: 'Vui lòng nhập Mã học sinh hợp lệ (tối thiểu 6 ký tự) do Giảng viên cấp.',
          };
        }

        const lockKey = normalize(`classes/${classId}/studentCodeLocks/${studentCode}`);
        const existingLock = docs.get(lockKey);
        if (existingLock && existingLock.studentUid && existingLock.studentUid !== uid) {
          return {
            status: 'error',
            httpStatus: 409,
            error: `Mã học sinh "${studentCode}" đã được kích hoạt bởi một tài khoản khác.`,
          };
        }

        const prefix = normalize(`classes/${classId}/students`) + '/';
        let matchedSlot: { id: string; data: Record<string, any> } | null = null;
        for (const [k, v] of docs.entries()) {
          if (k.startsWith(prefix)) {
            const remainder = k.slice(prefix.length);
            if (!remainder.includes('/')) {
              if (String(v.studentCode || '').toUpperCase() === studentCode) {
                const boundUid = String(v.studentUid || '').trim();
                if (boundUid && boundUid !== uid) {
                  return {
                    status: 'error',
                    httpStatus: 409,
                    error: `Mã học sinh "${studentCode}" đã được kích hoạt bởi một tài khoản khác.`,
                  };
                }
                if (!matchedSlot) {
                  matchedSlot = { id: remainder, data: structuredClone(v) };
                }
              }
            }
          }
        }

        if (!matchedSlot) {
          return {
            status: 'error',
            httpStatus: 404,
            error: `Mã học sinh "${studentCode}" chưa được Giảng viên cấp trong lớp "${classroom.name}".`,
          };
        }

        const boundUid = String(matchedSlot.data.studentUid || '').trim();
        if (boundUid && boundUid !== uid) {
          return {
            status: 'error',
            httpStatus: 409,
            error: `Mã học sinh "${studentCode}" đã được kích hoạt bởi một tài khoản khác.`,
          };
        }

        const studentName = String(matchedSlot.data.name || userName || studentCode)
          .trim()
          .slice(0, 120);
        const hskLevel = String(matchedSlot.data.hskLevel || classroom.hskLevel || 'HSK 3');
        const joinedAt = String(matchedSlot.data.joinedAt || nowIso.slice(0, 10));

        const newStudentDoc = {
          studentUid: uid,
          studentCode,
          name: studentName,
          hskLevel,
          joinedAt,
          vocabScore: String(matchedSlot.data.vocabScore ?? ''),
          writingScore: String(matchedSlot.data.writingScore ?? ''),
          quizScore: String(matchedSlot.data.quizScore ?? ''),
          totalPoints: Number(matchedSlot.data.totalPoints || 0),
          status: String(matchedSlot.data.status || 'Chưa nộp'),
          feedback: String(matchedSlot.data.feedback ?? ''),
          timeSeconds: Number(matchedSlot.data.timeSeconds || 0),
          streak: Number(matchedSlot.data.streak || 0),
          reviewWords: Array.isArray(matchedSlot.data.reviewWords)
            ? structuredClone(matchedSlot.data.reviewWords)
            : [],
          updatedAt: nowIso,
        };

        docs.set(ownStudentKey, structuredClone(newStudentDoc));
        docs.set(lockKey, {
          studentCode,
          studentUid: uid,
          claimedAt: nowIso,
        });

        if (matchedSlot.id !== uid) {
          const slotKey = normalize(`classes/${classId}/students/${matchedSlot.id}`);
          docs.set(slotKey, {
            ...structuredClone(matchedSlot.data),
            studentUid: uid,
            updatedAt: nowIso,
          });
        }

        const userKey = normalize(`users/${uid}`);
        const existingUserDoc = docs.get(userKey);
        const prevClasses = Array.isArray(existingUserDoc?.enrolledClassIds)
          ? (existingUserDoc!.enrolledClassIds as string[])
          : [];
        const nextClasses = Array.from(new Set([...prevClasses, classId]));
        docs.set(userKey, {
          ...(existingUserDoc ? structuredClone(existingUserDoc) : {}),
          uid,
          enrolledClassIds: nextClasses,
          activeClassId: classId,
          updatedAt: nowIso,
        });

        return {
          status: 'ok',
          classroom,
          studentRecord: {
            id: uid,
            ...newStudentDoc,
          },
        };
      });
    },
    async resetStudentSlotTransaction(
      params: ResetStudentSlotParams
    ): Promise<ResetStudentSlotResult> {
      return await runAtomic(async () => {
        const {
          classId,
          targetStudentCode,
          teacherUid,
          regenerateCode,
          requestedNewCode,
          nowIso,
        } = params;

        const classData = docs.get(normalize(`classes/${classId}`));
        if (!classData) {
          return {
            status: 'error',
            httpStatus: 404,
            error: 'Lớp học không tồn tại trên hệ thống.',
          };
        }

        if (String(classData.teacherUid || '') !== teacherUid) {
          return {
            status: 'error',
            httpStatus: 403,
            error: 'Forbidden: Chỉ Giảng viên chủ nhiệm lớp mới có quyền cấp lại mã học viên.',
          };
        }

        const studentsPrefix = `${normalize(`classes/${classId}/students`)}/`;
        const allStudentDocs: Array<{ id: string; data: Record<string, any> }> = [];
        for (const [k, v] of docs.entries()) {
          if (k.startsWith(studentsPrefix)) {
            const remainder = k.slice(studentsPrefix.length);
            if (!remainder.includes('/')) {
              allStudentDocs.push({ id: remainder, data: structuredClone(v) });
            }
          }
        }

        const matchingDocs = allStudentDocs.filter(
          (d) => String(d.data.studentCode || '').toUpperCase() === targetStudentCode
        );

        if (matchingDocs.length === 0) {
          return {
            status: 'error',
            httpStatus: 404,
            error: `Không tìm thấy mã học viên "${targetStudentCode}" trong lớp.`,
          };
        }

        const existingCodesInClass = new Set(
          allStudentDocs
            .map((d) => String(d.data.studentCode || '').toUpperCase())
            .filter((code) => Boolean(code) && code !== targetStudentCode)
        );

        let nextStudentCode = targetStudentCode;
        if (requestedNewCode) {
          const cleanRequested = requestedNewCode
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '');
          if (cleanRequested.length < 6 || cleanRequested.length > 40) {
            return {
              status: 'error',
              httpStatus: 400,
              error: 'Mã học viên mới không hợp lệ (tối thiểu 6 ký tự).',
            };
          }
          if (existingCodesInClass.has(cleanRequested)) {
            return {
              status: 'error',
              httpStatus: 409,
              error: `Mã học viên "${cleanRequested}" đã tồn tại trong lớp. Vui lòng chọn mã khác.`,
            };
          }
          nextStudentCode = cleanRequested;
        } else if (regenerateCode) {
          let generated = '';
          for (let attempt = 0; attempt < 10; attempt++) {
            const candidate = generateServerRandomCode('HV', 6);
            if (candidate !== targetStudentCode && !existingCodesInClass.has(candidate)) {
              generated = candidate;
              break;
            }
          }
          if (!generated) {
            return {
              status: 'error',
              httpStatus: 409,
              error: 'Không thể tạo mã học viên mới duy nhất lúc này. Vui lòng thử lại.',
            };
          }
          nextStudentCode = generated;
        }

        if (nextStudentCode !== targetStudentCode) {
          const existingNewLock = docs.get(
            normalize(`classes/${classId}/studentCodeLocks/${nextStudentCode}`)
          );
          if (existingNewLock && String(existingNewLock.studentUid || '').trim()) {
            return {
              status: 'error',
              httpStatus: 409,
              error: `Mã học viên "${nextStudentCode}" đã tồn tại trong lớp.`,
            };
          }
        }

        const baseRecord = selectRichestStudentRecord(matchingDocs);
        const newSlotId = `slot-${nextStudentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;

        const preservedSlotRecord: Record<string, any> = {
          ...structuredClone(baseRecord),
          studentUid: '',
          studentCode: nextStudentCode,
          name: String(baseRecord.name || nextStudentCode).trim().slice(0, 120),
          hskLevel: String(baseRecord.hskLevel || classData.hskLevel || 'HSK 3'),
          joinedAt: String(baseRecord.joinedAt || nowIso.slice(0, 10)),
          vocabScore: baseRecord.vocabScore ?? '',
          writingScore: baseRecord.writingScore ?? '',
          quizScore: baseRecord.quizScore ?? '',
          totalPoints: Number(baseRecord.totalPoints || 0),
          status: String(baseRecord.status || 'Chưa nộp'),
          feedback: String(baseRecord.feedback ?? ''),
          timeSeconds: Number(baseRecord.timeSeconds || 0),
          streak: Number(baseRecord.streak || 0),
          reviewWords: Array.isArray(baseRecord.reviewWords)
            ? structuredClone(baseRecord.reviewWords)
            : [],
          updatedAt: nowIso,
        };
        if (baseRecord.lastSubmittedAt) {
          preservedSlotRecord.lastSubmittedAt = String(baseRecord.lastSubmittedAt);
        }

        for (const docItem of matchingDocs) {
          if (docItem.id !== newSlotId) {
            docs.delete(normalize(`classes/${classId}/students/${docItem.id}`));
          }
        }

        docs.set(normalize(`classes/${classId}/students/${newSlotId}`), preservedSlotRecord);

        if (nextStudentCode !== targetStudentCode) {
          docs.delete(normalize(`classes/${classId}/studentCodeLocks/${targetStudentCode}`));
        }
        docs.set(normalize(`classes/${classId}/studentCodeLocks/${nextStudentCode}`), {
          studentCode: nextStudentCode,
          studentUid: '',
          resetByTeacherUid: teacherUid,
          updatedAt: nowIso,
        });

        return {
          status: 'ok',
          previousStudentCode: targetStudentCode,
          studentCode: nextStudentCode,
          slotId: newSlotId,
          preservedRecord: structuredClone(preservedSlotRecord),
        };
      });
    },
    async startAssignmentTransaction(
      params: StartAssignmentTransactionParams
    ): Promise<StartAssignmentTransactionResult> {
      return await runAtomic(async () => {
        const { classId, assignmentId, uid, nowMs } = params;
        const classData = docs.get(normalize(`classes/${classId}`)) || null;
        const studentDoc = docs.get(normalize(`classes/${classId}/students/${uid}`)) || null;
        const assignmentDoc =
          docs.get(normalize(`classes/${classId}/assignments/${assignmentId}`)) || null;
        const storedAnswerKey =
          (docs.get(
            normalize(`classes/${classId}/answerKeys/${assignmentId}`)
          ) as ServerAnswerKeyRecord | undefined) || null;

        const authCheck = validateAssignmentAndAnswerKeyAuthorization({
          classId,
          assignmentId,
          uid,
          nowMs,
          classData,
          studentDoc,
          assignmentDoc,
          storedAnswerKey,
        });

        if (!authCheck.ok) {
          return {
            status: 'error',
            httpStatus: authCheck.httpStatus,
            error: authCheck.error,
          };
        }

        const startId = `${assignmentId}_${uid}`;
        const startKey = normalize(`classes/${classId}/assignmentStarts/${startId}`);
        const subKey = normalize(`classes/${classId}/submissions/${startId}`);
        const existingStart = docs.get(startKey);
        const existingSub = docs.get(subKey);
        const nowIso = new Date(nowMs).toISOString();

        if (existingStart && Number(existingStart.startedAtMs || 0) > 0 && !existingSub) {
          return {
            status: 'ok',
            classId,
            assignmentId,
            startedAtMs: Number(existingStart.startedAtMs),
            startedAt: String(existingStart.startedAt || nowIso),
          };
        }

        docs.set(startKey, {
          classId,
          assignmentId,
          studentUid: uid,
          startedAtMs: nowMs,
          startedAt: nowIso,
        });

        return {
          status: 'ok',
          classId,
          assignmentId,
          startedAtMs: nowMs,
          startedAt: nowIso,
        };
      });
    },
    async submitAssignmentTransaction(
      params: SubmitAssignmentTransactionParams
    ): Promise<SubmitAssignmentTransactionResult> {
      return await runAtomic(async () => {
        const {
          classId,
          assignmentId,
          uid,
          userName,
          answers,
          configuredMaxAttempts,
          nowMs,
          submissionNonce,
        } = params;
        const classData = docs.get(normalize(`classes/${classId}`)) || null;
        const studentDocKey = normalize(`classes/${classId}/students/${uid}`);
        const studentDoc = docs.get(studentDocKey) || null;
        const assignmentDoc =
          docs.get(normalize(`classes/${classId}/assignments/${assignmentId}`)) || null;
        const storedAnswerKey =
          (docs.get(
            normalize(`classes/${classId}/answerKeys/${assignmentId}`)
          ) as ServerAnswerKeyRecord | undefined) || null;

        const authCheck = validateAssignmentAndAnswerKeyAuthorization({
          classId,
          assignmentId,
          uid,
          nowMs,
          classData,
          studentDoc,
          assignmentDoc,
          storedAnswerKey,
        });

        if (!authCheck.ok) {
          return {
            status: 'error',
            httpStatus: authCheck.httpStatus,
            error: authCheck.error,
          };
        }

        const { answerKey, studentDoc: verifiedStudentDoc } = authCheck;

        const maxAttempts = Math.max(
          1,
          Math.floor(Number(answerKey.maxAttempts || configuredMaxAttempts || 1))
        );
        const submissionId = `${assignmentId}_${uid}`;
        const submissionKey = normalize(`classes/${classId}/submissions/${submissionId}`);
        const existingSub = docs.get(submissionKey);
        const prevAttempts = existingSub ? Number(existingSub.attemptCount || 1) : 0;

        if (
          submissionNonce &&
          existingSub?.submissionNonce &&
          String(existingSub.submissionNonce) === submissionNonce
        ) {
          return {
            status: 'error',
            httpStatus: 409,
            error: 'Yêu cầu nộp bài bị trùng lặp (replay request detected).',
          };
        }

        if (prevAttempts >= maxAttempts) {
          return {
            status: 'error',
            httpStatus: 409,
            error: `Bạn đã nộp bài tập này (${prevAttempts}/${maxAttempts} lượt cho phép).`,
          };
        }

        const startKey = normalize(`classes/${classId}/assignmentStarts/${submissionId}`);
        const startDoc = docs.get(startKey);
        if (startDoc) {
          if (
            (startDoc.studentUid && String(startDoc.studentUid) !== uid) ||
            (startDoc.classId && String(startDoc.classId) !== classId) ||
            (startDoc.assignmentId && String(startDoc.assignmentId) !== assignmentId)
          ) {
            return {
              status: 'error',
              httpStatus: 403,
              error: 'Forbidden: Dữ liệu phiên bắt đầu làm bài không hợp lệ.',
            };
          }
        }

        const graded = gradeSubmissionPayloadOnServer({
          answerKey,
          answers,
        });

        const startedAtMs = Number(startDoc?.startedAtMs || 0);
        const timeSeconds = computeServerAuthoritativeTimeSeconds({
          startedAtMs: startedAtMs > 0 ? startedAtMs : null,
          submittedAtMs: nowMs,
          totalQuestions: graded.totalQuestions,
        });

        const nowIso = new Date(nowMs).toISOString();
        const prevStreak = Number(verifiedStudentDoc.streak || 0);
        const nextStreak = prevStreak + 1;
        const attemptCount = prevAttempts + 1;

        const studentCode = String(verifiedStudentDoc.studentCode || 'HV-RANDOM');
        const studentName = String(verifiedStudentDoc.name || userName || 'Học viên');
        const hskLevel = String(verifiedStudentDoc.hskLevel || 'HSK 3');

        const submissionDoc: Record<string, any> = {
          id: submissionId,
          studentUid: uid,
          studentCode,
          studentName,
          assignmentId,
          score: graded.score,
          attemptCount,
          quizScore: graded.quizScore,
          vocabScore: graded.vocabScore,
          writingScore: graded.writingScore,
          reviewWords: graded.reviewWords,
          feedback: graded.feedback,
          answers: structuredClone(answers),
          timeSeconds,
          submittedAt: nowIso,
        };
        if (submissionNonce) {
          submissionDoc.submissionNonce = submissionNonce;
        }

        docs.set(submissionKey, structuredClone(submissionDoc));
        docs.set(normalize(`classes/${classId}/leaderboard/${uid}`), {
          studentUid: uid,
          studentCode,
          name: studentName,
          hskLevel,
          score: graded.score,
          timeSeconds,
          streak: nextStreak,
          updatedAt: nowIso,
        });

        if (startDoc) {
          docs.set(startKey, {
            ...structuredClone(startDoc),
            lastSubmittedAtMs: nowMs,
            consumedAttemptCount: attemptCount,
            ...(submissionNonce ? { lastSubmissionNonce: submissionNonce } : {}),
          });
        }

        const updatedStudentFields = {
          vocabScore: graded.vocabScore,
          writingScore: graded.writingScore,
          quizScore: graded.quizScore,
          totalPoints: graded.score,
          status: graded.status,
          feedback: graded.feedback,
          reviewWords: graded.reviewWords,
          timeSeconds,
          streak: nextStreak,
          lastSubmittedAt: nowIso,
          updatedAt: nowIso,
        };

        docs.set(studentDocKey, {
          ...structuredClone(verifiedStudentDoc),
          ...updatedStudentFields,
        });

        const slotId = `slot-${studentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
        const slotKey = normalize(`classes/${classId}/students/${slotId}`);
        const existingSlot = docs.get(slotKey);
        if (existingSlot) {
          docs.set(slotKey, {
            ...structuredClone(existingSlot),
            ...updatedStudentFields,
            studentUid: uid,
          });
        }

        return {
          status: 'ok',
          payload: {
            submissionId,
            score: graded.score,
            correctCount: graded.correctCount,
            totalQuestions: graded.totalQuestions,
            attemptCount,
            maxAttempts,
            quizScore: graded.quizScore,
            vocabScore: graded.vocabScore,
            writingScore: graded.writingScore,
            reviewWords: graded.reviewWords,
            status: graded.status,
            feedback: graded.feedback,
            timeSeconds,
            streak: nextStreak,
          },
        };
      });
    },
    async setTeacherCustomClaim(uid: string) {
      claims.set(uid, { role: 'teacher' });
    },
  };
}
