import { BikeEngine } from '../BikeEngine';
import { inline } from '../layouts';

export const yamahaCP3 = new BikeEngine({
  id: 'cp3',
  name: 'Yamaha CP3 890',
  summary: '890 cc · 3 em linha · virabrequim 120° · DOHC 12V',
  detail: '78,0 × 62,1 mm · ordem 1-2-3 a cada 240°',
  application: 'MT-09 · 6 marchas · primária 79/47 · corrente 16/45',
  idle: 1100, redline: 11000, limiter: 11000, maxRpm: 13000, inertia: 0.03, crank: 400,
  friction: [2.2, 0.0006, 7e-8],
  // the CP3's party trick is low-down torque: over 80 Nm from 3.500 rpm and nearly flat to 9.000
  torque: [[0, 0], [800, 45], [1100, 56], [2000, 68], [3000, 77], [4000, 83], [5000, 87], [6000, 90], [7000, 93], [8000, 91.5],
    [9000, 88.5], [10000, 83.6], [10500, 79], [11000, 73], [12000, 60], [13000, 45], [14000, 30]],
  fire: [0, 240, 480],
  bank: [0, 0, 0],
  sound: {
    pulseWidth: 150, rasp: 0.85, c: 540,
    lp: 2300, bass: 190, bright: 0.95, deep: 0.85,
    // Yamaha tunes the airbox ducts to carry intake roar up to the rider
    intake: 700, howl: 1300, intakeGain: 1.4, howlGain: 1.0, tickGain: 0.04, mechGain: 0.03,
    cylVar: 0.5, bite: 0.6, biteF: 1500,
    master: 1.2,
  },
  // unequal 3-into-1 primaries give the triple its off-beat growl
  exhaust: {
    description: '3-em-1 sob o motor · primários desiguais',
    primaries: [0.52, 0.61, 0.7], secondaries: null,
    dual: false, mid: 0.45, can: 0.25, tail: 0.06,
  },
  geometry: {
    stroke: 0.0621, rod: 0.105, bore: 0.078, banks: [-35], cylinders: inline(3, 0.085), crankW: 0.08, crankLow: -0.055, intake: 'itb', scale: 1.5,
    pulleys: [], gearbox: true,
  },
  vehicle: { mass: 264, r: 0.315, cdA: 0.45, crr: 0.015, gears: [2.571, 1.947, 1.619, 1.381, 1.19, 1.037], Iw: 0.8, brake: 3800, clutch: 140, quickshifter: true },
}, { primary: [47, 79], sprockets: [16, 45], toothSum: 47, whine: 0.45 });
