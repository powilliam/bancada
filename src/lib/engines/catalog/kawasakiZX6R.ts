import { BikeEngine } from '../BikeEngine';
import { inline } from '../layouts';

export const kawasakiZX6R = new BikeEngine({
  id: 'zx636',
  name: 'Kawasaki ZX-6R 636',
  summary: '636 cc · 4 em linha · virabrequim plano 180° · DOHC 16V',
  detail: '67,0 × 45,1 mm · corte 16.500 · ordem 1-2-4-3',
  application: 'Ninja ZX-6R · 6 marchas · primária 78/37 · corrente 16/43',
  idle: 1300, redline: 16000, limiter: 16500, maxRpm: 18000, inertia: 0.016, crank: 450,
  friction: [1.8, 0.0004, 4e-8],
  // a 600 lives up top: soft flat spot around 6.000, then it comes alive past 9.000
  torque: [[0, 0], [800, 22], [1300, 30], [2000, 34], [3000, 39], [4000, 43], [5000, 46], [6000, 47.5], [7000, 50], [8000, 55],
    [9000, 60.5], [10000, 65.5], [11000, 69], [12000, 68.6], [13000, 67], [14000, 62], [15000, 56.5], [16000, 50], [16500, 46], [17000, 41], [18000, 32]],
  // even 180° firing; 4-2-1 headers pair 1+4 and 2+3
  fire: [0, 180, 540, 360],
  bank: [0, 1, 1, 0],
  sound: {
    pulseWidth: 105, rasp: 0.55, c: 540,
    lp: 4200, bass: 260, bright: 1.2, deep: 0.35,
    // ram-air intake: the scream past 10.000 is as much airbox as exhaust
    intake: 1100, howl: 2600, intakeGain: 1.1, howlGain: 1.7, tickGain: 0.04, mechGain: 0.04,
    cylVar: 0.25, bite: 0.45, biteF: 3800,
    master: 1.15,
  },
  exhaust: {
    description: '4-2-1',
    primaries: [0.5, 0.53, 0.53, 0.5], secondaries: [0.3, 0.31],
    dual: false, mid: 0.38, can: 0.2, tail: 0.1,
  },
  geometry: {
    stroke: 0.0451, rod: 0.09, bore: 0.067, banks: [-35], cylinders: inline(4, 0.075), crankW: 0.07, crankLow: -0.05, intake: 'itb', scale: 1.6,
    pulleys: [], gearbox: true,
  },
  vehicle: { mass: 273, r: 0.31, cdA: 0.32, crr: 0.015, gears: [2.846, 2.2, 1.85, 1.6, 1.421, 1.3], Iw: 0.8, brake: 4000, clutch: 110, quickshifter: true },
}, { primary: [37, 78], sprockets: [16, 43], toothSum: 47, whine: 0.5 });
