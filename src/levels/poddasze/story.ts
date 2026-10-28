/**
 * Fabuła prologu „Poddasze prezesa”: siódmy miesiąc ocieplania dachu,
 * pierwszy dzień obowiązkowego powrotu do biura.
 *
 * Kolejność: laptop (mail; mem na grupę nie przechodzi, bo nie ma zasięgu) →
 * taboret pod oknem dachowym (zasięg) → klapa przybita listwą → belka jako dźwignia →
 * drabina spada → wełna na dół → odkurzacz (pełny worek, zapasowe na płytach GK) → skok.
 * Gracz może zacząć od klapy; cel na identyfikatorze zawsze wynika z flag (`nextGoal`).
 */
import { beamMesh, stoolHeld, woolMesh } from '../../prefabs/attic';
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
  /** mem nie przeszedł (brak zasięgu), laptop pod pachą */
  noSignal: false,
  stoolAtWindow: false,
  /** odkurzacz kichnął pyłem: worek pełny */
  triedVacuum: false,
  /** zapasowy worek wzięty z płyt GK */
  bag: false,
  vacuumed: false,
  /** co prezes niesie: '' | 'belka' | 'welna' | 'taboret' */
  holding: '',
  /** ile pasów wełny położył „po drodze” */
  extraStrips: 0,
};

type S = StoryAPI<Widen<typeof flags>>;
type Holding = '' | 'belka' | 'welna' | 'taboret';

/** Ustawia cel na identyfikatorze na podstawie tego, co już zrobione. */
function nextGoal(s: S): void {
  const f = s.flags;
  if (!f.get('mailRead') && !f.get('triedHatch')) return s.objective('cel.laptop');
  if (f.get('mailRead') && !f.get('laptop')) {
    if (!f.get('noSignal')) return s.objective('cel.whatsapp');
    const stoolReady = f.get('stoolAtWindow');
    return s.objective(stoolReady ? 'cel.zasieg.wejdz' : 'cel.zasieg');
  }
  if (!f.get('hatchOpen')) return f.get('triedHatch') ? s.objective('cel.belka') : s.objective('cel.wyjdz');
  if (!f.get('woolDown')) return s.objective('cel.welna');
  if (!f.get('laptop')) return s.objective('cel.laptop.zabierz');
  if (!f.get('vacuumed')) {
    const bag = f.get('bag'),
      fullBag = f.get('triedVacuum');
    return s.objective(bag ? 'cel.odkurz.worek' : fullBag ? 'cel.worek' : 'cel.odkurz');
  }
  s.objective('cel.skok');
}

function hold(s: S, what: Holding): void {
  const f = s.flags;
  // taboret odłożony gdziekolwiek indziej niż pod oknem wraca na swoje miejsce
  if (f.get('holding') === 'taboret' && what !== 'taboret') s.obj('taboret').state.taken = f.get('stoolAtWindow');
  if (what === 'taboret') s.obj('taboret').state.taken = true;
  f.set('holding', what);
  s.player.hold(what === 'belka' ? beamMesh() : what === 'welna' ? woolMesh() : what === 'taboret' ? stoolHeld() : null);
}

/** Z taboretu pod oknem: zasięg, mem na grupę, laptop spakowany. */
async function sendMeme(s: S): Promise<void> {
  await s.say('okno.zasieg');
  const choice = await s.say('laptop.grupa');
  await s.say(choice === 0 ? 'laptop.grupa.1' : choice === 1 ? 'laptop.grupa.2' : 'laptop.grupa.3');
  await s.say('laptop.pakuj');
  s.flags.set('laptop', true);
  nextGoal(s);
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
    eyebrow: 'Prolog · niedziela · 18:00',
    title: 'Poddasze prezesa',
    text: 'Siódmy miesiąc ocieplania dachu. Miał być tylko jeden pas wełny i drzemka po obiedzie. Jutro pierwszy dzień obowiązkowego powrotu do biura.',
    hints: [
      '<kbd>klik</kbd> lub <kbd>WASD</kbd> chodzenie',
      '<kbd>E</kbd> interakcja, <kbd>spacja</kbd> dalej',
      '<kbd>1</kbd>–<kbd>9</kbd> wybór odpowiedzi, kółko myszy: przybliżenie',
    ],
    button: 'Wstań ze śpiwora',
  },

  outro: {
    eyebrow: 'Koniec prologu · ciąg dalszy wkrótce',
    title: 'Prezes opuścił poddasze',
    text: 'Lądowanie miękkie. Wełna gryzie. Tymczasem w biurze na dziesiątym piętrze trwa jeszcze remont. Otwieramy wkrótce. Do tego czasu prezes pracuje… symbolicznie.',
    button: 'Jeszcze raz',
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
        if (f.get('noSignal')) return s.say('laptop.pod.pacha');
        await s.say('laptop.zasieg');
        const stoolReady = f.get('stoolAtWindow');
        await s.say(stoolReady ? 'laptop.zasieg.stoi' : 'laptop.zasieg.taboret');
        f.set('noSignal', true);
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
        const underArm = f.get('noSignal');
        if (!f.get('laptop')) return s.say(underArm ? 'klapa.bez.mema' : 'klapa.bez.laptopa');
        if (!f.get('vacuumed')) {
          await s.say('klapa.wlosy');
          return nextGoal(s);
        }
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

    okno: {
      label: 'Okno dachowe',
      radius: 2.0,
      async use(s) {
        const f = s.flags;
        const waiting = f.get('noSignal') && !f.get('laptop');
        if (f.get('holding') === 'taboret') {
          f.set('stoolAtWindow', true);
          s.obj('okno').state.stool = true;
          hold(s, '');
          await s.say('okno.taboret');
          return waiting ? sendMeme(s) : nextGoal(s);
        }
        if (waiting) return f.get('stoolAtWindow') ? sendMeme(s) : s.say('okno.za.nisko');
        await s.say('okno');
      },
    },

    taboret: {
      label: 'Taboret',
      async use(s) {
        const f = s.flags;
        if (f.get('stoolAtWindow')) return s.say('taboret.juz');
        if (f.get('holding') === 'taboret') return s.say('taboret.masz');
        const needed = f.get('noSignal');
        await s.say(needed ? 'taboret.zasieg' : 'taboret');
        hold(s, 'taboret');
      },
    },

    odkurzacz: {
      label: 'Odkurzacz',
      async use(s) {
        const f = s.flags;
        if (f.get('vacuumed')) return s.say('odkurzacz.juz');
        if (f.get('bag')) {
          await s.say('odkurzacz.worek');
          f.set('vacuumed', true);
          later(s, 5);
          return nextGoal(s);
        }
        if (f.get('triedVacuum')) return s.say('odkurzacz.pelny');
        await s.say('odkurzacz');
        f.set('triedVacuum', true);
        nextGoal(s);
      },
    },

    plyty: {
      label: 'Płyty GK',
      async use(s) {
        const f = s.flags;
        if (f.get('bag') || f.get('vacuumed')) return s.say('plyty.po');
        const fullBag = f.get('triedVacuum');
        await s.say(fullBag ? 'plyty.worek' : 'plyty');
        f.set('bag', true);
        nextGoal(s);
      },
    },

    spiwor: { label: 'Śpiwór', use: (s) => s.say('spiwor') },
    kreski: { label: 'Deska z kreskami', use: (s) => s.say('kreski') },
  },
});
