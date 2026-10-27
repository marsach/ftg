type Handler<T> = (payload: T) => void;
type Args<T> = [T] extends [void] ? [] : [T];

/**
 * Typowana szyna zdarzeń. Moduły komunikują się przez nią zamiast
 * trzymać referencje do siebie nawzajem (np. HUD słucha 'clock' i 'objective').
 */
export class EventBus<E extends object> {
  private readonly handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(type: K, fn: Handler<E[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }

  emit<K extends keyof E>(type: K, ...args: Args<E[K]>): void {
    this.handlers.get(type)?.forEach((fn) => (fn as Handler<unknown>)(args[0]));
  }
}
