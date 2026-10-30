import { VocabSlide } from '../data/chineseData';
import {
  EssayQ,
  MultipleChoiceQ,
  SentenceOrderingQ,
  UploadedAssignmentPackage,
} from './assignmentParser';
import { getHsk3VocabStandard } from './hsk3Engine';

export interface ToneSandhiAnalysis {
  hasSandhi: boolean;
  ruleBadge: string;
  ruleTitle: string;
  originalPinyin: string;
  spokenPinyin: string;
  explanationVi: string;
  exampleHint: string;
}

const THIRD_TONE_CHARS = /[ǎǒěǐǔǚ]/;
const FOURTH_TONE_CHARS = /[àòèìùǜ]/;

function convertThirdToSecondTone(syllable: string): string {
  return syllable
    .replace('ǎ', 'á')
    .replace('ǒ', 'ó')
    .replace('ě', 'é')
    .replace('ǐ', 'í')
    .replace('ǔ', 'ú')
    .replace('ǚ', 'ǘ');
}

/**
 * Analyzes Tone Sandhi (Biến điệu thanh điệu - 变调规则) for a Chinese word and its example sentence.
 */
export function analyzeToneSandhi(
  hanzi: string,
  pinyin: string,
  exampleHanzi = '',
  examplePinyin = ''
): ToneSandhiAnalysis {
  const cleanHanzi = (hanzi || '').trim();
  const cleanPinyin = (pinyin || '').trim();
  const syllables = cleanPinyin.split(/\s+/).filter(Boolean);

  // 1. Check 3rd tone + 3rd tone -> 2nd tone + 3rd tone (3 + 3 -> 2 + 3)
  if (syllables.length >= 2) {
    for (let i = 0; i < syllables.length - 1; i++) {
      if (THIRD_TONE_CHARS.test(syllables[i]) && THIRD_TONE_CHARS.test(syllables[i + 1])) {
        const spokenSyllables = [...syllables];
        spokenSyllables[i] = convertThirdToSecondTone(syllables[i]);
        return {
          hasSandhi: true,
          ruleBadge: 'Biến điệu 3 + 3 → 2 + 3',
          ruleTitle: 'Quy tắc hai thanh 3 đi liền (三声变调)',
          originalPinyin: cleanPinyin,
          spokenPinyin: spokenSyllables.join(' '),
          explanationVi: `Hai âm tiết mang thanh 3 đi liền nhau: âm tiết thứ nhất “${syllables[i]}” biến điệu đọc thành thanh 2 “${spokenSyllables[i]}” (${cleanPinyin} → ${spokenSyllables.join(' ')}).`,
          exampleHint: 'Ví dụ chuẩn: 你好 (nǐ hǎo → ní hǎo) · 可以 (kě yǐ → ké yǐ)',
        };
      }
    }
  }

  // 2. Check "一 (yī)" or "不 (bù)" tone sandhi ONLY when the vocabulary word itself contains 一 or 不
  if (cleanHanzi.includes('一')) {
    const hasFourthAfterYi =
      FOURTH_TONE_CHARS.test(cleanPinyin) || /y[īíì]\s+[a-z]*[àòèìùǜ]/i.test(examplePinyin);
    return {
      hasSandhi: true,
      ruleBadge: 'Biến điệu chữ “一 (yī)”',
      ruleTitle: 'Quy tắc biến điệu của “一” trong từ vựng',
      originalPinyin: cleanPinyin,
      spokenPinyin: hasFourthAfterYi
        ? `${cleanPinyin} (一 đọc thành yí trước thanh 4)`
        : `${cleanPinyin} (一 đọc thành yì trước thanh 1, 2, 3)`,
      explanationVi:
        'Chữ “一 (yī)” khi đứng trước âm tiết thanh 4 sẽ biến điệu thành thanh 2 (yí, ví dụ: 一个 yí gè, 一定 yí dìng); khi đứng trước thanh 1, 2, 3 sẽ biến điệu thành thanh 4 (yì, ví dụ: 一起 yì qǐ, 一杯 yì bēi).',
      exampleHint: 'Ứng dụng trực tiếp khi đọc từ vựng chứa “一” trên lớp.',
    };
  }

  if (cleanHanzi.includes('不')) {
    return {
      hasSandhi: true,
      ruleBadge: 'Biến điệu chữ “不 (bù)”',
      ruleTitle: 'Quy tắc biến điệu của “不” trước thanh 4',
      originalPinyin: cleanPinyin,
      spokenPinyin: `${cleanPinyin} (不 + thanh 4 → bú)`,
      explanationVi:
        'Chữ “不 (bù)” khi đứng trước âm tiết mang thanh 4 sẽ biến điệu đọc thành thanh 2 “bú” (ví dụ: 不是 bú shì, 不对 bú duì).',
      exampleHint: 'Giúp giọng đọc tự nhiên, mượt mà chuẩn Bắc Kinh (zh-CN).',
    };
  }

  // 3. Check Neutral Tone (Thanh nhẹ - 轻声) when a syllable has no tone mark
  if (syllables.length >= 2) {
    const lastSyl = syllables[syllables.length - 1];
    const hasToneMark = /[āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]/.test(lastSyl);
    if (!hasToneMark) {
      return {
        hasSandhi: true,
        ruleBadge: 'Quy tắc Thanh nhẹ (轻声)',
        ruleTitle: 'Âm tiết sau đọc lướt nhẹ & ngắn (轻声规则)',
        originalPinyin: cleanPinyin,
        spokenPinyin: `${syllables.slice(0, -1).join(' ')} · ${lastSyl} (thanh nhẹ)`,
        explanationVi: `Âm tiết “${lastSyl}” trong từ “${cleanHanzi}” mang thanh nhẹ (轻声): đọc ngắn, nhẹ và phụ thuộc vào độ cao của âm tiết đứng trước.`,
        exampleHint: 'Ví dụ chuẩn: 咱们 (zánmen) · 朋友 (péngyou) · 暖和 (nuǎnhuo)',
      };
    }
  }

  // 4. Check Half 3rd Tone (Nửa thanh 3 - 半三声) when 1st syllable is 3rd tone or 2nd syllable is 3rd tone
  if (syllables.some((s) => THIRD_TONE_CHARS.test(s))) {
    return {
      hasSandhi: true,
      ruleBadge: 'Quy tắc Nửa thanh 3 (半三声)',
      ruleTitle: 'Biến điệu Nửa thanh 3 (211) & Giữ trọn thanh điệu',
      originalPinyin: cleanPinyin,
      spokenPinyin: `${cleanPinyin} (chú ý độ trầm thanh 3)`,
      explanationVi: `Từ “${cleanHanzi}” (${cleanPinyin}) có chứa thanh 3: Khi thanh 3 đứng trước thanh 1, 2, 4 thì chỉ đọc phần trầm xuống (211 - nửa thanh 3) không ngân cao lên; khi đứng cuối câu đọc đủ độ trầm rồi ngân nhẹ (214).`,
      exampleHint: 'Lưu ý: Kết hợp với từ thanh 3 khác (ví dụ 很温暖 hěn wēnnuǎn) cần chú ý nhịp ngắt.',
    };
  }

  // Default standard tone contour guidance
  return {
    hasSandhi: false,
    ruleBadge: 'Chuẩn thanh điệu HSK 3.0',
    ruleTitle: 'Giữ chuẩn cao độ 4 thanh điệu phổ thông (四声标准)',
    originalPinyin: cleanPinyin,
    spokenPinyin: cleanPinyin,
    explanationVi: `Từ “${cleanHanzi}” (${cleanPinyin}) giữ nguyên thanh điệu gốc khi phát âm độc lập. Chú ý phát âm rõ bật hơi và giữ đúng trường độ âm tiết.`,
    exampleHint: 'Kết hợp luyện đọc to cả câu ví dụ để rèn ngữ điệu tự nhiên.',
  };
}

export type SrsRating = 'again' | 'hard' | 'good';

export interface SrsWordRecord {
  slideId: string;
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaning: string;
  hskLevel: string;
  rating: SrsRating;
  intervalLabel: string;
  reviewCount: number;
  inMistakeBook: boolean;
  updatedAt: string;
}

export const STORAGE_KEY_SRS_MISTAKE_BOOK = 'hanu_student_srs_mistake_book_v2';

export function getInitialSrsRecords(slides: VocabSlide[]): Record<string, SrsWordRecord> {
  // Seed 2 difficult words into "Sổ tay từ hay quên (错题本)" by default so student immediately sees active SRS state
  const defaults: Record<string, SrsWordRecord> = {};
  const seedHanzis = ['温暖', '融会贯通', '坚持'];
  slides.forEach((s) => {
    if (seedHanzis.includes(s.hanzi)) {
      defaults[s.id] = {
        slideId: s.id,
        hanzi: s.hanzi,
        pinyin: s.pinyin,
        hanViet: s.hanViet,
        meaning: s.meaning,
        hskLevel: s.hskLevel,
        rating: s.hanzi === '融会贯通' ? 'again' : 'hard',
        intervalLabel: s.hanzi === '融会贯通' ? 'Ôn lại ngay (1 phút)' : 'Cần củng cố (10 phút)',
        reviewCount: 1,
        inMistakeBook: true,
        updatedAt: 'Hôm nay',
      };
    }
  });
  return defaults;
}

export function loadStoredSrsRecords(slides: VocabSlide[]): Record<string, SrsWordRecord> {
  if (typeof window === 'undefined') return getInitialSrsRecords(slides);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SRS_MISTAKE_BOOK);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return getInitialSrsRecords(slides);
}

export function saveStoredSrsRecords(records: Record<string, SrsWordRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SRS_MISTAKE_BOOK, JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

export function applySrsRatingToRecords(
  currentRecords: Record<string, SrsWordRecord>,
  slide: VocabSlide,
  rating: SrsRating
): Record<string, SrsWordRecord> {
  const existing = currentRecords[slide.id];
  const prevCount = existing?.reviewCount || 0;

  const intervalLabel =
    rating === 'again'
      ? 'Ôn lại ngay (1 phút)'
      : rating === 'hard'
      ? 'Cần củng cố (10 phút)'
      : 'Đã thuộc lòng (4 ngày)';

  const inMistakeBook = rating === 'again' || rating === 'hard';

  const nextRecord: SrsWordRecord = {
    slideId: slide.id,
    hanzi: slide.hanzi,
    pinyin: slide.pinyin,
    hanViet: slide.hanViet,
    meaning: slide.meaning,
    hskLevel: slide.hskLevel,
    rating,
    intervalLabel,
    reviewCount: prevCount + 1,
    inMistakeBook,
    updatedAt: 'Vừa xong',
  };

  return {
    ...currentRecords,
    [slide.id]: nextRecord,
  };
}

export function getMistakeNotebookList(
  records: Record<string, SrsWordRecord>
): SrsWordRecord[] {
  return Object.values(records).filter((r) => r.inMistakeBook);
}

/**
 * 1-Click Assignment Generator: Builds a synchronized 5-Skill HSK 3.0 homework package
 * directly from the teacher's selected Slide deck words.
 */
export function generateAssignmentFromSlides(
  selectedSlides: VocabSlide[],
  sessionNumber = 14
): UploadedAssignmentPackage {
  const pool =
    selectedSlides.length >= 3
      ? selectedSlides
      : selectedSlides.length > 0
      ? selectedSlides
      : [];

  const targetSlides = pool.slice(0, 6);

  const multipleChoiceList: MultipleChoiceQ[] = targetSlides.slice(0, 3).map((slide, idx) => {
    const meta = getHsk3VocabStandard(slide);
    const distractors = [
      { hanzi: '空调', pinyin: 'kōngtiáo', meaning: 'máy điều hòa' },
      { hanzi: '花园', pinyin: 'huāyuán', meaning: 'vườn hoa' },
      { hanzi: '洗衣机', pinyin: 'xǐyījī', meaning: 'máy giặt' },
      { hanzi: '初中', pinyin: 'chūzhōng', meaning: 'trung học cơ sở' },
      { hanzi: '咖啡', pinyin: 'kāfēi', meaning: 'cà phê' },
    ].filter((d) => d.hanzi !== slide.hanzi);

    const blankedSentence = slide.exampleHanzi.includes(slide.hanzi)
      ? slide.exampleHanzi.replace(slide.hanzi, '______')
      : `请 用 “______” (${slide.meaning}) 完成 这个 句子。`;

    const rawOptions = [
      {
        label: `${slide.hanzi} (${slide.pinyin} - ${slide.meaning})`,
        isCorrect: true,
      },
      {
        label: `${distractors[0].hanzi} (${distractors[0].pinyin} - ${distractors[0].meaning})`,
        isCorrect: false,
      },
      {
        label: `${distractors[1].hanzi} (${distractors[1].pinyin} - ${distractors[1].meaning})`,
        isCorrect: false,
      },
      {
        label: `${distractors[2].hanzi} (${distractors[2].pinyin} - ${distractors[2].meaning})`,
        isCorrect: false,
      },
    ];

    // Rotate correct answer position deterministically based on idx
    const rotated = [
      rawOptions[(0 + idx) % 4],
      rawOptions[(1 + idx) % 4],
      rawOptions[(2 + idx) % 4],
      rawOptions[(3 + idx) % 4],
    ];
    const keys = ['A', 'B', 'C', 'D'];

    return {
      id: `slide-mc-${idx + 1}-${slide.id}`,
      type: 'fill-blank',
      targetWord: slide.hanzi,
      question: blankedSentence,
      pinyinSentence: slide.examplePinyin,
      options: rotated.map((o, kIdx) => ({
        key: keys[kIdx],
        label: o.label,
        isCorrect: o.isCorrect,
      })),
      explanation: `“${slide.hanzi}” (${slide.pinyin} · Hán Việt: ${slide.hanViet.toUpperCase()}) có nghĩa là “${slide.meaning}”. Câu hoàn chỉnh: ${slide.exampleHanzi} (${slide.exampleMeaning}).`,
      grammarTip: `Điểm ngữ pháp HSK 3.0: ${meta.grammarFormula}`,
    };
  });

  const sentenceOrderingList: SentenceOrderingQ[] = targetSlides.slice(0, 2).map((slide, idx) => {
    const meta = getHsk3VocabStandard(slide);
    const rawTokens = slide.exampleHanzi
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const correctTokens =
      rawTokens.length >= 3
        ? rawTokens
        : ['我们', '一起', '学习', slide.hanzi, '吧', '。'];

    // Deterministic shuffle that is different from original order
    const tokensShuffled = [...correctTokens].reverse();
    if (tokensShuffled.length > 2) {
      const first = tokensShuffled[0];
      tokensShuffled[0] = tokensShuffled[1];
      tokensShuffled[1] = first;
    }

    return {
      id: `slide-so-${idx + 1}-${slide.id}`,
      targetWord: slide.hanzi,
      vietnameseMeaning: slide.exampleMeaning,
      pinyin: slide.examplePinyin,
      correctTokens,
      tokensShuffled,
      explanation: `Cấu trúc câu chuẩn HSK 3.0 với “${slide.hanzi}”: ${meta.grammarFormula}.`,
      grammarTip: meta.synonymDistinction,
      modelSentence: correctTokens.join(' '),
    };
  });

  const essayList: EssayQ[] = targetSlides.slice(0, 2).map((slide, idx) => {
    const meta = getHsk3VocabStandard(slide);
    return {
      id: `slide-es-${idx + 1}-${slide.id}`,
      targetWord: slide.hanzi,
      pinyin: slide.pinyin,
      meaning: slide.meaning,
      suggestedPrompt: `Hãy đặt câu hoặc luyện nói tiếng Trung có chứa từ “${slide.hanzi}” theo công thức: ${meta.grammarFormula}`,
      sampleSentence: slide.exampleHanzi,
      samplePinyin: slide.examplePinyin,
      sampleTranslation: slide.exampleMeaning,
      grammarFocus: `${meta.grammarTitle}: ${meta.grammarFormula}`,
    };
  });

  const wordNames = targetSlides.map((s) => s.hanzi).join(', ');

  return {
    id: `slide-pkg-${Date.now()}`,
    fileName: `Bai_Tap_Slide_HSK3_${targetSlides.map((s) => s.hanzi).join('_')}.docx`,
    fileType: 'docx',
    sessionNumber,
    sessionTitle: `Bài tập từ Slide bài giảng: ${wordNames}`,
    uploadedAt: 'Vừa giao từ Slide',
    dueDate: 'Hôm nay, 23:59',
    teacherName: 'Nguyễn Văn Thụ (阮文受)',
    rawContent: wordNames,
    multipleChoiceList,
    sentenceOrderingList,
    essayList,
  };
}

export type ClassroomMiniGameMode = 'image-to-hanzi' | 'audio-to-hanzi';

export interface ClassroomMiniGameQuestion {
  id: string;
  slideId: string;
  mode: ClassroomMiniGameMode;
  promptTitle: string;
  targetHanzi: string;
  targetPinyin: string;
  targetHanViet: string;
  targetMeaning: string;
  exampleHanzi: string;
  illustrationKey: VocabSlide['illustrationKey'];
  imageUrl?: string;
  options: {
    hanzi: string;
    pinyin: string;
    meaning: string;
    isCorrect: boolean;
  }[];
}

export function generateClassroomMiniGameQuestions(
  slides: VocabSlide[],
  mode: ClassroomMiniGameMode,
  limit = 6
): ClassroomMiniGameQuestion[] {
  if (!slides || slides.length === 0) return [];
  const selected = slides.slice(0, Math.min(limit, slides.length));

  return selected.map((slide, idx) => {
    const others = slides.filter((s) => s.id !== slide.id);
    const d1 = others[(idx + 1) % Math.max(1, others.length)] || slide;
    const d2 = others[(idx + 3) % Math.max(1, others.length)] || slide;
    const d3 = others[(idx + 5) % Math.max(1, others.length)] || slide;

    const rawOpts = [
      { hanzi: slide.hanzi, pinyin: slide.pinyin, meaning: slide.meaning, isCorrect: true },
      { hanzi: d1.hanzi, pinyin: d1.pinyin, meaning: d1.meaning, isCorrect: false },
      { hanzi: d2.hanzi, pinyin: d2.pinyin, meaning: d2.meaning, isCorrect: false },
      { hanzi: d3.hanzi, pinyin: d3.pinyin, meaning: d3.meaning, isCorrect: false },
    ];

    const rotatedOpts = [
      rawOpts[(0 + idx) % 4],
      rawOpts[(1 + idx) % 4],
      rawOpts[(2 + idx) % 4],
      rawOpts[(3 + idx) % 4],
    ];

    return {
      id: `mg-${mode}-${idx}-${slide.id}`,
      slideId: slide.id,
      mode,
      promptTitle:
        mode === 'image-to-hanzi'
          ? `Nhìn tranh & nghĩa “${slide.meaning}” — Chọn nhanh chữ Hán đúng!`
          : `Nghe phát âm zh-CN — Chọn nhanh chữ Hán & nghĩa đúng!`,
      targetHanzi: slide.hanzi,
      targetPinyin: slide.pinyin,
      targetHanViet: slide.hanViet,
      targetMeaning: slide.meaning,
      exampleHanzi: slide.exampleHanzi,
      illustrationKey: slide.illustrationKey,
      imageUrl: slide.imageUrl,
      options: rotatedOpts,
    };
  });
}

export interface ContextualDialogueTurn {
  speaker: 'A' | 'B';
  speakerName: string;
  hanziLine: string;
  pinyinLine: string;
  meaningLine: string;
}

export interface ContextualDialogueData {
  slideId: string;
  targetHanzi: string;
  sceneTitle: string;
  turns: ContextualDialogueTurn[];
}

const CUSTOM_DIALOGUES: Record<string, ContextualDialogueTurn[]> = {
  温暖: [
    {
      speaker: 'A',
      speakerName: 'Thầy Thụ (老师)',
      hanziLine: '今天外面的阳光真温暖，咱们去花园散步吧！',
      pinyinLine: 'Jīntiān wàimiàn de yángguāng zhēn wēnnuǎn, zánmen qù huāyuán sànbù ba!',
      meaningLine: 'Ánh nắng ngoài trời hôm nay thật ấm áp, chúng mình ra vườn hoa dạo bộ nhé!',
    },
    {
      speaker: 'B',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '好呀！春天的风也很温和，让人觉得特别舒服。',
      pinyinLine: 'Hǎo ya! Chūntiān de fēng yě hěn wēnhé, ràng rén juéde tèbié shūfu.',
      meaningLine: 'Vâng ạ! Gió mùa xuân cũng rất dịu dàng, khiến người ta cảm thấy vô cùng dễ chịu.',
    },
    {
      speaker: 'A',
      speakerName: 'Thầy Thụ (老师)',
      hanziLine: '家人和朋友的关心，也会给我们的心带来温暖。',
      pinyinLine: 'Jiārén hé péngyou de guānxīn, yě huì gěi wǒmen de xīn dàilái wēnnuǎn.',
      meaningLine: 'Sự quan tâm của gia đình và bạn bè cũng mang lại sự ấm áp cho trái tim chúng ta.',
    },
  ],
  家庭: [
    {
      speaker: 'A',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '周末你通常怎么陪伴家庭和父母？',
      pinyinLine: 'Zhōumò nǐ tōngcháng zěnme péibàn jiātíng hé fùmǔ?',
      meaningLine: 'Cuối tuần bạn thường dành thời gian bên gia đình và bố mẹ như thế nào?',
    },
    {
      speaker: 'B',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '我喜欢在家和父母一起做饭，享受幸福的家庭时光。',
      pinyinLine: 'Wǒ xǐhuan zài jiā hé fùmǔ yìqǐ zuòfàn, xiǎngshòu xìngfú de jiātíng shíguāng.',
      meaningLine: 'Mình thích ở nhà nấu cơm cùng bố mẹ, tận hưởng khoảng thời gian gia đình hạnh phúc.',
    },
    {
      speaker: 'A',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '真好！和睦的家庭是每个人最温暖的港湾。',
      pinyinLine: 'Zhēn hǎo! Hémù de jiātíng shì měi gè rén zuì wēnnuǎn de gǎngwān.',
      meaningLine: 'Tuyệt quá! Gia đình hòa thuận là bến đỗ ấm áp nhất của mỗi người.',
    },
  ],
  咱们: [
    {
      speaker: 'A',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '下周就要考 HSK 三级了，咱们一起去图书馆复习吧！',
      pinyinLine: 'Xià zhōu jiù yào kǎo HSK sān jí le, zánmen yìqǐ qù túshūguǎn fùxí ba!',
      meaningLine: 'Tuần sau thi HSK 3 rồi, chúng mình cùng tới thư viện ôn tập nhé!',
    },
    {
      speaker: 'B',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '太好了！咱们先练习汉字书写，再练习情境对话。',
      pinyinLine: 'Tài hǎo le! Zánmen xiān liànxí Hànzì shūxiě, zài liànxí qíngjìng duìhuà.',
      meaningLine: 'Hay quá! Chúng mình luyện viết chữ Hán trước, rồi luyện hội thoại ngữ cảnh sau nhé.',
    },
    {
      speaker: 'A',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '没问题，只要咱们坚持努力，一定能取得好成绩！',
      pinyinLine: 'Méi wèntí, zhǐyào zánmen jiānchí nǔlì, yídìng néng qǔdé hǎo chéngjì!',
      meaningLine: 'Không vấn đề gì, chỉ cần chúng mình kiên trì nỗ lực, nhất định sẽ đạt điểm cao!',
    },
  ],
  明天: [
    {
      speaker: 'A',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '明天是周末，天气也很好，你有什么打算？',
      pinyinLine: 'Míngtiān shì zhōumò, tiānqì yě hěn hǎo, nǐ yǒu shénme dǎsuàn?',
      meaningLine: 'Ngày mai là cuối tuần, thời tiết cũng rất đẹp, bạn có dự định gì không?',
    },
    {
      speaker: 'B',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '明天我们一起去北京看长城吧！我已经买好高铁票了。',
      pinyinLine: 'Míngtiān wǒmen yīqǐ qù Běijīng kàn Chángchéng ba! Wǒ yǐjīng mǎihǎo gāotiě piào le.',
      meaningLine: 'Ngày mai chúng ta cùng đi Bắc Kinh ngắm Vạn Lý Trường Thành nhé! Mình đã mua xong vé tàu cao tốc rồi.',
    },
    {
      speaker: 'A',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '太棒了！那我们明天早上七点在车站门口见。',
      pinyinLine: 'Tài bàng le! Nà wǒmen míngtiān zǎoshang qī diǎn zài chēzhàn ménkǒu jiàn.',
      meaningLine: 'Tuyệt quá! Vậy sáng ngày mai 7 giờ chúng mình gặp nhau ở cổng nhà ga nhé.',
    },
  ],
  照顾: [
    {
      speaker: 'A',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '这几天天气变冷了，你感冒好点儿了吗？',
      pinyinLine: 'Zhè jǐ tiān tiānqì biàn lěng le, nǐ gǎnmào hǎo diǎnr le ma?',
      meaningLine: 'Mấy hôm nay trời trở lạnh rồi, bệnh cảm của bạn đã đỡ hơn chút nào chưa?',
    },
    {
      speaker: 'B',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '好多了！妈妈一直很细心地照顾我，每天都给我煮热汤。',
      pinyinLine: 'Hǎo duō le! Māma yīzhí hěn xìxīn de zhàogù wǒ, měitiān dōu gěi wǒ zhǔ rè tāng.',
      meaningLine: 'Đỡ nhiều rồi! Mẹ luôn ân cần và chu đáo chăm sóc mình, ngày nào cũng nấu canh nóng cho mình.',
    },
    {
      speaker: 'A',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '有家人的照顾真幸福，你在学校也要照顾好自己呀！',
      pinyinLine: 'Yǒu jiārén de zhàogù zhēn xìngfú, nǐ zài xuéxiào yě yào zhàogù hǎo zìjǐ ya!',
      meaningLine: 'Có sự chăm sóc của gia đình thật hạnh phúc, ở trường bạn cũng nhớ tự chăm sóc tốt bản thân nhé!',
    },
  ],
  考试: [
    {
      speaker: 'A',
      speakerName: 'Thầy Thụ (老师)',
      hanziLine: '明天的 HSK 汉语考试你准备得怎么样了？',
      pinyinLine: 'Míngtiān de HSK Hànyǔ kǎoshì nǐ zhǔnbèi de zěnmeyàng le?',
      meaningLine: 'Kỳ thi tiếng Trung HSK ngày mai em đã chuẩn bị đến đâu rồi?',
    },
    {
      speaker: 'B',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '我已经把生词和语法都复习好了，对这次考试很有信心！',
      pinyinLine: 'Wǒ yǐjīng bǎ shēngcí hé yǔfǎ dōu fùxí hǎo le, duì zhè cì kǎoshì hěn yǒu xìnxīn!',
      meaningLine: 'Em đã ôn tập kỹ toàn bộ từ mới và ngữ pháp rồi, em rất tự tin vào kỳ thi lần này ạ!',
    },
    {
      speaker: 'A',
      speakerName: 'Thầy Thụ (老师)',
      hanziLine: '太好了！祝你明天的汉语考试取得好成绩！',
      pinyinLine: 'Tài hǎo le! Zhù nǐ míngtiān de Hànyǔ kǎoshì qǔdé hǎo chéngjì!',
      meaningLine: 'Tốt lắm! Chúc em kỳ thi tiếng Trung ngày mai đạt kết quả cao nhé!',
    },
  ],
  坚持: [
    {
      speaker: 'A',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '你的汉语口语进步真快，有什么学习的秘诀吗？',
      pinyinLine: 'Nǐ de Hànyǔ kǒuyǔ jìnbù zhēn kuài, yǒu shénme xuéxí de mìjué ma?',
      meaningLine: 'Khả năng nói tiếng Trung của bạn tiến bộ nhanh thật, có bí quyết học tập gì không?',
    },
    {
      speaker: 'B',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '我每天都坚持朗读课文和练习写汉字，从不间断。',
      pinyinLine: 'Wǒ měitiān dōu jiānchí lǎngdú kèwén hé liànxí xiě Hànzì, cóng bù jiànduàn.',
      meaningLine: 'Mỗi ngày mình đều kiên trì đọc to bài khóa và luyện viết chữ Hán, chưa từng gián đoạn.',
    },
    {
      speaker: 'A',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '怪不得！无论多么困难，我们都要坚持下去。',
      pinyinLine: 'Guàibude! Wúlùn duōme kùnnan, wǒmen dōu yào jiānchí xiàqù.',
      meaningLine: 'Thảo nào! Dù khó khăn đến đâu, chúng ta đều phải kiên trì đến cùng.',
    },
  ],
  包容: [
    {
      speaker: 'A',
      speakerName: 'Thầy Thụ (老师)',
      hanziLine: '在跨文化交流中，大家觉得最重要的品质是什么？',
      pinyinLine: 'Zài kuà wénhuà jiāoliú zhōng, dàjiā juéde zuì zhòngyào de pǐnzhì shì shénme?',
      meaningLine: 'Trong giao lưu liên văn hóa, các em thấy phẩm chất quan trọng nhất là gì?',
    },
    {
      speaker: 'B',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '我觉得真正的友谊与合作需要互相理解与包容。',
      pinyinLine: 'Wǒ juéde zhēnzhèng de yǒuyì yǔ hézuò xūyào hùxiāng lǐjiě yǔ bāoróng.',
      meaningLine: 'Em nghĩ tình bạn và sự hợp tác chân chính cần sự thấu hiểu và bao dung lẫn nhau ạ.',
    },
    {
      speaker: 'A',
      speakerName: 'Thầy Thụ (老师)',
      hanziLine: '说得对！学会尊重差异、包容彼此，才能走得更远。',
      pinyinLine: 'Shuō de duì! Xuéhuì zūnzhòng chāyì, bāoróng bǐcǐ, cái néng zǒu de gèng yuǎn.',
      meaningLine: 'Nói rất đúng! Học cách tôn trọng sự khác biệt và bao dung lẫn nhau thì mới đi được thật xa.',
    },
  ],
  融会贯通: [
    {
      speaker: 'A',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '老师，我已经背了很多高级词汇，怎么才能用得更自然呢？',
      pinyinLine: 'Lǎoshī, wǒ yǐjīng bèi le hěn duō gāojí cíhuì, zěnme cái néng yòng de gèng zìrán ne?',
      meaningLine: 'Thầy ơi, em đã thuộc rất nhiều từ vựng cao cấp, làm sao để vận dụng tự nhiên hơn ạ?',
    },
    {
      speaker: 'B',
      speakerName: 'Thầy Thụ (老师)',
      hanziLine: '学习语言要把词汇、语法和文化语境融会贯通，多在真实生活里表达。',
      pinyinLine: 'Xuéxí yǔyán yào bǎ cíhuì, yǔfǎ hé wénhuà yǔjìng rónghuì-guàntōng, duō zài zhēnshí shēnghuó lǐ biǎodá.',
      meaningLine: 'Học ngôn ngữ cần phải dung hợp thấu suốt từ vựng, ngữ pháp và bối cảnh văn hóa, tích cực diễn đạt trong đời thực.',
    },
    {
      speaker: 'A',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '明白了！只有融会贯通，才能真正做到举一反三。',
      pinyinLine: 'Míngbai le! Zhǐyǒu rónghuì-guàntōng, cái néng zhēnzhèng zuòdào jǔyī-fǎnsān.',
      meaningLine: 'Em hiểu rồi ạ! Chỉ khi hiểu thấu đáo và vận dụng linh hoạt thì mới thực sự học một biết mười.',
    },
  ],
  旅行: [
    {
      speaker: 'A',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '今年暑假你们一家人有什么安排？',
      pinyinLine: 'Jīnnián shǔjià nǐmen yījiārén yǒu shénme ānpái?',
      meaningLine: 'Kỳ nghỉ hè năm nay gia đình bạn có kế hoạch gì chưa?',
    },
    {
      speaker: 'B',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: '今年暑假我们打算去中国旅行，想去看北京故宫和杭州西湖。',
      pinyinLine: 'Jīnnián shǔjià wǒmen dǎsuàn qù Zhōngguó lǚxíng, xiǎng qù kàn Běijīng Gùgōng hé Hángzhōu Xīhú.',
      meaningLine: 'Kỳ nghỉ hè năm nay chúng mình dự định đi du lịch Trung Quốc, muốn tới thăm Cố Cung Bắc Kinh và Tây Hồ Hàng Châu.',
    },
    {
      speaker: 'A',
      speakerName: 'Minh Thư (明书)',
      hanziLine: '去旅行不仅能放松心情，还能了解不同地方的文化！',
      pinyinLine: 'Qù lǚxíng bùjǐn néng fàngsōng xīnqíng, hái néng liǎojiě bùtóng dìfang de wénhuà!',
      meaningLine: 'Đi du lịch không những giúp thư giãn tâm trạng mà còn tìm hiểu được văn hóa của nhiều vùng đất khác nhau!',
    },
  ],
};

/**
 * Generates a realistic 3-turn A-B Contextual Dialogue (情境对话 & 课文)
 * incorporating the current vocabulary slide and its real-life scene context.
 */
export function generateContextualDialogue(
  slide: VocabSlide,
  allSlides: VocabSlide[] = []
): ContextualDialogueData {
  if (!slide) {
    return {
      slideId: 'default',
      targetHanzi: '温暖',
      sceneTitle: 'Hội thoại thực tế HSK 3.0 (情境对话)',
      turns: CUSTOM_DIALOGUES['温暖'],
    };
  }

  const preset = CUSTOM_DIALOGUES[slide.hanzi];
  if (preset) {
    return {
      slideId: slide.id,
      targetHanzi: slide.hanzi,
      sceneTitle: `Hội thoại thực tế với “${slide.hanzi}” (${slide.meaning})`,
      turns: preset,
    };
  }

  const companion =
    allSlides.find((s) => s.id !== slide.id && s.hskLevel === slide.hskLevel) ||
    allSlides.find((s) => s.id !== slide.id);
  const compWord = companion ? companion.hanzi : '朋友';
  const compPinyin = companion ? companion.pinyin : 'péngyou';
  const compMeaning = companion ? companion.meaning : 'bạn bè';

  const cleanExampleHanzi = (slide.exampleHanzi || '').replace(/\s+/g, '');

  const turns: ContextualDialogueTurn[] = [
    {
      speaker: 'A',
      speakerName: 'Minh Thư (明书)',
      hanziLine: `周末我们和${compWord}聊到了“${slide.hanzi}”，在生活中你常怎么表达？`,
      pinyinLine: `Zhōumò wǒmen hé ${compPinyin} liáodào le “${slide.pinyin}”, zài shēnghuó zhōng nǐ cháng zěnme biǎodá?`,
      meaningLine: `Cuối tuần chúng mình cùng ${compMeaning} trò chuyện về “${slide.hanzi}” (${slide.meaning}), trong đời sống bạn thường diễn đạt thế nào?`,
    },
    {
      speaker: 'B',
      speakerName: 'Quốc Bảo (国宝)',
      hanziLine: `${cleanExampleHanzi}`,
      pinyinLine: `${slide.examplePinyin}`,
      meaningLine: `${slide.exampleMeaning}`,
    },
    {
      speaker: 'A',
      speakerName: 'Minh Thư (明书)',
      hanziLine: `这句话特别自然！平时多用“${slide.hanzi}”交流，口语一定会越来越地道。`,
      pinyinLine: `Zhè jù huà tèbié zìrán! Píngshí duō yòng “${slide.pinyin}” jiāoliú, kǒuyǔ yīdìng huì yuèláiyuè dìdao.`,
      meaningLine: `Câu này tự nhiên lắm! Thường xuyên dùng “${slide.hanzi}” (${slide.meaning}) trong giao tiếp thì khẩu ngữ nhất định ngày càng chuẩn bản xứ.`,
    },
  ];

  return {
    slideId: slide.id,
    targetHanzi: slide.hanzi,
    sceneTitle: `Hội thoại ngữ cảnh HSK 3.0: “${slide.hanzi}” (${slide.meaning})`,
    turns,
  };
}


