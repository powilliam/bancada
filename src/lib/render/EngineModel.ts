import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Engine } from '../engines';
import type { ExhaustKit } from '../exhaust';
import { TAU } from '../math';
import type { Bench } from '../sim/Bench';

const V2 = THREE.Vector2, v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z), deg = THREE.MathUtils.degToRad;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
type P2 = [number, number];

function hull2(input: P2[]): P2[] {
  const pts = input.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P2[] = [], up: P2[] = [];
  for (const p of pts) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** outline around a set of circles, for the accessory belt */
function beltHull(circles: P2[] | [number, number, number][]): P2[] {
  const pts: P2[] = [];
  for (const [x, y, r] of circles as [number, number, number][]) {
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  }
  return hull2(pts);
}

/** points a Y-axis mesh along a direction in the XY plane */
const alignY = (o: THREE.Object3D, dx: number, dy: number) => { o.rotation.z = -Math.atan2(dx, dy); return o; };

interface Bank { a: number; ax: THREE.Vector2; out: THREE.Vector2 }
interface PistonPart { mesh: THREE.Mesh; rod: THREE.Mesh; z: number; ax: THREE.Vector2; pin: number; lift: number }

/** Procedural model of whichever engine is on the stand, with an x-ray view of its internals. */
export class EngineModel {
  readonly group = new THREE.Group();
  /** y of the ground under the current engine, world units */
  floorY = 0;

  private readonly shellMats: THREE.MeshStandardMaterial[] = [];
  private readonly M = {
    block: this.mat({ color: 0x8a9199, metalness: 0.6, roughness: 0.5 }, true),
    head: this.mat({ color: 0x80878f, metalness: 0.6, roughness: 0.45 }, true),
    cover: this.mat({ color: 0x1c1f24, metalness: 0.25, roughness: 0.78 }, true),
    intake: this.mat({ color: 0x22252a, metalness: 0.1, roughness: 0.52 }, true),
    pan: this.mat({ color: 0x2a2e33, metalness: 0.5, roughness: 0.55 }, true),
    front: this.mat({ color: 0x737a82, metalness: 0.6, roughness: 0.5 }, true),
    coil: this.mat({ color: 0x33373d, metalness: 0.2, roughness: 0.6 }),
    pulley: this.mat({ color: 0x3a3e44, metalness: 0.8, roughness: 0.35 }),
    pulleyHi: this.mat({ color: 0xc9ced3, metalness: 0.9, roughness: 0.25 }),
    tb: this.mat({ color: 0xb8bec4, metalness: 0.85, roughness: 0.25 }),
    trumpet: this.mat({ color: 0xc9ced3, metalness: 0.9, roughness: 0.22, side: THREE.DoubleSide }),
    belt: this.mat({ color: 0x15171a, roughness: 0.9 }),
    piston: this.mat({ color: 0xd5d9dd, metalness: 0.7, roughness: 0.3 }),
    rod: this.mat({ color: 0x7d838a, metalness: 0.9, roughness: 0.3 }),
    crank: this.mat({ color: 0x5e646b, metalness: 0.9, roughness: 0.32 }),
  };
  private readonly headerMat = new THREE.MeshStandardMaterial({ color: 0x86817a, metalness: 0.85, roughness: 0.33, emissive: 0x000000 });
  private readonly collectorMat = this.headerMat.clone();
  private readonly canMat = new THREE.MeshStandardMaterial();

  private engine!: Engine;
  private internals = new THREE.Group();
  private xray = false;
  private pistons: PistonPart[] = [];
  private flashes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  private pulleys: { grp: THREE.Group; ratio: number }[] = [];
  private crank: THREE.Group | null = null;
  /** slowed visual crank angle, 0..720 */
  private theta = 0;

  private mat(o: THREE.MeshStandardMaterialParameters, shell = false) {
    const m = new THREE.MeshStandardMaterial(o);
    if (shell) this.shellMats.push(m);
    return m;
  }

  get xrayOn() {
    return this.xray;
  }

  setXray(on: boolean) {
    this.xray = on;
    for (const m of this.shellMats) { m.transparent = on; m.opacity = on ? 0.12 : 1; m.depthWrite = !on; m.needsUpdate = true; }
    this.internals.visible = on;
  }

  build(E: Engine, X: ExhaustKit) {
    this.engine = E;
    this.clear();
    const { M, headerMat, collectorMat } = this;
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = this.group, cast = true) => {
      const o = new THREE.Mesh(geo, m); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o;
    };
    const G = E.geometry, u = G.bore / 0.093, rC = G.stroke / 2, deck = rC + G.rod + G.bore * 0.32;
    const W = G.crankW, low = G.crankLow;
    const zs = G.cylinders.map(c => c.z), zMax = Math.max(...zs) + G.bore * 0.75, zMin = Math.min(...zs) - G.bore * 0.75;
    const L = zMax - zMin, zMid = (zMax + zMin) / 2;
    const banks: Bank[] = G.banks.map(angle => {
      const a = deg(angle), s = angle >= 0 ? 1 : -1;
      return { a, ax: new V2(Math.sin(a), Math.cos(a)), out: new V2(s * Math.cos(a), -s * Math.sin(a)) };
    });
    const at = (bk: Bank, d: number, p = 0) => new V2(bk.ax.x * d + bk.out.x * p, bk.ax.y * d + bk.out.y * p);
    this.group.scale.setScalar(G.scale);
    this.floorY = (low - 0.13 * u) * G.scale - 0.004;

    // block: outline around crankcase and decks, extruded along the crank
    const hw = G.bore * 0.7;
    const pts: P2[] = [[-W, low], [W, low], [-W - 0.03 * u, 0.02 * u], [W + 0.03 * u, 0.02 * u]];
    for (const bk of banks) for (const p of [hw, -hw]) { const v = at(bk, deck, p); pts.push([v.x, v.y]); }
    const sh = new THREE.Shape(hull2(pts).map(([x, y]) => new V2(x, y)));
    const bg = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
    bg.translate(0, 0, zMin);
    add(bg, M.block);
    const fc = new THREE.ExtrudeGeometry(sh, { depth: 0.03 * u, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.008, bevelSegments: 2 });
    const fcm = add(fc, M.front); fcm.scale.set(1.04, 1.04, 1); fcm.position.z = zMax;

    for (const bk of banks) {
      const place = (o: THREE.Object3D, v: THREE.Vector2) => { o.position.set(v.x, v.y, zMid); o.rotation.z = -bk.a; };
      place(add(new RoundedBoxGeometry(G.bore * 2.15, 0.1 * u, L + 0.01, 2, 0.012 * u), M.head), at(bk, deck + 0.05 * u));
      place(add(new RoundedBoxGeometry(G.bore * 2.02, 0.06 * u, L + 0.03, 3, 0.024 * u), M.cover), at(bk, deck + 0.13 * u));
      for (const sx of [-0.06, 0.06]) place(add(new THREE.BoxGeometry(0.012 * u, 0.012 * u, L - 0.02), M.cover), at(bk, deck + 0.165 * u, sx * u));
    }

    const colls: Record<number, { x: number; y: number; z: number }> = {};
    E.cylinders.forEach((c, i) => {
      const bk = banks[c.bank], z = c.z;
      const cp = at(bk, deck + 0.175 * u), pp = at(bk, deck + 0.198 * u, -0.012 * u);
      const coil = add(new THREE.CylinderGeometry(0.019 * u, 0.019 * u, 0.035 * u, 16), M.coil);
      coil.position.set(cp.x, cp.y, z); coil.rotation.z = -bk.a;
      const plug = add(new THREE.BoxGeometry(0.03 * u, 0.012 * u, 0.04 * u), M.coil);
      plug.position.set(pp.x, pp.y, z); plug.rotation.z = -bk.a;

      // intake: runners to a plenum, or individual throttle bodies with bellmouths
      const port = at(bk, deck + 0.06 * u, -0.1 * u);
      if (G.intake === 'plenum') {
        const s = Math.sign(bk.ax.x) || 1, py = deck + 0.27 * u;
        const run = new THREE.CatmullRomCurve3([v3(s * 0.04 * u, py, z), v3(s * 0.13 * u, py - 0.01 * u, z), v3(s * 0.17 * u, py - 0.09 * u, z), v3(port.x, port.y, z)]);
        add(new THREE.TubeGeometry(run, 24, 0.021 * u, 12), M.intake);
      } else {
        const up = G.intake === 'itb-up';
        const d = up ? new V2(0, 1) : new V2(-bk.out.x + bk.ax.x * 0.5, -bk.out.y + bk.ax.y * 0.5).normalize();
        const q = port.clone().addScaledVector(d, (up ? 0.1 : 0.08) * u);
        const run = new THREE.CatmullRomCurve3([v3(port.x, port.y, z), v3(lerp(port.x, q.x, 0.5) - bk.out.x * 0.01 * u, lerp(port.y, q.y, 0.5), z), v3(q.x, q.y, z)]);
        add(new THREE.TubeGeometry(run, 16, 0.021 * u, 12), M.intake);
        const tb = add(new THREE.CylinderGeometry(0.025 * u, 0.025 * u, 0.05 * u, 20), M.tb);
        alignY(tb, d.x, d.y).position.set(q.x + d.x * 0.025 * u, q.y + d.y * 0.025 * u, z);
        const tr = add(new THREE.CylinderGeometry(0.038 * u, 0.024 * u, 0.04 * u, 24, 1, true), M.trumpet);
        alignY(tr, d.x, d.y).position.set(q.x + d.x * 0.07 * u, q.y + d.y * 0.07 * u, z);
      }

      // exhaust primary: out of the head, down to its bank's collector
      const eb = E.bank[i], sx = Math.sign(bk.out.x) || 1;
      const yLow = low - 0.075 * u, colX = sx * (W + 0.12 * u);
      const mates = E.cylinders.filter((_, j) => E.bank[j] === eb);
      const colZ = banks.length === 1 ? mates.reduce((a, m) => a + m.z, 0) / mates.length : zMin - 0.02;
      colls[eb] = { x: colX, y: yLow, z: colZ };
      const p0 = at(bk, deck + 0.04 * u, 0.1 * u), p1 = p0.clone().addScaledVector(bk.out, 0.06 * u);
      const hc = new THREE.CatmullRomCurve3([
        v3(p0.x, p0.y, z), v3(p1.x, p1.y, z), v3(colX * 1.05, (p1.y + yLow) / 2, lerp(z, colZ, 0.25)),
        v3(colX, yLow + 0.05 * u, lerp(z, colZ, 0.7)), v3(colX, yLow, colZ),
      ]);
      add(new THREE.TubeGeometry(hc, 40, 0.017 * u, 12), headerMat);
    });

    // mid-pipe with its catalyst, then the silencer on each exit
    this.canMat.setValues(X.finish);
    const canOn = (curve: THREE.Curve<THREE.Vector3>, t: number, r: number, len: number, m: THREE.Material, tip = false) => {
      const p = curve.getPointAt(t), d = curve.getTangentAt(t);
      const o = add(new THREE.CylinderGeometry(r, r, len, 32), m);
      o.quaternion.setFromUnitVectors(v3(0, 1, 0), d);
      o.position.copy(p).addScaledVector(d, tip ? len * 0.35 : 0);
    };
    Object.values(colls).forEach((c, j) => {
      const tail = new THREE.CatmullRomCurve3([v3(c.x, c.y, c.z), v3(c.x * 0.95, c.y - 0.03 * u, c.z - 0.15), v3(c.x * 0.8, c.y - 0.04 * u, zMin - 0.4)]);
      add(new THREE.TubeGeometry(tail, 30, 0.03 * u, 16), collectorMat);
      if (X.acoustics.cat) canOn(tail, 0.4, 0.05 * u, 0.1 * u, M.pan);
      if (E.exhaust.dual || j === 0) canOn(tail, 1, X.can[0] * u, X.can[1] * u, this.canMat, true);
    });

    if (G.intake === 'plenum') {
      const py = deck + 0.27 * u;
      add(new RoundedBoxGeometry(0.15 * u, 0.1 * u, L - 0.04, 3, 0.03 * u), M.intake).position.set(0, py, zMid);
      const tbg = new THREE.CylinderGeometry(0.044 * u, 0.044 * u, 0.07 * u, 28); tbg.rotateX(Math.PI / 2);
      add(tbg, M.tb).position.set(0, py, zMax);
      const el = add(new THREE.TorusGeometry(0.06 * u, 0.042 * u, 16, 24, Math.PI / 2), M.intake);
      el.position.set(0, py - 0.06 * u, zMax + 0.035 * u); el.rotation.y = Math.PI / 2;
    }

    add(new RoundedBoxGeometry(W * 1.76, 0.13 * u, L - 0.02, 2, 0.02 * u), M.pan).position.set(0, low - 0.065 * u, zMid);
    if (G.gearbox) add(new RoundedBoxGeometry(0.2 * u, 0.16 * u, L * 0.9, 3, 0.03 * u), M.pan).position.set(W + 0.1 * u, low + 0.03 * u, zMid);

    // front accessory drive
    if (G.pulleys.length) {
      const zf = zMax + 0.035, crankR = G.pulleys[0][2];
      for (const [x, y, rad, w] of G.pulleys) {
        const grp = new THREE.Group(); grp.position.set(x, y, zf + w / 2); this.group.add(grp);
        const g = new THREE.CylinderGeometry(rad, rad, w, 40); g.rotateX(Math.PI / 2);
        add(g, M.pulley, grp);
        add(new THREE.BoxGeometry(rad * 1.6, rad * 0.22, 0.004), M.pulleyHi, grp, false).position.z = w / 2 + 0.002;
        const hub = new THREE.CylinderGeometry(rad * 0.3, rad * 0.3, 0.006, 20); hub.rotateX(Math.PI / 2);
        add(hub, M.pulleyHi, grp, false).position.z = w / 2 + 0.003;
        this.pulleys.push({ grp, ratio: crankR / rad });
      }
      const belt = new THREE.Shape(beltHull(G.pulleys.map(([x, y, r]) => [x, y, r + 0.004] as [number, number, number])).map(([x, y]) => new V2(x, y)));
      belt.holes.push(new THREE.Path(beltHull(G.pulleys.map(([x, y, r]) => [x, y, r - 0.002] as [number, number, number])).map(([x, y]) => new V2(x, y))));
      add(new THREE.ExtrudeGeometry(belt, { depth: 0.024, bevelEnabled: false }), M.belt).position.z = zf + 0.005;
    }

    // internals for the x-ray view
    const crank = new THREE.Group(); this.internals.add(crank); this.crank = crank;
    const mainG = new THREE.CylinderGeometry(0.03 * u, 0.03 * u, L - 0.02, 24); mainG.rotateX(Math.PI / 2); mainG.translate(0, 0, zMid);
    add(mainG, M.crank, crank);
    const throws = new Map<number, number>();
    for (const c of E.cylinders) if (!throws.has(c.tz)) throws.set(c.tz, c.pin);
    const pinLen = banks.length > 1 ? 0.05 * u : 0.03 * u;
    for (const [tz, pinDeg] of throws) {
      const a = deg(pinDeg), px = Math.sin(a) * rC, py = Math.cos(a) * rC;
      const pin = new THREE.CylinderGeometry(0.026 * u, 0.026 * u, pinLen, 20); pin.rotateX(Math.PI / 2);
      add(pin, M.crank, crank).position.set(px, py, tz);
      for (const dz of [-1, 1]) {
        const zz = tz + dz * (pinLen / 2 + 0.007 * u);
        const cheek = add(new THREE.BoxGeometry(0.05 * u, rC + 0.03 * u, 0.014 * u), M.crank, crank);
        cheek.position.set(px / 2, py / 2, zz); cheek.rotation.z = -a;
        const cw = add(new THREE.BoxGeometry(0.1 * u, 0.04 * u, 0.014 * u), M.crank, crank);
        cw.position.set(-Math.sin(a) * 0.035 * u, -Math.cos(a) * 0.035 * u, zz); cw.rotation.z = -a;
      }
    }
    for (const c of E.cylinders) {
      const bk = banks[c.bank];
      const p = add(new THREE.CylinderGeometry(G.bore / 2 - 0.002, G.bore / 2 - 0.002, G.bore * 0.55, 28), M.piston, this.internals);
      p.rotation.z = -bk.a;
      const rod = add(new THREE.BoxGeometry(0.02 * u, G.rod, 0.016 * u), M.rod, this.internals);
      const fl = new THREE.Mesh(
        new THREE.SphereGeometry(G.bore * 0.32, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      fl.userData.ownMat = true;
      const fp = at(bk, deck + 0.012 * u); fl.position.set(fp.x, fp.y, c.z);
      this.internals.add(fl);
      this.pistons.push({ mesh: p, rod, z: c.z, ax: bk.ax, pin: c.pin, lift: G.bore * 0.13 });
      this.flashes.push(fl);
    }
    this.setXray(this.xray);
  }

  update(dt: number, bench: Bench) {
    const E = this.engine, G = E.geometry, rC = G.stroke / 2, l = G.rod, rpm = bench.rpm;
    this.theta = (this.theta + 2.2 * Math.sqrt(rpm) * 6 * dt) % 720;
    const th = this.theta % 360, thR = deg(th);
    for (const pl of this.pulleys) pl.grp.rotation.z = -thR * pl.ratio;
    if (this.internals.visible && this.crank) {
      this.crank.rotation.z = thR;
      this.pistons.forEach((P, i) => {
        const a = deg(P.pin - th);
        const px = Math.sin(a) * rC, py = Math.cos(a) * rC;
        const pu = px * P.ax.x + py * P.ax.y;
        const s = pu + Math.sqrt(l * l - (rC * rC - pu * pu));
        const wx = P.ax.x * s, wy = P.ax.y * s;
        P.mesh.position.set(P.ax.x * (s + P.lift), P.ax.y * (s + P.lift), P.z);
        P.rod.position.set((px + wx) / 2, (py + wy) / 2, P.z);
        P.rod.rotation.z = -Math.atan2(wx - px, wy - py);
        const d = (this.theta - E.fire[i] + 720) % 720;
        this.flashes[i].material.opacity = bench.fuel && d < 60 ? (1 - d / 60) * (0.35 + 0.65 * bench.load) : 0;
        this.flashes[i].scale.setScalar(0.6 + 0.6 * (1 - Math.min(d, 60) / 60));
      });
    }
    // headers glow under sustained load
    const g = Math.pow(Math.max(0, (bench.temp - 0.32) / 0.68), 1.5);
    this.headerMat.emissive.setRGB(1.6 * g, 0.42 * g, 0.08 * g);
    this.collectorMat.emissive.setRGB(0.9 * g, 0.23 * g, 0.045 * g);
    // torque reaction rocks the engine on its mounts
    const rock = -bench.Te / bench.dyno.peakTorque * 0.03 + (bench.fuel && rpm < E.idle * 1.5 ? (Math.random() - 0.5) * 0.0016 : 0);
    this.group.rotation.z += (rock - this.group.rotation.z) * Math.min(1, dt * 12);
  }

  dispose() {
    this.clear();
    for (const m of [...Object.values(this.M), this.headerMat, this.collectorMat, this.canMat]) m.dispose();
  }

  private clear() {
    this.group.traverse(o => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (o.userData.ownMat) o.material.dispose();
      }
    });
    this.group.clear();
    this.internals = new THREE.Group();
    this.internals.visible = this.xray;
    this.group.add(this.internals);
    this.pistons = []; this.flashes = []; this.pulleys = []; this.crank = null;
  }
}
