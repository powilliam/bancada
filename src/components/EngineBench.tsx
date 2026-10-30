'use client';

import { useEffect, useRef, useState } from 'react';
import { BenchApp, type BenchView, type Control } from '@/lib/BenchApp';
import { ENGINES, getEngine } from '@/lib/engines';
import { EXHAUSTS } from '@/lib/exhaust';
import s from './EngineBench.module.css';

const IGNITION_LABEL = { off: 'Ligar', cranking: 'Partida…', running: 'Desligar' } as const;

const HOLD_CONTROLS: { control: Control; label: string }[] = [
  { control: 'down', label: '−' },
  { control: 'brake', label: 'Freio' },
  { control: 'throttle', label: 'Acelerar' },
  { control: 'up', label: '+' },
];

export function EngineBench() {
  const scene = useRef<HTMLCanvasElement>(null);
  const tach = useRef<HTMLCanvasElement>(null);
  const dyno = useRef<HTMLCanvasElement>(null);
  const cv = useRef<HTMLSpanElement>(null);
  const nm = useRef<HTMLSpanElement>(null);
  const app = useRef<BenchApp | null>(null);
  const [view, setView] = useState<BenchView>({ engineId: ENGINES[0].id, exhaustId: EXHAUSTS[0].id, mode: 'off', xray: false });
  const [notice, setNotice] = useState<{ text: string; key: number } | null>(null);

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const a = new BenchApp(
      { scene: scene.current!, tach: tach.current!, dyno: dyno.current!, cv: cv.current!, nm: nm.current! },
      { fg: color('--fg'), muted: color('--muted'), line: color('--line'), accent: color('--accent'), red: color('--red') },
    );
    a.onNotice = text => setNotice({ text, key: Date.now() });
    const unsubscribe = a.subscribe(setView);
    app.current = a;
    return () => { unsubscribe(); a.dispose(); app.current = null; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(t);
  }, [notice]);

  const engine = getEngine(view.engineId);

  const hold = (control: Control) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      app.current?.press(control, true);
    },
    onPointerUp: () => app.current?.press(control, false),
    onPointerCancel: () => app.current?.press(control, false),
    onLostPointerCapture: () => app.current?.press(control, false),
  });

  return (
    <main className={s.root}>
      <canvas ref={scene} className={s.scene} aria-label="Modelo 3D do motor. Arraste para girar, role para aproximar." />

      <header className={s.top}>
        <div className={s.ident}>
          <label className={s.enginePick}>
            <select
              aria-label="Motor"
              value={view.engineId}
              onChange={e => { app.current?.selectEngine(e.target.value); e.target.blur(); }}
            >
              {ENGINES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <p className={s.summary} title={engine.detail}>{engine.summary}</p>
          <p className={s.meta}>{engine.application}</p>
        </div>

        <div className={s.tools}>
          <div className={s.segmented} role="radiogroup" aria-label="Escapamento">
            {EXHAUSTS.map(x => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={view.exhaustId === x.id}
                title={x.description}
                onClick={e => { app.current?.selectExhaust(x.id); e.currentTarget.blur(); }}
              >
                {x.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={s.toggle}
            aria-pressed={view.xray}
            onClick={e => { app.current?.setXray(); e.currentTarget.blur(); }}
          >
            Raio-X
          </button>
          <label className={s.volume}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" /><path d="M11.5 5.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" fill="none" strokeWidth="1.3" strokeLinecap="round" /></svg>
            <input
              type="range" min={0} max={1} step={0.01} defaultValue={0.75} aria-label="Volume"
              onChange={e => app.current?.setVolume(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </header>

      <footer className={s.hud}>
        <canvas ref={tach} className={s.tach} aria-label="Conta-giros" />

        <div className={s.center}>
          <button
            type="button"
            className={s.ignition}
            data-mode={view.mode}
            onClick={e => { void app.current?.ignition(); e.currentTarget.blur(); }}
          >
            <span className={s.dot} />
            {IGNITION_LABEL[view.mode]}
          </button>
          <div className={s.pad}>
            {HOLD_CONTROLS.map(({ control, label }) => (
              <button key={control} type="button" {...hold(control)}>{label}</button>
            ))}
          </div>
          <p className={s.keys}>
            <kbd>↑</kbd> acelera <kbd>↓</kbd> freia <kbd>Shift</kbd><kbd>Ctrl</kbd> marchas <kbd>Enter</kbd> ignição
          </p>
        </div>

        <div className={s.power}>
          <div className={s.readout}>
            <span><span ref={cv}>0</span><small>cv</small></span>
            <span className={s.torque}><span ref={nm}>0</span><small>Nm</small></span>
          </div>
          <canvas ref={dyno} className={s.dyno} aria-label="Curva de potência e torque" />
        </div>
      </footer>

      <div className={s.toast} role="status" data-show={!!notice} key={notice?.key}>{notice?.text}</div>
    </main>
  );
}
