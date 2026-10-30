import type { Bench } from '../sim/Bench';

export interface Palette {
  fg: string;
  muted: string;
  line: string;
  accent: string;
  red: string;
}

/** A HiDPI 2D canvas gauge redrawn every frame from the bench state. */
export abstract class CanvasInstrument {
  protected readonly ctx: CanvasRenderingContext2D;
  protected w = 0;
  protected h = 0;
  private dpr = 1;
  private readonly fonts: { mono: string; sans: string };

  constructor(protected readonly canvas: HTMLCanvasElement, protected readonly colors: Palette) {
    this.ctx = canvas.getContext('2d')!;
    // canvas fonts cannot read CSS variables, so resolve next/font's family names once
    const css = getComputedStyle(canvas);
    this.fonts = {
      mono: `${css.getPropertyValue('--font-mono').trim() || 'ui-monospace'}, monospace`,
      sans: `${css.getPropertyValue('--font-sans').trim() || 'system-ui'}, sans-serif`,
    };
  }

  fit() {
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
  }

  draw(bench: Bench) {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.paint(bench);
  }

  protected font(weight: number, px: number, family: 'mono' | 'sans') {
    return `${weight} ${px}px ${this.fonts[family]}`;
  }

  protected abstract paint(bench: Bench): void;
}
