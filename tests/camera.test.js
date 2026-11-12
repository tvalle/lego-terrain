import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { frameCamera } from '../src/camera.js';

test('reset camera keeps all four baseplate corners visible on portrait and landscape screens', () => {
  for (const aspect of [0.55, 0.8, 1, 1.5, 2.2]) for (const size of [8, 32, 64]) for (const top of [false, true]) {
    const camera = new PerspectiveCamera(38, aspect, 0.1, 350);
    frameCamera(camera, size, top);
    for (const x of [-size / 2, size / 2]) for (const z of [-size / 2, size / 2]) {
      const projected = new Vector3(x, 0, z).project(camera);
      assert.ok(Math.abs(projected.x) < 0.9 && Math.abs(projected.y) < 0.9, `cropped board at aspect ${aspect}`);
    }
  }
});
