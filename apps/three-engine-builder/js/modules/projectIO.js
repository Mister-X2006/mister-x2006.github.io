import { createProjectState } from "./state.js";

const STORAGE_KEY = "three-blueprint-engine-project";

export function saveToLocalStorage(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createProjectState();
  try {
    return JSON.parse(raw);
  } catch {
    return createProjectState();
  }
}

export function downloadJSON(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "three-blueprint-project.json";
  a.click();
  URL.revokeObjectURL(url);
}

function runtimeScript() {
  return `
import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.164.1/examples/jsm/controls/OrbitControls.js';
const project = window.__PROJECT__;
const root = document.querySelector('#app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
root.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#101317');
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(3,3,5);
new OrbitControls(camera, renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const clock = new THREE.Clock();
const keyboard = new Set();
addEventListener('keydown', e => keyboard.add(e.key));
addEventListener('keyup', e => keyboard.delete(e.key));
const objects = [];
for (const ent of project.entities) {
  let obj;
  if (ent.light) {
    obj = ent.light.type === 'directional'
      ? new THREE.DirectionalLight(ent.light.color, ent.light.intensity)
      : new THREE.PointLight(ent.light.color, ent.light.intensity);
  } else {
    const g = ent.mesh.type === 'sphere' ? new THREE.SphereGeometry(0.65, 32, 32)
      : ent.mesh.type === 'plane' ? new THREE.PlaneGeometry(2,2)
      : ent.mesh.type === 'capsule' ? new THREE.CapsuleGeometry(0.4,0.9,6,12)
      : new THREE.BoxGeometry(1,1,1);
    obj = new THREE.Mesh(g, new THREE.MeshStandardMaterial({color: ent.mesh.color || '#3ca0ff'}));
  }
  obj.position.set(ent.transform.position.x, ent.transform.position.y, ent.transform.position.z);
  obj.rotation.set(ent.transform.rotation.x, ent.transform.rotation.y, ent.transform.rotation.z);
  obj.scale.set(ent.transform.scale.x, ent.transform.scale.y, ent.transform.scale.z);
  objects.push({ ent, obj });
  scene.add(obj);
}
function tick() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  for (const {ent, obj} of objects) {
    for (const b of (ent.blocks || [])) {
      if (b.enabled === false) continue;
      if (b.type === 'spin') {
        obj.rotation.x += (b.speedX || 0) * dt;
        obj.rotation.y += (b.speedY || 0) * dt;
        obj.rotation.z += (b.speedZ || 0) * dt;
      }
      if (b.type === 'bob') obj.position.y = ent.transform.position.y + Math.sin(t * (b.speed || 1)) * (b.amplitude || 0.2);
      if (b.type === 'orbit') {
        const angle = t * (b.speed || 1);
        const radius = b.radius || 2;
        if (b.axis === 'x') {
          obj.position.y = Math.cos(angle) * radius;
          obj.position.z = Math.sin(angle) * radius;
        } else if (b.axis === 'z') {
          obj.position.x = Math.cos(angle) * radius;
          obj.position.y = Math.sin(angle) * radius;
        } else {
          obj.position.x = Math.cos(angle) * radius;
          obj.position.z = Math.sin(angle) * radius;
        }
      }
      if (b.type === 'keyboard-move') {
        const s = (b.speed || 2) * dt;
        if (keyboard.has('ArrowUp') || keyboard.has('w')) obj.position.z -= s;
        if (keyboard.has('ArrowDown') || keyboard.has('s')) obj.position.z += s;
        if (keyboard.has('ArrowLeft') || keyboard.has('a')) obj.position.x -= s;
        if (keyboard.has('ArrowRight') || keyboard.has('d')) obj.position.x += s;
      }
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});`;
}

export function exportStandaloneHTML(state) {
  const html = `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${state.meta.name}</title><style>html,body,#app{margin:0;height:100%;background:#101317;color:#fff;font-family:sans-serif}</style></head><body><div id="app"></div><script>window.__PROJECT__=${JSON.stringify(state)};<\/script><script type="module">${runtimeScript()}<\/script></body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "three-blueprint-export.html";
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportProjectZip(state) {
  const { default: JSZip } = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
  const zip = new JSZip();
  zip.file("index.html", `<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>${state.meta.name}</title><link rel=\"stylesheet\" href=\"style.css\"></head><body><div id=\"app\"></div><script src=\"project.json.js\"></script><script type=\"module\" src=\"runtime.js\"></script></body></html>`);
  zip.file("style.css", "html,body,#app{margin:0;height:100%;background:#101317;color:white;font-family:sans-serif}");
  zip.file("project.json", JSON.stringify(state, null, 2));
  zip.file("project.json.js", `window.__PROJECT__=${JSON.stringify(state)};`);
  zip.file("runtime.js", runtimeScript());

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "three-blueprint-export.zip";
  a.click();
  URL.revokeObjectURL(url);
}
