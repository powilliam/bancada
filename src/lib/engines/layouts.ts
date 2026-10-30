import type { Cylinder } from './types';

/** 90° V8 on a cross-plane crank: two rods per throw, banks offset along the crank */
export const v8 = (): Cylinder[] =>
  Array.from({ length: 8 }, (_, i) => {
    const bank = i < 4 ? 0 : 1, tz = 0.15 - 0.1 * (i % 4);
    return { bank, z: tz + (bank ? -0.0115 : 0.0115), tz };
  });

/** n cylinders in line at a given bore spacing */
export const inline = (n: number, spacing: number): Cylinder[] =>
  Array.from({ length: n }, (_, i) => {
    const z = (n - 1) / 2 * spacing - spacing * i;
    return { bank: 0, z, tz: z };
  });

/** Desmosedici Stradale: each crankpin carries one rear and one front cylinder */
export const ducatiV4 = (): Cylinder[] => [
  { bank: 1, z: 0.039, tz: 0.05 }, { bank: 0, z: 0.061, tz: 0.05 },
  { bank: 1, z: -0.061, tz: -0.05 }, { bank: 0, z: -0.039, tz: -0.05 },
];
