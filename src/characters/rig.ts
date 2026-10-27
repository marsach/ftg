import * as THREE from 'three';
import { mat } from '../render/toon';
import { box, sphere } from '../world/geom';

/** Wygląd postaci: kolory i dodatki. */
export interface Look {
  shirt: number;
  pants?: number;
  skin?: number;
  hair?: number;
  tie?: number;
  headphones?: boolean;
  /** trzyma otwarty laptop (obie ręce do przodu) */
  laptop?: boolean;
}

/** Szkielet postaci złożony z brył. Postać patrzy w stronę +Z. */
export interface Rig {
  root: THREE.Group;
  body: THREE.Group;
  legs: [THREE.Group, THREE.Group];
  arms: [THREE.Group, THREE.Group];
  /** punkt w prawej dłoni, do którego przyczepiamy trzymane przedmioty */
  hand: THREE.Object3D;
}

export function createRig(look: Look): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skin = look.skin ?? 0xe2b99a,
    pants = look.pants ?? 0x2d3440,
    hair = look.hair ?? 0x3a2c22;
  const m = (c: number) => mat(c);

  const legs = [-0.11, 0.11].map((x) => {
    const g = new THREE.Group();
    g.position.set(x, 0.82, 0);
    box(g, 0.17, 0.78, 0.19, m(pants), 0, -0.39, 0);
    box(g, 0.18, 0.06, 0.28, m(0x1c1f24), 0, -0.79, 0.04);
    body.add(g);
    return g;
  }) as [THREE.Group, THREE.Group];

  box(body, 0.46, 0.62, 0.26, m(look.shirt), 0, 1.12, 0);
  if (look.tie) box(body, 0.06, 0.32, 0.02, m(look.tie), 0, 1.2, 0.135);
  box(body, 0.05, 0.07, 0.01, m(0xf4f3ef), 0.1, 1.02, 0.132); // identyfikator na smyczy

  const arms = [-0.29, 0.29].map((x) => {
    const g = new THREE.Group();
    g.position.set(x, 1.4, 0);
    box(g, 0.12, 0.58, 0.14, m(look.shirt), 0, -0.28, 0);
    box(g, 0.1, 0.1, 0.1, m(skin), 0, -0.6, 0);
    body.add(g);
    return g;
  }) as [THREE.Group, THREE.Group];

  const hand = new THREE.Object3D();
  hand.position.set(0, -0.66, 0.08);
  arms[1].add(hand);

  box(body, 0.1, 0.08, 0.1, m(skin), 0, 1.47, 0);
  sphere(body, 0.16, m(skin), 0, 1.62, 0);
  box(body, 0.3, 0.1, 0.3, m(hair), 0, 1.74, -0.02);
  box(body, 0.3, 0.18, 0.08, m(hair), 0, 1.64, -0.13);
  box(body, 0.03, 0.03, 0.01, m(0x1f252c), -0.055, 1.63, 0.155);
  box(body, 0.03, 0.03, 0.01, m(0x1f252c), 0.055, 1.63, 0.155);

  if (look.headphones) {
    box(body, 0.36, 0.04, 0.06, m(0x22262b), 0, 1.79, 0);
    box(body, 0.06, 0.12, 0.1, m(0x22262b), -0.17, 1.63, 0);
    box(body, 0.06, 0.12, 0.1, m(0x22262b), 0.17, 1.63, 0);
  }
  if (look.laptop) {
    box(body, 0.4, 0.02, 0.28, m(0x9aa2aa), 0, 1.08, 0.32);
    box(body, 0.4, 0.26, 0.02, m(0x9aa2aa), 0, 1.2, 0.46).rotation.x = -0.3;
  }
  return { root, body, legs, arms, hand };
}
