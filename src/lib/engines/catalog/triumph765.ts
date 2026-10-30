import { BikeEngine } from '../BikeEngine';
import { inline } from '../layouts';

export const triumph765 = new BikeEngine({
  id: 't765',
  name: 'Triumph 765 3 cilindros',
  summary: '765 cc · 3 em linha · virabrequim 120° · DOHC 12V',
  detail: '78,0 × 53,4 mm · ordem 1-2-3 a cada 240°',
  application: 'Street Triple 765 RS · 6 marchas · primária 79/46 · corrente 16/48',
  idle: 1200, redline: 12650, limiter: 12650, maxRpm: 14000, inertia: 0.024, crank: 400,
  friction: [2, 0.0005, 6e-8],
  torque: [[0, 0], [800, 32], [1200, 41], [2000, 47], [3000, 53], [4000, 58], [5000, 62], [6000, 66], [7000, 71], [8000, 75.5],
    [9000, 79], [9500, 80], [10000, 79.8], [11000, 78.5], [12000, 76.1], [12500, 72], [13000, 66], [14000, 52], [15000, 38]],
  fire: [0, 240, 480],
  bank: [0, 0, 0],
  sound: {
    pulseWidth: 130, rasp: 0.75, c: 540,
    lp: 3000, bass: 220, bright: 1.05, deep: 0.6,
    // the triple's induction howl climbs with revs
    intake: 900, howl: 1900, intakeGain: 1.1, howlGain: 1.6, tickGain: 0.04, mechGain: 0.035,
    cylVar: 0.5, bite: 0.7, biteF: 2400,
    master: 1.2,
  },
  exhaust: {
    description: '3-em-1 · ponteira baixa',
    primaries: [0.56, 0.63, 0.7], secondaries: null,
    dual: false, mid: 0.42, can: 0.24, tail: 0.08,
  },
  geometry: {
    stroke: 0.0534, rod: 0.1, bore: 0.078, banks: [-30], cylinders: inline(3, 0.085), crankW: 0.078, crankLow: -0.055, intake: 'itb', scale: 1.5,
    pulleys: [], gearbox: true,
  },
  vehicle: { mass: 263, r: 0.315, cdA: 0.45, crr: 0.015, gears: [2.615, 2.118, 1.789, 1.571, 1.429, 1.318], Iw: 0.8, brake: 3800, clutch: 120, quickshifter: true },
  // straight-cut primary gears: the Triumph whine
}, { primary: [46, 79], sprockets: [16, 48], toothSum: 47, whine: 1.4 });
