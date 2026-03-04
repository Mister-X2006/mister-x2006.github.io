import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.164.1/examples/jsm/controls/OrbitControls.js";
import { createProjectState, touchProject } from "./modules/state.js";
import { createEntity, instantiateObject } from "./modules/entityFactory.js";
import { createBlock, applyBlocks } from "./modules/blueprints.js";
import { saveToLocalStorage, loadFromLocalStorage, downloadJSON, exportStandaloneHTML, exportProjectZip } from "./modules/projectIO.js";

const canvas = document.getElementById("viewport");
const entityList = document.getElementById("entity-list");
const transformEditor = document.getElementById("transform-editor");
const blueprintList = document.getElementById("blueprint-list");
const projectName = document.getElementById("project-name");
const actorTypeSelect = document.getElementById("actor-type-select");
const blueprintWindow = document.getElementById("blueprint-window");

let state = loadFromLocalStorage();
if (!state.entities) state = createProjectState();
let selectedEntityId = state.entities[0]?.id || null;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0f1722");
scene.fog = new THREE.Fog(0x0f1722, 22, 80);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
camera.position.set(7, 5, 8);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0.8, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1.15);
sun.position.set(10, 16, 6);
sun.castShadow = true;
scene.add(sun);

const grid = new THREE.GridHelper(40, 40, 0x385a7e, 0x20354c);
scene.add(grid);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x101c2b, roughness: 0.95, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
floor.receiveShadow = true;
scene.add(floor);

const objectByEntity = new Map();
const keyboard = new Set();
addEventListener("keydown", (e) => keyboard.add(e.key));
addEventListener("keyup", (e) => keyboard.delete(e.key));

function resize() {
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);

function syncSceneObjects() {
  for (const old of objectByEntity.values()) scene.remove(old);
  objectByEntity.clear();

  for (const entity of state.entities) {
    const object = instantiateObject(entity);
    object.position.set(entity.transform.position.x, entity.transform.position.y, entity.transform.position.z);
    object.rotation.set(entity.transform.rotation.x, entity.transform.rotation.y, entity.transform.rotation.z);
    object.scale.set(entity.transform.scale.x, entity.transform.scale.y, entity.transform.scale.z);
    object.userData.entityId = entity.id;
    scene.add(object);
    objectByEntity.set(entity.id, object);
  }
}

function selectedEntity() {
  return state.entities.find((x) => x.id === selectedEntityId);
}

function renderEntityList() {
  entityList.innerHTML = "";
  for (const entity of state.entities) {
    const li = document.createElement("li");
    if (entity.id === selectedEntityId) li.classList.add("selected");
    li.innerHTML = `<span>${entity.name}</span><button title="Delete actor">✕</button>`;
    li.onclick = (e) => {
      if (e.target.closest("button")) return;
      selectedEntityId = entity.id;
      renderUI();
    };
    li.querySelector("button").onclick = () => {
      state.entities = state.entities.filter((x) => x.id !== entity.id);
      if (selectedEntityId === entity.id) selectedEntityId = state.entities[0]?.id || null;
      touchProject(state);
      syncSceneObjects();
      renderUI();
    };
    entityList.appendChild(li);
  }
}

function addRangeEditor(label, min, max, step, value, onChange) {
  const tpl = document.getElementById("range-input-template");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector(".label").textContent = `${label}: ${Number(value).toFixed(2)}`;
  const input = node.querySelector("input");
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.oninput = () => {
    node.querySelector(".label").textContent = `${label}: ${Number(input.value).toFixed(2)}`;
    onChange(Number(input.value));
  };
  return node;
}

function renderTransformEditor(entity) {
  transformEditor.innerHTML = "";
  if (!entity) return;

  const title = document.createElement("div");
  title.className = "small";
  title.textContent = `Selected Actor: ${entity.name} (${entity.kind})`;
  transformEditor.appendChild(title);

  for (const axis of ["x", "y", "z"]) {
    transformEditor.appendChild(addRangeEditor(`Location ${axis.toUpperCase()}`, -20, 20, 0.1, entity.transform.position[axis], (v) => {
      entity.transform.position[axis] = v;
      objectByEntity.get(entity.id)?.position.set(entity.transform.position.x, entity.transform.position.y, entity.transform.position.z);
      touchProject(state);
    }));
  }
  for (const axis of ["x", "y", "z"]) {
    transformEditor.appendChild(addRangeEditor(`Rotation ${axis.toUpperCase()}`, -3.14, 3.14, 0.01, entity.transform.rotation[axis], (v) => {
      entity.transform.rotation[axis] = v;
      objectByEntity.get(entity.id)?.rotation.set(entity.transform.rotation.x, entity.transform.rotation.y, entity.transform.rotation.z);
      touchProject(state);
    }));
  }
  for (const axis of ["x", "y", "z"]) {
    transformEditor.appendChild(addRangeEditor(`Scale ${axis.toUpperCase()}`, 0.1, 5, 0.05, entity.transform.scale[axis], (v) => {
      entity.transform.scale[axis] = v;
      objectByEntity.get(entity.id)?.scale.set(entity.transform.scale.x, entity.transform.scale.y, entity.transform.scale.z);
      touchProject(state);
    }));
  }

  if (entity.mesh) {
    const color = document.createElement("label");
    color.innerHTML = `<span>Material Color</span><input type="color" value="${entity.mesh.color}">`;
    color.querySelector("input").oninput = (e) => {
      entity.mesh.color = e.target.value;
      const mesh = objectByEntity.get(entity.id);
      mesh?.material?.color?.set(entity.mesh.color);
      touchProject(state);
    };
    transformEditor.appendChild(color);
  }

  if (entity.light) {
    transformEditor.appendChild(addRangeEditor("Light Intensity", 0, 8, 0.05, entity.light.intensity, (v) => {
      entity.light.intensity = v;
      const light = objectByEntity.get(entity.id);
      if (light) light.intensity = v;
      touchProject(state);
    }));
  }
}

function renderBlueprints(entity) {
  blueprintList.innerHTML = "";
  if (!entity) return;

  entity.blocks.forEach((block, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<div class="card-header"><strong class="card-title">${index + 1}. ${block.type}</strong><button>Remove</button></div>`;

    const enabled = document.createElement("label");
    enabled.innerHTML = `<span>Enabled</span><select><option value="true">True</option><option value="false">False</option></select>`;
    const selectEnabled = enabled.querySelector("select");
    selectEnabled.value = String(block.enabled !== false);
    selectEnabled.onchange = () => {
      block.enabled = selectEnabled.value === "true";
      touchProject(state);
    };
    card.appendChild(enabled);

    card.querySelector("button").onclick = () => {
      entity.blocks = entity.blocks.filter((b) => b.id !== block.id);
      touchProject(state);
      renderBlueprints(entity);
    };

    Object.entries(block).forEach(([key, value]) => {
      if (["id", "type", "enabled"].includes(key) || typeof value !== "number") return;
      card.appendChild(addRangeEditor(key, -10, 10, 0.05, value, (v) => {
        block[key] = v;
        touchProject(state);
      }));
    });

    if (block.type === "orbit") {
      const axisWrap = document.createElement("label");
      axisWrap.innerHTML = `<span>Orbit Axis</span><select><option value="x">x</option><option value="y">y</option><option value="z">z</option></select>`;
      const select = axisWrap.querySelector("select");
      select.value = block.axis;
      select.onchange = () => {
        block.axis = select.value;
        touchProject(state);
      };
      card.appendChild(axisWrap);
    }

    const info = document.createElement("div");
    info.className = "small";
    info.textContent = "Blueprint node. Execution order = top to bottom.";
    card.appendChild(info);
    blueprintList.appendChild(card);
  });
}

function renderUI() {
  renderEntityList();
  const selected = selectedEntity();
  renderTransformEditor(selected);
  renderBlueprints(selected);
  projectName.textContent = `${state.meta.name} • Actors: ${state.entities.length}`;
}

document.getElementById("add-actor-btn").onclick = () => {
  const entity = createEntity(actorTypeSelect.value);
  state.entities.push(entity);
  selectedEntityId = entity.id;
  touchProject(state);
  syncSceneObjects();
  renderUI();
};

for (const btn of document.querySelectorAll("[data-block]")) {
  btn.onclick = () => {
    const entity = selectedEntity();
    if (!entity) return;
    entity.blocks.push(createBlock(btn.dataset.block));
    touchProject(state);
    renderBlueprints(entity);
  };
}

document.getElementById("toggle-blueprint-window-btn").onclick = () => {
  const open = blueprintWindow.classList.toggle("open");
  blueprintWindow.setAttribute("aria-hidden", open ? "false" : "true");
};

document.getElementById("close-blueprint-window-btn").onclick = () => {
  blueprintWindow.classList.remove("open");
  blueprintWindow.setAttribute("aria-hidden", "true");
};

document.getElementById("focus-selected-btn").onclick = () => {
  const entity = selectedEntity();
  const obj = entity && objectByEntity.get(entity.id);
  if (!obj) return;
  controls.target.copy(obj.position);
  camera.position.set(obj.position.x + 4, obj.position.y + 3, obj.position.z + 4);
};

document.getElementById("new-project-btn").onclick = () => {
  state = createProjectState();
  selectedEntityId = null;
  syncSceneObjects();
  renderUI();
};

document.getElementById("save-project-btn").onclick = () => {
  saveToLocalStorage(state);
  downloadJSON(state);
};

document.getElementById("load-project-btn").onclick = () => document.getElementById("import-file-input").click();

document.getElementById("import-file-input").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state = JSON.parse(await file.text());
  selectedEntityId = state.entities[0]?.id || null;
  syncSceneObjects();
  renderUI();
};

document.getElementById("export-html-btn").onclick = () => exportStandaloneHTML(state);
document.getElementById("export-zip-btn").onclick = () => exportProjectZip(state);
document.getElementById("play-pause-btn").onclick = (e) => {
  state.paused = !state.paused;
  e.target.textContent = state.paused ? "Resume Editor Sim" : "Play In Editor";
};

const clock = new THREE.Clock();
function animate() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  if (!state.paused) {
    for (const entity of state.entities) {
      const obj = objectByEntity.get(entity.id);
      if (obj) applyBlocks(entity, obj, t, dt, keyboard);
    }
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

syncSceneObjects();
renderUI();
resize();
animate();
