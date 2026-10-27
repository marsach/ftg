import type { Character } from '../characters/Character';
import type { Flags, FlagValues } from '../core/Flags';
import type { GameClock } from '../core/GameClock';
import type { PlacedObject } from '../world/prefab';
import type { Speakers } from './Dialogue';

/**
 * To, co fabuła może zrobić ze światem. Celowo wąskie API:
 * fabuła nie dotyka three.js ani DOM-u, tylko woła te metody.
 */
export interface StoryAPI<F extends FlagValues> {
  /** odtwórz blok dialogu; zwraca numer wybranej opcji (jeśli blok ma opcje) */
  say(key: string): Promise<number | undefined>;
  /** ustaw cel na identyfikatorze HUD-a (tekst z bloku jednowierszowego) */
  objective(key: string): void;
  /** znacznik celu na minimapie: id obiektu, postaci, strefy albo null */
  waypoint(id: string | null): void;
  readonly flags: Flags<F>;
  readonly player: Character;
  npc(id: string): Character;
  obj(id: string): PlacedObject;
  /** przenieś gracza (zatrzymuje też jego ruch) */
  teleportPlayer(x: number, z: number, ry?: number): void;
  readonly clock: GameClock;
  wait(seconds: number): Promise<void>;
  /** koniec gry: pokazuje planszę końcową */
  end(): void;
}

export interface CardText {
  eyebrow: string;
  title: string;
  text: string;
  hints?: string[];
  button: string;
}

export interface InteractionSpec<F extends FlagValues> {
  /** podpowiedź nad obiektem, np. „Porozmawiaj z Kubą” */
  label: string;
  /** zasięg w metrach (domyślnie 1.8) */
  radius?: number;
  use(s: StoryAPI<F>): unknown;
}

/**
 * HISTORIA = logika jednego poziomu: flagi, interakcje, strefy, start.
 * Klucze w `interactions` i `triggers` to identyfikatory z definicji poziomu
 * (id prefabu, id postaci, id strefy).
 */
export interface StoryDef<F extends FlagValues> {
  texts: string;
  speakers: Speakers;
  flags: F;
  intro: CardText;
  outro: CardText;
  start(s: StoryAPI<F>): unknown;
  interactions: Record<string, InteractionSpec<F>>;
  triggers?: Record<string, (s: StoryAPI<F>) => unknown>;
}

/** `false` w definicji flag ma znaczyć „boolean”, a nie dosłownie „zawsze false”. */
export type Widen<F> = {
  [K in keyof F]: F[K] extends boolean ? boolean : F[K] extends number ? number : F[K] extends string ? string : F[K];
};

type Widened<F> = Widen<F> extends infer W extends FlagValues ? W : never;

export const defineStory = <F extends FlagValues>(
  def: Omit<StoryDef<Widened<F>>, 'flags'> & { flags: F },
): StoryDef<Widened<F>> => def as unknown as StoryDef<Widened<F>>;
