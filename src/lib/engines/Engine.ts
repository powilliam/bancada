import type { ExhaustKit } from '../exhaust';
import { CV, RPM, smooth } from '../math';
import type { Cylinder, Drivetrain, EngineSpec } from './types';

export interface DynoPoint {
  rpm: number;
  nm: number;
  cv: number;
}

export interface DynoCurve {
  points: DynoPoint[];
  peak: DynoPoint;
  peakTorque: number;
  /** axis ceilings */
  maxCv: number;
  maxNm: number;
}

/** Everything the audio worklet needs to voice one engine with one exhaust. */
export interface AudioConfig {
  key: string;
  fire: number[];
  bank: number[];
  redline: number;
  sound: EngineSpec['sound'];
  exhaust: EngineSpec['exhaust'];
  acoustics: ExhaustKit['acoustics'];
  drive: Drivetrain;
}

export type CylinderPin = Cylinder & { pin: number };

/**
 * An engine on the stand together with the vehicle it drives.
 * Subclasses describe how power reaches the wheel (diff on a car, primary and chain on a bike).
 */
export abstract class Engine implements Readonly<EngineSpec> {
  declare readonly id: string;
  declare readonly name: string;
  declare readonly summary: string;
  declare readonly detail: string;
  declare readonly application: string;
  declare readonly idle: number;
  declare readonly redline: number;
  declare readonly limiter: number;
  declare readonly maxRpm: number;
  declare readonly inertia: number;
  declare readonly crank: number;
  declare readonly friction: EngineSpec['friction'];
  declare readonly torque: EngineSpec['torque'];
  declare readonly fire: number[];
  declare readonly bank: number[];
  declare readonly sound: EngineSpec['sound'];
  declare readonly exhaust: EngineSpec['exhaust'];
  declare readonly geometry: EngineSpec['geometry'];
  declare readonly vehicle: EngineSpec['vehicle'];

  /** cylinders with the crankpin angle each one sits on */
  readonly cylinders: CylinderPin[];
  /** throttle that just holds idle speed */
  readonly idleThrottle: number;

  /** how hard the dogs clunk when a gear goes in, 0..1 */
  abstract readonly shiftClunk: number;

  private readonly dynoCache = new Map<string, DynoCurve>();

  protected constructor(spec: EngineSpec, readonly drivetrain: Drivetrain) {
    Object.assign(this, spec);
    const { banks, cylinders } = spec.geometry;
    // crankpin angle follows from when each cylinder fires and which bank it sits in
    this.cylinders = cylinders.map((c, i) => ({ ...c, pin: (spec.fire[i] % 360) + banks[c.bank] }));
    const f = this.frictionAt(this.idle) / (this.torqueAt(this.idle) + this.frictionAt(this.idle));
    this.idleThrottle = 1 - Math.sqrt(1 - f);
  }

  get cylinderCount() {
    return this.fire.length;
  }

  /** brake torque at full throttle; a freer exhaust (and its map) gains at the top end */
  torqueAt(rpm: number, exhaust?: ExhaustKit) {
    const c = this.torque;
    if (rpm <= 0) return c[0][1];
    const gain = 1 + (exhaust?.powerGain ?? 0) * smooth(0.35, 0.85, rpm / this.redline);
    for (let i = 1; i < c.length; i++) {
      if (rpm <= c[i][0]) {
        const [r0, t0] = c[i - 1], [r1, t1] = c[i];
        return (t0 + (t1 - t0) * (rpm - r0) / (r1 - r0)) * gain;
      }
    }
    return c[c.length - 1][1] * gain;
  }

  frictionAt(rpm: number) {
    const [a, b, c] = this.friction;
    return a + b * rpm + c * rpm * rpm;
  }

  /** engine turns per wheel turn in a gear */
  ratio(gear: number) {
    return this.vehicle.gears[gear - 1] * this.drivetrain.final;
  }

  get gearCount() {
    return this.vehicle.gears.length;
  }

  dyno(exhaust: ExhaustKit): DynoCurve {
    const cached = this.dynoCache.get(exhaust.id);
    if (cached) return cached;
    const points: DynoPoint[] = [];
    for (let rpm = 500; rpm <= this.maxRpm; rpm += 100) {
      const nm = this.torqueAt(rpm, exhaust);
      points.push({ rpm, nm, cv: nm * rpm / RPM / CV });
    }
    const peak = points.reduce((a, b) => (b.cv > a.cv ? b : a));
    const peakTorque = Math.max(...points.map(p => p.nm));
    const curve = {
      points, peak, peakTorque,
      maxCv: Math.ceil(peak.cv * 1.08 / 50) * 50,
      maxNm: Math.ceil(peakTorque * 1.1 / 25) * 25,
    };
    this.dynoCache.set(exhaust.id, curve);
    return curve;
  }

  audioConfig(exhaust: ExhaustKit): AudioConfig {
    return {
      key: `${this.id}:${exhaust.id}`,
      fire: this.fire, bank: this.bank, redline: this.redline,
      sound: this.sound, exhaust: this.exhaust, acoustics: exhaust.acoustics, drive: this.drivetrain,
    };
  }
}
