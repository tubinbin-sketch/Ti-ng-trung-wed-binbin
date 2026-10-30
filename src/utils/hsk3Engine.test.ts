import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_VOCAB_SLIDES } from '../data/chineseData';
import {
  HSK3_STAGES,
  HSK3_TRANSLATION_CHALLENGES,
  calculateStudentHsk3Pillars,
  evaluateHsk3Translation,
  filterSlidesByHsk3,
  formatClassTimer,
  generateHsk3LessonPlanSummary,
  getHsk3StageForLevel,
  getHsk3VocabStandard,
} from './hsk3Engine';

test('HSK 3.0 3-Stage 9-Level mapping and filtering works across Sơ cấp, Trung cấp, Cao cấp', () => {
  assert.equal(HSK3_STAGES.length, 4);
  assert.equal(getHsk3StageForLevel('HSK 1').stageId, 'elementary');
  assert.equal(getHsk3StageForLevel('HSK 3').stageId, 'elementary');
  assert.equal(getHsk3StageForLevel('HSK 4').stageId, 'intermediate');
  assert.equal(getHsk3StageForLevel('HSK 6').stageId, 'intermediate');
  assert.equal(getHsk3StageForLevel('HSK 7–9').stageId, 'advanced');

  const elementarySlides = filterSlidesByHsk3(INITIAL_VOCAB_SLIDES, 'elementary');
  const intermediateSlides = filterSlidesByHsk3(INITIAL_VOCAB_SLIDES, 'intermediate');
  const advancedSlides = filterSlidesByHsk3(INITIAL_VOCAB_SLIDES, 'advanced');

  assert.equal(elementarySlides.length > 0, true);
  assert.equal(intermediateSlides.length > 0, true);
  assert.equal(advancedSlides.length > 0, true);
  assert.equal(
    elementarySlides.length + intermediateSlides.length + advancedSlides.length,
    INITIAL_VOCAB_SLIDES.length
  );
});

test('getHsk3VocabStandard provides handwriting/recognition label and grammar formula for 温暖 and 交通', () => {
  const wennuanSlide = INITIAL_VOCAB_SLIDES.find((s) => s.hanzi === '温暖');
  assert.ok(wennuanSlide);
  const wennuanMeta = getHsk3VocabStandard(wennuanSlide);
  assert.equal(wennuanMeta.charCategory, 'handwriting');
  assert.equal(
    wennuanMeta.charCategoryLabel.includes('手写字'),
    true
  );
  assert.equal(
    wennuanMeta.grammarFormula,
    'Chủ ngữ + 给 + Tân ngữ + 带来 + 温暖'
  );
  assert.equal(wennuanMeta.synonymDistinction.includes('温暖') && wennuanMeta.synonymDistinction.includes('暖和'), true);

  const kongtiaoSlide = INITIAL_VOCAB_SLIDES.find((s) => s.hanzi === '空调');
  assert.ok(kongtiaoSlide);
  const kongtiaoMeta = getHsk3VocabStandard(kongtiaoSlide);
  assert.equal(kongtiaoMeta.charCategory, 'recognition');
  assert.equal(kongtiaoMeta.charCategoryLabel.includes('认读字'), true);
});

test('Teacher Live Teaching Toolkit helpers format timer and generate HSK 3.0 lesson plan summary', () => {
  assert.equal(formatClassTimer(30), '00:30');
  assert.equal(formatClassTimer(60), '01:00');
  assert.equal(formatClassTimer(180), '03:00');

  const summary = generateHsk3LessonPlanSummary(INITIAL_VOCAB_SLIDES);
  assert.equal(summary.totalWords, INITIAL_VOCAB_SLIDES.length);
  assert.equal(summary.handwritingCount + summary.recognitionCount, INITIAL_VOCAB_SLIDES.length);
  assert.equal(summary.rows[0].hanzi, INITIAL_VOCAB_SLIDES[0].hanzi);
});

test('Student 5-Skill HSK 3.0 pillars and Part E translation evaluator work accurately', () => {
  const pillars = calculateStudentHsk3Pillars({
    learnedSlideCount: 15,
    totalSlideCount: 18,
    writingAccuracyPct: 96,
    completedTranslationCount: 2,
  });
  assert.equal(pillars.length, 4);
  assert.equal(pillars[0].id, 'syllables');
  assert.equal(pillars[1].id, 'recognition');
  assert.equal(pillars[2].id, 'handwriting');
  assert.equal(pillars[3].id, 'vocab_grammar');

  const challenge1 = HSK3_TRANSLATION_CHALLENGES[0]; // 温暖
  const exactEval = evaluateHsk3Translation('老师的话给我们带来了温暖。', challenge1);
  assert.equal(exactEval.passed, true);
  assert.equal(exactEval.hasKeyword, true);
  assert.equal(exactEval.matchesFormula, true);
  assert.equal(exactEval.score >= 95, true);

  const missingEval = evaluateHsk3Translation('今天天气很好', challenge1);
  assert.equal(missingEval.hasKeyword, false);
  assert.equal(missingEval.score < 75, true);
});
