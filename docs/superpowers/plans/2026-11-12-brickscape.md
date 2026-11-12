# Brickscape implementation plan

**Goal:** A local web terrain editor that assembles real-sized LEGO bricks, plates, and slopes while the user paints.

**Architecture:** A 32×32 heightfield stores heights in plate units and a color per stud. A deterministic packer places supported slope caps then fills below them with nonoverlapping catalog bricks/plates. Three.js renders instanced procedural part geometry. Vite serves a vanilla JavaScript interface.

**Scope decisions:** User authorized implementation choices and proceeding without further design questions. Build in the supplied local folder. Start empty; offer an explicit demo. Model exterior dimensions and stud placement; do not claim manufacturing CAD or structural certification. Initial slopes: 3039 2×2 and 3040b 1×2, rotated in four directions. Other slope families are future extensions, not mislabeled approximations.

## Tasks
- [x] Terrain engine (`src/terrain.js`, `tests/terrain.test.js`): brush radius, falloff, raise/lower, flatten, smooth and paint; bounded heights; snapshots, serialization validation and undo/redo. Test boundary clipping and malformed imports.
- [x] Part packing (`src/parts.js`, `tests/parts.test.js`): 3039/3040b fit exact two-plate height transitions with common support; greedy fill with real brick/plate footprints. Test four orientations, color boundaries, support and no overlapping occupied cells.
- [x] Geometry/rendering (`src/geometry.js`, `src/scene.js`): models use one stud = 20 LDU, one plate = 8 LDU, one brick = 24 LDU. Instanced pieces and baseplate, lighting, shadows, orbit/pan/zoom, raycast brush preview. Check slope geometry dimensions and stud positions.
- [x] Interface (`index.html`, `src/main.js`, `src/style.css`): sculpt/paint, brush settings, slope toggle, parts inventory, demo, undo/redo, save/load JSON, local autosave, camera views and clear. Responsive workstation layout.
- [x] Verify: Node test suite, production build and Playwright interactions including sculpting, slopes, undo, camera, save/load and invalid files. Inspect screenshot. Document run commands and researched dimensions.

## Review focus
- Brush reaches all edges without wrapping or painting outside the board.
- Slopes never overlap other pieces or leave their footprint unsupported.
- Drag produces a single undo step; pointer release outside viewport ends the stroke.
- Invalid saved files cannot replace the current project.
- Orbiting does not paint; touch controls remain usable; resize preserves the canvas.

## Verification results

- `npm test`: 15 passing unit tests.
- `npm run test:e2e`: 5 passing Chromium browser tests, including the no-op stroke redo regression.
- `npm run build`: success. Vite reports one advisory for the 512 kB minified Three.js engine chunk (131 kB gzip).
- Desktop and mobile screenshots inspected; portrait camera framing corrected and tested.
- Read-only review found a no-op brush stroke discarding redo. Reproduced with a failing browser test, fixed by recording history only on the first real edit, then reran all tests.
- All 12 part names checked against official LDraw reference files. Fonts are bundled locally.
- Production preview: HTTP 200, no JavaScript page errors; sample contains 397 pieces including 65 slopes. Empty and populated production screenshots inspected.
