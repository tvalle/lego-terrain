# Brickscape

A browser-based 3D terrain editor using LEGO-sized bricks, plates and automatically oriented slopes. The initial project is an empty 32×32 stud baseplate. Click **Explore a sample landscape** to see a completed mountain.

## Features

- Sculpt a 32 × 32 stud landscape with Raise, Lower, Smooth, Flatten, and Paint tools.
- Generate bricks, plates, and oriented slopes automatically as you edit.
- Adjust brush size, strength, falloff, and display colors.
- Explore sample mountain and cliff landscapes, with undo and redo support.
- Save projects as JSON and export a parts inventory as CSV.
- Work entirely in your browser, with local autosave and no backend required.

Built with JavaScript, Three.js, and Vite.

## Getting started

Requires Node.js 20.19+ or 22.12+ and a browser with WebGL 2 support.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite (normally http://localhost:5173).

## Development

```sh
npm test          # terrain, packing and geometry tests
npm run test:e2e  # Chromium browser interaction checks
npm run build    # production output in dist/
npm run preview  # serve the production build
```

For a machine without Playwright Chromium installed, run `npx playwright install chromium` before the browser tests.

## Controls

- Left click/drag: sculpt using Raise, Lower, Smooth, Flatten or Paint.
- Keys **1–5**: select tools. **Shift + drag**: temporarily lower terrain.
- Right drag: orbit. Middle drag: pan. Scroll: zoom.
- Hold **Space** or toggle **Navigate** to orbit with the left button. On touch screens, Navigate enables one-finger orbit and two fingers zoom/pan.
- **F**: reset camera. **Ctrl/Cmd Z**: undo. **Ctrl/Cmd Shift Z**: redo.
- **Build with slopes**: automatically choose 45°, 65°, or nominal 75° slopes from the local height drop, in 1-stud and 2-stud widths. Tall parts keep their real dimensions.
- **Try a cliff landscape** (under Build with slopes): load an undoable tall rockwork example.
- **Save project / Open**: export/import portable JSON. Work also autosaves in the current browser.
- **Your pieces → List**: download a CSV of part IDs, display colors and counts.

Brush size is the diameter in studs; height is measured in plates. Three plates make one brick. A stroke is one undo step. Clear, opening a project, loading the demo, and changing slope mode can also be undone.

## Project structure

- `src/terrain.js`: brush operations, bounded heights, history and validated serialization.
- `src/parts.js`: deterministic nonoverlapping part packing and slope orientation.
- `src/geometry.js`: procedural, unscaled exterior models with correct stud layouts.
- `src/scene.js`: instanced Three.js rendering, camera, lighting, picking and brush indicator.
- `src/main.js`: UI, pointer/keyboard interaction, persistence and exports.
- `docs/research/lego-parts.md`: researched dimensions, part references and modeling limits.

This is a terrain design tool, not a physical assembly solver. Models omit underside details; no claim is made about structural stability or real part/color availability. Six straight slope variants are modeled across three angle families; inverted, corner and curved slopes are not included. The nominal 75° catalog family is named 73° by LEGO. LEGO is a trademark of the LEGO Group, which does not sponsor or endorse this project.

## License

This project is dedicated to the public domain under [CC0 1.0 Universal](LICENSE).
See the [Creative Commons CC0 summary](https://creativecommons.org/publicdomain/zero/1.0/) for an overview.
Third-party dependencies and fonts retain their respective licenses.
