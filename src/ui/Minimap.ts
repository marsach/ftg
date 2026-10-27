import type * as THREE from 'three';
import type { Rect } from '../core/types';
import type { MapData, Point } from '../world/level';
import { h } from './dom';

/**
 * Minimapa rysowana z danych poziomu (strefy, ściany, bryły).
 * Tło rysujemy raz do bufora, a co klatkę dokładamy tylko gracza i znacznik celu.
 * Klawisz M albo kliknięcie przełącza widok mały / duży.
 */
export class Minimap {
  private readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  private base: HTMLCanvasElement | null = null;
  private big = false;
  private scale = 1;
  private pad = 8;
  waypoint: THREE.Vector3 | null = null;

  constructor(
    parent: HTMLElement,
    private readonly data: MapData,
    private readonly bounds: Rect,
    private readonly outline: Point[] | undefined,
  ) {
    this.canvas = h('canvas');
    this.g = this.canvas.getContext('2d')!;
    this.el = h('div', { class: 'minimap', attrs: { title: 'Mapa piętra (M)' } }, this.canvas);
    this.el.addEventListener('click', () => this.toggle());
    window.addEventListener('keydown', this.onKey);
    parent.append(this.el);
    this.layout();
    window.addEventListener('resize', this.onResize);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.onResize);
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key.toLowerCase() === 'm' && !(e.target instanceof HTMLInputElement)) this.toggle();
  };

  private readonly onResize = (): void => this.layout();

  toggle(): void {
    this.big = !this.big;
    this.el.classList.toggle('big', this.big);
    this.layout();
  }

  update(player: THREE.Vector3, heading: number, t: number): void {
    if (!this.base) return;
    const g = this.g;
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.drawImage(this.base, 0, 0);

    if (this.waypoint) {
      const [wx, wy] = this.toPx(this.waypoint.x, this.waypoint.z);
      const r = (5 + Math.sin(t * 5) * 1.5) * devicePixelRatio;
      g.strokeStyle = '#e8643c';
      g.lineWidth = 2 * devicePixelRatio;
      g.beginPath();
      g.arc(wx, wy, r, 0, Math.PI * 2);
      g.stroke();
    }

    const [px, py] = this.toPx(player.x, player.z);
    const s = (this.big ? 7 : 5) * devicePixelRatio;
    g.save();
    g.translate(px, py);
    g.rotate(-heading + Math.PI);
    g.fillStyle = '#e8643c';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.5 * devicePixelRatio;
    g.beginPath();
    g.moveTo(0, -s * 1.3);
    g.lineTo(s, s);
    g.lineTo(-s, s);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  private layout(): void {
    const w = this.big ? Math.min(window.innerWidth - 32, 760) : Math.min(260, window.innerWidth * 0.42);
    const ww = this.bounds.x1 - this.bounds.x0,
      hh = this.bounds.z1 - this.bounds.z0;
    const cssH = (w - this.pad * 2) * (hh / ww) + this.pad * 2;
    const dpr = devicePixelRatio || 1;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = ((w - this.pad * 2) / ww) * dpr;
    this.drawBase();
  }

  private toPx(x: number, z: number): [number, number] {
    const dpr = devicePixelRatio || 1;
    return [(x - this.bounds.x0) * this.scale + this.pad * dpr, (z - this.bounds.z0) * this.scale + this.pad * dpr];
  }

  private drawBase(): void {
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const g = c.getContext('2d')!;
    const dpr = devicePixelRatio || 1;
    const poly = (pts: Point[]) => {
      g.beginPath();
      pts.forEach(([x, z], i) => {
        const [px, py] = this.toPx(x, z);
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      });
      g.closePath();
    };

    if (this.outline) {
      poly(this.outline);
      g.fillStyle = '#e4e0d8';
      g.fill();
    }
    for (const zone of this.data.zones) {
      poly(zone.points);
      g.fillStyle = zone.color;
      g.fill();
    }
    g.fillStyle = '#8f8a80';
    for (const s of this.data.solids) {
      poly(s);
      g.fill();
    }
    g.strokeStyle = '#2a2f36';
    g.lineWidth = Math.max(1, 1.4 * dpr);
    g.lineCap = 'round';
    for (const [a, b] of this.data.walls) {
      const [ax, ay] = this.toPx(...a),
        [bx, by] = this.toPx(...b);
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
    }
    if (this.outline) {
      poly(this.outline);
      g.lineWidth = 2.2 * dpr;
      g.stroke();
    }
    if (this.big) {
      g.fillStyle = '#1f252c';
      g.font = `600 ${10 * dpr}px "IBM Plex Mono", monospace`;
      g.textAlign = 'center';
      for (const zone of this.data.zones) {
        if (!zone.label) continue;
        const cx = zone.points.reduce((s, p) => s + p[0], 0) / zone.points.length;
        const cz = zone.points.reduce((s, p) => s + p[1], 0) / zone.points.length;
        const [px, py] = this.toPx(cx, cz);
        g.fillText(zone.label, px, py);
      }
    }
    this.base = c;
  }
}
