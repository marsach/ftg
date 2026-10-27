import * as THREE from 'three';
import type { Rect } from '../core/types';

/**
 * Siatka nawigacji + A*.
 * Każda kratka jest wolna albo zajęta (przeszkody poszerzone o promień postaci),
 * a gotowa ścieżka jest „prostowana”, żeby postać nie szła zygzakiem po kratkach.
 */
export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly blocked: Uint8Array;

  constructor(
    readonly bounds: Rect,
    readonly cell = 0.2,
    readonly radius = 0.3,
  ) {
    this.cols = Math.round((bounds.x1 - bounds.x0) / cell);
    this.rows = Math.round((bounds.z1 - bounds.z0) / cell);
    this.blocked = new Uint8Array(this.cols * this.rows);
  }

  /**
   * @param obstacles prostokąty kolizji w świecie
   * @param area opcjonalny obrys budynku (wielokąt XZ); poza nim nie da się chodzić
   */
  build(obstacles: readonly Rect[], area?: readonly [number, number][]): void {
    const { radius: r } = this;
    this.blocked.fill(0);
    // krawędź siatki
    for (let j = 0; j < this.rows; j++)
      for (let i = 0; i < this.cols; i++) {
        if (i === 0 || j === 0 || i === this.cols - 1 || j === this.rows - 1) this.blocked[j * this.cols + i] = 1;
        else if (area && !pointInPolygon(this.cx(i), this.cz(j), area)) this.blocked[j * this.cols + i] = 1;
      }
    // przeszkody: zamiast sprawdzać każdą kratkę z każdą przeszkodą, zaznaczamy zakres kratek
    for (const o of obstacles) {
      const i0 = Math.max(0, Math.ceil((o.x0 - r - this.bounds.x0) / this.cell - 0.5));
      const i1 = Math.min(this.cols - 1, Math.floor((o.x1 + r - this.bounds.x0) / this.cell - 0.5));
      const j0 = Math.max(0, Math.ceil((o.z0 - r - this.bounds.z0) / this.cell - 0.5));
      const j1 = Math.min(this.rows - 1, Math.floor((o.z1 + r - this.bounds.z0) / this.cell - 0.5));
      for (let j = j0; j <= j1; j++) this.blocked.fill(1, j * this.cols + i0, j * this.cols + i1 + 1);
    }
    // margines od obrysu: kratka przy zablokowanej (poza obrysem) też jest zajęta
    if (area) {
      const reach = Math.ceil(r / this.cell);
      const out = this.blocked.slice();
      for (let j = 0; j < this.rows; j++)
        for (let i = 0; i < this.cols; i++) {
          if (out[j * this.cols + i]) continue;
          if (!pointInPolygon(this.cx(i), this.cz(j), area)) continue;
          for (let d = 1; d <= reach; d++) {
            if (
              !pointInPolygon(this.cx(i + d), this.cz(j), area) ||
              !pointInPolygon(this.cx(i - d), this.cz(j), area) ||
              !pointInPolygon(this.cx(i), this.cz(j + d), area) ||
              !pointInPolygon(this.cx(i), this.cz(j - d), area)
            ) {
              this.blocked[j * this.cols + i] = 1;
              break;
            }
          }
        }
    }
  }

  isFree(x: number, z: number): boolean {
    const i = this.ci(x),
      j = this.cj(z);
    return this.inside(i, j) && !this.blocked[j * this.cols + i];
  }

  /** Ścieżka od `from` do `to` jako lista punktów (bez punktu startowego) albo null. */
  findPath(fromX: number, fromZ: number, toX: number, toZ: number): THREE.Vector2[] | null {
    const s = this.nearestFree(this.ci(fromX), this.cj(fromZ));
    const t = this.nearestFree(this.ci(toX), this.cj(toZ));
    if (!s || !t) return null;

    const { cols } = this;
    const n = cols * this.rows;
    const g = new Float32Array(n).fill(Infinity);
    const from = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const si = s[1] * cols + s[0],
      ti = t[1] * cols + t[0];
    const h = (k: number) => {
      const dx = Math.abs((k % cols) - t[0]),
        dz = Math.abs(((k / cols) | 0) - t[1]);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    };

    const heap = new MinHeap();
    g[si] = 0;
    heap.push(si, h(si));
    while (heap.size) {
      const k = heap.pop();
      if (closed[k]) continue;
      closed[k] = 1;
      if (k === ti) break;
      const ki = k % cols,
        kj = (k / cols) | 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const a = ki + di,
            b = kj + dj;
          if (!this.inside(a, b)) continue;
          const nk = b * cols + a;
          if (this.blocked[nk] || closed[nk]) continue;
          // nie ścinaj rogów przeszkód po skosie
          if (di && dj && (this.blocked[kj * cols + a] || this.blocked[b * cols + ki])) continue;
          const ng = g[k] + (di && dj ? 1.414 : 1);
          if (ng < g[nk]) {
            g[nk] = ng;
            from[nk] = k;
            heap.push(nk, ng + h(nk));
          }
        }
    }
    if (si !== ti && from[ti] === -1) return null;

    const cells: number[] = [];
    for (let k = ti; k !== -1; k = from[k]) cells.push(k);
    cells.reverse();
    const pts = cells.map((k) => new THREE.Vector2(this.cx(k % cols), this.cz((k / cols) | 0)));
    return this.smooth(new THREE.Vector2(fromX, fromZ), pts);
  }

  /** Zostawia tylko punkty, między którymi nie da się przejść w linii prostej. */
  private smooth(start: THREE.Vector2, pts: THREE.Vector2[]): THREE.Vector2[] {
    const out: THREE.Vector2[] = [];
    let cur = start,
      i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.lineOfSight(cur, pts[j])) j--;
      out.push(pts[j]);
      cur = pts[j];
      i = j + 1;
    }
    return out;
  }

  private lineOfSight(a: THREE.Vector2, b: THREE.Vector2): boolean {
    const steps = Math.ceil(a.distanceTo(b) / (this.cell * 0.4));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      if (!this.isFree(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  }

  private nearestFree(i: number, j: number): [number, number] | null {
    if (this.inside(i, j) && !this.blocked[j * this.cols + i]) return [i, j];
    for (let r = 1; r < 40; r++)
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const a = i + di,
            b = j + dj;
          if (this.inside(a, b) && !this.blocked[b * this.cols + a]) return [a, b];
        }
    return null;
  }

  private inside = (i: number, j: number) => i >= 0 && j >= 0 && i < this.cols && j < this.rows;
  private cx = (i: number) => this.bounds.x0 + (i + 0.5) * this.cell;
  private cz = (j: number) => this.bounds.z0 + (j + 0.5) * this.cell;
  private ci = (x: number) => Math.floor((x - this.bounds.x0) / this.cell);
  private cj = (z: number) => Math.floor((z - this.bounds.z0) / this.cell);
}

export function pointInPolygon(x: number, z: number, poly: readonly [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i],
      [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Minimalny kopiec binarny (indeks kratki, priorytet). */
class MinHeap {
  private keys: number[] = [];
  private prio: number[] = [];

  get size() {
    return this.keys.length;
  }

  push(k: number, p: number): void {
    const { keys, prio } = this;
    keys.push(k);
    prio.push(p);
    let i = keys.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (prio[parent] <= prio[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const { keys, prio } = this;
    const top = keys[0];
    const lk = keys.pop()!,
      lp = prio.pop()!;
    if (keys.length) {
      keys[0] = lk;
      prio[0] = lp;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1,
          r = l + 1;
        let m = i;
        if (l < keys.length && prio[l] < prio[m]) m = l;
        if (r < keys.length && prio[r] < prio[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    [this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]];
  }
}
