// Dimensions: stud spacing = 20 LDU; plate = 8 LDU; brick = 24 LDU.
export const PARTS = {
  '3001': { name: 'Brick 2 × 4', width: 2, depth: 4, height: 3, kind: 'brick' },
  '3002': { name: 'Brick 2 × 3', width: 2, depth: 3, height: 3, kind: 'brick' },
  '3003': { name: 'Brick 2 × 2', width: 2, depth: 2, height: 3, kind: 'brick' },
  '3004': { name: 'Brick 1 × 2', width: 1, depth: 2, height: 3, kind: 'brick' },
  '3005': { name: 'Brick 1 × 1', width: 1, depth: 1, height: 3, kind: 'brick' },
  '3020': { name: 'Plate 2 × 4', width: 2, depth: 4, height: 1, kind: 'plate' },
  '3021': { name: 'Plate 2 × 3', width: 2, depth: 3, height: 1, kind: 'plate' },
  '3022': { name: 'Plate 2 × 2', width: 2, depth: 2, height: 1, kind: 'plate' },
  '3023': { name: 'Plate 1 × 2', width: 1, depth: 2, height: 1, kind: 'plate' },
  '3024': { name: 'Plate 1 × 1', width: 1, depth: 1, height: 1, kind: 'plate' },
  '3039': { name: 'Slope 45° 2 × 2', width: 2, depth: 2, height: 3, kind: 'slope' },
  '3040b': { name: 'Slope 45° 1 × 2', width: 1, depth: 2, height: 3, kind: 'slope' },
  '60481': { name: 'Slope 65° 1 × 2 × 2', width: 1, depth: 2, height: 6, kind: 'slope' },
  '3678b': { name: 'Slope 65° 2 × 2 × 2', width: 2, depth: 2, height: 6, kind: 'slope' },
  '4460b': { name: 'Slope 75° 1 × 2 × 3', width: 1, depth: 2, height: 9, kind: 'slope', hollowStud: true },
  '98560': { name: 'Slope 75° 2 × 2 × 3', width: 2, depth: 2, height: 9, kind: 'slope' },
};

const fills = Object.entries(PARTS).filter(([, p]) => p.kind !== 'slope').flatMap(([id, p]) => [
  { id, ...p, rotation: 0 },
  ...(p.width !== p.depth ? [{ id, ...p, width: p.depth, depth: p.width, rotation: Math.PI / 2 }] : []),
]).sort((a, b) => (b.width * b.depth * b.height) - (a.width * a.depth * a.height));

// Prefer the steepest real profile that fits, then the wider part at that angle.
const slopes = Object.entries(PARTS).filter(([, p]) => p.kind === 'slope')
  .map(([id, p]) => ({ id, ...p }))
  .sort((a, b) => b.height - a.height || b.width - a.width);

export function packTerrain(terrain) {
  const { size, colors } = terrain;
  const tops = Uint8Array.from(terrain.heights, h => Math.round(h));
  const maxHeight = Math.max(...tops);
  const occupied = new Uint8Array(tops.length * maxHeight);
  const reserved = new Uint8Array(tops.length);
  const result = [];
  const inBounds = (x, z) => x >= 0 && x < size && z >= 0 && z < size;
  const mark = (cells, base) => {
    for (const cell of cells) for (let y = base; y < base + cell.height; y++) occupied[cell.index * maxHeight + y] = 1;
  };
  if (terrain.slopes) {
    for (const part of slopes) for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
      const i = z * size + x, high = tops[i];
      if (reserved[i] || high < part.height) continue;
      for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        if (!inBounds(x + dx, z + dz)) continue;
        const low = tops[(z + dz) * size + x + dx];
        if (low < 1 || high - low < part.height - 1) continue;
        const base = low - 1;
        const sx = dz, sz = -dx;
        const cells = [];
        let valid = true;
        for (let w = 0; w < part.width && valid; w++) for (let d = 0; d < 2; d++) {
          const nx = x + sx * w + dx * d, nz = z + sz * w + dz * d;
          const index = nz * size + nx;
          if (!inBounds(nx, nz) || reserved[index] || tops[index] !== (d === 0 ? high : low) || colors[index] !== colors[i]) { valid = false; break; }
          cells.push({ index, height: d === 0 ? part.height : 1 });
        }
        if (!valid) continue;
        result.push({ id: part.id, kind: 'slope', x: x + 0.5 + sx * (part.width - 1) / 2 + dx / 2, z: z + 0.5 + sz * (part.width - 1) / 2 + dz / 2, y: base, height: part.height, rotation: Math.atan2(dx, dz), color: colors[i], cells });
        mark(cells, base);
        for (const cell of cells) reserved[cell.index] = 1;
        break;
      }
    }
  }
  // Reserve actual vertical intervals, not whole columns: a cliff taller than
  // one slope can still carry bricks above the slope's flat, studded upper row.
  for (let y = 0; y < maxHeight; y++) for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const i = z * size + x;
    if (occupied[i * maxHeight + y] || tops[i] <= y) continue;
    for (const part of fills) {
      if (x + part.width > size || z + part.depth > size) continue;
      const cells = [];
      let valid = true;
      for (let dz = 0; dz < part.depth && valid; dz++) for (let dx = 0; dx < part.width; dx++) {
        const index = (z + dz) * size + x + dx;
        if (tops[index] < y + part.height || colors[index] !== colors[i]) { valid = false; break; }
        for (let layer = y; layer < y + part.height; layer++) if (occupied[index * maxHeight + layer]) { valid = false; break; }
        if (!valid) break;
        cells.push({ index, height: part.height });
      }
      if (!valid) continue;
      result.push({ id: part.id, kind: part.kind, x: x + part.width / 2, z: z + part.depth / 2, y, height: part.height, rotation: part.rotation, color: colors[i], cells });
      mark(cells, y);
      break;
    }
  }
  return result;
}

export function inventory(pieces) {
  const counts = new Map();
  for (const p of pieces) counts.set(p.id, (counts.get(p.id) || 0) + 1);
  return [...counts].map(([id, count]) => ({ id, count, ...PARTS[id] })).sort((a, b) => b.count - a.count);
}
