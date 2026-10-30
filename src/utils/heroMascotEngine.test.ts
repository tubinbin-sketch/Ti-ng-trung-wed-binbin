import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HERO_MASCOT_THEMES,
  CYCLE_MASCOT_ORDER,
  getNextHeroMascotMode,
  generateDragonSpineNodes,
  generateBambooGroveSpecs,
} from './heroMascotEngine';

test('getNextHeroMascotMode cycles through dragon -> panda -> harmony -> dragon', () => {
  assert.equal(getNextHeroMascotMode('dragon'), 'panda');
  assert.equal(getNextHeroMascotMode('panda'), 'harmony');
  assert.equal(getNextHeroMascotMode('harmony'), 'dragon');
  assert.equal(getNextHeroMascotMode('custom'), 'dragon');
});

test('HERO_MASCOT_THEMES defines all 3 core Chinese cultural themes', () => {
  assert.equal(CYCLE_MASCOT_ORDER.length, 3);
  assert.equal(HERO_MASCOT_THEMES.dragon.label, 'Chu Sa Thần Long');
  assert.equal(HERO_MASCOT_THEMES.panda.label, 'Gấu Trúc & Rừng Trúc');
  assert.equal(HERO_MASCOT_THEMES.harmony.label, 'Long Trúc Song Hành');
});

test('generateDragonSpineNodes generates tapered S-curve spine nodes with valid coordinates', () => {
  const fullNodes = generateDragonSpineNodes(40, 'full-circle');
  assert.equal(fullNodes.length, 40);
  // Neck/mid-body should be thicker than the tail tip
  assert.ok(fullNodes[10].radius > fullNodes[39].radius);
  assert.ok(fullNodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y) && n.finHeight > 0));

  const upperNodes = generateDragonSpineNodes(32, 'upper-soar');
  assert.equal(upperNodes.length, 32);
  assert.ok(upperNodes[0].x < upperNodes[31].x);
});

test('generateBambooGroveSpecs builds multi-segment left and right bamboo stalks', () => {
  const stalks = generateBambooGroveSpecs();
  assert.equal(stalks.length, 4);
  for (const stalk of stalks) {
    assert.ok(stalk.segments.length >= 5);
    assert.ok(stalk.segments[0].width > stalk.segments[stalk.segments.length - 1].width);
  }
});
