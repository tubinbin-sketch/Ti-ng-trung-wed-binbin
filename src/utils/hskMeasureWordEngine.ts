import { VocabSlide } from '../data/chineseData';

export interface MeasureWordChallengeItem {
  id: string;
  nounHanzi: string;
  nounPinyin: string;
  nounMeaning: string;
  hskLevel: string;
  correctMeasureWord: string;
  correctMeasurePinyin: string;
  phraseHanzi: string;
  phrasePinyin: string;
  phraseMeaning: string;
  sentencePrefix: string;
  sentenceSuffix: string;
  fullSentenceHanzi: string;
  fullSentencePinyin: string;
  fullSentenceMeaning: string;
  options: {
    measureWord: string;
    pinyin: string;
    usageHint: string;
  }[];
  explanationVi: string;
}

export interface MeasureWordEvalResult {
  isCorrect: boolean;
  selectedMeasureWord: string;
  correctMeasureWord: string;
  fullPhrase: string;
  scoreDelta: number;
  feedbackVi: string;
}

const CURATED_MEASURE_WORD_BANK: MeasureWordChallengeItem[] = [
  {
    id: 'mw-kongtiao',
    nounHanzi: '空调',
    nounPinyin: 'kōng tiáo',
    nounMeaning: 'máy điều hòa',
    hskLevel: 'HSK 3',
    correctMeasureWord: '台',
    correctMeasurePinyin: 'tái',
    phraseHanzi: '一台空调',
    phrasePinyin: 'yì tái kōng tiáo',
    phraseMeaning: 'một chiếc máy điều hòa',
    sentencePrefix: '夏天太热了，我们家新买了一',
    sentenceSuffix: '空调。',
    fullSentenceHanzi: '夏天太热了，我们家新买了一台空调。',
    fullSentencePinyin: 'Xià tiān tài rè le, wǒ men jiā xīn mǎi le yì tái kōng tiáo.',
    fullSentenceMeaning: 'Mùa hè nóng quá, nhà chúng tôi mới mua một chiếc điều hòa.',
    options: [
      { measureWord: '台', pinyin: 'tái', usageHint: 'Dùng cho máy móc, thiết bị điện tử (điều hòa, máy giặt, máy tính)' },
      { measureWord: '件', pinyin: 'jiàn', usageHint: 'Dùng cho quần áo, sự việc, hành lý' },
      { measureWord: '座', pinyin: 'zuò', usageHint: 'Dùng cho tòa nhà, ngọn núi, cây cầu, khu vườn lớn' },
      { measureWord: '张', pinyin: 'zhāng', usageHint: 'Dùng cho vật có bề mặt phẳng (bàn, giấy, vé, ảnh)' },
    ],
    explanationVi: '“台 (tái)” là lượng từ chuẩn HSK 3.0 chuyên đi với máy móc và thiết bị điện gia dụng như 空调 (điều hòa), 洗衣机 (máy giặt), 电脑 (máy tính).',
  },
  {
    id: 'mw-huayuan',
    nounHanzi: '花园',
    nounPinyin: 'huā yuán',
    nounMeaning: 'khu vườn hoa',
    hskLevel: 'HSK 3',
    correctMeasureWord: '座',
    correctMeasurePinyin: 'zuò',
    phraseHanzi: '一座花园',
    phrasePinyin: 'yí zuò huā yuán',
    phraseMeaning: 'một khu vườn hoa',
    sentencePrefix: '学校后面有一',
    sentenceSuffix: '非常漂亮的花园。',
    fullSentenceHanzi: '学校后面有一座非常漂亮的花园。',
    fullSentencePinyin: 'Xué xiào hòu miàn yǒu yí zuò fēi cháng piào liang de huā yuán.',
    fullSentenceMeaning: 'Phía sau trường học có một khu vườn hoa vô cùng đẹp.',
    options: [
      { measureWord: '座', pinyin: 'zuò', usageHint: 'Dùng cho công trình, kiến trúc, khu vườn, tòa nhà, ngọn núi' },
      { measureWord: '台', pinyin: 'tái', usageHint: 'Dùng cho thiết bị điện tử, máy móc' },
      { measureWord: '条', pinyin: 'tiáo', usageHint: 'Dùng cho vật thon dài (con đường, dòng sông, con cá)' },
      { measureWord: '场', pinyin: 'chǎng', usageHint: 'Dùng cho trận mưa, kỳ thi, buổi biểu diễn' },
    ],
    explanationVi: '“座 (zuò)” dùng cho các công trình kiến trúc cố định hoặc khuôn viên rộng như 一座花园 (một khu vườn), 一座城市 (một thành phố), 一座桥 (một cây cầu).',
  },
  {
    id: 'mw-kaoshi',
    nounHanzi: '考试',
    nounPinyin: 'kǎo shì',
    nounMeaning: 'kỳ thi, bài kiểm tra',
    hskLevel: 'HSK 2',
    correctMeasureWord: '场',
    correctMeasurePinyin: 'chǎng',
    phraseHanzi: '一场考试',
    phrasePinyin: 'yì chǎng kǎo shì',
    phraseMeaning: 'một kỳ thi',
    sentencePrefix: '明天上午我们有一',
    sentenceSuffix: '重要的汉语考试。',
    fullSentenceHanzi: '明天上午我们有一场重要的汉语考试。',
    fullSentencePinyin: 'Míng tiān shàng wǔ wǒ men yǒu yì chǎng zhòng yào de Hàn yǔ kǎo shì.',
    fullSentenceMeaning: 'Sáng ngày mai chúng tôi có một kỳ thi tiếng Trung quan trọng.',
    options: [
      { measureWord: '场', pinyin: 'chǎng', usageHint: 'Dùng cho sự kiện có thời lượng (kỳ thi, trận mưa, trận bóng)' },
      { measureWord: '本', pinyin: 'běn', usageHint: 'Dùng cho sách vở, từ điển, tạp chí' },
      { measureWord: '支', pinyin: 'zhī', usageHint: 'Dùng cho vật hình que như bút viết' },
      { measureWord: '把', pinyin: 'bǎ', usageHint: 'Dùng cho vật có tay cầm (ô, ghế, chìa khóa)' },
    ],
    explanationVi: '“场 (chǎng)” dùng làm lượng từ cho các hoạt động, sự kiện diễn ra trong một khoảng thời gian như 一场考试 (một kỳ thi), 一场雨 (một trận mưa), 一场电影 (một suất chiếu phim).',
  },
  {
    id: 'mw-banfa',
    nounHanzi: '办法',
    nounPinyin: 'bàn fǎ',
    nounMeaning: 'cách làm, biện pháp',
    hskLevel: 'HSK 3',
    correctMeasureWord: '个',
    correctMeasurePinyin: 'gè',
    phraseHanzi: '一个好办法',
    phrasePinyin: 'yí gè hǎo bàn fǎ',
    phraseMeaning: 'một biện pháp hay',
    sentencePrefix: '别着急，咱们一定能想出一',
    sentenceSuffix: '好办法。',
    fullSentenceHanzi: '别着急，咱们一定能想出一个好办法。',
    fullSentencePinyin: 'Bié zháo jí, zán men yí dìng néng xiǎng chū yí gè hǎo bàn fǎ.',
    fullSentenceMeaning: 'Đừng sốt ruột, chúng ta nhất định sẽ nghĩ ra một cách giải quyết hay.',
    options: [
      { measureWord: '个', pinyin: 'gè', usageHint: 'Lượng từ phổ thông cho người, ý tưởng, biện pháp (一个办法)' },
      { measureWord: '辆', pinyin: 'liàng', usageHint: 'Dùng cho xe cộ có bánh (xe đạp, ô tô)' },
      { measureWord: '杯', pinyin: 'bēi', usageHint: 'Dùng cho cốc, tách đồ uống (cà phê, trà)' },
      { measureWord: '双', pinyin: 'shuāng', usageHint: 'Dùng cho đôi, cặp (đôi giày, đôi đũa)' },
    ],
    explanationVi: 'Danh từ trừu tượng chỉ ý kiến, phương pháp như 办法 (biện pháp), 问题 (vấn đề), 想法 (suy nghĩ) kết hợp tự nhiên nhất với lượng từ “个 (gè)” hoặc “种 (zhǒng)”.',
  },
  {
    id: 'mw-kafei',
    nounHanzi: '咖啡',
    nounPinyin: 'kā fēi',
    nounMeaning: 'cà phê',
    hskLevel: 'HSK 2',
    correctMeasureWord: '杯',
    correctMeasurePinyin: 'bēi',
    phraseHanzi: '一杯热咖啡',
    phrasePinyin: 'yì bēi rè kā fēi',
    phraseMeaning: 'một tách cà phê nóng',
    sentencePrefix: '天冷的时候，喝一',
    sentenceSuffix: '热咖啡让人觉得很温暖。',
    fullSentenceHanzi: '天冷的时候，喝一杯热咖啡让人觉得很温暖。',
    fullSentencePinyin: 'Tiān lěng de shí hou, hē yì bēi rè kā fēi ràng rén jué de hěn wēn nuǎn.',
    fullSentenceMeaning: 'Khi trời lạnh, uống một tách cà phê nóng khiến người ta cảm thấy rất ấm áp.',
    options: [
      { measureWord: '杯', pinyin: 'bēi', usageHint: 'Dùng cho đồ uống đựng trong cốc/tách (一杯咖啡, 一杯茶)' },
      { measureWord: '条', pinyin: 'tiáo', usageHint: 'Dùng cho vật thon dài' },
      { measureWord: '件', pinyin: 'jiàn', usageHint: 'Dùng cho áo quần, sự việc' },
      { measureWord: '台', pinyin: 'tái', usageHint: 'Dùng cho máy móc, thiết bị' },
    ],
    explanationVi: '“杯 (bēi)” là lượng từ chỉ cốc/ly/tách đồ uống: 一杯咖啡 (một tách cà phê), 一杯茶 (một tách trà), 一杯水 (một cốc nước).',
  },
  {
    id: 'mw-long',
    nounHanzi: '龙',
    nounPinyin: 'lóng',
    nounMeaning: 'con rồng phương Đông',
    hskLevel: 'HSK 4',
    correctMeasureWord: '条',
    correctMeasurePinyin: 'tiáo',
    phraseHanzi: '一条金龙',
    phrasePinyin: 'yì tiáo jīn lóng',
    phraseMeaning: 'một con rồng vàng',
    sentencePrefix: '画上有一',
    sentenceSuffix: '栩栩如生的中国龙。',
    fullSentenceHanzi: '画上有一条栩栩如生的中国龙。',
    fullSentencePinyin: 'Huà shàng yǒu yì tiáo xǔ xǔ rú shēng de Zhōng guó lóng.',
    fullSentenceMeaning: 'Trên bức tranh có một con rồng Trung Hoa sống động như thật.',
    options: [
      { measureWord: '条', pinyin: 'tiáo', usageHint: 'Dùng cho sinh vật/vật thể uốn lượn thon dài (rồng, cá, sông, đường)' },
      { measureWord: '只', pinyin: 'zhī', usageHint: 'Dùng cho động vật nhỏ (mèo, chim)' },
      { measureWord: '座', pinyin: 'zuò', usageHint: 'Dùng cho tòa nhà, ngọn núi' },
      { measureWord: '张', pinyin: 'zhāng', usageHint: 'Dùng cho mặt phẳng (tranh, bàn, giấy)' },
    ],
    explanationVi: 'Trong tiếng Trung, rồng (龙), cá (鱼), rắn (蛇), sông (河) và con đường (路) đều có hình dáng thon dài uốn lượn nên bắt buộc dùng lượng từ “条 (tiáo)”.',
  },
];

export function generateMeasureWordChallenges(slides?: VocabSlide[]): MeasureWordChallengeItem[] {
  if (!Array.isArray(slides) || slides.length === 0) {
    return CURATED_MEASURE_WORD_BANK;
  }
  const slideHanziSet = new Set(slides.map((s) => s.hanzi));
  const prioritized = CURATED_MEASURE_WORD_BANK.filter((item) =>
    slideHanziSet.has(item.nounHanzi)
  );
  const remaining = CURATED_MEASURE_WORD_BANK.filter(
    (item) => !slideHanziSet.has(item.nounHanzi)
  );
  return [...prioritized, ...remaining];
}

export function evaluateMeasureWordAttempt(
  challenge: MeasureWordChallengeItem,
  selectedMeasureWord: string
): MeasureWordEvalResult {
  const cleanSelected = String(selectedMeasureWord || '').trim();
  const isCorrect = cleanSelected === challenge.correctMeasureWord;
  return {
    isCorrect,
    selectedMeasureWord: cleanSelected,
    correctMeasureWord: challenge.correctMeasureWord,
    fullPhrase: challenge.phraseHanzi,
    scoreDelta: isCorrect ? 10 : 0,
    feedbackVi: isCorrect
      ? `Chính xác! Cụm chuẩn HSK 3.0 là “${challenge.phraseHanzi}” (${challenge.phrasePinyin} — ${challenge.phraseMeaning}). ${challenge.explanationVi}`
      : `Chưa chính xác. Với danh từ “${challenge.nounHanzi}” (${challenge.nounMeaning}), lượng từ chuẩn phải là “${challenge.correctMeasureWord}” (${challenge.correctMeasurePinyin}) → ${challenge.phraseHanzi}. ${challenge.explanationVi}`,
  };
}
