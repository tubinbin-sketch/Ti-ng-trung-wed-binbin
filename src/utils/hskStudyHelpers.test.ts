import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_VOCAB_SLIDES } from '../data/chineseData';
import {
  analyzeToneSandhi,
  applySrsRatingToRecords,
  evaluateDictationAttempt,
  evaluateSentenceBuilderOrder,
  generateAssignmentFromSlides,
  generateClassroomDictationDeck,
  generateClassroomMiniGameQuestions,
  generateContextualDialogue,
  getInitialSrsRecords,
  getMistakeNotebookList,
  HSK3_SENTENCE_BUILDER_CHALLENGES,
} from './hskStudyHelpers';
import {
  evaluateMeasureWordAttempt,
  generateMeasureWordChallenges,
} from './hskMeasureWordEngine';
import {
  buildFullSystemBackup,
  parseSystemBackupPayload,
  verifyTeacherPin,
} from './storageService';

test('analyzeToneSandhi detects 3+3 -> 2+3 tone sandhi accurately', () => {
  const res = analyzeToneSandhi('你好', 'nǐ hǎo');
  assert.equal(res.hasSandhi, true);
  assert.equal(res.spokenPinyin, 'ní hǎo');
  assert.ok(res.ruleBadge.includes('3 + 3 → 2 + 3'));
});

test('analyzeToneSandhi detects neutral tone (轻声), half-third tone rules, and standard tones', () => {
  const neutralRes = analyzeToneSandhi('咱们', 'zán men');
  assert.equal(neutralRes.hasSandhi, true);
  assert.ok(neutralRes.ruleBadge.includes('Thanh nhẹ'));

  // 首都 (shǒudū): T3 + T1 -> Half-third tone (211)
  const shouduRes = analyzeToneSandhi('首都', 'shǒu dū');
  assert.equal(shouduRes.hasSandhi, true);
  assert.ok(shouduRes.ruleBadge.includes('Nửa thanh 3'));

  // 温暖 (wēn nuǎn): T1 + T3 -> NO sandhi, keeps standard 214 tone
  const wennuanRes = analyzeToneSandhi('温暖', 'wēn nuǎn');
  assert.equal(wennuanRes.hasSandhi, false);
  assert.ok(wennuanRes.ruleBadge.includes('Chuẩn thanh điệu HSK 3.0'));
});

test('Spaced Repetition (SRS) 4-level ratings filter difficult words into Mistake Notebook (错题本)', () => {
  const initial = getInitialSrsRecords(INITIAL_VOCAB_SLIDES);
  const sampleSlide = INITIAL_VOCAB_SLIDES[0];

  // Rate 'forgot' / 'again' (😰 Quên - Ôn lại 1p) -> should be in mistake book
  const afterForgot = applySrsRatingToRecords(initial, sampleSlide, 'forgot');
  assert.equal(afterForgot[sampleSlide.id].inMistakeBook, true);
  assert.equal(afterForgot[sampleSlide.id].rating, 'forgot');
  assert.ok(
    getMistakeNotebookList(afterForgot).some((item) => item.hanzi === sampleSlide.hanzi)
  );

  // Rate 'hard' (🤔 Khó - Ôn lại 10p) -> in mistake book
  const afterHard = applySrsRatingToRecords(afterForgot, sampleSlide, 'hard');
  assert.equal(afterHard[sampleSlide.id].inMistakeBook, true);
  assert.equal(afterHard[sampleSlide.id].rating, 'hard');

  // Rate 'good' (👍 Nhớ - 1 ngày) -> removed from mistake book
  const afterGood = applySrsRatingToRecords(afterHard, sampleSlide, 'good');
  assert.equal(afterGood[sampleSlide.id].inMistakeBook, false);
  assert.equal(afterGood[sampleSlide.id].rating, 'good');

  // Rate 'mastered' (🌟 Thuộc làu - 4 ngày) -> not in mistake book
  const afterMastered = applySrsRatingToRecords(afterGood, sampleSlide, 'mastered');
  assert.equal(afterMastered[sampleSlide.id].inMistakeBook, false);
  assert.equal(afterMastered[sampleSlide.id].rating, 'mastered');
  assert.ok(afterMastered[sampleSlide.id].intervalLabel.includes('4 ngày'));
});

test('generateAssignmentFromSlides creates synchronized homework from teacher slides', () => {
  const selected = INITIAL_VOCAB_SLIDES.slice(0, 4);
  const pkg = generateAssignmentFromSlides(selected, 16);
  assert.equal(pkg.sessionNumber, 16);
  assert.equal(pkg.multipleChoiceList.length, 3);
  assert.equal(pkg.sentenceOrderingList.length, 2);
  assert.equal(pkg.essayList.length, 2);
  assert.equal(pkg.multipleChoiceList[0].targetWord, selected[0].hanzi);
});

test('generateClassroomMiniGameQuestions creates 4-option interactive rounds for both modes', () => {
  const imgQs = generateClassroomMiniGameQuestions(
    INITIAL_VOCAB_SLIDES,
    'image-to-hanzi',
    5
  );
  assert.equal(imgQs.length, 5);
  assert.equal(imgQs[0].options.length, 4);
  assert.equal(imgQs[0].options.filter((o) => o.isCorrect).length, 1);

  const audioQs = generateClassroomMiniGameQuestions(
    INITIAL_VOCAB_SLIDES,
    'audio-to-hanzi',
    4
  );
  assert.equal(audioQs.length, 4);
  assert.equal(audioQs[0].mode, 'audio-to-hanzi');
});

test('generateContextualDialogue generates 3-turn realistic A-B dialogue containing target Hanzi and never uses robotic classroom templates', () => {
  for (const slide of INITIAL_VOCAB_SLIDES) {
    const dlg = generateContextualDialogue(slide, INITIAL_VOCAB_SLIDES);
    assert.equal(dlg.targetHanzi, slide.hanzi);
    assert.equal(dlg.turns.length, 3);
    assert.equal(dlg.turns[0].speaker, 'A');
    assert.equal(dlg.turns[1].speaker, 'B');
    assert.ok(dlg.turns.some((t) => t.hanziLine.includes(slide.hanzi)));
    assert.equal(
      dlg.turns.some((t) => t.hanziLine.includes('在今天的汉语课上')),
      false
    );
  }
});

test('analyzeToneSandhi does not falsely attribute 一 (yī) sandhi from example sentence to 明天', () => {
  const mingtianRes = analyzeToneSandhi(
    '明天',
    'míng tiān',
    '明天 我们 一起 去 北京 看 长城 吧！'
  );
  assert.equal(mingtianRes.hasSandhi, false);
  assert.equal(mingtianRes.ruleBadge.includes('一'), false);
});

test('generateClassroomDictationDeck & evaluateDictationAttempt evaluate Hanzi and Pinyin accurately', () => {
  const deck = generateClassroomDictationDeck(INITIAL_VOCAB_SLIDES);
  const wennuanItem = deck.find((d) => d.hanzi === '温暖') || deck[0];
  assert.equal(wennuanItem.hanzi, '温暖');
  assert.ok(wennuanItem.strokeHint.includes('2 chữ Hán'));

  const exactRes = evaluateDictationAttempt('温暖', wennuanItem);
  assert.equal(exactRes.isExactHanzi, true);
  assert.equal(exactRes.accuracyPct, 100);

  const partialRes = evaluateDictationAttempt('温', wennuanItem);
  assert.equal(partialRes.isExactHanzi, false);
  assert.equal(partialRes.accuracyPct, 50);
  assert.deepEqual(partialRes.missingChars, ['暖']);

  const pinyinRes = evaluateDictationAttempt('wen nuan', wennuanItem);
  assert.equal(pinyinRes.isPinyinMatch, true);
  assert.equal(pinyinRes.accuracyPct, 60);
});

test('HSK3_SENTENCE_BUILDER_CHALLENGES & evaluateSentenceBuilderOrder grade exact and partial word orders', () => {
  assert.equal(HSK3_SENTENCE_BUILDER_CHALLENGES.length, 5);
  const firstChallenge = HSK3_SENTENCE_BUILDER_CHALLENGES[0];
  const correctIds = firstChallenge.tilesInCorrectOrder.map((t) => t.id);

  const perfectEval = evaluateSentenceBuilderOrder(correctIds, firstChallenge);
  assert.equal(perfectEval.isCorrect, true);
  assert.equal(perfectEval.score, 100);
  assert.equal(perfectEval.assembledHanzi, '咱们今天在教室里认真学习汉语。');

  const wrongOrder = [...correctIds].reverse();
  const wrongEval = evaluateSentenceBuilderOrder(wrongOrder, firstChallenge);
  assert.equal(wrongEval.isCorrect, false);
  assert.ok(wrongEval.score < 100);
  assert.ok(wrongEval.grammarDiagnostic.includes('咱们今天在教室里认真学习汉语。'));
});

test('generateMeasureWordChallenges and evaluateMeasureWordAttempt grade HSK 3.0 measure words accurately', () => {
  const challenges = generateMeasureWordChallenges(INITIAL_VOCAB_SLIDES);
  assert.ok(challenges.length >= 6);
  const kongtiaoChallenge = challenges.find((c) => c.nounHanzi === '空调') || challenges[0];
  assert.equal(kongtiaoChallenge.correctMeasureWord, '台');

  const correctRes = evaluateMeasureWordAttempt(kongtiaoChallenge, '台');
  assert.equal(correctRes.isCorrect, true);
  assert.equal(correctRes.scoreDelta, 10);
  assert.ok(correctRes.feedbackVi.includes('一台空调'));

  const wrongRes = evaluateMeasureWordAttempt(kongtiaoChallenge, '件');
  assert.equal(wrongRes.isCorrect, false);
  assert.equal(wrongRes.scoreDelta, 0);
});

test('storageService verifyTeacherPin and backup export/import work accurately', () => {
  assert.equal(verifyTeacherPin('2026'), true);
  assert.equal(verifyTeacherPin('8888'), true);
  assert.equal(verifyTeacherPin('0000'), false);

  const backup = buildFullSystemBackup(INITIAL_VOCAB_SLIDES.slice(0, 3), []);
  assert.equal(backup.slides.length, 3);
  const parsed = parseSystemBackupPayload(JSON.stringify(backup));
  assert.ok(parsed);
  assert.equal(parsed?.slides?.length, 3);
});
