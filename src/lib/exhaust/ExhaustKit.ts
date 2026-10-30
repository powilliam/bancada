/** What the silencer and catalyst do to the sound. Read by the audio worklet. */
export interface ExhaustAcoustics {
  /** catalyst present */
  cat: boolean;
  /** share of flow through the straight-through perforated core */
  core: number;
  coreLp: number;
  /** cut-off of the packed chamber around the core, Hz */
  absorb: number;
  lpMul: number;
  rasp: number;
  /** how readily unburnt fuel lights off on overrun */
  pops: number;
  /** relative loudness */
  loud: number;
}

export interface CanFinish {
  color: number;
  metalness: number;
  roughness: number;
}

/**
 * An exhaust setup that bolts onto any engine: it changes the silencer,
 * whether there is a catalyst, how hard the map fuels on overrun and the top-end power.
 */
export class ExhaustKit {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly description: string,
    readonly acoustics: ExhaustAcoustics,
    /** extra torque at the top end, as a fraction */
    readonly powerGain: number,
    /** silencer radius and length, in engine units */
    readonly can: readonly [radius: number, length: number],
    readonly finish: CanFinish,
  ) {}
}
