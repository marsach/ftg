/**
 * PODDASZE PREZESA — prolog przed biurem.
 *
 * Mały poziom bez planu piętra: współrzędne są wprost w metrach,
 * środek poddasza w (0, 0), kalenica wzdłuż osi X.
 * Chodzić można tam, gdzie dach jest wyżej niż głowa.
 */
import type { LevelDef } from '../../world/level';
import { prop } from '../../world/prefab';
import {
  atticShell,
  drywallStack,
  hatch,
  laptopCrate,
  roofWindow,
  shopVacuum,
  sleepingBag,
  stool,
  tallyBoard,
  timberStack,
  woolRolls,
  workLamp,
} from '../../prefabs/attic';

const LENGTH = 12;

export const poddasze: LevelDef = {
  name: 'Poddasze prezesa',
  bounds: { x0: -6.5, x1: 6.5, z0: -4.5, z1: 4.5 },
  outline: [
    [-5.6, -2.7],
    [5.6, -2.7],
    [5.6, 2.7],
    [-5.6, 2.7],
  ],
  background: 0x14110e,
  start: { x: -3.0, z: 0.4, ry: Math.PI / 2 },
  playerLook: { shirt: 0x9b3b32, pants: 0x3b4f6e, hair: 0x8e8a84 },
  props: [
    prop(atticShell, { x: 0, z: 0, length: LENGTH, done: 0.6 }),
    prop(hatch, { id: 'klapa', x: 3.8, z: 1.6 }),
    prop(laptopCrate, { id: 'laptop', x: -4.3, z: -2.0 }),
    prop(sleepingBag, { id: 'spiwor', x: -4.4, z: 1.2, ry: Math.PI / 2 }),
    prop(woolRolls, { id: 'welna', x: -1.2, z: -2.8 }),
    prop(timberStack, { id: 'belki', x: 2.6, z: -2.9, length: 3 }),
    prop(roofWindow, { id: 'okno', x: -2.6, z: -2.6 }),
    prop(tallyBoard, { id: 'kreski', x: -5.97, z: -0.6, ry: Math.PI / 2 }),
    prop(workLamp, { x: 0.6, z: 1.9, ry: -2.5 }),
    prop(drywallStack, { id: 'plyty', x: 4.9, z: -1.3, ry: Math.PI / 2 }),
    prop(shopVacuum, { id: 'odkurzacz', x: 5.0, z: 1.0, ry: -Math.PI / 2 }),
    prop(stool, { id: 'taboret', x: -1.4, z: 1.8, ry: 0.4 }),
  ],
  npcs: [],
  triggers: [],
  clock: { start: [18, 0], stopAt: [19, 15], secondsPerMinute: 4 },
  hud: { date: 'niedz., 25.10.2026', place: 'poddasze prezesa' },
};
