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

  const afterForgot = applySrsRatingToRecords(initial, sampleSlide, 'forgot');
  assert.equal(afterForgot[sampleSlide.id].inMistakeBook, true);
  assert.equal(afterForgot[sampleSlide.id].rating, 'forgot');
  assert.ok(
    getMistakeNotebookList(afterForgot).some((item) => item.hanzi === sampleSlide.hanzi)
  );

  const afterHard = applySrsRatingToRecords(afterForgot, sampleSlide, 'hard');
  assert.equal(afterHard[sampleSlide.id].inMistakeBook, true);
  assert.equal(afterHard[sampleSlide.id].rating, 'hard');

  const afterGood = applySrsRatingToRecords(afterHard, sampleSlide, 'good');
  assert.equal(afterGood[sampleSlide.id].inMistakeBook, false);
  assert.equal(afterGood[sampleSlide.id].rating, 'good');

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

test('storageService backup export/import work accurately for Firestore migration', () => {
  const backup = buildFullSystemBackup(INITIAL_VOCAB_SLIDES.slice(0, 3), []);
  assert.equal(backup.slides.length, 3);
  const parsed = parseSystemBackupPayload(JSON.stringify(backup));
  assert.ok(parsed);
  assert.equal(parsed?.slides?.length, 3);
});

test('server AI route origin guard and periodic rate-limit memory cleanup work accurately', async () => {
  const { isTrustedRequestOrigin, cleanupExpiredRateLimits } = await import('../../server');
  const { shouldApplyRemoteState } = await import('./storageService');

  assert.equal(
    isTrustedRequestOrigin({
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
      secFetchSite: 'same-origin',
      contentType: 'application/json',
    }),
    true
  );

  assert.equal(
    isTrustedRequestOrigin({
      origin: 'https://hanu.edu.vn',
      host: 'api.hanu.edu.vn',
      secFetchSite: 'same-site',
      contentType: 'application/json',
      allowedOriginsEnv: 'https://hanu.edu.vn',
    }),
    true
  );

  assert.equal(
    isTrustedRequestOrigin({
      origin: '',
      referer: '',
      host: 'localhost:3000',
      contentType: 'application/json',
    }),
    false
  );

  assert.equal(
    isTrustedRequestOrigin({
      origin: 'https://other-app.run.app',
      host: 'localhost:3000',
      secFetchSite: 'cross-site',
      contentType: 'application/json',
    }),
    false
  );

  assert.equal(
    shouldApplyRemoteState('2026-10-31T08:00:00.000Z', '2026-10-31T09:00:00.000Z'),
    false
  );
  assert.equal(
    shouldApplyRemoteState('2026-10-31T10:00:00.000Z', '2026-10-31T09:00:00.000Z'),
    true
  );

  const cleanupResult = cleanupExpiredRateLimits(Date.now() + 120_000);
  assert.equal(typeof cleanupResult.removedApiEntries, 'number');
  assert.equal(typeof cleanupResult.removedAiEntries, 'number');
});

test('AI endpoints require Firebase ID Token (Authorization: Bearer <token>), rate-limit by UID, and legacy PIN/storage routes are removed', async () => {
  const {
    app,
    createInMemoryServerStoreAdapter,
    resetAllRateLimitersForTest,
    setFirebaseTokenVerifierForTest,
    setServerStoreAdapterForTest,
  } = await import('../../server');
  resetAllRateLimitersForTest();

  const memStore = createInMemoryServerStoreAdapter();
  await memStore.setDoc('users/uid-student-1', {
    uid: 'uid-student-1',
    enrolledClassIds: ['class-hsk3'],
    activeClassId: 'class-hsk3',
  });
  setServerStoreAdapterForTest(memStore);

  setFirebaseTokenVerifierForTest(async (token: string) => {
    if (token === 'valid-token-uid-student-1') {
      return { uid: 'uid-student-1', email: 'student1@hanu.edu.vn' };
    }
    if (token === 'valid-token-uid-teacher-1') {
      return { uid: 'uid-teacher-1', email: 'teacher@hanu.edu.vn', role: 'teacher' };
    }
    throw new Error('Invalid Firebase ID token');
  });

  const prevDailyLimit = process.env.AI_DAILY_LIMIT;
  process.env.AI_DAILY_LIMIT = '3';

  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;
  const originHeader = `http://127.0.0.1:${port}`;

  try {
    // 1. Legacy routes (/api/auth/teacher-verify, /api/storage/state) are removed (404), and /api/submissions requires Auth (401)
    const legacyPinRes = await fetch(`${baseUrl}/api/auth/teacher-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '2026' }),
    });
    assert.equal(legacyPinRes.status, 404);

    const legacyStateRes = await fetch(`${baseUrl}/api/storage/state`);
    assert.equal(legacyStateRes.status, 404);

    const unauthSubRes = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(unauthSubRes.status, 401);

    // 2. Calling AI route without Authorization: Bearer <token> returns 401
    const noTokenRes = await fetch(`${baseUrl}/api/hanzi/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: originHeader,
      },
      body: JSON.stringify({ words: ['温暖'] }),
    });
    assert.equal(noTokenRes.status, 401);

    // 3. Calling AI route with invalid token returns 401
    const badTokenRes = await fetch(`${baseUrl}/api/binbin/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: originHeader,
        Authorization: 'Bearer forged-invalid-token',
      },
      body: JSON.stringify({ prompt: 'Xin chào' }),
    });
    assert.equal(badTokenRes.status, 401);

    // 4. UID-based daily quota enforcement (AI_DAILY_LIMIT = 3 per UID via Firestore aiUsage transaction)
    for (let i = 1; i <= 3; i++) {
      const r = await fetch(`${baseUrl}/api/hanzi/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: originHeader,
          Authorization: 'Bearer valid-token-uid-student-1',
        },
        body: JSON.stringify({ topic: 'Gia đình', count: 2 }),
      });
      assert.notEqual(r.status, 403);
      assert.notEqual(r.status, 429);
    }

    // 4th call from uid-student-1 exceeds AI_DAILY_LIMIT=3 -> returns 429
    const fourthCallSameUid = await fetch(`${baseUrl}/api/hanzi/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: originHeader,
        Authorization: 'Bearer valid-token-uid-student-1',
      },
      body: JSON.stringify({ topic: 'Gia đình', count: 2 }),
    });
    assert.equal(fourthCallSameUid.status, 429);

    // Different UID (uid-teacher-1) on the exact same IP still has its own independent quota!
    const otherUidCall = await fetch(`${baseUrl}/api/hanzi/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: originHeader,
        Authorization: 'Bearer valid-token-uid-teacher-1',
      },
      body: JSON.stringify({ topic: 'Trường học', count: 2 }),
    });
    assert.notEqual(otherUidCall.status, 429);

    // 5. Self-hosted Hanzi stroke JSON route serves character strokes from local hanzi-writer-data
    const strokeRes = await fetch(`${baseUrl}/hanzi-data/${encodeURIComponent('暖')}.json`);
    assert.equal(strokeRes.status, 200);
    const strokeJson = (await strokeRes.json()) as { strokes?: string[]; medians?: unknown[] };
    assert.ok(Array.isArray(strokeJson.strokes));
    assert.ok(strokeJson.strokes.length > 0);
  } finally {
    if (prevDailyLimit === undefined) delete process.env.AI_DAILY_LIMIT;
    else process.env.AI_DAILY_LIMIT = prevDailyLimit;
    setFirebaseTokenVerifierForTest(null);
    setServerStoreAdapterForTest(null);
    resetAllRateLimitersForTest();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
