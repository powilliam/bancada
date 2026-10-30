import type { Engine } from './Engine';
import { bmwS54 } from './catalog/bmwS54';
import { ducatiV4 } from './catalog/ducatiV4';
import { fordCoyote } from './catalog/fordCoyote';
import { kawasakiZX6R } from './catalog/kawasakiZX6R';
import { triumph765 } from './catalog/triumph765';
import { yamahaCP3 } from './catalog/yamahaCP3';
import { yamahaCP4 } from './catalog/yamahaCP4';

export { Engine } from './Engine';
export type { DynoCurve, AudioConfig } from './Engine';

/** The stand's line-up, in menu order. To add an engine, create it under catalog/ and list it here. */
export const ENGINES: readonly Engine[] = [fordCoyote, bmwS54, ducatiV4, yamahaCP3, yamahaCP4, triumph765, kawasakiZX6R];

export const getEngine = (id: string) => ENGINES.find(e => e.id === id) ?? ENGINES[0];
