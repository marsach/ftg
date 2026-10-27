import * as THREE from 'three';

/** Deterministyczny generator liczb losowych: tekstury wyglądają tak samo przy każdym starcie. */
export function rng(seed = 1): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTexture(
  width: number,
  height: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  draw(c.getContext('2d')!, width, height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Kopia tekstury powtarzanej co `metersPerRepeat` metrów na powierzchni w×d. */
export function tiled(base: THREE.Texture, w: number, d: number, metersPerRepeat: number): THREE.Texture {
  const t = base.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w / metersPerRepeat, d / metersPerRepeat);
  t.needsUpdate = true;
  return t;
}

const lazy = <T>(make: () => T) => {
  let v: T | undefined;
  return () => (v ??= make());
};

export interface SignLine {
  text: string;
  font: string;
  y: number;
}

export function signTexture(lines: SignLine[], bg: string, fg: string, w = 256, h = 96): THREE.CanvasTexture {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.textAlign = 'center';
    for (const l of lines) {
      g.font = l.font;
      g.fillText(l.text, w / 2, l.y);
    }
  });
}

/** Biblioteka proceduralnych tekstur. Każda tworzona raz, przy pierwszym użyciu. */
export const Tex = {
  /** wykładzina w płytkach 50×50 cm (jasna, barwiona kolorem strefy), jeden kafel tekstury = 2 m */
  carpet: lazy(() =>
    canvasTexture(256, 256, (g, w) => {
      const n = 4,
        s = w / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const alt = (i + j) % 2 === 1;
          g.fillStyle = alt ? '#bdbab3' : '#b3b0a9';
          g.fillRect(i * s, j * s, s, s);
          g.strokeStyle = 'rgba(255,255,255,.12)';
          g.lineWidth = 2;
          for (let k = 6; k < s; k += 9) {
            g.beginPath();
            if (alt) {
              g.moveTo(i * s + k, j * s);
              g.lineTo(i * s + k, j * s + s);
            } else {
              g.moveTo(i * s, j * s + k);
              g.lineTo(i * s + s, j * s + k);
            }
            g.stroke();
          }
        }
      g.strokeStyle = 'rgba(0,0,0,.18)';
      for (let i = 0; i <= n; i++) {
        g.beginPath();
        g.moveTo(i * s, 0);
        g.lineTo(i * s, w);
        g.moveTo(0, i * s);
        g.lineTo(w, i * s);
        g.stroke();
      }
    }),
  ),

  /** płytki kuchenne 50×50 cm, jeden kafel tekstury = 1 m */
  tile: lazy(() =>
    canvasTexture(128, 128, (g, w) => {
      g.fillStyle = '#d6d0c4';
      g.fillRect(0, 0, w, w);
      g.strokeStyle = '#b9b2a4';
      g.lineWidth = 3;
      for (let i = 0; i <= 2; i++) {
        g.beginPath();
        g.moveTo(i * 64, 0);
        g.lineTo(i * 64, w);
        g.moveTo(0, i * 64);
        g.lineTo(w, i * 64);
        g.stroke();
      }
    }),
  ),

  /** ekran z arkuszem kalkulacyjnym */
  sheet: lazy(() =>
    canvasTexture(128, 80, (g, w, h) => {
      const r = rng(7);
      g.fillStyle = '#eef3f6';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#2f6f8f';
      g.fillRect(0, 0, w, 9);
      for (let y = 13; y < h; y += 7)
        for (let x = 4; x < w; x += 24) {
          g.fillStyle = r() < 0.15 ? '#e8643c' : '#9fb3c0';
          g.fillRect(x, y, 8 + r() * 12, 3);
        }
    }),
  ),

  /** ekran z kodem */
  code: lazy(() =>
    canvasTexture(128, 80, (g, w, h) => {
      const r = rng(3);
      g.fillStyle = '#14191e';
      g.fillRect(0, 0, w, h);
      for (let y = 6; y < h; y += 6) {
        g.fillStyle = ['#7fc98f', '#d9c27a', '#8fb6d9'][Math.floor(r() * 3)];
        g.fillRect(6 + Math.floor(r() * 4) * 6, y, 10 + r() * 60, 2.5);
      }
    }),
  ),

  /** slajd na ekranie w sali konferencyjnej */
  slide: lazy(() =>
    canvasTexture(256, 144, (g, w) => {
      const r = rng(11);
      g.fillStyle = '#f4f3ef';
      g.fillRect(0, 0, w, 144);
      g.fillStyle = '#e8643c';
      g.fillRect(0, 0, w, 10);
      g.fillStyle = '#1f252c';
      g.font = '600 20px sans-serif';
      g.fillText('Agenda (1/13)', 16, 42);
      g.fillStyle = '#8a939c';
      for (let i = 0; i < 5; i++) g.fillRect(16, 58 + i * 15, 120 + r() * 90, 6);
    }),
  ),
};

export type ScreenKind = 'sheet' | 'code' | 'slide';
