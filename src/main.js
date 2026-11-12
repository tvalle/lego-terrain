import { createIcons, Blocks, CircleHelp, FolderOpen, Download, Grid2x2, Undo2, Redo2, Trash2, Box, Scan, Plus, Minus, Maximize, MousePointer2, ArrowUpRight, Hand, SlidersHorizontal, Mountain, ArrowDownToLine, Waves, AlignVerticalJustifyCenter, Paintbrush, CircleDashed, List, HardDrive, X } from 'lucide';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import './style.css';
import { createTerrain, applyBrush, History, serialize, deserialize, makeDemo, makeCliffDemo } from './terrain.js';
import { packTerrain, inventory } from './parts.js';
import { COLORS } from './colors.js';
import { TerrainScene } from './scene.js';

const $ = selector => document.querySelector(selector);
const iconSet = { Blocks, CircleHelp, FolderOpen, Download, Grid2x2, Undo2, Redo2, Trash2, Box, Scan, Plus, Minus, Maximize, MousePointer2, ArrowUpRight, Hand, SlidersHorizontal, Mountain, ArrowDownToLine, Waves, AlignVerticalJustifyCenter, Paintbrush, CircleDashed, List, HardDrive, X };
createIcons({ icons: iconSet });
const storageKey = 'brickscape-project-v1';
let terrain = createTerrain();
let restoreError = false;
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) terrain = deserialize(saved);
} catch { restoreError = true; }
const history = new History();
const settings = { tool: 'raise', radius: 4, strength: 1.35, height: 6, color: 0, falloff: true };
let pieces = [];
let scene;
let navMode = false, spaceHeld = false;
let hit = null, stroke = null, shiftHeld = false;
let toastTimeout, saveTimeout;

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}

function persist() {
  clearTimeout(saveTimeout);
  try {
    localStorage.setItem(storageKey, serialize(terrain));
    $('#save-status').textContent = 'Saved on this device';
    $('.saved-dot').title = 'Autosaved on this device';
  } catch {
    $('#save-status').textContent = 'Use Save project to keep your work';
    $('.saved-dot').title = 'Local save unavailable — download a backup';
  }
}

function refresh(save = true) {
  pieces = packTerrain(terrain);
  scene?.update(terrain, pieces);
  $('#piece-count').textContent = pieces.length.toLocaleString();
  $('#slope-count').textContent = pieces.filter(p => p.kind === 'slope').length.toLocaleString();
  $('#board-size').textContent = `${terrain.size} × ${terrain.size} studs`;
  $('.parts-footnote').textContent = `Plus one ${terrain.size} × ${terrain.size} stud baseplate`;
  $('#empty-hint').hidden = pieces.length > 0;
  $('#slopes').checked = terrain.slopes;
  $('#undo').disabled = !history.canUndo;
  $('#redo').disabled = !history.canRedo;
  const rows = inventory(pieces);
  $('#inventory').innerHTML = rows.length ? rows.map(p => `<div class="inventory-row"><span class="piece-mini">${p.kind === 'slope' ? '<svg viewBox="0 0 28 24" fill="none"><path d="M3 19V5h8l14 14v3H3z" fill="currentColor" opacity=".3"/><path d="M3 19V5h8l14 14v3H3zM3 19h22" stroke="currentColor" stroke-width="1.2"/></svg>' : '<svg viewBox="0 0 28 24" fill="none"><path d="M3 9l11-5 11 5v10l-11 4-11-4z" fill="currentColor" opacity=".3"/><path d="M3 9l11-5 11 5v10l-11 4-11-4zM3 9l11 5 11-5M14 14v9" stroke="currentColor" stroke-width="1.2"/><ellipse cx="14" cy="6" rx="3" ry="1.5" stroke="currentColor"/></svg>'}</span><span><strong>${p.name}</strong><small>${p.id}</small></span><span class="count">× ${p.count}</span></div>`).join('') : '<div class="inventory-empty">A blank canvas. Endless possibilities.<br>Your pieces will appear here as you sculpt.</div>';
  if (save) {
    $('#save-status').textContent = 'Saving…';
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(persist, 250);
  }
  updateCursor();
}

function updateCursor() {
  const available = hit && !navMode && !spaceHeld;
  scene?.showBrush(available ? hit : null, settings.radius, hit ? Math.round(terrain.heights[hit.z * terrain.size + hit.x]) : 0);
  $('#cursor-position').textContent = hit ? `X ${hit.x + 1} · Z ${hit.z + 1} · H ${Math.round(terrain.heights[hit.z * terrain.size + hit.x])}` : 'READY TO BUILD';
}

function endStroke() {
  if (!stroke) return;
  const pointer = stroke.pointerId;
  stroke = null;
  if (scene?.renderer.domElement.hasPointerCapture(pointer)) scene.renderer.domElement.releasePointerCapture(pointer);
  persist();
}

function paintAt(target) {
  if (!target || !stroke) return;
  const tool = shiftHeld && settings.tool !== 'paint' ? 'lower' : settings.tool;
  const before = !stroke.recorded ? { ...terrain, heights: terrain.heights.slice(), colors: terrain.colors.slice() } : null;
  const changed = applyBrush(terrain, target.x, target.z, { ...settings, tool });
  if (changed) {
    if (before) { history.push(before); stroke.recorded = true; }
    refresh();
  }
  stroke.lastPaint = performance.now();
}

function selectTool(tool) {
  endStroke();
  settings.tool = tool;
  const descriptions = { raise: 'Build up hills, one layer at a time.', lower: 'Carve valleys back toward the baseplate.', smooth: 'Soften transitions between neighboring heights.', flatten: 'Level an area to an exact plate height.', paint: 'Recolor pieces without changing the terrain.' };
  for (const button of document.querySelectorAll('[data-tool]')) {
    const active = button.dataset.tool === tool;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  $('#tool-description').textContent = descriptions[tool];
  $('#flatten-setting').hidden = tool !== 'flatten';
  $('#strength').disabled = tool === 'paint' || tool === 'flatten';
  if (navMode) setNavigation(false);
}

function setNavigation(value) {
  endStroke();
  navMode = value;
  $('#navigate').setAttribute('aria-pressed', String(value));
  scene?.setNavigation(navMode || spaceHeld);
  updateCursor();
}

for (const button of document.querySelectorAll('[data-tool]')) button.addEventListener('click', () => selectTool(button.dataset.tool));
for (const [index, color] of COLORS.entries()) {
  const button = document.createElement('button');
  button.className = `swatch${index === 0 ? ' active' : ''}`;
  button.style.background = color.hex;
  button.title = color.name;
  button.setAttribute('aria-label', color.name);
  button.setAttribute('aria-pressed', String(index === 0));
  button.addEventListener('click', () => {
    settings.color = index;
    $('#color-name').textContent = color.name;
    for (const swatch of $('#palette').children) { const active = swatch === button; swatch.classList.toggle('active', active); swatch.setAttribute('aria-pressed', String(active)); }
  });
  $('#palette').append(button);
}
for (const id of ['radius', 'strength', 'height']) {
  const input = $(`#${id}`);
  const sync = () => {
    const value = Number(input.value);
    settings[id] = id === 'strength' ? value * 0.03 : value;
    $(`#${id}-output`).innerHTML = id === 'radius' ? `${value * 2} <small>studs</small>` : id === 'strength' ? `${value}<small>%</small>` : `${value} <small>plates</small>`;
    input.style.setProperty('--fill', `${(value - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
    updateCursor();
  };
  input.addEventListener('input', sync);
  sync();
}
$('#falloff').addEventListener('change', e => { settings.falloff = e.target.checked; });
$('#slopes').addEventListener('change', e => { endStroke(); history.push(terrain); terrain.slopes = e.target.checked; refresh(); });
$('#navigate').addEventListener('click', () => setNavigation(!navMode));
$('#undo').addEventListener('click', () => { endStroke(); if (history.undo(terrain)) { hit = null; refresh(); toast('Undid last edit'); } });
$('#redo').addEventListener('click', () => { endStroke(); if (history.redo(terrain)) { hit = null; refresh(); toast('Redid last edit'); } });
$('#clear').addEventListener('click', () => { endStroke(); if (!pieces.length) return; history.push(terrain); terrain = createTerrain(terrain.size); hit = null; refresh(); toast('Baseplate cleared. Undo to restore your terrain.'); });
$('#demo').addEventListener('click', () => { endStroke(); history.push(terrain); terrain = makeDemo(terrain.size); refresh(); toast('Sample landscape loaded. Make it your own.'); });
$('#cliff-demo').addEventListener('click', () => { endStroke(); history.push(terrain); terrain = makeCliffDemo(terrain.size); hit = null; refresh(); toast('Cliff landscape loaded with 65° and 75° slopes. Undo to return.'); });
for (const [id, top] of [['view-iso', false], ['view-top', true], ['view-reset', false]]) {
  $(`#${id}`).addEventListener('click', () => {
    endStroke(); scene?.resetCamera(top);
    $('#view-iso').classList.toggle('active', !top); $('#view-top').classList.toggle('active', top);
    $('#view-mode').textContent = top ? 'TOP VIEW' : 'PERSPECTIVE';
  });
}
$('#zoom-in').addEventListener('click', () => scene?.zoom(0.85));
$('#zoom-out').addEventListener('click', () => scene?.zoom(1.18));
$('#help').addEventListener('click', () => { endStroke(); $('#help-dialog').showModal(); });
$('#close-help').addEventListener('click', () => $('#help-dialog').close());
$('#help-dialog').addEventListener('click', e => { if (e.target === $('#help-dialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } });

function download(name, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#save').addEventListener('click', () => { endStroke(); persist(); download('brickscape-terrain.json', serialize(terrain), 'application/json'); toast('Project downloaded'); });
$('#export-parts').addEventListener('click', () => {
  const byColor = new Map();
  for (const p of pieces) { const key = `${p.id}:${p.color}`; byColor.set(key, (byColor.get(key) || 0) + 1); }
  const rows = [...byColor].map(([key, count]) => { const [id, color] = key.split(':'); return `${id},${COLORS[color].name},${count}`; });
  download('brickscape-parts.csv', ['Part ID,Display color,Quantity', ...rows, `Baseplate ${terrain.size}x${terrain.size},Green,1`].join('\n'), 'text/csv');
  toast('Parts list downloaded');
});
$('#load').addEventListener('click', () => $('#file-input').click());
$('#file-input').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('Project file is too large.');
    const loaded = deserialize(await file.text());
    endStroke(); history.push(terrain); terrain = loaded; hit = null; refresh();
    toast('Project opened. Undo to return to your previous terrain.');
  } catch (error) { toast(`Could not open project: ${error.message}`); }
  e.target.value = '';
});

try {
  scene = new TerrainScene($('#viewport'));
  const canvas = scene.renderer.domElement;
  canvas.draggable = false;
  canvas.addEventListener('dragstart', e => e.preventDefault());
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    // Pointer capture keeps the stroke alive; cancel the browser's separate
    // selection/drag gesture without blocking OrbitControls' pointer handlers.
    e.preventDefault();
    if (!e.isPrimary) { endStroke(); return; }
    shiftHeld = e.shiftKey;
    if (e.button !== 0 || navMode || spaceHeld) { endStroke(); return; }
    hit = scene.pick(e.clientX, e.clientY);
    if (!hit) return;
    canvas.setPointerCapture(e.pointerId);
    stroke = { pointerId: e.pointerId, recorded: false, lastPaint: 0, lastHit: hit };
    paintAt(hit);
  });
  canvas.addEventListener('pointermove', e => {
    if (!e.isPrimary) return;
    shiftHeld = e.shiftKey;
    const next = scene.pick(e.clientX, e.clientY);
    hit = next;
    if (stroke && next && (next.x !== stroke.lastHit?.x || next.z !== stroke.lastHit?.z)) {
      const last = stroke.lastHit;
      if (last) {
        const distance = Math.hypot(next.x - last.x, next.z - last.z);
        const steps = Math.max(1, Math.ceil(distance / Math.max(1, settings.radius * 0.5)));
        // Fill gaps in a fast drag without applying dozens of repeated stamps.
        for (let i = 1; i <= steps; i++) paintAt({ x: last.x + (next.x - last.x) * i / steps, z: last.z + (next.z - last.z) * i / steps });
      } else paintAt(next);
      stroke.lastHit = next;
    }
    updateCursor();
  });
  canvas.addEventListener('pointerleave', () => { hit = null; updateCursor(); });
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('lostpointercapture', endStroke);
  const tick = () => {
    if (stroke && hit && performance.now() - stroke.lastPaint > 110) paintAt(hit);
    requestAnimationFrame(tick);
  };
  tick();
  $('#viewport').addEventListener('render-error', () => toast('The 3D context was lost. Save your project, then reload this page.'));
} catch (error) {
  $('#viewport').innerHTML = '<div class="render-error"><strong>3D rendering could not start.</strong>This editor needs WebGL 2. Enable hardware acceleration in your browser, then reload. Your saved project is kept on this device.</div>';
  console.error(error);
}

window.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || $('#help-dialog').open) return;
  if (e.code === 'Space') { e.preventDefault(); if (!spaceHeld) { endStroke(); spaceHeld = true; scene?.setNavigation(true); updateCursor(); } }
  if (e.key === 'Shift') shiftHeld = true;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); $(e.shiftKey ? '#redo' : '#undo').click(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); $('#redo').click(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tool = ['raise', 'lower', 'smooth', 'flatten', 'paint'][Number(e.key) - 1];
  if (tool) selectTool(tool);
  if (e.key.toLowerCase() === 'f') $('#view-reset').click();
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space') { spaceHeld = false; scene?.setNavigation(navMode); updateCursor(); }
  if (e.key === 'Shift') shiftHeld = false;
});
window.addEventListener('blur', () => { endStroke(); spaceHeld = false; shiftHeld = false; scene?.setNavigation(navMode); });
window.addEventListener('pointerup', endStroke);
window.addEventListener('pagehide', persist);
document.addEventListener('visibilitychange', () => { if (document.hidden) { endStroke(); persist(); } });
refresh(false);
if (restoreError) toast('The previous local save could not be restored. You can open a downloaded project.');
if (import.meta.hot) import.meta.hot.dispose(() => scene?.dispose());
