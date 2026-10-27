import type { Character } from '../characters/Character';
import { inRect, type System } from '../core/types';
import type { TriggerDef } from '../world/level';

/** Strefy, których przekroczenie uruchamia fabułę (np. wejście do sali). */
export class TriggerSystem implements System {
  private readonly inside = new Set<string>();

  constructor(
    private readonly triggers: TriggerDef[],
    private readonly player: Character,
    private readonly canFire: () => boolean,
    private readonly onEnter: (id: string) => void,
  ) {}

  update(): void {
    if (!this.canFire()) return;
    const p = this.player.position;
    for (const t of this.triggers) {
      const now = inRect(t.rect, p.x, p.z);
      if (now && !this.inside.has(t.id)) {
        this.inside.add(t.id);
        this.onEnter(t.id);
      } else if (!now) this.inside.delete(t.id);
    }
  }

  reset(): void {
    this.inside.clear();
  }
}
