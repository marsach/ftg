import type { DialogueView as Port, Speaker, SpeakerStyle } from '../story/Dialogue';
import { h } from './dom';

/** Okno dialogu przy dolnej krawędzi ekranu. */
export class DialogueView implements Port {
  onAdvance: (() => void) | null = null;

  private readonly el: HTMLElement;
  private readonly name: HTMLElement;
  private readonly body: HTMLElement;
  private readonly opts: HTMLElement;
  private readonly hint: HTMLElement;

  constructor(parent: HTMLElement, touch: boolean) {
    this.name = h('div', { class: 'd-name' });
    this.body = h('div', { class: 'd-text' });
    this.opts = h('div', { class: 'd-choices' });
    this.hint = h('div', { class: 'd-more', text: touch ? 'DOTKNIJ ▸' : 'KLIK / SPACJA ▸' });
    this.el = h('div', { class: 'dialog', attrs: { role: 'dialog' } }, this.name, this.body, this.opts, this.hint);
    this.el.hidden = true;
    this.el.addEventListener('click', () => this.onAdvance?.());
    parent.append(this.el);
  }

  open(): void {
    this.el.hidden = false;
  }

  close(): void {
    this.el.hidden = true;
  }

  speaker(s: Speaker): void {
    this.name.replaceChildren();
    if (s.name) this.name.append(s.name, s.role ? h('span', { text: ` · ${s.role}` }) : '');
  }

  text(html: string, style: SpeakerStyle): void {
    this.body.className = `d-text ${style}`;
    this.body.innerHTML = html;
  }

  choices(list: string[] | null, onPick: (index: number) => void): void {
    this.opts.replaceChildren();
    if (!list) return;
    list.forEach((html, i) => {
      const b = h('button', { html: `<i>${i + 1}</i>${html}` });
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        onPick(i);
      });
      this.opts.append(b);
    });
    (this.opts.firstElementChild as HTMLButtonElement | null)?.focus({ preventScroll: true });
  }

  more(visible: boolean): void {
    this.hint.hidden = !visible;
  }
}
