/**
 * Fabuła prologu „Poddasze prezesa”: siódmy miesiąc ocieplania dachu,
 * pierwszy dzień obowiązkowego powrotu do biura.
 *
 * Kolejność: laptop (mail, potem wiadomość na grupę) → klapa przybita listwą →
 * belka jako dźwignia → drabina spada → wełna na dół → skok.
 * Gracz może zacząć od klapy; cel na identyfikatorze zawsze wynika z flag (`nextGoal`).
 */
import { beamMesh, woolMesh } from '../../prefabs/attic';
import type { Speakers } from '../../story/Dialogue';
import { defineStory, type StoryAPI, type Widen } from '../../story/Story';
import texts from './dialogi.txt?raw';
import speakerData from './postacie.json';

const flags = {
  mailRead: false,
  /** wiadomość na grupę wysłana, laptop spakowany */
  laptop: false,
  triedHatch: false,
  hatchOpen: false,
  woolDown: false,
  /** co prezes niesie: '' | 'belka' | 'welna' */
  holding: '',
  /** ile pasów wełny położył „po drodze” */
  extraStrips: 0,
};

type S = StoryAPI<Widen<typeof flags>>;

/** Ustawia cel na identyfikatorze na podstawie tego, co już zrobione. */
function nextGoal(s: S): void {
  const f = s.flags;
  if (!f.get('mailRead') && !f.get('triedHatch')) return s.objective('cel.laptop');
  if (f.get('mailRead') && !f.get('laptop')) return s.objective('cel.whatsapp');
  if (!f.get('hatchOpen')) return f.get('triedHatch') ? s.objective('cel.belka') : s.objective('cel.wyjdz');
  if (!f.get('woolDown')) return s.objective('cel.welna');
  if (!f.get('laptop')) return s.objective('cel.laptop.zabierz');
  s.objective('cel.skok');
}

function hold(s: S, what: '' | 'belka' | 'welna'): void {
  s.flags.set('holding', what);
  s.player.hold(what === 'belka' ? beamMesh() : what === 'welna' ? woolMesh() : null);
}

/** Zegar do przodu o `minutes` (każdy „jeszcze jeden pas wełny”). */
function later(s: S, minutes: number): void {
  const { h, m } = s.clock.time;
  const t = h * 60 + m + minutes;
  s.clock.set(Math.floor(t / 60), t % 60);
}

export const poddaszeStory = defineStory({
  texts,
  speakers: speakerData as Speakers,
  flags,

  intro: {
    eyebrow: 'Prolog · poniedziałek · 07:40',
    title: 'Poddasze prezesa',
    text: 'Siódmy miesiąc ocieplania dachu. Miał być tylko jeden pas wełny przed pracą. Dziś pierwszy dzień obowiązkowego powrotu do biura.',
    hints: [
      '<kbd>klik</kbd> lub <kbd>WASD</kbd> chodzenie',
      '<kbd>E</kbd> interakcja, <kbd>spacja</kbd> dalej',
      '<kbd>1</kbd>–<kbd>9</kbd> wybór odpowiedzi, kółko myszy: przybliżenie',
    ],
    button: 'Wstań ze śpiwora',
  },

  outro: {
    eyebrow: 'Koniec prologu',
    title: 'Prezes opuścił poddasze',
    text: 'Lądowanie miękkie. Wełna gryzie. Tymczasem w biurze na dziesiątym piętrze…',
    button: 'Do biura',
  },

  async start(s) {
    s.objective('cel.laptop');
    await s.say('start');
  },

  interactions: {
    laptop: {
      label: 'Laptop',
      async use(s) {
        const f = s.flags;
        if (f.get('laptop')) return s.say('laptop.spakowany');
        if (!f.get('mailRead')) {
          const choice = await s.say('laptop.mail');
          await s.say(choice === 0 ? 'laptop.mail.bede' : 'laptop.mail.zdalnie');
          f.set('mailRead', true);
          return nextGoal(s);
        }
        const choice = await s.say('laptop.grupa');
        await s.say(choice === 0 ? 'laptop.grupa.1' : choice === 1 ? 'laptop.grupa.2' : 'laptop.grupa.3');
        await s.say('laptop.pakuj');
        f.set('laptop', true);
        s.obj('laptop').state.taken = true;
        nextGoal(s);
      },
    },

    klapa: {
      label: 'Klapa strychowa',
      radius: 2.0,
      async use(s) {
        const f = s.flags;
        if (!f.get('hatchOpen')) {
          if (f.get('holding') === 'belka') {
            await s.say('klapa.podwaz');
            hold(s, '');
            f.set('hatchOpen', true);
            s.obj('klapa').state.open = true;
            await s.say('klapa.drabina');
            return nextGoal(s);
          }
          if (f.get('triedHatch')) return s.say('klapa.znowu');
          await s.say('klapa');
          f.set('triedHatch', true);
          return nextGoal(s);
        }
        if (!f.get('woolDown')) {
          if (f.get('holding') !== 'welna') return s.say('klapa.dziura');
          await s.say('klapa.welna');
          hold(s, '');
          f.set('woolDown', true);
          s.obj('klapa').state.wool = true;
          return nextGoal(s);
        }
        if (!f.get('laptop')) return s.say('klapa.bez.laptopa');
        if ((await s.say('klapa.skok')) !== 0) return s.say('klapa.jeszcze');
        const late = f.get('extraStrips') > 0;
        await s.say(late ? 'klapa.lot.pozno' : 'klapa.lot');
        s.end();
      },
    },

    belki: {
      label: 'Weź belkę',
      radius: 2.0,
      async use(s) {
        const f = s.flags;
        if (f.get('hatchOpen')) return s.say('belki.juz');
        if (f.get('holding') === 'belka') return s.say('belki.masz');
        const knowsWhy = f.get('triedHatch');
        await s.say(knowsWhy ? 'belki.dzwignia' : 'belki');
        hold(s, 'belka');
      },
    },

    welna: {
      label: 'Wełna mineralna',
      radius: 2.0,
      async use(s) {
        const f = s.flags;
        if (f.get('woolDown')) return s.say('welna.juz');
        if (f.get('hatchOpen')) {
          if (f.get('holding') === 'welna') return s.say('welna.masz');
          await s.say('welna.wez');
          return hold(s, 'welna');
        }
        // przed otwarciem klapy wełna kusi, żeby położyć „jeszcze jeden pas”
        if ((await s.say('welna')) !== 0) return s.say('welna.nie');
        const strips = f.get('extraStrips') + 1;
        f.set('extraStrips', strips);
        later(s, 25);
        await s.say(strips > 1 ? 'welna.pas.znowu' : 'welna.pas');
      },
    },

    okno: { label: 'Okno dachowe', radius: 2.0, use: (s) => s.say('okno') },
    spiwor: { label: 'Śpiwór', use: (s) => s.say('spiwor') },
    kreski: { label: 'Deska z kreskami', use: (s) => s.say('kreski') },
  },
});
