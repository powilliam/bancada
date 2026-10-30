import { ExhaustKit } from './ExhaustKit';

export { ExhaustKit } from './ExhaustKit';

export const EXHAUSTS: readonly ExhaustKit[] = [
  new ExhaustKit(
    'stock', 'Original', 'catalisador · abafador original',
    { cat: true, core: 0.3, coreLp: 3000, absorb: 1400, lpMul: 0.8, rasp: 0.7, pops: 0.35, loud: 0.72 },
    0, [0.07, 0.26],
    { color: 0x2b2e33, metalness: 0.55, roughness: 0.5 },
  ),
  new ExhaustKit(
    'slip', 'Slip-on', 'catalisador · ponteira esportiva',
    { cat: true, core: 0.6, coreLp: 6000, absorb: 2500, lpMul: 1, rasp: 1, pops: 1, loud: 1 },
    0.015, [0.05, 0.22],
    { color: 0x17181a, metalness: 0.3, roughness: 0.28 },
  ),
  new ExhaustKit(
    'full', 'Full', 'sem catalisador · titânio · mapa ajustado',
    { cat: false, core: 0.82, coreLp: 9000, absorb: 3500, lpMul: 1.3, rasp: 1.3, pops: 2.2, loud: 1.3 },
    0.05, [0.042, 0.2],
    { color: 0x9ea5b2, metalness: 0.95, roughness: 0.26 },
  ),
];

export const getExhaust = (id: string) => EXHAUSTS.find(x => x.id === id) ?? EXHAUSTS[0];
