import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/types';
import { h } from './dom';

/** Identyfikator na smyczy: godzina, data, piętro i bieżący cel. */
export class Hud {
  readonly el: HTMLElement;
  private readonly time: HTMLElement;
  private readonly goal: HTMLElement;

  constructor(parent: HTMLElement, bus: EventBus<GameEvents>, labels: { date: string; place: string }, touch: boolean) {
    this.time = h('div', { class: 'badge-time', text: '--:--' });
    this.goal = h('span', { text: '—' });
    this.el = h(
      'div',
      { class: 'badge', attrs: { 'aria-live': 'polite' } },
      h('div', { class: 'badge-clip' }),
      h(
        'div',
        { class: 'badge-body' },
        this.time,
        h('div', { class: 'badge-date', text: `${labels.date} · ${labels.place}` }),
        h('div', { class: 'badge-obj' }, h('b', { text: 'Cel' }), this.goal),
      ),
    );
    parent.append(this.el);
    if (!touch)
      parent.append(
        h('div', {
          class: 'help',
          html: '<kbd>klik</kbd> idź · <kbd>WASD</kbd> chodź<br><kbd>E</kbd> działaj · <kbd>spacja</kbd> dalej<br><kbd>M</kbd> mapa · kółko: zoom',
        }),
      );

    bus.on('clock', ({ h: hh, m }) => (this.time.textContent = `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`));
    bus.on('objective', (text) => (this.goal.textContent = text));
  }
}
