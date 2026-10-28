# Open Space · piętro +10

Izometryczna gra przygodowa w przeglądarce, zbudowana tak jak *Zryw '44*:
**Vite + TypeScript + Three.js**, zero modeli 3D (cała geometria powstaje w kodzie),
cieniowanie toon i prześwietlanie ścian wokół gracza. Poziom „Łódź +10” jest
przepisany z planu piętra.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gotowa strona w dist/ (działa z dowolnego podkatalogu)
npm run teksty     # sprawdza dialogi: brakujące klucze, nieużywane bloki, nieznane postacie
npm run typecheck
```

Sterowanie: klik lub WASD (chodzenie), E (rozmowa, interakcja), spacja (dalej),
1–9 (wybór opcji), M (mapa piętra), kółko myszy (przybliżenie).

Gra zaczyna się prologiem **„Poddasze prezesa”** (`levels/poddasze/`): siódmy miesiąc
kładzenia wełny, pierwszy dzień obowiązkowego powrotu do biura. Laptop (mail od Ani,
mem „niemdziela wieczur i humor popsuty” na grupę, zasięg tylko z taboretu pod oknem),
klapa przybita listwą, belka jako dźwignia, wełna na miękkie lądowanie, odkurzacz
z pełnym workiem (zapasowe leżą na płytach GK). Na razie prolog nie przechodzi do biura,
bo biuro jest w przeróbce: plansza końcowa zaczyna prolog od nowa, a adres `?poziom=biuro`
działa tylko w `npm run dev` (jak odblokować: komentarz w `main.ts`).

---

## Architektura

Trzy warstwy, które o sobie nie wiedzą więcej, niż muszą:

```
TREŚĆ (co)                    SILNIK (jak)                       WIDOK
levels/lodz10/                core/Game.ts   spina wszystko       render/   three.js
  level.ts     układ piętra   systems/       ruch, interakcje,    ui/       DOM
  story.ts     logika         world/         prefaby, nawigacja
  dialogi.txt  teksty         story/         dialogi, API fabuły
  postacie.json
```

* **Poziom** (`LevelDef`) to czyste dane: obrys, rekwizyty, postacie, strefy.
* **Historia** (`StoryDef`) to logika: flagi, co robi dany obiekt, co dzieje się w strefie.
  Fabuła nie dotyka three.js ani DOM-u. Ma do dyspozycji tylko `StoryAPI`
  (`say`, `objective`, `waypoint`, `flags`, `npc`, `obj`, `teleportPlayer`, `clock`, `end`).
* **Teksty** są w zwykłym pliku `.txt`, który może edytować ktoś, kto nie zna kodu.

```
src/
├─ main.ts                 wybiera poziom + historię i uruchamia grę
├─ core/
│  ├─ Game.ts              buduje świat, tworzy systemy, kieruje wejście, pętla
│  ├─ EventBus.ts          typowane zdarzenia (clock, objective, flag, dialogue:*)
│  ├─ Input.ts             klawiatura / mysz / dotyk → intencje (tap, action, choice, zoom)
│  ├─ Flags.ts             stan fabuły, typowany z definicji historii
│  └─ GameClock.ts         zegar gry na identyfikatorze
├─ render/
│  ├─ Cutaway.ts           ★ prześwietlanie ścian (shader z ditheringiem Bayera)
│  ├─ toon.ts              materiały toon z 3-stopniową rampą, cache materiałów
│  ├─ textures.ts          proceduralne tekstury: wykładzina, płytki, ekrany
│  ├─ IsoCamera.ts         kamera izometryczna, zoom, kierunki ekranu dla WASD
│  └─ Lighting.ts, Renderer.ts
├─ world/
│  ├─ prefab.ts            ★ API prefabów (definePrefab, ctx.block, ctx.place, ctx.part…)
│  ├─ LevelBuilder.ts      składa poziom, przelicza kolizje na świat (obrót, zagnieżdżenie)
│  ├─ batch.ts             scala statyczne meshe: ~3700 obiektów → ~230 (94 draw calls)
│  ├─ NavGrid.ts           siatka nawigacji + A* + prostowanie ścieżki
│  └─ level.ts             typy LevelDef / NpcDef / TriggerDef / MapData
├─ prefabs/                attic.ts (dach, klapa, belki, wełna), biurka, rzędy biurek, krzesła, ściany z drzwiami, ekspres, rośliny…
├─ characters/             szkielet postaci z brył + animacje (chód, siedzenie, pisanie)
├─ systems/                PlayerController, InteractionSystem, TriggerSystem
├─ story/
│  ├─ scriptFormat.js      parser dialogów (wspólny dla gry i `npm run teksty`)
│  ├─ Dialogue.ts          odtwarzanie: `const wybór = await say('klucz')`
│  └─ Story.ts             StoryAPI, defineStory
├─ ui/                     Hud (identyfikator), DialogueView, PromptView, Minimap, Overlay
├─ levels/poddasze/        prolog: poddasze prezesa (współrzędne w metrach)
└─ levels/lodz10/          poziom z planu piętra
```

Przepływ jednej klatki (`Game.frame`): systemy → postacie → animacje rekwizytów →
dialog → kamera → światło → prześwietlenie → minimapa → render.

Wejście trafia w jedno miejsce (`Game.routeInput`): przy otwartym dialogu
klik i spacja przewijają tekst, w przeciwnym razie idą do interakcji albo ruchu.

---

## Przepisy

### Nowa kwestia lub rozmowa

1. Dopisz blok w `levels/lodz10/dialogi.txt`:
   ```
   [ola.plotka]
   ola: Podobno w czwartek nie będzie owoców.
   - Skąd wiesz?
   - Nie wierzę.
   ```
2. Użyj go w `story.ts`: `const i = await s.say('ola.plotka')` (`i` to numer wybranej opcji).
3. `npm run teksty`, żeby sprawdzić, czy klucze się zgadzają.

### Nowa postać

* W `postacie.json`: `"tomek": { "name": "Tomek", "role": "Sales" }`.
* W `level.ts` (tablica `npcs`): `{ id: 'tomek', look: { shirt: 0x5a7a4a }, x: X(700), z: Z(800), ry: 0 }`.
  Siedząca przy biurku: `...seated('bw-3', 2), pose: 'sit', activity: 'typing'`.
* W `story.ts` (`interactions`): `tomek: { label: 'Porozmawiaj z Tomkiem', use: (s) => s.say('tomek') }`.

### Nowy obiekt do kliknięcia

Nadaj rekwizytowi `id` w `level.ts` i dodaj interakcję o tym samym kluczu:

```ts
b.add(printer, 1210, 680, { id: 'drukarka2', ry: 0 });
// story.ts
drukarka2: { label: 'Sprawdź drukarkę', use: (s) => s.say('drukarka') },
```

Obiekty z `id` nie są scalane z resztą geometrii, więc można w nie klikać i je zmieniać.

### Nowy prefab (mebel, rekwizyt)

```ts
// prefabs/props.ts
export const vendingMachine = definePrefab<{ color?: number }>('vending', (c, o) => {
  box(c.g, 0.9, 1.9, 0.8, mat(o.color ?? 0xb23a3a), 0, 0.95, 0);   // bryła
  const screen = box(c.g, 0.5, 0.3, 0.02, glow(0x9fd3ff), 0, 1.4, 0.41, { cast: false });
  c.part('screen', screen);           // dostępne z fabuły: s.obj('automat').parts.screen
  c.state.empty = false;              // stan resetowany przy nowej grze
  c.animate((dt, t) => (screen.visible = !c.state.empty || Math.sin(t * 4) > 0));
  c.block(0, 0, 0.9, 0.8);            // kolizja w układzie lokalnym
});
```

Prefab buduje się w swoim układzie lokalnym (przód w stronę +Z). Obrót,
pozycję i przeliczenie kolizji na świat robi `LevelBuilder`. Prefab może
zawierać inne prefaby (`c.place(desk, {...})`), tak jak `bench` składa rząd biurek.

### Strefa wyzwalająca

```ts
// level.ts
triggers: [{ id: 'kuchnia', rect: { x0: X(1250), x1: X(1360), z0: Z(400), z1: Z(652) } }]
// story.ts
triggers: { kuchnia: (s) => s.say('kuchnia.zapach') }
```

### Przestawienie czegoś na planie

Wszystkie współrzędne w `level.ts` to **piksele planu piętra** (1 px = 5 cm, środek
w pikselu 840 × 535, patrz `plan.ts`). Odczytaj nowe miejsce z obrazka i podmień liczby.
Ściany: `b.wall([x1, y1], [x2, y2], { doors: [środek drzwi wzdłuż ściany] })`.
Skośne ściany są automatycznie dzielone na krótkie odcinki.

### Nowe piętro / nowy dzień

Skopiuj `levels/lodz10/` (np. do `levels/lodz11/`), zmień układ, teksty i fabułę,
a w `main.ts` podaj nowy poziom i historię. `npm run teksty` sprawdza każdy folder w `levels/`.

### Nowa mechanika

Napisz klasę z `update(dt, t)` i opcjonalnym `reset()` (interfejs `System`),
utwórz ją w `Game` i dodaj do `this.systems`. Jeśli ma coś pokazywać, niech emituje
zdarzenie na `bus`, a komponent UI niech go słucha (tak działa zegar i cel na identyfikatorze).

---

## Wydajność

* Statyczna geometria jest scalana po zbudowaniu poziomu (`world/batch.ts`).
  W konsoli widać wynik: `scalono 3726 meshy w 233`.
* Materiały są współdzielone (`mat(kolor)` z cache), tekstury proceduralne powstają raz.
* Siatka nawigacji (ok. 58 tys. kratek) budowana jest przez „zamalowywanie”
  prostokątów przeszkód, a nie sprawdzanie każdej kratki z każdą przeszkodą.

## Debugowanie

W trybie `npm run dev` obiekt gry jest dostępny w konsoli jako `window.game`, np.:

```js
game.flags.snapshot()                          // stan fabuły
game.player.place(20, -4)                      // teleport
game.dialogue.charsPerSecond = 1e6             // natychmiastowy tekst
game.iso.maxView = 40; game.iso.zoom(3)        // widok całego piętra
```
