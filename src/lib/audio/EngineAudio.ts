import type { AudioConfig } from '../engines';
import type { AudioFrame } from '../sim/Bench';

const WORKLET_URL = '/worklets/engine-processor.js';

/** Owns the AudioContext and the synthesis worklet. Starts on the first user gesture. */
export class EngineAudio {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private master: GainNode | null = null;
  private starting: Promise<void> | null = null;
  private volume = 0.75;

  constructor(private config: AudioConfig) {}

  get ready() {
    return this.node !== null;
  }

  start() {
    this.starting ??= this.init();
    return this.starting.then(() => {
      if (this.ctx!.state !== 'running') return this.ctx!.resume();
    });
  }

  /** `keep` carries the running state over, so an exhaust swap does not restart the sound */
  setConfig(config: AudioConfig, keep = false) {
    this.config = config;
    this.node?.port.postMessage({ cfg: config, keep });
  }

  update(frame: AudioFrame) {
    this.node?.port.postMessage(frame);
  }

  /** 0..1, perceptual */
  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.gain(), this.ctx.currentTime, 0.03);
  }

  dispose() {
    this.ctx?.close();
    this.ctx = this.node = this.master = null;
    this.starting = null;
  }

  private gain() {
    return this.volume * this.volume * 1.2;
  }

  private async init() {
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    await ctx.audioWorklet.addModule(WORKLET_URL);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -8; comp.knee.value = 6; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
    const master = ctx.createGain();
    master.gain.value = this.gain();
    const node = new AudioWorkletNode(ctx, 'engine-processor', {
      numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { cfg: this.config },
    });
    node.connect(comp).connect(master).connect(ctx.destination);
    Object.assign(this, { ctx, node, master });
  }
}
