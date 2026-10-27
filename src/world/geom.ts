import * as THREE from 'three';

/** Krótkie helpery do składania brył. Wszystkie meshe rzucają i przyjmują cień, chyba że `cast: false`. */
export interface MeshOpts {
  cast?: boolean;
}

function add(parent: THREE.Object3D, mesh: THREE.Mesh, x: number, y: number, z: number, o: MeshOpts): THREE.Mesh {
  mesh.position.set(x, y, z);
  mesh.castShadow = o.cast ?? true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export const box = (
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  o: MeshOpts = {},
) => add(parent, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, y, z, o);

export const cyl = (
  parent: THREE.Object3D,
  rTop: number,
  rBottom: number,
  h: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  segments = 14,
  o: MeshOpts = {},
) => add(parent, new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material), x, y, z, o);

export const sphere = (parent: THREE.Object3D, r: number, material: THREE.Material, x = 0, y = 0, z = 0) =>
  add(parent, new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), material), x, y, z, {});

/** Płaszczyzna zwrócona w stronę +Z (po obrocie `ry`). Nie rzuca cienia. */
export function plane(
  parent: THREE.Object3D,
  w: number,
  h: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  ry = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
