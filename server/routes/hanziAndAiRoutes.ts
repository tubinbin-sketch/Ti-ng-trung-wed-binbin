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
  getGeminiClient,
  parseModelJson,
  sanitizeAiUserInput,
  suggestCache,
} from '../services/geminiAiService';
import { protectAiRoute } from '../middleware/authAndRateLimitMiddleware';

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
}
