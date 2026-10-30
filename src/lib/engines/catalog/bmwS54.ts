import { CarEngine } from '../CarEngine';
import { inline } from '../layouts';

export const bmwS54 = new CarEngine({
  id: 's54',
  name: 'BMW S54 3.2 6 em linha',
  summary: '3,2 L · 6 em linha · DOHC 24V · VANOS duplo · 6 borboletas',
  detail: 'ordem 1-5-3-6-2-4',
  application: 'BMW M3 E46 · Getrag 6 marchas · diferencial 3,62',
  idle: 800, redline: 8000, limiter: 8000, maxRpm: 9000, inertia: 0.19, crank: 250,
  friction: [14, 0.0032, 4.5e-7],
  torque: [[0, 0], [600, 200], [1000, 250], [1500, 280], [2000, 300], [2500, 315], [3000, 325], [3500, 335], [4000, 350], [4500, 360],
    [4900, 365], [5500, 360], [6000, 350], [6500, 340], [7000, 330], [7500, 315], [7900, 305], [8000, 300], [8500, 270], [9000, 230], [10000, 180]],
  fire: [0, 480, 240, 600, 120, 360],
  bank: [0, 0, 0, 1, 1, 1],
  sound: {
    pulseWidth: 130, rasp: 0.6, c: 540,
    lp: 2400, bass: 140, bright: 1.0, deep: 0.55,
    intake: 650, howl: 1400, intakeGain: 1.1, howlGain: 1.6, tickGain: 0.03, mechGain: 0.02,
    master: 1.1,
  },
  exhaust: {
    description: '2 coletores 3-em-1 · duplo com cruzamento',
    primaries: [0.55, 0.6, 0.52, 0.58, 0.62, 0.54], secondaries: null,
    dual: true, cross: 0.45, mid: [1.9, 1.96], can: [0.34, 0.36], tail: 0.2,
  },
  geometry: {
    stroke: 0.091, rod: 0.139, bore: 0.087, banks: [20], cylinders: inline(6, 0.091), crankW: 0.13, crankLow: -0.085, intake: 'itb', scale: 1,
    pulleys: [[0, -0.01, 0.08, 0.045], [0.04, 0.2, 0.058, 0.03], [-0.17, 0.17, 0.035, 0.035], [0.18, -0.03, 0.05, 0.035], [-0.1, 0.06, 0.03, 0.025]],
  },
  vehicle: { mass: 1645, r: 0.33, cdA: 0.68, crr: 0.012, gears: [4.23, 2.53, 1.67, 1.23, 1.0, 0.83], Iw: 2.2, brake: 12000, clutch: 550, quickshifter: true },
}, { ringTeeth: 47, pinionTeeth: 13, toothSum: 60, whine: 0.3 });
