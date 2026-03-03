const ui = {
  intensity: document.getElementById("intensity"),
  interval: document.getElementById("interval"),
  domCap: document.getElementById("domCap"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  resetBtn: document.getElementById("resetBtn"),
  status: document.getElementById("status"),
  level: document.getElementById("level"),
  fps: document.getElementById("fps"),
  domCount: document.getElementById("domCount"),
  memory: document.getElementById("memory"),
  longTasks: document.getElementById("longTasks"),
  log: document.getElementById("log"),
  stressArea: document.getElementById("stressArea")
};

let level = 0;
let runTimer = null;
let running = false;
let frameCount = 0;
let fpsTimer = null;
let lastFrame = performance.now();
let longTaskCounter = 0;
let hogArrays = [];

const log = (message) => {
  const ts = new Date().toLocaleTimeString();
  ui.log.textContent = `[${ts}] ${message}\n${ui.log.textContent}`.slice(0, 8000);
};

const updateStatus = (value) => {
  ui.status.textContent = value;
};

const setButtons = (isRunning) => {
  ui.startBtn.disabled = isRunning;
  ui.stopBtn.disabled = !isRunning;
};

const updateMemory = () => {
  if (performance.memory) {
    const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    ui.memory.textContent = usedMB.toFixed(1);
  } else {
    ui.memory.textContent = "Nicht verfügbar";
  }
};

const applyCpuLoad = (intensity) => {
  const iterations = intensity * 12000;
  let total = 0;
  for (let i = 0; i < iterations; i += 1) {
    total += Math.sqrt(i * Math.random());
  }
  return total;
};

const applyDomLoad = (intensity, domCap) => {
  const maxNodes = Math.min(domCap, intensity * 25 + level * 30);
  const toAdd = Math.max(8, Math.floor(intensity / 2));

  for (let i = 0; i < toAdd; i += 1) {
    if (ui.stressArea.childElementCount >= maxNodes) {
      ui.stressArea.removeChild(ui.stressArea.firstElementChild);
    }

    const node = document.createElement("div");
    node.className = "stress-node";
    node.style.background = `hsl(${(level * 7 + i * 13) % 360}, 60%, 35%)`;
    ui.stressArea.appendChild(node);
  }

  ui.domCount.textContent = String(ui.stressArea.childElementCount);
};

const applyMemoryLoad = (intensity) => {
  const size = intensity * 600;
  const chunk = new Array(size).fill(Math.random().toString(36));
  hogArrays.push(chunk);

  if (hogArrays.length > 45) {
    hogArrays = hogArrays.slice(-45);
  }
};

const tick = () => {
  const intensity = Number(ui.intensity.value);
  const domCap = Number(ui.domCap.value);

  const start = performance.now();
  applyCpuLoad(intensity);
  applyDomLoad(intensity, domCap);
  applyMemoryLoad(intensity);
  const elapsed = performance.now() - start;

  if (elapsed > 50) {
    longTaskCounter += 1;
    ui.longTasks.textContent = String(longTaskCounter);
  }

  level += 1;
  ui.level.textContent = String(level);
  updateMemory();

  if (elapsed > 200) {
    log(`Stufe ${level}: Sehr langsam (${elapsed.toFixed(1)}ms pro Schritt).`);
  } else if (level % 10 === 0) {
    log(`Stufe ${level}: Schrittzeit ${elapsed.toFixed(1)}ms.`);
  }
};

const beginFpsLoop = () => {
  const frame = (now) => {
    frameCount += 1;
    if (now - lastFrame >= 1000) {
      ui.fps.textContent = String(frameCount);
      frameCount = 0;
      lastFrame = now;
    }

    if (running) {
      fpsTimer = requestAnimationFrame(frame);
    }
  };

  fpsTimer = requestAnimationFrame(frame);
};

const start = () => {
  if (running) {
    return;
  }

  running = true;
  setButtons(true);
  updateStatus("Läuft");
  log("Stresstest gestartet.");

  const delay = Math.max(50, Number(ui.interval.value));
  runTimer = setInterval(tick, delay);
  beginFpsLoop();
};

const stop = () => {
  if (!running) {
    return;
  }

  running = false;
  setButtons(false);
  updateStatus("Gestoppt");

  clearInterval(runTimer);
  cancelAnimationFrame(fpsTimer);

  log(`Gestoppt bei Stufe ${level}.`);
};

const reset = () => {
  stop();

  level = 0;
  longTaskCounter = 0;
  hogArrays = [];
  ui.stressArea.innerHTML = "";
  ui.level.textContent = "0";
  ui.fps.textContent = "0";
  ui.domCount.textContent = "0";
  ui.longTasks.textContent = "0";
  ui.log.textContent = "";
  updateMemory();
  updateStatus("Bereit");
  log("Zurückgesetzt. Du kannst mit neuen Parametern starten.");
};

const setupObservers = () => {
  if ("PerformanceObserver" in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.duration > 50) {
          longTaskCounter += 1;
          ui.longTasks.textContent = String(longTaskCounter);
        }
      });
    });

    try {
      observer.observe({ type: "longtask", buffered: true });
    } catch {
      log("Long-Task-Observer wird von diesem Browser nicht unterstützt.");
    }
  }
};

ui.startBtn.addEventListener("click", start);
ui.stopBtn.addEventListener("click", stop);
ui.resetBtn.addEventListener("click", reset);

setupObservers();
updateMemory();
log("Bereit. Wähle Parameter und starte den Test.");
