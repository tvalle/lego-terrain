import { Vector3 } from 'three';

export function frameCamera(camera, size, top = false) {
  const direction = new Vector3(top ? 0 : 39, top ? 68 : 42, top ? 0.01 : 48).normalize();
  let distance = (top ? 68 : 75) * size / 32;
  for (let attempt = 0; attempt < 40; attempt++) {
    camera.position.copy(direction).multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    let fits = true;
    for (const x of [-size / 2, size / 2]) for (const z of [-size / 2, size / 2]) {
      const projected = new Vector3(x, 0, z).project(camera);
      if (Math.abs(projected.x) > 0.84 || Math.abs(projected.y) > 0.84) fits = false;
    }
    if (fits) return;
    distance *= 1.08;
  }
}
