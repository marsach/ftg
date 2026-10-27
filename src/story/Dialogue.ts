import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/types';
import { formatInline, parseScript } from './scriptFormat.js';

export type SpeakerStyle = 'narr' | 'mysl' | 'speech';

export interface Speaker {
  name?: string;
  role?: string;
  style?: SpeakerStyle;
}

export type Speakers = Record<string, Speaker>;

type Line = { who: string; text: string };

/** Widok dialogu (DOM). Runner nie wie, jak to wygląda, tylko co pokazać. */
export interface DialogueView {
  onAdvance: (() => void) | null;
  open(): void;
  close(): void;
  speaker(s: Speaker): void;
  text(html: string, style: SpeakerStyle): void;
  choices(list: string[] | null, onPick: (index: number) => void): void;
  more(visible: boolean): void;
}

interface Active {
  key: string;
  queue: Line[];
  choices: string[];
  resolve: (choice: number | undefined) => void;
  full: string;
  style: SpeakerStyle;
  shown: number;
  typing: boolean;
  picking: boolean;
}

/**
 * Odtwarza bloki dialogowe. API jest asynchroniczne:
 *
 *   const i = await dialogue.say('kuba');   // i = numer wybranej opcji albo undefined
 *
 * dzięki czemu fabułę pisze się jak zwykły, liniowy kod.
 */
export class DialogueRunner {
  charsPerSecond = 60;

  private readonly blocks: ReturnType<typeof parseScript>['blocks'];
  private active: Active | null = null;

  constructor(
    source: string,
    private readonly speakers: Speakers,
    private readonly view: DialogueView,
    private readonly bus: EventBus<GameEvents>,
  ) {
    const parsed = parseScript(source, Object.keys(speakers));
    this.blocks = parsed.blocks;
    for (const w of parsed.warnings) console.warn(`[dialogi:${w.line}] ${w.message}`);
    view.onAdvance = () => this.advance();
  }

  get isOpen(): boolean {
    return this.active !== null;
  }

  has(key: string): boolean {
    return this.blocks.has(key);
  }

  /** Tekst bloku jednowierszowego (np. [cel.kawa] Zdobądź kawę…). */
  text(key: string): string {
    const b = this.blocks.get(key);
    if (!b) console.warn(`[dialogi] brak bloku [${key}]`);
    return b?.text ?? key;
  }

  say(key: string): Promise<number | undefined> {
    const b = this.blocks.get(key);
    if (!b) {
      console.warn(`[dialogi] brak bloku [${key}]`);
      return Promise.resolve(undefined);
    }
    this.cancel();
    return new Promise((resolve) => {
      this.active = {
        key,
        queue: b.lines.slice(),
        choices: b.choices,
        resolve,
        full: '',
        style: 'speech',
        shown: 0,
        typing: false,
        picking: false,
      };
      this.view.open();
      this.bus.emit('dialogue:open');
      this.advance();
    });
  }

  /** Kliknięcie / spacja: dokończ pisanie albo przejdź dalej. */
  advance(): void {
    const a = this.active;
    if (!a || a.picking) return;
    if (a.typing) {
      a.shown = a.full.length;
      return;
    }
    const line = a.queue.shift();
    if (!line) return this.finish(undefined);
    const sp = this.speakers[line.who] ?? {};
    this.view.speaker(sp);
    a.full = line.text;
    a.style = sp.style ?? 'speech';
    a.shown = 0;
    a.typing = true;
    this.view.more(false);
  }

  choose(index: number): void {
    const a = this.active;
    if (!a?.picking || index < 0 || index >= a.choices.length) return;
    this.finish(index);
  }

  /** Przerywa bieżący dialog (np. nowa gra). */
  cancel(): void {
    if (this.active) this.finish(undefined);
  }

  update(dt: number): void {
    const a = this.active;
    if (!a || !a.typing) return;
    a.shown = Math.min(a.full.length, a.shown + dt * this.charsPerSecond);
    const style = a.style;
    this.view.text(formatInline(a.full.slice(0, Math.floor(a.shown))), style);
    if (a.shown < a.full.length) return;

    a.typing = false;
    this.view.text(formatInline(a.full), style);
    if (!a.queue.length && a.choices.length) {
      a.picking = true;
      this.view.choices(a.choices.map(formatInline), (i) => this.choose(i));
    } else this.view.more(true);
  }

  private finish(choice: number | undefined): void {
    const a = this.active;
    if (!a) return;
    this.active = null;
    this.view.choices(null, () => {});
    this.view.close();
    this.bus.emit('dialogue:close');
    a.resolve(choice);
  }
}
