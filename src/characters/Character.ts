import type * as THREE from 'three';
import { createRig, type Look, type Rig } from './rig';

export type Pose = 'stand' | 'sit';
export type Activity = 'idle' | 'typing';

export interface CharacterOptions {
  x: number;
  z: number;
  ry: number;
  pose?: Pose;
  activity?: Activity;
}

/**
 * Postać (gracz albo NPC): pozycja, poza, animacje i trzymany przedmiot.
 * O tym, DOKĄD idzie, decydują systemy (np. PlayerController), nie postać.
 */
export class Character {
  readonly rig: Rig;
  pose: Pose;
  activity: Activity;
  /** ustawiane przez kontroler ruchu co klatkę */
  moving = false;

  private walkPhase = 0;
  private held: THREE.Object3D | null = null;
  private readonly home: Required<CharacterOptions>;

  constructor(
    readonly id: string,
    readonly look: Look,
    opts: CharacterOptions,
  ) {
    this.rig = createRig(look);
    this.home = { pose: 'stand', activity: 'idle', ...opts };
    this.pose = this.home.pose;
    this.activity = this.home.activity;
    this.place(opts.x, opts.z, opts.ry);
  }

  get root(): THREE.Group {
    return this.rig.root;
  }

  get position(): THREE.Vector3 {
    return this.rig.root.position;
  }

  get standing(): boolean {
    return this.pose === 'stand';
  }

  place(x: number, z: number, ry?: number): void {
    this.position.set(x, 0, z);
    if (ry !== undefined) this.root.rotation.y = ry;
  }

  face(x: number, z: number): void {
    this.root.rotation.y = Math.atan2(x - this.position.x, z - this.position.z);
  }

  hold(obj: THREE.Object3D | null): void {
    if (this.held) this.held.removeFromParent();
    this.held = obj;
    if (obj) this.rig.hand.add(obj);
  }

  get holding(): THREE.Object3D | null {
    return this.held;
  }

  /** Wraca na swoje miejsce startowe (nowa gra). */
  reset(): void {
    const h = this.home;
    this.place(h.x, h.z, h.ry);
    this.pose = h.pose;
    this.activity = h.activity;
    this.moving = false;
    this.hold(null);
  }

  update(dt: number, t: number): void {
    const { legs, arms, body } = this.rig;
    if (this.pose === 'sit') {
      body.position.y = -0.36;
      legs[0].rotation.x = legs[1].rotation.x = -Math.PI / 2;
      const typing = this.activity === 'typing' ? 0.05 : 0;
      arms[0].rotation.x = -0.8 + Math.sin(t * 14) * typing;
      arms[1].rotation.x = -0.8 + Math.sin(t * 11 + 1) * typing;
      return;
    }

    this.walkPhase = this.moving ? this.walkPhase + dt * 9 : this.walkPhase * 0.85;
    const swing = Math.sin(this.walkPhase) * 0.55 * (this.moving ? 1 : Math.min(1, Math.abs(this.walkPhase)));
    legs[0].rotation.x = swing;
    legs[1].rotation.x = -swing;
    if (this.look.laptop) {
      arms[0].rotation.x = arms[1].rotation.x = -0.9;
    } else {
      arms[0].rotation.x = -swing * 0.7;
      arms[1].rotation.x = this.held ? -0.9 : swing * 0.7;
    }
    body.position.y = this.moving
      ? Math.abs(Math.sin(this.walkPhase)) * 0.04
      : Math.sin(t * 1.6 + this.home.x) * 0.008;
  }
}
