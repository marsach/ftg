import * as THREE from 'three';
import { mat, toon, unlit } from '../render/toon';
import { Tex, signTexture, tiled, type ScreenKind } from '../render/textures';
import { box, plane } from '../world/geom';
import { definePrefab } from '../world/prefab';
import type { Point } from '../world/level';
import { P, WALL } from './palette';

/* ------------------------------------------------------------------ */
/*  Podłogi                                                            */
/* ------------------------------------------------------------------ */

export type Surface = 'carpet' | 'tile' | 'plain';

/** Podłoga w kształcie dowolnego wielokąta (współrzędne świata, prefab stawiaj w 0,0). */
export const floorPoly = definePrefab<{ points: Point[]; surface?: Surface; tint?: number }>('floor', (c, o) => {
  const shape = new THREE.Shape(o.points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const surface = o.surface ?? 'carpet';
  const map =
    surface === 'carpet' ? tiled(Tex.carpet(), 1, 1, 2) : surface === 'tile' ? tiled(Tex.tile(), 1, 1, 1) : null;
  const mesh = new THREE.Mesh(geo, map ? toon({ color: o.tint ?? 0xffffff, map }) : mat(o.tint ?? 0xd8d4cc));
  mesh.receiveShadow = true;
  c.g.add(mesh);
});

/* ------------------------------------------------------------------ */
/*  Ściany                                                             */
/* ------------------------------------------------------------------ */

export interface WallOpts {
  /** długość w metrach, wzdłuż lokalnej osi X */
  length: number;
  /** pas okien 0.9–2.5 m ze szprosami co 2 m */
  glass?: boolean;
  /** prześwietlanie wokół gracza (ściany między kamerą a graczem) */
  cut?: boolean;
  /** otwory drzwiowe: środek mierzony od lewego końca ściany, szerokość w metrach */
  doors?: { at: number; width?: number }[];
  color?: number;
}

export const wall = definePrefab<WallOpts>('wall', (c, o) => {
  const H = WALL.height,
    T = WALL.thickness,
    L = o.length,
    cut = !!o.cut,
    color = o.color ?? P.wall;
  const doors = (o.doors ?? []).map((d) => ({ a: d.at - (d.width ?? 1.2) / 2, b: d.at + (d.width ?? 1.2) / 2 }));
  doors.sort((p, q) => p.a - q.a);

  // odcinki ściany między drzwiami
  let pos = 0;
  for (const d of [...doors, { a: L, b: L }]) {
    if (d.a - pos > 0.02) segment(pos - L / 2, d.a - L / 2);
    pos = Math.max(pos, d.b);
  }
  // nadproża i ościeżnice
  for (const d of doors) {
    const w = d.b - d.a,
      mid = (d.a + d.b) / 2 - L / 2;
    box(c.g, w, 0.5, T, mat(color, { cut }), mid, H - 0.25, 0);
    box(c.g, 0.06, H - 0.5, T + 0.04, mat(P.mullion, { cut }), mid - w / 2, (H - 0.5) / 2, 0);
    box(c.g, 0.06, H - 0.5, T + 0.04, mat(P.mullion, { cut }), mid + w / 2, (H - 0.5) / 2, 0);
  }

  function segment(a: number, b: number) {
    const len = b - a,
      mid = (a + b) / 2;
    if (!o.glass) box(c.g, len, H, T, mat(color, { cut }), mid, H / 2, 0);
    else {
      box(c.g, len, 0.9, T, mat(color, { cut }), mid, 0.45, 0);
      box(c.g, len, 1.6, 0.08, mat(P.glass, { cut, emissive: P.glassGlow }), mid, 1.7, 0, { cast: false });
      box(c.g, len, 0.4, T, mat(color, { cut }), mid, 2.7, 0);
      for (let x = a; x <= b + 0.01; x += 2) box(c.g, 0.08, 1.6, 0.14, mat(P.mullion, { cut }), x, 1.7, 0);
    }
    c.block(mid, 0, len, T);
  }
});

/** Pełna bryła (trzon z windami, toalety): ściany, ciemniejszy „dach” i opcjonalny napis. */
export const solidBlock = definePrefab<{ w: number; d: number; color?: number; label?: string }>('solid', (c, o) => {
  box(c.g, o.w, WALL.height, o.d, mat(o.color ?? P.core, { cut: true }), 0, WALL.height / 2, 0);
  box(c.g, o.w - 0.4, 0.02, o.d - 0.4, mat(0x9d998f), 0, WALL.height + 0.01, 0, { cast: false });
  c.block(0, 0, o.w, o.d);
  if (o.label)
    plane(c.g, 3.6, 0.9, unlit(signTexture([{ text: o.label, font: '600 46px sans-serif', y: 64 }], '#9d998f', '#f4f3ef', 384, 96)), 0, WALL.height + 0.03, 0).rotation.set(-Math.PI / 2, 0, 0);
});

export const pillar = definePrefab<{ size?: number }>('pillar', (c, o) => {
  const s = o.size ?? 0.5;
  box(c.g, s, WALL.height, s, mat(P.trim, { cut: true }), 0, WALL.height / 2, 0);
  c.block(0, 0, s, s);
});

/* ------------------------------------------------------------------ */
/*  Tabliczki i ekrany                                                 */
/* ------------------------------------------------------------------ */

/**
 * Tabliczka z nazwą sali na szczycie ściany, obrócona w stronę kamery,
 * żeby była czytelna z każdego miejsca. Ustaw ją nad ścianą sali.
 */
export const roomLabel = definePrefab<{ text: string; sub?: string; accent?: boolean }>('roomLabel', (c, o) => {
  const w = Math.max(1.6, o.text.length * 0.2 + 0.5);
  const tex = signTexture(
    [
      { text: o.text, font: '600 44px sans-serif', y: o.sub ? 56 : 66 },
      ...(o.sub ? [{ text: o.sub, font: '500 22px monospace', y: 88 }] : []),
    ],
    o.accent ? '#e8643c' : '#f4f3ef',
    o.accent ? '#ffffff' : '#1f252c',
    Math.round(w * 160),
    104,
  );
  const material = unlit(tex);
  material.side = THREE.DoubleSide;
  plane(c.g, w, 0.65, material, 0, WALL.height + 0.45, 0, Math.PI / 4);
  box(c.g, 0.05, 0.3, 0.05, mat(P.dark), 0, WALL.height + 0.08, 0, { cast: false });
});

/** Płaska tabliczka (plakat, oznaczenie) zwrócona w lokalne +Z. */
export const sign = definePrefab<{
  w: number;
  h: number;
  y: number;
  lines: { text: string; font: string; y: number }[];
  bg?: string;
  fg?: string;
  px?: [number, number];
}>('sign', (c, o) => {
  const [tw, th] = o.px ?? [256, 96];
  plane(c.g, o.w, o.h, unlit(signTexture(o.lines, o.bg ?? '#f4f3ef', o.fg ?? '#1f252c', tw, th)), 0, o.y, 0.11);
});

/** Ekran / telewizor na ścianie, zwrócony w lokalne +Z. */
export const wallScreen = definePrefab<{ w?: number; h?: number; y?: number; screen?: ScreenKind }>('screen', (c, o) => {
  const w = o.w ?? 2.2,
    h = o.h ?? 1.24,
    y = o.y ?? 1.6;
  box(c.g, w + 0.08, h + 0.08, 0.05, mat(P.monitor), 0, y, 0.12);
  plane(c.g, w, h, unlit(Tex[o.screen ?? 'slide']()), 0, y, 0.148);
});
