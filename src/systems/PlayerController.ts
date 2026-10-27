import * as THREE from 'three';
import type { Character } from '../characters/Character';
import type { Input } from '../core/Input';
import type { System } from '../core/types';
import type { IsoCamera } from '../render/IsoCamera';
import type { NavGrid } from '../world/NavGrid';

interface Arrival {
  target: THREE.Vector3;
  within: number;
  fn: () => void;
}

/**
 * Ruch gracza: WASD (względem ekranu, ze ślizganiem po przeszkodach)
 * albo kliknięcie (ścieżka A*). Opcjonalnie wywołuje akcję po dojściu do celu.
 */
export class PlayerController implements System {
  speed = 3.6;

  private path: THREE.Vector2[] | null = null;
  private arrival: Arrival | null = null;
  private readonly marker: THREE.Mesh;
  private readonly axis = new THREE.Vector2();
  private readonly ray = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private t = 0;

  constructor(
    private readonly player: Character,
    private readonly nav: NavGrid,
    private readonly input: Input,
    private readonly iso: IsoCamera,
    scene: THREE.Scene,
    /** czy gracz może się teraz ruszać (np. nie w trakcie dialogu) */
    private readonly canMove: () => boolean,
  ) {
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.24, 24),
      new THREE.MeshBasicMaterial({ color: 0xe8643c, transparent: true }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.02;
    this.marker.visible = false;
    scene.add(this.marker);
  }

  /** Idź do punktu; opcjonalnie wywołaj `onArrive`, gdy gracz będzie bliżej niż `within`. */
  goTo(x: number, z: number, onArrive?: () => void, target?: THREE.Vector3, within = 1.75): boolean {
    const p = this.player.position;
    this.path = this.nav.findPath(p.x, p.z, x, z);
    this.arrival = onArrive ? { target: target ?? new THREE.Vector3(x, 0, z), within, fn: onArrive } : null;
    if (!this.path) return false;
    const end = this.path[this.path.length - 1] ?? new THREE.Vector2(p.x, p.z);
    this.marker.position.set(end.x, 0.02, end.y);
    this.marker.visible = true;
    return true;
  }

  /** Kliknięcie w podłogę. */
  tapGround(ndc: THREE.Vector2): void {
    this.ray.setFromCamera(ndc, this.iso.camera);
    const hit = new THREE.Vector3();
    if (this.ray.ray.intersectPlane(this.ground, hit)) this.goTo(hit.x, hit.z);
  }

  stop(): void {
    this.path = null;
    this.arrival = null;
    this.marker.visible = false;
    this.player.moving = false;
  }

  teleport(x: number, z: number, ry?: number): void {
    this.stop();
    this.player.place(x, z, ry);
  }

  reset(): void {
    this.stop();
  }

  update(dt: number): void {
    this.t += dt;
    this.player.moving = false;
    if (this.marker.visible) {
      const k = Math.sin(this.t * 6);
      (this.marker.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.4 * k;
      this.marker.scale.setScalar(1 + 0.15 * k);
    }
    if (!this.canMove()) return;

    const p = this.player.position;
    const step = this.speed * dt;
    const a = this.input.axis(this.axis);

    if (a.lengthSq() > 0) {
      this.stop();
      const up = this.iso.screenUp,
        right = this.iso.screenRight;
      const mx = right.x * a.x + up.x * a.y,
        mz = right.y * a.x + up.y * a.y;
      if (this.nav.isFree(p.x + mx * step, p.z)) p.x += mx * step;
      if (this.nav.isFree(p.x, p.z + mz * step)) p.z += mz * step;
      this.player.root.rotation.y = Math.atan2(mx, mz);
      this.player.moving = true;
      return;
    }

    if (!this.path) return;
    const wp = this.path[0];
    if (wp) {
      const dx = wp.x - p.x,
        dz = wp.y - p.z,
        d = Math.hypot(dx, dz);
      if (d <= step) {
        p.x = wp.x;
        p.z = wp.y;
        this.path.shift();
      } else {
        p.x += (dx / d) * step;
        p.z += (dz / d) * step;
        this.player.root.rotation.y = Math.atan2(dx, dz);
      }
      this.player.moving = true;
    }

    const arr = this.arrival;
    if (arr && Math.hypot(arr.target.x - p.x, arr.target.z - p.z) < arr.within) {
      this.stop();
      arr.fn();
      return;
    }
    if (!this.path.length) {
      // doszliśmy najbliżej, jak się da; trochę tolerancji dla obiektów za blatem
      this.stop();
      if (arr && Math.hypot(arr.target.x - p.x, arr.target.z - p.z) < arr.within + 0.6) arr.fn();
    }
  }
}
