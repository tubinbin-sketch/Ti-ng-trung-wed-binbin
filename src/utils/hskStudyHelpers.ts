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

export function getToneNumberFromPinyin(syllable: string): 1 | 2 | 3 | 4 | 0 {
  if (/[āōēīūǖ]/.test(syllable)) return 1;
  if (/[áóéíúǘ]/.test(syllable)) return 2;
  if (/[ǎǒěǐǔǚ]/.test(syllable)) return 3;
  if (/[àòèìùǜ]/.test(syllable)) return 4;
  return 0; // neutral tone (轻声)
}

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
 * Strictly adheres to standard Beijing phonological rules:
 * - T3 + T3 -> 2 + 3 (Biến điệu thanh 3: Âm tiết đầu đọc thành thanh 2)
 * - T3 + (T1 / T2 / T4 / neutral) -> Nửa thanh 3 (211): Chỉ khi thanh 3 đứng TRƯỚC âm khác
 * - (T1 / T2 / T4) + T3 (như 温暖 wēn nuǎn) -> Giữ nguyên thanh điệu chuẩn, KHÔNG biến điệu âm đầu
 * - "一 (yī)" & "不 (bù)" tone sandhi rules
 * - Neutral tone (轻声)
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
  const toneNumbers = syllables.map(getToneNumberFromPinyin);

  // 1. Check "一 (yī)" tone sandhi ONLY when the vocabulary word itself contains 一
  if (cleanHanzi.includes('一')) {
    const yiIndex = Array.from(cleanHanzi).indexOf('一');
    const nextSyl = syllables[yiIndex + 1];
    const nextTone = nextSyl ? getToneNumberFromPinyin(nextSyl) : 0;
    const isFollowedByFourth = nextTone === 4 || FOURTH_TONE_CHARS.test(cleanPinyin);

    return {
      hasSandhi: true,
      ruleBadge: 'Biến điệu chữ “一 (yī)”',
      ruleTitle: 'Quy tắc biến điệu của “一” trong từ vựng',
      originalPinyin: cleanPinyin,
      spokenPinyin: isFollowedByFourth
        ? `${cleanPinyin} (一 đọc thành yí trước thanh 4)`
        : `${cleanPinyin} (一 đọc thành yì trước thanh 1, 2, 3)`,
      explanationVi:
        'Chữ “一 (yī)” khi đứng trước âm tiết mang thanh 4 sẽ biến điệu thành thanh 2 (yí, ví dụ: 一个 yí gè, 一定 yí dìng); khi đứng trước thanh 1, 2, 3 sẽ biến điệu thành thanh 4 (yì, ví dụ: 一起 yì qǐ, 一杯 yì bēi). Khi đứng độc lập hoặc đếm số thì giữ nguyên thanh 1 (yī).',
      exampleHint: 'Ứng dụng trực tiếp khi đọc từ vựng chứa “一” trên lớp.',
    };
  }

  // 2. Check "不 (bù)" tone sandhi ONLY when the vocabulary word itself contains 不
  if (cleanHanzi.includes('不')) {
    const buIndex = Array.from(cleanHanzi).indexOf('不');
    const nextSyl = syllables[buIndex + 1];
    const nextTone = nextSyl ? getToneNumberFromPinyin(nextSyl) : 0;
    const isFollowedByFourth = nextTone === 4 || FOURTH_TONE_CHARS.test(nextSyl || '');

    return {
      hasSandhi: true,
      ruleBadge: 'Biến điệu chữ “不 (bù)”',
      ruleTitle: 'Quy tắc biến điệu của “不” trước thanh 4',
      originalPinyin: cleanPinyin,
      spokenPinyin: isFollowedByFourth
        ? `${cleanPinyin} (不 + thanh 4 → bú)`
        : `${cleanPinyin} (不 giữ thanh 4 → bù)`,
      explanationVi: isFollowedByFourth
        ? 'Chữ “不 (bù)” khi đứng trước âm tiết mang thanh 4 sẽ biến điệu đọc thành thanh 2 “bú” (ví dụ: 不是 bú shì, 不对 bú duì).'
        : 'Chữ “不 (bù)” khi đứng trước âm tiết mang thanh 1, 2, 3 hoặc đứng cuối câu thì giữ nguyên thanh 4 “bù” (ví dụ: 不吃 bù chī, 不来 bù lái, 不好 bù hǎo).',
      exampleHint: 'Giúp giọng đọc tự nhiên, mượt mà chuẩn Bắc Kinh (zh-CN).',
    };
  }

  // 3. Check 3rd tone + 3rd tone -> 2nd tone + 3rd tone (3 + 3 -> 2 + 3)
  if (syllables.length >= 2) {
    for (let i = 0; i < syllables.length - 1; i++) {
      if (toneNumbers[i] === 3 && toneNumbers[i + 1] === 3) {
        const spokenSyllables = [...syllables];
        spokenSyllables[i] = convertThirdToSecondTone(syllables[i]);
        return {
          hasSandhi: true,
          ruleBadge: 'Biến điệu 3 + 3 → 2 + 3',
          ruleTitle: 'Quy tắc hai thanh 3 đi liền (三声变调)',
          originalPinyin: cleanPinyin,
          spokenPinyin: spokenSyllables.join(' '),
          explanationVi: `Hai âm tiết mang thanh 3 đi liền nhau: âm tiết thứ ${i + 1} “${syllables[i]}” biến điệu đọc thành thanh 2 “${spokenSyllables[i]}” (${cleanPinyin} → ${spokenSyllables.join(' ')}).`,
          exampleHint: 'Ví dụ chuẩn: 你好 (nǐ hǎo → ní hǎo) · 可以 (kě yǐ → ké yǐ) · 了解 (liǎojiě → liáojiě)',
        };
      }
    }
  }

  // 4. Check Half 3rd Tone (Nửa thanh 3 - 半三声 211):
  // ONLY occurs when a 3rd tone syllable stands BEFORE a 1st, 2nd, 4th, or neutral tone syllable!
  // If the 3rd tone is in the LAST syllable (e.g. 温暖 wēn nuǎn - T1 + T3), it does NOT turn into half 3rd tone!
  if (syllables.length >= 2) {
    for (let i = 0; i < syllables.length - 1; i++) {
      if (toneNumbers[i] === 3 && toneNumbers[i + 1] !== 3) {
        const nextToneName =
          toneNumbers[i + 1] === 0 ? 'thanh nhẹ' : `thanh ${toneNumbers[i + 1]}`;
        return {
          hasSandhi: true,
          ruleBadge: 'Quy tắc Nửa thanh 3 (半三声)',
          ruleTitle: 'Biến điệu Nửa thanh 3 (211) trước thanh khác',
          originalPinyin: cleanPinyin,
          spokenPinyin: `${cleanPinyin} (âm “${syllables[i]}” hạ trầm 211)`,
          explanationVi: `Âm tiết “${syllables[i]}” (thanh 3) đứng trước âm tiết “${syllables[i + 1]}” (${nextToneName}): chỉ đọc phần hạ trầm (cao độ 211 - nửa thanh 3) rồi nối liền sang âm sau, không lượn cao lên 214.`,
          exampleHint: 'Ví dụ chuẩn: 首都 (shǒudū) · 语言 (yǔyán) · 努力 (nǔlì)',
        };
      }
    }
  }

  // 5. Check Neutral Tone (Thanh nhẹ - 轻声) when the last syllable has no tone mark
  if (syllables.length >= 2 && toneNumbers[toneNumbers.length - 1] === 0) {
    const lastSyl = syllables[syllables.length - 1];
    return {
      hasSandhi: true,
      ruleBadge: 'Quy tắc Thanh nhẹ (轻声)',
      ruleTitle: 'Âm tiết sau đọc lướt nhẹ & ngắn (轻声规则)',
      originalPinyin: cleanPinyin,
      spokenPinyin: `${syllables.slice(0, -1).join(' ')} · ${lastSyl} (thanh nhẹ)`,
      explanationVi: `Âm tiết “${lastSyl}” trong từ “${cleanHanzi}” mang thanh nhẹ (轻声): đọc ngắn, nhẹ và nương theo độ cao của âm tiết đứng trước.`,
      exampleHint: 'Ví dụ chuẩn: 咱们 (zánmen) · 朋友 (péngyou) · 暖和 (nuǎnhuo)',
    };
  }

  // 6. Default standard tone contour guidance (e.g. 温暖 wēn nuǎn: T1 + T3 - KHÔNG BIẾN ĐIỆU)
  const toneDescription = syllables
    .map((s, idx) => {
      const t = toneNumbers[idx];
      return t === 0 ? 'Thanh nhẹ' : `Thanh ${t}`;
    })
    .join(' + ');

  return {
    hasSandhi: false,
    ruleBadge: 'Chuẩn thanh điệu HSK 3.0',
    ruleTitle: `Giữ trọn cao độ gốc (${toneDescription})`,
    originalPinyin: cleanPinyin,
    spokenPinyin: cleanPinyin,
    explanationVi: `Từ “${cleanHanzi}” (${cleanPinyin}) có cấu trúc thanh điệu [${toneDescription}]: Giữ nguyên thanh điệu chuẩn của từng âm tiết khi phát âm. ${
      toneNumbers[toneNumbers.length - 1] === 3
        ? `Âm tiết cuối “${syllables[syllables.length - 1]}” mang thanh 3 giữ trọn đường cong cao độ chuẩn (214).`
        : 'Phát âm rõ âm đầu và trường độ chuẩn Bắc Kinh.'
    }`,
    exampleHint: 'Đọc mẫu rõ ràng, kết hợp luyện câu ví dụ để rèn ngữ điệu đàm thoại tự nhiên.',
  };
}

export type SrsRating = 'forgot' | 'hard' | 'good' | 'mastered' | 'again';

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
  nextReviewTimestamp: number;
  updatedAt: string;
}

export const STORAGE_KEY_SRS_MISTAKE_BOOK = 'hanu_student_srs_mistake_book_v2';

export function getInitialSrsRecords(slides: VocabSlide[]): Record<string, SrsWordRecord> {
  const defaults: Record<string, SrsWordRecord> = {};
  const seedHanzis = ['温暖', '融会贯通', '坚持'];
  const now = Date.now();

  slides.forEach((s) => {
    if (seedHanzis.includes(s.hanzi)) {
      const isDifficult = s.hanzi === '融会贯通';
      defaults[s.id] = {
        slideId: s.id,
        hanzi: s.hanzi,
        pinyin: s.pinyin,
        hanViet: s.hanViet,
        meaning: s.meaning,
        hskLevel: s.hskLevel,
        rating: isDifficult ? 'forgot' : 'hard',
        intervalLabel: isDifficult ? 'Ôn lại ngay (1 phút)' : 'Cần củng cố (10 phút)',
        reviewCount: 1,
        inMistakeBook: true,
        nextReviewTimestamp: isDifficult ? now - 1000 : now + 10 * 60 * 1000,
        updatedAt: 'Hôm nay',
      };
    }
  });
  return defaults;
}

export function getStudentSrsStorageKey(studentId?: string): string {
  const cleanId = String(studentId || '').trim();
  if (cleanId) {
    return `${STORAGE_KEY_SRS_MISTAKE_BOOK}_${cleanId.replace(/\s+/g, '_')}`;
  }
  if (typeof window !== 'undefined') {
    try {
      const activeId = localStorage.getItem('hanu_active_student_id_v1');
      if (activeId) {
        return `${STORAGE_KEY_SRS_MISTAKE_BOOK}_${activeId}`;
      }
    } catch {
      // ignore
    }
  }
  return `${STORAGE_KEY_SRS_MISTAKE_BOOK}_HV-001`;
}

export function loadStoredSrsRecords(
  slides: VocabSlide[],
  studentId?: string
): Record<string, SrsWordRecord> {
  if (typeof window === 'undefined') return getInitialSrsRecords(slides);
  try {
    const key = getStudentSrsStorageKey(studentId);
    const raw = localStorage.getItem(key);
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

export function saveStoredSrsRecords(
  records: Record<string, SrsWordRecord>,
  studentId?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getStudentSrsStorageKey(studentId);
    localStorage.setItem(key, JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

export function mergeRemoteFirestoreSrsIntoLocal(
  slides: VocabSlide[],
  remoteSrsMap: Record<
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
  >,
  studentId?: string
): Record<string, SrsWordRecord> {
  const current = loadStoredSrsRecords(slides, studentId);
  const next: Record<string, SrsWordRecord> = { ...current };
  const slideById = new Map<string, VocabSlide>();
  const slideByHanzi = new Map<string, VocabSlide>();

  for (const s of slides) {
    slideById.set(s.id, s);
    slideByHanzi.set(s.hanzi, s);
  }

  for (const [docId, remote] of Object.entries(remoteSrsMap)) {
    const matchedSlide =
      slideById.get(remote.wordId) ||
      slideById.get(docId) ||
      slideByHanzi.get(remote.hanzi);
    const targetSlideId = matchedSlide?.id || remote.wordId || docId;
    const prev = next[targetSlideId];

    const inferredRating: SrsRating = remote.learned
      ? remote.intervalDays >= 4
        ? 'mastered'
        : 'good'
      : remote.easeFactor <= 1.5
      ? 'forgot'
      : 'hard';

    const inMistakeBook = !remote.learned && (inferredRating === 'forgot' || inferredRating === 'hard');
    const intervalLabel =
      inferredRating === 'mastered'
        ? 'Đã thuộc làu (4 ngày)'
        : inferredRating === 'good'
        ? 'Nhớ tốt (1 ngày)'
        : inferredRating === 'hard'
        ? 'Cần củng cố (10 phút)'
        : 'Ôn lại ngay (1 phút)';

    next[targetSlideId] = {
      slideId: targetSlideId,
      hanzi: matchedSlide?.hanzi || remote.hanzi || prev?.hanzi || targetSlideId,
      pinyin: matchedSlide?.pinyin || prev?.pinyin || '',
      hanViet: matchedSlide?.hanViet || prev?.hanViet || '',
      meaning: matchedSlide?.meaning || prev?.meaning || '',
      hskLevel: matchedSlide?.hskLevel || prev?.hskLevel || 'HSK 3',
      rating: inferredRating,
      intervalLabel,
      reviewCount: Math.max(prev?.reviewCount || 0, Number(remote.repetitions || 1)),
      inMistakeBook,
      nextReviewTimestamp: Number(remote.dueAt || prev?.nextReviewTimestamp || Date.now()),
      updatedAt: 'Đồng bộ Đám mây',
    };
  }

  saveStoredSrsRecords(next, studentId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hanu_srs_updated'));
  }
  return next;
}

export function isSrsDueToday(record?: SrsWordRecord | null): boolean {
  if (!record) return false;
  if (record.inMistakeBook) return true;
  if (record.rating === 'forgot' || record.rating === 'hard' || record.rating === 'again') return true;
  if (record.nextReviewTimestamp && record.nextReviewTimestamp <= Date.now()) return true;
  return false;
}

export function applySrsRatingToRecords(
  currentRecords: Record<string, SrsWordRecord>,
  slide: VocabSlide,
  rating: SrsRating
): Record<string, SrsWordRecord> {
  const existing = currentRecords[slide.id];
  const prevCount = existing?.reviewCount || 0;
  const now = Date.now();

  let intervalLabel = 'Cần củng cố (10 phút)';
  let nextReviewTimestamp = now + 10 * 60 * 1000;
  let inMistakeBook = false;

  if (rating === 'forgot' || rating === 'again') {
    intervalLabel = 'Ôn lại ngay (1 phút)';
    nextReviewTimestamp = now + 60 * 1000;
    inMistakeBook = true;
  } else if (rating === 'hard') {
    intervalLabel = 'Cần củng cố (10 phút)';
    nextReviewTimestamp = now + 10 * 60 * 1000;
    inMistakeBook = true;
  } else if (rating === 'good') {
    intervalLabel = 'Ôn lại sau (1 ngày)';
    nextReviewTimestamp = now + 24 * 60 * 60 * 1000;
    inMistakeBook = false;
  } else if (rating === 'mastered') {
    intervalLabel = 'Thuộc làu (4 ngày)';
    nextReviewTimestamp = now + 4 * 24 * 60 * 60 * 1000;
    inMistakeBook = false;
  }

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
    nextReviewTimestamp,
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
    uploadedAt: new Date().toISOString(),
    dueDate: '',
    teacherName: '',
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

// ============================================================================
// 5. TEACHER CLASSROOM DICTATION STUDIO (听写 · TĪNGXIĚ) HELPERS
// ============================================================================

export interface ClassroomDictationItem {
  id: string;
  index: number;
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaning: string;
  partOfSpeech: string;
  hskLevel: string;
  maskedHanzi: string;
  strokeHint: string;
  radicalHint: string;
  exampleHanzi: string;
  examplePinyin: string;
  exampleVi: string;
}

export interface DictationEvaluationResult {
  isExactHanzi: boolean;
  isPinyinMatch: boolean;
  accuracyPct: number;
  matchedChars: string[];
  missingChars: string[];
  pedagogicalFeedback: string;
}

export function generateClassroomDictationDeck(
  slides: VocabSlide[]
): ClassroomDictationItem[] {
  const source = slides.length > 0 ? slides : [];
  return source.map((slide, idx) => {
    const charArray = Array.from(slide.hanzi);
    const strokeParts =
      slide.characters && slide.characters.length > 0
        ? slide.characters.map((c) => `${c.strokeCount} nét`).join(' + ')
        : `${charArray.length * 8} nét`;
    const radicalParts =
      slide.characters && slide.characters.length > 0
        ? slide.characters.map((c) => c.radical).join(' · ')
        : 'Bộ thủ chuẩn HSK 3.0';

    return {
      id: `dict-${slide.id}`,
      index: idx + 1,
      hanzi: slide.hanzi,
      pinyin: slide.pinyin,
      hanViet: slide.hanViet,
      meaning: slide.meaning,
      partOfSpeech: slide.partOfSpeech,
      hskLevel: slide.hskLevel,
      maskedHanzi: charArray.map(() => '？').join(' '),
      strokeHint: `${charArray.length} chữ Hán (${strokeParts})`,
      radicalHint: `Bộ thủ: ${radicalParts}`,
      exampleHanzi: slide.exampleHanzi,
      examplePinyin: slide.examplePinyin,
      exampleVi: slide.exampleMeaning,
    };
  });
}

function normalizePinyinComparison(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

export function evaluateDictationAttempt(
  userInput: string,
  item: ClassroomDictationItem
): DictationEvaluationResult {
  const cleaned = userInput.trim();
  const targetChars = Array.from(item.hanzi);

  if (!cleaned) {
    return {
      isExactHanzi: false,
      isPinyinMatch: false,
      accuracyPct: 0,
      matchedChars: [],
      missingChars: targetChars,
      pedagogicalFeedback: `Hãy nghe kỹ âm đọc của từ (${item.meaning}) và nhập chữ Hán vào ô chính tả.`,
    };
  }

  if (cleaned === item.hanzi) {
    return {
      isExactHanzi: true,
      isPinyinMatch: true,
      accuracyPct: 100,
      matchedChars: targetChars,
      missingChars: [],
      pedagogicalFeedback: `Chính xác 100%! Bạn đã viết đúng chuẩn chữ Hán “${item.hanzi}” (${item.pinyin} - ${item.meaning}).`,
    };
  }

  const matchedChars = targetChars.filter((ch) => cleaned.includes(ch));
  const missingChars = targetChars.filter((ch) => !cleaned.includes(ch));
  const isPinyinMatch =
    normalizePinyinComparison(cleaned) === normalizePinyinComparison(item.pinyin);

  if (matchedChars.length > 0) {
    const pct = Math.round((matchedChars.length / targetChars.length) * 100);
    return {
      isExactHanzi: false,
      isPinyinMatch,
      accuracyPct: pct,
      matchedChars,
      missingChars,
      pedagogicalFeedback: `Đã viết đúng chữ “${matchedChars.join(', ')}”, cần lưu ý bổ sung chữ “${missingChars.join(', ')}” (${item.radicalHint}).`,
    };
  }

  if (isPinyinMatch) {
    return {
      isExactHanzi: false,
      isPinyinMatch: true,
      accuracyPct: 60,
      matchedChars: [],
      missingChars: targetChars,
      pedagogicalFeedback: `Bạn đã nghe đúng phiên âm Pinyin “${item.pinyin}”! Hãy chuyển sang chữ Hán chuẩn: “${item.hanzi}” (${item.strokeHint}).`,
    };
  }

  return {
    isExactHanzi: false,
    isPinyinMatch: false,
    accuracyPct: 20,
    matchedChars: [],
    missingChars: targetChars,
    pedagogicalFeedback: `Chưa khớp chữ Hán. Đáp án chuẩn là “${item.hanzi}” (${item.pinyin} · Hán Việt: ${item.hanViet.toUpperCase()} · Nghĩa: ${item.meaning}).`,
  };
}

// ============================================================================
// 6. STUDENT HSK 3.0 SENTENCE BUILDER & WORD ORDER ARENA (连词成句)
// ============================================================================

export interface Hsk3SentenceTile {
  id: string;
  hanzi: string;
  pinyin: string;
  posTag: string;
  meaningHint: string;
}

export interface Hsk3SentenceBuilderChallenge {
  id: string;
  hskLevel: string;
  grammarPointTitle: string;
  grammarFormula: string;
  vietnamesePrompt: string;
  targetSentence: string;
  targetPinyin: string;
  tilesInCorrectOrder: Hsk3SentenceTile[];
  shuffledTiles: Hsk3SentenceTile[];
  pedagogicalExplanation: string;
}

export interface SentenceBuilderEvaluation {
  isCorrect: boolean;
  score: number;
  assembledHanzi: string;
  feedbackVi: string;
  grammarDiagnostic: string;
}

export const HSK3_SENTENCE_BUILDER_CHALLENGES: Hsk3SentenceBuilderChallenge[] = [
  {
    id: 'sb-1',
    hskLevel: 'HSK 1–2',
    grammarPointTitle: 'Trật tự Trạng ngữ Thời gian & Địa điểm trước Động từ',
    grammarFormula: 'Chủ ngữ + Thời gian + [在 + Địa điểm] + Cách thức + Động từ + Tân ngữ',
    vietnamesePrompt:
      'Chúng mình hôm nay ở trong lớp học chăm chỉ học tiếng Hán.',
    targetSentence: '咱们今天在教室里认真学习汉语。',
    targetPinyin: 'Zánmen jīntiān zài jiàoshì lǐ rènzhēn xuéxí Hànyǔ.',
    tilesInCorrectOrder: [
      { id: 'sb1-t1', hanzi: '咱们', pinyin: 'zánmen', posTag: 'Chủ ngữ', meaningHint: 'chúng mình' },
      { id: 'sb1-t2', hanzi: '今天', pinyin: 'jīntiān', posTag: 'Thời gian', meaningHint: 'hôm nay' },
      { id: 'sb1-t3', hanzi: '在教室里', pinyin: 'zài jiàoshì lǐ', posTag: 'Địa điểm', meaningHint: 'ở trong lớp' },
      { id: 'sb1-t4', hanzi: '认真', pinyin: 'rènzhēn', posTag: 'Trạng ngữ', meaningHint: 'chăm chỉ' },
      { id: 'sb1-t5', hanzi: '学习汉语', pinyin: 'xuéxí Hànyǔ', posTag: 'Động + Tân', meaningHint: 'học tiếng Hán' },
    ],
    shuffledTiles: [
      { id: 'sb1-t3', hanzi: '在教室里', pinyin: 'zài jiàoshì lǐ', posTag: 'Địa điểm', meaningHint: 'ở trong lớp' },
      { id: 'sb1-t5', hanzi: '学习汉语', pinyin: 'xuéxí Hànyǔ', posTag: 'Động + Tân', meaningHint: 'học tiếng Hán' },
      { id: 'sb1-t1', hanzi: '咱们', pinyin: 'zánmen', posTag: 'Chủ ngữ', meaningHint: 'chúng mình' },
      { id: 'sb1-t4', hanzi: '认真', pinyin: 'rènzhēn', posTag: 'Trạng ngữ', meaningHint: 'chăm chỉ' },
      { id: 'sb1-t2', hanzi: '今天', pinyin: 'jīntiān', posTag: 'Thời gian', meaningHint: 'hôm nay' },
    ],
    pedagogicalExplanation:
      'Trong tiếng Trung, trạng ngữ chỉ thời gian (今天) đứng trước trạng ngữ chỉ nơi chốn (在教室里), và cả hai bắt buộc đứng trước cụm động từ chính (认真学习汉语).',
  },
  {
    id: 'sb-2',
    hskLevel: 'HSK 2–3',
    grammarPointTitle: 'Câu chữ 把 (把字句) chỉ sự tác động làm thay đổi trạng thái',
    grammarFormula: '请 / Chủ ngữ + 把 + [Định ngữ + Tân ngữ] + Động từ + Bổ ngữ kết quả',
    vietnamesePrompt: 'Xin hãy bật chiếc điều hòa ở trong phòng lên.',
    targetSentence: '请把房间里的空调打开。',
    targetPinyin: 'Qǐng bǎ fángjiān lǐ de kōngtiáo dǎkāi.',
    tilesInCorrectOrder: [
      { id: 'sb2-t1', hanzi: '请', pinyin: 'qǐng', posTag: 'Động từ lịch sự', meaningHint: 'xin hãy' },
      { id: 'sb2-t2', hanzi: '把', pinyin: 'bǎ', posTag: 'Giới từ 把', meaningHint: 'đem / lấy' },
      { id: 'sb2-t3', hanzi: '房间里的', pinyin: 'fángjiān lǐ de', posTag: 'Định ngữ', meaningHint: 'trong phòng' },
      { id: 'sb2-t4', hanzi: '空调', pinyin: 'kōngtiáo', posTag: 'Tân ngữ', meaningHint: 'điều hòa' },
      { id: 'sb2-t5', hanzi: '打开', pinyin: 'dǎkāi', posTag: 'Động + Bổ ngữ', meaningHint: 'mở / bật lên' },
    ],
    shuffledTiles: [
      { id: 'sb2-t4', hanzi: '空调', pinyin: 'kōngtiáo', posTag: 'Tân ngữ', meaningHint: 'điều hòa' },
      { id: 'sb2-t1', hanzi: '请', pinyin: 'qǐng', posTag: 'Động từ lịch sự', meaningHint: 'xin hãy' },
      { id: 'sb2-t5', hanzi: '打开', pinyin: 'dǎkāi', posTag: 'Động + Bổ ngữ', meaningHint: 'mở / bật lên' },
      { id: 'sb2-t2', hanzi: '把', pinyin: 'bǎ', posTag: 'Giới từ 把', meaningHint: 'đem / lấy' },
      { id: 'sb2-t3', hanzi: '房间里的', pinyin: 'fángjiān lǐ de', posTag: 'Định ngữ', meaningHint: 'trong phòng' },
    ],
    pedagogicalExplanation:
      'Cấu trúc câu chữ 把 đưa đối tượng chịu tác động (房间里的空调) lên trước động từ kèm bổ ngữ kết quả (打开), tuyệt đối không viết “请把打开空调”.',
  },
  {
    id: 'sb-3',
    hskLevel: 'HSK 2',
    grammarPointTitle: 'Cấu trúc 挺 + Tính từ + 的 biểu thị mức độ khá cao',
    grammarFormula: 'Chủ ngữ (Cụm danh từ có 的) + Danh từ thuộc tính + 挺 + Tính từ + 的',
    vietnamesePrompt: 'Món ăn mẹ nấu hương vị khá là ngon.',
    targetSentence: '妈妈做的菜味道挺好的。',
    targetPinyin: 'Māma zuò de cài wèidào tǐng hǎo de.',
    tilesInCorrectOrder: [
      { id: 'sb3-t1', hanzi: '妈妈', pinyin: 'māma', posTag: 'Định ngữ', meaningHint: 'mẹ' },
      { id: 'sb3-t2', hanzi: '做的菜', pinyin: 'zuò de cài', posTag: 'Trung tâm ngữ', meaningHint: 'món ăn nấu' },
      { id: 'sb3-t3', hanzi: '味道', pinyin: 'wèidào', posTag: 'Chủ ngữ nhỏ', meaningHint: 'hương vị' },
      { id: 'sb3-t4', hanzi: '挺', pinyin: 'tǐng', posTag: 'Phó từ mức độ', meaningHint: 'khá là' },
      { id: 'sb3-t5', hanzi: '好的', pinyin: 'hǎo de', posTag: 'Tính từ + 的', meaningHint: 'ngon / tốt' },
    ],
    shuffledTiles: [
      { id: 'sb3-t3', hanzi: '味道', pinyin: 'wèidào', posTag: 'Chủ ngữ nhỏ', meaningHint: 'hương vị' },
      { id: 'sb3-t5', hanzi: '好的', pinyin: 'hǎo de', posTag: 'Tính từ + 的', meaningHint: 'ngon / tốt' },
      { id: 'sb3-t1', hanzi: '妈妈', pinyin: 'māma', posTag: 'Định ngữ', meaningHint: 'mẹ' },
      { id: 'sb3-t4', hanzi: '挺', pinyin: 'tǐng', posTag: 'Phó từ mức độ', meaningHint: 'khá là' },
      { id: 'sb3-t2', hanzi: '做的菜', pinyin: 'zuò de cài', posTag: 'Trung tâm ngữ', meaningHint: 'món ăn nấu' },
    ],
    pedagogicalExplanation:
      'Trong cụm danh từ tiếng Trung, định ngữ miêu tả (妈妈做的) đứng trước danh từ chính (菜), sau đó dùng cấu trúc vị ngữ chủ-vị “味道挺好的”.',
  },
  {
    id: 'sb-4',
    hskLevel: 'HSK 3',
    grammarPointTitle: 'Mệnh đề chỉ mục đích 为了... và Bổ ngữ kết quả 好',
    grammarFormula: '为了 + Mục đích + Chủ ngữ + 已经 + Động từ + 好 + 了',
    vietnamesePrompt: 'Vì kỳ thi ngày mai, tôi đã ôn tập kỹ càng xong xuôi rồi.',
    targetSentence: '为了明天的考试我已经复习好了。',
    targetPinyin: 'Wèile míngtiān de kǎoshì wǒ yǐjīng fùxí hǎo le.',
    tilesInCorrectOrder: [
      { id: 'sb4-t1', hanzi: '为了', pinyin: 'wèile', posTag: 'Giới từ mục đích', meaningHint: 'vì / để' },
      { id: 'sb4-t2', hanzi: '明天的考试', pinyin: 'míngtiān de kǎoshì', posTag: 'Cụm danh từ', meaningHint: 'kỳ thi ngày mai' },
      { id: 'sb4-t3', hanzi: '我', pinyin: 'wǒ', posTag: 'Chủ ngữ', meaningHint: 'tôi' },
      { id: 'sb4-t4', hanzi: '已经', pinyin: 'yǐjīng', posTag: 'Phó từ thời gian', meaningHint: 'đã' },
      { id: 'sb4-t5', hanzi: '复习好了', pinyin: 'fùxí hǎo le', posTag: 'Động + Bổ ngữ', meaningHint: 'ôn tập xong' },
    ],
    shuffledTiles: [
      { id: 'sb4-t4', hanzi: '已经', pinyin: 'yǐjīng', posTag: 'Phó từ thời gian', meaningHint: 'đã' },
      { id: 'sb4-t2', hanzi: '明天的考试', pinyin: 'míngtiān de kǎoshì', posTag: 'Cụm danh từ', meaningHint: 'kỳ thi ngày mai' },
      { id: 'sb4-t5', hanzi: '复习好了', pinyin: 'fùxí hǎo le', posTag: 'Động + Bổ ngữ', meaningHint: 'ôn tập xong' },
      { id: 'sb4-t1', hanzi: '为了', pinyin: 'wèile', posTag: 'Giới từ mục đích', meaningHint: 'vì / để' },
      { id: 'sb4-t3', hanzi: '我', pinyin: 'wǒ', posTag: 'Chủ ngữ', meaningHint: 'tôi' },
    ],
    pedagogicalExplanation:
      'Giới từ “为了” + mục đích (明天的考试) đặt ở đầu câu; phó từ “已经” đi liền với bổ ngữ kết quả “复习好了” để nhấn mạnh hành động đã hoàn tất trọn vẹn.',
  },
  {
    id: 'sb-5',
    hskLevel: 'HSK 2–3',
    grammarPointTitle: 'Bổ ngữ trạng thái với trợ từ kết cấu 得 (V + 得 + 非常 + Adj)',
    grammarFormula: 'Bối cảnh + Chủ ngữ (Định ngữ + 的 + Danh từ) + Động từ + 得 + 非常 + Tính từ',
    vietnamesePrompt: 'Mùa xuân đến rồi, hoa trong vườn nở vô cùng đẹp.',
    targetSentence: '春天来了花园里的花开得非常漂亮。',
    targetPinyin: 'Chūntiān lái le huāyuán lǐ de huā kāi de fēicháng piàoliang.',
    tilesInCorrectOrder: [
      { id: 'sb5-t1', hanzi: '春天来了', pinyin: 'chūntiān lái le', posTag: 'Mệnh đề thời tiết', meaningHint: 'xuân đến rồi' },
      { id: 'sb5-t2', hanzi: '花园里的花', pinyin: 'huāyuán lǐ de huā', posTag: 'Chủ ngữ', meaningHint: 'hoa trong vườn' },
      { id: 'sb5-t3', hanzi: '开得', pinyin: 'kāi de', posTag: 'Động từ + 得', meaningHint: 'nở (đến mức)' },
      { id: 'sb5-t4', hanzi: '非常', pinyin: 'fēicháng', posTag: 'Phó từ mức độ', meaningHint: 'vô cùng' },
      { id: 'sb5-t5', hanzi: '漂亮', pinyin: 'piàoliang', posTag: 'Bổ ngữ trạng thái', meaningHint: 'đẹp' },
    ],
    shuffledTiles: [
      { id: 'sb5-t3', hanzi: '开得', pinyin: 'kāi de', posTag: 'Động từ + 得', meaningHint: 'nở (đến mức)' },
      { id: 'sb5-t5', hanzi: '漂亮', pinyin: 'piàoliang', posTag: 'Bổ ngữ trạng thái', meaningHint: 'đẹp' },
      { id: 'sb5-t2', hanzi: '花园里的花', pinyin: 'huāyuán lǐ de huā', posTag: 'Chủ ngữ', meaningHint: 'hoa trong vườn' },
      { id: 'sb5-t1', hanzi: '春天来了', pinyin: 'chūntiān lái le', posTag: 'Mệnh đề thời tiết', meaningHint: 'xuân đến rồi' },
      { id: 'sb5-t4', hanzi: '非常', pinyin: 'fēicháng', posTag: 'Phó từ mức độ', meaningHint: 'vô cùng' },
    ],
    pedagogicalExplanation:
      'Để miêu tả mức độ/trạng thái của động tác “开” (nở), bắt buộc dùng trợ từ kết cấu “得” ngay sau động từ: “开得非常漂亮”.',
  },
];

export function evaluateSentenceBuilderOrder(
  selectedTileIds: string[],
  challenge: Hsk3SentenceBuilderChallenge
): SentenceBuilderEvaluation {
  const expectedIds = challenge.tilesInCorrectOrder.map((t) => t.id);
  const tileLookup = new Map(
    challenge.tilesInCorrectOrder.map((t) => [t.id, t])
  );
  const assembledHanzi = selectedTileIds
    .map((id) => tileLookup.get(id)?.hanzi || '')
    .join('');

  if (selectedTileIds.length === 0) {
    return {
      isCorrect: false,
      score: 0,
      assembledHanzi: '',
      feedbackVi: 'Bạn chưa chọn thẻ từ nào. Hãy bấm vào các thẻ từ bên dưới để ghép thành câu hoàn chỉnh.',
      grammarDiagnostic: challenge.grammarFormula,
    };
  }

  const isExactLength = selectedTileIds.length === expectedIds.length;
  const exactMatches = selectedTileIds.filter(
    (id, index) => id === expectedIds[index]
  ).length;
  const isCorrect =
    isExactLength && exactMatches === expectedIds.length;

  if (isCorrect) {
    return {
      isCorrect: true,
      score: 100,
      assembledHanzi: `${assembledHanzi}。`,
      feedbackVi: `Chính xác 100%! Bạn đã nắm vững cấu trúc “${challenge.grammarPointTitle}”.`,
      grammarDiagnostic: challenge.pedagogicalExplanation,
    };
  }

  const partialScore = Math.max(
    15,
    Math.round((exactMatches / expectedIds.length) * 80)
  );

  return {
    isCorrect: false,
    score: partialScore,
    assembledHanzi,
    feedbackVi: `Đúng ${exactMatches}/${expectedIds.length} vị trí từ loại. Lưu ý công thức chuẩn: ${challenge.grammarFormula}.`,
    grammarDiagnostic: `${challenge.pedagogicalExplanation} → Câu chuẩn: “${challenge.targetSentence}”`,
  };
}

// ============================================================================
// DAILY STREAK & DAILY GOAL TRACKER (HOME DASHBOARD + LESSON / FLASHCARD / ARENA)
// ============================================================================

export type DailyGoalTarget = 5 | 10 | 20;

export interface DailyStudyProgress {
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  todayDate: string;      // YYYY-MM-DD
  dailyGoal: DailyGoalTarget;
  reviewedWordIdsToday: string[];
  reviewedCountToday: number;
}

export const STORAGE_KEY_DAILY_STUDY_PROGRESS = 'hanu_daily_study_progress_v1';

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayDateKey(date: Date = new Date()): string {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() - 1);
  return getLocalDateKey(copy);
}

export function getDailyStudyProgress(
  slides: VocabSlide[] = [],
  nowDate: Date = new Date()
): DailyStudyProgress {
  const todayKey = getLocalDateKey(nowDate);
  const yesterdayKey = getYesterdayDateKey(nowDate);
  void slides; // kept for API compatibility

  // A learner who hasn't reviewed anything yet has no streak and nothing done today.
  const fallback: DailyStudyProgress = {
    streakDays: 0,
    lastActiveDate: '',
    todayDate: todayKey,
    dailyGoal: 10,
    reviewedWordIdsToday: [],
    reviewedCountToday: 0,
  };

  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_DAILY_STUDY_PROGRESS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DAILY_STUDY_PROGRESS, JSON.stringify(fallback));
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<DailyStudyProgress>;
    const validGoal: DailyGoalTarget =
      parsed.dailyGoal === 5 || parsed.dailyGoal === 10 || parsed.dailyGoal === 20
        ? parsed.dailyGoal
        : 10;

    const storedToday = String(parsed.todayDate || '');
    const storedLastActive = String(parsed.lastActiveDate || '');
    const storedStreak = Math.max(0, Number(parsed.streakDays) || 0);

    if (storedToday === todayKey) {
      const ids = Array.isArray(parsed.reviewedWordIdsToday)
        ? parsed.reviewedWordIdsToday.map(String)
        : [];
      const count = Math.max(ids.length, Number(parsed.reviewedCountToday) || 0);
      return {
        streakDays: storedStreak,
        lastActiveDate: storedLastActive,
        todayDate: todayKey,
        dailyGoal: validGoal,
        reviewedWordIdsToday: ids,
        reviewedCountToday: count,
      };
    }

    // New day: the streak survives only if the learner actually reviewed words
    // yesterday (just opening the app doesn't count).
    const nextStreak = storedLastActive === yesterdayKey ? storedStreak : 0;
    const rolled: DailyStudyProgress = {
      streakDays: nextStreak,
      lastActiveDate: storedLastActive,
      todayDate: todayKey,
      dailyGoal: validGoal,
      reviewedWordIdsToday: [],
      reviewedCountToday: 0,
    };
    localStorage.setItem(STORAGE_KEY_DAILY_STUDY_PROGRESS, JSON.stringify(rolled));
    return rolled;
  } catch {
    return fallback;
  }
}

export function recordDailyWordReview(
  wordIdOrHanzi: string,
  slides: VocabSlide[] = [],
  nowDate: Date = new Date()
): DailyStudyProgress {
  const current = getDailyStudyProgress(slides, nowDate);
  const todayKey = getLocalDateKey(nowDate);
  const yesterdayKey = getYesterdayDateKey(nowDate);
  const cleanId = String(wordIdOrHanzi || '').trim();

  let nextStreak = current.streakDays;
  if (current.lastActiveDate !== todayKey) {
    nextStreak = current.lastActiveDate === yesterdayKey ? current.streakDays + 1 : 1;
  }

  const nextSet = new Set(current.reviewedWordIdsToday);
  const wasNewWordToday = cleanId ? !nextSet.has(cleanId) : true;
  if (cleanId) {
    nextSet.add(cleanId);
  }
  const nextIds = Array.from(nextSet);
  const nextCount = Math.max(
    nextIds.length,
    wasNewWordToday ? current.reviewedCountToday + 1 : current.reviewedCountToday
  );

  const updated: DailyStudyProgress = {
    streakDays: Math.max(1, nextStreak),
    lastActiveDate: todayKey,
    todayDate: todayKey,
    dailyGoal: current.dailyGoal,
    reviewedWordIdsToday: nextIds,
    reviewedCountToday: nextCount,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_STUDY_PROGRESS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('hanu_daily_progress_updated', { detail: updated }));
    } catch {
      // ignore storage errors
    }
  }
  return updated;
}

export function setDailyStudyGoal(
  goal: DailyGoalTarget,
  slides: VocabSlide[] = [],
  nowDate: Date = new Date()
): DailyStudyProgress {
  const current = getDailyStudyProgress(slides, nowDate);
  const validGoal: DailyGoalTarget = goal === 5 || goal === 10 || goal === 20 ? goal : 10;
  const updated: DailyStudyProgress = {
    ...current,
    dailyGoal: validGoal,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_STUDY_PROGRESS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('hanu_daily_progress_updated', { detail: updated }));
    } catch {
      // ignore storage errors
    }
  }
  return updated;
}

// ============================================================================
// SMART UNLEARNED WORDS FILTER & DIACRITIC-INSENSITIVE SEARCH (HOME DASHBOARD)
// ============================================================================

export function normalizeFoldedSearchText(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/ü/gi, 'v')
    .toLowerCase()
    .trim();
}

export function normalizePrimaryPartOfSpeech(rawPos?: string): string {
  const upper = (rawPos || '').toUpperCase().trim();
  if (!upper) return 'Khác';
  if (upper.includes('DANH TỪ')) return 'Danh từ';
  if (upper.includes('ĐỘNG TỪ')) return 'Động từ';
  if (upper.includes('TÍNH TỪ')) return 'Tính từ';
  if (upper.includes('ĐẠI TỪ')) return 'Đại từ';
  if (upper.includes('PHÓ TỪ')) return 'Phó từ';
  if (upper.includes('LƯỢNG TỪ')) return 'Lượng từ';
  if (upper.includes('LIÊN TỪ')) return 'Liên từ';
  if (upper.includes('GIỚI TỪ')) return 'Giới từ';
  if (upper.includes('TRỢ TỪ')) return 'Trợ từ';
  if (upper.includes('SỐ TỪ')) return 'Số từ';
  if (upper.includes('THÀNH NGỮ')) return 'Thành ngữ';
  const clean = rawPos!.trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export function extractUnlearnedPosCategories(slides: VocabSlide[]): string[] {
  const unlearned = slides.filter((s) => !s.learned);
  const seen = new Set<string>();
  for (const s of unlearned) {
    if (s.partOfSpeech) {
      seen.add(normalizePrimaryPartOfSpeech(s.partOfSpeech));
    }
  }
  return Array.from(seen);
}

export function filterUnlearnedSlides(
  slides: VocabSlide[],
  srsRecords: Record<string, SrsWordRecord>,
  options: {
    query?: string;
    filter?: string; // 'all' | 'hard' | 'new' | 'pos:<Category>'
  } = {}
): Array<{ s: VocabSlide; i: number; isHard: boolean; isNew: boolean }> {
  const rawQuery = (options.query || '').trim();
  const foldedQuery = normalizeFoldedSearchText(rawQuery);
  const compactFoldedQuery = foldedQuery.replace(/\s+/g, '');
  const activeFilter = options.filter || 'all';
  const targetPos = activeFilter.startsWith('pos:') ? activeFilter.slice(4) : '';

  return slides
    .map((s, i) => {
      const rec = srsRecords[s.id];
      const isHard = Boolean(
        rec &&
          (rec.inMistakeBook ||
            rec.rating === 'forgot' ||
            rec.rating === 'hard' ||
            rec.rating === 'again')
      );
      const isNew = !rec || (rec.reviewCount || 0) === 0;
      return { s, i, isHard, isNew };
    })
    .filter(({ s, isHard, isNew }) => {
      if (s.learned) return false;

      if (activeFilter === 'hard' && !isHard) return false;
      if (activeFilter === 'new' && !isNew) return false;
      if (targetPos && normalizePrimaryPartOfSpeech(s.partOfSpeech) !== targetPos) {
        return false;
      }

      if (!foldedQuery) return true;

      if (s.hanzi.includes(rawQuery)) return true;
      const foldedPinyin = normalizeFoldedSearchText(s.pinyin);
      if (foldedPinyin.includes(foldedQuery)) return true;
      if (compactFoldedQuery && foldedPinyin.replace(/\s+/g, '').includes(compactFoldedQuery)) {
        return true;
      }
      if (normalizeFoldedSearchText(s.meaning).includes(foldedQuery)) return true;
      if (s.hanViet && normalizeFoldedSearchText(s.hanViet).includes(foldedQuery)) return true;

      return false;
    });
}




