import type * as THREE from 'three';

/**
 * PREFAB = funkcja, która buduje obiekt (biurko, roślinę, ścianę) w lokalnym układzie.
 *
 * Prefab nie musi wiedzieć, gdzie stoi ani jak jest obrócony: kolizje deklaruje
 * lokalnie przez `ctx.block(...)`, a budowniczy poziomu sam przelicza je na świat.
 * Dzięki temu ten sam prefab działa obrócony, zagnieżdżony w innym prefabie
 * (np. biurko w zestawie czterech biurek) i w dowolnym poziomie.
 */
export interface PrefabCtx {
  /** grupa, do której dokładasz meshe; jej pozycję i obrót ustawia budowniczy */
  readonly g: THREE.Group;
  /** stan obiektu zmieniany przez fabułę (np. ekspres.ready); resetowany przy nowej grze */
  readonly state: Record<string, unknown>;
  /** prostokąt kolizji w układzie lokalnym prefabu */
  block(x: number, z: number, w: number, d: number): void;
  /** wstaw inny prefab jako dziecko (współrzędne lokalne) */
  place<O>(prefab: Prefab<O>, at: Placement & O): PlacedObject;
  /** funkcja wywoływana co klatkę (miganie diod, pulsowanie itp.) */
  animate(fn: (dt: number, t: number) => void): void;
  /** nazwana część dostępna z fabuły: obj('ekspres').parts.led (nie jest scalana z resztą) */
  part(name: string, obj: THREE.Object3D): void;
  /** obiekt animowany lub zmieniany w trakcie gry: wyłącz go ze scalania geometrii */
  keep(obj: THREE.Object3D): void;
}

export interface Placement {
  x: number;
  z: number;
  y?: number;
  /** obrót wokół osi pionowej w radianach */
  ry?: number;
  /** identyfikator, po którym fabuła i interakcje znajdą obiekt */
  id?: string;
}

export interface Prefab<O = object> {
  readonly name: string;
  build(ctx: PrefabCtx, opts: O): void;
}

export interface PlacedObject {
  readonly id?: string;
  readonly prefab: string;
  readonly group: THREE.Group;
  readonly parts: Record<string, THREE.Object3D>;
  readonly state: Record<string, unknown>;
}

export function definePrefab<O = object>(name: string, build: (ctx: PrefabCtx, opts: O) => void): Prefab<O> {
  return { name, build };
}

/** Wpis w definicji poziomu. Twórz przez `prop(...)`, żeby opcje prefabu były sprawdzane przez TS. */
export interface PropDef {
  readonly prefab: Prefab<never>;
  readonly at: Placement;
}

export const prop = <O>(prefab: Prefab<O>, at: Placement & O): PropDef => ({
  prefab: prefab as unknown as Prefab<never>,
  at,
});
