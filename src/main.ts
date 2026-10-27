import './ui/styles.css';
import { Game } from './core/Game';
import { lodz10 } from './levels/lodz10/level';
import { lodz10Story } from './levels/lodz10/story';
import { poddasze } from './levels/poddasze/level';
import { poddaszeStory } from './levels/poddasze/story';

/**
 * Kolejność poziomów: prolog na poddaszu prezesa, potem biuro.
 * `?poziom=biuro` w adresie pomija prolog.
 */
const host = document.getElementById('app')!;
let game: Game<never> | null = null;

const levels = {
  poddasze: () => new Game(host, poddasze, poddaszeStory, { next: () => play('biuro') }),
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
play(wanted && wanted in levels ? (wanted as LevelId) : 'poddasze');
