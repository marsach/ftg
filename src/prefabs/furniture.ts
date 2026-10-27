import { glow, mat, unlit } from '../render/toon';
import { Tex, type ScreenKind } from '../render/textures';
import { box, cyl, plane } from '../world/geom';
import { definePrefab } from '../world/prefab';
import { P } from './palette';

/** Krzesło biurowe. Przód (siedzisko) w stronę +Z, oparcie z tyłu. */
export const chair = definePrefab<{ color?: number; solid?: boolean }>('chair', (c, o) => {
  const col = o.color ?? P.chair;
  box(c.g, 0.48, 0.07, 0.46, mat(col), 0, 0.46, 0);
  box(c.g, 0.46, 0.5, 0.06, mat(col), 0, 0.76, -0.22);
  cyl(c.g, 0.03, 0.03, 0.4, mat(P.steel), 0, 0.25, 0, 8);
  box(c.g, 0.5, 0.04, 0.08, mat(P.dark), 0, 0.05, 0);
  box(c.g, 0.08, 0.04, 0.5, mat(P.dark), 0, 0.05, 0);
  if (o.solid ?? true) c.block(0, 0, 0.5, 0.5);
});

export interface DeskOpts {
  screen?: ScreenKind;
  monitors?: 1 | 2;
  mug?: boolean;
  /** karteczka z numerem stanowiska (jak na planie) */
  number?: string;
}

/** Biurko z monitorem. Użytkownik siedzi po stronie +Z, monitor stoi przy krawędzi -Z. */
export const desk = definePrefab<DeskOpts>('desk', (c, o) => {
  box(c.g, 1.4, 0.05, 0.76, mat(P.desk), 0, 0.74, 0);
  box(c.g, 0.05, 0.72, 0.7, mat(P.dark), -0.66, 0.36, 0);
  box(c.g, 0.05, 0.72, 0.7, mat(P.dark), 0.66, 0.36, 0);
  const xs = o.monitors === 2 ? [-0.34, 0.34] : [0];
  for (const x of xs) {
    box(c.g, 0.06, 0.25, 0.06, mat(P.dark), x, 0.88, -0.22);
    box(c.g, 0.22, 0.02, 0.16, mat(P.dark), x, 0.775, -0.22);
    box(c.g, 0.62, 0.38, 0.04, mat(P.monitor), x, 1.12, -0.24);
    plane(c.g, 0.57, 0.33, unlit(Tex[o.screen ?? 'sheet']()), x, 1.12, -0.217);
  }
  box(c.g, 0.46, 0.02, 0.15, mat(0xd8d6d0), 0, 0.775, 0.08);
  box(c.g, 0.08, 0.02, 0.11, mat(0xd8d6d0), 0.36, 0.775, 0.1);
  box(c.g, 0.21, 0.01, 0.29, mat(0xffffff), -0.45, 0.77, -0.05).rotation.y = 0.2;
  box(c.g, 0.07, 0.003, 0.07, mat(P.note), 0.52, 0.768, -0.12);
  if (o.mug) cyl(c.g, 0.045, 0.04, 0.1, mat(P.accent), -0.5, 0.82, 0.12, 10);
  c.block(0, 0, 1.42, 0.78);
});

export interface BenchOpts {
  /** ile biurek w rzędzie (wzdłuż lokalnej osi X) */
  pairs: number;
  /** 2 = biurka plecami do siebie (domyślnie), 1 = jeden rząd */
  sides?: 1 | 2;
  /** które stanowiska mają kubek / inny ekran (indeks stanowiska) */
  mugs?: number[];
  codeScreens?: number[];
  /** pomiń krzesła przy tych stanowiskach (np. bo siedzi tam postać z własnym krzesłem) */
  noChair?: number[];
}

/**
 * Rząd biurek (najczęstszy układ na planie biura). Stanowiska numerowane
 * od lewej: najpierw strona +Z (0..pairs-1), potem strona -Z.
 * Przegroda między stronami w kolorze `P.divider`.
 */
export const bench = definePrefab<BenchOpts>('bench', (c, o) => {
  const sides = o.sides ?? 2;
  const width = o.pairs * 1.42;
  let seat = 0;
  for (const side of sides === 2 ? [1, -1] : [1]) {
    for (let i = 0; i < o.pairs; i++, seat++) {
      const x = -width / 2 + 0.71 + i * 1.42;
      const z = sides === 2 ? side * 0.38 : 0;
      const ry = side === 1 ? 0 : Math.PI;
      c.place(desk, {
        x,
        z,
        ry,
        mug: o.mugs?.includes(seat),
        screen: o.codeScreens?.includes(seat) ? 'code' : 'sheet',
      });
      if (!o.noChair?.includes(seat)) c.place(chair, { x, z: z + side * 0.68, ry: side === 1 ? Math.PI : 0 });
    }
  }
  if (sides === 2) box(c.g, width, 0.36, 0.04, mat(P.divider), 0, 0.95, 0);
});

/** Pozycja (lokalna) siedzącej postaci przy stanowisku `seat` w rzędzie biurek. */
export function benchSeat(o: Pick<BenchOpts, 'pairs' | 'sides'>, seat: number): { x: number; z: number; ry: number } {
  const sides = o.sides ?? 2;
  const side = seat < o.pairs ? 1 : -1;
  const i = seat % o.pairs;
  const x = -(o.pairs * 1.42) / 2 + 0.71 + i * 1.42;
  const z = (sides === 2 ? side * 0.38 : 0) + side * 0.53;
  return { x, z, ry: side === 1 ? Math.PI : 0 };
}

/** Stół konferencyjny z krzesłami po obu stronach (wzdłuż lokalnej osi X). */
export const meetingTable = definePrefab<{ length: number; width?: number; seats?: number; round?: boolean }>(
  'meetingTable',
  (c, o) => {
    if (o.round) {
      cyl(c.g, o.length / 2, o.length / 2, 0.05, mat(P.desk), 0, 0.74, 0, 24);
      cyl(c.g, 0.07, 0.07, 0.72, mat(P.dark), 0, 0.36, 0, 8);
      const n = o.seats ?? 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = o.length / 2 + 0.38;
        // krzesło zwrócone przodem do środka stołu
        c.place(chair, { x: Math.cos(a) * r, z: Math.sin(a) * r, ry: Math.atan2(-Math.cos(a), -Math.sin(a)), solid: false });
      }
      c.block(0, 0, o.length, o.length);
      return;
    }
    const w = o.width ?? 1.2;
    box(c.g, o.length, 0.06, w, mat(P.desk), 0, 0.74, 0);
    box(c.g, 0.1, 0.72, w * 0.7, mat(P.dark), -o.length / 2 + 0.3, 0.36, 0);
    box(c.g, 0.1, 0.72, w * 0.7, mat(P.dark), o.length / 2 - 0.3, 0.36, 0);
    const per = o.seats ?? Math.max(1, Math.floor(o.length / 0.9));
    for (let i = 0; i < per; i++) {
      const x = -o.length / 2 + (o.length / per) * (i + 0.5);
      c.place(chair, { x, z: -w / 2 - 0.35, ry: 0, solid: false });
      c.place(chair, { x, z: w / 2 + 0.35, ry: Math.PI, solid: false });
    }
    c.block(0, 0, o.length, w + 1.0);
  },
);

/** Rząd stolików szkoleniowych z krzesłami, zwrócony w lokalne -Z (w stronę ekranu). */
export const trainingRow = definePrefab<{ seats: number }>('trainingRow', (c, o) => {
  const len = o.seats * 0.7;
  box(c.g, len, 0.04, 0.45, mat(P.desk), 0, 0.72, 0);
  for (const x of [-len / 2 + 0.1, len / 2 - 0.1]) box(c.g, 0.04, 0.7, 0.4, mat(P.dark), x, 0.35, 0);
  for (let i = 0; i < o.seats; i++)
    c.place(chair, { x: -len / 2 + 0.35 + i * 0.7, z: 0.5, ry: Math.PI, solid: false, color: 0x5d6670 });
  c.block(0, 0.2, len, 0.95);
});

/** Kanapa: siedzisko w stronę +Z. */
export const sofa = definePrefab<{ length?: number; color?: number }>('sofa', (c, o) => {
  const L = o.length ?? 2,
    col = o.color ?? P.sofa;
  box(c.g, L, 0.4, 0.85, mat(col), 0, 0.25, 0);
  box(c.g, L, 0.45, 0.22, mat(col), 0, 0.65, -0.33);
  box(c.g, 0.2, 0.3, 0.85, mat(col), -L / 2 + 0.1, 0.55, 0);
  box(c.g, 0.2, 0.3, 0.85, mat(col), L / 2 - 0.1, 0.55, 0);
  c.block(0, 0, L, 0.9);
});

/** Okrągły stolik kawowy / bistro, opcjonalnie z hokerami. */
export const roundTable = definePrefab<{ r?: number; h?: number; stools?: number }>('roundTable', (c, o) => {
  const r = o.r ?? 0.5,
    h = o.h ?? 0.74;
  cyl(c.g, r, r, 0.04, mat(P.desk), 0, h, 0, 20);
  cyl(c.g, 0.05, 0.05, h, mat(P.dark), 0, h / 2, 0, 8);
  for (let i = 0; i < (o.stools ?? 0); i++) {
    const a = 0.6 + (i * Math.PI * 2) / (o.stools ?? 1);
    const x = Math.cos(a) * (r + 0.35),
      z = Math.sin(a) * (r + 0.35);
    cyl(c.g, 0.18, 0.18, 0.05, mat(P.accent), x, h - 0.12, z, 12);
    cyl(c.g, 0.025, 0.025, h - 0.14, mat(P.steel), x, (h - 0.14) / 2, z, 6);
  }
  c.block(0, 0, r * 2, r * 2);
});

/** Blat kuchenny z szafkami górnymi (wzdłuż lokalnej osi X, ściana po stronie -Z). */
export const counter = definePrefab<{ length: number; depth?: number; uppers?: boolean; sinkAt?: number }>(
  'counter',
  (c, o) => {
    const d = o.depth ?? 0.66;
    box(c.g, o.length, 0.9, d, mat(0xc9c2b4), 0, 0.45, 0);
    box(c.g, o.length + 0.06, 0.05, d + 0.04, mat(0xe7e3da), 0, 0.925, 0);
    if (o.uppers ?? true) box(c.g, o.length, 0.62, 0.36, mat(0xeeece6), 0, 2.05, -d / 2 + 0.18);
    if (o.sinkAt !== undefined) cyl(c.g, 0.2, 0.2, 0.06, mat(P.steel), o.sinkAt, 0.94, 0, 16);
    c.block(0, 0, o.length, d);
  },
);

/** Wyspa kuchenna (blat z obu stron). */
export const island = definePrefab<{ length: number }>('island', (c, o) => {
  box(c.g, o.length, 0.92, 0.9, mat(0xd9d3c7), 0, 0.46, 0);
  box(c.g, o.length + 0.1, 0.05, 1.0, mat(0xf1efe9), 0, 0.945, 0);
  c.block(0, 0, o.length + 0.1, 1.0);
});

export const fridge = definePrefab('fridge', (c) => {
  box(c.g, 0.75, 1.9, 0.7, mat(0xdfe2e4), 0, 0.95, 0);
  box(c.g, 0.03, 0.5, 0.03, mat(P.steel), 0.3, 1.25, 0.36);
  box(c.g, 0.1, 0.04, 0.01, glow(P.ok), -0.2, 1.6, 0.355, { cast: false });
  c.block(0, 0, 0.75, 0.7);
});

/** Szafki na rzeczy (lockery) wzdłuż lokalnej osi X. */
export const lockers = definePrefab<{ length: number; color?: number }>('lockers', (c, o) => {
  box(c.g, o.length, 1.9, 0.5, mat(o.color ?? 0xd2b04a), 0, 0.95, 0);
  for (let x = -o.length / 2 + 0.4; x < o.length / 2; x += 0.4) box(c.g, 0.02, 1.8, 0.01, mat(P.dark), x, 0.95, 0.255, { cast: false });
  c.block(0, 0, o.length, 0.5);
});
