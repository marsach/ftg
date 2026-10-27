import * as THREE from 'three';

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();

  constructor(host: HTMLElement, background: number) {
    this.gl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.domElement.style.display = 'block';
    host.appendChild(this.gl.domElement);
    this.scene.background = new THREE.Color(background);
  }

  get canvas(): HTMLCanvasElement {
    return this.gl.domElement;
  }

  resize(width: number, height: number): void {
    this.gl.setSize(width, height);
  }

  render(camera: THREE.Camera): void {
    this.gl.render(this.scene, camera);
  }
}
