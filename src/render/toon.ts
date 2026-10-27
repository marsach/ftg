import * as THREE from 'three';
import { cutaway } from './Cutaway';

/**
 * Trzystopniowa rampa światła (cień / półcień / światło).
 * Zmień te trzy odcienie, a zmieni się „ilustracyjny” charakter całej gry.
 */
export const gradientMap = (() => {
  const t = new THREE.DataTexture(
    new Uint8Array([108, 110, 120, 255, 192, 190, 188, 255, 255, 255, 255, 255]),
    3,
    1,
    THREE.RGBAFormat,
  );
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

export interface ToonOptions {
  color: number;
  map?: THREE.Texture | null;
  emissive?: number;
  /** czy materiał ma być prześwietlany wokół gracza (ściany, filary) */
  cut?: boolean;
}

export function toon(o: ToonOptions): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({
    color: o.color,
    gradientMap,
    map: o.map ?? null,
    emissive: o.emissive ?? 0x000000,
  });
  if (o.cut) cutaway.patch(m);
  return m;
}

const cache = new Map<string, THREE.MeshToonMaterial>();

/** Współdzielony materiał toon dla danego koloru (mniej programów i draw state). */
export function mat(color: number, opts: { cut?: boolean; emissive?: number } = {}): THREE.MeshToonMaterial {
  const key = `${color}|${opts.cut ? 1 : 0}|${opts.emissive ?? 0}`;
  let m = cache.get(key);
  if (!m) cache.set(key, (m = toon({ color, ...opts })));
  return m;
}

/** Świecący element: diody, wyświetlacze. */
export const glow = (color: number) => mat(color, { emissive: color });

/** Materiał bez oświetlenia: ekrany, tabliczki. */
export const unlit = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map });
