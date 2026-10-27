import type { CardText } from '../story/Story';
import { h } from './dom';

/** Plansza tytułowa / końcowa w stylu identyfikatora. */
export class Overlay {
  private readonly el: HTMLElement;
  private readonly button: HTMLButtonElement;

  constructor(parent: HTMLElement, card: CardText, onAction: () => void) {
    this.button = h('button', { text: card.button });
    this.button.addEventListener('click', onAction);
    this.el = h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'badge-clip' }),
        h(
          'div',
          { class: 'card-body' },
          h('small', { text: card.eyebrow }),
          h('h1', { text: card.title }),
          h('p', { text: card.text }),
          card.hints?.length ? h('ul', {}, ...card.hints.map((t) => h('li', { html: t }))) : null,
          this.button,
        ),
      ),
    );
    this.el.hidden = true;
    parent.append(this.el);
  }

  show(): void {
    this.el.hidden = false;
    this.button.focus({ preventScroll: true });
  }

  hide(): void {
    this.el.hidden = true;
  }
}
