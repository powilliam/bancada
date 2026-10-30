export interface Coupling {
  a: number;
  b: number;
  /** torque carried across */
  Tc: number;
  locked: boolean;
}

/** Two bodies joined by a friction coupling of capacity `cap`; locks when it can. */
export function couple(wa: number, wb: number, Ja: number, Jb: number, Ta: number, Tb: number, cap: number, dt: number): Coupling {
  const aL = (Ta - Tb) / (Ja + Jb), TcL = Ta - Ja * aL, canLock = Math.abs(TcL) <= cap, slip = wa - wb;
  const locked = (): Coupling => {
    const w = (wa * Ja + wb * Jb) / (Ja + Jb) + aL * dt;
    return { a: w, b: w, Tc: TcL, locked: true };
  };
  if (canLock && Math.abs(slip) < 0.4) return locked();
  const s = slip !== 0 ? Math.sign(slip) : Math.sign(TcL), Tc = cap * s;
  const na = wa + (Ta - Tc) / Ja * dt, nb = wb + (Tc - Tb) / Jb * dt;
  if (canLock && Math.sign(na - nb) !== s) return locked();
  return { a: na, b: nb, Tc, locked: false };
}
