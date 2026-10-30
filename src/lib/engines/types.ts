export type TorquePoint = readonly [rpm: number, nm: number];

/** Synthesis voicing, read by the audio worklet. */
export interface SoundProfile {
  /** blowdown pulse width, crank degrees */
  pulseWidth: number;
  rasp: number;
  /** speed of sound in the hot exhaust, m/s */
  c: number;
  lp: number;
  bass: number;
  bright: number;
  deep: number;
  intake: number;
  howl: number;
  intakeGain: number;
  howlGain: number;
  tickGain: number;
  mechGain: number;
  /** fixed cylinder-to-cylinder variation */
  cylVar?: number;
  bite?: number;
  biteF?: number;
  master: number;
}

/** Exhaust pipe lengths in metres. Array values are per side on a dual system. */
export interface ExhaustLayout {
  description: string;
  primaries: number[];
  /** where pairs merge (4-2-1) */
  secondaries: number[] | null;
  dual: boolean;
  /** share of each bank's pulses that crosses over (X- or H-pipe) */
  cross?: number;
  mid: number | number[];
  can: number | number[];
  tail: number;
}

export interface Cylinder {
  /** geometric bank */
  bank: number;
  z: number;
  /** z of the crank throw it sits on */
  tz: number;
}

export type Pulley = readonly [x: number, y: number, radius: number, width: number];

export interface Geometry {
  stroke: number;
  rod: number;
  bore: number;
  /** bank angles from vertical, degrees */
  banks: number[];
  cylinders: Cylinder[];
  crankW: number;
  crankLow: number;
  intake: 'plenum' | 'itb' | 'itb-up';
  scale: number;
  pulleys: Pulley[];
  gearbox?: boolean;
}

export interface VehicleSpec {
  mass: number;
  /** tyre rolling radius, m */
  r: number;
  cdA: number;
  crr: number;
  gears: number[];
  /** wheel and driveline inertia, kg·m² */
  Iw: number;
  /** brake force, N */
  brake: number;
  /** clutch capacity, Nm */
  clutch: number;
  quickshifter: boolean;
}

export interface EngineSpec {
  id: string;
  name: string;
  /** one line: displacement, layout, valvetrain */
  summary: string;
  /** firing order and other trivia */
  detail: string;
  /** the vehicle it is installed in */
  application: string;
  idle: number;
  redline: number;
  limiter: number;
  maxRpm: number;
  /** rotating inertia, kg·m² */
  inertia: number;
  /** starter cranking speed */
  crank: number;
  /** friction torque: a + b·rpm + c·rpm² */
  friction: readonly [number, number, number];
  /** brake torque at full throttle */
  torque: TorquePoint[];
  /** crank degrees in the 720° cycle at which cylinders 1..n fire */
  fire: number[];
  /** exhaust bank each cylinder feeds */
  bank: number[];
  sound: SoundProfile;
  exhaust: ExhaustLayout;
  geometry: Geometry;
  vehicle: VehicleSpec;
}

/** Shaft speeds and tooth counts the audio needs for gear whine. */
export interface Drivetrain {
  /** overall reduction after the gearbox */
  final: number;
  /** primary reduction (1 on a car) */
  primary: number;
  /** teeth on the primary drive gear (0 on a car) */
  primaryTeeth: number;
  /** input-gear teeth meshing in each gear; 0 where no gear pair carries load */
  gearTeeth: number[];
  /** chain rollers or ring-gear teeth passing per wheel turn */
  wheelTeeth: number;
  whine: number;
  /** wheel-mesh gain */
  wheelGain: number;
  efficiency: number;
}
