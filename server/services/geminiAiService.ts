import { GoogleGenAI } from '@google/genai';

// ============================================================================
// GEMINI MODELS, SHARED CLIENT, FALLBACK & CACHE
// ============================================================================
// Gemini 2.5 is only served to projects that used it before, so a new API key
// would fail on it. Default to the current GA models and fall back down the list
// when a model is unavailable or overloaded. Override with env vars if needed:
//   GEMINI_CHAT_MODEL  — BinBin conversations (quality first)
//   GEMINI_FAST_MODEL  — word lookups & suggestions (speed first)
//   GEMINI_MODEL       — legacy single override, tried first for both
const DEFAULT_CHAT_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
];
const DEFAULT_FAST_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
];
// Per-call timeout and an overall budget across retries/fallbacks, kept under the
// browser's own timeout (GEMINI_API_TIMEOUT_MS in chineseEngine.ts).
const GEMINI_REQUEST_TIMEOUT_MS = 12_000;
const GEMINI_TOTAL_BUDGET_MS = 22_000;

export type GeminiTask = 'chat' | 'fast';

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
export function getGeminiClient(): GoogleGenAI | null {
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
export const enrichCache = new TtlCache<unknown>(500, AI_LOOKUP_CACHE_TTL_MS);
export const suggestCache = new TtlCache<unknown>(300, AI_LOOKUP_CACHE_TTL_MS);

/** Parse a model's JSON reply, tolerating an accidental ```json fence. */
export function parseModelJson<T>(raw: string | undefined, fallback: T): T {
  const text = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (!text) return fallback;
  const parsed = JSON.parse(text);
  return (parsed && typeof parsed === 'object' ? parsed : fallback) as T;
}

export const BINBIN_SYSTEM_INSTRUCTION =
  "Bạn là Gấu trúc Bin Bin (彬彬) — Trợ giảng & Gia sư Hán ngữ Thực dụng của nền tảng HANU × 阮文受 (Thầy Nguyễn Văn Thụ). Nguyên tắc bắt buộc: Trả lời trực diện, súc tích, thực dụng, KHÔNG rườm rà chào hỏi sáo rỗng, KHÔNG bao giờ ghép từ giả tạo kiểu '学习X' hay '常用X'. Luôn cung cấp: (1) Bản chất & Ngữ cảnh thực tế, (2) Collocations kết hợp từ chuẩn 100% người bản xứ, (3) Phân biệt từ dễ nhầm, (4) 2 câu ví dụ thực tế có Pinyin + Dịch nghĩa, hoặc Dịch song ngữ / Sửa câu sai / Soạn 5 câu bài tập HSK 3.0 theo đúng yêu cầu.";

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
    console.warn(
      `[gemini] model ${model} failed, trying next`,
      geminiErrorText(lastError).slice(0, 160)
    );
  }
  throw lastError ?? new Error('No Gemini model available');
}

export function classifyErrorStatus(err: unknown): number {
  const raw = err instanceof Error ? err.message.toLowerCase() : '';
  if (raw.includes('api key') || raw.includes('unauthorized') || raw.includes('401')) {
    return 401;
  }
  if (raw.includes('quota') || raw.includes('rate') || raw.includes('429')) {
    return 429;
  }
  return 500;
}
