export const MAX_HEIGHT = 48;
export const COLOR_COUNT = 8;

export function createTerrain(size = 32) {
  return { size, heights: new Float32Array(size * size), colors: new Uint8Array(size * size), slopes: true };
}

export function applyBrush(terrain, cx, cz, options) {
  const { tool = 'raise', radius = 4, strength = 1, height = 6, color = 0, falloff = true } = options;
  const { size, heights, colors } = terrain;
  const source = tool === 'smooth' ? heights.slice() : heights;
  let changed = false;
  for (let z = Math.max(0, Math.ceil(cz - radius)); z <= Math.min(size - 1, Math.floor(cz + radius)); z++) {
    for (let x = Math.max(0, Math.ceil(cx - radius)); x <= Math.min(size - 1, Math.floor(cx + radius)); x++) {
      const distance = Math.hypot(x - cx, z - cz);
      if (distance >= radius) continue;
      const i = z * size + x;
      const weight = falloff ? Math.pow(1 - distance / radius, 0.7) : 1;
      const previous = heights[i];
      const previousColor = colors[i];
      if (tool === 'raise') heights[i] = Math.min(MAX_HEIGHT, previous + strength * weight);
      if (tool === 'lower') heights[i] = Math.max(0, previous - strength * weight);
      if (tool === 'flatten') heights[i] = Math.max(0, Math.min(MAX_HEIGHT, height));
      if (tool === 'smooth') {
        let sum = 0, count = 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, nz = z + dz;
          if (nx >= 0 && nx < size && nz >= 0 && nz < size) { sum += source[nz * size + nx]; count++; }
        }
        heights[i] = previous + (sum / count - previous) * Math.min(1, strength * 0.25) * weight;
      }
      if (tool === 'paint' || (tool === 'raise' && previous < 0.5) || (tool === 'flatten' && previous < 0.5)) colors[i] = color;
      changed ||= heights[i] !== previous || colors[i] !== previousColor;
    }
  }
  return changed;
}

export function serialize(terrain) {
  return JSON.stringify({ format: 'brickscape', version: 1, size: terrain.size, slopes: terrain.slopes, heights: [...terrain.heights], colors: [...terrain.colors] });
}

export function deserialize(text) {
  const data = JSON.parse(text);
  if (!data || data.format !== 'brickscape' || data.version !== 1 || !Number.isInteger(data.size) || data.size < 8 || data.size > 64 || typeof data.slopes !== 'boolean') throw new Error('This is not a supported Brickscape project.');
  const count = data.size * data.size;
  if (!Array.isArray(data.heights) || data.heights.length !== count || !data.heights.every(h => typeof h === 'number' && Number.isFinite(h) && h >= 0 && h <= MAX_HEIGHT)) throw new Error('Project contains invalid terrain heights.');
  if (!Array.isArray(data.colors) || data.colors.length !== count || !data.colors.every(c => Number.isInteger(c) && c >= 0 && c < COLOR_COUNT)) throw new Error('Project contains invalid colors.');
  return { size: data.size, slopes: data.slopes, heights: Float32Array.from(data.heights), colors: Uint8Array.from(data.colors) };
}

function snapshot(t) { return { ...t, heights: t.heights.slice(), colors: t.colors.slice() }; }
function restore(t, saved) { Object.assign(t, snapshot(saved)); }

export class History {
  past = [];
  future = [];
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  push(t) { this.past.push(snapshot(t)); if (this.past.length > 60) this.past.shift(); this.future = []; }
  undo(t) { if (!this.canUndo) return false; this.future.push(snapshot(t)); restore(t, this.past.pop()); return true; }
  redo(t) { if (!this.canRedo) return false; this.past.push(snapshot(t)); restore(t, this.future.pop()); return true; }
}

export function makeDemo(size = 32) {
  const t = createTerrain(size);
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const u = x / size, v = z / size;
    const a = Math.exp(-((u - 0.40) ** 2 / 0.027 + (v - 0.42) ** 2 / 0.048));
    const b = Math.exp(-((u - 0.66) ** 2 / 0.018 + (v - 0.57) ** 2 / 0.026));
    const h = Math.max(0, Math.round(a * 19 + b * 13 - 1.8));
    t.heights[z * size + x] = h;
    t.colors[z * size + x] = h >= 16 ? 6 : h >= 11 ? 4 : h <= 2 ? 2 : 0;
  }
  return t;
}

export function makeCliffDemo(size = 32) {
  const t = createTerrain(size);
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5 - size * 0.48) / (size * 0.35);
    const v = (z + 0.5 - size * 0.48) / (size * 0.30);
    const r = Math.pow(Math.abs(u) ** 4 + Math.abs(v) ** 4, 0.25);
    const h = r < 0.55 ? 32 : r < 0.65 ? 24 : r < 0.76 ? 16 : r < 0.87 ? 8 : r < 0.98 ? 3 : r < 1.08 ? 1 : 0;
    t.heights[z * size + x] = h;
    t.colors[z * size + x] = 4;
  }
  return t;
}
