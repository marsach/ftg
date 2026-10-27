/**
 * ŁÓDŹ +10 — piętro biurowe odtworzone z planu.
 *
 * Wszystkie liczby to PIKSELE PLANU (obrazek ok. 1900 px szerokości),
 * przeliczane na metry w plan.ts (1 px = 5 cm). Żeby coś przesunąć,
 * odczytaj nowe współrzędne z planu i podmień liczby.
 *
 * Kolejność: obrys → podłogi stref → ściany → bryły → meble → postacie.
 */
import type { LevelDef, NpcDef } from '../../world/level';
import { bench, benchSeat, counter, fridge, island, lockers, meetingTable, roundTable, sofa, trainingRow, type BenchOpts } from '../../prefabs/furniture';
import { armchair, coffeeMachine, plant, printer, serverRack, waterCooler } from '../../prefabs/props';
import { roomLabel, wallScreen } from '../../prefabs/structure';
import { PlanBuilder, X, Z, leftEdge as xL, localToPlan, pt, type PxPoint } from './plan';

const b = new PlanBuilder();
const V = Math.PI / 2; // rząd biurek ustawiony pionowo (jak na planie)

/* ================================================================== */
/*  OBRYS I PODŁOGI                                                   */
/* ================================================================== */

const OUTLINE: PxPoint[] = [
  [163, 197],
  [1505, 197],
  [1505, 765],
  [1470, 870],
  [xL(870), 870],
];

// korytarze i wszystko „pomiędzy”: jasna posadzka
b.zone(OUTLINE, { tint: 0xd6d1c7, map: '#e4e0d8', surface: 'plain', y: 0 });

const C = {
  working: { tint: 0xedb497, map: '#eba985' },
  cowork: { tint: 0xedc7c4, map: '#e8b9b6' },
  coop: { tint: 0xc8b6e3, map: '#b8a3da' },
  training: { tint: 0xd2d2d2, map: '#c9c9c9' },
  conf: { tint: 0xadd2de, map: '#9fcfe0' },
  client: { tint: 0xe6a096, map: '#e2887e' },
  kitchen: { tint: 0xf1e8b8, map: '#efe3a8' },
};

b.zone([[163, 197], [585, 197], [585, 370], [555, 370], [555, 412], [xL(412), 412]], { ...C.cowork, label: 'Cowork 10.01' });
b.rectZone(585, 197, 778, 370, { ...C.coop, label: 'Cooperation Area' });
b.rectZone(778, 197, 840, 280, { ...C.conf, label: 'Vice City' });
b.rectZone(840, 197, 912, 280, { ...C.conf, label: 'Cytadela' });
b.rectZone(912, 197, 1065, 370, { ...C.working, label: 'WA 10.01' });
b.rectZone(1065, 197, 1228, 370, { ...C.working, label: 'WA 10.02' });
b.rectZone(1228, 197, 1505, 350, { ...C.training, label: 'Persia 10.03' });
b.rectZone(1390, 372, 1505, 435, { ...C.conf, label: 'Portal 2' });
b.rectZone(1390, 435, 1505, 498, { ...C.conf, label: 'Portal 3' });
b.rectZone(1420, 498, 1505, 580, { ...C.conf, label: 'Tristram' });
b.zone([[1390, 580], [1505, 580], [1505, 765], [1470, 870], [1335, 870], [1335, 690], [1390, 690]], { ...C.working, label: 'WA' });
b.zone([[xL(412), 412], [490, 412], [490, 477], [555, 477], [555, 635], [xL(635), 635]], { ...C.client, label: 'Client Project Area' });
b.rectZone(490, 412, 555, 477, { ...C.conf, label: 'Shodan' });
b.zone([[xL(635), 635], [425, 635], [425, 690], [xL(690), 690]], { ...C.conf, label: 'City 17' });
b.rectZone(425, 635, 490, 690, { ...C.conf, label: '6' });
b.rectZone(490, 635, 555, 690, { ...C.conf, label: 'Wyzima' });
b.zone([[xL(690), 690], [785, 690], [785, 745], [905, 745], [905, 870], [xL(870), 870]], { ...C.working, label: 'Working Area' });
b.rectZone(905, 690, 1170, 870, { ...C.working, label: 'WA' });
b.rectZone(1170, 690, 1335, 870, { ...C.working, label: 'WA' });
b.rectZone(1250, 400, 1360, 652, { ...C.kitchen, label: 'Kuchnia', surface: 'tile' });

/* ================================================================== */
/*  ŚCIANY                                                            */
/* ================================================================== */

// zewnętrzne (północ i zachód są daleko od kamery: bez prześwietlania)
b.wall([163, 197], [1505, 197], { glass: true, cut: false });
b.wall([163, 197], [xL(870), 870], { glass: true, cut: false });
b.wall([1505, 197], [1505, 765], { glass: true });
b.wall([1505, 765], [1470, 870], { glass: true });
b.wall([xL(870), 870], [1470, 870], { glass: true });

// górny rząd: cowork | kooperacja | sale | working areas | Persia
b.wall([585, 197], [585, 370], { doors: [340] });
b.wall([585, 370], [778, 370], { doors: [700] });
b.wall([778, 197], [778, 280]);
b.wall([778, 280], [778, 370], { doors: [325] });
b.wall([778, 280], [912, 280], { doors: [810, 876] });
b.wall([840, 197], [840, 280]);
b.wall([912, 197], [912, 370]);
b.wall([912, 370], [1228, 370], { doors: [1015, 1150] });
b.wall([1065, 197], [1065, 370]);
b.wall([1228, 197], [1228, 350]);
b.wall([1228, 350], [1505, 350], { doors: [1262, 1470] });

// prawa strona: Portal 2/3, Tristram
b.wall([1390, 372], [1505, 372]);
b.wall([1390, 372], [1390, 498], { doors: [405, 468] });
b.wall([1390, 435], [1505, 435]);
b.wall([1390, 498], [1505, 498]);
b.wall([1420, 498], [1420, 580], { doors: [540] });
b.wall([1390, 580], [1505, 580], { doors: [1405] });
b.wall([1390, 580], [1390, 690], { doors: [640] });
b.wall([1335, 690], [1390, 690]);
b.wall([1335, 690], [1335, 870], { doors: [760] });

// kuchnia
b.wall([1250, 400], [1360, 400], { doors: [1305] });
b.wall([1360, 400], [1360, 652], { doors: [470, 600] });
b.wall([1250, 652], [1360, 652], { doors: [1300] });

// lewa strona: cowork / client project / sale
b.wall([xL(412), 412], [490, 412]);
b.wall([490, 412], [490, 477]);
b.wall([490, 477], [555, 477]);
b.wall([555, 412], [555, 477], { doors: [445] });
b.wall([555, 477], [555, 635], { doors: [600] });
b.wall([xL(635), 635], [555, 635], { doors: [385, 457] });
b.wall([425, 635], [425, 690]);
b.wall([490, 635], [490, 690]);
b.wall([555, 635], [555, 690], { doors: [662] });

// dolny rząd: working areas
b.wall([xL(690), 690], [785, 690], { doors: [485, 650] });
b.wall([785, 690], [785, 745]);
b.wall([785, 745], [905, 745]);
b.wall([905, 690], [905, 870], { doors: [800] });
b.wall([905, 690], [1170, 690], { doors: [1130] });
b.wall([1170, 690], [1335, 690], { doors: [1185] });
b.wall([1170, 690], [1170, 870], { doors: [800] });

// trzon budynku i toalety
b.solid(585, 400, 1085, 652, 'WINDY · KLATKI');
b.solid(1085, 400, 1250, 652, 'WC');

/* ================================================================== */
/*  MEBLE                                                             */
/* ================================================================== */

type Seat = { at: PxPoint; ry: number; opts: BenchOpts };
const benches: Record<string, Seat> = {};
function benchAt(name: string, x: number, y: number, ry: number, opts: BenchOpts) {
  benches[name] = { at: [x, y], ry, opts };
  b.add(bench, x, y, { ry, ...opts });
}
/** pozycja siedzącej postaci przy stanowisku `seat` rzędu `name` */
function seated(name: string, seat: number) {
  const { at, ry, opts } = benches[name];
  const s = benchSeat(opts, seat);
  return { ...localToPlan(at[0], at[1], ry, s.x, s.z), ry: ry + s.ry };
}

// Cowork 10.01 — dwa rzędy zestawów po 4 stanowiska
[258, 328, 398, 468, 540].forEach((x, i) => benchAt(`cw1-${i}`, x, 252, V, { pairs: 2, mugs: i % 2 ? [1] : [2] }));
[292, 358, 428, 498].forEach((x, i) => benchAt(`cw2-${i}`, x, 368, V, { pairs: 2, mugs: i === 2 ? [0] : [] }));

// Cooperation Area — kanapa, fotele, stoliki, dwa stoły
b.add(sofa, 628, 232, { ry: 0, length: 2.2 });
b.add(armchair, 676, 222, { ry: -0.4 });
b.add(armchair, 612, 278, { ry: 2.6 });
b.add(roundTable, 730, 232, { r: 0.45 });
b.add(roundTable, 752, 272, { r: 0.45 });
b.add(roundTable, 726, 300, { r: 0.45 });
b.add(meetingTable, 633, 332, { ry: 0, length: 1.8, width: 0.9, seats: 2 });
b.add(meetingTable, 692, 332, { ry: 0, length: 1.8, width: 0.9, seats: 2 });
b.add(plant, 601, 214, { id: 'fikus', scale: 1.15, tag: true });

// sale Vice City i Cytadela, hol przy windach
b.add(meetingTable, 809, 240, { ry: V, length: 1.8, width: 1.0, seats: 2 });
b.add(meetingTable, 876, 240, { round: true, length: 1.3, seats: 5 });
b.add(roundTable, 836, 315, { r: 0.4, h: 1.05, stools: 2 });
b.add(roundTable, 872, 315, { r: 0.4, h: 1.05, stools: 2 });
b.add(printer, 902, 305, { id: 'drukarka', ry: -V });

// Working Area 10.01 — rząd jednostronny pod ścianą (tu siedzi Smol@r z IT) i rząd dwustronny
benchAt('wa1-wall', 922, 272, V, { pairs: 3, sides: 1, codeScreens: [0, 1, 2] });
benchAt('wa1-mid', 988, 272, V, { pairs: 3, mugs: [4] });
b.add(serverRack, 1052, 212, {});

// Working Area 10.02
benchAt('wa2-a', 1112, 272, V, { pairs: 3, mugs: [1] });
benchAt('wa2-b', 1185, 272, V, { pairs: 3, mugs: [3] });

// Persia 10.03 — sala szkoleniowa na 60 osób, ekran na zachodniej ścianie
b.add(wallScreen, 1228, 272, { ry: V, w: 3.2, h: 1.8, y: 1.55 });
for (const x of [1290, 1325, 1360, 1395, 1430, 1465]) {
  b.add(trainingRow, x, 240, { ry: V, seats: 4 });
  b.add(trainingRow, x, 310, { ry: V, seats: 4 });
}

// Portal 2/3, Tristram
b.add(meetingTable, 1452, 404, { ry: 0, length: 3, width: 1.1, seats: 3 });
b.add(meetingTable, 1452, 467, { ry: 0, length: 3, width: 1.1, seats: 3 });
b.add(meetingTable, 1464, 540, { ry: V, length: 2, width: 1.0, seats: 2 });

// kuchnia
b.add(fridge, 1258, 418, { ry: V });
b.add(counter, 1259, 470, { ry: V, length: 4, sinkAt: 0.9 });
b.add(coffeeMachine, 1259, 448, { id: 'ekspres', y: 0.95, ry: V });
b.add(island, 1290, 505, { ry: V, length: 2.6 });
b.add(meetingTable, 1334, 495, { ry: V, length: 3, width: 0.8, seats: 3 });
b.add(waterCooler, 1350, 412, {});
// kanapa w rogu, obok drzwi (środek drzwi x = 1300), żeby ich nie zasłaniała
b.add(sofa, 1338, 632, { ry: Math.PI, length: 1.6, color: 0x6f8a7a });

// Client Project Area — trzy długie rzędy, szafki przy ścianie
benchAt('cp-1', 355, 452, 0, { pairs: 4, mugs: [2, 5] });
benchAt('cp-2', 370, 522, 0, { pairs: 4, mugs: [6] });
benchAt('cp-3', 408, 580, 0, { pairs: 4 });
b.add(lockers, 547, 560, { ry: -V, length: 3 });

// małe sale: Shodan, City 17, 6, Wyzima
b.add(meetingTable, 522, 445, { ry: 0, length: 1.4, width: 0.9, seats: 2 });
b.add(meetingTable, 395, 662, { round: true, length: 1.0, seats: 4 });
b.add(meetingTable, 457, 662, { ry: V, length: 1.4, width: 0.9, seats: 2 });
b.add(meetingTable, 522, 662, { ry: V, length: 1.4, width: 0.9, seats: 2 });

// dolny duży Working Area: pary biurek pod ścianą i rzędy po 6
[447, 518, 586, 722].forEach((x, i) => benchAt(`bw-top-${i}`, x, 722, 0, { pairs: 1 }));
[480, 550, 620, 690, 760, 840].forEach((x, i) => benchAt(`bw-${i}`, x, 810, V, { pairs: 3, mugs: [(i * 2) % 6] }));

// środkowe working areas
benchAt('wm-1', 950, 790, V, { pairs: 3 });
benchAt('wm-2', 1040, 782, V, { pairs: 3, mugs: [2] });
benchAt('wm-3', 1115, 782, V, { pairs: 1 });
benchAt('wr-1', 1215, 752, V, { pairs: 2 });
benchAt('wr-2', 1285, 752, V, { pairs: 2, mugs: [1] });

// prawy working area
benchAt('we-1', 1450, 640, V, { pairs: 2 });
benchAt('we-2', 1450, 735, V, { pairs: 2 });
benchAt('we-3', 1380, 740, V, { pairs: 2, mugs: [3] });

// zieleń
for (const [x, y, s] of [
  [1492, 212, 0.9],
  [1490, 858, 1],
  [1350, 860, 0.9],
  [920, 860, 1],
  [575, 384, 0.8],
  [1375, 365, 0.8],
  [800, 735, 0.9],
] as const)
  b.add(plant, x, y, { scale: s });

/* ================================================================== */
/*  TABLICZKI SAL                                                     */
/* ================================================================== */

const label = (text: string, x: number, y: number, sub?: string, accent = false) => b.add(roomLabel, x, y, { text, sub, accent });
label('VICE CITY', 809, 280, '9');
label('CYTADELA', 876, 280, '1');
label('PERSIA', 1300, 350, '10.03 · 60 os.', true);
label('SHODAN', 555, 445, '8');
label('PORTAL', 1390, 404, '2');
label('PORTAL', 1390, 467, '3');
label('TRISTRAM', 1420, 540, '4');
label('CITY 17', 385, 635, '7');
label('WYZIMA', 555, 662, '5');
label('KUCHNIA', 1360, 520);
label('WORKING AREA', 988, 370, '10.01');
label('WORKING AREA', 1146, 370, '10.02');
label('COOPERATION', 680, 370);
label('THE NEVERHOOD', 470, 635, 'client project');

/* ================================================================== */
/*  POSTACIE                                                          */
/* ================================================================== */

const kuba = seated('wa1-wall', 1);
const marek = seated('bw-2', 1);
const ania = seated('cp-2', 5);

const npcs: NpcDef[] = [
  { id: 'bozena', look: { shirt: 0x7a2f3a, pants: 0x2a2e35, hair: 0x8a5a3b, skin: 0xe8c2a4, laptop: true }, x: X(1292), z: Z(368), ry: -0.4 }, // obok drzwi Persji (x = 1262), nie w nich
  // hol przy Vice City, po drodze do Working Area 10.01; z laptopem, bo „pokazuje demo”
  { id: 'radek', look: { shirt: 0x24304a, pants: 0x3a3f47, hair: 0x2b2420, laptop: true }, x: X(848), z: Z(352), ry: 0.6 },
  { id: 'ola', look: { shirt: 0xd39a3c, pants: 0x3b4556, hair: 0x1f1a17, skin: 0xc99a7a }, x: X(1324), z: Z(420), ry: 2.4 },
  { id: 'kuba', look: { shirt: 0x3f5d4a, hair: 0x5a4535 }, ...kuba, pose: 'sit', activity: 'typing' },
  { id: 'marek', look: { shirt: 0x4a6fa5, hair: 0x6d6157, tie: 0x2c3e66 }, ...marek, pose: 'sit', activity: 'typing' },
  { id: 'ania', look: { shirt: 0x8f8fb0, hair: 0xb07a4a, headphones: true }, ...ania, pose: 'sit', activity: 'typing' },
];

/* ================================================================== */
/*  DEFINICJA                                                         */
/* ================================================================== */

export const lodz10: LevelDef = {
  name: 'Łódź +10',
  bounds: { x0: X(150), x1: X(1520), z0: Z(185), z1: Z(882) },
  outline: OUTLINE.map(([x, y]) => pt(x, y)),
  background: 0x1b1f24,
  start: { x: X(845), z: Z(716), ry: Math.PI },
  props: b.props,
  npcs,
  triggers: [{ id: 'persia', rect: { x0: X(1234), x1: X(1500), z0: Z(202), z1: Z(345) } }],
  clock: { start: [8, 57], stopAt: [9, 14], secondsPerMinute: 10 },
  hud: { date: 'pon., 26.10.2026', place: 'Łódź · piętro +10' },
  map: b.map,
};
