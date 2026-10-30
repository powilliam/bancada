import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Renderer, camera, lights and floor: the studio the engine sits in. */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  readonly controls: OrbitControls;
  private readonly floor: THREE.Mesh;
  private readonly pmrem: THREE.PMREMGenerator;

  constructor(canvas: HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

    this.camera.position.set(1.75, 1.0, 2.0);
    const controls = new OrbitControls(this.camera, canvas);
    controls.target.set(0, 0.1, 0);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 0.8; controls.maxDistance = 5;
    controls.maxPolarAngle = Math.PI * 0.58;
    controls.enablePan = false;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.5;
    controls.addEventListener('start', () => { controls.autoRotate = false; });
    this.controls = controls;

    this.scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x1a1d22, 0.55));
    const key = new THREE.DirectionalLight(0xfff3e6, 2.2);
    key.position.set(1.6, 2.6, 1.4);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9, near: 0.5, far: 6 });
    key.shadow.bias = -0.0004; key.shadow.radius = 6;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc0ff, 1.1);
    rim.position.set(-1.8, 1.2, -1.6);
    this.scene.add(rim);

    this.floor = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.ShadowMaterial({ opacity: 0.38 }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.receiveShadow = true;
    this.scene.add(this.floor);
  }

  add(o: THREE.Object3D) {
    this.scene.add(o);
  }

  setFloor(y: number) {
    this.floor.position.y = y;
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // lift the engine clear of the instruments along the bottom
    this.camera.setViewOffset(w, h, 0, w < 860 ? h * 0.14 : h * 0.06, w, h);
    this.camera.fov = w / h < 1 ? 50 : w < 1100 ? 36 : 30;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
  }
}
