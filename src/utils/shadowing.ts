/**
 * Shadowing (跟读): listen to a native-speed sentence and repeat it right away.
 * This module builds the sentence library from everything the learner already
 * has — lesson slides, the built-in dictionary, the current assignment, a
 * graded bank for HSK 1–6 and the learner's own passages — and keeps progress.
 */
import type { VocabSlide } from '../data/chineseData';
import type { UploadedAssignmentPackage } from './assignmentParser';
import type { SmartDictEntry } from './chineseEngine';

export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;
export const HSK_LEVELS: HskLevel[] = [1, 2, 3, 4, 5, 6];

export type ShadowSource = 'lesson' | 'assignment' | 'dictionary' | 'library' | 'custom';

export interface ShadowSentence {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  level: HskLevel;
  source: ShadowSource;
  /** Short label of where the sentence came from (word, lesson, passage). */
  sourceLabel: string;
}

export interface ShadowLevelPreset {
  /** Speech rate for the model sentence. */
  rate: number;
  /** Pause after the model, as a multiple of its duration (time to repeat). */
  pauseFactor: number;
  showPinyin: boolean;
  label: string;
}

/** Beginners hear slower audio, get longer pauses and see pinyin by default. */
export const LEVEL_PRESETS: Record<HskLevel, ShadowLevelPreset> = {
  1: { rate: 0.7, pauseFactor: 1.8, showPinyin: true, label: 'Chậm, có pinyin' },
  2: { rate: 0.75, pauseFactor: 1.7, showPinyin: true, label: 'Chậm, có pinyin' },
  3: { rate: 0.85, pauseFactor: 1.5, showPinyin: true, label: 'Vừa' },
  4: { rate: 0.9, pauseFactor: 1.4, showPinyin: false, label: 'Gần tốc độ thật' },
  5: { rate: 1, pauseFactor: 1.3, showPinyin: false, label: 'Tốc độ thật' },
  6: { rate: 1, pauseFactor: 1.2, showPinyin: false, label: 'Tốc độ thật' },
};

/** "HSK 2–3" → 2, "HSK 7-9" → 6, anything unknown → null. */
export function parseHskLevel(raw: string | undefined | null): HskLevel | null {
  const match = String(raw || '').match(/(\d)/);
  if (!match) return null;
  const n = Math.min(6, Math.max(1, Number(match[1])));
  return n as HskLevel;
}

const HANZI = /[㐀-鿿]/;

/** Lesson examples are word-segmented ("咱们 一起 看"); join the words back for reading. */
export function tidyChineseSpacing(text: string): string {
  return (text || '')
    .trim()
    .replace(/([\u3400-\u9fff\u3000-\u303f\uff00-\uffef])\s+(?=[\u3400-\u9fff\u3000-\u303f\uff00-\uffef])/g, '$1');
}

function normalizeSentence(text: string): string {
  return (text || '').replace(/\s+/g, '').trim();
}

/** Split a pasted passage into sentences that are short enough to shadow. */
export function splitIntoShadowSentences(text: string): string[] {
  return (text || '')
    .replace(/\r/g, '')
    .replace(/([。！？!?；;])/g, '$1\n')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter((part) => HANZI.test(part) && part.length <= 80);
}

/** Graded sentences so every level has material even before a lesson exists. */
export const SHADOWING_LIBRARY: Array<Omit<ShadowSentence, 'id' | 'source' | 'sourceLabel'>> = [
  { level: 1, hanzi: '你好，我叫王明。', pinyin: 'Nǐ hǎo, wǒ jiào Wáng Míng.', meaning: 'Xin chào, tôi tên là Vương Minh.' },
  { level: 1, hanzi: '我是越南人。', pinyin: 'Wǒ shì Yuènán rén.', meaning: 'Tôi là người Việt Nam.' },
  { level: 1, hanzi: '今天星期几？', pinyin: 'Jīntiān xīngqī jǐ?', meaning: 'Hôm nay là thứ mấy?' },
  { level: 1, hanzi: '我想喝茶。', pinyin: 'Wǒ xiǎng hē chá.', meaning: 'Tôi muốn uống trà.' },
  { level: 1, hanzi: '你家有几口人？', pinyin: 'Nǐ jiā yǒu jǐ kǒu rén?', meaning: 'Nhà bạn có mấy người?' },
  { level: 1, hanzi: '现在几点了？', pinyin: 'Xiànzài jǐ diǎn le?', meaning: 'Bây giờ là mấy giờ rồi?' },
  { level: 1, hanzi: '我在学校学习汉语。', pinyin: 'Wǒ zài xuéxiào xuéxí Hànyǔ.', meaning: 'Tôi học tiếng Trung ở trường.' },
  { level: 1, hanzi: '这个多少钱？', pinyin: 'Zhège duōshao qián?', meaning: 'Cái này bao nhiêu tiền?' },
  { level: 1, hanzi: '明天见！', pinyin: 'Míngtiān jiàn!', meaning: 'Hẹn mai gặp!' },
  { level: 1, hanzi: '他是我的老师。', pinyin: 'Tā shì wǒ de lǎoshī.', meaning: 'Anh ấy là thầy giáo của tôi.' },

  { level: 2, hanzi: '我每天早上七点起床。', pinyin: 'Wǒ měitiān zǎoshang qī diǎn qǐchuáng.', meaning: 'Mỗi sáng tôi dậy lúc bảy giờ.' },
  { level: 2, hanzi: '你会说汉语吗？', pinyin: 'Nǐ huì shuō Hànyǔ ma?', meaning: 'Bạn biết nói tiếng Trung không?' },
  { level: 2, hanzi: '今天比昨天冷。', pinyin: 'Jīntiān bǐ zuótiān lěng.', meaning: 'Hôm nay lạnh hơn hôm qua.' },
  { level: 2, hanzi: '我已经吃过饭了。', pinyin: 'Wǒ yǐjīng chīguo fàn le.', meaning: 'Tôi ăn cơm rồi.' },
  { level: 2, hanzi: '从这儿到机场要多长时间？', pinyin: 'Cóng zhèr dào jīchǎng yào duō cháng shíjiān?', meaning: 'Từ đây đến sân bay mất bao lâu?' },
  { level: 2, hanzi: '因为下雨，所以我没去。', pinyin: 'Yīnwèi xià yǔ, suǒyǐ wǒ méi qù.', meaning: 'Vì trời mưa nên tôi không đi.' },
  { level: 2, hanzi: '你可以帮我一下吗？', pinyin: 'Nǐ kěyǐ bāng wǒ yíxià ma?', meaning: 'Bạn giúp tôi một chút được không?' },
  { level: 2, hanzi: '我觉得这件衣服很漂亮。', pinyin: 'Wǒ juéde zhè jiàn yīfu hěn piàoliang.', meaning: 'Tôi thấy bộ quần áo này rất đẹp.' },
  { level: 2, hanzi: '他正在看电视呢。', pinyin: 'Tā zhèngzài kàn diànshì ne.', meaning: 'Anh ấy đang xem tivi.' },
  { level: 2, hanzi: '我们一起去跑步吧。', pinyin: 'Wǒmen yìqǐ qù pǎobù ba.', meaning: 'Chúng ta cùng đi chạy bộ nhé.' },

  { level: 3, hanzi: '我对中国文化很感兴趣。', pinyin: 'Wǒ duì Zhōngguó wénhuà hěn gǎn xìngqù.', meaning: 'Tôi rất hứng thú với văn hóa Trung Quốc.' },
  { level: 3, hanzi: '你把作业写完了吗？', pinyin: 'Nǐ bǎ zuòyè xiěwán le ma?', meaning: 'Bạn làm xong bài tập chưa?' },
  { level: 3, hanzi: '虽然很累，但是我很开心。', pinyin: 'Suīrán hěn lèi, dànshì wǒ hěn kāixīn.', meaning: 'Tuy rất mệt nhưng tôi rất vui.' },
  { level: 3, hanzi: '我的手机被弟弟拿走了。', pinyin: 'Wǒ de shǒujī bèi dìdi názǒu le.', meaning: 'Điện thoại của tôi bị em trai lấy mất rồi.' },
  { level: 3, hanzi: '只要努力，就一定能成功。', pinyin: 'Zhǐyào nǔlì, jiù yídìng néng chénggōng.', meaning: 'Chỉ cần cố gắng thì nhất định sẽ thành công.' },
  { level: 3, hanzi: '这个问题越想越难。', pinyin: 'Zhège wèntí yuè xiǎng yuè nán.', meaning: 'Vấn đề này càng nghĩ càng khó.' },
  { level: 3, hanzi: '周末我打算去爬山。', pinyin: 'Zhōumò wǒ dǎsuàn qù pá shān.', meaning: 'Cuối tuần tôi định đi leo núi.' },
  { level: 3, hanzi: '请你再说一遍，好吗？', pinyin: 'Qǐng nǐ zài shuō yí biàn, hǎo ma?', meaning: 'Bạn nói lại một lần nữa được không?' },
  { level: 3, hanzi: '他除了英语以外，还会说法语。', pinyin: 'Tā chúle Yīngyǔ yǐwài, hái huì shuō Fǎyǔ.', meaning: 'Ngoài tiếng Anh, anh ấy còn biết nói tiếng Pháp.' },
  { level: 3, hanzi: '我一到家就给你打电话。', pinyin: 'Wǒ yí dào jiā jiù gěi nǐ dǎ diànhuà.', meaning: 'Tôi về đến nhà là gọi cho bạn ngay.' },

  { level: 4, hanzi: '无论遇到什么困难，我们都不要放弃。', pinyin: 'Wúlùn yùdào shénme kùnnan, wǒmen dōu bú yào fàngqì.', meaning: 'Dù gặp khó khăn gì, chúng ta cũng đừng bỏ cuộc.' },
  { level: 4, hanzi: '这次考试的结果让我很失望。', pinyin: 'Zhè cì kǎoshì de jiéguǒ ràng wǒ hěn shīwàng.', meaning: 'Kết quả kỳ thi lần này làm tôi rất thất vọng.' },
  { level: 4, hanzi: '他不仅聪明，而且非常努力。', pinyin: 'Tā bùjǐn cōngming, érqiě fēicháng nǔlì.', meaning: 'Anh ấy không chỉ thông minh mà còn rất chăm chỉ.' },
  { level: 4, hanzi: '我们应该按照计划完成任务。', pinyin: 'Wǒmen yīnggāi ànzhào jìhuà wánchéng rènwu.', meaning: 'Chúng ta nên hoàn thành nhiệm vụ theo kế hoạch.' },
  { level: 4, hanzi: '关于这个问题，我想听听大家的意见。', pinyin: 'Guānyú zhège wèntí, wǒ xiǎng tīngting dàjiā de yìjiàn.', meaning: 'Về vấn đề này, tôi muốn nghe ý kiến mọi người.' },
  { level: 4, hanzi: '既然你已经决定了，那就去做吧。', pinyin: 'Jìrán nǐ yǐjīng juédìng le, nà jiù qù zuò ba.', meaning: 'Bạn đã quyết định rồi thì cứ làm đi.' },
  { level: 4, hanzi: '由于天气原因，航班推迟了。', pinyin: 'Yóuyú tiānqì yuányīn, hángbān tuīchí le.', meaning: 'Do thời tiết, chuyến bay bị hoãn.' },
  { level: 4, hanzi: '学习语言最重要的是坚持。', pinyin: 'Xuéxí yǔyán zuì zhòngyào de shì jiānchí.', meaning: 'Điều quan trọng nhất khi học ngôn ngữ là kiên trì.' },
  { level: 4, hanzi: '你最好提前十分钟到。', pinyin: 'Nǐ zuìhǎo tíqián shí fēnzhōng dào.', meaning: 'Bạn nên đến sớm mười phút.' },
  { level: 4, hanzi: '这本小说值得一读。', pinyin: 'Zhè běn xiǎoshuō zhídé yì dú.', meaning: 'Cuốn tiểu thuyết này đáng đọc.' },

  { level: 5, hanzi: '随着科技的发展，人们的生活越来越方便。', pinyin: 'Suízhe kējì de fāzhǎn, rénmen de shēnghuó yuè lái yuè fāngbiàn.', meaning: 'Khoa học kỹ thuật phát triển, cuộc sống ngày càng tiện lợi.' },
  { level: 5, hanzi: '他做事一向很谨慎，从来不马虎。', pinyin: 'Tā zuò shì yíxiàng hěn jǐnshèn, cónglái bù mǎhu.', meaning: 'Anh ấy làm việc luôn cẩn thận, chưa bao giờ qua loa.' },
  { level: 5, hanzi: '与其抱怨，不如想办法解决问题。', pinyin: 'Yǔqí bàoyuàn, bùrú xiǎng bànfǎ jiějué wèntí.', meaning: 'Thay vì than phiền, chi bằng nghĩ cách giải quyết vấn đề.' },
  { level: 5, hanzi: '这家公司的产品在国内外都很受欢迎。', pinyin: 'Zhè jiā gōngsī de chǎnpǐn zài guónèiwài dōu hěn shòu huānyíng.', meaning: 'Sản phẩm của công ty này được ưa chuộng cả trong và ngoài nước.' },
  { level: 5, hanzi: '只有不断学习，才能跟上时代的变化。', pinyin: 'Zhǐyǒu búduàn xuéxí, cái néng gēnshang shídài de biànhuà.', meaning: 'Chỉ có không ngừng học hỏi mới theo kịp thay đổi của thời đại.' },
  { level: 5, hanzi: '她说话的语气让人感到很温暖。', pinyin: 'Tā shuōhuà de yǔqì ràng rén gǎndào hěn wēnnuǎn.', meaning: 'Giọng nói của cô ấy khiến người ta thấy ấm áp.' },
  { level: 5, hanzi: '我们必须珍惜有限的资源。', pinyin: 'Wǒmen bìxū zhēnxī yǒuxiàn de zīyuán.', meaning: 'Chúng ta phải trân trọng nguồn tài nguyên có hạn.' },
  { level: 5, hanzi: '尽管条件很艰苦，他们还是完成了任务。', pinyin: 'Jǐnguǎn tiáojiàn hěn jiānkǔ, tāmen háishi wánchéng le rènwu.', meaning: 'Dù điều kiện gian khổ, họ vẫn hoàn thành nhiệm vụ.' },

  { level: 6, hanzi: '这项研究为解决环境问题提供了新的思路。', pinyin: 'Zhè xiàng yánjiū wèi jiějué huánjìng wèntí tígōng le xīn de sīlù.', meaning: 'Nghiên cứu này mở ra hướng mới để giải quyết vấn đề môi trường.' },
  { level: 6, hanzi: '面对挫折，我们要保持积极乐观的心态。', pinyin: 'Miànduì cuòzhé, wǒmen yào bǎochí jījí lèguān de xīntài.', meaning: 'Khi gặp thất bại, chúng ta cần giữ tinh thần tích cực, lạc quan.' },
  { level: 6, hanzi: '他的演讲深入浅出，令人印象深刻。', pinyin: 'Tā de yǎnjiǎng shēnrù qiǎnchū, lìng rén yìnxiàng shēnkè.', meaning: 'Bài diễn thuyết của anh ấy dễ hiểu mà sâu sắc, rất ấn tượng.' },
  { level: 6, hanzi: '传统文化需要在继承中不断创新。', pinyin: 'Chuántǒng wénhuà xūyào zài jìchéng zhōng búduàn chuàngxīn.', meaning: 'Văn hóa truyền thống cần không ngừng đổi mới trong khi kế thừa.' },
  { level: 6, hanzi: '这个决定是经过反复讨论才做出的。', pinyin: 'Zhège juédìng shì jīngguò fǎnfù tǎolùn cái zuòchū de.', meaning: 'Quyết định này được đưa ra sau nhiều lần thảo luận.' },
  { level: 6, hanzi: '城市化进程给农村带来了巨大的变化。', pinyin: 'Chéngshìhuà jìnchéng gěi nóngcūn dàilái le jùdà de biànhuà.', meaning: 'Quá trình đô thị hóa mang lại thay đổi to lớn cho nông thôn.' },
  { level: 6, hanzi: '一个人的成就往往取决于他的态度。', pinyin: 'Yí gè rén de chéngjiù wǎngwǎng qǔjué yú tā de tàidu.', meaning: 'Thành tựu của một người thường phụ thuộc vào thái độ của họ.' },
  { level: 6, hanzi: '我们不能忽视细节对结果的影响。', pinyin: 'Wǒmen bù néng hūshì xìjié duì jiéguǒ de yǐngxiǎng.', meaning: 'Chúng ta không thể xem nhẹ ảnh hưởng của chi tiết tới kết quả.' },
];

export interface CustomShadowPassage {
  id: string;
  title: string;
  level: HskLevel;
  sentences: string[];
  createdAt: string;
}

/**
 * Collect every sentence available for shadowing. Lesson and assignment
 * sentences come first so new lessons show up automatically; duplicates
 * (same characters) keep the first source.
 */
export function buildShadowingLibrary(params: {
  slides: VocabSlide[];
  dictionary?: Record<string, SmartDictEntry>;
  assignment?: UploadedAssignmentPackage | null;
  customPassages?: CustomShadowPassage[];
  fallbackLevel?: HskLevel;
}): ShadowSentence[] {
  const { slides, dictionary = {}, assignment, customPassages = [], fallbackLevel = 3 } = params;
  const seen = new Set<string>();
  const out: ShadowSentence[] = [];
  const push = (item: ShadowSentence) => {
    const key = normalizeSentence(item.hanzi);
    if (!key || !HANZI.test(key) || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };

  customPassages.forEach((passage) => {
    passage.sentences.forEach((hanzi, i) =>
      push({
        id: `custom-${passage.id}-${i}`,
        hanzi,
        pinyin: '',
        meaning: '',
        level: passage.level,
        source: 'custom',
        sourceLabel: passage.title,
      })
    );
  });

  slides.forEach((slide) => {
    if (!slide.exampleHanzi) return;
    push({
      id: `lesson-${slide.id}`,
      hanzi: tidyChineseSpacing(slide.exampleHanzi),
      pinyin: slide.examplePinyin || '',
      meaning: slide.exampleMeaning || '',
      level: parseHskLevel(slide.hskLevel) || fallbackLevel,
      source: 'lesson',
      sourceLabel: slide.hanzi,
    });
  });

  if (assignment) {
    const title = assignment.sessionTitle || 'Bài tập';
    assignment.sentenceOrderingList.forEach((q) => {
      const sentence = q.modelSentence || q.correctTokens.join('');
      if (!sentence) return;
      push({
        id: `assign-${assignment.id}-${q.id}`,
        hanzi: sentence,
        pinyin: q.pinyin || '',
        meaning: q.vietnameseMeaning || '',
        level: fallbackLevel,
        source: 'assignment',
        sourceLabel: title,
      });
    });
    assignment.essayList.forEach((q) => {
      if (!q.sampleSentence) return;
      push({
        id: `assign-${assignment.id}-${q.id}`,
        hanzi: q.sampleSentence,
        pinyin: q.samplePinyin || '',
        meaning: q.sampleTranslation || '',
        level: fallbackLevel,
        source: 'assignment',
        sourceLabel: title,
      });
    });
  }

  Object.entries(dictionary).forEach(([word, entry]) => {
    if (!entry?.exampleHanzi) return;
    push({
      id: `dict-${word}`,
      hanzi: tidyChineseSpacing(entry.exampleHanzi),
      pinyin: entry.examplePinyin || '',
      meaning: entry.exampleMeaning || '',
      level: parseHskLevel(entry.hskLevel) || fallbackLevel,
      source: 'dictionary',
      sourceLabel: word,
    });
  });

  SHADOWING_LIBRARY.forEach((item, i) =>
    push({ ...item, id: `lib-${item.level}-${i}`, source: 'library', sourceLabel: `Câu mẫu HSK ${item.level}` })
  );

  return out;
}

export const SOURCE_LABELS: Record<ShadowSource, string> = {
  lesson: 'Bài học',
  assignment: 'Bài tập',
  dictionary: 'Từ điển',
  library: 'Câu mẫu',
  custom: 'Của bạn',
};

// ---------------------------------------------------------------------------
// Progress & preferences (local to this browser)
// ---------------------------------------------------------------------------

export interface ShadowProgressEntry {
  best: number;
  attempts: number;
  lastAt: string;
}

const PROGRESS_KEY = 'hanu_shadowing_progress_v1';
const LEVEL_KEY = 'hanu_shadowing_level_v1';
const CUSTOM_KEY = 'hanu_shadowing_custom_v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: progress just isn't remembered
  }
}

export function loadShadowProgress(): Record<string, ShadowProgressEntry> {
  return readJson<Record<string, ShadowProgressEntry>>(PROGRESS_KEY, {});
}

export function recordShadowAttempt(
  progress: Record<string, ShadowProgressEntry>,
  sentenceId: string,
  score: number | null
): Record<string, ShadowProgressEntry> {
  const prev = progress[sentenceId];
  const next = {
    ...progress,
    [sentenceId]: {
      best: Math.max(prev?.best ?? 0, score ?? 0),
      attempts: (prev?.attempts ?? 0) + 1,
      lastAt: new Date().toISOString(),
    },
  };
  writeJson(PROGRESS_KEY, next);
  return next;
}

export function loadShadowLevel(): HskLevel | null {
  return parseHskLevel(readJson<string | null>(LEVEL_KEY, null));
}

export function saveShadowLevel(level: HskLevel): void {
  writeJson(LEVEL_KEY, String(level));
}

export function loadCustomPassages(): CustomShadowPassage[] {
  const list = readJson<CustomShadowPassage[]>(CUSTOM_KEY, []);
  return Array.isArray(list) ? list.filter((p) => p && Array.isArray(p.sentences)) : [];
}

export function saveCustomPassages(list: CustomShadowPassage[]): void {
  writeJson(CUSTOM_KEY, list);
}

/** The level with the most lesson sentences: a sensible starting point. */
export function suggestStartingLevel(slides: VocabSlide[]): HskLevel {
  const counts = new Map<HskLevel, number>();
  slides.forEach((s) => {
    const lv = parseHskLevel(s.hskLevel);
    if (lv) counts.set(lv, (counts.get(lv) || 0) + 1);
  });
  let best: HskLevel = 1;
  let bestCount = -1;
  counts.forEach((count, lv) => {
    if (count > bestCount) {
      best = lv;
      bestCount = count;
    }
  });
  return best;
}
