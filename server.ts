import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const BINBIN_SYSTEM_INSTRUCTION =
  "Bạn là Gấu trúc Bin Bin (彬彬) — Trợ giảng & Gia sư Hán ngữ Thực dụng (Practical AI Copilot) của nền tảng HANU × 阮文受 (Thầy Nguyễn Văn Thụ). Nguyên tắc bắt buộc: Trả lời trực diện, súc tích, thực dụng như ChatGPT/Gemini, KHÔNG rườm rà chào hỏi sáo rỗng, KHÔNG bao giờ ghép từ giả tạo kiểu '学习X' hay '常用X'. Luôn cung cấp: (1) Bản chất & Ngữ cảnh thực tế, (2) Collocations kết hợp từ chuẩn 100% người bản xứ, (3) Phân biệt từ dễ nhầm, (4) 2 câu ví dụ thực tế có Pinyin + Dịch nghĩa, hoặc Dịch song ngữ / Sửa câu sai / Soạn 5 câu bài tập HSK 3.0 theo đúng yêu cầu.";

async function callGeminiWithModelFallback(
  ai: GoogleGenAI,
  params: Omit<Parameters<typeof ai.models.generateContent>[0], 'model'>
) {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: unknown = null;
  for (const modelName of modelsToTry) {
    try {
      return await ai.models.generateContent({
        ...params,
        model: modelName,
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// Server-side Gemini API route for enriching arbitrary Chinese vocabulary (Bin Bin AI Slide Generator)
app.post('/api/hanzi/enrich', async (req, res) => {
  try {
    const hanzi = String(req.body?.hanzi || '').trim();
    if (!hanzi) {
      res.status(400).json({ error: 'Missing hanzi parameter' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(200).json({ fallback: true });
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

    const response = await callGeminiWithModelFallback(ai, {
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
    res.json(parsed);
  } catch (err) {
    res.status(200).json({
      fallback: true,
      error: err instanceof Error ? err.message : 'Gemini lookup fallback',
    });
  }
});

// Server-side Gemini API route for Instant AI Vocabulary Search Suggestions (/api/hanzi/suggest)
app.post('/api/hanzi/suggest', async (req, res) => {
  try {
    const query = String(req.body?.query || '').trim();
    const limit = Math.min(8, Math.max(2, Number(req.body?.limit) || 6));
    if (!query) {
      res.status(400).json({ error: 'Missing query parameter' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(200).json({ fallback: true });
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

    const response = await callGeminiWithModelFallback(ai, {
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
    res.json(parsed);
  } catch (err) {
    res.status(200).json({
      fallback: true,
      error: err instanceof Error ? err.message : 'AI vocab suggest fallback',
    });
  }
});

// Server-side Gemini API route for Bin Bin (彬彬) Practical AI Copilot
app.post('/api/binbin/chat', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    const actionType = String(req.body?.actionType || 'chat').trim();
    const contextSlide = req.body?.contextSlide || null;
    const contextQuiz = req.body?.contextQuiz || null;

    if (!prompt) {
      res.status(400).json({ error: 'Missing prompt' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(200).json({ fallback: true });
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

    const response = await callGeminiWithModelFallback(ai, {
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
    res.json(parsed);
  } catch (err) {
    res.status(200).json({
      fallback: true,
      error: err instanceof Error ? err.message : 'Bin Bin AI fallback',
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
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`HANU × 阮文受 server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
