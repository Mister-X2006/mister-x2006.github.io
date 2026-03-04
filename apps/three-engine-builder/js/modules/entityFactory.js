import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const defaults = {
  box: { geometry: () => new THREE.BoxGeometry(1, 1, 1), color: 0x3ca0ff },
  sphere: { geometry: () => new THREE.SphereGeometry(0.65, 32, 32), color: 0xff8a3c },
  plane: { geometry: () => new THREE.PlaneGeometry(2, 2), color: 0x42d18f },
  capsule: { geometry: () => new THREE.CapsuleGeometry(0.4, 0.9, 6, 12), color: 0xbc8cff },
};

const defaultTransform = () => ({
  position: { x: 0, y: 0.5, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
});

const uid = () => `ent-${Math.random().toString(36).slice(2, 10)}`;

export function createEntity(kind) {
  const base = {
    id: uid(),
    kind,
    name: `${kind}-${Math.floor(Math.random() * 999)}`,
    transform: defaultTransform(),
    blocks: [],
  };

  if (kind === "point-light") {
    return { ...base, light: { type: "point", intensity: 1.3, color: "#ffffff" } };
  }
  if (kind === "directional-light") {
    return { ...base, light: { type: "directional", intensity: 1.0, color: "#ffffff" } };
  }

  return {
    ...base,
    mesh: { type: kind, color: `#${defaults[kind].color.toString(16).padStart(6, "0")}` },
  };
}

export function instantiateObject(entity) {
  if (entity.light) {
    const color = new THREE.Color(entity.light.color);
    const light = entity.light.type === "directional"
      ? new THREE.DirectionalLight(color, entity.light.intensity)
      : new THREE.PointLight(color, entity.light.intensity);
    light.castShadow = entity.light.type === "directional";
    return light;
  }

  const conf = defaults[entity.mesh.type] || defaults.box;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(entity.mesh.color || conf.color),
    roughness: 0.5,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(conf.geometry(), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
