import { BikeEngine } from '../BikeEngine';
import { inline } from '../layouts';

export const yamahaCP4 = new BikeEngine({
  id: 'cp4',
  name: 'Yamaha CP4 998 crossplane',
  summary: '998 cc · 4 em linha · virabrequim crossplane · DOHC 16V',
  detail: 'ordem 1-3-2-4 (270-180-90-180°)',
  application: 'YZF-R1 · 6 marchas com quickshifter',
  idle: 1250, redline: 14000, limiter: 14000, maxRpm: 16000, inertia: 0.033, crank: 420,
  friction: [2.5, 0.0006, 6e-8],
  torque: [[0, 0], [800, 35], [1250, 42], [2000, 50], [3000, 58], [4000, 65], [5000, 72], [6000, 78], [7000, 85], [8000, 92],
    [9000, 98], [10000, 104], [11000, 110], [11500, 112.4], [12000, 111], [13000, 107], [13500, 104], [14000, 99], [15000, 85], [16000, 70], [17000, 50]],
  // big-bang crossplane: uneven 270-180-90-180 intervals; 4-2-1 headers pair 1+4 and 2+3
  fire: [0, 450, 270, 540],
  bank: [0, 1, 1, 0],
  sound: {
    pulseWidth: 120, rasp: 0.95, c: 540,
    lp: 3000, bass: 210, bright: 1.05, deep: 0.55,
    intake: 900, howl: 1800, intakeGain: 1.0, howlGain: 1.3, tickGain: 0.04, mechGain: 0.035,
    master: 1.1,
  },
  exhaust: {
    description: '4-2-1 · válvula EXUP',
    primaries: [0.55, 0.58, 0.58, 0.55], secondaries: [0.32, 0.34],
    dual: false, mid: 0.45, can: 0.22, tail: 0.08,
  },
  geometry: {
    stroke: 0.0509, rod: 0.1, bore: 0.079, banks: [-35], cylinders: inline(4, 0.085), crankW: 0.08, crankLow: -0.055, intake: 'itb', scale: 1.45,
    pulleys: [], gearbox: true,
  },
  vehicle: { mass: 276, r: 0.31, cdA: 0.32, crr: 0.015, gears: [2.533, 2.063, 1.762, 1.522, 1.364, 1.269], Iw: 0.8, brake: 4000, clutch: 170, quickshifter: true },
}, { primary: [43, 65], sprockets: [16, 41], toothSum: 47, whine: 0.4 });
