import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPartGeometry, PLATE } from './geometry.js';
import { COLORS } from './colors.js';
import { frameCamera } from './camera.js';

export class TerrainScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e9ede5');
    this.scene.fog = new THREE.Fog('#e9ede5', 110, 220);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive LEGO terrain');
    container.append(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 350);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 110;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 0, 0);
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('change', () => { this.dirty = true; });
    this.setNavigation(false);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x819275, 1.8));
    const sun = new THREE.DirectionalLight(0xfff8e9, 2.6);
    sun.position.set(-20, 40, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 120 });
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.00015;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xe3edff, 1.2);
    fill.position.set(20, 15, -30);
    this.scene.add(fill);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: '#e9ede5', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.28;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.material = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.02 });
    this.geometryCache = new Map();
    this.terrainGroup = new THREE.Group();
    this.baseGroup = new THREE.Group();
    this.scene.add(this.terrainGroup, this.baseGroup);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.matrix = new THREE.Matrix4();
    this.dummy = new THREE.Object3D();
    this.pickerGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.pickerMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.cursor = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 80), new THREE.MeshBasicMaterial({ color: '#f5ffb7', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 20;
    this.cursor.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.97, 80), new THREE.MeshBasicMaterial({ color: '#d7ff8d', transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2;
    disc.renderOrder = 19;
    this.cursor.add(disc);
    this.cursor.visible = false;
    this.scene.add(this.cursor);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resetCamera();
    this.animate = () => {
      this.animationId = requestAnimationFrame(this.animate);
      this.controls.update();
      if (this.dirty) { this.renderer.render(this.scene, this.camera); this.dirty = false; }
    };
    this.animate();
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); container.dispatchEvent(new CustomEvent('render-error')); });
  }

  resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    const previousAspect = this.camera.aspect;
    this.camera.aspect = width / height;
    const ratio = Math.max(1, 1 / this.camera.aspect) / Math.max(1, 1 / previousAspect);
    this.camera.position.sub(this.controls.target).multiplyScalar(ratio).add(this.controls.target);
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  setNavigation(enabled) {
    this.controls.mouseButtons = { LEFT: enabled ? THREE.MOUSE.ROTATE : null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: enabled ? THREE.TOUCH.ROTATE : null, TWO: THREE.TOUCH.DOLLY_PAN };
    this.container.classList.toggle('navigating', enabled);
  }

  resetCamera(top = false) {
    this.controls.target.set(0, 0, 0);
    frameCamera(this.camera, this.size || 32, top);
    this.controls.maxDistance = Math.max(110, this.camera.position.length() * 1.8);
    this.controls.update();
    this.dirty = true;
  }

  zoom(factor) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(offset.setLength(distance));
    this.controls.update();
    this.dirty = true;
  }

  buildBase(size) {
    for (const child of [...this.baseGroup.children]) { this.baseGroup.remove(child); child.geometry.dispose(); child.material.dispose(); if (child.isInstancedMesh) child.dispose(); }
    if (this.picker) this.picker.dispose();
    this.size = size;
    const material = new THREE.MeshStandardMaterial({ color: '#72916a', roughness: 0.4 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), material);
    base.position.y = -0.1;
    base.receiveShadow = true;
    base.castShadow = true;
    this.baseGroup.add(base);
    const studs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), material.clone(), size * size);
    studs.castShadow = true;
    studs.receiveShadow = true;
    for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
      this.matrix.makeTranslation(x + 0.5 - size / 2, 0.1, z + 0.5 - size / 2);
      studs.setMatrixAt(z * size + x, this.matrix);
    }
    this.baseGroup.add(studs);
    this.picker = new THREE.InstancedMesh(this.pickerGeometry, this.pickerMaterial, size * size);
    this.resetCamera();
  }

  update(terrain, pieces) {
    if (this.size !== terrain.size) this.buildBase(terrain.size);
    for (const child of [...this.terrainGroup.children]) { this.terrainGroup.remove(child); child.dispose(); }
    const grouped = new Map();
    for (const p of pieces) { if (!grouped.has(p.id)) grouped.set(p.id, []); grouped.get(p.id).push(p); }
    for (const [id, list] of grouped) {
      if (!this.geometryCache.has(id)) this.geometryCache.set(id, createPartGeometry(id));
      const mesh = new THREE.InstancedMesh(this.geometryCache.get(id), this.material, list.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        this.dummy.position.set(p.x - this.size / 2, p.y * PLATE, p.z - this.size / 2);
        this.dummy.rotation.set(0, p.rotation, 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
        mesh.setColorAt(i, new THREE.Color(COLORS[p.color].hex));
      }
      mesh.computeBoundingSphere();
      this.terrainGroup.add(mesh);
    }
    for (let z = 0; z < this.size; z++) for (let x = 0; x < this.size; x++) {
      const i = z * this.size + x;
      const h = Math.round(terrain.heights[i]) * PLATE + 0.2;
      this.dummy.position.set(x + 0.5 - this.size / 2, h / 2, z + 0.5 - this.size / 2);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, h, 1);
      this.dummy.updateMatrix();
      this.picker.setMatrixAt(i, this.dummy.matrix);
    }
    this.picker.computeBoundingSphere();
    this.picker.updateMatrixWorld(true);
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }

  pick(clientX, clientY) {
    if (!this.picker) return null;
    const rect = this.container.getBoundingClientRect();
    this.mouse.set((clientX - rect.left) / rect.width * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = this.raycaster.intersectObject(this.picker, false)[0];
    if (!hit) return null;
    const index = hit.instanceId;
    return { x: index % this.size, z: Math.floor(index / this.size), point: hit.point };
  }

  showBrush(hit, radius, height = 0) {
    this.cursor.visible = !!hit;
    if (hit) {
      this.cursor.position.set(hit.x + 0.5 - this.size / 2, height * PLATE + 0.24, hit.z + 0.5 - this.size / 2);
      this.cursor.scale.set(radius, 1, radius);
    }
    this.dirty = true;
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.scene.traverse(object => {
      if (object.isInstancedMesh) object.dispose();
      if (object.geometry) object.geometry.dispose();
      if (object.material) object.material.dispose();
    });
    this.picker?.dispose();
    this.pickerGeometry.dispose();
    this.pickerMaterial.dispose();
    this.renderer.dispose();
  }
}
