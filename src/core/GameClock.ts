import type { EventBus } from './EventBus';
import type { GameEvents, System } from './types';

export interface ClockConfig {
  start: [h: number, m: number];
  /** zegar sam z siebie nie przekroczy tej godziny (fabuła może ją ustawić) */
  stopAt?: [h: number, m: number];
  /** ile sekund rzeczywistych trwa jedna minuta gry */
  secondsPerMinute: number;
}

const toMinutes = ([h, m]: [number, number]) => h * 60 + m;

export class GameClock implements System {
  /** zegar tyka tylko gdy gracz może działać (Game to przełącza) */
  running = false;
  private minutes = 0;
  private acc = 0;

  constructor(
    private readonly cfg: ClockConfig,
    private readonly bus: EventBus<GameEvents>,
  ) {
    this.reset();
  }

  get time() {
    return { h: Math.floor(this.minutes / 60), m: this.minutes % 60 };
  }

  set(h: number, m: number): void {
    this.minutes = h * 60 + m;
    this.acc = 0;
    this.bus.emit('clock', this.time);
  }

  reset(): void {
    this.set(...this.cfg.start);
  }

  update(dt: number): void {
    if (!this.running) return;
    if (this.cfg.stopAt && this.minutes >= toMinutes(this.cfg.stopAt)) return;
    this.acc += dt;
    if (this.acc >= this.cfg.secondsPerMinute) {
      this.acc -= this.cfg.secondsPerMinute;
      this.minutes++;
      this.bus.emit('clock', this.time);
    }
  }
}
