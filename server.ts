import 'dotenv/config';
import crypto from 'node:crypto';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAppCheck as getAdminAppCheck } from 'firebase-admin/app-check';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR =
  path.basename(__dirname) === 'dist-server'
    ? path.resolve(__dirname, '..')
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

const firebaseAdminApp = ensureFirebaseAdminApp();
const adminDb =
  defaultFirestoreDatabaseId && defaultFirestoreDatabaseId !== '(default)'
    ? getAdminFirestore(firebaseAdminApp, defaultFirestoreDatabaseId)
    : getAdminFirestore(firebaseAdminApp);

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)'
  );
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});
app.use(express.json({ limit: '1mb' }));

// Liveness probe for Cloud Run / uptime monitors (no auth, no rate limit).
app.get('/healthz', (_req, res) => {
  res.set('Cache-Control', 'no-store').json({ ok: true, uptimeSeconds: Math.round(process.uptime()) });
});

// ============================================================================
// 0. SELF-HOSTED HANZI-WRITER-DATA STATIC & API SERVING
// ============================================================================
const HANZI_DATA_DIR = path.resolve(ROOT_DIR, 'node_modules', 'hanzi-writer-data');
app.use(
  '/hanzi-data',
  express.static(HANZI_DATA_DIR, {
    maxAge: '7d',
    immutable: true,
  })
);

app.get('/api/hanzi/char/:char', (req, res) => {
  const rawChar = String(req.params.char || '').trim();
  if (!rawChar || Array.from(rawChar).length !== 1) {
    res.status(400).json({ error: 'Invalid single Chinese character parameter.' });
    return;
  }
  const charFile = path.join(HANZI_DATA_DIR, `${rawChar}.json`);
  if (!fs.existsSync(charFile)) {
    res.status(404).json({ error: 'Character stroke data not found in local package.' });
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.sendFile(charFile);
});

// ============================================================================
// GEMINI MODELS, SHARED CLIENT, FALLBACK & CACHE
// ============================================================================
// Gemini 2.5 is only served to projects that used it before, so a new API key
// would fail on it. Default to the current GA models and fall back down the list
// when a model is unavailable or overloaded. Override with env vars if needed:
//   GEMINI_CHAT_MODEL  — BinBin conversations (quality first)
//   GEMINI_FAST_MODEL  — word lookups & suggestions (speed first)
//   GEMINI_MODEL       — legacy single override, tried first for both
const DEFAULT_CHAT_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
const DEFAULT_FAST_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
// Per-call timeout and an overall budget across retries/fallbacks, kept under the
// browser's own timeout (GEMINI_API_TIMEOUT_MS in chineseEngine.ts).
const GEMINI_REQUEST_TIMEOUT_MS = 12_000;
const GEMINI_TOTAL_BUDGET_MS = 22_000;

type GeminiTask = 'chat' | 'fast';

export function geminiModelChain(task: GeminiTask): string[] {
  const preferred = [
    task === 'chat' ? process.env.GEMINI_CHAT_MODEL : process.env.GEMINI_FAST_MODEL,
    process.env.GEMINI_MODEL,
  ]
    .map((m) => m?.trim())
    .filter((m): m is string => Boolean(m));
  const defaults = task === 'chat' ? DEFAULT_CHAT_MODELS : DEFAULT_FAST_MODELS;
  return Array.from(new Set([...preferred, ...defaults]));
}

let cachedGeminiClient: { key: string; client: GoogleGenAI } | null = null;

/** Returns null when no usable API key is configured. One client per key, reused. */
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  if (cachedGeminiClient?.key !== apiKey) {
    cachedGeminiClient = {
      key: apiKey,
      client: new GoogleGenAI({
        apiKey,
        httpOptions: {
          timeout: GEMINI_REQUEST_TIMEOUT_MS,
          headers: { 'User-Agent': 'aistudio-build' },
        },
      }),
    };
  }
  return cachedGeminiClient.client;
}

/** Small TTL + size-bounded cache for deterministic lookups (word enrich / suggest). */
export class TtlCache<V> {
  private store = new Map<string, { value: V; expiresAt: number }>();
  constructor(private maxEntries: number, private ttlMs: number) {}
  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // refresh recency
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }
  set(key: string, value: V): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }
}

const AI_LOOKUP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const enrichCache = new TtlCache<unknown>(500, AI_LOOKUP_CACHE_TTL_MS);
const suggestCache = new TtlCache<unknown>(300, AI_LOOKUP_CACHE_TTL_MS);

/** Parse a model's JSON reply, tolerating an accidental ```json fence. */
export function parseModelJson<T>(raw: string | undefined, fallback: T): T {
  const text = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (!text) return fallback;
  const parsed = JSON.parse(text);
  return (parsed && typeof parsed === 'object' ? parsed : fallback) as T;
}

const BINBIN_SYSTEM_INSTRUCTION =
  "Bạn là Gấu trúc Bin Bin (彬彬) — Trợ giảng & Gia sư Hán ngữ Thực dụng của nền tảng HANU × 阮文受 (Thầy Nguyễn Văn Thụ). Nguyên tắc bắt buộc: Trả lời trực diện, súc tích, thực dụng, KHÔNG rườm rà chào hỏi sáo rỗng, KHÔNG bao giờ ghép từ giả tạo kiểu '学习X' hay '常用X'. Luôn cung cấp: (1) Bản chất & Ngữ cảnh thực tế, (2) Collocations kết hợp từ chuẩn 100% người bản xứ, (3) Phân biệt từ dễ nhầm, (4) 2 câu ví dụ thực tế có Pinyin + Dịch nghĩa, hoặc Dịch song ngữ / Sửa câu sai / Soạn 5 câu bài tập HSK 3.0 theo đúng yêu cầu.";

// ============================================================================
// 1. RATE LIMITING BY UID & PERIODIC MEMORY CLEANUP
// ============================================================================
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 90;
const AI_RATE_LIMIT_MAX_REQUESTS = 30;
const AI_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const JOIN_CLASS_WINDOW_MS = 10 * 60_000; // 10 minutes
const JOIN_CLASS_MAX_ATTEMPTS = 15;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 10 * 60_000; // 10 minutes

const clientRequestCounts = new Map<string, { count: number; resetAt: number }>();
const aiUidMinuteCounts = new Map<string, { count: number; resetAt: number }>();
const aiUidDailyCounts = new Map<string, { count: number; resetAt: number }>();
const joinClassAttemptCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Dedicated brute-force rate limiter for /api/classes/join (max 15 attempts per 10 minutes per UID/IP).
 */
export function checkJoinClassRateLimit(
  key: string,
  now = Date.now()
): { allowed: boolean; remaining: number } {
  const cleanKey = key.trim() || 'unknown';
  const entry = joinClassAttemptCounts.get(cleanKey);
  if (entry && now <= entry.resetAt && entry.count >= JOIN_CLASS_MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  if (!entry || now > entry.resetAt) {
    joinClassAttemptCounts.set(cleanKey, { count: 1, resetAt: now + JOIN_CLASS_WINDOW_MS });
    return { allowed: true, remaining: JOIN_CLASS_MAX_ATTEMPTS - 1 };
  }
  entry.count += 1;
  return { allowed: true, remaining: Math.max(0, JOIN_CLASS_MAX_ATTEMPTS - entry.count) };
}

/**
 * Sanitize user input sent to Gemini AI routes:
 * - Removes control characters
 * - Neutralizes prompt-injection overrides
 * - Masks personal identifiers (emails and Vietnamese phone numbers) per Personal Data Protection Law
 */
export function sanitizeAiUserInput(raw: string, maxLen = 1500): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\s*\/?\s*(?:system|instruction|prompt)\s*>/gi, '')
    .replace(/\[\s*\/?\s*INST\s*\]/gi, '')
    .replace(/<\|(?:im_start|im_end|system|user|assistant)\|>/gi, '')
    .replace(/ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/gi, '[filtered]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_ĐÃ_ẨN]')
    .replace(/(?:\+?84|0)(?:3|5|7|8|9)\d{8}\b/g, '[SĐT_ĐÃ_ẨN]')
    .trim()
    .slice(0, maxLen);
}

/**
 * Unified AI_DAILY_LIMIT: defaults to 60 calls/day/uid (matching .env.example).
 */
export function getAiDailyLimit(): number {
  const configured = Number(process.env.AI_DAILY_LIMIT);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 60;
}

export function resetAllRateLimitersForTest(): void {
  clientRequestCounts.clear();
  aiUidMinuteCounts.clear();
  aiUidDailyCounts.clear();
  joinClassAttemptCounts.clear();
}

export function cleanupExpiredRateLimits(now = Date.now()): {
  removedApiEntries: number;
  removedAiEntries: number;
  removedDailyEntries: number;
} {
  let removedApiEntries = 0;
  let removedAiEntries = 0;
  let removedDailyEntries = 0;

  for (const [key, entry] of clientRequestCounts.entries()) {
    if (now > entry.resetAt) {
      clientRequestCounts.delete(key);
      removedApiEntries += 1;
    }
  }

  for (const [key, entry] of aiUidMinuteCounts.entries()) {
    if (now > entry.resetAt) {
      aiUidMinuteCounts.delete(key);
      removedAiEntries += 1;
    }
  }

  for (const [key, entry] of aiUidDailyCounts.entries()) {
    if (now > entry.resetAt) {
      aiUidDailyCounts.delete(key);
      removedDailyEntries += 1;
    }
  }

  for (const [key, entry] of joinClassAttemptCounts.entries()) {
    if (now > entry.resetAt) {
      joinClassAttemptCounts.delete(key);
    }
  }

  return {
    removedApiEntries,
    removedAiEntries,
    removedDailyEntries,
  };
}

const rateLimitCleanupTimer = setInterval(() => {
  cleanupExpiredRateLimits();
}, RATE_LIMIT_CLEANUP_INTERVAL_MS);
rateLimitCleanupTimer.unref?.();

function resolveClientIp(req: Request): string {
  return String(
    req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
  )
    .split(',')[0]
    .trim();
}

function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientIp = resolveClientIp(req);
  const now = Date.now();
  const entry = clientRequestCounts.get(clientIp);

  if (!entry || now > entry.resetAt) {
    clientRequestCounts.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many requests. Please try again in a minute.',
      fallback: true,
    });
    return;
  }

  entry.count += 1;
  next();
}

app.use('/api', apiRateLimiter);

// ============================================================================
// 2. SERVER STORE ADAPTER (FIRESTORE ADMIN SDK + TESTABLE IN-MEMORY ADAPTER)
// ============================================================================
export interface ServerAnswerKeyRecord {
  assignmentId: string;
  teacherUid: string;
  multipleChoiceAnswers: Record<string, string>;
  sentenceOrderingAnswers: Record<string, string[]>;
  essayModels: Record<string, { targetWord: string; sampleSentence: string }>;
  maxAttempts?: number;
  updatedAt?: string;
}

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
  setTeacherCustomClaim(uid: string): Promise<void>;
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
      tx.set(
        docRef,
        {
          uid,
          date: dateStr,
          count: nextCount,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return { allowed: true, count: nextCount, dailyLimit };
    });
  },
  async setTeacherCustomClaim(uid: string) {
    await getAdminAuth(firebaseAdminApp).setCustomUserClaims(uid, { role: 'teacher' });
  },
};

let activeServerStore: ServerStoreAdapter = firestoreServerStoreAdapter;

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
      const key = normalize(`aiUsage/${usageId}`);
      const existing = docs.get(key);
      const currentCount = existing ? Number(existing.count || 0) : 0;
      if (currentCount >= dailyLimit) {
        return { allowed: false, count: currentCount, dailyLimit };
      }
      const nextCount = currentCount + 1;
      docs.set(key, {
        uid,
        date: dateStr,
        count: nextCount,
        updatedAt: new Date().toISOString(),
      });
      return { allowed: true, count: nextCount, dailyLimit };
    },
    async setTeacherCustomClaim(uid: string) {
      claims.set(uid, { role: 'teacher' });
    },
  };
}

// ============================================================================
// 3. FIREBASE ID TOKEN, APP CHECK & TEACHER ALLOWLIST VERIFICATION
// ============================================================================
export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  role?: string;
  signInProvider?: string;
}

export type FirebaseTokenVerifier = (idToken: string) => Promise<VerifiedFirebaseUser>;
export type AppCheckTokenVerifier = (appCheckToken: string) => Promise<{ appId: string }>;

let customTokenVerifierForTest: FirebaseTokenVerifier | null = null;
let customAppCheckVerifierForTest: AppCheckTokenVerifier | null = null;

export function setFirebaseTokenVerifierForTest(verifier: FirebaseTokenVerifier | null): void {
  customTokenVerifierForTest = verifier;
}

export function setAppCheckVerifierForTest(verifier: AppCheckTokenVerifier | null): void {
  customAppCheckVerifierForTest = verifier;
}

export function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    return null;
  }
  const trimmed = authorizationHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseUser> {
  if (customTokenVerifierForTest) {
    return await customTokenVerifierForTest(idToken);
  }
  const decoded = await getAdminAuth(firebaseAdminApp).verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email,
    emailVerified: decoded.email_verified !== false,
    name: typeof decoded.name === 'string' ? decoded.name : undefined,
    role: typeof (decoded as any).role === 'string' ? (decoded as any).role : undefined,
    signInProvider: decoded.firebase?.sign_in_provider,
  };
}

export async function verifyRequestAppCheck(req: Request): Promise<boolean> {
  const token = String(req.headers['x-firebase-appcheck'] || '').trim();
  const enforce = process.env.ENFORCE_APP_CHECK === 'true';

  if (customAppCheckVerifierForTest) {
    if (!token) {
      return !enforce;
    }
    try {
      await customAppCheckVerifierForTest(token);
      return true;
    } catch {
      return false;
    }
  }

  if (!enforce) {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    await getAdminAppCheck(firebaseAdminApp).verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

export function getTeacherEmailAllowlist(): string[] {
  const raw =
    process.env.TEACHER_EMAIL_ALLOWLIST?.trim() ||
    'dondon.win10@gmail.com,teacher@hanu.edu.vn';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailInTeacherAllowlist(email?: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (!clean) return false;
  const allowlist = getTeacherEmailAllowlist();
  return allowlist.includes(clean);
}

export function checkAndIncrementAiUidQuota(
  uid: string,
  now = Date.now()
): { allowed: boolean; reason?: 'minute_limit' | 'daily_limit'; dailyLimit: number } {
  const cleanUid = uid.trim();
  const dailyLimit = getAiDailyLimit();

  // 1. Per-minute burst check per UID
  const minuteEntry = aiUidMinuteCounts.get(cleanUid);
  if (minuteEntry && now <= minuteEntry.resetAt && minuteEntry.count >= AI_RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, reason: 'minute_limit', dailyLimit };
  }

  // 2. Per-day quota check per UID
  const dailyEntry = aiUidDailyCounts.get(cleanUid);
  if (dailyEntry && now <= dailyEntry.resetAt && dailyEntry.count >= dailyLimit) {
    return { allowed: false, reason: 'daily_limit', dailyLimit };
  }

  if (!minuteEntry || now > minuteEntry.resetAt) {
    aiUidMinuteCounts.set(cleanUid, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    minuteEntry.count += 1;
  }

  if (!dailyEntry || now > dailyEntry.resetAt) {
    aiUidDailyCounts.set(cleanUid, { count: 1, resetAt: now + AI_DAILY_WINDOW_MS });
  } else {
    dailyEntry.count += 1;
  }

  return { allowed: true, dailyLimit };
}

export async function checkAndIncrementAiFirestoreQuota(
  uid: string,
  now = new Date()
): Promise<{ allowed: boolean; reason?: 'minute_limit' | 'daily_limit'; dailyLimit: number; count?: number }> {
  const cleanUid = uid.trim();
  const dailyLimit = getAiDailyLimit();
  const nowMs = now.getTime();

  // 1. Per-minute burst check in memory
  const minuteEntry = aiUidMinuteCounts.get(cleanUid);
  if (minuteEntry && nowMs <= minuteEntry.resetAt && minuteEntry.count >= AI_RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, reason: 'minute_limit', dailyLimit };
  }
  if (!minuteEntry || nowMs > minuteEntry.resetAt) {
    aiUidMinuteCounts.set(cleanUid, { count: 1, resetAt: nowMs + RATE_LIMIT_WINDOW_MS });
  } else {
    minuteEntry.count += 1;
  }

  // 2. Daily quota check persisted in Firestore `aiUsage/{uid}_{YYYY-MM-DD}` via transaction
  const dateStr = now.toISOString().slice(0, 10);
  const usageId = `${cleanUid}_${dateStr}`;
  try {
    const txRes = await activeServerStore.incrementAiUsageTransaction(
      usageId,
      cleanUid,
      dateStr,
      dailyLimit
    );
    if (!txRes.allowed) {
      return { allowed: false, reason: 'daily_limit', dailyLimit, count: txRes.count };
    }
    return { allowed: true, dailyLimit, count: txRes.count };
  } catch {
    // Fallback to in-memory daily counter only if local ADC is unavailable in dev
    const fallback = checkAndIncrementAiUidQuota(cleanUid, nowMs);
    return fallback;
  }
}

export async function isUserAuthorizedForAi(
  user: VerifiedFirebaseUser,
  hintClassId?: string
): Promise<boolean> {
  // 1. Teacher role custom claim or allowlisted teacher email
  if (user.role === 'teacher' || isEmailInTeacherAllowlist(user.email)) {
    return true;
  }

  try {
    // 2. Check /teachers/{uid}
    const teacherDoc = await activeServerStore.getDoc(`teachers/${user.uid}`);
    if (teacherDoc && teacherDoc.role === 'teacher') {
      return true;
    }

    // 3. Check /users/{uid} enrollment profile
    const userDoc = await activeServerStore.getDoc(`users/${user.uid}`);
    if (
      userDoc &&
      Array.isArray(userDoc.enrolledClassIds) &&
      userDoc.enrolledClassIds.length > 0
    ) {
      return true;
    }

    // 4. If a specific classId was passed, check /classes/{classId}/students/{uid}
    if (hintClassId && /^[a-zA-Z0-9_-]{1,128}$/.test(hintClassId)) {
      const studentDoc = await activeServerStore.getDoc(
        `classes/${hintClassId}/students/${user.uid}`
      );
      if (studentDoc) {
        return true;
      }
    }
  } catch {
    // Deny if membership cannot be verified
  }

  return false;
}

export function isTrustedRequestOrigin(params: {
  origin?: string;
  referer?: string;
  host?: string;
  secFetchSite?: string;
  contentType?: string;
  allowedOriginsEnv?: string;
}): boolean {
  const {
    origin = '',
    referer = '',
    host = '',
    secFetchSite = '',
    contentType = '',
    allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '',
  } = params;

  if (!contentType.toLowerCase().includes('application/json')) {
    return false;
  }

  if (!origin.trim() && !referer.trim()) {
    return false;
  }

  const normalizedFetchSite = secFetchSite.toLowerCase().trim();
  if (normalizedFetchSite === 'cross-site' && !allowedOriginsEnv.trim()) {
    return false;
  }

  const extraAllowedEntries = allowedOriginsEnv
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const normalizedServerHost = host.toLowerCase().split(':')[0].trim();

  const isCandidateUrlAllowed = (candidateUrl: string): boolean => {
    try {
      const parsed = new URL(candidateUrl);
      const candidateHost = parsed.hostname.toLowerCase();
      const candidateOrigin = parsed.origin.toLowerCase();

      if (normalizedServerHost && candidateHost === normalizedServerHost) {
        return true;
      }

      if (
        extraAllowedEntries.includes(candidateOrigin) ||
        extraAllowedEntries.includes(candidateHost)
      ) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  if (origin && !isCandidateUrlAllowed(origin)) {
    return false;
  }

  if (!origin && referer && !isCandidateUrlAllowed(referer)) {
    return false;
  }

  return true;
}

async function authenticateBearerRequest(
  req: Request,
  res: Response
): Promise<VerifiedFirebaseUser | null> {
  const appCheckOk = await verifyRequestAppCheck(req);
  if (!appCheckOk) {
    res.status(401).json({
      error: 'Unauthorized: Missing or invalid Firebase App Check token.',
      fallback: true,
    });
    return null;
  }

  const bearerToken = extractBearerToken(
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined
  );
  if (!bearerToken) {
    res.status(401).json({
      error: 'Unauthorized: Missing Firebase ID Token in Authorization Bearer header.',
      fallback: true,
    });
    return null;
  }

  try {
    const verifiedUser = await verifyFirebaseIdToken(bearerToken);
    if (!verifiedUser || !verifiedUser.uid) {
      throw new Error('Missing uid in verified token');
    }
    return verifiedUser;
  } catch {
    res.status(401).json({
      error: 'Unauthorized: Invalid or expired Firebase ID Token.',
      fallback: true,
    });
    return null;
  }
}

async function protectAiRoute(req: Request, res: Response, next: NextFunction) {
  const origin = String(req.headers.origin || '');
  const referer = String(req.headers.referer || '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const secFetchSite = String(req.headers['sec-fetch-site'] || '');
  const contentType = String(req.headers['content-type'] || '');

  if (
    !isTrustedRequestOrigin({
      origin,
      referer,
      host,
      secFetchSite,
      contentType,
    })
  ) {
    res.status(403).json({
      error: 'Forbidden: Invalid request origin.',
      fallback: true,
    });
    return;
  }

  const verifiedUser = await authenticateBearerRequest(req, res);
  if (!verifiedUser) {
    return;
  }

  const hintClassId = String(req.body?.classId || req.headers['x-hanu-class-id'] || '').trim();
  const isAuthorized = await isUserAuthorizedForAi(verifiedUser, hintClassId);
  if (!isAuthorized) {
    res.status(403).json({
      error:
        'Forbidden: Chỉ tài khoản Giảng viên hoặc Học viên đã tham gia ít nhất 1 lớp học mới được sử dụng tính năng AI.',
      fallback: true,
    });
    return;
  }

  // Rate-limit by verified Firebase UID (minute burst + Firestore transaction aiUsage/{uid}_{YYYY-MM-DD})
  const quotaResult = await checkAndIncrementAiFirestoreQuota(verifiedUser.uid);
  if (!quotaResult.allowed) {
    if (quotaResult.reason === 'minute_limit') {
      res.status(429).json({
        error: 'AI rate limit exceeded for this user (uid). Please wait a moment.',
        fallback: true,
      });
      return;
    }
    res.status(429).json({
      error: `Daily AI quota (${quotaResult.dailyLimit} requests/day) exceeded for uid ${verifiedUser.uid}.`,
      fallback: true,
    });
    return;
  }

  (req as Request & { firebaseUser?: VerifiedFirebaseUser }).firebaseUser = verifiedUser;
  next();
}

// ============================================================================
// 4. CLASSROOM & SECURITY ROUTES (TEACHER BOOTSTRAP, JOIN CLASS, SUBMISSIONS)
// ============================================================================
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
 * Built-in server fallback answer keys for preset assignments (`assign-b14`, `assign-b15`, `speedtest-10`)
 * when a teacher assigns a preset package before saving a custom answerKey doc.
 */
const BUILTIN_SERVER_ANSWER_KEYS: Record<string, ServerAnswerKeyRecord> = {
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
      'mc-15-2': 'A',
      'mc-15-3': 'A',
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
      'st-1': '温暖',
      'st-2': '咱们',
      'st-3': '愿意',
      'st-4': '空调',
      'st-5': '洗衣机',
      'st-6': '换',
      'st-7': '初中',
      'st-8': '花园',
      'st-9': '刻',
      'st-10': '幸福',
    },
    sentenceOrderingAnswers: {},
    essayModels: {},
    maxAttempts: 1,
  },
};

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
    if (actual && actual.toUpperCase() === String(expectedKey).trim().toUpperCase()) {
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

/**
 * 4A. Teacher Bootstrap Route: POST /api/teachers/bootstrap
 * Verifies that the authenticated user's email is in TEACHER_EMAIL_ALLOWLIST,
 * sets custom claim `role = 'teacher'`, and creates/updates `/teachers/{uid}`.
 */
app.post('/api/teachers/bootstrap', async (req, res) => {
  const verifiedUser = await authenticateBearerRequest(req, res);
  if (!verifiedUser) return;

  const email = (verifiedUser.email || '').trim().toLowerCase();
  if (verifiedUser.emailVerified === false) {
    res.status(403).json({
      error: 'Email tài khoản chưa được xác thực (email_verified = false).',
    });
    return;
  }
  if (!isEmailInTeacherAllowlist(email)) {
    res.status(403).json({
      error: `Email "${email || '(ẩn danh)'}" không nằm trong danh sách Giảng viên được cấp phép (TEACHER_EMAIL_ALLOWLIST).`,
    });
    return;
  }

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
 * Uses firebase-admin to verify joinCode -> classId, studentCode slot availability,
 * and writes `classes/{classId}/students/{uid}` with zeroed initial score/feedback fields.
 */
app.post('/api/classes/join', async (req, res) => {
  const verifiedUser = await authenticateBearerRequest(req, res);
  if (!verifiedUser) return;

  const rateKey = `${verifiedUser.uid}:${req.ip || 'local'}`;
  const joinRate = checkJoinClassRateLimit(rateKey);
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

  try {
    // 1. Lookup joinCodes/{joinCode}
    const joinCodeDoc = await activeServerStore.getDoc(`joinCodes/${cleanJoinCode}`);
    if (!joinCodeDoc || !joinCodeDoc.classId) {
      res.status(404).json({
        error: `Không tìm thấy lớp học với mã lớp "${cleanJoinCode}".`,
      });
      return;
    }

    const classId = String(joinCodeDoc.classId);
    const classData = await activeServerStore.getDoc(`classes/${classId}`);
    if (!classData) {
      res.status(404).json({
        error: 'Lớp học không còn tồn tại trên hệ thống.',
      });
      return;
    }

    const classroom = {
      id: classId,
      teacherUid: String(classData.teacherUid || ''),
      teacherName: String(classData.teacherName || 'Giảng viên HSK'),
      name: String(classData.name || 'Lớp HSK 3.0'),
      hskLevel: String(classData.hskLevel || 'HSK 3'),
      joinCode: String(classData.joinCode || cleanJoinCode),
      createdAt: String(classData.createdAt || new Date().toISOString()),
      updatedAt: classData.updatedAt ? String(classData.updatedAt) : undefined,
    };

    // 2. Check if student already has a record at classes/{classId}/students/{uid}
    const existingOwnStudent = await activeServerStore.getDoc(
      `classes/${classId}/students/${verifiedUser.uid}`
    );
    if (existingOwnStudent) {
      if (
        cleanStudentCode &&
        existingOwnStudent.studentCode &&
        String(existingOwnStudent.studentCode).toUpperCase() !== cleanStudentCode
      ) {
        res.status(403).json({
          error: `Tài khoản của bạn đã gắn với mã học sinh ${existingOwnStudent.studentCode}. Không thể đổi sang mã ${cleanStudentCode}.`,
        });
        return;
      }

      const studentRecord = {
        id: verifiedUser.uid,
        studentCode: String(existingOwnStudent.studentCode || cleanStudentCode),
        name: String(existingOwnStudent.name || verifiedUser.name || 'Học viên'),
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
      };

      res.status(200).json({ classroom, studentRecord });
      return;
    }

    // 3. Require a valid teacher-issued studentCode slot that has not been claimed by another uid
    if (!cleanStudentCode || cleanStudentCode.length < 6) {
      res.status(400).json({
        error: 'Vui lòng nhập Mã học sinh hợp lệ (tối thiểu 6 ký tự) do Giảng viên cấp.',
      });
      return;
    }

    const allStudentDocs = await activeServerStore.listCollection(
      `classes/${classId}/students`
    );
    const matchedSlot = allStudentDocs.find(
      (docItem) =>
        String(docItem.data.studentCode || '').toUpperCase() === cleanStudentCode
    );

    if (!matchedSlot) {
      res.status(404).json({
        error: `Mã học sinh "${cleanStudentCode}" chưa được Giảng viên cấp trong lớp "${classroom.name}".`,
      });
      return;
    }

    const boundUid = String(matchedSlot.data.studentUid || '').trim();
    if (boundUid && boundUid !== verifiedUser.uid) {
      res.status(409).json({
        error: `Mã học sinh "${cleanStudentCode}" đã được kích hoạt bởi một tài khoản khác.`,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const studentName = String(
      matchedSlot.data.name || verifiedUser.name || cleanStudentCode
    )
      .trim()
      .slice(0, 120);
    const hskLevel = String(matchedSlot.data.hskLevel || classroom.hskLevel || 'HSK 3');
    const joinedAt = String(matchedSlot.data.joinedAt || nowIso.slice(0, 10));

    const newStudentDoc = {
      studentUid: verifiedUser.uid,
      studentCode: cleanStudentCode,
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
        ? matchedSlot.data.reviewWords
        : [],
      updatedAt: nowIso,
    };

    // Write canonical student doc keyed by student's UID
    await activeServerStore.setDoc(
      `classes/${classId}/students/${verifiedUser.uid}`,
      newStudentDoc
    );

    // Mark the teacher slot as claimed by this studentUid
    if (matchedSlot.id !== verifiedUser.uid) {
      await activeServerStore.setDoc(
        `classes/${classId}/students/${matchedSlot.id}`,
        {
          ...matchedSlot.data,
          studentUid: verifiedUser.uid,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    }

    // Record enrollment in users/{uid} so AI routes know this student belongs to a class
    const existingUserDoc = await activeServerStore.getDoc(`users/${verifiedUser.uid}`);
    const prevClasses = Array.isArray(existingUserDoc?.enrolledClassIds)
      ? (existingUserDoc!.enrolledClassIds as string[])
      : [];
    const nextClasses = Array.from(new Set([...prevClasses, classId]));
    await activeServerStore.setDoc(
      `users/${verifiedUser.uid}`,
      {
        uid: verifiedUser.uid,
        enrolledClassIds: nextClasses,
        activeClassId: classId,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    res.status(200).json({
      classroom,
      studentRecord: {
        id: verifiedUser.uid,
        ...newStudentDoc,
      },
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

  const classId = String(req.params.classId || '').trim();
  const targetCode = String(req.params.studentCode || '')
    .trim()
    .toUpperCase();
  const regenerateCode = Boolean(req.body?.regenerateCode);

  if (!classId || !targetCode) {
    res.status(400).json({ error: 'Thiếu classId hoặc studentCode.' });
    return;
  }

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
      } else if (!docItem.id.startsWith('slot-')) {
        await activeServerStore.deleteDoc(`classes/${classId}/students/${docItem.id}`);
      } else {
        await activeServerStore.deleteDoc(`classes/${classId}/students/${docItem.id}`);
      }
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
 * 4D. Server-Side Homework Grading Route: POST /api/submissions
 * Body: { classId, assignmentId, answers, timeSeconds? }
 * Verifies student membership in classId, enforces max attempts, grades against
 * `classes/{classId}/answerKeys/{assignmentId}`, and writes `submissions`, `leaderboard`, and `students`.
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
  const rawTimeSeconds = Number(req.body?.timeSeconds || 0);

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

  try {
    // 1. Verify student is enrolled in this class
    const studentDocPath = `classes/${classId}/students/${verifiedUser.uid}`;
    const studentDoc = await activeServerStore.getDoc(studentDocPath);
    if (!studentDoc) {
      res.status(403).json({
        error: 'Forbidden: Bạn chưa tham gia lớp học này nên không thể nộp bài.',
      });
      return;
    }

    // 2. Load secret answerKey from Firestore (or fallback to built-in preset answer key)
    const storedAnswerKey = (await activeServerStore.getDoc(
      `classes/${classId}/answerKeys/${assignmentId}`
    )) as ServerAnswerKeyRecord | null;
    const answerKey: ServerAnswerKeyRecord | null =
      storedAnswerKey || BUILTIN_SERVER_ANSWER_KEYS[assignmentId] || null;

    if (!answerKey) {
      res.status(404).json({
        error: `Không tìm thấy đáp án chấm điểm cho bài tập "${assignmentId}".`,
      });
      return;
    }

    // 3. Enforce max submission attempts on deterministic submission doc ID `{assignmentId}_{uid}`
    const configuredMax = Number(process.env.MAX_SUBMISSION_ATTEMPTS || 1);
    const maxAttempts = Math.max(
      1,
      Math.floor(Number(answerKey.maxAttempts || configuredMax || 1))
    );
    const submissionId = `${assignmentId}_${verifiedUser.uid}`;
    const submissionPath = `classes/${classId}/submissions/${submissionId}`;
    const existingSub = await activeServerStore.getDoc(submissionPath);
    const prevAttempts = existingSub ? Number(existingSub.attemptCount || 1) : 0;

    if (prevAttempts >= maxAttempts) {
      res.status(409).json({
        error: `Bạn đã nộp bài tập này (${prevAttempts}/${maxAttempts} lượt cho phép).`,
      });
      return;
    }

    // 4. Grade answers on the server against answerKey
    const graded = gradeSubmissionPayloadOnServer({
      answerKey,
      answers,
    });

    const nowIso = new Date().toISOString();
    const timeSeconds =
      Number.isFinite(rawTimeSeconds) && rawTimeSeconds > 0
        ? Math.max(5, Math.min(3600, Math.round(rawTimeSeconds)))
        : 30;
    const prevStreak = Number(studentDoc.streak || 0);
    const nextStreak = prevStreak + 1;
    const attemptCount = prevAttempts + 1;

    const studentCode = String(studentDoc.studentCode || 'HV-RANDOM');
    const studentName = String(studentDoc.name || verifiedUser.name || 'Học viên');
    const hskLevel = String(studentDoc.hskLevel || 'HSK 3');

    const submissionDoc = {
      id: submissionId,
      studentUid: verifiedUser.uid,
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
      submittedAt: nowIso,
    };

    await activeServerStore.setDoc(submissionPath, submissionDoc);

    // 5. Update leaderboard summary via Admin SDK
    await activeServerStore.setDoc(`classes/${classId}/leaderboard/${verifiedUser.uid}`, {
      studentUid: verifiedUser.uid,
      studentCode,
      name: studentName,
      hskLevel,
      score: graded.score,
      timeSeconds,
      streak: nextStreak,
      updatedAt: nowIso,
    });

    // 6. Update student's score/status/feedback fields in classes/{classId}/students/{uid}
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

    await activeServerStore.setDoc(studentDocPath, updatedStudentFields, { merge: true });

    // Also keep any pre-registered slot doc in sync for teacher roster view
    const slotId = `slot-${studentCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
    const existingSlot = await activeServerStore.getDoc(
      `classes/${classId}/students/${slotId}`
    );
    if (existingSlot) {
      await activeServerStore.setDoc(
        `classes/${classId}/students/${slotId}`,
        {
          ...updatedStudentFields,
          studentUid: verifiedUser.uid,
        },
        { merge: true }
      );
    }

    res.status(200).json({
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
    });
  } catch (err) {
    console.error('[server] /api/submissions error', err);
    res.status(500).json({
      error: 'Không thể chấm bài trên server lúc này. Vui lòng thử lại sau.',
    });
  }
});

function geminiErrorText(err: unknown): string {
  const e = err as { message?: string; status?: number | string; code?: number | string };
  return `${e?.status ?? ''} ${e?.code ?? ''} ${e?.message ?? String(err ?? '')}`.toLowerCase();
}

/** Model is missing / not enabled for this key / retired → try the next model. */
function isModelUnavailableError(err: unknown): boolean {
  const t = geminiErrorText(err);
  return (
    t.includes('not found') ||
    t.includes('404') ||
    t.includes('is not supported') ||
    t.includes('not available') ||
    t.includes('permission') ||
    t.includes('403')
  );
}

/** Temporary server-side trouble → one quick retry, then the next model. */
function isTransientGeminiError(err: unknown): boolean {
  const t = geminiErrorText(err);
  return (
    t.includes('503') ||
    t.includes('unavailable') ||
    t.includes('overloaded') ||
    t.includes('500') ||
    t.includes('internal') ||
    t.includes('deadline') ||
    t.includes('timeout') ||
    t.includes('timed out') ||
    t.includes('429') ||
    t.includes('resource_exhausted')
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call Gemini with the model chain for this task. Returns the response and the
 * model that answered. Invalid-request errors (bad prompt/schema/key) are not
 * retried because another model would fail the same way.
 */
export async function callGeminiModel(
  ai: GoogleGenAI,
  task: GeminiTask,
  params: Omit<Parameters<typeof ai.models.generateContent>[0], 'model'>
) {
  const chain = geminiModelChain(task);
  const deadline = Date.now() + GEMINI_TOTAL_BUDGET_MS;
  let lastError: unknown = null;
  for (const model of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (lastError && Date.now() > deadline) throw lastError;
      try {
        const response = await ai.models.generateContent({ ...params, model });
        return { response, model };
      } catch (err) {
        lastError = err;
        if (isModelUnavailableError(err)) break; // next model
        if (isTransientGeminiError(err)) {
          if (attempt === 0) {
            await sleep(400 + Math.round(Math.random() * 400));
            continue; // retry same model once
          }
          break; // next model
        }
        throw err; // bad request, auth, etc.
      }
    }
    console.warn(`[gemini] model ${model} failed, trying next`, geminiErrorText(lastError).slice(0, 160));
  }
  throw lastError ?? new Error('No Gemini model available');
}

function classifyErrorStatus(err: unknown): number {
  const raw = err instanceof Error ? err.message.toLowerCase() : '';
  if (raw.includes('api key') || raw.includes('unauthorized') || raw.includes('401')) {
    return 401;
  }
  if (raw.includes('quota') || raw.includes('rate') || raw.includes('429')) {
    return 429;
  }
  return 500;
}

// Server-side Gemini API route for enriching arbitrary Chinese vocabulary
app.post('/api/hanzi/enrich', protectAiRoute, async (req, res) => {
  try {
    const hanzi = sanitizeAiUserInput(String(req.body?.hanzi || ''), 40);
    if (!hanzi || hanzi.length > 40) {
      res.status(400).json({ error: 'Invalid or missing hanzi parameter (max 40 characters).' });
      return;
    }

    const cacheKey = hanzi;
    const cached = enrichCache.get(cacheKey);
    if (cached) {
      res.set('X-AI-Cache', 'hit').status(200).json(cached);
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(401).json({ fallback: true, error: 'Gemini API key is not configured.' });
      return;
    }

    const { response, model } = await callGeminiModel(ai, 'fast', {
      contents: `Hãy phân tích từ/chữ tiếng Trung "${hanzi}" dành cho học viên Việt Nam học HSK.
Trả về JSON chính xác gồm:
- pinyin: phiên âm Pinyin chuẩn có dấu thanh điệu, các âm tiết cách nhau 1 khoảng trắng (ví dụ: "温暖" -> "wēn nuǎn")
- hanViet: âm Hán Việt chuẩn xác bằng chữ thường (ví dụ: "ôn noãn")
- meaning: nghĩa tiếng Việt sát nghĩa, tự nhiên (ví dụ: "ấm áp, đầm ấm")
- partOfSpeech: từ loại tiếng Việt viết hoa (ví dụ: "TÍNH TỪ", "DANH TỪ", "ĐỘNG TỪ")
- hskLevel: cấp độ HSK (ví dụ: "HSK 3", "HSK 4")
- usageNote: ghi chú ngắn gọn cách dùng, mẹo nhớ chiết tự của Bin Bin và cụm từ kết hợp phổ biến
- exampleHanzi: 1 câu ví dụ tiếng Trung tự nhiên có chứa từ "${hanzi}"
- examplePinyin: phiên âm Pinyin của câu ví dụ
- exampleMeaning: dịch nghĩa tiếng Việt của câu ví dụ
- illustrationKey: chọn 1 trong các chủ đề tranh minh họa phù hợp nhất: "wennuan", "long", "laoshi", "pengyou", "huayuan", "kongtiao", "xiyiji", "chuzhong", "xingfu", "kafei", "nuli", "nature", "people", "daily", "school"
- characterDetails: mảng thông tin từng chữ Hán trong "${hanzi}", mỗi phần tử gồm { char, pinyin, radical (ví dụ: "氵 (Thủy - Nước)"), strokeCount }`,
      config: {
        systemInstruction: BINBIN_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pinyin: { type: Type.STRING },
            hanViet: { type: Type.STRING },
            meaning: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            hskLevel: { type: Type.STRING },
            usageNote: { type: Type.STRING },
            exampleHanzi: { type: Type.STRING },
            examplePinyin: { type: Type.STRING },
            exampleMeaning: { type: Type.STRING },
            illustrationKey: { type: Type.STRING },
            characterDetails: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  char: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  radical: { type: Type.STRING },
                  strokeCount: { type: Type.INTEGER },
                },
              },
            },
          },
          required: [
            'pinyin',
            'hanViet',
            'meaning',
            'partOfSpeech',
            'hskLevel',
            'usageNote',
            'exampleHanzi',
            'examplePinyin',
            'exampleMeaning',
            'illustrationKey',
          ],
        },
      },
    });

    const parsed = parseModelJson<Record<string, unknown>>(response.text, {});
    if (!parsed.pinyin || !parsed.meaning) {
      res.status(502).json({ fallback: true, error: 'AI returned an incomplete word entry.' });
      return;
    }
    enrichCache.set(cacheKey, parsed);
    res.set('X-AI-Model', model).status(200).json(parsed);
  } catch (err) {
    const status = classifyErrorStatus(err);
    res.status(status).json({
      fallback: true,
      error: 'Unable to enrich vocabulary at this time.',
    });
  }
});

// Server-side Gemini API route for Vocabulary Search Suggestions (/api/hanzi/suggest)
app.post('/api/hanzi/suggest', protectAiRoute, async (req, res) => {
  try {
    const query = sanitizeAiUserInput(String(req.body?.query || ''), 120);
    const limit = Math.min(8, Math.max(2, Number(req.body?.limit) || 6));
    if (!query || query.length > 120) {
      res.status(400).json({ error: 'Invalid or missing query parameter (max 120 characters).' });
      return;
    }

    const cacheKey = `${query.toLowerCase()}|${limit}`;
    const cached = suggestCache.get(cacheKey);
    if (cached) {
      res.set('X-AI-Cache', 'hit').status(200).json(cached);
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(401).json({ fallback: true, error: 'Gemini API key is not configured.' });
      return;
    }

    const { response, model } = await callGeminiModel(ai, 'fast', {
      contents: `Giáo viên tiếng Trung đang tìm kiếm từ vựng với từ khóa/chủ đề: "${query}".
Hãy gợi ý ${limit} từ vựng tiếng Trung HSK sát nghĩa và hữu ích nhất để giáo viên chọn đưa vào bài giảng.
Trả về JSON có thuộc tính "suggestions" là mảng các đối tượng, mỗi đối tượng gồm:
- hanzi: chữ Hán giản thể chuẩn (ví dụ: "温暖", "咖啡", "家庭")
- pinyin: phiên âm Pinyin chuẩn có dấu thanh điệu, cách nhau bằng khoảng trắng (ví dụ: "wēn nuǎn")
- hanViet: âm Hán Việt chuẩn bằng chữ thường (ví dụ: "ôn noãn")
- meaning: nghĩa tiếng Việt ngắn gọn, tự nhiên (ví dụ: "ấm áp, đầm ấm")
- partOfSpeech: từ loại viết hoa (ví dụ: "TÍNH TỪ", "DANH TỪ", "ĐỘNG TỪ")
- hskLevel: cấp độ HSK (ví dụ: "HSK 1", "HSK 3", "HSK 4")
- exampleHanzi: 1 câu ví dụ tiếng Trung tự nhiên chứa từ đó
- examplePinyin: phiên âm Pinyin của câu ví dụ
- exampleMeaning: nghĩa tiếng Việt của câu ví dụ
- usageNote: ghi chú ngắn gọn về cách dùng hoặc mẹo nhớ chiết tự của Gấu trúc Bin Bin`,
      config: {
        systemInstruction: BINBIN_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  hanViet: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
                  hskLevel: { type: Type.STRING },
                  exampleHanzi: { type: Type.STRING },
                  examplePinyin: { type: Type.STRING },
                  exampleMeaning: { type: Type.STRING },
                  usageNote: { type: Type.STRING },
                },
                required: [
                  'hanzi',
                  'pinyin',
                  'hanViet',
                  'meaning',
                  'partOfSpeech',
                  'hskLevel',
                  'exampleHanzi',
                  'exampleMeaning',
                ],
              },
            },
          },
          required: ['suggestions'],
        },
      },
    });

    const parsed = parseModelJson<{ suggestions?: unknown[] }>(response.text, { suggestions: [] });
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, limit) : [];
    const payload = { suggestions };
    if (suggestions.length > 0) suggestCache.set(cacheKey, payload);
    res.set('X-AI-Model', model).status(200).json(payload);
  } catch (err) {
    const status = classifyErrorStatus(err);
    res.status(status).json({
      fallback: true,
      error: 'Unable to fetch vocabulary suggestions at this time.',
    });
  }
});

// Server-side Gemini API route for Bin Bin (彬彬) Practical Pedagogical Assistant
app.post('/api/binbin/chat', protectAiRoute, async (req, res) => {
  try {
    const prompt = sanitizeAiUserInput(String(req.body?.prompt || ''), 1500);
    const actionType = sanitizeAiUserInput(String(req.body?.actionType || 'chat'), 40) || 'chat';
    const contextSlide = req.body?.contextSlide || null;
    const contextQuiz = req.body?.contextQuiz || null;
    // Last few turns so BinBin can follow up ("cho thêm ví dụ", "giải thích lại").
    const rawHistory: unknown[] = Array.isArray(req.body?.history) ? req.body.history : [];
    const history = rawHistory
      .slice(-6)
      .map((turn) => {
        const t = turn as { role?: unknown; text?: unknown };
        const role = t?.role === 'model' ? 'model' : t?.role === 'user' ? 'user' : null;
        const text = typeof t?.text === 'string' ? sanitizeAiUserInput(t.text, 800) : '';
        return role && text ? { role, parts: [{ text }] } : null;
      })
      .filter((t): t is { role: 'user' | 'model'; parts: { text: string }[] } => t !== null);

    if (!prompt || prompt.length > 1500) {
      res.status(400).json({ error: 'Invalid or missing prompt (max 1500 characters).' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(401).json({ fallback: true, error: 'Gemini API key is not configured.' });
      return;
    }

    const contextSummary = [
      contextSlide
        ? `Từ vựng đang mở trên Slide: "${contextSlide.hanzi}" (${contextSlide.pinyin} - Hán Việt: ${contextSlide.hanViet} - Nghĩa: ${contextSlide.meaning}). Ví dụ: ${contextSlide.exampleHanzi} (${contextSlide.examplePinyin}).`
        : '',
      contextQuiz
        ? `Câu hỏi Trò chơi hiện tại: ${contextQuiz.prompt || ''} | Gợi ý ngữ pháp: ${contextQuiz.grammarHint || ''} | Gợi ý Pinyin: ${contextQuiz.pinyinHint || ''}.`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const currentTurn = `${contextSummary ? `[Ngữ cảnh bài giảng hiện tại]\n${contextSummary}\n\n` : ''}[Chế độ: ${actionType}]\nYêu cầu của Giáo viên / Học viên: ${prompt}

Hãy giải đáp trực diện, thực dụng theo chuẩn HSK 3.0 dưới dạng JSON:
- replyText: Giải thích ngắn gọn, đi thẳng vào trọng tâm bằng gạch đầu dòng rõ ràng (tuyệt đối không chào hỏi dài dòng, không ghép từ máy móc kiểu "学习X" hay "常用X"). Nếu người dùng nhập câu sai, hãy chỉ rõ lỗi sai và cách sửa tự nhiên. Nếu giáo viên yêu cầu tạo bài tập/hội thoại, hãy trình bày rõ từng câu.
- essenceAndContext: 1-2 câu tóm tắt bản chất từ loại và ngữ cảnh dùng thực tế của từ/cấu trúc.
- collocations: mảng 3 cụm từ kết hợp chuẩn 100% người bản xứ (ví dụ với 初中: 上初中, 初中生, 初中毕业), mỗi phần tử gồm { hanzi, pinyin, meaning }.
- synonymDistinction: so sánh nhanh với 1-2 từ dễ nhầm (ví dụ 初中 vs 高中, 温暖 vs 暖和), gồm { title, summary, items: [{ word, pinyin, nuance, example }] }.
- examples: mảng 2 câu ví dụ thực tế tự nhiên, mỗi phần tử gồm { hanzi, pinyin, meaning }.
- chinesePhrase: câu tiếng Trung tiêu biểu số 1.
- pinyinPhrase: phiên âm Pinyin có dấu của chinesePhrase.
- vietnamesePhrase: nghĩa tiếng Việt của chinesePhrase.
- targetWord: thông tin từ vựng trọng tâm để có thể thêm ngay vào Slide bài giảng { hanzi, pinyin, hanViet, meaning, partOfSpeech, hskLevel }.`;

    const { response, model } = await callGeminiModel(ai, 'chat', {
      // Earlier turns give the conversation memory; JSON instructions only on the latest turn.
      contents: [...history, { role: 'user', parts: [{ text: currentTurn }] }],
      config: {
        systemInstruction: BINBIN_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: { type: Type.STRING },
            essenceAndContext: { type: Type.STRING },
            collocations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                },
              },
            },
            synonymDistinction: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      word: { type: Type.STRING },
                      pinyin: { type: Type.STRING },
                      nuance: { type: Type.STRING },
                      example: { type: Type.STRING },
                    },
                  },
                },
              },
            },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                },
              },
            },
            chinesePhrase: { type: Type.STRING },
            pinyinPhrase: { type: Type.STRING },
            vietnamesePhrase: { type: Type.STRING },
            targetWord: {
              type: Type.OBJECT,
              properties: {
                hanzi: { type: Type.STRING },
                pinyin: { type: Type.STRING },
                hanViet: { type: Type.STRING },
                meaning: { type: Type.STRING },
                partOfSpeech: { type: Type.STRING },
                hskLevel: { type: Type.STRING },
              },
            },
          },
          required: ['replyText', 'chinesePhrase', 'pinyinPhrase', 'vietnamesePhrase'],
        },
      },
    });

    const parsed = parseModelJson<Record<string, unknown>>(response.text, {});
    if (!parsed.replyText) {
      res.status(502).json({ fallback: true, error: 'AI returned an empty reply.' });
      return;
    }
    res.set('X-AI-Model', model).status(200).json(parsed);
  } catch (err) {
    const status = classifyErrorStatus(err);
    res.status(status).json({
      fallback: true,
      error: 'Unable to process assistant request at this time.',
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(ROOT_DIR, 'dist');
    // Hashed build files never change, so browsers may keep them for a year.
    // index.html must always be revalidated so a new deploy is picked up.
    const HASHED_ASSET = /-[A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?)$/;
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders(res, filePath) {
          if (HASHED_ASSET.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
        return;
      }
      // A missing build file (e.g. an old chunk after a redeploy) must 404,
      // not fall back to index.html, so the client can detect it and reload.
      if (req.path.startsWith('/assets/') || /\.[a-z0-9]{2,5}$/i.test(req.path)) {
        res.status(404).end();
        return;
      }
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Last-resort error handler: malformed JSON or an unexpected throw returns a
  // short JSON error instead of an HTML stack trace.
  app.use(
    (err: unknown, req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        next(err);
        return;
      }
      const status =
        (err as { type?: string })?.type === 'entity.parse.failed'
          ? 400
          : (err as { type?: string })?.type === 'entity.too.large'
          ? 413
          : 500;
      if (status === 500) console.error('[server] unhandled error on', req.method, req.path, err);
      res.status(status).json({
        error:
          status === 400
            ? 'Dữ liệu gửi lên không hợp lệ.'
            : status === 413
            ? 'Dữ liệu gửi lên quá lớn.'
            : 'Máy chủ gặp lỗi, vui lòng thử lại.',
      });
    }
  );

  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`HANU × 阮文受 server listening on http://0.0.0.0:${port}`);
  });

  // Cloud Run sends SIGTERM before stopping an instance: finish in-flight
  // requests instead of cutting them off.
  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received, closing`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled promise rejection', reason);
});

if (
  process.argv[1] &&
  (path.resolve(process.argv[1]) === __filename ||
    path.basename(process.argv[1]) === 'server.ts' ||
    path.basename(process.argv[1]) === 'server.js')
) {
  startServer();
}
