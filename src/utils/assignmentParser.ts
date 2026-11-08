import { appStore } from '../context/AppStoreContext';

export interface MultipleChoiceQ {
  id: string;
  type: 'meaning' | 'fill-blank';
  targetWord: string;
  question: string;
  pinyinSentence?: string;
  options: { key: string; label: string; isCorrect: boolean }[];
  explanation: string;
  grammarTip?: string;
}

export interface SentenceOrderingQ {
  id: string;
  targetWord: string;
  vietnameseMeaning: string;
  pinyin: string;
  correctTokens: string[];
  tokensShuffled: string[];
  explanation: string;
  grammarTip?: string;
  modelSentence?: string;
}

export interface EssayQ {
  id: string;
  targetWord: string;
  pinyin: string;
  meaning: string;
  suggestedPrompt: string;
  sampleSentence: string;
  samplePinyin: string;
  sampleTranslation: string;
  grammarFocus?: string;
}

export interface UploadedAssignmentPackage {
  id: string;
  fileName: string;
  fileType: 'docx' | 'pdf' | 'txt' | 'csv' | 'pasted';
  sessionTitle: string;
  sessionNumber: number;
  uploadedAt: string;
  dueDate: string;
  teacherName: string;
  rawContent?: string;
  multipleChoiceList: MultipleChoiceQ[];
  sentenceOrderingList: SentenceOrderingQ[];
  essayList: EssayQ[];
}

export const STORAGE_KEY_ASSIGNMENT = 'hanu_active_assignment_v2';

/** No assignment yet: every list is empty and the arena shows an empty state. */
export const EMPTY_ASSIGNMENT: UploadedAssignmentPackage = {
  id: '',
  fileName: '',
  fileType: 'pasted',
  sessionNumber: 0,
  sessionTitle: '',
  uploadedAt: '',
  dueDate: '',
  teacherName: '',
  multipleChoiceList: [],
  sentenceOrderingList: [],
  essayList: [],
};

export function countAssignmentQuestions(pkg: UploadedAssignmentPackage | null | undefined): number {
  if (!pkg) return 0;
  return (
    (pkg.multipleChoiceList?.length || 0) +
    (pkg.sentenceOrderingList?.length || 0) +
    (pkg.essayList?.length || 0)
  );
}

export function hasAssignmentQuestions(pkg: UploadedAssignmentPackage | null | undefined): boolean {
  return countAssignmentQuestions(pkg) > 0;
}

/** Template shown to teachers: the parser understands exactly this format. */
export const ASSIGNMENT_TEXT_TEMPLATE = `Câu 1: 春天来了，阳光非常____。
A. 温暖
B. 空调
C. 换
D. 初中
Đáp án: A

Sắp xếp: 我 / 每天 / 学习 / 汉语
Nghĩa: Tôi học tiếng Trung mỗi ngày.

Đặt câu: 温暖 (ấm áp)`;

const OPTION_LINE = /^\*?\s*([A-Da-d])\s*[.)．、:：]\s*(.+)$/;
const ANSWER_LINE = /^(?:đáp\s*án|dap\s*an|answer|答案)\s*[:：]?\s*([A-Da-d])\b/i;
const ORDER_LINE = /^(?:sắp\s*xếp|sap\s*xep|ghép\s*câu|排序)\s*[:：]\s*(.+)$/i;
const MEANING_LINE = /^(?:nghĩa|dịch|nghia)\s*[:：]\s*(.+)$/i;
const ESSAY_LINE = /^(?:đặt\s*câu|dat\s*cau|tự\s*luận|造句)(?:\s*với)?\s*[:：]\s*(.+)$/i;
const QUESTION_PREFIX = /^(?:câu|cau|question|q)\s*\d+\s*[.:：)\-]?\s*|^\d+\s*[.:：)\-]\s*/i;
const HANZI_RUN = /[㐀-鿿]+/;

function deterministicShuffle(tokens: string[]): string[] {
  if (tokens.length < 2) return [...tokens];
  // Rotate by roughly half, then swap neighbours: never returns the original order.
  const shift = Math.max(1, Math.floor(tokens.length / 2));
  const rotated = [...tokens.slice(shift), ...tokens.slice(0, shift)];
  for (let i = 0; i + 1 < rotated.length; i += 2) {
    [rotated[i], rotated[i + 1]] = [rotated[i + 1], rotated[i]];
  }
  return rotated.join('') === tokens.join('') ? [...tokens].reverse() : rotated;
}

export interface ParsedAssignmentResult {
  pkg: UploadedAssignmentPackage;
  /** Lines or questions that could not be used, explained in Vietnamese. */
  warnings: string[];
}

/**
 * Parses a teacher's assignment text into questions. Supported blocks
 * (see ASSIGNMENT_TEXT_TEMPLATE):
 *  - Multiple choice: "Câu 1: …" + options "A. …" … + "Đáp án: B" (or "*B. …")
 *  - Sentence ordering: "Sắp xếp: 我 / 每天 / 学习 / 汉语" (written in the correct order)
 *  - Sentence writing: "Đặt câu: 温暖 (ấm áp)"
 * Nothing is invented: text that matches none of these produces no questions.
 */
export function parseAssignmentContent(
  text: string,
  fileName: string,
  sessionTitle: string,
  options: { teacherName?: string; dueDate?: string } = {}
): ParsedAssignmentResult {
  const cleanName = fileName || 'Bai_tap.txt';
  const ext = (cleanName.split('.').pop() || '').toLowerCase();
  const fileType: UploadedAssignmentPackage['fileType'] =
    ext === 'docx' || ext === 'pdf' || ext === 'txt' || ext === 'csv' ? ext : 'pasted';
  const lines = (text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const mcList: MultipleChoiceQ[] = [];
  const soList: SentenceOrderingQ[] = [];
  const esList: EssayQ[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const orderMatch = line.match(ORDER_LINE);
    if (orderMatch) {
      const tokens = orderMatch[1]
        .split(/\s*[\/|｜]\s*/)
        .map((t) => t.trim())
        .filter(Boolean);
      const meaningMatch = lines[i + 1]?.match(MEANING_LINE);
      if (meaningMatch) i += 1;
      if (tokens.length < 2) {
        warnings.push(`Bỏ qua "${line}": cần ít nhất 2 phần, ngăn cách bằng dấu /.`);
        continue;
      }
      const sentence = tokens.join('');
      soList.push({
        id: `so-${soList.length + 1}`,
        targetWord: tokens.find((t) => HANZI_RUN.test(t) && t.length >= 2) || tokens[0],
        vietnameseMeaning: meaningMatch?.[1]?.trim() || '',
        pinyin: '',
        correctTokens: tokens,
        tokensShuffled: deterministicShuffle(tokens),
        explanation: '',
        modelSentence: sentence,
      });
      continue;
    }

    const essayMatch = line.match(ESSAY_LINE);
    if (essayMatch) {
      const body = essayMatch[1].trim();
      const word = body.match(HANZI_RUN)?.[0] || '';
      if (!word) {
        warnings.push(`Bỏ qua "${line}": không thấy từ tiếng Trung cần đặt câu.`);
        continue;
      }
      const meaning = body.replace(word, '').replace(/^[\s(（:：\-–]+|[\s)）]+$/g, '').trim();
      esList.push({
        id: `es-${esList.length + 1}`,
        targetWord: word,
        pinyin: '',
        meaning,
        suggestedPrompt: `Đặt một câu tiếng Trung có dùng từ “${word}”${meaning ? ` (${meaning})` : ''}.`,
        sampleSentence: '',
        samplePinyin: '',
        sampleTranslation: '',
      });
      continue;
    }

    const isQuestionStart = QUESTION_PREFIX.test(line) && OPTION_LINE.test(lines[i + 1] || '');
    if (isQuestionStart) {
      const question = line.replace(QUESTION_PREFIX, '').trim();
      const opts: { key: string; label: string; starred: boolean }[] = [];
      let j = i + 1;
      while (j < lines.length && OPTION_LINE.test(lines[j]) && opts.length < 6) {
        const m = lines[j].match(OPTION_LINE)!;
        opts.push({ key: m[1].toUpperCase(), label: m[2].trim(), starred: lines[j].startsWith('*') });
        j += 1;
      }
      let correctKey = opts.find((o) => o.starred)?.key || '';
      const answerMatch = lines[j]?.match(ANSWER_LINE);
      if (answerMatch) {
        correctKey = answerMatch[1].toUpperCase();
        j += 1;
      }
      i = j - 1;
      if (opts.length < 2) {
        warnings.push(`Bỏ qua câu "${question}": cần ít nhất 2 lựa chọn.`);
        continue;
      }
      if (!correctKey || !opts.some((o) => o.key === correctKey)) {
        warnings.push(`Bỏ qua câu "${question}": thiếu dòng "Đáp án: …".`);
        continue;
      }
      const correctLabel = opts.find((o) => o.key === correctKey)!.label;
      mcList.push({
        id: `mc-${mcList.length + 1}`,
        type: /_{2,}|（\s*）|\(\s*\)/.test(question) ? 'fill-blank' : 'meaning',
        targetWord: correctLabel.match(HANZI_RUN)?.[0] || question.match(HANZI_RUN)?.[0] || '',
        question,
        options: opts.map((o) => ({ key: o.key, label: o.label, isCorrect: o.key === correctKey })),
        explanation: '',
      });
    }
  }

  const now = new Date();
  return {
    pkg: {
      id: `assign-${now.getTime().toString(36)}`,
      fileName: cleanName,
      fileType,
      sessionNumber: 0,
      sessionTitle: sessionTitle.trim() || 'Bài tập',
      uploadedAt: now.toISOString(),
      dueDate: options.dueDate || '',
      teacherName: options.teacherName || '',
      rawContent: (text || '').substring(0, 500),
      multipleChoiceList: mcList,
      sentenceOrderingList: soList,
      essayList: esList,
    },
    warnings,
  };
}

/** Reads text from an uploaded assignment file (.txt, .csv, .md, .docx). */
export async function readAssignmentFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) return readDocxText(file);
  if (name.endsWith('.pdf') || name.endsWith('.doc')) {
    throw new Error(
      'Chưa đọc được file PDF/Word cũ (.doc). Hãy mở file, sao chép nội dung và dán vào ô "Dán văn bản".'
    );
  }
  return file.text();
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Trình duyệt này chưa hỗ trợ đọc .docx. Hãy dán nội dung vào ô "Dán văn bản".');
  }
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Minimal .docx reader: finds word/document.xml in the zip and keeps paragraph text. */
async function readDocxText(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('File .docx bị hỏng hoặc không đúng định dạng.');
  const entries = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  for (let n = 0; n < entries; n++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const entryName = decoder.decode(buf.subarray(ptr + 46, ptr + 46 + nameLen));
    ptr += 46 + nameLen + extraLen + commentLen;
    if (entryName !== 'word/document.xml') continue;
    const lNameLen = view.getUint16(localOffset + 26, true);
    const lExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    const xml = decoder.decode(method === 0 ? raw : await inflateRaw(raw));
    return xml
      .replace(/<w:tab\/>/g, ' ')
      .replace(/<w:br\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
  throw new Error('Không tìm thấy nội dung trong file .docx.');
}

/**
 * The assignment currently given to the class, or EMPTY_ASSIGNMENT when the
 * teacher has not assigned anything yet.
 */
export function getStoredAssignment(): UploadedAssignmentPackage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSIGNMENT);
    if (raw) {
      const parsed = JSON.parse(raw) as UploadedAssignmentPackage;
      if (parsed && hasAssignmentQuestions(parsed) && !LEGACY_SAMPLE_IDS.has(parsed.id)) {
        return {
          ...EMPTY_ASSIGNMENT,
          ...parsed,
          multipleChoiceList: parsed.multipleChoiceList || [],
          sentenceOrderingList: parsed.sentenceOrderingList || [],
          essayList: parsed.essayList || [],
        };
      }
    }
  } catch {
    // Fall through to "no assignment"
  }
  return EMPTY_ASSIGNMENT;
}

/** Ids of the sample assignments older versions stored automatically. */
export const LEGACY_SAMPLE_IDS = new Set(['assign-b14', 'assign-b15']);

/**
 * Save active assignment and broadcast event to sync role views in real-time
 */
export function saveStoredAssignment(pkg: UploadedAssignmentPackage): void {
  try {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENT, JSON.stringify(pkg));
    appStore.notifyAssignmentUpdated(pkg);
  } catch {
    // Ignore storage quota errors
  }
}

export interface AssignmentAnswerKey {
  assignmentId: string;
  teacherUid: string;
  multipleChoiceAnswers: Record<string, string>;
  sentenceOrderingAnswers: Record<string, string[]>;
  essayModels: Record<
    string,
    {
      targetWord: string;
      sampleSentence: string;
    }
  >;
  maxAttempts: number;
  updatedAt: string;
}

/**
 * Extracts the confidential answer key from a teacher's assignment package so it can be stored
 * separately in `/classes/{classId}/answerKeys/{assignmentId}` (readable ONLY by the class teacher and server).
 */
export function extractAssignmentAnswerKey(
  pkg: UploadedAssignmentPackage,
  teacherUid: string,
  maxAttempts = 1
): AssignmentAnswerKey {
  const multipleChoiceAnswers: Record<string, string> = {};
  for (const mc of pkg.multipleChoiceList || []) {
    const correctOpt = (mc.options || []).find((o) => o.isCorrect);
    if (correctOpt) {
      multipleChoiceAnswers[mc.id] = correctOpt.key;
    }
  }

  const sentenceOrderingAnswers: Record<string, string[]> = {};
  for (const so of pkg.sentenceOrderingList || []) {
    sentenceOrderingAnswers[so.id] = Array.isArray(so.correctTokens)
      ? [...so.correctTokens]
      : [];
  }

  const essayModels: Record<string, { targetWord: string; sampleSentence: string }> = {};
  for (const es of pkg.essayList || []) {
    essayModels[es.id] = {
      targetWord: es.targetWord || '',
      sampleSentence: es.sampleSentence || '',
    };
  }

  return {
    assignmentId: pkg.id || 'default-assignment',
    teacherUid,
    multipleChoiceAnswers,
    sentenceOrderingAnswers,
    essayModels,
    maxAttempts: Math.max(1, Math.floor(maxAttempts)),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Strips confidential answer key fields (`isCorrect`, `correctTokens`, `modelSentence`, `sampleSentence`)
 * from an assignment before publishing it to `/classes/{classId}/assignments/{assignmentId}`.
 */
export function sanitizeAssignmentForPublic(
  pkg: UploadedAssignmentPackage
): UploadedAssignmentPackage {
  return {
    ...pkg,
    multipleChoiceList: (pkg.multipleChoiceList || []).map((mc) => ({
      ...mc,
      options: (mc.options || []).map((opt) => ({
        key: opt.key,
        label: opt.label,
        isCorrect: false,
      })),
    })),
    sentenceOrderingList: (pkg.sentenceOrderingList || []).map((so) => ({
      ...so,
      correctTokens: [],
      modelSentence: '',
    })),
    essayList: (pkg.essayList || []).map((es) => ({
      ...es,
      sampleSentence: '',
    })),
  };
}

/**
 * Grades a student's submission on the server against the confidential `AssignmentAnswerKey`.
 */
export function gradeSubmissionWithAnswerKey(params: {
  answerKey: AssignmentAnswerKey;
  answers: Record<string, unknown>;
  assignment?: Partial<UploadedAssignmentPackage> | null;
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
  const { answerKey, answers, assignment } = params;
  const mcAnswers =
    (answers?.mcAnswers as Record<string, string> | undefined) ||
    (answers as Record<string, string>) ||
    {};
  const selectedTokensMap =
    (answers?.selectedTokensMap as Record<string, string[]> | undefined) || {};
  const essayAnswers =
    (answers?.essayAnswers as Record<string, string> | undefined) || {};

  let correctCount = 0;
  let totalQuestions = 0;
  const reviewWordsSet = new Set<string>();

  const mcTargetWordById: Record<string, string> = {};
  for (const q of assignment?.multipleChoiceList || []) {
    if (q?.id && q?.targetWord) mcTargetWordById[q.id] = q.targetWord;
  }
  const soTargetWordById: Record<string, string> = {};
  for (const q of assignment?.sentenceOrderingList || []) {
    if (q?.id && q?.targetWord) soTargetWordById[q.id] = q.targetWord;
  }

  for (const [qId, correctKey] of Object.entries(answerKey.multipleChoiceAnswers || {})) {
    totalQuestions += 1;
    const submittedKey = String(mcAnswers[qId] ?? (answers as any)?.[qId] ?? '').trim();
    if (submittedKey && submittedKey.toUpperCase() === String(correctKey).trim().toUpperCase()) {
      correctCount += 1;
    } else if (mcTargetWordById[qId]) {
      reviewWordsSet.add(mcTargetWordById[qId]);
    }
  }

  for (const [qId, expectedTokens] of Object.entries(answerKey.sentenceOrderingAnswers || {})) {
    if (!Array.isArray(expectedTokens) || expectedTokens.length === 0) continue;
    totalQuestions += 1;
    const rawSubmitted = selectedTokensMap[qId] ?? (answers as any)?.[qId];
    const submittedSentence = Array.isArray(rawSubmitted)
      ? rawSubmitted.join('').replace(/\s+/g, '')
      : String(rawSubmitted || '').replace(/\s+/g, '');
    const expectedSentence = expectedTokens.join('').replace(/\s+/g, '');
    if (submittedSentence && submittedSentence === expectedSentence) {
      correctCount += 1;
    } else if (soTargetWordById[qId]) {
      reviewWordsSet.add(soTargetWordById[qId]);
    }
  }

  for (const [qId, model] of Object.entries(answerKey.essayModels || {})) {
    totalQuestions += 1;
    const submittedText = String(essayAnswers[qId] ?? (answers as any)?.[qId] ?? '').trim();
    const targetWord = (model?.targetWord || '').trim();
    if (
      submittedText.length >= 2 &&
      (!targetWord || submittedText.includes(targetWord))
    ) {
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
      : `Hoàn thành xuất sắc bài tập (${score}/100đ — ${correctCount}/${totalQuestions} câu đúng), được chấm tự động trên Server.`;

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

