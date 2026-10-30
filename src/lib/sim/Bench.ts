import type { DynoCurve, Engine } from '../engines';
import type { ExhaustKit } from '../exhaust';
import { CV, RPM, TAU, clamp, fmt, smooth } from '../math';
import { couple } from './couple';

export type Mode = 'off' | 'cranking' | 'running';

interface Shift {
  to: number;
  dir: 1 | -1;
  t: number;
  dur: number;
  /** quickshifter: the dogs engage with the clutch shut */
  qs: boolean;
  done: boolean;
  engageAt: number;
}

/** What the audio engine needs every frame. */
export interface AudioFrame {
  rpm: number;
  load: number;
  cut: number;
  starter: number;
  overrun: number;
  gear: number;
  wd: number;
  tq: number;
  wheel: number;
  clunk: number;
  clunkAmp: number;
}

/**
 * Engine → automatic clutch → gearbox → driveline → tyre → vehicle,
 * integrated in small steps.
 */
export class Bench {
  readonly input = { throttle: false, brake: false };

  mode: Mode = 'off';
  /** engine and wheel speed, rad/s */
  we = 0;
  wr = 0;
  /** road speed, m/s */
  v = 0;
  gear = 0;
  thr = 0;
  fuel = false;
  limiter = false;
  shift: Shift | null = null;
  /** engine brake torque and torque across the clutch, Nm */
  Te = 0;
  Tc = 0;
  load = 0;
  overrun = 0;
  /** exhaust heat, 0..1 */
  temp = 0;

  onModeChange?: (mode: Mode) => void;
  onNotice?: (message: string) => void;

  private pedal = 0;
  private crankT = 0;
  private runT = 0;
  private clutchLocked = false;
  private clutchRamp = 1;
  private loadHist = 0;
  private clunkCount = 0;
  private clunkAmp = 0;
  private _dyno: DynoCurve;

  constructor(private _engine: Engine, private _exhaust: ExhaustKit) {
    this._dyno = _engine.dyno(_exhaust);
  }

  get engine() { return this._engine; }
  get exhaust() { return this._exhaust; }
  get dyno() { return this._dyno; }
  get rpm() { return this.we * RPM; }
  get kmh() { return this.v * 3.6; }
  get cv() { return Math.max(0, this.Te) * this.we / CV; }
  get gearLabel() { return this.shift ? '–' : this.gear === 0 ? 'N' : String(this.gear); }

  setEngine(engine: Engine) {
    const wasOn = this.mode !== 'off';
    this._engine = engine;
    this._dyno = engine.dyno(this._exhaust);
    Object.assign(this, { we: 0, wr: 0, v: 0, gear: 0, shift: null, limiter: false, Te: 0, Tc: 0, load: 0, overrun: 0, temp: 0 });
    this.clutchLocked = false;
    this.loadHist = 0;
    this.setMode('off');
    if (wasOn) this.ignition(true);
  }

  setExhaust(exhaust: ExhaustKit) {
    this._exhaust = exhaust;
    this._dyno = this._engine.dyno(exhaust);
  }

  ignition(on: boolean) {
    if (on && this.mode === 'off') { this.crankT = 0; this.setMode('cranking'); }
    else if (!on) this.setMode('off');
  }

  requestShift(dir: 1 | -1) {
    const E = this._engine;
    // a new paddle pull finishes any shift still in progress
    if (this.shift) this.finishShift();
    const to = this.gear + dir;
    if (to < 0 || to > E.gearCount) return;
    if (dir < 0 && to > 0) {
      const tr = this.wr * E.ratio(to) * RPM;
      if (tr > E.redline + 150) { this.onNotice?.(`Redução bloqueada: o motor iria a ${fmt(tr)} rpm`); return; }
    }
    // while rolling: cut then engage on upshift, blip then engage on downshift
    const qs = E.vehicle.quickshifter && to > 0 && this.gear > 0 && this.wr * E.ratio(to) * RPM > E.idle + 400;
    this.shift = qs
      ? { to, dir, t: 0, qs, done: false, engageAt: dir > 0 ? 0.012 : 0.045, dur: dir > 0 ? 0.05 : 0.06 }
      : { to, dir, t: 0, qs, done: false, engageAt: 0, dur: dir > 0 ? 0.035 : 0.08 };
  }

  audioFrame(): AudioFrame {
    const E = this._engine;
    // while the dogs are apart no gear pair carries load
    const inGear = this.gear > 0 && (!this.shift || this.shift.done);
    return {
      rpm: this.rpm, load: this.load, cut: this.fuel ? 0 : 1, starter: this.mode === 'cranking' ? 1 : 0, overrun: this.overrun,
      gear: inGear ? this.gear : 0, wd: inGear ? this.wr * E.ratio(this.gear) * RPM : 0,
      tq: this.Tc / this._dyno.peakTorque, wheel: this.wr / TAU,
      clunk: this.clunkCount, clunkAmp: this.clunkAmp,
    };
  }

  step(dt: number) {
    const E = this._engine, V = E.vehicle, rpm = this.rpm;
    this.pedal += clamp((this.input.throttle ? 1 : 0) - this.pedal, -dt * 8, dt * 5);
    if (this.mode === 'cranking') {
      this.crankT += dt;
      if (this.crankT > 0.95) { this.runT = 0; this.setMode('running'); }
    }
    if (this.mode === 'running') this.runT += dt;

    // shifting: clutch open, ignition cut on upshift, rev-match blip on downshift
    if (this.shift) {
      const s = this.shift;
      s.t += dt;
      if (s.qs && !s.done && s.t >= s.engageAt) { this.gear = s.to; this.snapSync(); s.done = true; }
      if (s.t >= s.dur) this.finishShift();
    }
    this.clutchRamp = Math.min(1, this.clutchRamp + dt / 0.04);

    const idleTarget = E.idle * (1 + 0.85 * Math.exp(-this.runT / 1.4));
    let thr = 0, fuel = this.mode === 'running';
    if (fuel) {
      const idleCtl = clamp(E.idleThrottle + (idleTarget - rpm) * 0.4 / E.idle, 0, 0.3);
      let ped = this.pedal, blip = false;
      if (this.shift) {
        if (this.shift.dir > 0) ped = 0;
        else {
          const tg = this.shift.to > 0 ? this.wr * E.ratio(this.shift.to) * RPM : idleTarget;
          ped = clamp((tg + 150 - rpm) * 0.003, 0, 1);
          blip = ped > 0;
        }
      }
      thr = Math.max(ped, idleCtl);
      if (ped < 0.01 && !blip && rpm > idleTarget + E.idle * 0.6) fuel = false; // deceleration fuel cut
    }
    if (this.shift?.qs && this.shift.dir > 0) fuel = false; // quickshifter ignition cut
    if (rpm > E.limiter) this.limiter = true;
    else if (rpm < E.limiter * 0.984) this.limiter = false;
    if (this.limiter) fuel = false;

    const Je = E.inertia;
    const Tf = this.we > 0.5 ? E.frictionAt(rpm) : 0, Tmax = E.torqueAt(rpm, this._exhaust) + Tf;
    const f = thr * (2 - thr);
    let Te = (fuel ? f * Tmax : 0) - Tf;
    if (this.mode === 'cranking') Te = (E.crank - rpm) / RPM * Je * 10 + Tf;
    this.thr = thr; this.fuel = fuel; this.Te = Te; this.load = fuel ? f : 0;

    // automatic clutch: shut once locked; from a stop it takes up just above idle, like a centrifugal clutch,
    // and lets go before the engine can stall
    let cap = 0;
    if (this.gear > 0 && (!this.shift || this.shift.done)) {
      cap = V.clutch * this.clutchRamp * (this.clutchLocked ? 1 : smooth(E.idle * 1.1, E.idle * 3, rpm));
    }

    const r = V.r, m = V.mass, R = this.gear > 0 ? E.ratio(this.gear) : 10;
    const Jd = (V.Iw + m * r * r) / (R * R);
    const Fres = (this.v > 0.05 ? V.crr * m * 9.81 + (this.input.brake ? V.brake : 0) : 0) + 0.6 * V.cdA * this.v * this.v;
    // gearbox, chain or diff losses eat a share of whatever torque crosses the clutch
    const Tloss = this.gear > 0 ? (1 - E.drivetrain.efficiency) * Math.abs(this.Tc) : 0;
    const c = couple(this.we, this.wr * R, Je, Jd, Te, Fres * r / R + Tloss, cap, dt);
    this.Tc = cap > 0 ? c.Tc : 0;
    this.we = Math.max(0, c.a);
    this.wr = Math.max(0, c.b) / R;
    this.v = this.wr * r;
    if (!this.clutchLocked && c.locked && cap > 0) this.clutchLocked = true;
    if (this.clutchLocked && rpm < E.idle + 70) this.clutchLocked = false;

    this.loadHist += ((fuel ? this.load : this.loadHist * 0.999) - this.loadHist) * dt / 0.8;
    this.overrun = !fuel && this.mode === 'running' ? this.loadHist : 0;
  }

  /** exhaust heat follows revs and load, warming faster than it cools */
  updateHeat(dt: number) {
    const rpm = this.rpm;
    const heat = this.mode === 'running' || rpm > 50 ? 0.12 + 0.88 * (rpm / this._engine.redline) * (0.25 + 0.75 * this.load) : 0;
    this.temp += (heat - this.temp) * dt / (heat > this.temp ? 6 : 14);
  }

  private setMode(mode: Mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.onModeChange?.(mode);
  }

  private clunk(a: number) {
    this.clunkCount++;
    this.clunkAmp = a * this._engine.shiftClunk;
  }

  private engageAfterShift() {
    this.clutchRamp = 0;
    this.clutchLocked = this.gear > 0 && this.wr * this._engine.ratio(this.gear) * RPM > this._engine.idle + 200;
  }

  /** quickshifter: engine and wheel snap to one speed */
  private snapSync() {
    const E = this._engine, V = E.vehicle, R = E.ratio(this.gear), Jd = (V.Iw + V.mass * V.r * V.r) / (R * R), wd = this.wr * R;
    const w = (this.we * E.inertia + wd * Jd) / (E.inertia + Jd);
    this.we = w; this.wr = w / R; this.v = this.wr * V.r;
    this.clutchLocked = true; this.clutchRamp = 1;
    this.clunk(0.3);
  }

  private finishShift() {
    const s = this.shift!;
    this.shift = null;
    if (s.qs) {
      if (!s.done) { this.gear = s.to; this.snapSync(); }
      return;
    }
    // first gear from neutral is the loud one
    const a = s.to === 0 ? 0.35 : this.gear === 0 ? 1 : 0.6;
    this.gear = s.to;
    this.clunk(a);
    this.engageAfterShift();
  }
}
