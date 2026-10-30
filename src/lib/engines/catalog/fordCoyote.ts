import { CarEngine } from '../CarEngine';
import { v8 } from '../layouts';

export const fordCoyote = new CarEngine({
  id: 'coyote',
  name: 'Ford Coyote 5.0 V8',
  summary: '5,0 L · V8 90° · virabrequim cruzado · DOHC 32V',
  detail: 'Gen 3 · ordem 1-5-4-8-6-3-7-2',
  application: 'Mustang GT · MT82 6 marchas · diferencial 3,73',
  idle: 750, redline: 7500, limiter: 7500, maxRpm: 8000, inertia: 0.3, crank: 230,
  friction: [18, 0.004, 6e-7],
  torque: [[0, 0], [400, 240], [800, 310], [1000, 340], [1500, 390], [2000, 435], [2500, 470], [3000, 495], [3500, 515],
    [4000, 540], [4600, 569], [5000, 566], [5500, 556], [6000, 536], [6500, 500], [7000, 468], [7500, 420], [8000, 360], [9000, 250]],
  fire: [0, 630, 450, 180, 90, 360, 540, 270],
  bank: [0, 0, 0, 0, 1, 1, 1, 1],
  sound: {
    pulseWidth: 150, rasp: 0.8, c: 520,
    lp: 1500, bass: 170, bright: 0.9, deep: 0.9,
    intake: 480, howl: 1050, intakeGain: 0.6, howlGain: 0.9, tickGain: 0.05, mechGain: 0.015,
    master: 1.1,
  },
  exhaust: {
    description: 'coletores curtos · duplo com X-pipe',
    primaries: [0.42, 0.36, 0.34, 0.4, 0.44, 0.37, 0.35, 0.41], secondaries: null,
    dual: true, cross: 0.22, mid: [2.05, 2.3], can: [0.38, 0.44], tail: 0.35,
  },
  geometry: {
    stroke: 0.0927, rod: 0.1507, bore: 0.093, banks: [45, -45], cylinders: v8(), crankW: 0.17, crankLow: -0.09, intake: 'plenum', scale: 1,
    pulleys: [[0, -0.01, 0.085, 0.05], [0, 0.2, 0.062, 0.035], [-0.2, 0.3, 0.034, 0.04], [0.2, -0.05, 0.05, 0.04], [0.12, 0.17, 0.03, 0.03], [-0.11, 0.12, 0.034, 0.03]],
  },
  vehicle: { mass: 1750, r: 0.343, cdA: 0.874, crr: 0.012, gears: [3.66, 2.43, 1.69, 1.32, 1.0, 0.65], Iw: 2.4, brake: 13000, clutch: 720, quickshifter: true },
}, { ringTeeth: 41, pinionTeeth: 11, toothSum: 62, whine: 0.25 });
