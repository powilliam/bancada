import { EngineAudio } from './audio/EngineAudio';
import { ENGINES, getEngine } from './engines';
import { EXHAUSTS, getExhaust } from './exhaust';
import { DynoChart } from './instruments/DynoChart';
import type { Palette } from './instruments/CanvasInstrument';
import { Tachometer } from './instruments/Tachometer';
import { fmt } from './math';
import { EngineModel } from './render/EngineModel';
import { Stage } from './render/Stage';
import { Bench, type Mode } from './sim/Bench';

export interface BenchElements {
  scene: HTMLCanvasElement;
  tach: HTMLCanvasElement;
  dyno: HTMLCanvasElement;
  cv: HTMLElement;
  nm: HTMLElement;
}

export interface BenchView {
  engineId: string;
  exhaustId: string;
  mode: Mode;
  xray: boolean;
}

export type Control = 'throttle' | 'brake' | 'up' | 'down';

const SUBSTEPS = 10;

/** Runs the stand: simulation, sound, 3D model and gauges, driven by one animation loop. */
export class BenchApp {
  readonly bench: Bench;
  private readonly audio: EngineAudio;
  private readonly stage: Stage;
  private readonly model = new EngineModel();
  private readonly tach: Tachometer;
  private readonly dyno: DynoChart;
  private readonly listeners = new Set<(v: BenchView) => void>();
  private readonly cleanup: (() => void)[] = [];
  private raf = 0;
  private last = 0;
  private cvShown = 0;
  private nmShown = 0;

  onNotice?: (message: string) => void;

  constructor(private readonly el: BenchElements, palette: Palette) {
    const engine = ENGINES[0], exhaust = EXHAUSTS[0];
    this.bench = new Bench(engine, exhaust);
    this.bench.onModeChange = () => this.emit();
    this.bench.onNotice = m => this.onNotice?.(m);
    this.audio = new EngineAudio(engine.audioConfig(exhaust));
    this.stage = new Stage(el.scene);
    this.stage.add(this.model.group);
    this.tach = new Tachometer(el.tach, palette);
    this.dyno = new DynoChart(el.dyno, palette);
    this.rebuild();

    const resize = () => this.resize();
    addEventListener('resize', resize);
    const ro = new ResizeObserver(resize);
    ro.observe(el.tach); ro.observe(el.dyno);
    this.cleanup.push(() => removeEventListener('resize', resize), () => ro.disconnect());
    this.bindKeys();
    this.resize();
    this.raf = requestAnimationFrame(t => { this.last = t; this.frame(t); });
  }

  get view(): BenchView {
    return { engineId: this.bench.engine.id, exhaustId: this.bench.exhaust.id, mode: this.bench.mode, xray: this.model.xrayOn };
  }

  subscribe(fn: (v: BenchView) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  selectEngine(id: string) {
    const engine = getEngine(id);
    this.bench.setEngine(engine);
    this.audio.setConfig(engine.audioConfig(this.bench.exhaust));
    this.rebuild();
    this.emit();
  }

  /** swapping the exhaust keeps the engine running */
  selectExhaust(id: string) {
    const exhaust = getExhaust(id);
    this.bench.setExhaust(exhaust);
    this.audio.setConfig(this.bench.engine.audioConfig(exhaust), true);
    this.rebuild();
    this.emit();
  }

  cycleExhaust() {
    const i = EXHAUSTS.indexOf(this.bench.exhaust);
    this.selectExhaust(EXHAUSTS[(i + 1) % EXHAUSTS.length].id);
  }

  async ignition(on = this.bench.mode === 'off') {
    // browsers only start audio from a user gesture, so the key turn is where it happens
    await this.audio.start();
    this.bench.ignition(on);
  }

  setXray(on = !this.model.xrayOn) {
    this.model.setXray(on);
    this.emit();
  }

  setVolume(v: number) {
    this.audio.setVolume(v);
  }

  press(control: Control, down: boolean) {
    const { bench } = this;
    switch (control) {
      case 'throttle':
        bench.input.throttle = down;
        if (down && bench.mode === 'off') void this.ignition(true);
        break;
      case 'brake':
        bench.input.brake = down;
        break;
      case 'up':
      case 'down':
        if (down) bench.requestShift(control === 'up' ? 1 : -1);
        break;
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    for (const fn of this.cleanup) fn();
    this.audio.dispose();
    this.model.dispose();
    this.stage.dispose();
    this.listeners.clear();
  }

  private emit() {
    const v = this.view;
    for (const fn of this.listeners) fn(v);
  }

  private rebuild() {
    this.model.build(this.bench.engine, this.bench.exhaust);
    this.stage.setFloor(this.model.floorY);
  }

  private resize() {
    this.stage.resize(innerWidth, innerHeight);
    this.tach.fit();
    this.dyno.fit();
  }

  private bindKeys() {
    const isField = (t: EventTarget | null) => t instanceof HTMLSelectElement || t instanceof HTMLInputElement;
    const down = (e: KeyboardEvent) => {
      if (isField(e.target)) return;
      const once = !e.repeat;
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); if (once) this.press('throttle', true); break;
        case 'ArrowDown': e.preventDefault(); this.press('brake', true); break;
        case 'Shift': e.preventDefault(); if (once) this.press('up', true); break;
        case 'Control': e.preventDefault(); if (once) this.press('down', true); break;
        case 'Enter': e.preventDefault(); if (once) void this.ignition(); break;
        case 'x': case 'X': this.setXray(); break;
        case 'e': case 'E': this.cycleExhaust(); break;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') this.press('throttle', false);
      if (e.key === 'ArrowDown') this.press('brake', false);
    };
    const blur = () => { this.press('throttle', false); this.press('brake', false); };
    addEventListener('keydown', down);
    addEventListener('keyup', up);
    addEventListener('blur', blur);
    this.cleanup.push(() => {
      removeEventListener('keydown', down);
      removeEventListener('keyup', up);
      removeEventListener('blur', blur);
    });
  }

  private frame(now: number) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const { bench } = this;
    for (let i = 0; i < SUBSTEPS; i++) bench.step(dt / SUBSTEPS);
    bench.updateHeat(dt);
    this.audio.update(bench.audioFrame());

    const k = Math.min(1, dt * 10);
    this.cvShown += (bench.cv - this.cvShown) * k;
    this.nmShown += (bench.Te - this.nmShown) * k;
    this.el.cv.textContent = fmt(this.cvShown);
    this.el.nm.textContent = fmt(bench.rpm > 50 ? this.nmShown : 0);
    this.tach.draw(bench);
    this.dyno.draw(bench);

    this.model.update(dt, bench);
    this.stage.render();
    this.raf = requestAnimationFrame(t => this.frame(t));
  }
}
