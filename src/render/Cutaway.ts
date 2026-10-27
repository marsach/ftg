import * as THREE from 'three';
import type { IsoCamera } from './IsoCamera';

/**
 * Prześwietlenie ścian wokół gracza (ta sama technika co w Zryw '44).
 *
 * Materiał oznaczony jako „cut” dostaje w fragment shaderze test:
 * piksel leży w kole wokół gracza na ekranie ORAZ jest bliżej kamery niż gracz
 * → zostaje odrzucony. Brzeg koła jest rozpraszany wzorem 4×4 (dithering),
 * a wewnętrzne ściany przeciętych brył malujemy na ciemno, jak przekrój.
 */
export class Cutaway {
  readonly uniforms = {
    uCutCenter: { value: new THREE.Vector2(-9999, -9999) },
    uCutRadius: { value: 0 },
    uCutDepth: { value: 0 },
  };

  /** promień koła w metrach świata */
  radius = 1.7;
  /** na jakiej wysokości nad podłogą liczymy „środek” gracza */
  focusHeight = 1.0;
  /** o ile bliżej kamery niż gracz zaczyna się cięcie */
  depthMargin = 0.55;
  /** kolor wnętrza przeciętej bryły */
  interiorColor = new THREE.Color(0.105, 0.115, 0.135);

  private readonly tmp = new THREE.Vector3();

  /** Dopisuje test wycięcia do materiału opartego na shaderach three.js. */
  patch(material: THREE.Material): void {
    const u = this.uniforms;
    const ic = this.interiorColor;
    material.side = THREE.DoubleSide;
    material.shadowSide = THREE.FrontSide;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u);
      shader.fragmentShader =
        'uniform vec2 uCutCenter;\nuniform float uCutRadius;\nuniform float uCutDepth;\n' +
        shader.fragmentShader
          .replace(
            '#include <clipping_planes_fragment>',
            /* glsl */ `#include <clipping_planes_fragment>
            {
              float rr = length(gl_FragCoord.xy - uCutCenter);
              if (rr < uCutRadius && vViewPosition.z < uCutDepth) {
                float edge = smoothstep(uCutRadius * 0.82, uCutRadius, rr);
                vec2 q = mod(floor(gl_FragCoord.xy), 4.0);
                float b = mod(q.x * 4.0 + q.y * 7.0, 16.0) / 16.0;
                if (b >= edge) discard;
              }
            }`,
          )
          .replace(
            '#include <dithering_fragment>',
            /* glsl */ `#include <dithering_fragment>
            if (!gl_FrontFacing) gl_FragColor.rgb = vec3(${ic.r.toFixed(3)}, ${ic.g.toFixed(3)}, ${ic.b.toFixed(3)});`,
          );
    };
    material.customProgramCacheKey = () => 'cutaway';
  }

  /** Aktualizuje środek, głębokość i promień na podstawie pozycji gracza. */
  update(focus: THREE.Vector3, iso: IsoCamera, canvas: HTMLCanvasElement, dt: number): void {
    const cam = iso.camera;
    this.tmp.set(focus.x, this.focusHeight, focus.z).project(cam);
    this.uniforms.uCutCenter.value.set((this.tmp.x * 0.5 + 0.5) * canvas.width, (this.tmp.y * 0.5 + 0.5) * canvas.height);

    this.tmp.set(focus.x, this.focusHeight, focus.z).applyMatrix4(cam.matrixWorldInverse);
    this.uniforms.uCutDepth.value = -this.tmp.z - this.depthMargin;

    const targetPx = (this.radius / iso.visibleHeight) * canvas.height;
    const r = this.uniforms.uCutRadius;
    r.value += (targetPx - r.value) * Math.min(1, dt * 8);
  }
}

export const cutaway = new Cutaway();
