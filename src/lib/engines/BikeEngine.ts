import { Engine } from './Engine';
import type { EngineSpec } from './types';

export interface BikeDrive {
  /** primary gears: [crank gear, clutch basket] */
  primary: readonly [number, number];
  /** chain sprockets: [front, rear] */
  sprockets: readonly [number, number];
  toothSum: number;
  whine: number;
}

/** A motorcycle: primary gears, sequential dog box and a chain. */
export class BikeEngine extends Engine {
  readonly shiftClunk = 1;

  constructor(spec: EngineSpec, drive: BikeDrive) {
    const primary = drive.primary[1] / drive.primary[0];
    super(spec, {
      final: primary * drive.sprockets[1] / drive.sprockets[0],
      primary,
      primaryTeeth: drive.primary[0],
      gearTeeth: spec.vehicle.gears.map(g => Math.round(drive.toothSum / (1 + g))),
      wheelTeeth: drive.sprockets[1],
      whine: drive.whine,
      wheelGain: 1,
      efficiency: 0.92,
    });
  }
}
