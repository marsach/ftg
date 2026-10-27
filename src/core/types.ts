/** Zdarzenia na poziomie gry (nie wejścia: to obsługuje Input + Game). */
export interface GameEvents {
  objective: string;
  clock: { h: number; m: number };
  flag: { name: string; value: unknown };
  'dialogue:open': void;
  'dialogue:close': void;
  'game:start': void;
  'game:end': void;
}

/** System aktualizowany co klatkę przez pętlę gry. */
export interface System {
  update(dt: number, t: number): void;
  /** przywraca stan początkowy przy nowej grze */
  reset?(): void;
}

/** Prostokąt na płaszczyźnie podłogi (XZ). */
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const inRect = (r: Rect, x: number, z: number): boolean =>
  x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
