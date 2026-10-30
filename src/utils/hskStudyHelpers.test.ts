import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_VOCAB_SLIDES } from '../data/chineseData';
import {
  analyzeToneSandhi,
  applySrsRatingToRecords,
  generateAssignmentFromSlides,
  generateClassroomMiniGameQuestions,
  generateContextualDialogue,
  getInitialSrsRecords,
  getMistakeNotebookList,
} from './hskStudyHelpers';

test('analyzeToneSandhi detects 3+3 -> 2+3 tone sandhi accurately', () => {
  const res = analyzeToneSandhi('你好', 'nǐ hǎo');
  assert.equal(res.hasSandhi, true);
  assert.equal(res.spokenPinyin, 'ní hǎo');
  assert.ok(res.ruleBadge.includes('3 + 3 → 2 + 3'));
});

test('analyzeToneSandhi detects neutral tone (轻声) and half-third tone rules', () => {
  const neutralRes = analyzeToneSandhi('咱们', 'zán men');
  assert.equal(neutralRes.hasSandhi, true);
  assert.ok(neutralRes.ruleBadge.includes('Thanh nhẹ'));

  const halfThirdRes = analyzeToneSandhi('温暖', 'wēn nuǎn');
  assert.equal(halfThirdRes.hasSandhi, true);
  assert.ok(halfThirdRes.ruleBadge.includes('Nửa thanh 3'));
});

test('Spaced Repetition (SRS) ratings filter difficult words into Mistake Notebook (错题本)', () => {
  const initial = getInitialSrsRecords(INITIAL_VOCAB_SLIDES);
  const sampleSlide = INITIAL_VOCAB_SLIDES[0];

  // Rate 'again' (😰 Chưa nhớ - Ôn lại ngay) -> should be in mistake book
  const afterAgain = applySrsRatingToRecords(initial, sampleSlide, 'again');
  assert.equal(afterAgain[sampleSlide.id].inMistakeBook, true);
  assert.ok(
    getMistakeNotebookList(afterAgain).some((item) => item.hanzi === sampleSlide.hanzi)
  );

  // Rate 'good' (✅ Đã thuộc lòng) -> should be removed from mistake book
  const afterGood = applySrsRatingToRecords(afterAgain, sampleSlide, 'good');
  assert.equal(afterGood[sampleSlide.id].inMistakeBook, false);
  assert.equal(
    getMistakeNotebookList(afterGood).some((item) => item.hanzi === sampleSlide.hanzi),
    false
  );
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


