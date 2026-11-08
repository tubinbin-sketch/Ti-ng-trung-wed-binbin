import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSIGNMENT_TEXT_TEMPLATE,
  countAssignmentQuestions,
  EMPTY_ASSIGNMENT,
  getStoredAssignment,
  hasAssignmentQuestions,
  parseAssignmentContent,
} from './assignmentParser';

test('no stored assignment means an empty assignment, never a sample one', () => {
  const pkg = getStoredAssignment();
  assert.equal(hasAssignmentQuestions(pkg), false);
  assert.equal(pkg, EMPTY_ASSIGNMENT);
});

test('parser reads the documented template: MC with answer, ordering and sentence writing', () => {
  const { pkg, warnings } = parseAssignmentContent(ASSIGNMENT_TEXT_TEMPLATE, 'de.txt', 'Buổi 1');
  assert.deepEqual(warnings, []);
  assert.equal(pkg.sessionTitle, 'Buổi 1');
  assert.equal(pkg.multipleChoiceList.length, 1);
  const mc = pkg.multipleChoiceList[0];
  assert.equal(mc.options.length, 4);
  assert.equal(mc.options.find((o) => o.isCorrect)?.key, 'A');
  assert.equal(mc.targetWord, '温暖');

  assert.equal(pkg.sentenceOrderingList.length, 1);
  const so = pkg.sentenceOrderingList[0];
  assert.deepEqual(so.correctTokens, ['我', '每天', '学习', '汉语']);
  assert.notDeepEqual(so.tokensShuffled, so.correctTokens);
  assert.deepEqual([...so.tokensShuffled].sort(), [...so.correctTokens].sort());
  assert.equal(so.vietnameseMeaning, 'Tôi học tiếng Trung mỗi ngày.');

  assert.equal(pkg.essayList.length, 1);
  assert.equal(pkg.essayList[0].targetWord, '温暖');
  assert.equal(pkg.essayList[0].meaning, 'ấm áp');
  assert.equal(countAssignmentQuestions(pkg), 3);
});

test('parser accepts a starred option as the answer and never guesses one', () => {
  const text = ['1. 我___学生。', 'A. 是', '*B. 在', 'C. 有', '', 'Câu 2: 你好吗？', 'A. 好', 'B. 不'].join('\n');
  const { pkg, warnings } = parseAssignmentContent(text, '', '');
  assert.equal(pkg.multipleChoiceList.length, 1);
  assert.equal(pkg.multipleChoiceList[0].options.find((o) => o.isCorrect)?.key, 'B');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Đáp án/);
});

test('text without recognisable questions yields no questions (no sample fallback)', () => {
  const { pkg } = parseAssignmentContent('Bài tập về nhà buổi 14, các em làm đầy đủ nhé.', 'x.docx', 'Buổi 14');
  assert.equal(countAssignmentQuestions(pkg), 0);
});
