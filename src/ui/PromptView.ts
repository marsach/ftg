import { h } from './dom';

/** Podpowiedź nad obiektem („E · Porozmawiaj z…”) i przycisk „Działaj” na ekranach dotykowych. */
export class PromptView {
  onAction: (() => void) | null = null;

  private readonly el: HTMLElement;
  private readonly btn: HTMLButtonElement;
  private lastLabel = '';

  constructor(
    parent: HTMLElement,
    private readonly touch: boolean,
  ) {
    this.el = h('div', { class: 'prompt' });
    this.el.hidden = true;
    this.btn = h('button', { class: 'act', text: 'Działaj' });
    this.btn.hidden = true;
    this.btn.addEventListener('click', () => this.onAction?.());
    parent.append(this.el, this.btn);
  }

  show(label: string, x: number, y: number): void {
    if (label !== this.lastLabel) {
      this.el.innerHTML = (this.touch ? '' : '<kbd>E</kbd>') + label.replace(/</g, '&lt;');
      this.lastLabel = label;
    }
    this.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    this.el.hidden = false;
    this.btn.hidden = !this.touch;
  }

  hide(): void {
    this.el.hidden = true;
    this.btn.hidden = true;
  }
}
