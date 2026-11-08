import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { Type } from '@google/genai';
import { ROOT_DIR } from '../services/storeAndGradingService';
import {
  BINBIN_SYSTEM_INSTRUCTION,
  callGeminiModel,
  classifyErrorStatus,
  enrichCache,
  getGeminiCallOverrideForTesting,
  getGeminiClient,
  parseModelJson,
  sanitizeAiOutputObject,
  sanitizeAiUserInput,
  suggestCache,
  validateAndSanitizeBinBinChatPayload,
} from '../services/geminiAiService';
import { protectAiRoute } from '../middleware/authAndRateLimitMiddleware';

const SINGLE_HAN_CHAR_REGEX = /^\p{Script=Han}$/u;

export function registerHanziStaticAndHealthRoutes(app: Express): void {
  // Liveness probe for Cloud Run / uptime monitors (no auth, no rate limit).
  app.get('/healthz', (_req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json({ ok: true, uptimeSeconds: Math.round(process.uptime()) });
  });

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
    if (
      !rawChar ||
      Array.from(rawChar).length !== 1 ||
      !SINGLE_HAN_CHAR_REGEX.test(rawChar)
    ) {
      res.status(400).json({ error: 'Invalid single Chinese character parameter.' });
      return;
    }
    const charFile = path.resolve(HANZI_DATA_DIR, `${rawChar}.json`);
    if (!charFile.startsWith(HANZI_DATA_DIR + path.sep) || !fs.existsSync(charFile)) {
      res.status(404).json({ error: 'Character stroke data not found in local package.' });
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.sendFile(charFile);
  });
}

export function registerAiRoutes(app: Express): void {
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
      const hasTestOverride = Boolean(getGeminiCallOverrideForTesting());
      if (!ai && !hasTestOverride) {
        res.status(401).json({ fallback: true, error: 'Gemini API key is not configured.' });
        return;
      }

      const { response, model } = await callGeminiModel(ai as any, 'fast', {
        contents: `Hãy phân tích từ/chữ tiếng Trung <untrusted_user_query>${hanzi}</untrusted_user_query> dành cho học viên Việt Nam học HSK.
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

      const parsed = sanitizeAiOutputObject(
        parseModelJson<Record<string, unknown>>(response.text, {})
      );
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
      const hasTestOverride = Boolean(getGeminiCallOverrideForTesting());
      if (!ai && !hasTestOverride) {
        res.status(401).json({ fallback: true, error: 'Gemini API key is not configured.' });
        return;
      }

      const { response, model } = await callGeminiModel(ai as any, 'fast', {
        contents: `Giáo viên tiếng Trung đang tìm kiếm từ vựng với từ khóa/chủ đề: <untrusted_user_query>${query}</untrusted_user_query>.
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

      const parsed = sanitizeAiOutputObject(
        parseModelJson<{ suggestions?: unknown[] }>(response.text, { suggestions: [] })
      );
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

  // Server-side Gemini API route for Bin Bin (彬彬) Practical Pedagogical Assistant (P1 Hardened)
  app.post('/api/binbin/chat', protectAiRoute, async (req, res) => {
    try {
      const validated = validateAndSanitizeBinBinChatPayload(req.body);
      if (!validated.ok) {
        res.status(validated.status).json({ error: validated.error });
        return;
      }

      const { history, structuredTurnText } = validated.data;

      const ai = getGeminiClient();
      const hasTestOverride = Boolean(getGeminiCallOverrideForTesting());
      if (!ai && !hasTestOverride) {
        res.status(401).json({ fallback: true, error: 'Gemini API key is not configured.' });
        return;
      }

      const { response, model } = await callGeminiModel(ai as any, 'chat', {
        // Earlier turns give the conversation memory; JSON instructions only on the latest turn.
        contents: [...history, { role: 'user', parts: [{ text: structuredTurnText }] }],
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

      const parsed = sanitizeAiOutputObject(
        parseModelJson<Record<string, unknown>>(response.text, {})
      );
      if (!parsed.replyText || typeof parsed.replyText !== 'string') {
        res.status(502).json({ fallback: true, error: 'AI returned an empty reply.' });
        return;
      }
      res.set('X-AI-Model', model).status(200).json(parsed);
    } catch (err) {
      const status = classifyErrorStatus(err);
      res.status(status).json({
        fallback: true,
        error:
          status === 504
            ? 'AI assistant timed out while processing the request.'
            : status === 502
            ? 'AI returned an invalid JSON response.'
            : 'Unable to process assistant request at this time.',
      });
    }
  });
}

