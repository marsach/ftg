import * as THREE from 'three';
import { glow, mat, unlit } from '../render/toon';
import { signTexture } from '../render/textures';
import { box, cyl, plane } from '../world/geom';
import { definePrefab } from '../world/prefab';
import { P } from './palette';

/**
 * Poddasze: dach dwuspadowy z kalenicą wzdłuż osi X i rekwizyty remontu.
 *
 * Kamera patrzy od strony +X/+Z, więc bliższa połać (+Z) i szczyt (+X)
 * to sam szkielet krokwi (jak ściany bez sufitu w biurze), a dalsza połać
 * jest „w trakcie ocieplania”: deskowanie, folia i wełna między krokwiami.
 */
export const ROOF = { halfWidth: 4, knee: 0.9, ridge: 3.4 } as const;

const WOOD = 0xc29a6b,
  WOOD_DARK = 0x8a6a48,
  WOOL = 0xe9c75a,
  FOIL = 0x6d8fa3;

const rise = ROOF.ridge - ROOF.knee;
const slopeLen = Math.hypot(ROOF.halfWidth, rise);
const slopeAngle = Math.atan2(rise, ROOF.halfWidth);

/**
 * Płyta leżąca na połaci: `side` -1 = dalsza (z < 0), +1 = bliższa,
 * t0..t1 to zakres od ścianki kolankowej (0) do kalenicy (1),
 * `inset` przesuwa płytę w stronę wnętrza (prostopadle do połaci).
 */
function onSlope(
  g: THREE.Object3D,
  side: 1 | -1,
  x: number,
  w: number,
  thick: number,
  t0: number,
  t1: number,
  inset: number,
  material: THREE.Material,
): THREE.Mesh {
  const t = (t0 + t1) / 2;
  const y = ROOF.knee + rise * t - Math.cos(slopeAngle) * inset;
  const z = side * ROOF.halfWidth * (1 - t) - side * Math.sin(slopeAngle) * inset;
  const m = box(g, w, thick, slopeLen * (t1 - t0), material, x, y, z, { cast: side === -1 });
  m.rotation.x = side * slopeAngle;
  return m;
}

/** Konstrukcja dachu, podłoga z desek, ścianki kolankowe i szczyty. */
export const atticShell = definePrefab<{ length: number; done?: number }>('atticShell', (c, o) => {
  const L = o.length,
    W = ROOF.halfWidth;
  const wood = mat(WOOD),
    woodCut = mat(WOOD, { cut: true });

  // podłoga z desek, co któraś ciemniejsza
  for (let z = -W, i = 0; z < W - 0.01; z += 0.25, i++)
    box(c.g, L, 0.04, 0.24, mat(i % 3 ? 0xb9926a : 0xa98460), 0, -0.02, z + 0.125, { cast: false });

  // ścianki kolankowe
  box(c.g, L, ROOF.knee, 0.12, mat(P.wall), 0, ROOF.knee / 2, -W);
  box(c.g, L, ROOF.knee, 0.12, mat(P.wall, { cut: true }), 0, ROOF.knee / 2, W);

  // krokwie co 0.9 m; dalsza połać: deskowanie i folia, między krokwiami wełna
  const rafters: number[] = [];
  for (let x = -L / 2 + 0.05; x <= L / 2; x += 0.9) rafters.push(x);
  const done = o.done ?? 0.6;
  rafters.forEach((x, i) => {
    onSlope(c.g, -1, x, 0.08, 0.18, 0, 1, 0.09, wood);
    onSlope(c.g, 1, x, 0.08, 0.18, 0, 1, 0.09, woodCut);
    // jętka
    box(c.g, 0.07, 0.16, 2.4, woodCut, x, 2.75, 0);
    const next = rafters[i + 1];
    if (next === undefined) return;
    const mid = (x + next) / 2,
      gap = next - x - 0.08;
    // wełna kładziona od zachodu; ostatni pas zaczęty do połowy
    const filled = (i + 1) / (rafters.length - 1);
    if (filled <= done) onSlope(c.g, -1, mid, gap, 0.16, 0, 1, 0.1, mat(WOOL));
    else if (filled - done < 0.1) onSlope(c.g, -1, mid, gap, 0.16, 0, 0.45, 0.1, mat(WOOL));
  });
  // folia jako płaszczyzna zwrócona do wnętrza: kamera patrzy na tę połać z zewnątrz,
  // więc jednostronna płaszczyzna znika i widać wełnę między krokwiami
  const foil = plane(c.g, L, slopeLen, mat(FOIL), 0, ROOF.knee + rise / 2, -W / 2);
  foil.rotation.set(Math.PI / 2 - slopeAngle, 0, 0);
  foil.receiveShadow = true;

  // kalenica
  box(c.g, L, 0.2, 0.12, woodCut, 0, ROOF.ridge - 0.1, 0);

  // zachodni szczyt: pełna ściana (daleko od kamery)
  const shape = new THREE.Shape([
    new THREE.Vector2(-W, 0),
    new THREE.Vector2(W, 0),
    new THREE.Vector2(W, ROOF.knee),
    new THREE.Vector2(0, ROOF.ridge),
    new THREE.Vector2(-W, ROOF.knee),
  ]);
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false }), mat(P.wall));
  gable.rotation.y = Math.PI / 2;
  gable.position.set(-L / 2 - 0.15, 0, 0);
  gable.castShadow = gable.receiveShadow = true;
  c.g.add(gable);
  // małe okienko w szczycie
  box(c.g, 0.04, 0.5, 0.7, mat(P.glass, { emissive: P.glassGlow }), -L / 2 + 0.01, 2.2, 0, { cast: false });

  // wschodni szczyt: sam szkielet słupków
  for (const z of [-3, -1.5, 0, 1.5, 3]) {
    const h = ROOF.knee + rise * (1 - Math.abs(z) / W);
    box(c.g, 0.1, h, 0.1, woodCut, L / 2, h / 2, z);
  }
  box(c.g, 0.12, 0.1, 2 * W, woodCut, L / 2, 0.05, 0);
});

/**
 * Klapa strychowa w podłodze. Stan: `open` (opada w dół), `wool` (na dole leży wełna).
 * Zamknięta jest przybita listwą.
 */
export const hatch = definePrefab('hatch', (c) => {
  c.state.open = false;
  c.state.wool = false;
  const w = 0.75,
    d = 1.2;
  const hole = box(c.g, w, 0.01, d, mat(0x15120f), 0, 0.005, 0, { cast: false });
  const pile = new THREE.Group();
  for (const [x, z, r] of [
    [-0.15, -0.25, 0.22],
    [0.12, 0.1, 0.25],
    [-0.08, 0.35, 0.2],
  ])
    cyl(pile, r, r, 0.02, mat(0x9c8540), x, 0.012, z, 10, { cast: false });
  c.g.add(pile);
  // obramowanie
  for (const s of [-1, 1]) {
    box(c.g, 0.06, 0.05, d + 0.12, mat(WOOD_DARK), (s * (w + 0.06)) / 2, 0.025, 0);
    box(c.g, w, 0.05, 0.06, mat(WOOD_DARK), 0, 0.025, (s * (d + 0.06)) / 2);
  }
  // pokrywa na zawiasie przy krawędzi -Z
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.02, -d / 2);
  box(hinge, w - 0.02, 0.04, d - 0.02, mat(0xd8c3a0), 0, 0, d / 2);
  box(hinge, 0.12, 0.02, 0.04, mat(P.steel), 0, 0.03, d - 0.12);
  const batten = box(hinge, 0.09, 0.03, d + 0.3, mat(0xa0543a), 0.15, 0.04, d / 2);
  batten.rotation.y = 0.5;
  c.g.add(hinge);
  c.part('lid', hinge);

  let angle = 0;
  c.animate((dt) => {
    const open = c.state.open === true;
    angle += ((open ? 1.45 : 0) - angle) * Math.min(1, dt * 4);
    hinge.rotation.x = angle;
    batten.visible = !open;
    hole.visible = angle > 0.02;
    pile.visible = c.state.wool === true;
  });
  c.block(0, 0, w + 0.15, d + 0.15);
});

/** Ekran laptopa: poczta i komunikator. */
const laptopScreen = () =>
  signTexture(
    [
      { text: '2 nowe', font: '600 22px sans-serif', y: 34 },
      { text: 'Poczta · Ania', font: '500 16px monospace', y: 66 },
      { text: 'WhatsApp · grupa', font: '500 16px monospace', y: 92 },
    ],
    '#dfe8ef',
    '#1f252c',
    256,
    120,
  );

/** Laptop na odwróconej skrzynce. Stan: `taken` (laptop spakowany, została skrzynka). */
export const laptopCrate = definePrefab('laptopCrate', (c) => {
  c.state.taken = false;
  box(c.g, 0.7, 0.45, 0.5, mat(WOOD), 0, 0.225, 0);
  for (const y of [0.12, 0.33]) box(c.g, 0.72, 0.03, 0.52, mat(WOOD_DARK), 0, y, 0, { cast: false });
  const laptop = new THREE.Group();
  laptop.position.set(0, 0.45, 0);
  box(laptop, 0.36, 0.02, 0.25, mat(0x9aa2aa), 0, 0.01, 0.02);
  const lid = new THREE.Group();
  lid.position.set(0, 0.02, -0.1);
  lid.rotation.x = -0.25;
  box(lid, 0.36, 0.24, 0.015, mat(0x9aa2aa), 0, 0.12, 0);
  plane(lid, 0.33, 0.2, unlit(laptopScreen()), 0, 0.12, 0.009);
  laptop.add(lid);
  const led = box(laptop, 0.02, 0.01, 0.01, glow(P.ok), 0.15, 0.015, 0.145, { cast: false });
  c.g.add(laptop);
  // kubek po wczorajszej kawie
  cyl(c.g, 0.045, 0.04, 0.1, mat(P.paper), 0.27, 0.5, 0.15, 10);
  c.animate((_dt, t) => {
    laptop.visible = c.state.taken !== true;
    led.visible = Math.sin(t * 3) > 0;
  });
  c.block(0, 0, 0.75, 0.55);
});

/** Stos belek wzdłuż lokalnej osi X. */
export const timberStack = definePrefab<{ length?: number }>('timberStack', (c, o) => {
  const L = o.length ?? 3;
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 4 - row; i++)
      box(c.g, L - row * 0.15, 0.1, 0.16, mat(row % 2 ? WOOD : 0xb58d5f), row * 0.05, 0.05 + row * 0.1, -0.27 + i * 0.18 + row * 0.09);
  box(c.g, 0.06, 0.1, 0.8, mat(WOOD_DARK), -L / 2 + 0.3, 0.05, 0, { cast: false });
  c.block(0, 0, L, 0.8);
});

/** Paczki wełny mineralnej w folii, piramida sześciu rolek i jedna rozpakowana. */
export const woolRolls = definePrefab('woolRolls', (c) => {
  for (const [x, z] of [
    [-0.4, -0.15],
    [0.25, -0.15],
    [-0.1, 0.25],
  ]) {
    box(c.g, 0.6, 0.45, 0.42, mat(0xd9dee2), x, 0.225, z);
    box(c.g, 0.6, 0.12, 0.43, mat(P.accent), x, 0.3, z, { cast: false });
  }
  box(c.g, 0.6, 0.45, 0.42, mat(0xd9dee2), -0.1, 0.675, -0.15);
  // sześć rolek w folii, piramida 3-2-1, osie w stronę połaci
  const r = 0.2;
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 3 - row; i++) {
      const x = 0.85 + (i + row / 2) * 2 * r,
        y = r + row * r * Math.sqrt(3);
      cyl(c.g, r, r, 0.95, mat(0xd9dee2), x, y, -0.05, 14).rotation.x = Math.PI / 2;
      cyl(c.g, r + 0.005, r + 0.005, 0.2, mat(P.accent), x, y, -0.05, 14, { cast: false }).rotation.x = Math.PI / 2;
    }
  // rozpakowana: rolka i odwinięty kawałek na podłodze
  cyl(c.g, 0.17, 0.17, 0.6, mat(WOOL), 0.45, 0.17, 0.42, 12).rotation.z = Math.PI / 2;
  box(c.g, 0.6, 0.06, 0.45, mat(WOOL), 0.45, 0.03, 0.75, { cast: false });
  c.block(0.6, 0.05, 2.6, 1.0);
});

/** Sterta płyt GK na przekładkach, na wierzchu profile i paczka worków do odkurzacza. Długość wzdłuż lokalnej osi X. */
export const drywallStack = definePrefab('drywallStack', (c) => {
  for (const x of [-1.05, 0, 1.05]) box(c.g, 0.08, 0.08, 1.2, mat(WOOD_DARK), x, 0.04, 0);
  // płyty paczkami po kilka, każda paczka trochę krzywo; dwie zielone (do łazienki) na wierzchu
  const n = 8;
  for (let i = 0; i < n; i++) {
    const color = i >= n - 2 ? 0x9fc3a4 : i % 2 ? 0xdedcd4 : 0xd2d0c7;
    box(c.g, 2.6, 0.025, 1.2, mat(color), Math.sin(i * 2.3) * 0.04, 0.0925 + i * 0.025, Math.cos(i * 1.7) * 0.03);
  }
  const top = 0.08 + n * 0.025;
  for (const z of [-0.35, -0.27, -0.19]) box(c.g, 2.4, 0.05, 0.05, mat(P.steel), 0.05, top + 0.025, z);
  box(c.g, 0.3, 0.07, 0.22, mat(0xf2ead8), 0.75, top + 0.035, 0.25);
  box(c.g, 0.31, 0.02, 0.06, mat(P.accent), 0.75, top + 0.06, 0.25, { cast: false });
  c.block(0, 0, 2.7, 1.3);
});

/** Odkurzacz budowlany: zbiornik na kółkach, wąż łukiem do ssawki, zwinięty kabel. */
export const shopVacuum = definePrefab('shopVacuum', (c) => {
  cyl(c.g, 0.22, 0.2, 0.45, mat(0x5d646c), 0, 0.3, 0, 16);
  cyl(c.g, 0.23, 0.23, 0.14, mat(P.note), 0, 0.59, 0, 16);
  box(c.g, 0.22, 0.05, 0.05, mat(P.dark), 0, 0.69, 0);
  for (const [x, z] of [
    [-0.15, -0.15],
    [0.15, -0.15],
    [-0.15, 0.15],
    [0.15, 0.15],
  ])
    cyl(c.g, 0.04, 0.04, 0.03, mat(P.dark), x, 0.04, z, 8).rotation.z = Math.PI / 2;
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 16, Math.PI), mat(P.dark));
  hose.position.set(0.45, 0.2, 0);
  hose.castShadow = true;
  c.g.add(hose);
  box(c.g, 0.05, 0.2, 0.05, mat(P.dark), 0.75, 0.1, 0);
  box(c.g, 0.1, 0.03, 0.28, mat(P.dark), 0.75, 0.015, 0);
  const cable = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 4, 16), mat(0xe8643c));
  cable.rotation.x = Math.PI / 2;
  cable.position.set(-0.2, 0.012, 0.32);
  c.g.add(cable);
  c.block(0.25, 0, 1.0, 0.55);
});

/** Taboret budowlany w kropkach farby (też do niesienia w dłoni i pod oknem). */
export function stoolMesh(): THREE.Group {
  const g = new THREE.Group();
  box(g, 0.34, 0.04, 0.34, mat(WOOD), 0, 0.45, 0);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const leg = box(g, 0.04, 0.45, 0.04, mat(WOOD_DARK), sx * 0.13, 0.225, sz * 0.13);
    leg.rotation.set(-sz * 0.08, 0, sx * 0.08);
  }
  for (const z of [-0.14, 0.14]) box(g, 0.3, 0.03, 0.03, mat(WOOD_DARK), 0, 0.15, z);
  for (const [x, z] of [
    [0.08, 0.05],
    [-0.1, -0.07],
    [0.02, -0.12],
    [-0.05, 0.11],
  ])
    cyl(g, 0.025, 0.025, 0.005, mat(P.paper), x, 0.473, z, 8, { cast: false });
  return g;
}

/** Taboret. Stan: `taken` (gracz go niesie albo stoi pod oknem). Bez kolizji, jak śpiwór. */
export const stool = definePrefab('stool', (c) => {
  c.state.taken = false;
  const s = stoolMesh();
  c.g.add(s);
  c.animate(() => (s.visible = c.state.taken !== true));
});

/**
 * Okno dachowe w dalszej połaci; prefab stawiaj pod oknem (y = 0), okno jest nad nim.
 * Stan: `stool` (pod oknem stoi taboret).
 */
export const roofWindow = definePrefab('roofWindow', (c) => {
  c.state.stool = false;
  // współrzędne lokalne: okno siedzi na połaci -Z, środek prefabu w z = -2.6
  const g = new THREE.Group();
  g.position.z = 2.6;
  onSlope(g, -1, 0, 0.75, 0.2, 0.45, 0.72, 0.02, mat(0xf1efe9));
  onSlope(g, -1, 0, 0.6, 0.21, 0.47, 0.7, 0.02, mat(0xbcd8ea, { emissive: 0x6b8fa8 }));
  c.g.add(g);
  const s = stoolMesh();
  s.position.z = 0.7;
  s.rotation.y = 0.3;
  c.g.add(s);
  c.animate(() => (s.visible = c.state.stool === true));
});

/** Śpiwór i poduszka. Bez kolizji: można po nim przejść (i gracz zaczyna obok niego). */
export const sleepingBag = definePrefab('sleepingBag', (c) => {
  box(c.g, 0.75, 0.12, 1.9, mat(0x3f5d7a), 0, 0.06, 0);
  box(c.g, 0.6, 0.1, 0.35, mat(P.paper), 0, 0.16, -0.7);
  box(c.g, 0.7, 0.13, 0.6, mat(0x35506b), 0.02, 0.07, 0.5).rotation.y = 0.15;
});

/** Lampa robocza na statywie, zwrócona w lokalne +Z. Świeci naprawdę (światło punktowe). */
export const workLamp = definePrefab('workLamp', (c) => {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = box(c.g, 0.03, 1.3, 0.03, mat(P.dark), Math.cos(a) * 0.2, 0.62, Math.sin(a) * 0.2);
    leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
  }
  box(c.g, 0.32, 0.24, 0.14, mat(0xf2c14e), 0, 1.35, 0);
  box(c.g, 0.26, 0.18, 0.02, glow(0xfff1c9), 0, 1.35, 0.075, { cast: false });
  const light = new THREE.PointLight(0xffd9a0, 6, 9, 1.6);
  light.position.set(0, 1.35, 0.4);
  c.g.add(light);
  c.block(0, 0, 0.5, 0.5);
});

/** Deska przybita do szczytu, z kreskami jak w celi: licznik dni ocieplania. */
export const tallyBoard = definePrefab('tallyBoard', (c) => {
  box(c.g, 0.9, 0.45, 0.03, mat(0xd8c3a0), 0, 1.5, 0);
  const tex = signTexture(
    [
      { text: 'IIII IIII IIII IIII IIII', font: '600 26px monospace', y: 40 },
      { text: 'IIII IIII IIII IIII …', font: '600 26px monospace', y: 72 },
      { text: 'dzień 214', font: 'italic 500 20px serif', y: 104 },
    ],
    '#d8c3a0',
    '#3b2a1c',
    256,
    120,
  );
  plane(c.g, 0.86, 0.41, unlit(tex), 0, 1.5, 0.017);
});

/** Belka do niesienia w dłoni (nie prefab: zwykły mesh). */
export function beamMesh(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.4), mat(WOOD));
  m.position.set(0, -0.02, 0.35);
  m.castShadow = true;
  return m;
}

/** Taboret do niesienia w dłoni. */
export function stoolHeld(): THREE.Group {
  const g = stoolMesh();
  g.position.set(-0.05, -0.5, 0.15);
  return g;
}

/** Rolka wełny do niesienia w dłoni. */
export function woolMesh(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12), mat(WOOL));
  m.rotation.z = Math.PI / 2;
  m.position.set(-0.15, 0, 0.12);
  m.castShadow = true;
  return m;
}
