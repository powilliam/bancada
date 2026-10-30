export const TAU = Math.PI * 2;
/** rad/s → rpm */
export const RPM = 60 / TAU;
/** watts per metric horsepower */
export const CV = 735.5;

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');
