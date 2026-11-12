import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrain, applyBrush, serialize, deserialize, History } from '../src/terrain.js';

test('a new project is a flat, empty 32-stud board', () => {
  const t = createTerrain();
  assert.equal(t.size, 32);
  assert.equal(t.heights.length, 1024);
  assert.ok(t.heights.every(h => h === 0));
});

test('raise brush has falloff, clips at edges, and lower never cuts the baseplate', () => {
  const t = createTerrain(8);
  applyBrush(t, 0, 0, { tool: 'raise', radius: 3, strength: 3, color: 2 });
  assert.equal(t.heights[0], 3);
  assert.ok(t.heights[1] > 0 && t.heights[1] < 3);
  assert.equal(t.heights[7], 0);
  assert.equal(t.colors[0], 2);
  applyBrush(t, 0, 0, { tool: 'lower', radius: 3, strength: 20 });
  assert.equal(t.heights[0], 0);
  assert.ok(t.heights.every(h => h >= 0));
});

test('flatten reaches chosen plate height and paint leaves heights intact', () => {
  const t = createTerrain(8);
  applyBrush(t, 3, 3, { tool: 'flatten', radius: 2, strength: 2, height: 6, color: 0 });
  assert.equal(t.heights[27], 6);
  const before = [...t.heights];
  applyBrush(t, 3, 3, { tool: 'paint', radius: 2, color: 3 });
  assert.deepEqual([...t.heights], before);
  assert.equal(t.colors[27], 3);
});

test('smooth reduces a spike using a snapshot of surrounding heights', () => {
  const t = createTerrain(8);
  t.heights[27] = 12;
  applyBrush(t, 3, 3, { tool: 'smooth', radius: 2, strength: 3 });
  assert.ok(t.heights[27] < 12 && t.heights[27] > 0);
  assert.ok(t.heights[26] > 0);
});

test('undo restores an entire stroke and new edits discard the redo branch', () => {
  const t = createTerrain(8);
  const history = new History();
  history.push(t);
  applyBrush(t, 3, 3, { tool: 'raise', radius: 2, strength: 2 });
  const painted = [...t.heights];
  history.undo(t);
  assert.ok(t.heights.every(h => h === 0));
  history.redo(t);
  assert.deepEqual([...t.heights], painted);
  history.undo(t);
  history.push(t);
  assert.equal(history.canRedo, false);
});

test('project roundtrip preserves fractional heights, colors and slope setting', () => {
  const t = createTerrain(8);
  t.heights[5] = 4.5;
  t.colors[5] = 2;
  t.slopes = false;
  const restored = deserialize(serialize(t));
  assert.deepEqual(restored, t);
});

test('import rejects oversized boards, nonfinite heights, unknown colors and missing cells', () => {
  const raw = JSON.parse(serialize(createTerrain(8)));
  for (const invalid of [
    { ...raw, size: 9999 },
    { ...raw, heights: [1] },
    { ...raw, heights: raw.heights.map(() => null) },
    { ...raw, colors: raw.colors.map(() => 999) },
    { ...raw, heights: raw.heights.map(() => -3) },
  ]) assert.throws(() => deserialize(JSON.stringify(invalid)));
});

test('cliff sample contains supported tall steps for 65° and 75° slopes', async () => {
  const { makeCliffDemo } = await import('../src/terrain.js');
  const { packTerrain } = await import('../src/parts.js');
  assert.equal(typeof makeCliffDemo, 'function');
  const t = makeCliffDemo();
  assert.equal(t.size, 32);
  const pieces = packTerrain(t);
  assert.ok(pieces.some(p => p.id === '98560' || p.id === '4460b'));
  assert.ok(pieces.some(p => p.id === '3678b' || p.id === '60481'));
  assert.ok(Math.max(...t.heights) >= 24);
});
