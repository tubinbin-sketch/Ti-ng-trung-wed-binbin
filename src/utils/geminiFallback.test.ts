import test from 'node:test';
import assert from 'node:assert/strict';
import {
  callGeminiModel,
  geminiModelChain,
  parseModelJson,
  TtlCache,
} from '../../server';

type FakeCall = { model: string };

function fakeAi(behaviour: (model: string, attempt: number) => unknown) {
  const calls: FakeCall[] = [];
  const counts = new Map<string, number>();
  const ai = {
    models: {
      generateContent: async (params: { model: string }) => {
        const n = (counts.get(params.model) || 0) + 1;
        counts.set(params.model, n);
        calls.push({ model: params.model });
        const out = behaviour(params.model, n);
        if (out instanceof Error) throw out;
        return { text: String(out) };
      },
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ai: ai as any, calls };
}

test('Gemini model chain: env overrides first, then current GA defaults, no duplicates', () => {
  const prev = { ...process.env };
  delete process.env.GEMINI_CHAT_MODEL;
  delete process.env.GEMINI_FAST_MODEL;
  delete process.env.GEMINI_MODEL;
  const chat = geminiModelChain('chat');
  const fast = geminiModelChain('fast');
  assert.equal(chat[0], 'gemini-3.8-flash');
  assert.equal(fast[0], 'gemini-3.5-flash-lite');
  assert.ok(chat.includes('gemini-2.5-flash'), 'legacy model stays as last resort');

  process.env.GEMINI_MODEL = 'gemini-3.6-flash';
  process.env.GEMINI_CHAT_MODEL = 'my-chat-model';
  const overridden = geminiModelChain('chat');
  assert.deepEqual(overridden.slice(0, 2), ['my-chat-model', 'gemini-3.6-flash']);
  assert.equal(new Set(overridden).size, overridden.length);
  process.env = prev;
});

test('callGeminiModel falls back to the next model when one is unavailable', async () => {
  const { ai, calls } = fakeAi((model) =>
    model === geminiModelChain('fast')[0] ? new Error('404 models/x is not found') : '{"ok":1}'
  );
  const { response, model } = await callGeminiModel(ai, 'fast', { contents: 'hi' });
  assert.equal(response.text, '{"ok":1}');
  assert.equal(model, geminiModelChain('fast')[1]);
  assert.equal(calls.length, 2);
});

test('callGeminiModel retries an overloaded model once before moving on', async () => {
  const first = geminiModelChain('chat')[0];
  const { ai, calls } = fakeAi((model, attempt) =>
    model === first && attempt === 1 ? new Error('503 UNAVAILABLE: model is overloaded') : 'ok'
  );
  const { model } = await callGeminiModel(ai, 'chat', { contents: 'hi' });
  assert.equal(model, first);
  assert.deepEqual(
    calls.map((c) => c.model),
    [first, first]
  );
});

test('callGeminiModel does not loop over models for a bad request', async () => {
  const { ai, calls } = fakeAi(() => new Error('400 INVALID_ARGUMENT: bad schema'));
  await assert.rejects(() => callGeminiModel(ai, 'chat', { contents: 'hi' }), /INVALID_ARGUMENT/);
  assert.equal(calls.length, 1);
});

test('parseModelJson tolerates code fences and empty output', () => {
  assert.deepEqual(parseModelJson('```json\n{"a":1}\n```', {}), { a: 1 });
  assert.deepEqual(parseModelJson('', { empty: true }), { empty: true });
  assert.deepEqual(parseModelJson(undefined, { empty: true }), { empty: true });
});

test('TtlCache evicts the least recently used entry and expires old ones', async () => {
  const cache = new TtlCache<number>(2, 30);
  cache.set('a', 1);
  cache.set('b', 2);
  assert.equal(cache.get('a'), 1); // a is now most recent
  cache.set('c', 3); // evicts b
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.get('a'), 1);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(cache.get('a'), undefined);
});
