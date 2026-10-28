import './ui/styles.css';
import { Game } from './core/Game';
import { lodz10 } from './levels/lodz10/level';
import { lodz10Story } from './levels/lodz10/story';
import { poddasze } from './levels/poddasze/level';
import { poddaszeStory } from './levels/poddasze/story';

/**
 * Kolejność poziomów: prolog na poddaszu prezesa, potem biuro.
 * Biuro jest w przeróbce: prolog nie przechodzi dalej (plansza końcowa zaczyna go od nowa),
 * a `?poziom=biuro` działa tylko w `npm run dev`. Żeby odblokować, przywróć
 * `next: () => play('biuro')` w poddaszu i usuń warunek DEV przy wyborze poziomu.
 */
const host = document.getElementById('app')!;
let game: Game<never> | null = null;

const levels = {
  poddasze: () => new Game(host, poddasze, poddaszeStory),
  biuro: () => new Game(host, lodz10, lodz10Story),
};
type LevelId = keyof typeof levels;

function play(id: LevelId): void {
  game?.dispose();
  game = levels[id]() as unknown as Game<never>;
  game.boot();
  // dostęp z konsoli przeglądarki przy debugowaniu: window.game
  if (import.meta.env.DEV) Object.assign(window, { game });
}

const wanted = new URLSearchParams(location.search).get('poziom');
play(import.meta.env.DEV && wanted && wanted in levels ? (wanted as LevelId) : 'poddasze');
