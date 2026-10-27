/**
 * Fabuła poziomu „Łódź +10”: poranek przed stand-upem.
 *
 * Kod mówi tylko CO się dzieje i KIEDY; teksty są w dialogi.txt,
 * a postacie w postacie.json. Klucze interakcji to identyfikatory
 * obiektów i postaci z level.ts.
 */
import { mugMesh } from '../../prefabs/props';
import type { Speakers } from '../../story/Dialogue';
import { defineStory } from '../../story/Story';
import texts from './dialogi.txt?raw';
import speakerData from './postacie.json';
import { X, Z } from './plan';

export const lodz10Story = defineStory({
  texts,
  speakers: speakerData as Speakers,

  flags: {
    sawMachine: false,
    kubaHelped: false,
    coffee: false,
    talkedBozena: false,
    radekTalks: 0,
  },

  intro: {
    eyebrow: 'Poniedziałek · 08:57',
    title: 'Open Space, piętro +10',
    text: 'Stand-up o 9:15 w sali „Persia”. Ekspres do kawy ma inne plany.',
    hints: [
      '<kbd>klik</kbd> lub <kbd>WASD</kbd> chodzenie',
      '<kbd>E</kbd> rozmowa i interakcja, <kbd>spacja</kbd> dalej',
      '<kbd>M</kbd> mapa piętra, kółko myszy: przybliżenie',
    ],
    button: 'Zacznij dzień',
  },

  outro: {
    eyebrow: '09:15 · Persia 10.03',
    title: 'Stand-up rozpoczęty',
    text: 'Trzynaście punktów agendy. Zaplanowano piętnaście minut. Powodzenia.',
    button: 'Jeszcze raz',
  },

  async start(s) {
    s.objective('cel.kawa');
    s.waypoint('ekspres');
    await s.say('start');
  },

  interactions: {
    ekspres: {
      label: 'Ekspres do kawy',
      radius: 2.1,
      async use(s) {
        const f = s.flags;
        if (f.get('coffee')) return s.say('ekspres.pelny');
        if (f.get('kubaHelped')) {
          await s.say('ekspres.naprawa');
          f.set('coffee', true);
          s.obj('ekspres').state.ready = true;
          s.player.hold(mugMesh());
          s.objective('cel.sala');
          s.waypoint('persia');
          return;
        }
        if (f.get('sawMachine')) return s.say('ekspres.znowu');
        await s.say('ekspres');
        f.set('sawMachine', true);
        s.objective('cel.kuba');
        s.waypoint('kuba');
      },
    },

    kuba: {
      label: 'Porozmawiaj ze Smol@rem',
      async use(s) {
        const f = s.flags;
        if (f.get('kubaHelped')) return s.say('kuba.pozniej');
        if (!f.get('sawMachine')) return s.say('kuba.nic');
        const choice = await s.say('kuba');
        await s.say(choice === 0 ? 'kuba.prosze' : 'kuba.analiza');
        f.set('kubaHelped', true);
        s.objective('cel.ekspres');
        s.waypoint('ekspres');
      },
    },

    bozena: {
      label: 'Porozmawiaj z Anią',
      async use(s) {
        if (s.flags.get('talkedBozena')) return s.say('bozena.pozniej');
        const choice = await s.say('bozena');
        await s.say(choice === 0 ? 'bozena.1' : 'bozena.2');
        s.flags.set('talkedBozena', true);
      },
    },

    ola: { label: 'Porozmawiaj z Kasią', use: (s) => s.say('ola') },
    marek: { label: 'Porozmawiaj z Marcinem', use: (s) => s.say('marek') },
    ania: { label: 'Zagadaj do Magdy', use: (s) => s.say('ania') },

    /** Radek: dużo o AI, zero efektów. Każda kolejna rozmowa to inna wymówka. */
    radek: {
      label: 'Porozmawiaj z Radkiem',
      async use(s) {
        const f = s.flags;
        const n = f.get('radekTalks');
        f.set('radekTalks', n + 1);
        if (f.get('coffee')) return s.say('radek.kawa');
        if (n === 0) {
          const choice = await s.say('radek');
          return s.say(choice === 0 ? 'radek.co' : 'radek.pomoc');
        }
        if (f.get('sawMachine') && !f.get('kubaHelped')) return s.say('radek.ekspres');
        return s.say(n % 2 ? 'radek.znowu' : 'radek.znowu2');
      },
    },
    fikus: { label: 'Obejrzyj fikusa', use: (s) => s.say('fikus') },
    drukarka: { label: 'Sprawdź drukarkę', use: (s) => s.say('drukarka') },
  },

  triggers: {
    /** wejście do sali Persia: bez kawy cofamy gracza, z kawą kończymy dzień */
    async persia(s) {
      if (!s.flags.get('coffee')) {
        s.teleportPlayer(X(1262), Z(372), 0);
        await s.say('sala.bez');
        return;
      }
      s.npc('bozena').place(X(1250), Z(250), Math.PI / 2);
      s.waypoint(null);
      s.clock.set(9, 15);
      await s.say('sala.koniec');
      s.end();
    },
  },
});
