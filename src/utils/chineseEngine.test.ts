import test from 'node:test';
import assert from 'node:assert/strict';
import {
  autoGradeClassSession,
  evaluateSentenceOrder,
  evaluateStrokeSimilarity,
  evaluateStrokeWithFeedback,
  createCustomVocabSlide,
  applyStudentSubmissionToRoster,
  awardStudentBonusPoints,
  generateBinBinSmartReply,
  normalizeSearchText,
  parseBatchSlideInput,
  parseQuickSlideInput,
  repairAndUpgradeSlide,
  searchInstantVocabSuggestions,
  shuffleTokensDeterministic,
  updateLeaderboardWithScore,
  createStudentRecord,
  filterClassroomStudents,
  generateStudentsCsvContent,
} from './chineseEngine';
import { INITIAL_CLASS_SESSIONS, INITIAL_LEADERBOARD } from '../data/chineseData';
import {
  getPreferredSpeechRate,
  setPreferredSpeechRate,
  getPreferredStrokeSpeedMs,
  setPreferredStrokeSpeedMs,
  selectBestChineseVoice,
} from './speech';

test('evaluateSentenceOrder validates exact Chinese token sequence', () => {
  const target = ['这是', '我的爸爸', '和妈妈'];
  const right = evaluateSentenceOrder(['这是', '我的爸爸', '和妈妈'], target);
  assert.equal(right.isCorrect, true);
  assert.equal(right.scoreDelta, 1);

  const wrong = evaluateSentenceOrder(['我的爸爸', '这是', '和妈妈'], target);
  assert.equal(wrong.isCorrect, false);
  assert.equal(wrong.scoreDelta, 0);
});

test('shuffleTokensDeterministic scrambles order without losing tokens', () => {
  const original = ['今天', '天气', '怎么样？'];
  const scrambled = shuffleTokensDeterministic(original, 2);
  assert.equal(scrambled.length, original.length);
  assert.notDeepEqual(scrambled, original);
  assert.deepEqual([...scrambled].sort(), [...original].sort());
});

test('evaluateStrokeSimilarity rejects tiny taps and scores valid strokes', () => {
  const tooShort = evaluateStrokeSimilarity(
    [[10, 10], [11, 11]],
    [[10, 10], [80, 10]]
  );
  assert.equal(tooShort.passed, false);

  const goodStroke = evaluateStrokeSimilarity(
    [[25, 15], [36, 25]],
    [[26, 16], [35, 24]]
  );
  assert.equal(goodStroke.passed, true);
  assert.ok(goodStroke.accuracy >= 85);
});

test('parseQuickSlideInput and parseBatchSlideInput create valid VocabSlides', () => {
  const slide = parseQuickSlideInput('冰箱 | bīng xiāng | tủ lạnh | 家里 有 冰箱。', 9);
  assert.ok(slide !== null);
  assert.equal(slide.hanzi, '冰箱');
  assert.equal(slide.pinyin, 'bīng xiāng');
  assert.equal(slide.meaning, 'tủ lạnh');
  assert.equal(slide.index, 9);

  const batch = parseBatchSlideInput(
    '愿意 | yuàn yì | bằng lòng | 我很愿意帮助你。\n聪明 | cōng míng | thông minh | 他很聪明。',
    10
  );
  assert.equal(batch.length, 2);
  assert.equal(batch[0].hanzi, '愿意');
  assert.equal(batch[1].hanzi, '聪明');
  assert.equal(batch[1].index, 11);
});

test('autoGradeClassSession marks homework assigned, full submissions, and calculates average score', () => {
  const rawSession = INITIAL_CLASS_SESSIONS[1]; // session 14, ungraded
  const graded = autoGradeClassSession(rawSession);
  assert.equal(graded.autoGraded, true);
  assert.equal(graded.homeworkAssigned, true);
  assert.equal(graded.submissionsCount, rawSession.totalStudents);
  assert.ok(typeof graded.averageScore === 'number' && graded.averageScore >= 8.5);
});

test('updateLeaderboardWithScore increments existing student score and sorts leaderboard', () => {
  const updated = updateLeaderboardWithScore(INITIAL_LEADERBOARD, 'Trần Quốc Bảo', 3);
  assert.equal(updated[0].studentName, 'Trần Quốc Bảo');
  assert.equal(updated[0].score, 4);
});

test('parseBatchSlideInput auto-generates full slide with stroke order and illustration from bare Hanzi', () => {
  const autoSlides = parseBatchSlideInput('龙, 老师', 12);
  assert.equal(autoSlides.length, 2);
  assert.equal(autoSlides[0].hanzi, '龙');
  assert.equal(autoSlides[0].pinyin, 'lóng');
  assert.equal(autoSlides[0].illustrationKey, 'long');
  assert.ok(autoSlides[0].characters[0].strokes.length >= 4);
  assert.equal(autoSlides[1].hanzi, '老师');
  assert.equal(autoSlides[1].illustrationKey, 'laoshi');
});

test('parseQuickSlideInput accurately resolves 温暖, 幸福, and 咖啡 with exact Pinyin, Hán Việt, meaning, and stroke counts', () => {
  const wennuan = parseQuickSlideInput('温暖', 12);
  assert.ok(wennuan !== null);
  assert.equal(wennuan.hanzi, '温暖');
  assert.equal(wennuan.pinyin, 'wēn nuǎn');
  assert.equal(wennuan.hanViet, 'ôn noãn');
  assert.equal(wennuan.meaning, 'ấm áp, đầm ấm');
  assert.equal(wennuan.illustrationKey, 'wennuan');
  assert.equal(wennuan.characters.length, 2);
  assert.equal(wennuan.characters[0].char, '温');
  assert.equal(wennuan.characters[0].strokeCount, 12);
  assert.equal(wennuan.characters[1].char, '暖');
  assert.equal(wennuan.characters[1].strokeCount, 13);

  const xingfu = parseQuickSlideInput('幸福', 13);
  assert.ok(xingfu !== null);
  assert.equal(xingfu.pinyin, 'xìng fú');
  assert.equal(xingfu.hanViet, 'hạnh phúc');
  assert.notEqual(xingfu.pinyin, 'hàn zì');

  const kafei = parseQuickSlideInput('咖啡', 14);
  assert.ok(kafei !== null);
  assert.equal(kafei.pinyin, 'kā fēi');
  assert.equal(kafei.meaning, 'cà phê');
  assert.equal(kafei.illustrationKey, 'kafei');
});

test('generateBinBinSmartReply provides persona-accurate Bin Bin responses for all 4 quick actions', () => {
  const wennuan = parseQuickSlideInput('温暖', 12)!;
  const mnemonic = generateBinBinSmartReply('mnemonic', 'Giải thích mẹo nhớ', wennuan);
  assert.ok(mnemonic.replyText.includes('Bin Bin'));
  assert.ok(mnemonic.replyText.includes('bạn'));
  assert.ok(mnemonic.replyText.includes('温暖'));
  assert.ok(mnemonic.chinesePhrase.length > 0);
  assert.ok(mnemonic.pinyinPhrase.length > 0);

  const dialogue = generateBinBinSmartReply('dialogue', 'Luyện hội thoại', wennuan);
  assert.ok(dialogue.chinesePhrase.includes('彬彬'));
  assert.ok(dialogue.pinyinPhrase.includes('Bīnbīn'));

  const grammarFix = generateBinBinSmartReply('grammar-fix', '我非常温暖今天', wennuan);
  assert.ok(grammarFix.replyText.includes('Bin Bin'));
  assert.ok(grammarFix.replyText.includes('我非常温暖今天'));

  const hint = generateBinBinSmartReply('quiz-hint', 'Gợi ý đáp án', wennuan, {
    prompt: 'Sắp xếp thành “Đây là bố và mẹ của tôi”',
    grammarHint: 'Đây là... (这是...)',
    pinyinHint: 'Zhè shì wǒ de bàba hé māma',
  });
  assert.ok(hint.replyText.includes('Bin Bin'));
  assert.ok(hint.replyText.includes('Zhè shì wǒ de bàba hé māma'));
});

test('searchInstantVocabSuggestions matches by Vietnamese meaning, tone-free Pinyin, Hán Việt, Hanzi, and topic filter', () => {
  assert.equal(normalizeSearchText('wēn nuǎn · Ấm Áp'), 'wen nuan · am ap');

  const byMeaning = searchInstantVocabSuggestions('ấm áp');
  assert.ok(byMeaning.length > 0);
  assert.equal(byMeaning[0].hanzi, '温暖');
  assert.equal(byMeaning[0].pinyin, 'wēn nuǎn');

  const byToneFreePinyin = searchInstantVocabSuggestions('xingfu');
  assert.ok(byToneFreePinyin.length > 0);
  assert.equal(byToneFreePinyin[0].hanzi, '幸福');
  assert.equal(byToneFreePinyin[0].hanViet, 'hạnh phúc');

  const byHanViet = searchInstantVocabSuggestions('cà phê');
  assert.ok(byHanViet.length > 0);
  assert.equal(byHanViet[0].hanzi, '咖啡');

  const bySchoolTopic = searchInstantVocabSuggestions('', { topic: 'school', limit: 5 });
  assert.ok(bySchoolTopic.length > 0);
  assert.ok(bySchoolTopic.every((item) => item.topicTag === 'school'));
});

test('setPreferredSpeechRate and setPreferredStrokeSpeedMs clamp and persist slide speed settings', () => {
  setPreferredSpeechRate(1.25);
  assert.equal(getPreferredSpeechRate(), 1.25);
  setPreferredSpeechRate(2.5); // clamps to 1.5
  assert.equal(getPreferredSpeechRate(), 1.5);
  setPreferredSpeechRate(0.2); // clamps to 0.5
  assert.equal(getPreferredSpeechRate(), 0.5);
  setPreferredSpeechRate(0.8);

  setPreferredStrokeSpeedMs(420);
  assert.equal(getPreferredStrokeSpeedMs(), 420);
  setPreferredStrokeSpeedMs(100); // clamps to 300
  assert.equal(getPreferredStrokeSpeedMs(), 300);
  setPreferredStrokeSpeedMs(1800); // clamps to 1200
  assert.equal(getPreferredStrokeSpeedMs(), 1200);
  setPreferredStrokeSpeedMs(660);
});

test('createStudentRecord, filterClassroomStudents, and generateStudentsCsvContent work accurately', () => {
  const s0 = createStudentRecord({ name: 'Lê Hoàng Nam', hskLevel: 'HSK 2' });
  assert.equal(s0.name, 'Lê Hoàng Nam');
  assert.match(s0.studentCode, /^HV-[A-Z0-9]{6}$/);
  assert.equal(s0.totalPoints, 0);
  assert.equal(s0.vocabScore, '');
  assert.equal(s0.writingScore, '');
  assert.equal(s0.quizScore, '');
  assert.equal(s0.feedback, '');
  assert.equal(s0.status, 'Chưa nộp');
  assert.equal(s0.timeSeconds, 0);
  assert.equal(s0.streak, 0);

  const s1 = createStudentRecord(
    { name: 'Nguyễn Minh Châu', hskLevel: 'HSK 3', initialPoints: 96 },
    12
  );
  assert.equal(s1.name, 'Nguyễn Minh Châu');
  assert.match(s1.studentCode, /^HV-[A-Z0-9]{6}$/);
  assert.equal(s1.hskLevel, 'HSK 3');
  assert.equal(s1.totalPoints, 96);
  assert.equal(s1.status, 'Đã chấm tự động');

  const s2 = createStudentRecord(
    { name: 'Phạm Gia Bảo', studentCode: 'HV-9K8M2P', hskLevel: 'HSK 1', initialPoints: 82 },
    13
  );
  assert.equal(s2.studentCode, 'HV-9K8M2P');
  assert.equal(s2.status, 'Cần kèm thêm');

  const roster = [s1, s2];
  assert.equal(filterClassroomStudents(roster, 'Chau', 'all').length, 1);
  assert.equal(filterClassroomStudents(roster, '', 'completed').length, 1);
  assert.equal(filterClassroomStudents(roster, '', 'needs_support').length, 1);

  const csv = generateStudentsCsvContent(roster);
  assert.ok(csv.startsWith('\uFEFFSTT,Mã học viên,Họ và tên,Cấp độ'));
  assert.ok(csv.includes('Nhận xét & Chữa lỗi chi tiết'));
  assert.equal(csv.includes('Nhận xét AI'), false);
  assert.ok(csv.includes('Nguyễn Minh Châu'));
  assert.ok(csv.includes('HV-9K8M2P'));
  assert.ok(csv.includes('Cần kèm thêm'));
});

test('evaluateStrokeWithFeedback, createCustomVocabSlide, applyStudentSubmissionToRoster, and awardStudentBonusPoints work accurately', () => {
  const strokeEval = evaluateStrokeWithFeedback(
    [[25, 15], [36, 25]],
    [[26, 16], [35, 24]],
    1,
    5
  );
  assert.equal(strokeEval.passed, true);
  assert.ok(strokeEval.accuracy >= 85);
  assert.ok(strokeEval.feedback.includes('Nét thứ 1/5'));

  const customSlide = createCustomVocabSlide(
    {
      hanzi: '熊猫',
      pinyin: 'xióng māo',
      hanViet: 'hùng miêu',
      meaning: 'gấu trúc',
      exampleHanzi: '熊猫 喜欢 吃 竹子。',
      exampleMeaning: 'Gấu trúc thích ăn trúc.',
    },
    19
  );
  assert.ok(customSlide !== null);
  assert.equal(customSlide.hanzi, '熊猫');
  assert.equal(customSlide.pinyin, 'xióng māo');
  assert.equal(customSlide.hanViet, 'hùng miêu');
  assert.equal(customSlide.meaning, 'gấu trúc');
  assert.equal(customSlide.exampleHanzi, '熊猫 喜欢 吃 竹子。');

  const baseRoster = [
    createStudentRecord({ name: 'Lưu Thị Minh Thư', initialPoints: 92 }, 1),
    createStudentRecord({ name: 'Vũ Minh Đức', initialPoints: 85 }, 2),
  ];

  const afterSubmit = applyStudentSubmissionToRoster(baseRoster, {
    studentName: 'Lưu Thị Minh Thư',
    totalScore: 98,
    learnedVocabCount: 17,
    totalVocabCount: 18,
    writingAccuracy: 96,
    quizCorrectCount: 10,
    quizTotalCount: 10,
    reviewWords: ['空调', '刻'],
  });
  assert.equal(afterSubmit[0].totalPoints, 98);
  assert.equal(afterSubmit[0].vocabScore, '17/18 từ');
  assert.deepEqual(afterSubmit[0].reviewWords, ['空调', '刻']);

  const afterBonus = awardStudentBonusPoints(afterSubmit, 'Vũ Minh Đức', 10, 'Vòng quay gọi tên');
  assert.equal(afterBonus[1].totalPoints, 95);
  assert.equal(afterBonus[1].status, 'Đã chấm tự động');
});

test('selectBestChineseVoice prioritizes natural zh-CN voices like Xiaoxiao, Yunxi, or Ting-Ting', () => {
  const mockVoices = [
    { name: 'English US', lang: 'en-US' },
    { name: 'Generic Chinese', lang: 'zh-CN' },
    { name: 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)', lang: 'zh-CN' },
  ] as unknown as SpeechSynthesisVoice[];

  const chosen = selectBestChineseVoice(mockVoices);
  assert.ok(chosen !== null);
  assert.ok(chosen.name.includes('Xiaoxiao'));
});

test('generateBinBinSmartReply analyzes 交通 and Vietnamese queries in 0ms with full wordCard, radical mnemonic, 2 compound words, and example sentence', () => {
  const start = performance.now();
  const jiaotongReply = generateBinBinSmartReply('chat', '交通');
  const elapsedMs = performance.now() - start;

  assert.ok(elapsedMs < 50, `Expected instant <50ms response, got ${elapsedMs}ms`);
  assert.ok(jiaotongReply.wordCard);
  assert.equal(jiaotongReply.wordCard.hanzi, '交通');
  assert.equal(jiaotongReply.wordCard.pinyin, 'jiāo tōng');
  assert.equal(jiaotongReply.wordCard.hanViet, 'giao thông');
  assert.ok(jiaotongReply.wordCard.meaning.includes('giao thông'));
  assert.ok(jiaotongReply.wordCard.radicalMnemonic.includes('交'));
  assert.ok(jiaotongReply.wordCard.radicalMnemonic.includes('通'));
  assert.equal(jiaotongReply.wordCard.compoundWords.length, 2);
  assert.equal(jiaotongReply.wordCard.compoundWords[0].hanzi, '公共交通');
  assert.equal(jiaotongReply.wordCard.compoundWords[1].hanzi, '交通工具');
  assert.ok(jiaotongReply.chinesePhrase.includes('交通'));

  const vnLookupReply = generateBinBinSmartReply('chat', 'giao thông');
  assert.ok(vnLookupReply.wordCard);
  assert.equal(vnLookupReply.wordCard.hanzi, '交通');
});

test('parseQuickSlideInput and parseBatchSlideInput never concatenate character meanings or generate robotic examples for 明天, 照顾, 考试, 坚持, 包容, 融会贯通', () => {
  const mingtian = parseQuickSlideInput('明天', 19)!;
  assert.equal(mingtian.meaning, 'ngày mai');
  assert.equal(mingtian.meaning.includes('·'), false);
  assert.equal(mingtian.exampleHanzi, '明天 我们 一起 去 北京 看 长城 吧！');
  assert.equal(mingtian.exampleHanzi.includes('我们今天一起学习'), false);

  const zhaogu = parseQuickSlideInput('照顾', 20)!;
  assert.equal(zhaogu.meaning, 'chăm sóc, quan tâm');
  assert.equal(zhaogu.exampleHanzi, '妈妈 一直 很 细心地 照顾 我们。');

  const kaoshi = parseQuickSlideInput('考试', 21)!;
  assert.equal(kaoshi.meaning, 'kỳ thi, thi cử');
  assert.equal(kaoshi.exampleHanzi, '祝 你 明天的 汉语 考试 取得 好 成绩！');

  const batch = parseBatchSlideInput('明天, 考试, 照顾, 旅行', 1);
  assert.equal(batch.length, 4);
  assert.equal(batch[0].meaning, 'ngày mai');
  assert.equal(batch[1].meaning, 'kỳ thi, thi cử');
  assert.equal(batch[2].meaning, 'chăm sóc, quan tâm');
  assert.equal(batch[3].meaning, 'du lịch, chuyến đi xa');

  // Verify repairAndUpgradeSlide fixes legacy cached slides
  const repaired = repairAndUpgradeSlide({
    ...mingtian,
    meaning: 'sáng sủa, rõ ràng · bầu trời, ngày',
    exampleHanzi: '我们今天一起学习“明天”这个词。',
    exampleMeaning: 'Hôm nay chúng ta cùng học từ “明天” (sáng sủa, rõ ràng · bầu trời, ngày).',
  });
  assert.equal(repaired.meaning, 'ngày mai');
  assert.equal(repaired.exampleHanzi, '明天 我们 一起 去 北京 看 长城 吧！');
  assert.equal(repaired.exampleHanzi.includes('我们今天一起学习'), false);
});

test('generateBinBinSmartReply Practical AI Copilot provides authentic collocations for 初中, synonym distinctions, 2 examples, sentence correction, and 5 teacher exercises without mechanical 学习初中/常用初中', () => {
  const chuzhongSlide = parseQuickSlideInput('初中', 7)!;
  const reply = generateBinBinSmartReply('chat', '初中', chuzhongSlide);

  // Never produce fake mechanical collocations
  assert.equal(reply.replyText.includes('学习初中'), false);
  assert.equal(reply.replyText.includes('常用初中'), false);

  // Verify authentic collocations: 上初中, 初中生, 初中毕业
  assert.ok(reply.collocations && reply.collocations.length === 3);
  assert.equal(reply.collocations[0].hanzi, '上初中');
  assert.equal(reply.collocations[1].hanzi, '初中生');
  assert.equal(reply.collocations[2].hanzi, '初中毕业');

  // Verify synonym distinction: 初中 vs 高中
  assert.ok(reply.synonymDistinction);
  assert.ok(reply.synonymDistinction.title.includes('初中'));
  assert.ok(reply.synonymDistinction.title.includes('高中'));

  // Verify 2 example sentences
  assert.ok(reply.examples && reply.examples.length === 2);
  assert.ok(reply.examples[0].hanzi.includes('初中'));
  assert.ok(reply.examples[1].hanzi.includes('初中'));

  // Verify slidePayload for 1-click Add to Slide button
  assert.ok(reply.slidePayload);
  assert.equal(reply.slidePayload.hanzi, '初中');

  // Verify Teacher 5-question exercise generation
  const quizGen = generateBinBinSmartReply(
    'quiz-gen',
    'Tạo 5 câu bài tập điền từ với 初中',
    chuzhongSlide
  );
  assert.ok(quizGen.teacherExercise);
  assert.equal(quizGen.teacherExercise.items.length, 5);
  assert.equal(quizGen.teacherExercise.items[0].answer, '初中');

  // Verify Sentence Correction & Bilingual Translation
  const fixReply = generateBinBinSmartReply('grammar-fix', '我非常温暖今天', chuzhongSlide);
  assert.ok(fixReply.sentenceCorrection);
  assert.equal(fixReply.sentenceCorrection.isAlreadyCorrect, false);
  assert.equal(fixReply.sentenceCorrection.correctedHanzi, '今天我感到非常温暖。');
});

test('repairAndUpgradeSlide migrates legacy 既哦 to 既然 and preserves learned status', () => {
  const legacySlide = {
    id: 'slide-25',
    index: 25,
    hanzi: '既哦',
    pinyin: 'jì é',
    hanViet: 'ký nga',
    meaning: 'sai chính tả',
    partOfSpeech: 'TỪ VỰNG',
    hskLevel: 'HSK 3',
    usageNote: 'lỗi cũ',
    exampleHanzi: '既哦 例子',
    examplePinyin: 'Jì é lìzi',
    exampleMeaning: 'Ví dụ lỗi',
    illustrationKey: 'school' as const,
    learned: true,
    characters: [],
  };

  const upgraded = repairAndUpgradeSlide(legacySlide);
  assert.equal(upgraded.hanzi, '既然');
  assert.equal(upgraded.pinyin, 'jì rán');
  assert.equal(upgraded.hanViet, 'ký nhiên');
  assert.equal(upgraded.hskLevel, 'HSK 3');
  assert.equal(upgraded.learned, true); // PRESERVED!
  assert.equal(upgraded.characters.length, 2);
  assert.equal(upgraded.characters[0].char, '既');
  assert.equal(upgraded.characters[1].char, '然');
  assert.ok(upgraded.exampleHanzi.includes('既然'));
});

test('generateBinBinSmartReply avoids duplicate text bullets and detects synonym misuse & missing target word in grammar-fix', () => {
  const wennuanSlide = parseQuickSlideInput('温暖', 11)!; // 温暖
  const defaultReply = generateBinBinSmartReply('chat', '温暖', wennuanSlide);

  // Should not duplicate Collocations or Synonym Distinction in plain replyText
  assert.equal(defaultReply.replyText.includes('Kết hợp từ chuẩn (Collocations):'), false);
  assert.equal(defaultReply.replyText.includes('Phân biệt từ dễ nhầm:'), false);
  assert.ok(defaultReply.collocations && defaultReply.collocations.length > 0);
  assert.ok(defaultReply.synonymDistinction && defaultReply.synonymDistinction.items.length > 1);

  // Detect synonym misuse: 今天天气很温暖 -> suggests 暖和
  const weatherMisuse = generateBinBinSmartReply(
    'grammar-fix',
    '今天天气很温暖',
    wennuanSlide
  );
  assert.ok(weatherMisuse.sentenceCorrection);
  assert.equal(weatherMisuse.sentenceCorrection.isAlreadyCorrect, false);
  assert.ok(weatherMisuse.sentenceCorrection.correctedHanzi.includes('暖和'));

  // Detect missing target word when learner types a sentence without 温暖
  const missingTarget = generateBinBinSmartReply(
    'grammar-fix',
    '我今天去学校看书',
    wennuanSlide
  );
  assert.ok(missingTarget.sentenceCorrection);
  assert.equal(missingTarget.sentenceCorrection.isAlreadyCorrect, false);
  assert.ok(missingTarget.sentenceCorrection.explanation.includes('温暖'));
});

test('applyStudentSubmissionToRoster updates timeSeconds and increments streak, and calculateStudentHsk3Pillars links all 4 HSK 3.0 pillars dynamically', async () => {
  const { calculateStudentHsk3Pillars } = await import('./hsk3Engine');

  const roster = [
    createStudentRecord({ name: 'Trần Quốc Bảo', studentCode: 'HV-003', hskLevel: 'HSK 2', initialPoints: 91 }, 3),
  ];

  const updated = applyStudentSubmissionToRoster(roster, {
    studentName: 'Trần Quốc Bảo',
    totalScore: 99,
    learnedVocabCount: 20,
    totalVocabCount: 27,
    writingAccuracy: 95,
    quizCorrectCount: 10,
    quizTotalCount: 10,
    reviewWords: ['既然'],
    timeSeconds: 18,
  });

  assert.equal(updated[0].totalPoints, 99);
  assert.equal(updated[0].timeSeconds, 18);
  assert.ok((updated[0].streak ?? 0) >= 4);

  const baselinePillars = calculateStudentHsk3Pillars({
    learnedSlideCount: 14,
    totalSlideCount: 27,
    writingAccuracyPct: 88,
    completedTranslationCount: 0,
  });
  const activePillars = calculateStudentHsk3Pillars({
    learnedSlideCount: 20,
    totalSlideCount: 27,
    writingAccuracyPct: 95,
    completedTranslationCount: 1,
    practicedSpeechCount: 4,
    srsReviewedCount: 8,
    practicedWritingCount: 6,
    submittedQuizScore: 96,
    completedSentenceCount: 4,
  });

  assert.equal(activePillars.length, 4);
  for (let i = 0; i < 4; i++) {
    assert.ok(
      activePillars[i].percent > baselinePillars[i].percent,
      `Expected pillar ${activePillars[i].titleZh} percent (${activePillars[i].percent}%) > baseline (${baselinePillars[i].percent}%)`
    );
    assert.ok(
      (activePillars[i].deltaPercent ?? 0) > 0,
      `Expected pillar ${activePillars[i].titleZh} deltaPercent > 0`
    );
  }
});

test('Phase 1 & Firebase Migration Patch: GEMINI_API_TIMEOUT_MS covers the server AI budget and runStorageMigrations upgrades schema cleanly', async () => {
  const { GEMINI_API_TIMEOUT_MS } = await import('./chineseEngine');
  const {
    runStorageMigrations,
    CURRENT_SCHEMA_VERSION,
  } = await import('./storageService');
  const { INITIAL_VOCAB_SLIDES } = await import('../data/chineseData');

  assert.equal(GEMINI_API_TIMEOUT_MS, 26000);
  assert.equal(CURRENT_SCHEMA_VERSION, '4.0.0-firebase');

  const migrated = runStorageMigrations(INITIAL_VOCAB_SLIDES);
  assert.ok(Array.isArray(migrated) && migrated.length >= 25);
  const slide25 = migrated.find((s) => s.id === 'slide-25' || s.index === 25);
  assert.ok(slide25);
  assert.equal(slide25.hanzi, '既然');
});

test('localStorage persistence: HSK 1-9 filter, learned slides, and custom added vocabulary persist across reloads', async () => {
  const store = new Map<string, string>();
  const prevWindow = (globalThis as any).window;
  const prevLocalStorage = (globalThis as any).localStorage;
  const mockLocalStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = mockLocalStorage;

  try {
    const {
      getStoredHsk3FilterState,
      saveStoredHsk3FilterState,
      saveStudentLearnedSlideIds,
      getStudentLearnedSlideIds,
      runStorageMigrations,
      STORAGE_KEYS,
    } = await import('./storageService');
    const { INITIAL_VOCAB_SLIDES } = await import('../data/chineseData');

    saveStoredHsk3FilterState('intermediate', 'HSK 4');
    const filterState = getStoredHsk3FilterState();
    assert.equal(filterState.stage, 'intermediate');
    assert.equal(filterState.level, 'HSK 4');

    saveStudentLearnedSlideIds(['slide-1', 'slide-11'], 'HV-001');
    const learnedSet = getStudentLearnedSlideIds('HV-001');
    assert.equal(learnedSet.has('slide-1'), true);
    assert.equal(learnedSet.has('slide-11'), true);

    const customSlide = createCustomVocabSlide(
      { hanzi: '团圆', meaning: 'đoàn viên', hskLevel: 'HSK 4' },
      26
    );
    assert.ok(customSlide);
    mockLocalStorage.setItem(STORAGE_KEYS.CUSTOM_SLIDES, JSON.stringify([customSlide]));

    const reloadedDeck = runStorageMigrations(INITIAL_VOCAB_SLIDES);
    assert.ok(reloadedDeck.some((s) => s.hanzi === '团圆'));
    const s11 = reloadedDeck.find((s) => s.id === 'slide-11');
    assert.equal(s11?.learned, true);
  } finally {
    if (prevWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = prevWindow;
    if (prevLocalStorage === undefined) delete (globalThis as any).localStorage;
    else (globalThis as any).localStorage = prevLocalStorage;
  }
});

