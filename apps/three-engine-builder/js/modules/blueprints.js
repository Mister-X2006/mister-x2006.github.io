const blockDefaults = {
  spin: { speedX: 0, speedY: 1.4, speedZ: 0 },
  bob: { amplitude: 0.4, speed: 1.8 },
  orbit: { radius: 2.5, speed: 1, axis: "y" },
  "keyboard-move": { speed: 2.2 },
};

export const createBlock = (type) => ({
  id: `blk-${Math.random().toString(36).slice(2, 10)}`,
  type,
  enabled: true,
  ...structuredClone(blockDefaults[type] || {}),
});

export function applyBlocks(entity, object3d, elapsed, delta, keyboard) {
  for (const block of entity.blocks || []) {
    if (block.enabled === false) continue;
    if (block.type === "spin") {
      object3d.rotation.x += (block.speedX || 0) * delta;
      object3d.rotation.y += (block.speedY || 0) * delta;
      object3d.rotation.z += (block.speedZ || 0) * delta;
    }

    if (block.type === "bob") {
      const originalY = entity.transform.position.y;
      object3d.position.y = originalY + Math.sin(elapsed * (block.speed || 1)) * (block.amplitude || 0.2);
    }

    if (block.type === "orbit") {
      const speed = block.speed || 1;
      const radius = block.radius || 2;
      const angle = elapsed * speed;
      if (block.axis === "x") {
        object3d.position.y = Math.cos(angle) * radius;
        object3d.position.z = Math.sin(angle) * radius;
      } else if (block.axis === "z") {
        object3d.position.x = Math.cos(angle) * radius;
        object3d.position.y = Math.sin(angle) * radius;
      } else {
        object3d.position.x = Math.cos(angle) * radius;
        object3d.position.z = Math.sin(angle) * radius;
      }
    }

    if (block.type === "keyboard-move") {
      const speed = (block.speed || 2) * delta;
      if (keyboard.has("ArrowUp") || keyboard.has("w")) object3d.position.z -= speed;
      if (keyboard.has("ArrowDown") || keyboard.has("s")) object3d.position.z += speed;
      if (keyboard.has("ArrowLeft") || keyboard.has("a")) object3d.position.x -= speed;
      if (keyboard.has("ArrowRight") || keyboard.has("d")) object3d.position.x += speed;
    }
  }
}
