import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR =
  path.basename(__dirname) === 'dist-server'
    ? path.resolve(__dirname, '..')
    : __dirname;

// Load Firebase project ID from environment or firebase-applet-config.json
let defaultFirebaseProjectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  '';

if (!defaultFirebaseProjectId) {
  try {
    const configPath = path.resolve(ROOT_DIR, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (parsed?.projectId) {
        defaultFirebaseProjectId = String(parsed.projectId);
      }
    }
  } catch {
    // ignore
  }
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

export const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

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

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const BINBIN_SYSTEM_INSTRUCTION =
  "Bạn là Gấu trúc Bin Bin (彬彬) — Trợ giảng & Gia sư Hán ngữ Thực dụng của nền tảng HANU × 阮文受 (Thầy Nguyễn Văn Thụ). Nguyên tắc bắt buộc: Trả lời trực diện, súc tích, thực dụng, KHÔNG rườm rà chào hỏi sáo rỗng, KHÔNG bao giờ ghép từ giả tạo kiểu '学习X' hay '常用X'. Luôn cung cấp: (1) Bản chất & Ngữ cảnh thực tế, (2) Collocations kết hợp từ chuẩn 100% người bản xứ, (3) Phân biệt từ dễ nhầm, (4) 2 câu ví dụ thực tế có Pinyin + Dịch nghĩa, hoặc Dịch song ngữ / Sửa câu sai / Soạn 5 câu bài tập HSK 3.0 theo đúng yêu cầu.";

// ============================================================================
// 1. RATE LIMITING BY UID & PERIODIC MEMORY CLEANUP
// ============================================================================
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 90;
const AI_RATE_LIMIT_MAX_REQUESTS = 30;
const AI_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 10 * 60_000; // 10 minutes

const clientRequestCounts = new Map<string, { count: number; resetAt: number }>();
const aiUidMinuteCounts = new Map<string, { count: number; resetAt: number }>();
const aiUidDailyCounts = new Map<string, { count: number; resetAt: number }>();

export function getAiDailyLimit(): number {
  const configured = Number(process.env.AI_DAILY_LIMIT);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 200;
}

export function resetAllRateLimitersForTest(): void {
  clientRequestCounts.clear();
  aiUidMinuteCounts.clear();
  aiUidDailyCounts.clear();
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
// 2. FIREBASE ID TOKEN VERIFICATION & UID QUOTA PROTECTION FOR GEMINI AI ROUTES
// ============================================================================
export type FirebaseTokenVerifier = (idToken: string) => Promise<{ uid: string; email?: string }>;

let customTokenVerifierForTest: FirebaseTokenVerifier | null = null;

export function setFirebaseTokenVerifierForTest(verifier: FirebaseTokenVerifier | null): void {
  customTokenVerifierForTest = verifier;
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
): Promise<{ uid: string; email?: string }> {
  if (customTokenVerifierForTest) {
    return await customTokenVerifierForTest(idToken);
  }
  const decoded = await getAdminAuth(firebaseAdminApp).verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email,
  };
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

  // Require Authorization: Bearer <Firebase ID Token>
  const bearerToken = extractBearerToken(
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined
  );
  if (!bearerToken) {
    res.status(401).json({
      error: 'Unauthorized: Missing Firebase ID Token in Authorization Bearer header.',
      fallback: true,
    });
    return;
  }

  let verifiedUser: { uid: string; email?: string };
  try {
    verifiedUser = await verifyFirebaseIdToken(bearerToken);
    if (!verifiedUser || !verifiedUser.uid) {
      throw new Error('Missing uid in verified token');
    }
  } catch {
    res.status(401).json({
      error: 'Unauthorized: Invalid or expired Firebase ID Token.',
      fallback: true,
    });
    return;
  }

  // Rate-limit by verified Firebase UID (minute burst + AI_DAILY_LIMIT)
  const quotaResult = checkAndIncrementAiUidQuota(verifiedUser.uid);
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

  (req as Request & { firebaseUser?: { uid: string; email?: string } }).firebaseUser = verifiedUser;
  next();
}

async function callGeminiModel(
  ai: GoogleGenAI,
  params: Omit<Parameters<typeof ai.models.generateContent>[0], 'model'>
) {
  return await ai.models.generateContent({
    ...params,
    model: GEMINI_MODEL,
  });
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
    const hanzi = String(req.body?.hanzi || '').trim();
    if (!hanzi || hanzi.length > 40) {
      res.status(400).json({ error: 'Invalid or missing hanzi parameter (max 40 characters).' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(401).json({ fallback: true, error: 'Gemini API key is not configured.' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await callGeminiModel(ai, {
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

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    res.status(200).json(parsed);
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
    const query = String(req.body?.query || '').trim();
    const limit = Math.min(8, Math.max(2, Number(req.body?.limit) || 6));
    if (!query || query.length > 120) {
      res.status(400).json({ error: 'Invalid or missing query parameter (max 120 characters).' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(401).json({ fallback: true, error: 'Gemini API key is not configured.' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await callGeminiModel(ai, {
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

    const text = response.text?.trim() || '{"suggestions":[]}';
    const parsed = JSON.parse(text);
    res.status(200).json(parsed);
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
    const prompt = String(req.body?.prompt || '').trim();
    const actionType = String(req.body?.actionType || 'chat').trim();
    const contextSlide = req.body?.contextSlide || null;
    const contextQuiz = req.body?.contextQuiz || null;

    if (!prompt || prompt.length > 1500) {
      res.status(400).json({ error: 'Invalid or missing prompt (max 1500 characters).' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(401).json({ fallback: true, error: 'Gemini API key is not configured.' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

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

    const response = await callGeminiModel(ai, {
      contents: `${contextSummary ? `[Ngữ cảnh bài giảng hiện tại]\n${contextSummary}\n\n` : ''}[Chế độ: ${actionType}]\nYêu cầu của Giáo viên / Học viên: ${prompt}

Hãy giải đáp trực diện, thực dụng theo chuẩn HSK 3.0 dưới dạng JSON:
- replyText: Giải thích ngắn gọn, đi thẳng vào trọng tâm bằng gạch đầu dòng rõ ràng (tuyệt đối không chào hỏi dài dòng, không ghép từ máy móc kiểu "学习X" hay "常用X"). Nếu người dùng nhập câu sai, hãy chỉ rõ lỗi sai và cách sửa tự nhiên. Nếu giáo viên yêu cầu tạo bài tập/hội thoại, hãy trình bày rõ từng câu.
- essenceAndContext: 1-2 câu tóm tắt bản chất từ loại và ngữ cảnh dùng thực tế của từ/cấu trúc.
- collocations: mảng 3 cụm từ kết hợp chuẩn 100% người bản xứ (ví dụ với 初中: 上初中, 初中生, 初中毕业), mỗi phần tử gồm { hanzi, pinyin, meaning }.
- synonymDistinction: so sánh nhanh với 1-2 từ dễ nhầm (ví dụ 初中 vs 高中, 温暖 vs 暖和), gồm { title, summary, items: [{ word, pinyin, nuance, example }] }.
- examples: mảng 2 câu ví dụ thực tế tự nhiên, mỗi phần tử gồm { hanzi, pinyin, meaning }.
- chinesePhrase: câu tiếng Trung tiêu biểu số 1.
- pinyinPhrase: phiên âm Pinyin có dấu của chinesePhrase.
- vietnamesePhrase: nghĩa tiếng Việt của chinesePhrase.
- targetWord: thông tin từ vựng trọng tâm để có thể thêm ngay vào Slide bài giảng { hanzi, pinyin, hanViet, meaning, partOfSpeech, hskLevel }.`,
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

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    res.status(200).json(parsed);
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`HANU × 阮文受 server listening on http://0.0.0.0:${port}`);
  });
}

if (
  process.argv[1] &&
  (path.resolve(process.argv[1]) === __filename ||
    path.basename(process.argv[1]) === 'server.ts' ||
    path.basename(process.argv[1]) === 'server.js')
) {
  startServer();
}
