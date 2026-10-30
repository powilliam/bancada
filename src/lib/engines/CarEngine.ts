import { Engine } from './Engine';
import type { EngineSpec } from './types';

export interface CarDrive {
  ringTeeth: number;
  pinionTeeth: number;
  /** tooth sum of each constant-mesh gear pair */
  toothSum: number;
  whine: number;
}

/** A front-engined car: gearbox, prop shaft and a hypoid diff. */
export class CarEngine extends Engine {
  // synchros barely clunk
  readonly shiftClunk = 0.4;

  constructor(spec: EngineSpec, drive: CarDrive) {
    super(spec, {
      final: drive.ringTeeth / drive.pinionTeeth,
      primary: 1,
      primaryTeeth: 0,
      // the direct gear locks input to output and carries no load through gear teeth
      gearTeeth: spec.vehicle.gears.map(g => (Math.abs(g - 1) < 0.01 ? 0 : Math.round(drive.toothSum / (1 + g)))),
      wheelTeeth: drive.ringTeeth,
      whine: drive.whine,
      wheelGain: 0.3,
      efficiency: 0.88,
    });
  }
}
