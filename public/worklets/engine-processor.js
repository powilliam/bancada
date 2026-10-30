/*
 * Engine sound synthesis, run as an AudioWorklet.
 * Each firing event makes an exhaust pressure pulse that travels its own primary,
 * then the collector, catalyst, silencer and tailpipe waveguides; the drivetrain
 * adds its gear and chain whine. The config comes from Engine.audioConfig().
 */

class Biquad {
  constructor() { this.b0 = 1; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0; this.z1 = 0; this.z2 = 0; }
  set(type, f, q, sr) {
    const w = 2 * Math.PI * Math.min(f, sr * 0.45) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = -2 * c / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

/** one-pole low-pass */
class Pole {
  constructor(fc, sr) { this.k = 1 - Math.exp(-2 * Math.PI * fc / sr); this.z = 0; }
  run(x) { return (this.z += this.k * (x - this.z)); }
}

/**
 * Two-way waveguide: a pressure wave runs down the pipe and back, reflecting at each end;
 * r < 0 where it opens into a bigger volume, r > 0 at a closed or narrowing end;
 * the far end passes on what it transmits.
 */
class Pipe {
  constructor(sr, len, c, rIn, rOut, loss, fc) {
    this.n = Math.max(2, Math.round(sr * len / c));
    this.fw = new Float32Array(this.n); this.bw = new Float32Array(this.n); this.i = 0;
    this.rIn = rIn * loss; this.rOut = rOut * loss; this.tOut = 1 + rOut;
    this.lf = new Pole(fc, sr); this.lb = new Pole(fc, sr);
  }
  run(x) {
    const i = this.i, f = this.fw[i];
    this.fw[i] = x + this.rIn * this.lb.run(this.bw[i]);
    this.bw[i] = this.rOut * this.lf.run(f);
    if (++this.i >= this.n) this.i = 0;
    return f * this.tOut;
  }
}

class EngineVoice {
  constructor(sr, cfg, norm = 1) {
    this.sr = sr; this.cfg = cfg; this.norm = norm;
    const s = cfg.sound, x = cfg.exhaust, v = cfg.acoustics, n = cfg.fire.length;
    this.age = new Float32Array(n).fill(1e9); this.amp = new Float32Array(n); this.iage = new Float32Array(n).fill(1e9);
    this.phase = 0; this.rpm = 0; this.load = 0; this.starter = 0; this.overrun = 0;
    this.t = { rpm: 0, load: 0, cut: 1, starter: 0, overrun: 0, wd: 0, gear: 0, tq: 0, wheel: 0 };
    this.ks = 1 - Math.exp(-1 / (0.012 * sr));
    this.kg = 1 - Math.exp(-1 / (0.06 * sr));
    this.seed = 0x2545F491; this.tickN = 0; this.sph = 0;
    // a primary per cylinder, secondaries where pairs merge (4-2-1), then one line per exit
    // of mid-pipe, catalyst, silencer and tailpipe
    this.prim = x.primaries.map(L => new Pipe(sr, L, s.c, 0.5, -0.45, 0.94, 5000));
    this.sec = x.secondaries ? x.secondaries.map(L => new Pipe(sr, L, s.c, -0.25, -0.4, 0.94, 4500)) : null;
    const at = (a, j) => (Array.isArray(a) ? a[j] : a);
    this.sides = (x.dual ? [0, 1] : [0]).map(j => ({
      mid: new Pipe(sr, at(x.mid, j), s.c, -0.25, -0.5, 0.93, 4000),
      cat: new Pole(4000, sr),
      core: new Pole(v.coreLp, sr),
      can: new Pipe(sr, at(x.can, j), s.c, 0.6, 0.6, 0.86, v.absorb),
      abs: new Pole(v.absorb, sr),
      tail: new Pipe(sr, x.tail, s.c, -0.3, -0.65, 0.9, 6000),
      rz: 0, pre: new Pole(700, sr),
      lp: new Biquad().set('lp', s.lp * v.lpMul, 0.7, sr),
      bass: new Biquad().set('lp', s.bass, 1.1, sr),
      hp: new Biquad().set('hp', 24, 0.7, sr),
      bite: new Biquad().set('bp', s.biteF || 2000, 0.7, sr),
      pop: 1e9, popAmp: 0, out: 0,
    }));
    this.acc = 0; this.cnt = 0;
    // fixed per-cylinder character: flow and burn make each cylinder a little different
    const cv = s.cylVar ?? 0;
    let r = 0x1234567 ^ (n * 7919);
    const rnd = () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return (r >>> 0) / 2147483648 - 1; };
    this.cg = Float32Array.from({ length: n }, () => 1 + 0.3 * cv * rnd());
    this.cw = Float32Array.from({ length: n }, () => 1 + 0.2 * cv * rnd());
    this.intBP = new Biquad().set('bp', s.intake, 1.6, sr);
    this.howl = new Biquad().set('bp', s.howl, 2.5, sr);
    this.tick = new Biquad().set('bp', 3600, 7, sr);
    this.mech = new Biquad().set('bp', 2200, 1.4, sr);
    this.grind = new Biquad().set('bp', 1100, 2, sr);
    // drivetrain: mesh oscillators, slow wobble in tooth loading, and the clunk of dogs engaging
    this.gph = new Float64Array(3); this.wd = 0; this.wheel = 0; this.tq = 0; this.wob = new Pole(6, sr);
    this.clk = undefined; this.cl = 1e9; this.clA = 0;
    this.thudLo = new Biquad().set('bp', 160, 1.2, sr); this.thudHi = new Biquad().set('bp', 1300, 3, sr);
  }

  /** keep running state across an exhaust swap so the sound does not restart */
  carry(o) {
    Object.assign(this.t, o.t);
    for (const k of ['phase', 'rpm', 'load', 'starter', 'overrun', 'wd', 'wheel', 'tq', 'clk']) this[k] = o[k];
    if (o.age.length === this.age.length) { this.age.set(o.age); this.amp.set(o.amp); this.iage.set(o.iage); }
  }

  noise() { let x = this.seed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.seed = x; return (x >>> 0) / 2147483648 - 1; }

  trigger(i, rn) {
    const burn = this.t.cut ? 0 : 1, v = this.cfg.acoustics;
    // cycle-to-cycle combustion variance, stronger at idle
    const jit = 1 + this.noise() * (0.05 + 0.13 * Math.max(0, 1 - rn * 2.5));
    // exhaust mass flow grows with engine speed
    this.amp[i] = (0.1 + burn * (0.22 + 0.78 * this.load)) * jit * (0.2 + 0.8 * Math.pow(Math.min(rn, 1.1), 0.8)) * this.cg[i];
    this.age[i] = 0; this.iage[i] = 0;
    if (burn) this.tickN = 20;
    // unburnt fuel lighting off in the exhaust on overrun; freer systems and richer maps pop more
    if (!burn && this.overrun > 0.03 && this.rpm > 1800 && this.noise() * 0.5 + 0.5 < 0.12 * this.overrun * v.pops) {
      const b = this.sides[this.sides.length > 1 ? this.cfg.bank[i] : 0];
      b.pop = 0; b.popAmp = (0.5 + (this.noise() * 0.5 + 0.5) * 1.1) * Math.min(0.8, 0.25 + 0.2 * v.pops);
    }
  }

  sideRun(sd, x, raw) {
    const s = this.cfg.sound, v = this.cfg.acoustics;
    // rasp: broadband noise riding on each blowdown, above the silencer's low-pass
    const bite = s.bite ? sd.bite.run(this.noise() * raw) * s.bite * v.rasp : 0;
    if (sd.pop < 0.05 * this.sr) {
      x += sd.popAmp * Math.exp(-sd.pop / (0.0035 * this.sr)) * (0.55 + this.noise() * 0.8);
      sd.pop++;
    }
    let y = sd.mid.run(x);
    // catalyst substrate smooths the sharpest edges of each pulse
    if (v.cat) y = 0.85 * sd.cat.run(y) + 0.15 * y;
    // silencer: straight-through perforated core in parallel with the packed chamber around it
    y = v.core * sd.core.run(y) + (1 - v.core) * sd.abs.run(sd.can.run(y * 0.5)) * 1.6;
    y = sd.tail.run(y);
    // the open end radiates the rate of change of flow, tilting towards the highs
    let rad = y - 0.45 * sd.rz; sd.rz = y;
    // pipe resonances pile up energy low down; the shell and tip radiate the upper mids that standing waves miss
    rad += rad - sd.pre.run(rad);
    const out = sd.hp.run(sd.lp.run(rad) * s.bright + sd.bass.run(rad) * s.deep) * this.norm;
    sd.out = out;
    return out + bite;
  }

  /** gear-mesh tone at f Hz: fundamental plus second harmonic */
  mesh(k, f) {
    if (f < 20 || f > this.sr * 0.45) return 0;
    let p = this.gph[k] + f / this.sr; p -= Math.floor(p); this.gph[k] = p;
    return Math.sin(6.2831853 * p) + 0.35 * Math.sin(12.5663706 * p);
  }

  process(L, R, n) {
    const cfg = this.cfg, s = cfg.sound, sr = this.sr, F = cfg.fire, B = cfg.bank, N = F.length, W = s.pulseWidth, t = this.t, dr = cfg.drive;
    if (this.clk !== t.clunk) { if (this.clk !== undefined) { this.cl = 0; this.clA = t.clunkAmp || 0; } this.clk = t.clunk; }
    for (let k = 0; k < n; k++) {
      this.rpm += (t.rpm - this.rpm) * this.ks;
      this.load += (t.load - this.load) * this.ks;
      this.starter += (t.starter - this.starter) * this.kg;
      this.overrun += (t.overrun - this.overrun) * this.kg;
      this.wd += (t.wd - this.wd) * this.ks;
      this.wheel += (t.wheel - this.wheel) * this.ks;
      this.tq += (t.tq - this.tq) * this.kg;
      const rpm = this.rpm, dph = rpm * 6 / sr, rn = rpm / cfg.redline;
      const prev = this.phase;
      let ph = prev + dph, wrap = false;
      if (ph >= 720) { ph -= 720; wrap = true; }
      this.phase = ph;
      let b0 = 0, b1 = 0, r0 = 0, r1 = 0, all = 0, ins = 0, comp = 0;
      for (let i = 0; i < N; i++) {
        const a = F[i];
        if (dph > 0 && (wrap ? (prev < a || ph >= a) : (prev < a && ph >= a))) this.trigger(i, rn);
        const ag = this.age[i], Wi = W * this.cw[i];
        let p = 0;
        if (ag < Wi) {
          const x = ag / Wi;
          const e = x < 0.1 ? Math.pow(Math.sin(x * 15.70796), 2) : Math.exp(-(x - 0.1) * 5.5) * (1 - x) / 0.9;
          p = this.amp[i] * e * (1 + (x < 0.35 ? this.noise() * s.rasp * cfg.acoustics.rasp * (1 - x / 0.35) : 0));
          all += p; comp += e;
          this.age[i] = ag + dph;
        }
        // each pulse travels its own primary to the collector
        const q = this.prim[i].run(p);
        if (B[i]) { b1 += q; r1 += p; } else { b0 += q; r0 += p; }
        const ia = this.iage[i];
        if (ia < 200) { ins += Math.sin(Math.PI * ia / 200); this.iage[i] = ia + dph; }
      }
      if (this.sec) { b0 = this.sec[0].run(b0); b1 = this.sec[1].run(b1); }
      let x0, x1;
      if (this.sides.length > 1) {
        // the crossover (X- or H-pipe) lets each bank's pulses into the other side
        const xf = cfg.exhaust.cross;
        x0 = this.sideRun(this.sides[0], b0 * (1 - xf) + b1 * xf, r0);
        x1 = this.sideRun(this.sides[1], b1 * (1 - xf) + b0 * xf, r1);
      } else x0 = x1 = this.sideRun(this.sides[0], b0 + b1, r0 + r1);
      const sd = this.sides, m = sd.length > 1 ? sd[0].out * 0.62 + sd[1].out * 0.38 : sd[0].out;
      this.acc += m * m; this.cnt++;
      const rn2 = rn * rn;
      const ind = this.intBP.run(this.noise() * ins) * (0.12 + 0.88 * this.load) * (0.08 + rn2) * s.intakeGain;
      const howl = this.howl.run(all) * this.load * rn2 * s.howlGain;
      let tk = 0;
      if (this.tickN > 0) { this.tickN--; tk = this.noise(); }
      tk = this.tick.run(tk) * s.tickGain;
      const mech = this.mech.run(this.noise()) * s.mechGain * Math.min(1, rn * 1.3);
      // drivetrain whine at shaft speed × teeth, louder on the loaded flank: primary, the gear pair in use, chain or diff
      const ld = Math.min(1.5, Math.abs(this.tq));
      let gw = this.mesh(0, rpm / 60 * dr.primaryTeeth) * (0.35 + 0.65 * ld);
      const zi = t.gear > 0 ? dr.gearTeeth[t.gear - 1] : 0;
      if (zi) gw += this.mesh(1, this.wd / 60 / dr.primary * zi) * (0.1 + 0.9 * ld);
      gw += this.mesh(2, this.wheel * dr.wheelTeeth) * (0.25 + 0.75 * ld) * Math.min(1, this.wheel / 4) * dr.wheelGain;
      gw *= dr.whine * 0.012 * (1 + this.wob.run(this.noise()) * 6);
      let thud = 0;
      if (this.cl < 0.1 * sr) {
        const nz = this.noise() * Math.exp(-this.cl / (0.01 * sr)) * this.clA;
        thud = this.thudLo.run(nz) * 2.5 + this.thudHi.run(nz) * 0.6;
        this.cl++;
      }
      let st = 0;
      if (this.starter > 0.001) {
        this.sph += (140 + 60 * Math.min(1, rpm / 250)) / sr;
        if (this.sph >= 1) this.sph -= 1;
        st = this.starter * (0.2 * (this.sph * 2 - 1) * (1 - 0.6 * Math.min(1, comp)) + this.grind.run(this.noise()) * 0.3);
      }
      const shared = ind * 0.5 + howl * 0.5 + tk + mech + gw + thud;
      L[k] = Math.tanh((x0 * 0.62 + x1 * 0.38 + shared) * s.master + st * 0.5);
      R[k] = Math.tanh((x1 * 0.62 + x0 * 0.38 + shared) * s.master + st * 0.5);
    }
  }
}

/**
 * Level every engine and exhaust pairing to one loudness at 70 % of redline and full load,
 * then scale by that exhaust's own volume.
 */
const normCache = new Map();
function loudnessNorm(cfg) {
  if (normCache.has(cfg.key)) return normCache.get(cfg.key);
  const d = new EngineVoice(48000, cfg, 1), r = cfg.redline * 0.7, n = 14400;
  Object.assign(d.t, { rpm: r, load: 1, cut: 0 }); d.rpm = r; d.load = 1;
  const L = new Float32Array(n), R = new Float32Array(n);
  d.process(L, R, n); d.acc = d.cnt = 0; d.process(L, R, n);
  const norm = 0.22 * cfg.acoustics.loud / Math.sqrt(d.acc / d.cnt);
  normCache.set(cfg.key, norm);
  return norm;
}

class EngineProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.voice = this.makeVoice(options.processorOptions.cfg);
    this.port.onmessage = e => {
      const d = e.data;
      if (d.cfg) {
        const old = this.voice;
        this.voice = this.makeVoice(d.cfg);
        if (d.keep) this.voice.carry(old);
      } else Object.assign(this.voice.t, d);
    };
  }
  makeVoice(cfg) { return new EngineVoice(sampleRate, cfg, loudnessNorm(cfg)); }
  process(_inputs, outputs) {
    const out = outputs[0];
    this.voice.process(out[0], out[1] || out[0], out[0].length);
    return true;
  }
}

registerProcessor('engine-processor', EngineProcessor);
