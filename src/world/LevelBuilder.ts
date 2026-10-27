import * as THREE from 'three';
import type { Rect } from '../core/types';
import type { PlacedObject, Placement, Prefab, PrefabCtx } from './prefab';

type Animator = (dt: number, t: number) => void;

/**
 * Składa poziom z prefabów: ustawia grupy, zbiera kolizje (w układzie świata),
 * animacje i obiekty z identyfikatorem.
 */
export class LevelBuilder {
  readonly colliders: Rect[] = [];
  readonly objects = new Map<string, PlacedObject>();

  private readonly animators: Animator[] = [];
  private readonly initialStates: [Record<string, unknown>, Record<string, unknown>][] = [];
  private readonly corner = new THREE.Vector3();

  constructor(readonly root: THREE.Object3D) {}

  place<O>(prefab: Prefab<O>, at: Placement & O, parent: THREE.Object3D = this.root): PlacedObject {
    const group = new THREE.Group();
    group.name = at.id ?? prefab.name;
    group.position.set(at.x, at.y ?? 0, at.z);
    group.rotation.y = at.ry ?? 0;
    parent.add(group);
    group.updateWorldMatrix(true, false);

    const placed: PlacedObject = { id: at.id, prefab: prefab.name, group, parts: {}, state: {} };
    const ctx: PrefabCtx = {
      g: group,
      state: placed.state,
      block: (x, z, w, d) => this.colliders.push(this.toWorldRect(group, x, z, w, d)),
      place: (child, childAt) => this.place(child, childAt, group),
      animate: (fn) => this.animators.push(fn),
      part: (name, obj) => {
        placed.parts[name] = obj;
        obj.userData.keep = true;
      },
      keep: (obj) => (obj.userData.keep = true),
    };
    prefab.build(ctx, at);
    // obiekty z identyfikatorem są celem interakcji: zostają osobnymi meshami (raycast, zmiany)
    if (at.id) group.userData.keep = true;

    this.initialStates.push([placed.state, { ...placed.state }]);
    if (at.id) {
      if (this.objects.has(at.id)) console.warn(`[poziom] powtórzony identyfikator obiektu: ${at.id}`);
      this.objects.set(at.id, placed);
    }
    return placed;
  }

  /** Prostokątna przeszkoda podana wprost w układzie świata (np. stojąca postać). */
  block(x: number, z: number, w: number, d: number): void {
    this.colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  }

  update(dt: number, t: number): void {
    for (const fn of this.animators) fn(dt, t);
  }

  /** Przywraca stany obiektów z chwili budowy (nowa gra). */
  resetStates(): void {
    for (const [state, initial] of this.initialStates) {
      for (const k of Object.keys(state)) delete state[k];
      Object.assign(state, initial);
    }
  }

  /** Lokalny prostokąt → obwiednia AABB w świecie (działa dla dowolnego obrotu i zagnieżdżenia). */
  private toWorldRect(group: THREE.Group, x: number, z: number, w: number, d: number): Rect {
    const r: Rect = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      this.corner.set(x + (sx * w) / 2, 0, z + (sz * d) / 2);
      group.localToWorld(this.corner);
      r.x0 = Math.min(r.x0, this.corner.x);
      r.x1 = Math.max(r.x1, this.corner.x);
      r.z0 = Math.min(r.z0, this.corner.z);
      r.z1 = Math.max(r.z1, this.corner.z);
    }
    return r;
  }
}
