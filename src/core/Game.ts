import * as THREE from 'three';
import { Character } from '../characters/Character';
import { Lighting } from '../render/Lighting';
import { IsoCamera } from '../render/IsoCamera';
import { Renderer } from '../render/Renderer';
import { cutaway } from '../render/Cutaway';
import { DialogueRunner } from '../story/Dialogue';
import type { StoryAPI, StoryDef } from '../story/Story';
import { InteractionSystem } from '../systems/InteractionSystem';
import { PlayerController } from '../systems/PlayerController';
import { TriggerSystem } from '../systems/TriggerSystem';
import { DialogueView } from '../ui/DialogueView';
import { Hud } from '../ui/Hud';
import { Minimap } from '../ui/Minimap';
import { Overlay } from '../ui/Overlay';
import { PromptView } from '../ui/PromptView';
import { batchStatic } from '../world/batch';
import type { LevelDef } from '../world/level';
import { LevelBuilder } from '../world/LevelBuilder';
import { NavGrid } from '../world/NavGrid';
import { EventBus } from './EventBus';
import { Flags, type FlagValues } from './Flags';
import { GameClock } from './GameClock';
import { Input } from './Input';
import type { GameEvents, System } from './types';

const PLAYER_LOOK = { shirt: 0x8fa3b8, pants: 0x2d3440, hair: 0x2a211b };

export interface GameOptions {
  /** następny poziom: przycisk na planszy końcowej prowadzi dalej zamiast „jeszcze raz” */
  next?: () => void;
}

/**
 * Spina moduły w działającą grę: buduje poziom, tworzy systemy,
 * kieruje wejście do właściwego odbiorcy i kręci pętlą.
 *
 * Game nie zawiera żadnej treści: poziom (LevelDef) i fabuła (StoryDef)
 * przychodzą z zewnątrz, więc ten sam silnik obsłuży każde piętro.
 */
export class Game<F extends FlagValues> {
  readonly bus = new EventBus<GameEvents>();
  readonly renderer: Renderer;
  readonly iso = new IsoCamera();
  readonly input: Input;
  readonly flags: Flags<F>;
  readonly clock: GameClock;
  readonly level: LevelBuilder;
  readonly nav: NavGrid;
  readonly player: Character;
  readonly npcs = new Map<string, Character>();
  readonly dialogue: DialogueRunner;

  private readonly lighting: Lighting;
  private readonly controller: PlayerController;
  private readonly interactions: InteractionSystem;
  private readonly triggers: TriggerSystem;
  private readonly minimap: Minimap | null;
  private readonly intro: Overlay;
  private readonly outro: Overlay;
  private readonly systems: System[];
  private readonly api: StoryAPI<F>;

  private playing = false;
  private busy = 0;
  private time = 0;
  private readonly clockTimer = new THREE.Clock();
  private readonly ui: HTMLElement;
  private readonly onResize = () => {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.resize(w, h);
    this.iso.resize(w, h);
  };

  constructor(
    private readonly host: HTMLElement,
    private readonly def: LevelDef,
    private readonly story: StoryDef<F>,
    opts: GameOptions = {},
  ) {
    this.renderer = new Renderer(host, def.background);
    const scene = this.renderer.scene;
    this.input = new Input(this.renderer.canvas);
    this.flags = new Flags(story.flags, this.bus);
    this.clock = new GameClock(def.clock, this.bus);
    this.lighting = new Lighting(scene);

    // --- świat ---
    const world = new THREE.Group();
    world.name = 'level';
    scene.add(world);
    this.level = new LevelBuilder(world);
    for (const p of def.props) this.level.place(p.prefab, p.at as never);

    this.player = new Character('player', def.playerLook ?? PLAYER_LOOK, def.start);
    scene.add(this.player.root);
    for (const n of def.npcs) {
      const c = new Character(n.id, n.look, n);
      this.npcs.set(n.id, c);
      scene.add(c.root);
      if (c.standing) this.level.block(n.x, n.z, 0.5, 0.5);
    }

    const stats = batchStatic(world);
    console.info(`[poziom] ${def.name}: scalono ${stats.before} meshy w ${stats.after}`);

    this.nav = new NavGrid(def.bounds);
    this.nav.build(this.level.colliders, def.outline);

    // --- UI ---
    const ui = (this.ui = document.createElement('div'));
    host.append(ui);
    new Hud(ui, this.bus, def.hud, this.input.isTouch);
    this.minimap = def.map ? new Minimap(ui, def.map, def.bounds, def.outline) : null;
    const prompt = new PromptView(ui, this.input.isTouch);
    this.dialogue = new DialogueRunner(story.texts, story.speakers, new DialogueView(ui, this.input.isTouch), this.bus);
    this.intro = new Overlay(ui, story.intro, () => this.start());
    this.outro = new Overlay(ui, story.outro, opts.next ?? (() => this.start()));

    // --- systemy ---
    const canAct = () => this.playing && this.busy === 0 && !this.dialogue.isOpen;
    this.controller = new PlayerController(this.player, this.nav, this.input, this.iso, scene, canAct);
    this.interactions = new InteractionSystem(this.player, this.iso, this.controller, prompt, this.renderer.canvas, canAct);
    this.triggers = new TriggerSystem(def.triggers, this.player, canAct, (id) => {
      const fn = story.triggers?.[id];
      if (fn) this.run(fn);
    });
    prompt.onAction = () => this.interactions.action();
    this.systems = [this.controller, this.interactions, this.triggers, this.clock];

    this.api = this.createApi();
    this.registerInteractions();
    this.routeInput();
  }

  /** Pokazuje planszę tytułową i uruchamia pętlę renderowania. */
  boot(): void {
    window.addEventListener('resize', this.onResize);
    this.onResize();
    this.iso.snapTo(this.player.position);
    this.intro.show();
    this.renderer.gl.setAnimationLoop(() => this.frame());
  }

  /** Zatrzymuje pętlę i usuwa poziom ze strony (przejście do następnego poziomu). */
  dispose(): void {
    this.renderer.gl.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);
    this.dialogue.cancel();
    this.input.dispose();
    this.minimap?.dispose();
    this.renderer.gl.dispose();
    this.renderer.canvas.remove();
    this.ui.remove();
  }

  /** Nowa gra (także „jeszcze raz”). */
  start(): void {
    this.intro.hide();
    this.outro.hide();
    this.dialogue.cancel();
    this.flags.reset();
    this.level.resetStates();
    this.player.reset();
    this.npcs.forEach((n) => n.reset());
    this.systems.forEach((s) => s.reset?.());
    if (this.minimap) this.minimap.waypoint = null;
    this.iso.snapTo(this.player.position);
    this.busy = 0;
    this.playing = true;
    this.input.enabled = true;
    this.bus.emit('game:start');
    this.run(this.story.start);
  }

  /** Uruchamia fragment fabuły; w tym czasie gracz nie może zacząć innej interakcji. */
  private async run(fn: (s: StoryAPI<F>) => unknown): Promise<void> {
    this.busy++;
    try {
      await fn(this.api);
    } catch (err) {
      console.error('[fabuła]', err);
    } finally {
      this.busy = Math.max(0, this.busy - 1);
    }
  }

  private createApi(): StoryAPI<F> {
    const game = this;
    return {
      say: (key) => this.dialogue.say(key),
      objective: (key) => this.bus.emit('objective', this.dialogue.text(key)),
      waypoint: (id) => {
        if (!this.minimap) return;
        this.minimap.waypoint = id ? this.locate(id) : null;
      },
      flags: this.flags,
      player: this.player,
      npc: (id) => {
        const n = this.npcs.get(id);
        if (!n) throw new Error(`Brak postaci „${id}” w poziomie`);
        return n;
      },
      obj: (id) => {
        const o = this.level.objects.get(id);
        if (!o) throw new Error(`Brak obiektu „${id}” w poziomie`);
        return o;
      },
      teleportPlayer: (x, z, ry) => this.controller.teleport(x, z, ry),
      get clock() {
        return game.clock;
      },
      wait: (seconds) => new Promise((r) => setTimeout(r, seconds * 1000)),
      end: () => {
        this.playing = false;
        this.input.enabled = false;
        this.bus.emit('game:end');
        this.outro.show();
      },
    };
  }

  /** Pozycja obiektu, postaci albo środka strefy o danym id. */
  private locate(id: string): THREE.Vector3 | null {
    const npc = this.npcs.get(id);
    if (npc) return npc.position;
    const obj = this.level.objects.get(id);
    if (obj) return obj.group.getWorldPosition(new THREE.Vector3());
    const tr = this.def.triggers.find((t) => t.id === id);
    if (tr) return new THREE.Vector3((tr.rect.x0 + tr.rect.x1) / 2, 0, (tr.rect.z0 + tr.rect.z1) / 2);
    console.warn(`[fabuła] nie znam celu „${id}”`);
    return null;
  }

  private registerInteractions(): void {
    for (const [id, spec] of Object.entries(this.story.interactions)) {
      const npc = this.npcs.get(id);
      const obj = this.level.objects.get(id);
      if (!npc && !obj) {
        console.warn(`[fabuła] interakcja „${id}” nie ma obiektu ani postaci w poziomie`);
        continue;
      }
      const anchor = npc ? npc.position : obj!.group.getWorldPosition(new THREE.Vector3());
      this.interactions.add({
        id,
        label: spec.label,
        anchor,
        promptY: npc ? (npc.standing ? 2.15 : 1.85) : anchor.y + 1.0,
        radius: spec.radius ?? 1.8,
        roots: [npc ? npc.root : obj!.group],
        use: () =>
          this.run(async (s) => {
            if (npc?.standing) npc.face(this.player.position.x, this.player.position.z);
            await spec.use(s);
          }),
      });
    }
  }

  /** Jedno miejsce, które decyduje, kto dostaje dane wejście. */
  private routeInput(): void {
    this.input.handlers = {
      tap: (ndc) => {
        if (this.dialogue.isOpen) return this.dialogue.advance();
        if (!this.playing || this.busy) return;
        if (!this.interactions.tap(ndc)) this.controller.tapGround(ndc);
      },
      hover: (ndc) => this.interactions.hover(ndc),
      action: () => {
        if (this.dialogue.isOpen) this.dialogue.advance();
        else this.interactions.action();
      },
      choice: (i) => this.dialogue.choose(i),
      zoom: (f) => this.iso.zoom(f),
    };
  }

  private frame(): void {
    const dt = Math.min(this.clockTimer.getDelta(), 0.05);
    this.time += dt;
    const t = this.time;

    this.clock.running = this.playing && !this.dialogue.isOpen;
    for (const s of this.systems) s.update(dt, t);
    this.player.update(dt, t);
    this.npcs.forEach((n) => n.update(dt, t));
    this.level.update(dt, t);
    this.dialogue.update(dt);

    this.iso.follow(this.player.position, dt);
    this.lighting.follow(this.iso.target);
    cutaway.update(this.player.position, this.iso, this.renderer.canvas, dt);
    this.minimap?.update(this.player.position, this.player.root.rotation.y, t);
    this.renderer.render(this.iso.camera);
  }
}
