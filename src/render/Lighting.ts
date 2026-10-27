import * as THREE from 'three';

/** Światło otoczenia + słońce z cieniem, które przesuwa się razem z kamerą. */
export class Lighting {
  readonly sun: THREE.DirectionalLight;
  readonly sky: THREE.HemisphereLight;
  private readonly sunOffset = new THREE.Vector3(-9, 16, 5);

  constructor(scene: THREE.Scene) {
    this.sky = new THREE.HemisphereLight(0xe6ecf2, 0x4b5059, 1.15);
    this.sun = new THREE.DirectionalLight(0xfff4e6, 1.9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 60 });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sky, this.sun, this.sun.target);
  }

  follow(target: THREE.Vector3): void {
    this.sun.position.copy(target).add(this.sunOffset);
    this.sun.target.position.copy(target);
  }
}
