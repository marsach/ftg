import * as THREE from 'three';
import type { Character } from '../characters/Character';
import type { System } from '../core/types';
import type { IsoCamera } from '../render/IsoCamera';
import type { PromptView } from '../ui/PromptView';
import type { PlayerController } from './PlayerController';

export interface Interactable {
  id: string;
  label: string;
  /** punkt, do którego gracz podchodzi (żywa referencja: NPC może się przesunąć) */
  anchor: THREE.Vector3;
  /** wysokość podpowiedzi nad ziemią */
  promptY: number;
  /** z jakiej odległości można wejść w interakcję */
  radius: number;
  /** obiekty, w które można kliknąć */
  roots: THREE.Object3D[];
  use(): void;
}

/**
 * Najbliższy obiekt w zasięgu → podpowiedź nad nim („E · Porozmawiaj z…”).
 * Kliknięcie w obiekt: podejdź i użyj. E/spacja: użyj najbliższego.
 */
export class InteractionSystem implements System {
  private readonly items: Interactable[] = [];
  private readonly pickables: THREE.Object3D[] = [];
  private readonly ray = new THREE.Raycaster();
  private readonly screen = new THREE.Vector2();
  private readonly lift = new THREE.Vector3();
  private current: Interactable | null = null;

  constructor(
    private readonly player: Character,
    private readonly iso: IsoCamera,
    private readonly controller: PlayerController,
    private readonly prompt: PromptView,
    private readonly surface: HTMLElement,
    private readonly canAct: () => boolean,
  ) {}

  add(item: Interactable): void {
    this.items.push(item);
    for (const root of item.roots)
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.userData.interactable = item;
          this.pickables.push(o);
        }
      });
  }

  get(id: string): Interactable | undefined {
    return this.items.find((i) => i.id === id);
  }

  /** Zwraca true, jeśli kliknięto w obiekt (wtedy nie traktujemy tego jako kliknięcia w podłogę). */
  tap(ndc: THREE.Vector2): boolean {
    const item = this.pick(ndc);
    if (!item) return false;
    this.controller.goTo(item.anchor.x, item.anchor.z, () => this.activate(item), item.anchor, item.radius);
    return true;
  }

  hover(ndc: THREE.Vector2): void {
    this.surface.style.cursor = this.pick(ndc) ? 'pointer' : 'default';
  }

  action(): void {
    if (this.current) this.activate(this.current);
  }

  activate(item: Interactable): void {
    if (!this.canAct()) return;
    this.controller.stop();
    this.player.face(item.anchor.x, item.anchor.z);
    item.use();
  }

  update(): void {
    this.current = this.canAct() ? this.nearest() : null;
    const it = this.current;
    if (!it) return this.prompt.hide();
    this.lift.set(it.anchor.x, it.promptY, it.anchor.z);
    this.iso.toScreen(this.lift, this.surface.clientWidth, this.surface.clientHeight, this.screen);
    this.prompt.show(it.label, this.screen.x, this.screen.y);
  }

  private nearest(): Interactable | null {
    const p = this.player.position;
    let best: Interactable | null = null,
      bestD = Infinity;
    for (const it of this.items) {
      const d = Math.hypot(it.anchor.x - p.x, it.anchor.z - p.z);
      if (d < it.radius && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }

  private pick(ndc: THREE.Vector2): Interactable | null {
    this.ray.setFromCamera(ndc, this.iso.camera);
    const hit = this.ray.intersectObjects(this.pickables, false)[0];
    return (hit?.object.userData.interactable as Interactable | undefined) ?? null;
  }
}
