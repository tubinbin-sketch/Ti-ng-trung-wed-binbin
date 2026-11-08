import { Request, Response, NextFunction } from 'express';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getAppCheck as getAdminAppCheck } from 'firebase-admin/app-check';
import {
  buildPrivacySafeRateLimitBucketId,
  firebaseAdminApp,
  getActiveServerStore,
  MAX_IN_MEMORY_RATE_LIMIT_DOCS,
} from '../services/storeAndGradingService';
import { getAiDailyLimit } from '../services/geminiAiService';

// ============================================================================
// 1. MULTI-INSTANCE RATE LIMITING VIA FIRESTORE (COLLECTION `rateLimits`)
// ============================================================================
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 90;

export const AI_RATE_LIMIT_WINDOW_MS = 60_000;
export const AI_RATE_LIMIT_MAX_REQUESTS = 30;
export const AI_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const TEACHER_BOOTSTRAP_WINDOW_MS = 10 * 60_000; // 10 minutes
export const TEACHER_BOOTSTRAP_MAX_ATTEMPTS = 10;

export const JOIN_CLASS_WINDOW_MS = 10 * 60_000; // 10 minutes
export const JOIN_CLASS_MAX_ATTEMPTS = 15;

export const ASSIGNMENT_START_WINDOW_MS = 60_000; // 1 minute
export const ASSIGNMENT_START_MAX_REQUESTS = 20;

export const RESET_SLOT_WINDOW_MS = 10 * 60_000; // 10 minutes
export const RESET_SLOT_MAX_REQUESTS = 15;

export const RATE_LIMIT_SCOPES = {
  api_general: { maxRequests: RATE_LIMIT_MAX_REQUESTS, windowMs: RATE_LIMIT_WINDOW_MS },
  teacher_bootstrap: {
    maxRequests: TEACHER_BOOTSTRAP_MAX_ATTEMPTS,
    windowMs: TEACHER_BOOTSTRAP_WINDOW_MS,
  },
  ai_minute: { maxRequests: AI_RATE_LIMIT_MAX_REQUESTS, windowMs: AI_RATE_LIMIT_WINDOW_MS },
  join_class: { maxRequests: JOIN_CLASS_MAX_ATTEMPTS, windowMs: JOIN_CLASS_WINDOW_MS },
  assignment_start: {
    maxRequests: ASSIGNMENT_START_MAX_REQUESTS,
    windowMs: ASSIGNMENT_START_WINDOW_MS,
  },
  reset_student_slot: { maxRequests: RESET_SLOT_MAX_REQUESTS, windowMs: RESET_SLOT_WINDOW_MS },
} as const;

const RATE_LIMIT_CLEANUP_INTERVAL_MS = 10 * 60_000; // 10 minutes

const clientRequestCounts = new Map<string, { count: number; resetAt: number }>();
const aiUidMinuteCounts = new Map<string, { count: number; resetAt: number }>();
const aiUidDailyCounts = new Map<string, { count: number; resetAt: number }>();
const joinClassAttemptCounts = new Map<string, { count: number; resetAt: number }>();

function enforceMapMaxSize(map: Map<string, { count: number; resetAt: number }>, now = Date.now()): void {
  if (map.size < MAX_IN_MEMORY_RATE_LIMIT_DOCS) return;
  for (const [k, v] of map.entries()) {
    if (now > v.resetAt) {
      map.delete(k);
    }
  }
  while (map.size >= MAX_IN_MEMORY_RATE_LIMIT_DOCS) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
}

export function checkBoundedInMemoryBucket(
  bucketId: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now()
): { allowed: boolean; count: number; remaining: number; resetAt: number } {
  enforceMapMaxSize(clientRequestCounts, now);
  const entry = clientRequestCounts.get(bucketId);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    clientRequestCounts.set(bucketId, { count: 1, resetAt });
    return {
      allowed: true,
      count: 1,
      remaining: Math.max(0, maxRequests - 1),
      resetAt,
    };
  }
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      count: entry.count,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  entry.count += 1;
  return {
    allowed: true,
    count: entry.count,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Dedicated brute-force rate limiter for /api/classes/join (max 15 attempts per 10 minutes per UID/IP).
 */
export function checkJoinClassRateLimit(
  key: string,
  now = Date.now()
): { allowed: boolean; remaining: number } {
  const hashedKey = buildPrivacySafeRateLimitBucketId('join_class', key.trim() || 'unknown');
  enforceMapMaxSize(joinClassAttemptCounts, now);
  const entry = joinClassAttemptCounts.get(hashedKey);
  if (entry && now <= entry.resetAt && entry.count >= JOIN_CLASS_MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  if (!entry || now > entry.resetAt) {
    joinClassAttemptCounts.set(hashedKey, { count: 1, resetAt: now + JOIN_CLASS_WINDOW_MS });
    return { allowed: true, remaining: JOIN_CLASS_MAX_ATTEMPTS - 1 };
  }
  entry.count += 1;
  return { allowed: true, remaining: Math.max(0, JOIN_CLASS_MAX_ATTEMPTS - entry.count) };
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

/**
 * Resolves the client IP solely through Express's trusted proxy resolution (`req.ip`)
 * or the direct socket address (`req.socket.remoteAddress`).
 * NEVER reads raw `req.headers['x-forwarded-for']` directly when `req.ip` is absent,
 * preventing attackers from spoofing `X-Forwarded-For` headers to bypass IP rate limits.
 */
export function resolveClientIp(req: Request): string {
  const expressIp = typeof req.ip === 'string' ? req.ip.trim() : '';
  if (expressIp) {
    return expressIp;
  }
  const socketIp =
    req.socket && typeof req.socket.remoteAddress === 'string'
      ? req.socket.remoteAddress.trim()
      : '';
  return socketIp || 'local';
}

export async function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientIp = resolveClientIp(req);
  const sharedRate = await checkSharedRateLimit({
    scope: 'api_general',
    key: clientIp,
    maxRequests: RATE_LIMIT_SCOPES.api_general.maxRequests,
    windowMs: RATE_LIMIT_SCOPES.api_general.windowMs,
  });

  if (!sharedRate.allowed) {
    res.status(sharedRate.httpStatus || 429).json({
      error: sharedRate.error || 'Too many requests. Please try again in a minute.',
      fallback: true,
    });
    return;
  }

  next();
}

// ============================================================================
// 2. FIREBASE ID TOKEN, APP CHECK & TEACHER ALLOWLIST VERIFICATION
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
  // Check token revocation (`checkRevoked = true`) to reject revoked sessions or disabled users immediately
  const decoded = await getAdminAuth(firebaseAdminApp).verifyIdToken(idToken, true);
  return {
    uid: decoded.uid,
    email: decoded.email,
    // Strictly require boolean true; never treat undefined/missing email_verified as verified
    emailVerified: decoded.email_verified === true,
    name: typeof decoded.name === 'string' ? decoded.name : undefined,
    role: typeof (decoded as any).role === 'string' ? (decoded as any).role : undefined,
    signInProvider: decoded.firebase?.sign_in_provider,
  };
}

export function isValidRecaptchaSiteKey(rawKey?: string): boolean {
  const key = (rawKey || '').trim();
  return (
    key.length >= 20 &&
    key.toLowerCase() !== 'disabled' &&
    key.toLowerCase() !== 'false' &&
    key.toLowerCase() !== 'none'
  );
}

export function shouldEnforceAppCheck(): boolean {
  const raw = process.env.ENFORCE_APP_CHECK?.trim().toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Fail-closed in production: App Check is always enforced by default unless explicitly overridden with ENFORCE_APP_CHECK=false
    if (raw === 'false') {
      console.warn(
        '[SECURITY WARNING] Firebase App Check enforcement is explicitly DISABLED in production (ENFORCE_APP_CHECK=false). All /api/* endpoints are running without App Check verification.'
      );
      return false;
    }
    return true;
  }

  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return false;
}

export function getAppCheckConfigurationStatus(): {
  enforced: boolean;
  hasValidSiteKey: boolean;
  misconfiguredInProduction: boolean;
} {
  const enforced = shouldEnforceAppCheck();
  const hasValidSiteKey = isValidRecaptchaSiteKey(process.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY);
  const misconfiguredInProduction =
    process.env.NODE_ENV === 'production' && enforced && !hasValidSiteKey;
  return {
    enforced,
    hasValidSiteKey,
    misconfiguredInProduction,
  };
}

let hasLoggedMissingSiteKeyWarning = false;

export function logProductionAppCheckReadinessWarning(): void {
  const status = getAppCheckConfigurationStatus();
  if (status.misconfiguredInProduction && !hasLoggedMissingSiteKeyWarning) {
    hasLoggedMissingSiteKeyWarning = true;
    console.warn(
      '[SECURITY CONFIG WARNING] NODE_ENV=production enforces Firebase App Check (fail-closed), but VITE_RECAPTCHA_ENTERPRISE_SITE_KEY is empty or invalid. Client requests without X-Firebase-AppCheck will be rejected with HTTP 401. Set a valid VITE_RECAPTCHA_ENTERPRISE_SITE_KEY at build/runtime, or explicitly set ENFORCE_APP_CHECK=false if reCAPTCHA Enterprise is not yet provisioned.'
    );
  }
}

export async function verifyRequestAppCheck(req: Request): Promise<boolean> {
  const token = String(req.headers['x-firebase-appcheck'] || '').trim();
  const enforce = shouldEnforceAppCheck();

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
    logProductionAppCheckReadinessWarning();
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
  const raw = process.env.TEACHER_EMAIL_ALLOWLIST?.trim() || '';
  if (!raw) {
    return [];
  }
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

/**
 * Verifies teacher privileges on the server by checking BOTH:
 * 1. Verified email (`emailVerified === true`) AND email currently present in `TEACHER_EMAIL_ALLOWLIST`
 *    (so removing a teacher from `TEACHER_EMAIL_ALLOWLIST` blocks access immediately).
 * 2. Custom claim `user.role === 'teacher'` (or active `/teachers/{uid}` document with `role === 'teacher'`).
 */
export async function isTeacherUserAuthorized(user: VerifiedFirebaseUser): Promise<boolean> {
  if (!user?.uid) return false;
  if (user.emailVerified !== true || !isEmailInTeacherAllowlist(user.email)) {
    return false;
  }
  if (user.role === 'teacher') {
    return true;
  }
  try {
    const teacherDoc = await getActiveServerStore().getDoc(`teachers/${user.uid}`);
    if (teacherDoc && teacherDoc.role === 'teacher') {
      return true;
    }
  } catch {
    // Deny if Firestore lookup fails
  }
  return false;
}

/**
 * P0: Production ALWAYS enforces shared Firestore AI quota (fail-closed).
 * Setting `STRICT_FIRESTORE_AI_QUOTA=false` is ignored in `NODE_ENV === 'production'`
 * so an accidental env var can never re-enable silent in-memory fallback in production.
 * In-memory fallback is permitted ONLY in development/test when `STRICT_FIRESTORE_AI_QUOTA !== 'true'`.
 */
export function isStrictFirestoreAiQuotaEnabled(): boolean {
  const raw = process.env.STRICT_FIRESTORE_AI_QUOTA?.trim().toLowerCase();
  if (process.env.NODE_ENV === 'production') {
    if (raw === 'false') {
      console.warn(
        '[SECURITY WARNING] STRICT_FIRESTORE_AI_QUOTA=false is ignored in NODE_ENV=production. Production always enforces shared Firestore AI quota (fail-closed).'
      );
    }
    return true;
  }
  if (raw === 'true') return true;
  return false;
}

export function isStrictSharedRateLimitEnabled(): boolean {
  const raw = process.env.STRICT_SHARED_RATE_LIMIT?.trim().toLowerCase();
  if (process.env.NODE_ENV === 'production') {
    if (raw === 'false') {
      console.warn(
        '[SECURITY WARNING] STRICT_SHARED_RATE_LIMIT=false is ignored in NODE_ENV=production. Production always enforces shared Firestore rate limits (fail-closed).'
      );
    }
    return true;
  }
  if (raw === 'true') return true;
  return false;
}

export async function checkSharedRateLimit(params: {
  scope: string;
  key: string;
  maxRequests: number;
  windowMs: number;
  nowMs?: number;
  memoryCheck?: () => { allowed: boolean };
}): Promise<{
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: number;
  httpStatus?: number;
  error?: string;
  reason?: 'rate_limit_exceeded' | 'rate_store_unavailable';
}> {
  const { scope, key, maxRequests, windowMs, nowMs = Date.now(), memoryCheck } = params;
  const bucketId = buildPrivacySafeRateLimitBucketId(scope, key);
  const activeServerStore = getActiveServerStore();
  const strictMode = isStrictSharedRateLimitEnabled();

  if (typeof activeServerStore.incrementRateLimitTransaction === 'function') {
    try {
      const sharedResult = await activeServerStore.incrementRateLimitTransaction(
        bucketId,
        maxRequests,
        windowMs,
        nowMs
      );
      return {
        allowed: sharedResult.allowed,
        count: sharedResult.count,
        remaining: Math.max(0, maxRequests - sharedResult.count),
        resetAt: sharedResult.resetAt,
        httpStatus: sharedResult.allowed ? 200 : 429,
        reason: sharedResult.allowed ? undefined : 'rate_limit_exceeded',
      };
    } catch (err) {
      if (strictMode) {
        console.error('[server] Shared rate limit transaction failed in strict mode:', err);
        return {
          allowed: false,
          count: maxRequests + 1,
          remaining: 0,
          resetAt: nowMs + windowMs,
          httpStatus: 503,
          reason: 'rate_store_unavailable',
          error: 'Hệ thống kiểm soát lưu lượng tạm thời gián đoạn. Vui lòng thử lại sau.',
        };
      }
    }
  } else if (strictMode) {
    console.error('[server] Shared rate limit transaction unavailable in strict mode.');
    return {
      allowed: false,
      count: maxRequests + 1,
      remaining: 0,
      resetAt: nowMs + windowMs,
      httpStatus: 503,
      reason: 'rate_store_unavailable',
      error: 'Hệ thống kiểm soát lưu lượng tạm thời gián đoạn. Vui lòng thử lại sau.',
    };
  }

  // Development/test only fallback
  if (memoryCheck) {
    const localResult = memoryCheck();
    return {
      allowed: localResult.allowed,
      count: localResult.allowed ? 1 : maxRequests + 1,
      remaining: localResult.allowed ? Math.max(0, maxRequests - 1) : 0,
      resetAt: nowMs + windowMs,
      httpStatus: localResult.allowed ? 200 : 429,
    };
  }

  const memBucket = checkBoundedInMemoryBucket(bucketId, maxRequests, windowMs, nowMs);
  return {
    ...memBucket,
    httpStatus: memBucket.allowed ? 200 : 429,
  };
}

export function checkAndIncrementAiUidQuota(
  uid: string,
  now = Date.now(),
  customDailyLimit?: number
): {
  allowed: boolean;
  reason?: 'minute_limit' | 'daily_limit';
  dailyLimit: number;
  count: number;
  remaining: number;
} {
  const cleanUid = uid.trim() || 'unknown';
  const dailyLimit =
    typeof customDailyLimit === 'number' && customDailyLimit > 0
      ? Math.floor(customDailyLimit)
      : getAiDailyLimit();

  enforceMapMaxSize(aiUidMinuteCounts, now);
  enforceMapMaxSize(aiUidDailyCounts, now);

  // 1. Per-minute burst check per UID
  const minuteEntry = aiUidMinuteCounts.get(cleanUid);
  if (minuteEntry && now <= minuteEntry.resetAt && minuteEntry.count >= AI_RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      reason: 'minute_limit',
      dailyLimit,
      count: minuteEntry.count,
      remaining: 0,
    };
  }

  // 2. Per-day quota check per UID
  const dailyEntry = aiUidDailyCounts.get(cleanUid);
  if (dailyEntry && now <= dailyEntry.resetAt && dailyEntry.count >= dailyLimit) {
    return {
      allowed: false,
      reason: 'daily_limit',
      dailyLimit,
      count: dailyEntry.count,
      remaining: 0,
    };
  }

  if (!minuteEntry || now > minuteEntry.resetAt) {
    aiUidMinuteCounts.set(cleanUid, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    minuteEntry.count += 1;
  }

  let nextDailyCount = 1;
  if (!dailyEntry || now > dailyEntry.resetAt) {
    aiUidDailyCounts.set(cleanUid, { count: 1, resetAt: now + AI_DAILY_WINDOW_MS });
  } else {
    dailyEntry.count += 1;
    nextDailyCount = dailyEntry.count;
  }

  return {
    allowed: true,
    dailyLimit,
    count: nextDailyCount,
    remaining: Math.max(0, dailyLimit - nextDailyCount),
  };
}

export async function checkAndIncrementAiFirestoreQuota(
  uid: string,
  nowOrCustomLimit: Date | number = new Date(),
  explicitCustomLimit?: number
): Promise<{
  allowed: boolean;
  reason?: 'minute_limit' | 'daily_limit' | 'quota_store_unavailable';
  dailyLimit: number;
  count?: number;
  remaining?: number;
  httpStatus: number;
  degradedToMemory: boolean;
}> {
  const cleanUid = uid.trim();
  const now = nowOrCustomLimit instanceof Date ? nowOrCustomLimit : new Date();
  const customLimit =
    typeof nowOrCustomLimit === 'number' ? nowOrCustomLimit : explicitCustomLimit;
  const dailyLimit =
    typeof customLimit === 'number' && customLimit > 0
      ? Math.floor(customLimit)
      : getAiDailyLimit();
  const nowMs = now.getTime();
  const activeServerStore = getActiveServerStore();
  const strictQuota = isStrictFirestoreAiQuotaEnabled();

  if (
    typeof activeServerStore.incrementRateLimitTransaction !== 'function' ||
    typeof activeServerStore.incrementAiUsageTransaction !== 'function'
  ) {
    if (strictQuota) {
      return {
        allowed: false,
        reason: 'quota_store_unavailable',
        dailyLimit,
        remaining: 0,
        httpStatus: 503,
        degradedToMemory: false,
      };
    }
    const fallback = checkAndIncrementAiUidQuota(cleanUid, nowMs, dailyLimit);
    return {
      ...fallback,
      httpStatus: fallback.allowed ? 200 : 429,
      degradedToMemory: true,
    };
  }

  // 1. Multi-instance per-minute burst check via Firestore `rateLimits/ai_minute_{hmac(uid)}`
  try {
    const minuteBucketId = buildPrivacySafeRateLimitBucketId('ai_minute', cleanUid);
    const minuteRate = await activeServerStore.incrementRateLimitTransaction(
      minuteBucketId,
      RATE_LIMIT_SCOPES.ai_minute.maxRequests,
      RATE_LIMIT_SCOPES.ai_minute.windowMs,
      nowMs
    );
    if (!minuteRate.allowed) {
      return {
        allowed: false,
        reason: 'minute_limit',
        dailyLimit,
        count: minuteRate.count,
        remaining: 0,
        httpStatus: 429,
        degradedToMemory: false,
      };
    }
  } catch (err) {
    if (strictQuota) {
      console.error('[server] Strict Firestore AI minute rate limit unavailable:', err);
      return {
        allowed: false,
        reason: 'quota_store_unavailable',
        dailyLimit,
        remaining: 0,
        httpStatus: 503,
        degradedToMemory: false,
      };
    }
    const fallback = checkAndIncrementAiUidQuota(cleanUid, nowMs, dailyLimit);
    return {
      ...fallback,
      httpStatus: fallback.allowed ? 200 : 429,
      degradedToMemory: true,
    };
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
      return {
        allowed: false,
        reason: 'daily_limit',
        dailyLimit,
        count: txRes.count,
        remaining: 0,
        httpStatus: 429,
        degradedToMemory: false,
      };
    }
    return {
      allowed: true,
      dailyLimit,
      count: txRes.count,
      remaining: Math.max(0, dailyLimit - txRes.count),
      httpStatus: 200,
      degradedToMemory: false,
    };
  } catch (err) {
    if (strictQuota) {
      console.error('[server] Strict Firestore AI quota store unavailable:', err);
      return {
        allowed: false,
        reason: 'quota_store_unavailable',
        dailyLimit,
        remaining: 0,
        httpStatus: 503,
        degradedToMemory: false,
      };
    }
    // Fallback to in-memory daily counter ONLY in local development/test
    const fallback = checkAndIncrementAiUidQuota(cleanUid, nowMs, dailyLimit);
    return {
      ...fallback,
      httpStatus: fallback.allowed ? 200 : 429,
      degradedToMemory: true,
    };
  }
}

export async function isUserAuthorizedForAi(
  user: VerifiedFirebaseUser,
  hintClassId?: string
): Promise<boolean> {
  // 1. Teacher authorization requires BOTH teacher claim/record AND active presence in TEACHER_EMAIL_ALLOWLIST
  if (await isTeacherUserAuthorized(user)) {
    return true;
  }

  // If the token carries a teacher role claim or matches a /teachers/{uid} record,
  // but failed isTeacherUserAuthorized (e.g., removed from TEACHER_EMAIL_ALLOWLIST), deny immediately.
  if (user.role === 'teacher') {
    return false;
  }

  const activeServerStore = getActiveServerStore();
  try {
    const teacherDoc = await activeServerStore.getDoc(`teachers/${user.uid}`);
    if (teacherDoc && teacherDoc.role === 'teacher') {
      return false;
    }

    // 2. Check /users/{uid} student enrollment profile
    const userDoc = await activeServerStore.getDoc(`users/${user.uid}`);
    if (
      userDoc &&
      Array.isArray(userDoc.enrolledClassIds) &&
      userDoc.enrolledClassIds.length > 0
    ) {
      return true;
    }

    // 3. If a specific classId was passed, check /classes/{classId}/students/{uid}
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

export async function authenticateBearerRequest(
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
  } catch (err: any) {
    const errCode = typeof err?.code === 'string' ? err.code : '';
    const errMsg = typeof err?.message === 'string' ? err.message : '';
    if (
      errCode === 'auth/id-token-revoked' ||
      errMsg.includes('auth/id-token-revoked') ||
      errMsg.includes('id-token-revoked')
    ) {
      res.status(401).json({
        error:
          'Unauthorized: Phiên đăng nhập Firebase đã bị thu hồi (auth/id-token-revoked). Vui lòng đăng nhập lại.',
        code: 'auth/id-token-revoked',
        fallback: true,
      });
      return null;
    }
    if (
      errCode === 'auth/user-disabled' ||
      errMsg.includes('auth/user-disabled') ||
      errMsg.includes('user-disabled')
    ) {
      res.status(403).json({
        error: 'Forbidden: Tài khoản người dùng đã bị khóa (auth/user-disabled).',
        code: 'auth/user-disabled',
        fallback: true,
      });
      return null;
    }
    if (
      errCode === 'auth/id-token-expired' ||
      errMsg.includes('auth/id-token-expired') ||
      errMsg.includes('id-token-expired')
    ) {
      res.status(401).json({
        error: 'Unauthorized: Phiên đăng nhập đã hết hạn (auth/id-token-expired). Vui lòng làm mới phiên.',
        code: 'auth/id-token-expired',
        fallback: true,
      });
      return null;
    }
    res.status(401).json({
      error: 'Unauthorized: Invalid or expired Firebase ID Token.',
      fallback: true,
    });
    return null;
  }
}

export async function protectAiRoute(req: Request, res: Response, next: NextFunction) {
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
    if (quotaResult.reason === 'quota_store_unavailable') {
      res.status(503).json({
        error:
          'Hệ thống kiểm soát hạn mức AI tạm thời gián đoạn. Vui lòng thử lại sau ít phút.',
        fallback: true,
      });
      return;
    }
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
