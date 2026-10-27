import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Scalanie statycznej geometrii.
 *
 * Poziom składa się z tysięcy małych brył (nogi biurek, monitory, krzesła).
 * Każda to osobne wywołanie rysowania, a z cieniami podwójne. Tutaj zbieramy
 * wszystkie nieruchome meshe z tym samym materiałem w jeden duży mesh,
 * więc liczba wywołań spada z tysięcy do kilkudziesięciu.
 *
 * Pomijane są poddrzewa oznaczone `userData.keep` (obiekty interaktywne,
 * animowane części), bo muszą zostać osobnymi obiektami.
 */
export function batchStatic(root: THREE.Object3D): { before: number; after: number } {
  root.updateMatrixWorld(true);
  const buckets = new Map<string, { material: THREE.Material; cast: boolean; geoms: THREE.BufferGeometry[] }>();
  const victims: THREE.Mesh[] = [];

  const visit = (o: THREE.Object3D) => {
    if (o.userData.keep) return;
    if ((o as THREE.Mesh).isMesh) {
      const m = o as THREE.Mesh;
      if (!Array.isArray(m.material)) {
        const key = `${m.material.uuid}|${m.castShadow ? 1 : 0}`;
        let b = buckets.get(key);
        if (!b) buckets.set(key, (b = { material: m.material, cast: m.castShadow, geoms: [] }));
        const g = m.geometry.clone();
        g.applyMatrix4(m.matrixWorld);
        b.geoms.push(g);
        victims.push(m);
      }
    }
    for (const c of o.children) visit(c);
  };
  visit(root);

  for (const m of victims) {
    m.removeFromParent();
    m.geometry.dispose();
  }

  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  let after = 0;
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geoms.map(normalize), false);
    b.geoms.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.applyMatrix4(inverse);
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = true;
    mesh.name = 'batched';
    root.add(mesh);
    after++;
  }
  return { before: victims.length, after };
}

/** mergeGeometries wymaga identycznego zestawu atrybutów i indeksów we wszystkich geometriach */
function normalize(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g;
  for (const name of Object.keys(out.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') out.deleteAttribute(name);
  }
  if (!out.index) {
    const count = out.attributes.position.count;
    out.setIndex(Array.from({ length: count }, (_, i) => i));
  }
  out.clearGroups();
  return out;
}
