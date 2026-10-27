import * as THREE from 'three';

/**
 * Kamera ortograficzna w rzucie izometrycznym, podążająca za celem.
 * Zna też kierunki „góra/prawo ekranu” rzutowane na podłogę,
 * żeby WASD chodziło zgodnie z tym, co widać.
 */
export class IsoCamera {
  readonly camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
  readonly target = new THREE.Vector3();
  /** kierunek i odległość kamery od celu */
  readonly offset = new THREE.Vector3(16, 16, 16);
  readonly screenUp = new THREE.Vector2();
  readonly screenRight = new THREE.Vector2();

  viewHeight = 13;
  minView = 7;
  maxView = 20;
  /** na wąskich ekranach pokaż co najmniej tyle metrów w poziomie */
  minWorldWidth = 10.5;
  followSharpness = 4;

  private aspect = 1;
  private readonly tmp = new THREE.Vector3();

  constructor() {
    this.screenUp.set(-this.offset.x, -this.offset.z).normalize();
    this.screenRight.set(-this.screenUp.y, this.screenUp.x);
  }

  /** wysokość widoku w jednostkach świata (po uwzględnieniu proporcji) */
  get visibleHeight(): number {
    return this.camera.top - this.camera.bottom;
  }

  resize(width: number, height: number): void {
    this.aspect = width / height;
    this.applyProjection();
  }

  zoom(factor: number): void {
    this.viewHeight = THREE.MathUtils.clamp(this.viewHeight * factor, this.minView, this.maxView);
    this.applyProjection();
  }

  snapTo(p: THREE.Vector3): void {
    this.target.copy(p);
    this.applyView();
  }

  follow(p: THREE.Vector3, dt: number): void {
    this.target.lerp(p, 1 - Math.exp(-dt * this.followSharpness));
    this.applyView();
  }

  /** punkt świata → piksele w obszarze o podanym rozmiarze */
  toScreen(p: THREE.Vector3, width: number, height: number, out = new THREE.Vector2()): THREE.Vector2 {
    this.tmp.copy(p).project(this.camera);
    return out.set((this.tmp.x * 0.5 + 0.5) * width, (-this.tmp.y * 0.5 + 0.5) * height);
  }

  private applyProjection(): void {
    const h = Math.max(this.viewHeight, this.aspect < 1 ? this.minWorldWidth / this.aspect : 0);
    const c = this.camera;
    c.left = (-h * this.aspect) / 2;
    c.right = (h * this.aspect) / 2;
    c.top = h / 2;
    c.bottom = -h / 2;
    c.updateProjectionMatrix();
  }

  private applyView(): void {
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }
}
