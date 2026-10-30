import { TAU, clamp, fmt } from '../math';
import type { Bench } from '../sim/Bench';
import { CanvasInstrument } from './CanvasInstrument';

/** Full-throttle power and torque curves with the live operating point. */
export class DynoChart extends CanvasInstrument {
  private cvShown = 0;

  protected paint(bench: Bench) {
    const { ctx, colors: C, w, h } = this, E = bench.engine, curve = bench.dyno, rpm = bench.rpm;
    this.cvShown += (bench.cv - this.cvShown) * 0.16;
    const padT = 4, padB = 14, max = E.maxRpm;
    const X = (r: number) => w * r / max;
    const Y = (v: number) => padT + (h - padT - padB) * (1 - v / curve.maxCv);
    const Yt = (v: number) => padT + (h - padT - padB) * (1 - v / curve.maxNm);

    ctx.font = this.font(400, 10, 'mono'); ctx.fillStyle = C.muted; ctx.textBaseline = 'alphabetic';
    const step = max > 10000 ? 4000 : 2000;
    for (let r = 0; r <= max; r += step) {
      ctx.textAlign = r === 0 ? 'left' : r + step > max ? 'right' : 'center';
      ctx.fillText(`${r / 1000}k`, X(r), h - 1);
    }
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h - padB + 0.5); ctx.lineTo(w, h - padB + 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(E.redline) + 0.5, padT); ctx.lineTo(X(E.redline) + 0.5, h - padB); ctx.strokeStyle = C.red; ctx.stroke();

    ctx.setLineDash([2, 3]); ctx.strokeStyle = C.muted; ctx.beginPath();
    curve.points.forEach((p, i) => (i ? ctx.lineTo(X(p.rpm), Yt(p.nm)) : ctx.moveTo(X(p.rpm), Yt(p.nm))));
    ctx.stroke(); ctx.setLineDash([]);

    ctx.beginPath();
    curve.points.forEach((p, i) => (i ? ctx.lineTo(X(p.rpm), Y(p.cv)) : ctx.moveTo(X(p.rpm), Y(p.cv))));
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.stroke();

    const pk = curve.peak;
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(`${fmt(pk.cv)} cv`, X(pk.rpm) - 6, Y(pk.cv) + 4);

    if (rpm > 50) {
      ctx.beginPath(); ctx.arc(X(rpm), Y(clamp(this.cvShown, 0, curve.maxCv)), 3.5, 0, TAU);
      ctx.fillStyle = C.fg; ctx.fill();
    }
  }
}
