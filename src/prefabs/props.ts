import * as THREE from 'three';
import { glow, mat } from '../render/toon';
import { box, cyl } from '../world/geom';
import { definePrefab } from '../world/prefab';
import { P } from './palette';

/** Roślina w donicy; `tag` dodaje białą tabliczkę w doniczce (fikus Zbigniew). */
export const plant = definePrefab<{ scale?: number; tag?: boolean }>('plant', (c, o) => {
  const s = o.scale ?? 1;
  cyl(c.g, 0.22 * s, 0.17 * s, 0.42 * s, mat(P.pot), 0, 0.21 * s, 0);
  cyl(c.g, 0.03, 0.03, 0.6 * s, mat(0x6b5a45), 0, 0.65 * s, 0, 6);
  const leaf = new THREE.IcosahedronGeometry(0.26 * s, 0);
  const spots: [number, number, number, number][] = [
    [0, 1.05, 0, 1],
    [0.16, 0.88, 0.08, 0.8],
    [-0.15, 0.9, -0.06, 0.85],
    [0.05, 1.25, -0.05, 0.7],
    [-0.08, 1.18, 0.12, 0.7],
  ];
  spots.forEach(([x, y, z, k], i) => {
    const m = new THREE.Mesh(leaf, mat(i % 2 ? P.leafA : P.leafB));
    m.position.set(x * s, y * s, z * s);
    m.scale.setScalar(k);
    m.rotation.set(i, i * 2, 0);
    m.castShadow = true;
    c.g.add(m);
  });
  if (o.tag) box(c.g, 0.14, 0.08, 0.01, mat(P.paper), 0, 0.36 * s, 0.2 * s, { cast: false });
  c.block(0, 0, 0.5 * s, 0.5 * s);
});

export const printer = definePrefab('printer', (c) => {
  box(c.g, 0.8, 0.8, 0.6, mat(0xd9dbdd), 0, 0.4, 0);
  box(c.g, 0.7, 0.18, 0.5, mat(0xbfc3c7), 0, 0.89, 0);
  box(c.g, 0.5, 0.02, 0.32, mat(0xffffff), 0, 0.99, 0.04);
  box(c.g, 0.1, 0.05, 0.01, glow(P.accent), 0.25, 0.7, 0.305, { cast: false });
  c.block(0, 0, 0.85, 0.65);
});

export const waterCooler = definePrefab('waterCooler', (c) => {
  box(c.g, 0.38, 1.0, 0.38, mat(0xf1f0ec), 0, 0.5, 0);
  cyl(c.g, 0.16, 0.16, 0.42, mat(0x9cc8de, { emissive: 0x2d4f60 }), 0, 1.21, 0);
  c.block(0, 0, 0.4, 0.4);
});

/**
 * Ekspres do kawy (stawiaj na blacie: y = 0.95).
 * Stan: `ready` (false = miga na pomarańczowo, true = świeci na zielono).
 */
export const coffeeMachine = definePrefab('coffeeMachine', (c) => {
  c.state.ready = false;
  box(c.g, 0.42, 0.5, 0.4, mat(0x2a2e33), 0, 0.25, 0);
  box(c.g, 0.3, 0.06, 0.2, mat(0x4a4f56), 0, 0.05, 0.12);
  box(c.g, 0.09, 0.09, 0.005, mat(0xffffff), -0.1, 0.33, 0.205, { cast: false });
  const led = box(c.g, 0.12, 0.06, 0.02, glow(P.accent), 0.08, 0.38, 0.205, { cast: false });
  c.part('led', led);
  c.animate((_dt, t) => {
    const ready = c.state.ready === true;
    led.material = glow(ready ? P.ok : P.accent);
    led.visible = ready || Math.sin(t * 5) > 0;
  });
});

export const serverRack = definePrefab('serverRack', (c) => {
  box(c.g, 0.7, 1.9, 0.7, mat(0x24282d), 0, 0.95, 0);
  const leds: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) leds.push(box(c.g, 0.05, 0.03, 0.01, glow(P.ok), 0.25 - (i % 2) * 0.1, 0.4 + i * 0.13, 0.355, { cast: false }));
  leds.forEach((l) => c.keep(l));
  c.animate((_dt, t) => leds.forEach((l, i) => (l.visible = Math.sin(t * (3 + i * 0.7) + i) > -0.3)));
  c.block(0, 0, 0.75, 0.75);
});

/** Fotel w strefie kooperacji. */
export const armchair = definePrefab<{ color?: number }>('armchair', (c, o) => {
  const col = o.color ?? 0xece9e2;
  box(c.g, 0.8, 0.4, 0.75, mat(col), 0, 0.22, 0);
  box(c.g, 0.8, 0.45, 0.18, mat(col), 0, 0.6, -0.3);
  c.block(0, 0, 0.8, 0.8);
});

/** Kubek do trzymania w dłoni (nie prefab: zwykły mesh). */
export function mugMesh(color = P.paper): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 10), mat(color));
  m.castShadow = true;
  return m;
}
