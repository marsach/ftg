import type { ClockConfig } from '../core/GameClock';
import type { Rect } from '../core/types';
import type { Look } from '../characters/rig';
import type { PropDef } from './prefab';

export type Point = [x: number, z: number];

export interface NpcDef {
  id: string;
  look: Look;
  x: number;
  z: number;
  ry: number;
  pose?: 'stand' | 'sit';
  activity?: 'idle' | 'typing';
}

export interface TriggerDef {
  id: string;
  rect: Rect;
}

/** Dane dla minimapy: strefy (kolorowe wielokąty) i odcinki ścian. */
export interface MapData {
  zones: { points: Point[]; color: string; label?: string }[];
  walls: [Point, Point][];
  solids: Point[][];
}

/**
 * POZIOM = czyste dane. Nie ma tu logiki fabuły ani kodu renderowania,
 * tylko co gdzie stoi. Nowe piętro to nowy plik z taką definicją.
 */
export interface LevelDef {
  name: string;
  /** prostokąt obejmujący cały poziom (siatka nawigacji) */
  bounds: Rect;
  /** obrys budynku; poza nim nie da się chodzić */
  outline?: Point[];
  background: number;
  start: { x: number; z: number; ry: number };
  /** wygląd gracza (domyślnie pracownik open space'u) */
  playerLook?: Look;
  props: PropDef[];
  npcs: NpcDef[];
  triggers: TriggerDef[];
  clock: ClockConfig;
  hud: { date: string; place: string };
  map?: MapData;
}
