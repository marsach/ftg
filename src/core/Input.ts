import * as THREE from 'three';

/**
 * Wejście zamienione na intencje. Input nie wie nic o grze:
 * Game podpina handlery i decyduje, kto dostaje dane zdarzenie
 * (dialog, interakcje albo ruch).
 */
export interface InputHandlers {
  /** krótkie kliknięcie / tapnięcie, współrzędne NDC (-1..1) */
  tap?(ndc: THREE.Vector2): void;
  /** ruch myszy (tylko mysz), np. do kursora nad obiektami */
  hover?(ndc: THREE.Vector2): void;
  /** E / spacja / Enter */
  action?(): void;
  /** klawisze 1–9 */
  choice?(index: number): void;
  /** kółko myszy: >1 oddal, <1 przybliż */
  zoom?(factor: number): void;
}

const KEYS = {
  up: ['w', 'arrowup'],
  down: ['s', 'arrowdown'],
  left: ['a', 'arrowleft'],
  right: ['d', 'arrowright'],
} as const;

const TAP_SLOP_PX = 8;

export class Input {
  enabled = false;
  handlers: InputHandlers = {};
  readonly isTouch = matchMedia('(pointer: coarse)').matches;

  private readonly keys = new Set<string>();
  private downAt: [number, number] | null = null;
  private readonly ndc = new THREE.Vector2();

  constructor(private readonly surface: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearKeys);
    surface.addEventListener('pointerdown', this.onPointerDown);
    surface.addEventListener('pointerup', this.onPointerUp);
    surface.addEventListener('pointermove', this.onPointerMove);
    surface.addEventListener('wheel', this.onWheel, { passive: false });
  }

  /** Oś ruchu w przestrzeni ekranu: x w prawo, y w górę, długość ≤ 1. */
  axis(out = new THREE.Vector2()): THREE.Vector2 {
    const has = (list: readonly string[]) => list.some((k) => this.keys.has(k));
    out.set((has(KEYS.right) ? 1 : 0) - (has(KEYS.left) ? 1 : 0), (has(KEYS.up) ? 1 : 0) - (has(KEYS.down) ? 1 : 0));
    if (out.lengthSq() > 1) out.normalize();
    return out;
  }

  readonly clearKeys = (): void => this.keys.clear();

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearKeys);
    this.surface.removeEventListener('pointerdown', this.onPointerDown);
    this.surface.removeEventListener('pointerup', this.onPointerUp);
    this.surface.removeEventListener('pointermove', this.onPointerMove);
    this.surface.removeEventListener('wheel', this.onWheel);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    // przyciski w UI (np. opcje dialogu) obsługują spację/Enter same
    if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    if (/^[1-9]$/.test(k)) return this.handlers.choice?.(Number(k) - 1);
    if (k === 'e' || k === ' ' || k === 'enter') {
      e.preventDefault();
      if (!e.repeat) this.handlers.action?.();
      return;
    }
    this.keys.add(k);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.downAt = [e.clientX, e.clientY];
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (!this.enabled || !this.downAt) return;
    const moved = Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1]);
    this.downAt = null;
    if (moved <= TAP_SLOP_PX) this.handlers.tap?.(this.toNdc(e));
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (this.enabled && e.pointerType === 'mouse') this.handlers.hover?.(this.toNdc(e));
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.enabled) this.handlers.zoom?.(e.deltaY > 0 ? 1.1 : 0.9);
  };

  private toNdc(e: { clientX: number; clientY: number }): THREE.Vector2 {
    const r = this.surface.getBoundingClientRect();
    return this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
}
