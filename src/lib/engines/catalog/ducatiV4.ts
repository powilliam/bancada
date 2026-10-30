import { BikeEngine } from '../BikeEngine';
import { ducatiV4 as layout } from '../layouts';

export const ducatiV4 = new BikeEngine({
  id: 'v4',
  name: 'Ducati Desmosedici V4',
  summary: '1.103 cc · V4 90° · virabrequim contrarrotante · desmodrômico 16V',
  detail: 'ignição Twin Pulse 0-90-290-380°',
  application: 'Panigale V4 · 6 marchas · primária 1,80 · coroa 41/16',
  idle: 1300, redline: 14500, limiter: 14500, maxRpm: 16000, inertia: 0.035, crank: 420,
  friction: [2.5, 0.0006, 6e-8],
  torque: [[0, 0], [800, 35], [1300, 48], [2000, 55], [3000, 65], [4000, 75], [5000, 85], [6000, 93], [7000, 100], [8000, 110],
    [9000, 118], [10000, 124], [11000, 122], [12000, 119], [13000, 116], [14000, 104], [14500, 96], [15000, 88], [16000, 70], [17000, 50]],
  fire: [0, 90, 290, 380],
  bank: [1, 0, 1, 0],
  sound: {
    pulseWidth: 120, rasp: 1.0, c: 540,
    lp: 3200, bass: 220, bright: 1.1, deep: 0.5,
    intake: 900, howl: 1900, intakeGain: 1.0, howlGain: 1.3, tickGain: 0.04, mechGain: 0.04,
    master: 1.1,
  },
  exhaust: {
    description: '4-2-1 sob o motor',
    primaries: [0.45, 0.55, 0.47, 0.57], secondaries: [0.36, 0.38],
    dual: false, mid: 0.4, can: 0.21, tail: 0.1,
  },
  geometry: {
    stroke: 0.0535, rod: 0.1, bore: 0.081, banks: [-48, 42], cylinders: layout(), crankW: 0.085, crankLow: -0.06, intake: 'itb-up', scale: 1.3,
    pulleys: [], gearbox: true,
  },
  vehicle: { mass: 273, r: 0.31, cdA: 0.33, crr: 0.015, gears: [2.714, 2.118, 1.737, 1.524, 1.364, 1.25], Iw: 0.8, brake: 4000, clutch: 160, quickshifter: true },
}, { primary: [40, 72], sprockets: [16, 41], toothSum: 47, whine: 0.45 });
