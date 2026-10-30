import { clamp, fmt } from '../math';
import type { Bench } from '../sim/Bench';
import { CanvasInstrument } from './CanvasInstrument';

/** 270° rev counter with the gear in the middle. */
export class Tachometer extends CanvasInstrument {
  protected paint(bench: Bench) {
    const { ctx, colors: C } = this, E = bench.engine, rpm = bench.rpm, max = E.maxRpm;
    const cx = this.w / 2, cy = this.h * 0.54, R = Math.min(this.w, this.h) * 0.44;
    const A = (v: number) => Math.PI * 0.75 + Math.PI * 1.5 * clamp(v, 0, max) / max;
    const arc = (a: number, b: number, lw: number, col: string) => {
      ctx.beginPath(); ctx.arc(cx, cy, R, A(a), A(b)); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke();
    };
    const tw = Math.max(3, R * 0.05);
    ctx.lineCap = 'butt';
    arc(0, max, tw, C.line);
    arc(E.redline, max, tw, C.red);
    if (rpm > 5) arc(0, rpm, tw, rpm >= E.redline - 100 || bench.limiter ? C.red : C.accent);

    // one tick per thousand, labelled every one or two thousand
    const labelEvery = max > 10000 ? 2000 : 1000;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = this.font(500, R * 0.12, 'mono');
    for (let v = 0; v <= max; v += 1000) {
      const a = A(v), r0 = R - tw, len = v % labelEvery === 0 ? R * 0.09 : R * 0.045;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * (r0 - len), cy + Math.sin(a) * (r0 - len));
      ctx.lineWidth = 1; ctx.strokeStyle = v >= E.redline ? C.red : C.muted; ctx.stroke();
      if (v % labelEvery === 0) {
        ctx.fillStyle = v >= E.redline ? C.red : C.muted;
        const rn = R * 0.7;
        ctx.fillText(String(v / 1000), cx + Math.cos(a) * rn, cy + Math.sin(a) * rn);
      }
    }

    ctx.fillStyle = C.fg; ctx.font = this.font(600, R * 0.56, 'sans');
    ctx.fillText(bench.gearLabel, cx, cy - R * 0.02);
    ctx.textBaseline = 'alphabetic';
    ctx.font = this.font(500, R * 0.14, 'mono');
    ctx.fillText(fmt(rpm), cx, cy + R * 0.48);
    ctx.fillStyle = C.muted; ctx.font = this.font(500, R * 0.1, 'mono');
    ctx.fillText(`${fmt(bench.kmh)} km/h`, cx, cy + R * 0.66);

    const flag = bench.mode === 'cranking' ? 'partida' : bench.limiter ? 'corte' : '';
    if (flag) {
      ctx.fillStyle = C.red; ctx.font = this.font(600, R * 0.1, 'sans');
      ctx.fillText(flag.toUpperCase(), cx, cy - R * 0.42);
    }
  }
}
