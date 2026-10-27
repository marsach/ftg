import type { Point } from '../../world/level';
import type { MapData } from '../../world/level';
import { prop, type Placement, type Prefab, type PropDef } from '../../world/prefab';
import { floorPoly, solidBlock, wall, type Surface } from '../../prefabs/structure';

/**
 * Narzędzia do przepisywania planu piętra na poziom.
 *
 * Wszystkie współrzędne w pliku poziomu podajemy w PIKSELACH PLANU
 * (tak jak odczytane z obrazka), a tu przeliczamy je na metry świata.
 * Dzięki temu poprawka układu = przepisanie liczby z planu.
 */
export const PLAN = {
  /** metry na piksel planu */
  scale: 0.05,
  /** piksel planu, który staje się środkiem świata (0, 0) */
  origin: [840, 535] as const,
};

export const X = (px: number) => (px - PLAN.origin[0]) * PLAN.scale;
export const Z = (py: number) => (py - PLAN.origin[1]) * PLAN.scale;
export const M = (px: number) => px * PLAN.scale;
export const pt = (x: number, y: number): Point => [X(x), Z(y)];

export type PxPoint = [number, number];

/** Zbiera rekwizyty i dane minimapy, budowane z pikseli planu. */
export class PlanBuilder {
  readonly props: PropDef[] = [];
  readonly map: MapData = { zones: [], walls: [], solids: [] };

  /** Dowolny prefab ustawiony w pikselach planu. */
  add<O>(prefab: Prefab<O>, x: number, y: number, opts: Omit<Placement, 'x' | 'z'> & O): this {
    this.props.push(prop<O>(prefab, { ...opts, x: X(x), z: Z(y) }));
    return this;
  }

  /** Strefa podłogi (wykładzina w kolorze z legendy planu). */
  zone(points: PxPoint[], o: { tint: number; map: string; label?: string; surface?: Surface; y?: number }): this {
    const pts = points.map(([x, y]) => pt(x, y));
    this.props.push(prop(floorPoly, { x: 0, z: 0, y: o.y ?? 0.004, points: pts, tint: o.tint, surface: o.surface }));
    this.map.zones.push({ points: pts, color: o.map, label: o.label });
    return this;
  }

  rectZone(x0: number, y0: number, x1: number, y1: number, o: Parameters<PlanBuilder['zone']>[1]): this {
    return this.zone(
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
      o,
    );
  }

  /** Pełna bryła (trzon, toalety). */
  solid(x0: number, y0: number, x1: number, y1: number, label?: string): this {
    this.props.push(prop(solidBlock, { x: X((x0 + x1) / 2), z: Z((y0 + y1) / 2), w: M(x1 - x0), d: M(y1 - y0), label }));
    this.map.solids.push([pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)]);
    return this;
  }

  /**
   * Ściana od a do b (piksele planu).
   * `doors` to współrzędne środków drzwi wzdłuż ściany (x dla poziomej, y dla pionowej).
   * Ściany ukośne są dzielone na krótkie odcinki, żeby kolizje (prostokąty) dobrze je przybliżały.
   */
  wall(a: PxPoint, b: PxPoint, o: { glass?: boolean; cut?: boolean; doors?: number[]; doorWidth?: number } = {}): this {
    const [ax, az] = pt(...a),
      [bx, bz] = pt(...b);
    const dx = bx - ax,
      dz = bz - az,
      len = Math.hypot(dx, dz);
    const cut = o.cut ?? true;
    const diagonal = Math.abs(dx) > 0.01 && Math.abs(dz) > 0.01;
    const width = o.doorWidth ?? 1.2;

    if (diagonal) {
      const n = Math.ceil(len / 1.2);
      for (let i = 0; i < n; i++) {
        const t0 = i / n,
          t1 = (i + 1) / n;
        this.piece(ax + dx * t0, az + dz * t0, ax + dx * t1, az + dz * t1, { glass: o.glass, cut });
      }
      this.map.walls.push([
        [ax, az],
        [bx, bz],
      ]);
      return this;
    }

    // drzwi: z pikseli wzdłuż osi na metry od początku ściany
    const along = Math.abs(dx) > Math.abs(dz) ? 0 : 1;
    const start = a[along],
      dir = Math.sign(b[along] - a[along]);
    const doors = (o.doors ?? []).map((p) => ({ at: M((p - start) * dir), width }));
    this.piece(ax, az, bx, bz, { glass: o.glass, cut, doors });

    // minimapa: ściana z przerwami na drzwi
    let from = 0;
    for (const d of [...doors].sort((p, q) => p.at - q.at)) {
      this.mapSeg(ax, az, dx, dz, len, from, d.at - d.width / 2);
      from = d.at + d.width / 2;
    }
    this.mapSeg(ax, az, dx, dz, len, from, len);
    return this;
  }

  private piece(ax: number, az: number, bx: number, bz: number, o: { glass?: boolean; cut: boolean; doors?: { at: number; width: number }[] }) {
    const dx = bx - ax,
      dz = bz - az;
    this.props.push(
      prop(wall, {
        x: (ax + bx) / 2,
        z: (az + bz) / 2,
        // obrót, który kieruje lokalną oś X prefabu wzdłuż odcinka a→b
        ry: Math.atan2(-dz, dx),
        length: Math.hypot(dx, dz) + 0.1,
        glass: o.glass,
        cut: o.cut,
        doors: o.doors?.map((d) => ({ at: d.at + 0.05, width: d.width })),
      }),
    );
  }

  private mapSeg(ax: number, az: number, dx: number, dz: number, len: number, t0: number, t1: number) {
    if (t1 - t0 < 0.05) return;
    this.map.walls.push([
      [ax + (dx * t0) / len, az + (dz * t0) / len],
      [ax + (dx * t1) / len, az + (dz * t1) / len],
    ]);
  }
}

/** Lewa, skośna ściana budynku: x na planie dla danego y. */
export const leftEdge = (y: number) => 163 + 0.4155 * (y - 197);

/** Pozycja świata i obrót dla punktu lokalnego (lx, lz) obiektu stojącego w (x, y) planu z obrotem ry. */
export function localToPlan(x: number, y: number, ry: number, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(ry),
    s = Math.sin(ry);
  return { x: X(x) + lx * c + lz * s, z: Z(y) - lx * s + lz * c };
}
