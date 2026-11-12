import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartGeometry } from '../src/geometry.js';
import { Raycaster, Vector3, Mesh, MeshBasicMaterial, DoubleSide } from 'three';

test('2×4 brick keeps real proportions with studs above the brick body', () => {
  const geometry = createPartGeometry('3001');
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  assert.ok(Math.abs(b.max.x - b.min.x - 1.975) < 0.001);
  assert.ok(Math.abs(b.max.z - b.min.z - 3.975) < 0.001);
  assert.ok(Math.abs(b.max.y - 1.4) < 0.001);
});

test('slope surface falls toward the nose and studs exist only on the upper row', () => {
  const mesh = new Mesh(createPartGeometry('3039'), new MeshBasicMaterial({ side: DoubleSide }));
  const heightAt = (x, z) => new Raycaster(new Vector3(x, 5, z), new Vector3(0, -1, 0)).intersectObject(mesh)[0].point.y;
  assert.ok(Math.abs(heightAt(0.5, -0.5) - 1.4) < 0.01);
  assert.ok(Math.abs(heightAt(0.5, 0.5) - 0.7) < 0.03);
  assert.ok(heightAt(0.5, 0.85) < heightAt(0.5, 0.4));
});

for (const [id, bodyHeight, width, faceHeight] of [['60481', 2.4, 1, 1.3], ['3678b', 2.4, 2, 1.3], ['4460b', 3.6, 1, 1.9], ['98560', 3.6, 2, 1.9]]) {
  test(`${id} uses its real tall profile without stretching the studs`, () => {
    const geometry = createPartGeometry(id);
    geometry.computeBoundingBox();
    assert.ok(Math.abs(geometry.boundingBox.max.y - (bodyHeight + 0.2)) < 0.001);
    assert.ok(Math.abs(geometry.boundingBox.max.x - geometry.boundingBox.min.x - (width - 0.025)) < 0.001);
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
    const heightAt = (x, z) => new Raycaster(new Vector3(x, 6, z), new Vector3(0, -1, 0)).intersectObject(mesh)[0].point.y;
    assert.ok(Math.abs(heightAt(0, 0.5) - faceHeight) < 0.01);
    const studX = width === 1 ? 0 : 0.5;
    assert.ok(Math.abs(heightAt(studX + 0.25, -0.5) - bodyHeight - 0.2) < 0.001);
    if (id === '4460b') assert.ok(heightAt(0, -0.5) < bodyHeight + 0.01, '4460b must have a hollow stud');
    geometry.dispose(); mesh.material.dispose();
  });
}
