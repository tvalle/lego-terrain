import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PARTS } from './parts.js';

export const PLATE = 0.4;
export const STUD_RADIUS = 0.3;
export const STUD_HEIGHT = 0.2;

export function createPartGeometry(id) {
  const part = PARTS[id];
  if (!part) throw new Error(`Unknown part: ${id}`);
  const { width, depth } = part;
  const height = part.height * PLATE;
  const geometries = [];
  if (part.kind === 'slope') {
    // Real 45/65/75-degree families: one-stud flat top and a 4-LDU nose.
    // The -Z row is high; +Z points downhill. Independently modeled exterior.
    const shape = new THREE.Shape();
    shape.moveTo(-0.9875, 0);
    shape.lineTo(0.9875, 0);
    shape.lineTo(0.9875, height - (height - 0.2) * 0.9875);
    shape.lineTo(0, height);
    shape.lineTo(-0.9875, height);
    shape.closePath();
    const body = new THREE.ExtrudeGeometry(shape, { depth: width - 0.025, bevelEnabled: false, steps: 1 });
    const pos = body.getAttribute('position');
    // Rotate the extrusion so shape X becomes world Z and extrusion Z becomes X.
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      pos.setXYZ(i, (width - 0.025) / 2 - z, y, x);
    }
    body.computeVertexNormals();
    geometries.push(body);
  } else {
    const body = new THREE.BoxGeometry(width - 0.025, height - 0.012, depth - 0.025).toNonIndexed();
    body.translate(0, height / 2, 0);
    geometries.push(body);
  }
  const rows = part.kind === 'slope' ? 1 : depth;
  for (let z = 0; z < rows; z++) for (let x = 0; x < width; x++) {
    const stud = part.hollowStud
      ? new THREE.LatheGeometry([
        new THREE.Vector2(0.2, -STUD_HEIGHT / 2),
        new THREE.Vector2(STUD_RADIUS, -STUD_HEIGHT / 2),
        new THREE.Vector2(STUD_RADIUS, STUD_HEIGHT / 2),
        new THREE.Vector2(0.2, STUD_HEIGHT / 2),
        new THREE.Vector2(0.2, -STUD_HEIGHT / 2),
      ], 24).toNonIndexed()
      : new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 20).toNonIndexed();
    stud.translate(x - (width - 1) / 2, height + STUD_HEIGHT / 2, z - (depth - 1) / 2);
    geometries.push(stud);
  }
  const result = mergeGeometries(geometries, false);
  for (const g of geometries) g.dispose();
  result.computeBoundingSphere();
  return result;
}
