import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_VOCAB_SLIDES } from '../data/chineseData';
import {
  buildShadowingLibrary,
  HSK_LEVELS,
  parseHskLevel,
  splitIntoShadowSentences,
  suggestStartingLevel,
} from './shadowing';
import { parseAssignmentContent, ASSIGNMENT_TEXT_TEMPLATE } from './assignmentParser';

test('parseHskLevel maps labels to 1–6', () => {
  assert.equal(parseHskLevel('HSK 1'), 1);
  assert.equal(parseHskLevel('HSK 2–3'), 2);
  assert.equal(parseHskLevel('HSK 7-9'), 6);
  assert.equal(parseHskLevel(''), null);
});

test('every HSK level has shadowing sentences', () => {
  const lib = buildShadowingLibrary({ slides: [] });
  for (const lv of HSK_LEVELS) {
    assert.ok(lib.filter((s) => s.level === lv).length >= 8, `HSK ${lv}`);
  }
});

test('lesson and assignment sentences are included automatically, without duplicates', () => {
  const { pkg } = parseAssignmentContent(ASSIGNMENT_TEXT_TEMPLATE, 'a.txt', 'Buổi 1');
  const lib = buildShadowingLibrary({ slides: INITIAL_VOCAB_SLIDES, assignment: pkg });
  const lessonSentences = lib.filter((s) => s.source === 'lesson');
  assert.ok(lessonSentences.length > 0);
  assert.ok(lib.some((s) => s.source === 'assignment' && s.hanzi === '我每天学习汉语'));
  const keys = lib.map((s) => s.hanzi.replace(/\s+/g, ''));
  assert.equal(new Set(keys).size, keys.length);
});

test('custom passages are split into sentences and come first', () => {
  const sentences = splitIntoShadowSentences('我叫小明。你呢？\nhello\n我们一起学习吧！');
  assert.deepEqual(sentences, ['我叫小明。', '你呢？', '我们一起学习吧！']);
  const lib = buildShadowingLibrary({
    slides: [],
    customPassages: [{ id: 'p', title: 'Bài 1', level: 2, sentences, createdAt: '' }],
  });
  assert.equal(lib[0].source, 'custom');
  assert.equal(lib[0].level, 2);
});

test('starting level follows the lesson slides', () => {
  assert.equal(suggestStartingLevel(INITIAL_VOCAB_SLIDES), 3);
  assert.equal(suggestStartingLevel([]), 1);
});
