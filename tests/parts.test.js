import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrain, makeDemo } from '../src/terrain.js';
import { packTerrain, PARTS } from '../src/parts.js';

test('flat terrain packs into actual multi-stud bricks rather than stretched columns', () => {
  const t = createTerrain(8);
  t.heights.fill(3);
  const pieces = packTerrain(t);
  assert.equal(pieces.length, 8);
  assert.ok(pieces.every(p => p.id === '3001'));
});

test('matching two-plate transitions receive a 2×2 slope cap with support underneath', () => {
  const t = createTerrain(8);
  t.heights[0] = t.heights[1] = 6;
  t.heights[8] = t.heights[9] = 4;
  const pieces = packTerrain(t);
  const slope = pieces.find(p => p.id === '3039');
  assert.ok(slope);
  assert.equal(slope.y, 3);
  assert.equal(slope.rotation, 0);
  assert.equal(slope.cells.length, 4);
  for (const cell of slope.cells) assert.ok(pieces.some(p => p.kind !== 'slope' && p.y + p.height === 3 && p.cells.some(c => c.index === cell.index)));
});

test('single-width slopes rotate downhill in all four directions', () => {
  for (const [dx, dz, rotation] of [[0, 1, 0], [1, 0, Math.PI / 2], [0, -1, Math.PI], [-1, 0, -Math.PI / 2]]) {
    const t = createTerrain(8);
    t.heights[27] = 3;
    t.heights[(3 + dz) * 8 + 3 + dx] = 1;
    const p = packTerrain(t).find(p => p.kind === 'slope');
    assert.ok(p);
    assert.equal(p.id, '3040b');
    assert.equal(p.rotation, rotation);
  }
});

test('slope toggle removes slopes without changing heights and colors prevent cross-color merging', () => {
  const t = createTerrain(8);
  t.heights[0] = 3; t.heights[8] = 1; t.colors[8] = 2;
  assert.ok(packTerrain(t).every(p => p.kind !== 'slope'));
  t.colors[8] = 0; t.slopes = false;
  assert.ok(packTerrain(t).every(p => p.kind !== 'slope'));
  assert.equal(t.heights[0], 3);
});

test('every occupied layer is covered once, without overlaps or floating pieces', () => {
  for (const t of [makeDemo(), makeDemo(16)]) {
    const occupied = new Set();
    const pieces = packTerrain(t);
    assert.ok(pieces.some(p => p.kind === 'slope'));
    for (const p of pieces) {
      assert.ok(PARTS[p.id]);
      for (const c of p.cells) for (let y = p.y; y < p.y + c.height; y++) {
        const key = `${c.index}:${y}`;
        assert.ok(!occupied.has(key), `overlap at ${key}`);
        occupied.add(key);
      }
    }
    for (let i = 0; i < t.heights.length; i++) for (let y = 0; y < Math.round(t.heights[i]); y++) assert.ok(occupied.has(`${i}:${y}`), `hole at ${i}:${y}`);
    assert.equal(occupied.size, [...t.heights].reduce((a, b) => a + Math.round(b), 0));
  }
});

for (const [drop, height, narrow, wide] of [[5, 6, '60481', '3678b'], [8, 9, '4460b', '98560']]) {
  test(`${drop}-plate drops select real ${height / 3}-brick-high slopes, rotated downhill`, () => {
    for (const [dx, dz, rotation] of [[0, 1, 0], [1, 0, Math.PI / 2], [0, -1, Math.PI], [-1, 0, -Math.PI / 2]]) {
      const t = createTerrain(8);
      t.heights[27] = height + 3;
      t.heights[(3 + dz) * 8 + 3 + dx] = 4;
      const p = packTerrain(t).find(p => p.kind === 'slope');
      assert.equal(p?.id, narrow);
      assert.equal(p.y, 3);
      assert.equal(p.height, height);
      assert.equal(p.rotation, rotation);
    }
    const t = createTerrain(8);
    t.heights[0] = t.heights[1] = height + 3;
    t.heights[8] = t.heights[9] = 4;
    const p = packTerrain(t).find(p => p.kind === 'slope');
    assert.equal(p?.id, wide);
    assert.equal(p.cells.length, 4);
  });
}

test('steep slopes also fit taller cliffs with supported bricks above their upper studs', () => {
  const t = createTerrain(8);
  t.heights[27] = 17;
  t.heights[35] = 5;
  const pieces = packTerrain(t);
  const slope = pieces.find(p => p.id === '4460b');
  assert.ok(slope);
  assert.equal(slope.y, 4);
  assert.ok(pieces.some(p => p.kind !== 'slope' && p.y === 13 && p.cells.some(c => c.index === 27)));
  assertPacked(t, pieces);
});

test('altitude alone does not force a steep slope on a gentle mountaintop', () => {
  const t = createTerrain(8);
  t.heights[27] = 40;
  t.heights[35] = 38;
  assert.equal(packTerrain(t).find(p => p.kind === 'slope')?.id, '3040b');
});

function assertPacked(t, pieces) {
  const occupied = new Set();
  for (const p of pieces) for (const c of p.cells) for (let y = p.y; y < p.y + c.height; y++) {
    const key = `${c.index}:${y}`;
    assert.ok(!occupied.has(key), `overlap at ${key}`);
    assert.ok(y < Math.round(t.heights[c.index]), `piece above terrain at ${key}`);
    occupied.add(key);
  }
  for (let i = 0; i < t.heights.length; i++) for (let y = 0; y < Math.round(t.heights[i]); y++) assert.ok(occupied.has(`${i}:${y}`), `hole at ${i}:${y}`);
  for (const p of pieces) if (p.y > 0) for (const c of p.cells) assert.ok(occupied.has(`${c.index}:${p.y - 1}`), 'unsupported piece');
}

test('mixed steep slopes preserve every column, color boundary and baseplate edge', () => {
  const t = createTerrain(16);
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    t.heights[z * 16 + x] = (x * 7 + z * 13) % 49;
    t.colors[z * 16 + x] = Math.floor(x / 4) % 2;
  }
  const pieces = packTerrain(t);
  assert.ok(pieces.some(p => p.id === '4460b' || p.id === '98560'));
  assertPacked(t, pieces);
  for (const p of pieces) for (const c of p.cells) assert.equal(t.colors[c.index], p.color);
  t.slopes = false;
  assert.ok(packTerrain(t).every(p => p.kind !== 'slope'));
});
