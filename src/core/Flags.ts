import type { EventBus } from './EventBus';
import type { GameEvents } from './types';

export type FlagValues = Record<string, boolean | number | string>;

/**
 * Stan fabuły (np. „ma kawę”, „rozmawiał z Anią”).
 * Typ flag pochodzi z definicji historii, więc literówka w nazwie flagi
 * to błąd kompilacji, a nie cichy bug.
 */
export class Flags<F extends FlagValues> {
  private values: F;

  constructor(
    private readonly defaults: F,
    private readonly bus?: EventBus<GameEvents>,
  ) {
    this.values = { ...defaults };
  }

  get<K extends keyof F>(key: K): F[K] {
    return this.values[key];
  }

  set<K extends keyof F>(key: K, value: F[K]): void {
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.bus?.emit('flag', { name: String(key), value });
  }

  reset(): void {
    this.values = { ...this.defaults };
  }

  snapshot(): Readonly<F> {
    return { ...this.values };
  }
}
