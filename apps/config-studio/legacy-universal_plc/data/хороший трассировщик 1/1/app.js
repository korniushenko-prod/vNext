"use strict";

const STORAGE_KEY = "universal_plc_recovery_min";
const SIGNAL_TYPES = ["signal", "status", "request", "demand", "permit", "trip", "alarm", "command", "feedback", "config"];
const DATA_TYPES = ["bool", "float", "int", "enum", "event"];

const refs = {
  breadcrumbs: document.getElementById("breadcrumbs"),
  fileStatus: document.getElementById("file-status"),
  workspace: document.getElementById("workspace-main"),
  message: document.getElementById("message-box"),
  tree: document.getElementById("project-tree"),
  tabBar: document.getElementById("tab-bar"),
  inspectorTitle: document.getElementById("inspector-title"),
  inspectorContext: document.getElementById("inspector-context"),
  inspectorSelection: document.getElementById("inspector-selection"),
  inspectorNotes: document.getElementById("inspector-notes"),
  json: document.getElementById("json-preview"),
  importFile: document.getElementById("import-file"),
  openBtn: document.getElementById("open-json"),
  saveBtn: document.getElementById("save-project"),
  saveAsBtn: document.getElementById("save-as-json"),
  clearBtn: document.getElementById("clear-cache"),
  resetBtn: document.getElementById("reset-default"),
  chipProject: document.getElementById("chip-project"),
  chipObjects: document.getElementById("chip-objects"),
  chipSignals: document.getElementById("chip-signals"),
  chipLinks: document.getElementById("chip-links"),
  chipAlarms: document.getElementById("chip-alarms")
};

function clearNode(node) {
  if (node) node.innerHTML = "";
}

const tabs = [
  { id: "project", title: "Project" },
  { id: "system", title: "System" },
  { id: "hardware", title: "Hardware" },
  { id: "views", title: "Views" }
];

let state = {
  model: blankProject(),
  tab: "project",
  registry: "objects",
  objectIndex: -1,
  signalIndex: -1,
  signalName: "",
  objectMode: "interface",
  objectCreateOpen: false,
  objectCreateName: "",
  objectCreateDescription: "",
  objectQuickEditId: "",
  projectCreateOpen: false,
  projectCreateName: "",
  projectCreateDescription: "",
  signalComposerOpen: false,
  signalMonitorOpen: false,
  portEditor: { dir: "", id: "" },
  selection: { kind: "none", objectId: "", dir: "", portId: "", signalId: "" },
  routeConnect: { signalId: "", sourceObjectId: "", sourcePort: "", active: false, mouseX: 0, mouseY: 0 },
  routeDrag: { objectId: "", active: false, offsetX: 0, offsetY: 0, shellSelector: ".routing-map-shell" },
  signalComposer: defaultSignalComposer(),
  fileHandle: null,
  fileName: "",
  dirty: false
};

let routePreviewUpdater = null;

function blankProject() {
  const now = new Date().toISOString();
  return {
    schema_version: "1.0",
    project: {
      meta: { id: "new_project", name: "New Project", description: "", author: "OpenAI", created_at: now, updated_at: now },
      settings: { tick_ms: 100, timezone: "UTC" },
      hardware: { modules: [] },
      system: { id: "new_project_system", name: "New Project System", objects: [], signals: [], alarms: [], links: [] },
      views: []
    }
  };
}

function defaultTargetBinding() {
  return { objectId: "", mode: "existing", port: "", newPort: "" };
}

function defaultSignalComposer() {
  return {
    signalName: "",
    description: "",
    signal_type: "signal",
    data_type: "bool",
    sourceObjectId: "",
    sourceMode: "existing",
    sourcePort: "",
    newSourcePort: "",
    targets: [defaultTargetBinding()]
  };
}

function slugify(v) {
  return String(v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

function saveRecovery() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    model: state.model,
    tab: state.tab,
    registry: state.registry,
    objectIndex: state.objectIndex,
    signalIndex: state.signalIndex,
    objectMode: state.objectMode,
    selection: state.selection
  }));
}

function loadRecovery() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.model) {
      state.model = parsed.model;
      state.tab = parsed.tab || "project";
      state.registry = parsed.registry || "objects";
      state.objectIndex = parsed.objectIndex ?? -1;
      state.signalIndex = parsed.signalIndex ?? -1;
      state.objectMode = parsed.objectMode || "interface";
      state.selection = parsed.selection || { kind: "none", objectId: "", dir: "", portId: "", signalId: "" };
    }
  } catch (_) {}
}

function objects() { return state.model.project.system.objects; }
function signals() { return state.model.project.system.signals; }
function links() { return state.model.project.system.links; }
function alarms() { return state.model.project.system.alarms; }

function ensureModelRoot() {
  if (!state.model || typeof state.model !== "object") state.model = blankProject();
  state.model.schema_version = String(state.model.schema_version || "1.0");
  state.model.project = state.model.project && typeof state.model.project === "object" ? state.model.project : {};
  state.model.project.meta = state.model.project.meta && typeof state.model.project.meta === "object" ? state.model.project.meta : {};
  state.model.project.settings = state.model.project.settings && typeof state.model.project.settings === "object" ? state.model.project.settings : {};
  state.model.project.hardware = state.model.project.hardware && typeof state.model.project.hardware === "object" ? state.model.project.hardware : {};
  state.model.project.system = state.model.project.system && typeof state.model.project.system === "object" ? state.model.project.system : {};
  state.model.project.views = Array.isArray(state.model.project.views) ? state.model.project.views : [];

  const meta = state.model.project.meta;
  meta.name = String(meta.name || "New Project");
  meta.id = String(meta.id || slugify(meta.name));
  meta.description = String(meta.description || "");
  meta.author = String(meta.author || "OpenAI");
  meta.created_at = String(meta.created_at || new Date().toISOString());
  meta.updated_at = String(meta.updated_at || new Date().toISOString());

  const settings = state.model.project.settings;
  settings.tick_ms = Number(settings.tick_ms || 100);
  settings.timezone = String(settings.timezone || "UTC");

  const hardware = state.model.project.hardware;
  hardware.modules = Array.isArray(hardware.modules) ? hardware.modules : [];

  const system = state.model.project.system;
  system.id = String(system.id || `${meta.id}_system`);
  system.name = String(system.name || `${meta.name} System`);
  system.objects = Array.isArray(system.objects) ? system.objects : [];
  system.signals = Array.isArray(system.signals) ? system.signals : [];
  system.alarms = Array.isArray(system.alarms) ? system.alarms : [];
  system.links = Array.isArray(system.links) ? system.links : [];
}

function ensurePort(port, fallbackName) {
  if (!port || typeof port !== "object") port = {};
  port.name = String(port.name || fallbackName || "signal.new_port");
  port.id = String(port.id || slugify(port.name));
  port.signal_type = String(port.signal_type || inferSignalType(port.name));
  port.data_type = String(port.data_type || inferDataType(port.name));
  port.description = String(port.description || "");
  return port;
}

function ensureObject(o) {
  o.name = String(o.name || "New Object");
  o.description = String(o.description || "");
  o.type = String(o.type || "PackageObject");
  o.category = String(o.category || "package");
  o.id = String(o.id || slugify(o.name));
  o.interface = o.interface || {};
  o.interface.inputs = Array.isArray(o.interface.inputs) ? o.interface.inputs : [];
  o.interface.outputs = Array.isArray(o.interface.outputs) ? o.interface.outputs : [];
  o.interface.inputs = o.interface.inputs.map((port, index) => ensurePort(port, `signal.input_${index + 1}`));
  o.interface.outputs = o.interface.outputs.map((port, index) => ensurePort(port, `status.output_${index + 1}`));
  o.ui = o.ui && typeof o.ui === "object" ? o.ui : {};
  o.ui.routing = o.ui.routing && typeof o.ui.routing === "object" ? o.ui.routing : {};
  o.ui.routing.x = Number.isFinite(Number(o.ui.routing.x)) ? Number(o.ui.routing.x) : 0;
  o.ui.routing.y = Number.isFinite(Number(o.ui.routing.y)) ? Number(o.ui.routing.y) : 0;
  o.ui.routing.w = Number.isFinite(Number(o.ui.routing.w)) ? Number(o.ui.routing.w) : 260;
  o.ui.routing.h = Number.isFinite(Number(o.ui.routing.h)) ? Number(o.ui.routing.h) : 140;
  o.ui.routing.manual = Boolean(o.ui.routing.manual);
}

function ensureSignal(s) {
  s.name = String(s.name || "new.signal");
  s.id = String(s.id || slugify(s.name));
  s.description = String(s.description || "");
  s.signal_type = String(s.signal_type || inferSignalType(s.name));
  s.data_type = String(s.data_type || inferDataType(s.name));
  s.source = s.source || { object_id: "", port: "" };
  s.targets = Array.isArray(s.targets) ? s.targets : [];
}

function ensureSignalComposer() {
  const c = state.signalComposer && typeof state.signalComposer === "object" ? state.signalComposer : defaultSignalComposer();
  c.signalName = String(c.signalName || "");
  c.description = String(c.description || "");
  c.signal_type = String(c.signal_type || inferSignalType(c.signalName));
  c.data_type = String(c.data_type || inferDataType(c.signalName));
  c.sourceObjectId = String(c.sourceObjectId || "");
  c.sourceMode = c.sourceMode === "create" ? "create" : "existing";
  c.sourcePort = String(c.sourcePort || "");
  c.newSourcePort = String(c.newSourcePort || "");
  c.targets = Array.isArray(c.targets) && c.targets.length ? c.targets : [defaultTargetBinding()];
  c.targets = c.targets.map((target) => ({
    objectId: String(target.objectId || ""),
    mode: target.mode === "create" ? "create" : "existing",
    port: String(target.port || ""),
    newPort: String(target.newPort || "")
  }));
  state.signalComposer = c;
}

function normalize() {
  ensureModelRoot();
  objects().forEach(ensureObject);
  signals().forEach(ensureSignal);
  ensureSignalComposer();
  state.model.project.system.links = [];
  signals().forEach((s) => s.targets.forEach((t, i) => links().push({ id: `${s.id}_${i + 1}`, source: s.source, target: t, kind: s.signal_type, semantic: s.name })));
  if (state.objectIndex >= objects().length) state.objectIndex = objects().length - 1;
  if (state.signalIndex >= signals().length) state.signalIndex = signals().length - 1;
  if (state.objectQuickEditId && !objects().some((obj) => obj.id === state.objectQuickEditId)) state.objectQuickEditId = "";
  normalizeSelection();
}

function inferSignalType(name) {
  const prefix = String(name || "").split(".")[0];
  return SIGNAL_TYPES.includes(prefix) ? prefix : "signal";
}

function inferDataType(name) {
  return inferSignalType(name) === "request" ? "event" : "bool";
}

function touch(msg) {
  state.model.project.meta.updated_at = new Date().toISOString();
  state.dirty = true;
  saveRecovery();
  if (msg) setMessage(msg, "is-ok");
}

let renderQueued = false;
function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  const run = () => {
    renderQueued = false;
    render();
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
  else setTimeout(run, 0);
}

function setMessage(text, tone = "") {
  refs.message.textContent = text || "Ready.";
  refs.message.className = `message${tone ? ` ${tone}` : ""}`;
}

function resetSelection() {
  state.selection = { kind: "none", objectId: "", dir: "", portId: "", signalId: "" };
}

function findObjectById(id) {
  return objects().find((obj) => obj.id === id) || null;
}

function findSignalById(id) {
  return signals().find((signal) => signal.id === id) || null;
}

function findPort(objectId, dir, portId) {
  return objectPorts(objectId, dir).find((port) => port.id === portId) || null;
}

function selectObject(objectId) {
  const index = objects().findIndex((obj) => obj.id === objectId);
  if (index >= 0) state.objectIndex = index;
  state.selection = { kind: "object", objectId, dir: "", portId: "", signalId: "" };
}

function selectPort(objectId, dir, portId) {
  const index = objects().findIndex((obj) => obj.id === objectId);
  if (index >= 0) state.objectIndex = index;
  state.selection = { kind: "port", objectId, dir, portId, signalId: "" };
}

function selectSignal(signalId) {
  const index = signals().findIndex((signal) => signal.id === signalId);
  if (index >= 0) state.signalIndex = index;
  if (state.routeConnect.signalId && state.routeConnect.signalId !== signalId) {
    clearRouteConnect();
  }
  state.selection = { kind: "signal", objectId: "", dir: "", portId: "", signalId };
}

function removeSignal(signalId) {
  const index = signals().findIndex((signal) => signal.id === signalId);
  if (index < 0) return false;
  signals().splice(index, 1);
  if (state.selection.kind === "signal" && state.selection.signalId === signalId) resetSelection();
  if (state.signalIndex >= signals().length) state.signalIndex = signals().length - 1;
  touch("Signal removed.");
  return true;
}

function signalColor(signal, orderedSignals = null) {
  const list = Array.isArray(orderedSignals) && orderedSignals.length ? orderedSignals : signals();
  const count = Math.max(list.length, 1);
  const index = Math.max(0, list.findIndex((entry) => entry.id === signal.id));
  const hue = count === 1 ? 196 : Math.round((index / count) * 360 + 18) % 360;
  return `hsl(${hue} 84% 62%)`;
}

function normalizeSelection() {
  const sel = state.selection || {};
  if (sel.kind === "object") {
    if (!findObjectById(sel.objectId)) resetSelection();
    return;
  }
  if (sel.kind === "port") {
    if (!findObjectById(sel.objectId) || !findPort(sel.objectId, sel.dir, sel.portId)) resetSelection();
    return;
  }
  if (sel.kind === "signal") {
    if (!findSignalById(sel.signalId)) resetSelection();
    return;
  }
  resetSelection();
}

function objectOptions(filterFn) {
  return objects().filter(filterFn || (() => true)).map((obj) => ({ value: obj.id, label: obj.name }));
}

function objectPorts(objectId, dir) {
  const obj = findObjectById(objectId);
  if (!obj) return [];
  const list = dir === "outputs" ? obj.interface.outputs : obj.interface.inputs;
  return Array.isArray(list) ? list : [];
}

function preferredPort(ports, name) {
  if (!ports.length) return null;
  return ports.find((port) => port.name === name) || ports.find((port) => port.id === slugify(name)) || ports[0];
}

function nextPortName(list, baseName) {
  const used = new Set((Array.isArray(list) ? list : []).map((item) => item.name));
  if (!used.has(baseName)) return baseName;
  let index = 2;
  while (used.has(`${baseName}_${index}`)) index += 1;
  return `${baseName}_${index}`;
}

function nextUnusedTargetPort(signal, objectId, currentIndex = -1) {
  const ports = objectPorts(objectId, "inputs");
  const usedNames = new Set(
    (signal.targets || [])
      .filter((target, index) => index !== currentIndex && target.object_id === objectId)
      .map((target) => target.port)
  );
  const preferred = ports.find((port) => port.name === signal.name && !usedNames.has(port.name));
  if (preferred) return preferred;
  return ports.find((port) => !usedNames.has(port.name)) || null;
}

function canBindSignalToPort(signal, port) {
  if (!signal || !port) return false;
  return port.data_type === signal.data_type;
}

function ensureSignalTarget(signal, objectId, portName) {
  if (!signal || !objectId || !portName) return false;
  const exists = (signal.targets || []).some((target) => target.object_id === objectId && target.port === portName);
  if (exists) return false;
  signal.targets.push({ object_id: objectId, port: portName });
  return true;
}

function clearRouteConnect() {
  state.routeConnect = { signalId: "", sourceObjectId: "", sourcePort: "", signalType: "", dataType: "", active: false, mouseX: 0, mouseY: 0 };
}

function orthogonalPath(x1, y1, x2, y2) {
  if (Math.abs(y2 - y1) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const elbowX = x2 >= x1 ? x1 + Math.max(40, (x2 - x1) / 2) : x1 + 48;
  return `M ${x1} ${y1} L ${elbowX} ${y1} L ${elbowX} ${y2} L ${x2} ${y2}`;
}

function objectPortCount(obj) {
  return Math.max((obj.interface.inputs || []).length, (obj.interface.outputs || []).length, 1);
}

function updateRoutingObjectSize(obj) {
  const measuredW = obj.ui.routing.measuredW || 0;
  const measuredH = obj.ui.routing.measuredH || 0;
  const portRows = objectPortCount(obj);
  const estimatedW = Math.max(240, Math.min(360, 180 + Math.max(...[...(obj.interface.inputs || []), ...(obj.interface.outputs || [])].map((port) => String(port.name || "").length), 8) * 7));
  const estimatedH = Math.max(118, 86 + portRows * 30);
  obj.ui.routing.w = measuredW || estimatedW;
  obj.ui.routing.h = measuredH || estimatedH;
}

function buildSignalAdjacency() {
  const incoming = new Map();
  const outgoing = new Map();
  objects().forEach((obj) => {
    incoming.set(obj.id, new Set());
    outgoing.set(obj.id, new Set());
  });
  signals().forEach((signal) => {
    const sourceId = signal && signal.source ? signal.source.object_id : "";
    if (!sourceId) return;
    (signal.targets || []).forEach((target) => {
      const targetId = target ? target.object_id : "";
      if (!targetId || targetId === sourceId) return;
      if (!incoming.has(targetId)) incoming.set(targetId, new Set());
      if (!outgoing.has(sourceId)) outgoing.set(sourceId, new Set());
      incoming.get(targetId).add(sourceId);
      outgoing.get(sourceId).add(targetId);
    });
  });
  return { incoming, outgoing };
}

function buildRoutingComponents(outgoing) {
  const indexByNode = new Map();
  const lowByNode = new Map();
  const stack = [];
  const inStack = new Set();
  const components = [];
  const componentOf = new Map();
  let nextIndex = 0;

  function visit(nodeId) {
    indexByNode.set(nodeId, nextIndex);
    lowByNode.set(nodeId, nextIndex);
    nextIndex += 1;
    stack.push(nodeId);
    inStack.add(nodeId);

    (outgoing.get(nodeId) || new Set()).forEach((nextId) => {
      if (!indexByNode.has(nextId)) {
        visit(nextId);
        lowByNode.set(nodeId, Math.min(lowByNode.get(nodeId), lowByNode.get(nextId)));
        return;
      }
      if (inStack.has(nextId)) {
        lowByNode.set(nodeId, Math.min(lowByNode.get(nodeId), indexByNode.get(nextId)));
      }
    });

    if (lowByNode.get(nodeId) !== indexByNode.get(nodeId)) return;
    const component = [];
    let current = "";
    do {
      current = stack.pop();
      inStack.delete(current);
      componentOf.set(current, components.length);
      component.push(current);
    } while (current !== nodeId);
    components.push(component);
  }

  objects().forEach((obj) => {
    if (!indexByNode.has(obj.id)) visit(obj.id);
  });

  return { components, componentOf };
}

function computeRoutingLayers() {
  const { incoming, outgoing } = buildSignalAdjacency();
  const { components, componentOf } = buildRoutingComponents(outgoing);
  const compIncoming = new Map();
  const compOutgoing = new Map();
  const compLayer = new Map();

  components.forEach((_, compIndex) => {
    compIncoming.set(compIndex, new Set());
    compOutgoing.set(compIndex, new Set());
  });

  objects().forEach((obj) => {
    const srcComp = componentOf.get(obj.id);
    (outgoing.get(obj.id) || new Set()).forEach((nextId) => {
      const dstComp = componentOf.get(nextId);
      if (srcComp === dstComp) return;
      compOutgoing.get(srcComp).add(dstComp);
      compIncoming.get(dstComp).add(srcComp);
    });
  });

  const queue = [];
  components.forEach((_, compIndex) => {
    if (!(compIncoming.get(compIndex) || new Set()).size) {
      compLayer.set(compIndex, 0);
      queue.push(compIndex);
    }
  });
  if (!queue.length && components.length) {
    compLayer.set(0, 0);
    queue.push(0);
  }

  while (queue.length) {
    const current = queue.shift();
    const baseLayer = compLayer.get(current) || 0;
    (compOutgoing.get(current) || new Set()).forEach((nextComp) => {
      const candidate = baseLayer + 1;
      if (!compLayer.has(nextComp) || candidate > compLayer.get(nextComp)) {
        compLayer.set(nextComp, candidate);
        queue.push(nextComp);
      }
    });
  }

  const layers = new Map();
  objects().forEach((obj) => {
    layers.set(obj.id, compLayer.get(componentOf.get(obj.id)) || 0);
  });

  return { layers, incoming, outgoing };
}

function autoLayoutRoutingScene() {
  const { layers, incoming, outgoing } = computeRoutingLayers();
  const groups = new Map();
  objects().forEach((obj) => {
    updateRoutingObjectSize(obj);
    const layer = layers.get(obj.id) || 0;
    if (!groups.has(layer)) groups.set(layer, []);
    groups.get(layer).push(obj);
  });

  const orderedLayers = [...groups.keys()].sort((a, b) => a - b);
  const layerWidths = new Map();
  orderedLayers.forEach((layer) => {
    const width = Math.max(...(groups.get(layer) || []).map((obj) => obj.ui.routing.w || 260), 260);
    layerWidths.set(layer, width);
  });

  const layerX = new Map();
  let cursorX = 120;
  orderedLayers.forEach((layer) => {
    layerX.set(layer, cursorX);
    cursorX += (layerWidths.get(layer) || 260) + 240;
  });

  const centers = new Map();
  objects().forEach((obj, index) => {
    const currentCenter = Number(obj.ui.routing.y) + Number(obj.ui.routing.h) / 2;
    centers.set(obj.id, Number.isFinite(currentCenter) ? currentCenter : 100 + index * 180);
  });

  function barycenter(obj, primaryDir, secondaryDir) {
    const primaryRefs = primaryDir === "in" ? incoming.get(obj.id) : outgoing.get(obj.id);
    const secondaryRefs = secondaryDir === "in" ? incoming.get(obj.id) : outgoing.get(obj.id);
    const primaryValues = [...(primaryRefs || [])].map((id) => centers.get(id)).filter(Number.isFinite);
    if (primaryValues.length) {
      return primaryValues.reduce((sum, value) => sum + value, 0) / primaryValues.length;
    }
    const secondaryValues = [...(secondaryRefs || [])].map((id) => centers.get(id)).filter(Number.isFinite);
    if (secondaryValues.length) {
      return secondaryValues.reduce((sum, value) => sum + value, 0) / secondaryValues.length;
    }
    return centers.get(obj.id) || 0;
  }

  function objectWeight(obj) {
    return (incoming.get(obj.id) || new Set()).size + (outgoing.get(obj.id) || new Set()).size;
  }

  function orderLayer(layer, primaryDir) {
    const group = groups.get(layer) || [];
    group.sort((a, b) => {
      const aKey = barycenter(a, primaryDir, primaryDir === "in" ? "out" : "in");
      const bKey = barycenter(b, primaryDir, primaryDir === "in" ? "out" : "in");
      if (Math.abs(aKey - bKey) > 1) return aKey - bKey;
      const aCurrent = centers.get(a.id) || 0;
      const bCurrent = centers.get(b.id) || 0;
      if (Math.abs(aCurrent - bCurrent) > 1) return aCurrent - bCurrent;
      return objectWeight(b) - objectWeight(a) || a.name.localeCompare(b.name);
    });

    let cursorY = 80;
    group.forEach((obj) => {
      if (!obj.ui.routing.manual) {
        obj.ui.routing.x = layerX.get(layer) || 120;
        obj.ui.routing.y = cursorY;
      }
      centers.set(obj.id, Number(obj.ui.routing.y) + Number(obj.ui.routing.h) / 2);
      cursorY = Math.max(cursorY, Number(obj.ui.routing.y) + Number(obj.ui.routing.h) + 88);
    });
  }

  for (let pass = 0; pass < 4; pass += 1) {
    orderedLayers.forEach((layer) => orderLayer(layer, "in"));
    [...orderedLayers].reverse().forEach((layer) => orderLayer(layer, "out"));
  }
}

function createRoutingBounds(left, top, width, height, clearance) {
  const raw = {
    left: Math.round(left),
    top: Math.round(top),
    right: Math.round(left + width),
    bottom: Math.round(top + height)
  };
  return {
    raw,
    keepout: {
      left: raw.left - clearance,
      right: raw.right + clearance,
      top: raw.top - clearance,
      bottom: raw.bottom + clearance
    }
  };
}

function buildRoutingSceneContext(layers) {
  const clearance = 34;
  const lanePad = 28;
  const exitGap = 10;
  const coarseGrid = 96;
  const outerMargin = 96;
  const objectBounds = new Map();
  const layerBounds = new Map();
  const layerOrder = [];
  let sceneLeft = Infinity;
  let sceneRight = -Infinity;
  let sceneTop = Infinity;
  let sceneBottom = -Infinity;

  objects().forEach((obj) => {
    const layer = layers.get(obj.id) || 0;
    const bounds = createRoutingBounds(obj.ui.routing.x, obj.ui.routing.y, obj.ui.routing.w, obj.ui.routing.h, clearance);
    objectBounds.set(obj.id, { ...bounds, layer });
    sceneLeft = Math.min(sceneLeft, bounds.keepout.left);
    sceneRight = Math.max(sceneRight, bounds.keepout.right);
    sceneTop = Math.min(sceneTop, bounds.keepout.top);
    sceneBottom = Math.max(sceneBottom, bounds.keepout.bottom);

    if (!layerBounds.has(layer)) {
      layerBounds.set(layer, { ...bounds.keepout });
      layerOrder.push(layer);
    } else {
      const current = layerBounds.get(layer);
      current.left = Math.min(current.left, bounds.keepout.left);
      current.right = Math.max(current.right, bounds.keepout.right);
      current.top = Math.min(current.top, bounds.keepout.top);
      current.bottom = Math.max(current.bottom, bounds.keepout.bottom);
    }
  });

  return {
    clearance,
    lanePad,
    exitGap,
    coarseGrid,
    outerMargin,
    objectBounds,
    layerBounds,
    layerOrder: layerOrder.sort((a, b) => a - b),
    sceneLeft: Number.isFinite(sceneLeft) ? sceneLeft : 0,
    sceneRight: Number.isFinite(sceneRight) ? sceneRight : 0,
    sceneTop: Number.isFinite(sceneTop) ? sceneTop : 0,
    sceneBottom: Number.isFinite(sceneBottom) ? sceneBottom : 0
  };
}

function portAnchor(obj, port, dir, side) {
  const list = dir === "outputs" ? (obj.interface.outputs || []) : (obj.interface.inputs || []);
  const index = Math.max(0, list.findIndex((item) => item.name === port.name));
  const y = Math.round(obj.ui.routing.y + 69 + index * 24);
  const x = side === "right" ? Math.round(obj.ui.routing.x + obj.ui.routing.w + 18) : Math.round(obj.ui.routing.x - 18);
  return { x, y };
}

function elementRectRelativeToBoard(element, boardRect) {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left - boardRect.left,
    right: rect.right - boardRect.left,
    top: rect.top - boardRect.top,
    bottom: rect.bottom - boardRect.top,
    width: rect.width,
    height: rect.height
  };
}

function buildRenderedRoutingMetrics(layers, board, cardRefs, sourceDotRefs, targetDotRefs) {
  const boardRect = board.getBoundingClientRect();
  const clearance = 34;
  const lanePad = 28;
  const exitGap = 10;
  const coarseGrid = 96;
  const outerMargin = 96;
  const objectBounds = new Map();
  const layerBounds = new Map();
  const layerOrder = [];
  let sceneLeft = Infinity;
  let sceneRight = -Infinity;
  let sceneTop = Infinity;
  let sceneBottom = -Infinity;

  objects().forEach((obj) => {
    const card = cardRefs.get(obj.id);
    if (!card) return;
    const layer = layers.get(obj.id) || 0;
    const rect = elementRectRelativeToBoard(card, boardRect);
    const bounds = createRoutingBounds(rect.left, rect.top, rect.width, rect.height, clearance);
    objectBounds.set(obj.id, { ...bounds, layer });
    sceneLeft = Math.min(sceneLeft, bounds.keepout.left);
    sceneRight = Math.max(sceneRight, bounds.keepout.right);
    sceneTop = Math.min(sceneTop, bounds.keepout.top);
    sceneBottom = Math.max(sceneBottom, bounds.keepout.bottom);

    if (!layerBounds.has(layer)) {
      layerBounds.set(layer, { ...bounds.keepout });
      layerOrder.push(layer);
    } else {
      const current = layerBounds.get(layer);
      current.left = Math.min(current.left, bounds.keepout.left);
      current.right = Math.max(current.right, bounds.keepout.right);
      current.top = Math.min(current.top, bounds.keepout.top);
      current.bottom = Math.max(current.bottom, bounds.keepout.bottom);
    }
  });

  const sceneContext = {
    clearance,
    lanePad,
    exitGap,
    coarseGrid,
    outerMargin,
    objectBounds,
    layerBounds,
    layerOrder: layerOrder.sort((a, b) => a - b),
    sceneLeft: Number.isFinite(sceneLeft) ? sceneLeft : 0,
    sceneRight: Number.isFinite(sceneRight) ? sceneRight : boardRect.width,
    sceneTop: Number.isFinite(sceneTop) ? sceneTop : 0,
    sceneBottom: Number.isFinite(sceneBottom) ? sceneBottom : boardRect.height
  };

  function buildAnchorMap(dotRefs) {
    const anchors = new Map();
    dotRefs.forEach((dot, key) => {
      const rect = elementRectRelativeToBoard(dot, boardRect);
      anchors.set(key, {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      });
    });
    return anchors;
  }

  return {
    boardRect,
    sceneContext,
    sourceAnchors: buildAnchorMap(sourceDotRefs),
    targetAnchors: buildAnchorMap(targetDotRefs)
  };
}

function syncMeasuredRoutingObjectSizes(cardRefs) {
  let changed = false;
  cardRefs.forEach((card, objectId) => {
    const obj = findObjectById(objectId);
    if (!obj) return;
    const rect = card.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (Math.abs((obj.ui.routing.measuredW || 0) - width) > 1 || Math.abs((obj.ui.routing.measuredH || 0) - height) > 1) {
      obj.ui.routing.measuredW = width;
      obj.ui.routing.measuredH = height;
      obj.ui.routing.w = Math.max(obj.ui.routing.w || 0, width);
      obj.ui.routing.h = Math.max(obj.ui.routing.h || 0, height);
      changed = true;
    }
  });
  return changed;
}

function routeTrackKey(signal, target) {
  return `${signal.source.object_id}::${signal.source.port}=>${target.object_id}::${target.port}`;
}

function routingSignalsInOrder(layers = null) {
  const layerMap = layers instanceof Map ? layers : computeRoutingLayers().layers;
  return [...signals()].sort((a, b) => {
    const aObject = findObjectById(a.source.object_id);
    const bObject = findObjectById(b.source.object_id);
    const aLayer = aObject ? layerMap.get(aObject.id) || 0 : 0;
    const bLayer = bObject ? layerMap.get(bObject.id) || 0 : 0;
    if (aLayer !== bLayer) return aLayer - bLayer;
    const aY = aObject ? Number(aObject.ui.routing.y) || 0 : 0;
    const bY = bObject ? Number(bObject.ui.routing.y) || 0 : 0;
    if (aY !== bY) return aY - bY;
    if ((b.targets || []).length !== (a.targets || []).length) return (b.targets || []).length - (a.targets || []).length;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pointKey(point) {
  return `${Math.round(point.x)}:${Math.round(point.y)}`;
}

function normalizePoint(point) {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function samePoint(a, b) {
  return !!a && !!b && Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
}

function uniquePointList(points) {
  const unique = [];
  const seen = new Set();
  (points || []).forEach((point) => {
    if (!point) return;
    const normalized = normalizePoint(point);
    const key = pointKey(normalized);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(normalized);
  });
  return unique;
}

function compactOrthogonalPoints(points) {
  const normalized = (points || []).map(normalizePoint).filter(Boolean);
  const compact = [];
  normalized.forEach((point) => {
    if (!compact.length || !samePoint(compact[compact.length - 1], point)) compact.push(point);
  });
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 1; i < compact.length - 1; i += 1) {
      const prev = compact[i - 1];
      const current = compact[i];
      const next = compact[i + 1];
      if ((prev.x === current.x && current.x === next.x) || (prev.y === current.y && current.y === next.y)) {
        compact.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return compact;
}

function pathFromPoints(points) {
  const compact = compactOrthogonalPoints(points);
  if (!compact.length) return "";
  return compact.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd, gap = 6) {
  return Math.min(aEnd, bEnd) - Math.max(aStart, bStart) > gap;
}

function detangleOffsets(count, spacing = 10) {
  if (count <= 1) return [0];
  const center = (count - 1) / 2;
  return Array.from({ length: count }, (_, index) => Math.round((index - center) * spacing));
}

function detangleRenderedRoutePaths(routePaths) {
  const verticalGroups = new Map();
  const horizontalGroups = new Map();

  routePaths.forEach((entry, pathIndex) => {
    const points = compactOrthogonalPoints(entry.points);
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const isEndpointSegment = i === 0 || i === points.length - 2;
      if (a.x === b.x) {
        const top = Math.min(a.y, b.y);
        const bottom = Math.max(a.y, b.y);
        if (bottom - top < 24 || isEndpointSegment) continue;
        const key = String(Math.round(a.x));
        if (!verticalGroups.has(key)) verticalGroups.set(key, []);
        verticalGroups.get(key).push({ pathIndex, segIndex: i, start: top, end: bottom });
      } else if (a.y === b.y) {
        const left = Math.min(a.x, b.x);
        const right = Math.max(a.x, b.x);
        if (right - left < 24 || isEndpointSegment) continue;
        const key = String(Math.round(a.y));
        if (!horizontalGroups.has(key)) horizontalGroups.set(key, []);
        horizontalGroups.get(key).push({ pathIndex, segIndex: i, start: left, end: right });
      }
    }
  });

  const offsetBySegment = new Map();

  function assignOffsets(groups, orientation) {
    groups.forEach((items) => {
      const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end || a.pathIndex - b.pathIndex);
      let cluster = [];
      let clusterEnd = -Infinity;
      const flush = () => {
        if (cluster.length <= 1) {
          cluster = [];
          clusterEnd = -Infinity;
          return;
        }
        const unique = [];
        const seen = new Set();
        cluster.forEach((item) => {
          const key = `${item.pathIndex}:${item.segIndex}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        });
        const offsets = detangleOffsets(unique.length, 10);
        unique.forEach((item, index) => {
          offsetBySegment.set(`${orientation}:${item.pathIndex}:${item.segIndex}`, offsets[index]);
        });
        cluster = [];
        clusterEnd = -Infinity;
      };

      sorted.forEach((item) => {
        if (!cluster.length) {
          cluster = [item];
          clusterEnd = item.end;
          return;
        }
        if (item.start <= clusterEnd && cluster.some((existing) => intervalsOverlap(existing.start, existing.end, item.start, item.end))) {
          cluster.push(item);
          clusterEnd = Math.max(clusterEnd, item.end);
        } else {
          flush();
          cluster = [item];
          clusterEnd = item.end;
        }
      });
      flush();
    });
  }

  assignOffsets(verticalGroups, "V");
  assignOffsets(horizontalGroups, "H");

  return routePaths.map((entry, pathIndex) => {
    const points = compactOrthogonalPoints(entry.points);
    const detangled = [normalizePoint(points[0])];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = normalizePoint(points[i]);
      const b = normalizePoint(points[i + 1]);
      if (a.x === b.x) {
        const offset = offsetBySegment.get(`V:${pathIndex}:${i}`) || 0;
        if (offset) {
          const x = a.x + offset;
          detangled.push({ x, y: a.y }, { x, y: b.y }, b);
        } else {
          detangled.push(b);
        }
      } else if (a.y === b.y) {
        const offset = offsetBySegment.get(`H:${pathIndex}:${i}`) || 0;
        if (offset) {
          const y = a.y + offset;
          detangled.push({ x: a.x, y }, { x: b.x, y }, b);
        } else {
          detangled.push(b);
        }
      } else {
        detangled.push(b);
      }
    }
    return { signal: entry.signal, points: compactOrthogonalPoints(detangled) };
  });
}

function axisOfDirection(direction) {
  if (direction === "L" || direction === "R") return "H";
  if (direction === "U" || direction === "D") return "V";
  return "";
}

function directionBetween(a, b) {
  if (a.x === b.x) return b.y >= a.y ? "D" : "U";
  return b.x >= a.x ? "R" : "L";
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function rectsFromScene(sceneContext, excludedIds = null) {
  const excluded = excludedIds instanceof Set ? excludedIds : new Set(excludedIds || []);
  return [...sceneContext.objectBounds.entries()]
    .filter(([objectId]) => !excluded.has(objectId))
    .map(([, entry]) => entry.keepout);
}

function pointInsideRect(point, rect) {
  return point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom;
}

function pointInsideObstacles(point, obstacles) {
  return obstacles.some((rect) => pointInsideRect(point, rect));
}

function segmentIntersectsRect(a, b, rect) {
  if (a.x === b.x) {
    const x = a.x;
    if (x <= rect.left || x >= rect.right) return false;
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    return !(bottom <= rect.top || top >= rect.bottom);
  }
  if (a.y === b.y) {
    const y = a.y;
    if (y <= rect.top || y >= rect.bottom) return false;
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    return !(right <= rect.left || left >= rect.right);
  }
  return true;
}

function segmentHitsObstacles(a, b, obstacles) {
  return obstacles.some((rect) => segmentIntersectsRect(a, b, rect));
}

function validateOrthogonalPath(points, obstacles) {
  const compact = compactOrthogonalPoints(points);
  if (compact.length < 2) return false;
  for (let i = 0; i < compact.length - 1; i += 1) {
    const a = compact[i];
    const b = compact[i + 1];
    if (a.x !== b.x && a.y !== b.y) return false;
    if (segmentHitsObstacles(a, b, obstacles)) return false;
  }
  return true;
}

function createPortEndpoint(anchor, side, sceneContext, objectId) {
  const objectEntry = sceneContext.objectBounds.get(objectId);
  if (!objectEntry) {
    const normalizedAnchor = normalizePoint(anchor);
    return {
      objectId,
      side,
      anchor: normalizedAnchor,
      breakaway: normalizedAnchor,
      gate: normalizedAnchor
    };
  }

  const raw = objectEntry.raw;
  const keepout = objectEntry.keepout;
  const normalizedAnchor = normalizePoint(anchor);
  const direction = side === "right" ? 1 : -1;
  const breakawayX = direction > 0
    ? Math.max(normalizedAnchor.x + 6, raw.right + 8)
    : Math.min(normalizedAnchor.x - 6, raw.left - 8);
  let gateOffset = sceneContext.exitGap;
  let gateX = direction > 0 ? keepout.right + gateOffset : keepout.left - gateOffset;
  const others = rectsFromScene(sceneContext, new Set([objectId]));
  let attempts = 0;
  while (attempts < 12 && segmentHitsObstacles({ x: breakawayX, y: normalizedAnchor.y }, { x: gateX, y: normalizedAnchor.y }, others)) {
    gateOffset += 18;
    gateX = direction > 0 ? keepout.right + gateOffset : keepout.left - gateOffset;
    attempts += 1;
  }

  return {
    objectId,
    side,
    anchor: normalizedAnchor,
    breakaway: { x: Math.round(breakawayX), y: normalizedAnchor.y },
    gate: { x: Math.round(gateX), y: normalizedAnchor.y }
  };
}

function endpointLeadPoints(endpoint) {
  return compactOrthogonalPoints([endpoint.anchor, endpoint.breakaway, endpoint.gate]);
}

function projectPointToSegment(point, segment) {
  if (segment.a.x === segment.b.x) {
    return {
      x: segment.a.x,
      y: clamp(Math.round(point.y), Math.min(segment.a.y, segment.b.y), Math.max(segment.a.y, segment.b.y))
    };
  }
  return {
    x: clamp(Math.round(point.x), Math.min(segment.a.x, segment.b.x), Math.max(segment.a.x, segment.b.x)),
    y: segment.a.y
  };
}

function segmentsFromPoints(points) {
  const compact = compactOrthogonalPoints(points);
  const segments = [];
  for (let i = 0; i < compact.length - 1; i += 1) {
    const a = compact[i];
    const b = compact[i + 1];
    if (a.x === b.x || a.y === b.y) segments.push({ a, b });
  }
  return segments;
}

function appendTreeGeometry(points, treeGoals, treeSegments) {
  const compact = compactOrthogonalPoints(points);
  const goalMap = new Map(treeGoals.map((entry) => [pointKey(entry.point), entry]));
  compact.forEach((point) => {
    const key = pointKey(point);
    if (!goalMap.has(key)) {
      const entry = { point: normalizePoint(point), side: null };
      treeGoals.push(entry);
      goalMap.set(key, entry);
    }
  });
  segmentsFromPoints(compact).forEach((segment) => {
    treeSegments.push(segment);
  });
}

function buildAttachmentGoals(targetPoint, treeGoals, treeSegments) {
  const goals = treeGoals.map((entry) => ({ point: normalizePoint(entry.point), side: entry.side || null }));
  treeSegments.forEach((segment) => {
    const projection = projectPointToSegment(targetPoint, segment);
    goals.push({ point: projection, side: null });
  });
  const byKey = new Map();
  goals.forEach((goal) => {
    const key = pointKey(goal.point);
    if (!byKey.has(key)) byKey.set(key, goal);
  });
  return [...byKey.values()];
}

function ensureTrackUsage(trackUsage) {
  if (!(trackUsage instanceof Map)) {
    return { lanesX: new Map(), lanesY: new Map(), segments: [] };
  }
  if (!trackUsage.has("__routing_usage__")) {
    trackUsage.set("__routing_usage__", {
      lanesX: new Map(),
      lanesY: new Map(),
      segments: []
    });
  }
  return trackUsage.get("__routing_usage__");
}

function familyIdForSignal(signal) {
  return signal && signal.source ? `${signal.source.object_id}::${signal.source.port}` : "";
}

function reservePathTracks(points, trackUsage, signalId, familyId) {
  const usage = ensureTrackUsage(trackUsage);
  segmentsFromPoints(points).forEach((segment) => {
    if (segment.a.x === segment.b.x) {
      const x = Math.round(segment.a.x);
      const entry = usage.lanesX.get(x) || { count: 0, signals: new Set(), families: new Set() };
      if (!entry.signals.has(signalId)) entry.count += 1;
      entry.signals.add(signalId);
      if (familyId) entry.families.add(familyId);
      usage.lanesX.set(x, entry);
    } else {
      const y = Math.round(segment.a.y);
      const entry = usage.lanesY.get(y) || { count: 0, signals: new Set(), families: new Set() };
      if (!entry.signals.has(signalId)) entry.count += 1;
      entry.signals.add(signalId);
      if (familyId) entry.families.add(familyId);
      usage.lanesY.set(y, entry);
    }
    usage.segments.push({
      a: normalizePoint(segment.a),
      b: normalizePoint(segment.b),
      signalId,
      familyId: familyId || ""
    });
  });
}

function overlapLength1D(a1, a2, b1, b2) {
  const left = Math.max(Math.min(a1, a2), Math.min(b1, b2));
  const right = Math.min(Math.max(a1, a2), Math.max(b1, b2));
  return Math.max(0, right - left);
}

function segmentsCross(segmentA, segmentB) {
  if (segmentA.a.x === segmentA.b.x && segmentB.a.y === segmentB.b.y) {
    const x = segmentA.a.x;
    const y = segmentB.a.y;
    return x > Math.min(segmentB.a.x, segmentB.b.x) && x < Math.max(segmentB.a.x, segmentB.b.x) && y > Math.min(segmentA.a.y, segmentA.b.y) && y < Math.max(segmentA.a.y, segmentA.b.y);
  }
  if (segmentA.a.y === segmentA.b.y && segmentB.a.x === segmentB.b.x) {
    return segmentsCross(segmentB, segmentA);
  }
  return false;
}

function estimateEdgeOccupancyPenalty(a, b, trackUsage, signalId, familyId) {
  const usage = ensureTrackUsage(trackUsage);
  let penalty = 0;

  if (a.x === b.x) {
    const x = Math.round(a.x);
    usage.lanesX.forEach((entry, laneX) => {
      if (entry.signals.has(signalId)) return;
      const distance = Math.abs(laneX - x);
      if (distance > 24) return;
      const weight = distance === 0 ? 28 : distance <= 12 ? 14 : 6;
      penalty += entry.families.has(familyId) ? Math.round(weight * 0.4) : weight;
    });
  } else {
    const y = Math.round(a.y);
    usage.lanesY.forEach((entry, laneY) => {
      if (entry.signals.has(signalId)) return;
      const distance = Math.abs(laneY - y);
      if (distance > 24) return;
      const weight = distance === 0 ? 28 : distance <= 12 ? 14 : 6;
      penalty += entry.families.has(familyId) ? Math.round(weight * 0.4) : weight;
    });
  }

  const candidate = { a: normalizePoint(a), b: normalizePoint(b) };
  usage.segments.forEach((segment) => {
    if (segment.signalId === signalId) return;
    const sameFamily = familyId && familyId === segment.familyId;
    if (candidate.a.x === candidate.b.x && segment.a.x === segment.b.x && candidate.a.x === segment.a.x) {
      const overlap = overlapLength1D(candidate.a.y, candidate.b.y, segment.a.y, segment.b.y);
      if (overlap > 0) penalty += sameFamily ? 18 + overlap * 0.08 : 96 + overlap * 0.18;
      return;
    }
    if (candidate.a.y === candidate.b.y && segment.a.y === segment.b.y && candidate.a.y === segment.a.y) {
      const overlap = overlapLength1D(candidate.a.x, candidate.b.x, segment.a.x, segment.b.x);
      if (overlap > 0) penalty += sameFamily ? 18 + overlap * 0.08 : 96 + overlap * 0.18;
      return;
    }
    if (segmentsCross(candidate, segment)) {
      penalty += sameFamily ? 38 : 180;
    }
  });

  return penalty;
}

function buildRouteScopeBox(start, goals, sceneContext) {
  const xs = [start.x, ...goals.map((goal) => goal.point.x)];
  const ys = [start.y, ...goals.map((goal) => goal.point.y)];
  return {
    left: Math.min(...xs) - 220,
    right: Math.max(...xs) + 220,
    top: Math.min(...ys) - 220,
    bottom: Math.max(...ys) + 220,
    outerLeft: sceneContext.sceneLeft - sceneContext.outerMargin,
    outerRight: sceneContext.sceneRight + sceneContext.outerMargin,
    outerTop: sceneContext.sceneTop - sceneContext.outerMargin,
    outerBottom: sceneContext.sceneBottom + sceneContext.outerMargin
  };
}

function rectIntersectsBox(rect, box) {
  return !(rect.right < box.left || rect.left > box.right || rect.bottom < box.top || rect.top > box.bottom);
}

function registerLane(laneSet, value, min, max) {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded)) return;
  if (rounded < Math.floor(min) || rounded > Math.ceil(max)) return;
  laneSet.add(rounded);
}

function addGapLanes(sortedRects, axis, box, laneSet) {
  const minCoord = axis === "x" ? box.outerLeft : box.outerTop;
  const maxCoord = axis === "x" ? box.outerRight : box.outerBottom;
  let cursor = minCoord;
  sortedRects.forEach((rect) => {
    const start = axis === "x" ? rect.left : rect.top;
    const end = axis === "x" ? rect.right : rect.bottom;
    const gap = start - cursor;
    if (gap >= 44) {
      const center = cursor + gap / 2;
      registerLane(laneSet, center, minCoord, maxCoord);
      if (gap >= 84) {
        registerLane(laneSet, center - 18, minCoord, maxCoord);
        registerLane(laneSet, center + 18, minCoord, maxCoord);
      }
    }
    cursor = Math.max(cursor, end);
  });
  const tailGap = maxCoord - cursor;
  if (tailGap >= 44) {
    const center = cursor + tailGap / 2;
    registerLane(laneSet, center, minCoord, maxCoord);
    if (tailGap >= 84) {
      registerLane(laneSet, center - 18, minCoord, maxCoord);
      registerLane(laneSet, center + 18, minCoord, maxCoord);
    }
  }
}

function buildRouterLanes(start, goals, sceneContext, trackUsage) {
  const usage = ensureTrackUsage(trackUsage);
  const scope = buildRouteScopeBox(start, goals, sceneContext);
  const obstacles = rectsFromScene(sceneContext).filter((rect) => rectIntersectsBox(rect, scope));
  const xs = new Set();
  const ys = new Set();

  registerLane(xs, scope.outerLeft, scope.outerLeft, scope.outerRight);
  registerLane(xs, scope.outerRight, scope.outerLeft, scope.outerRight);
  registerLane(ys, scope.outerTop, scope.outerTop, scope.outerBottom);
  registerLane(ys, scope.outerBottom, scope.outerTop, scope.outerBottom);

  for (let x = scope.outerLeft; x <= scope.outerRight; x += sceneContext.coarseGrid) {
    registerLane(xs, x, scope.outerLeft, scope.outerRight);
  }
  for (let y = scope.outerTop; y <= scope.outerBottom; y += sceneContext.coarseGrid) {
    registerLane(ys, y, scope.outerTop, scope.outerBottom);
  }

  registerLane(xs, start.x, scope.outerLeft, scope.outerRight);
  registerLane(ys, start.y, scope.outerTop, scope.outerBottom);
  goals.forEach((goal) => {
    registerLane(xs, goal.point.x, scope.outerLeft, scope.outerRight);
    registerLane(ys, goal.point.y, scope.outerTop, scope.outerBottom);
  });

  obstacles.forEach((rect) => {
    registerLane(xs, rect.left - sceneContext.lanePad, scope.outerLeft, scope.outerRight);
    registerLane(xs, rect.right + sceneContext.lanePad, scope.outerLeft, scope.outerRight);
    registerLane(ys, rect.top - sceneContext.lanePad, scope.outerTop, scope.outerBottom);
    registerLane(ys, rect.bottom + sceneContext.lanePad, scope.outerTop, scope.outerBottom);
  });

  const byLeft = [...obstacles].sort((a, b) => a.left - b.left);
  const byTop = [...obstacles].sort((a, b) => a.top - b.top);
  addGapLanes(byLeft, "x", scope, xs);
  addGapLanes(byTop, "y", scope, ys);

  usage.lanesX.forEach((_, laneX) => {
    registerLane(xs, laneX, scope.outerLeft, scope.outerRight);
    registerLane(xs, laneX - 16, scope.outerLeft, scope.outerRight);
    registerLane(xs, laneX + 16, scope.outerLeft, scope.outerRight);
  });
  usage.lanesY.forEach((_, laneY) => {
    registerLane(ys, laneY, scope.outerTop, scope.outerBottom);
    registerLane(ys, laneY - 16, scope.outerTop, scope.outerBottom);
    registerLane(ys, laneY + 16, scope.outerTop, scope.outerBottom);
  });

  return {
    xs: [...xs].sort((a, b) => a - b),
    ys: [...ys].sort((a, b) => a - b),
    obstacles
  };
}

function buildOrthogonalGraph(start, goals, sceneContext, trackUsage) {
  const laneData = buildRouterLanes(start, goals, sceneContext, trackUsage);
  const nodes = new Map();
  const rowMap = new Map();
  const colMap = new Map();
  const obstacles = laneData.obstacles;

  laneData.xs.forEach((x) => {
    laneData.ys.forEach((y) => {
      const point = { x, y };
      if (pointInsideObstacles(point, obstacles)) return;
      const id = `${x}:${y}`;
      nodes.set(id, point);
      if (!rowMap.has(y)) rowMap.set(y, []);
      if (!colMap.has(x)) colMap.set(x, []);
      rowMap.get(y).push(point);
      colMap.get(x).push(point);
    });
  });

  const adjacency = new Map();
  nodes.forEach((_, id) => adjacency.set(id, []));

  rowMap.forEach((row) => {
    row.sort((a, b) => a.x - b.x);
    for (let i = 0; i < row.length - 1; i += 1) {
      const a = row[i];
      const b = row[i + 1];
      if (segmentHitsObstacles(a, b, obstacles)) continue;
      const aId = pointKey(a);
      const bId = pointKey(b);
      const length = Math.abs(a.x - b.x);
      adjacency.get(aId).push({ to: bId, length });
      adjacency.get(bId).push({ to: aId, length });
    }
  });

  colMap.forEach((col) => {
    col.sort((a, b) => a.y - b.y);
    for (let i = 0; i < col.length - 1; i += 1) {
      const a = col[i];
      const b = col[i + 1];
      if (segmentHitsObstacles(a, b, obstacles)) continue;
      const aId = pointKey(a);
      const bId = pointKey(b);
      const length = Math.abs(a.y - b.y);
      adjacency.get(aId).push({ to: bId, length });
      adjacency.get(bId).push({ to: aId, length });
    }
  });

  return { nodes, adjacency, obstacles };
}

class MinHeap {
  constructor(compare) {
    this.compare = compare;
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (!this.items.length) return null;
    const top = this.items[0];
    const tail = this.items.pop();
    if (this.items.length && tail) {
      this.items[0] = tail;
      this.bubbleDown(0);
    }
    return top;
  }

  bubbleUp(index) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.compare(this.items[current], this.items[parent]) >= 0) break;
      [this.items[current], this.items[parent]] = [this.items[parent], this.items[current]];
      current = parent;
    }
  }

  bubbleDown(index) {
    let current = index;
    while (true) {
      const left = current * 2 + 1;
      const right = current * 2 + 2;
      let best = current;
      if (left < this.items.length && this.compare(this.items[left], this.items[best]) < 0) best = left;
      if (right < this.items.length && this.compare(this.items[right], this.items[best]) < 0) best = right;
      if (best === current) break;
      [this.items[current], this.items[best]] = [this.items[best], this.items[current]];
      current = best;
    }
  }
}

function flowDirectionForRoute(start, goals) {
  const averageX = goals.reduce((sum, goal) => sum + goal.point.x, 0) / Math.max(1, goals.length);
  if (Math.abs(averageX - start.x) < 12) return "";
  return averageX >= start.x ? "R" : "L";
}

function edgePenaltyForState(currentDir, nextDir, fromPoint, toPoint, goalMeta, trackUsage, signalId, familyId, flowDir, options = {}) {
  let penalty = 0;
  if (currentDir && currentDir !== "S" && axisOfDirection(currentDir) !== axisOfDirection(nextDir)) penalty += 30;
  if (currentDir && currentDir !== "S" && currentDir !== nextDir && axisOfDirection(currentDir) === axisOfDirection(nextDir)) penalty += 18;
  if (flowDir === "R" && nextDir === "L") penalty += Math.min(90, 20 + Math.abs(toPoint.x - fromPoint.x) * 0.35);
  if (flowDir === "L" && nextDir === "R") penalty += Math.min(90, 20 + Math.abs(toPoint.x - fromPoint.x) * 0.35);
  if (options.startSide === "right" && (!currentDir || currentDir === "S") && nextDir === "L") penalty += 160;
  if (options.startSide === "left" && (!currentDir || currentDir === "S") && nextDir === "R") penalty += 160;
  if (goalMeta && goalMeta.side === "left" && nextDir === "L") penalty += 140;
  if (goalMeta && goalMeta.side === "right" && nextDir === "R") penalty += 140;
  penalty += estimateEdgeOccupancyPenalty(fromPoint, toPoint, trackUsage, signalId, familyId);
  return penalty;
}

function reconstructStatePath(finalStateKey, cameFrom, graph) {
  const states = [];
  let current = finalStateKey;
  while (current) {
    states.push(current);
    current = cameFrom.get(current) || "";
  }
  states.reverse();
  const points = states.map((stateKey) => {
    const [nodeId] = stateKey.split("|");
    return graph.nodes.get(nodeId);
  }).filter(Boolean);
  return compactOrthogonalPoints(points);
}

function fallbackOutsidePath(start, goals, sceneContext) {
  if (!goals.length) return null;
  const obstacles = rectsFromScene(sceneContext);
  const rankedGoals = [...goals].sort((a, b) => manhattan(start, a.point) - manhattan(start, b.point));
  const outerTop = sceneContext.sceneTop - sceneContext.outerMargin;
  const outerBottom = sceneContext.sceneBottom + sceneContext.outerMargin;
  const outerLeft = sceneContext.sceneLeft - sceneContext.outerMargin;
  const outerRight = sceneContext.sceneRight + sceneContext.outerMargin;
  const candidates = [];

  rankedGoals.slice(0, 4).forEach((goal) => {
    candidates.push([start, { x: start.x, y: outerTop }, { x: goal.point.x, y: outerTop }, goal.point]);
    candidates.push([start, { x: start.x, y: outerBottom }, { x: goal.point.x, y: outerBottom }, goal.point]);
    candidates.push([start, { x: outerLeft, y: start.y }, { x: outerLeft, y: goal.point.y }, goal.point]);
    candidates.push([start, { x: outerRight, y: start.y }, { x: outerRight, y: goal.point.y }, goal.point]);
  });

  const valid = candidates
    .map((points) => compactOrthogonalPoints(points))
    .filter((points) => validateOrthogonalPath(points, obstacles));

  if (!valid.length) return null;
  valid.sort((a, b) => {
    const aCost = segmentsFromPoints(a).reduce((sum, segment) => sum + manhattan(segment.a, segment.b), 0);
    const bCost = segmentsFromPoints(b).reduce((sum, segment) => sum + manhattan(segment.a, segment.b), 0);
    return aCost - bCost;
  });
  return valid[0];
}

function routeBetweenPointAndGoals(start, goals, sceneContext, trackUsage, signalId, familyId, options = {}) {
  const graph = buildOrthogonalGraph(start, goals, sceneContext, trackUsage);
  const startId = pointKey(start);
  if (!graph.nodes.has(startId)) return fallbackOutsidePath(start, goals, sceneContext);

  const goalMetaById = new Map();
  goals.forEach((goal) => {
    const id = pointKey(goal.point);
    if (graph.nodes.has(id)) goalMetaById.set(id, goal);
  });
  if (!goalMetaById.size) return fallbackOutsidePath(start, goals, sceneContext);

  const flowDir = flowDirectionForRoute(start, goals);
  const bestCost = new Map();
  const cameFrom = new Map();
  const open = new MinHeap((a, b) => a.f - b.f || a.g - b.g);
  const startStateKey = `${startId}|S`;
  bestCost.set(startStateKey, 0);
  open.push({ stateKey: startStateKey, nodeId: startId, dir: "S", g: 0, f: 0 });

  function heuristic(node) {
    let best = Infinity;
    goalMetaById.forEach((goal) => {
      best = Math.min(best, manhattan(node, goal.point));
    });
    return Number.isFinite(best) ? best : 0;
  }

  let finalStateKey = "";
  while (open.size) {
    const current = open.pop();
    if (!current) break;
    if (current.g !== bestCost.get(current.stateKey)) continue;
    if (goalMetaById.has(current.nodeId)) {
      finalStateKey = current.stateKey;
      break;
    }

    const fromPoint = graph.nodes.get(current.nodeId);
    (graph.adjacency.get(current.nodeId) || []).forEach((edge) => {
      const toPoint = graph.nodes.get(edge.to);
      if (!toPoint) return;
      const nextDir = directionBetween(fromPoint, toPoint);
      const goalMeta = goalMetaById.get(edge.to) || null;
      const extra = edgePenaltyForState(current.dir, nextDir, fromPoint, toPoint, goalMeta, trackUsage, signalId, familyId, flowDir, options);
      const nextG = current.g + edge.length + extra;
      const nextStateKey = `${edge.to}|${nextDir}`;
      if (nextG >= (bestCost.get(nextStateKey) ?? Infinity)) return;
      bestCost.set(nextStateKey, nextG);
      cameFrom.set(nextStateKey, current.stateKey);
      open.push({
        stateKey: nextStateKey,
        nodeId: edge.to,
        dir: nextDir,
        g: nextG,
        f: nextG + heuristic(toPoint)
      });
    });
  }

  if (!finalStateKey) return fallbackOutsidePath(start, goals, sceneContext);
  const path = reconstructStatePath(finalStateKey, cameFrom, graph);
  return validateOrthogonalPath(path, graph.obstacles) ? path : fallbackOutsidePath(start, goals, sceneContext);
}

function signalTargetSortScore(sourceEndpoint, targetEndpoint) {
  const dx = targetEndpoint.gate.x - sourceEndpoint.gate.x;
  const dy = Math.abs(targetEndpoint.gate.y - sourceEndpoint.gate.y);
  return Math.abs(dx) * 2 + dy + (dx >= 0 ? 220 : 0);
}

function buildSignalRouteSegments(signal, sceneContext, layers, trackUsage, renderMetrics = null) {
  const sourceObject = findObjectById(signal.source.object_id);
  const sourcePort = sourceObject ? objectPorts(sourceObject.id, "outputs").find((port) => port.name === signal.source.port) : null;
  if (!sourceObject || !sourcePort || !(signal.targets || []).length) return [];

  const sourceKey = `${sourceObject.id}::${sourcePort.name}`;
  const sourceAnchor = renderMetrics && renderMetrics.sourceAnchors ? renderMetrics.sourceAnchors.get(sourceKey) : null;
  const sourceEndpoint = createPortEndpoint(
    sourceAnchor || portAnchor(sourceObject, sourcePort, "outputs", "right"),
    "right",
    sceneContext,
    sourceObject.id
  );

  const targets = (signal.targets || []).map((target) => {
    const object = findObjectById(target.object_id);
    const port = object ? objectPorts(object.id, "inputs").find((candidate) => candidate.name === target.port) : null;
    if (!object || !port) return null;
    const targetKey = `${target.object_id}::${target.port}`;
    const anchor = renderMetrics && renderMetrics.targetAnchors ? renderMetrics.targetAnchors.get(targetKey) : null;
    const endpoint = createPortEndpoint(anchor || portAnchor(object, port, "inputs", "left"), "left", sceneContext, object.id);
    return { target, object, port, endpoint };
  }).filter(Boolean);

  if (!targets.length) return [];
  const familyId = familyIdForSignal(signal);
  const outputPaths = [];
  const sourceLead = endpointLeadPoints(sourceEndpoint);
  outputPaths.push(sourceLead);
  reservePathTracks(sourceLead, trackUsage, signal.id, familyId);

  const treeGoals = [{ point: sourceEndpoint.gate, side: sourceEndpoint.side }];
  const treeSegments = [];

  targets
    .sort((a, b) => signalTargetSortScore(sourceEndpoint, b.endpoint) - signalTargetSortScore(sourceEndpoint, a.endpoint))
    .forEach((entry) => {
      const attachGoals = buildAttachmentGoals(entry.endpoint.gate, treeGoals, treeSegments);
      const corridor = routeBetweenPointAndGoals(entry.endpoint.gate, attachGoals, sceneContext, trackUsage, signal.id, familyId, {
        startSide: entry.endpoint.side
      });
      if (!corridor || corridor.length < 2) return;
      const fullPath = compactOrthogonalPoints([...endpointLeadPoints(entry.endpoint), ...corridor.slice(1)]);
      outputPaths.push(fullPath);
      reservePathTracks(fullPath, trackUsage, signal.id, familyId);
      appendTreeGeometry(corridor, treeGoals, treeSegments);
    });

  return outputPaths;
}

function glossSignalSegments(segmentPaths) {
  const vertical = new Map();
  const horizontal = new Map();

  (segmentPaths || []).forEach((points) => {
    segmentsFromPoints(points).forEach((segment) => {
      if (segment.a.x === segment.b.x) {
        const x = Math.round(segment.a.x);
        if (!vertical.has(x)) vertical.set(x, []);
        vertical.get(x).push([Math.min(segment.a.y, segment.b.y), Math.max(segment.a.y, segment.b.y)]);
      } else if (segment.a.y === segment.b.y) {
        const y = Math.round(segment.a.y);
        if (!horizontal.has(y)) horizontal.set(y, []);
        horizontal.get(y).push([Math.min(segment.a.x, segment.b.x), Math.max(segment.a.x, segment.b.x)]);
      }
    });
  });

  const result = [];
  function mergeIntervals(intervals) {
    if (!intervals.length) return [];
    const sorted = [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged = [sorted[0].slice()];
    for (let i = 1; i < sorted.length; i += 1) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      if (current[0] <= last[1] + 1) {
        last[1] = Math.max(last[1], current[1]);
      } else {
        merged.push(current.slice());
      }
    }
    return merged;
  }

  vertical.forEach((intervals, x) => {
    mergeIntervals(intervals).forEach(([top, bottom]) => {
      result.push({ points: [{ x, y: top }, { x, y: bottom }] });
    });
  });
  horizontal.forEach((intervals, y) => {
    mergeIntervals(intervals).forEach(([left, right]) => {
      result.push({ points: [{ x: left, y }, { x: right, y }] });
    });
  });

  return result;
}

function computeRoutingContentBounds(sceneContext, routePaths) {
  let left = sceneContext.sceneLeft;
  let right = sceneContext.sceneRight;
  let top = sceneContext.sceneTop;
  let bottom = sceneContext.sceneBottom;

  (routePaths || []).forEach((entry) => {
    (entry.points || []).forEach((point) => {
      left = Math.min(left, point.x);
      right = Math.max(right, point.x);
      top = Math.min(top, point.y);
      bottom = Math.max(bottom, point.y);
    });
  });

  const margin = 120;
  return {
    left: Math.floor(left - margin),
    right: Math.ceil(right + margin),
    top: Math.floor(top - margin),
    bottom: Math.ceil(bottom + margin)
  };
}

function routeEdgePath(sourceAnchor, targetAnchor, trackIndex, options = null) {
  const stub = 14;
  const spacing = 18;
  const start = normalizePoint(sourceAnchor);
  const end = normalizePoint(targetAnchor);
  const startStub = { x: start.x + stub, y: start.y };
  const endStub = { x: end.x - stub, y: end.y };

  if (Math.abs(start.y - end.y) <= 4 && endStub.x > startStub.x) {
    return pathFromPoints([start, startStub, endStub, end]);
  }

  let laneX;
  if (endStub.x - startStub.x >= 48) {
    laneX = Math.round(startStub.x + (endStub.x - startStub.x) / 2 + trackIndex * spacing);
  } else {
    laneX = Math.round(Math.max(start.x, end.x) + 84 + trackIndex * spacing);
  }

  if (options && options.sceneTop !== undefined) {
    laneX = Math.max(laneX, Math.round(Math.max(start.x, end.x) + 48));
  }

  return pathFromPoints([start, startStub, { x: laneX, y: start.y }, { x: laneX, y: end.y }, endStub, end]);
}


function renamePortBindings(objectId, dir, oldName, newName, oldId, newId) {
  if (!objectId || !oldName || !newName) return;
  if (dir === "outputs") {
    signals().forEach((signal) => {
      if (signal.source.object_id === objectId && signal.source.port === oldName) {
        signal.source.port = newName;
      }
    });
    if (
      state.signalComposer.sourceMode === "existing" &&
      state.signalComposer.sourceObjectId === objectId &&
      state.signalComposer.sourcePort === oldId
    ) {
      state.signalComposer.sourcePort = newId;
    }
    return;
  }

  signals().forEach((signal) => {
    (signal.targets || []).forEach((target) => {
      if (target.object_id === objectId && target.port === oldName) {
        target.port = newName;
      }
    });
  });
  state.signalComposer.targets.forEach((target) => {
    if (target.mode === "existing" && target.objectId === objectId && target.port === oldId) {
      target.port = newId;
    }
  });
}

function selectWithCreateField(label, value, options, onChange, onCreate) {
  const field = document.createElement("div");
  field.className = "field";
  const lab = document.createElement("label");
  lab.textContent = label;
  const row = document.createElement("div");
  row.className = "binding-picker-row";
  const selectWrap = document.createElement("div");
  selectWrap.className = "binding-picker-select";
  const select = document.createElement("select");
  options.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === value) opt.selected = true;
    select.append(opt);
  });
  select.addEventListener("change", () => onChange(select.value));
  selectWrap.append(select);
  row.append(selectWrap);
  if (onCreate) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "port-mini-button icon-button";
    add.title = "Create new port";
    add.textContent = "+";
    add.onclick = onCreate;
    row.append(add);
  }
  field.append(lab, row);
  return field;
}

function plainPanel() {
  const el = document.createElement("section");
  el.className = "panel";
  return el;
}

function syncSourceBindingFromComposer() {
  const c = state.signalComposer;
  if (!c.signalName) {
    c.signal_type = inferSignalType("");
    c.data_type = inferDataType("");
  }
  if (c.sourceMode === "create") {
    if (!c.newSourcePort) c.newSourcePort = c.signalName || "status.new_signal";
    return;
  }
  const ports = objectPorts(c.sourceObjectId, "outputs");
  const match = preferredPort(ports, c.signalName);
  c.sourcePort = match ? match.id : "";
  if (match) {
    c.signal_type = match.signal_type || c.signal_type;
    c.data_type = match.data_type || c.data_type;
  }
}

function syncTargetBinding(target) {
  if (target.mode === "create") {
    if (!target.newPort) target.newPort = state.signalComposer.signalName || "signal.new_route";
    return;
  }
  const ports = objectPorts(target.objectId, "inputs");
  const match = preferredPort(ports, state.signalComposer.signalName);
  target.port = match ? match.id : "";
}

function syncAllTargetBindings() {
  state.signalComposer.targets.forEach(syncTargetBinding);
}

function touchSignalName(next) {
  state.signalComposer.signalName = next;
  state.signalComposer.signal_type = inferSignalType(next);
  state.signalComposer.data_type = inferDataType(next);
  if (state.signalComposer.sourceMode === "create" && (!state.signalComposer.newSourcePort || state.signalComposer.newSourcePort === "status.new_signal")) {
    state.signalComposer.newSourcePort = next || "status.new_signal";
  }
  state.signalComposer.targets.forEach((target) => {
    if (target.mode === "create" && (!target.newPort || target.newPort === "signal.new_route")) target.newPort = next || "signal.new_route";
  });
  syncSourceBindingFromComposer();
  syncAllTargetBindings();
}

function resolveOrCreatePort(objectId, dir, mode, selectedPortId, newPortName, signalType, dataType) {
  const obj = findObjectById(objectId);
  if (!obj) return null;
  const key = dir === "outputs" ? "outputs" : "inputs";
  const ports = obj.interface[key];
  if (mode === "create") {
    const name = String(newPortName || "").trim();
    if (!name) return null;
    let port = ports.find((item) => item.name === name);
    if (!port) {
      port = ensurePort({ name, signal_type: signalType, data_type: dataType }, name);
      ports.push(port);
    }
    return port;
  }
  return ports.find((item) => item.id === selectedPortId) || null;
}

function buildSignalBindingBlock(title, objectLabel, objectValue, objectChoices, onObjectChange, bindingLabel, mode, existingValue, existingChoices, onExistingChange, onToggleCreate, newNameValue, onNewNameInput, removeAction) {
  const block = document.createElement("div");
  block.className = "binding-block";

  if (title || removeAction) {
    const head = document.createElement("div");
    head.className = "binding-block-head";
    if (title) {
      const h = document.createElement("div");
      h.className = "binding-block-title";
      h.textContent = title;
      head.append(h);
    }
    if (removeAction) {
      const remove = iconButton("trash", "Remove target", true);
      remove.onclick = removeAction;
      head.append(remove);
    }
    block.append(head);
  }

  const grid = document.createElement("div");
  grid.className = "field-grid compact-grid";
  grid.append(selectField(objectLabel, objectValue, objectChoices, onObjectChange));

  const bindingField = document.createElement("div");
  bindingField.className = "field";
  const label = document.createElement("label");
  label.textContent = bindingLabel;
  const row = document.createElement("div");
  row.className = "binding-picker-row";
  const selectWrap = document.createElement("div");
  selectWrap.className = "binding-picker-select";
  const select = document.createElement("select");
  existingChoices.forEach((choice) => {
    const opt = document.createElement("option");
    opt.value = choice.value;
    opt.textContent = choice.label;
    if (choice.value === existingValue) opt.selected = true;
    select.append(opt);
  });
  select.addEventListener("change", () => onExistingChange(select.value));
  selectWrap.append(select);
  row.append(selectWrap);
  const add = document.createElement("button");
  add.type = "button";
  add.className = `port-mini-button icon-button${mode === "create" ? " is-active" : ""}`;
  add.title = mode === "create" ? "Use existing port" : "Create new port";
  add.textContent = "+";
  add.onclick = onToggleCreate;
  row.append(add);
  bindingField.append(label, row);
  grid.append(bindingField);
  if (mode === "create") {
    const newPortField = textField("New Port Name", newNameValue, onNewNameInput);
    newPortField.classList.add("full");
    grid.append(newPortField);
  }
  block.append(grid);
  return block;
}

function buildSignalBindingGroup(title, items, addAction) {
  const group = document.createElement("div");
  group.className = "binding-group";
  const head = document.createElement("div");
  head.className = "binding-group-head";
  const label = document.createElement("div");
  label.className = "binding-block-title";
  label.textContent = title;
  head.append(label);
  if (addAction) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "inline-plus-action";
    add.innerHTML = '<span class="inline-plus-action-icon">+</span><span>Add Target</span>';
    add.onclick = addAction;
    head.append(add);
  }
  group.append(head);
  items.forEach((item) => group.append(item));
  return group;
}

function iconButton(kind, title, danger = false) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `port-mini-button icon-button${danger ? " danger" : ""}`;
  btn.title = title;
  if (kind === "trash") {
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9Z"/></svg>';
  } else {
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58-1.92-3.32-2.39.96a7.15 7.15 0 0 0-1.63-.94L14.5 2h-5l-.73 3.18a7.15 7.15 0 0 0-1.63.94l-2.39-.96-1.92 3.32 2.03 1.58a7.43 7.43 0 0 0-.05.94c0 .31.02.63.05.94L2.83 14.5l1.92 3.32 2.39-.96c.5.39 1.05.71 1.63.94L9.5 22h5l.73-3.18c.58-.23 1.13-.55 1.63-.94l2.39.96 1.92-3.32-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>';
  }
  return btn;
}

function panel(title, desc = "") {
  const el = document.createElement("section");
  el.className = "panel";
  const h = document.createElement("div");
  h.className = "panel-header";
  const t = document.createElement("div");
  t.className = "panel-title";
  t.textContent = title;
  h.append(t);
  el.append(h);
  if (desc) {
    const d = document.createElement("div");
    d.className = "small-note";
    d.textContent = desc;
    el.append(d);
  }
  return el;
}

function textField(label, value, onInput) {
  const field = document.createElement("div");
  field.className = "field";
  const lab = document.createElement("label");
  lab.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  input.addEventListener("input", () => onInput(input.value));
  field.append(lab, input);
  return field;
}

function selectField(label, value, options, onChange) {
  const field = document.createElement("div");
  field.className = "field";
  const lab = document.createElement("label");
  lab.textContent = label;
  const select = document.createElement("select");
  options.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === value) opt.selected = true;
    select.append(opt);
  });
  const handle = () => onChange(select.value);
  select.addEventListener("change", handle);
  select.addEventListener("input", handle);
  field.append(lab, select);
  return field;
}

function renderTabs() {
  refs.tabBar.innerHTML = "";
  tabs.forEach((tab) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `tab-button${state.tab === tab.id ? " is-active" : ""}`;
    btn.textContent = tab.title;
    btn.onclick = () => { state.tab = tab.id; render(); };
    refs.tabBar.append(btn);
  });
}

function renderTree() {
  refs.tree.innerHTML = "";
  [
    { tab: "project", registry: "objects", text: "Project" },
    { tab: "system", registry: "objects", text: `System / Objects (${objects().length})` },
    { tab: "system", registry: "signals", text: `System / Signals & Routing (${signals().length})` },
    { tab: "system", registry: "links", text: `System / Link Mirror (${links().length})` },
    { tab: "system", registry: "alarms", text: `System / Alarms (${alarms().length})` },
    { tab: "hardware", registry: "objects", text: "Hardware / Modules" },
    { tab: "views", registry: "objects", text: "Views / Registry" }
  ].forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `tree-item${state.tab === item.tab && state.registry === item.registry ? " is-active" : ""}`;
    btn.textContent = item.text;
    btn.onclick = () => { state.tab = item.tab; state.registry = item.registry; render(); };
    refs.tree.append(btn);
  });
}

function renderProject() {
  const top = document.createElement("div");
  top.className = "project-top-grid";

  const start = panel("Project Start", "New, open, or continue. Saving stays in the topbar.");
  start.classList.add("panel-quiet");
  const row = document.createElement("div");
  row.className = "project-start-actions compact-actions";
  [
    ["New Project", "Blank", () => {
      state.projectCreateOpen = !state.projectCreateOpen;
      if (state.projectCreateOpen && !state.projectCreateName) state.projectCreateName = "";
      render();
    }],
    ["Open JSON", "Import", () => openProject()],
    ["Continue", "Current", () => {
      state.tab = "system";
      state.registry = "objects";
      render();
      setMessage("Continuing current project.", "is-ok");
    }]
  ].forEach(([label, sub, action], i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `start-card${i === 0 ? " is-primary" : ""}`;
    btn.innerHTML = `<strong>${label}</strong><span>${sub}</span>`;
    btn.onclick = action;
    row.append(btn);
  });
  start.append(row);

  if (state.projectCreateOpen) {
    const composer = document.createElement("div");
    composer.className = "project-composer";
    const heading = document.createElement("div");
    heading.className = "project-composer-heading";
    heading.innerHTML = "<strong>Create New Project</strong><span>Name it once. IDs and system identity will be generated automatically.</span>";
    composer.append(heading);
    const fields = document.createElement("div");
    fields.className = "field-grid compact-grid";
    fields.append(
      textField("Project Name", state.projectCreateName, (v) => { state.projectCreateName = v; }),
      textField("Description", state.projectCreateDescription, (v) => { state.projectCreateDescription = v; })
    );
    composer.append(fields);
    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.className = "btn primary";
    createBtn.textContent = "Create Project";
    createBtn.onclick = () => {
      const name = state.projectCreateName.trim();
      if (!name) return setMessage("Enter a project name first.", "is-error");
      const model = blankProject();
      model.project.meta.name = name;
      model.project.meta.id = slugify(name);
      model.project.meta.description = state.projectCreateDescription.trim();
      model.project.system.name = `${name} System`;
      model.project.system.id = `${slugify(name)}_system`;
      state.model = model;
      state.signalComposer = defaultSignalComposer();
      state.projectCreateOpen = false;
      state.projectCreateName = "";
      state.projectCreateDescription = "";
      state.objectIndex = -1;
      state.signalIndex = -1;
      state.objectQuickEditId = "";
      state.tab = "system";
      state.registry = "objects";
      touch(`Project created: ${name}.`);
      render();
    };
    composer.append(createBtn);
    start.append(composer);
  }

  const current = panel("Current Project", "Compact identity only. Technical metadata stays out of the way.");
  current.classList.add("panel-quiet");
  const currentMeta = document.createElement("div");
  currentMeta.className = "project-inline-meta";
  currentMeta.innerHTML = `<strong>${state.model.project.meta.name}</strong><span>${state.model.project.meta.id}</span>`;
  current.append(currentMeta);

  const summary = document.createElement("div");
  summary.className = "workspace-summary-grid";
  [
    ["System", state.model.project.system.name],
    ["Objects", String(objects().length)],
    ["Signals", String(signals().length)],
    ["Updated", state.model.project.meta.updated_at]
  ].forEach(([k, v]) => summary.append(kv(k, v)));
  current.append(summary);

  const rename = document.createElement("div");
  rename.className = "field-grid compact-grid";
  rename.append(
    textField("Project Name", state.model.project.meta.name, (v) => {
      state.model.project.meta.name = v;
      state.model.project.meta.id = slugify(v);
      state.model.project.system.name = `${v || "Project"} System`;
      state.model.project.system.id = `${slugify(v)}_system`;
      touch();
    }),
    textField("Description", state.model.project.meta.description || "", (v) => {
      state.model.project.meta.description = v;
      touch();
    })
  );
  current.append(rename);

  top.append(start, current);
  refs.workspace.append(top);
}

function renderObjects() {
  const shell = document.createElement("section");
  shell.className = "object-workspace";
  const activeObjectId = state.selection.kind === "object" || state.selection.kind === "port"
    ? state.selection.objectId
    : "";

  const left = document.createElement("div");
  left.className = "object-browser";
  const listPanel = panel("Objects", "Create subsystem-level objects first.");
  const add = document.createElement("button");
  add.type = "button";
  add.className = "btn";
  add.textContent = state.objectCreateOpen ? "Close" : "Add Object";
  add.onclick = () => { state.objectCreateOpen = !state.objectCreateOpen; render(); };
  listPanel.append(add);
  if (state.objectCreateOpen) {
    const composer = document.createElement("div");
    composer.className = "object-create-composer";
    const nameField = textField("Object Name", state.objectCreateName, (v) => { state.objectCreateName = v; });
    const descField = textField("Description", state.objectCreateDescription, (v) => { state.objectCreateDescription = v; });
    composer.append(nameField, descField);
    const create = document.createElement("button");
    create.type = "button";
    create.className = "btn primary";
    create.textContent = "Create";
    create.onclick = () => {
      const name = state.objectCreateName.trim();
      if (!name) return setMessage("Enter an object name first.", "is-error");
      const obj = { id: slugify(name), name, description: state.objectCreateDescription.trim(), type: "PackageObject", category: "package", interface: { inputs: [], outputs: [] } };
      objects().push(obj);
      state.objectIndex = objects().length - 1;
      state.objectCreateOpen = false;
      state.objectCreateName = "";
      state.objectCreateDescription = "";
      state.objectQuickEditId = "";
      state.portEditor = { dir: "", id: "" };
      touch(`Object created: ${name}.`);
      render();
    };
    composer.append(create);
    listPanel.append(composer);
  }
  const list = document.createElement("div");
  list.className = "registry-items";
  objects().forEach((obj, i) => {
    const itemShell = document.createElement("div");
    itemShell.className = "registry-item-shell";

    const card = document.createElement("div");
    const isActive = activeObjectId ? activeObjectId === obj.id : state.objectIndex === i;
    card.className = `registry-item${isActive ? " is-active" : ""}`;
    const cardHead = document.createElement("div");
    cardHead.className = "port-card-head";
    const cardText = document.createElement("div");
    cardText.className = "port-card-text";
    cardText.innerHTML = `<strong>${obj.name}</strong><span>${obj.description || obj.id}</span>`;
    cardHead.append(cardText);
    const actions = document.createElement("div");
    actions.className = "port-card-actions";
    const edit = iconButton("gear", "Quick edit object");
    edit.classList.toggle("is-active", state.objectQuickEditId === obj.id && state.objectIndex === i);
    edit.onclick = (event) => {
      event.stopPropagation();
      state.objectIndex = i;
      state.objectQuickEditId = state.objectQuickEditId === obj.id && state.objectIndex === i ? "" : obj.id;
      state.portEditor = { dir: "", id: "" };
      render();
    };
    const del = iconButton("trash", "Delete object", true);
    del.onclick = (event) => {
      event.stopPropagation();
      const idx = objects().findIndex((item) => item.id === obj.id);
      if (idx >= 0) objects().splice(idx, 1);
      if (state.objectIndex >= objects().length) state.objectIndex = objects().length - 1;
      state.objectQuickEditId = "";
      state.portEditor = { dir: "", id: "" };
      touch(`Object removed: ${obj.name}.`);
      render();
    };
    actions.append(edit, del);
    cardHead.append(actions);
    card.append(cardHead);
    card.onclick = () => {
      state.objectIndex = i;
      state.selection = { kind: "object", objectId: obj.id, dir: "", portId: "", signalId: "" };
      state.objectQuickEditId = "";
      state.portEditor = { dir: "", id: "" };
      render();
    };
    itemShell.append(card);
    list.append(itemShell);
  });
  listPanel.append(list);
  left.append(listPanel);

  const right = document.createElement("div");
  right.className = "object-stage";
  const obj = findObjectById(activeObjectId) || objects()[state.objectIndex];
  if (!obj) {
    right.append(panel("Object Workspace", "Select an object to edit its interface."));
  } else {
    const ed = plainPanel();

    const objectHeader = document.createElement("div");
    objectHeader.className = "port-inline-editor";
    const objectHeaderTop = document.createElement("div");
    objectHeaderTop.className = "port-card-head";
    const nameField = textField("Object Name", obj.name, (v) => {
      obj.name = v;
      obj.id = slugify(v);
      if (state.objectQuickEditId) state.objectQuickEditId = obj.id;
      touch();
    });
    objectHeaderTop.append(nameField);
    const objectActions = document.createElement("div");
    objectActions.className = "port-card-actions";
    const objectGear = iconButton("gear", "Quick object settings");
    objectGear.classList.toggle("is-active", state.objectQuickEditId === obj.id);
    objectGear.onclick = () => {
      selectObject(obj.id);
      state.objectQuickEditId = state.objectQuickEditId === obj.id ? "" : obj.id;
      state.portEditor = { dir: "", id: "" };
      render();
    };
    const objectTrash = iconButton("trash", "Delete object", true);
    objectTrash.onclick = () => {
      const idx = objects().findIndex((item) => item.id === obj.id);
      if (idx >= 0) objects().splice(idx, 1);
      state.objectIndex = Math.min(idx, objects().length - 1);
      state.objectQuickEditId = "";
      state.portEditor = { dir: "", id: "" };
      touch(`Object removed: ${obj.name}.`);
      render();
    };
    objectActions.append(objectGear, objectTrash);
    objectHeaderTop.append(objectActions);
    objectHeader.append(objectHeaderTop);
    if (state.objectQuickEditId === obj.id) {
      const details = document.createElement("div");
      details.className = "field-grid compact-grid";
      const descField = textField("Description", obj.description || "", (v) => {
        obj.description = v;
        touch();
      });
      descField.classList.add("full");
      const idField = textField("Object ID", obj.id, () => {});
      idField.querySelector("input").readOnly = true;
      const typeField = textField("Type", obj.type, () => {});
      typeField.querySelector("input").readOnly = true;
      const categoryField = textField("Category", obj.category, () => {});
      categoryField.querySelector("input").readOnly = true;
      details.append(descField, idField, typeField, categoryField);
      objectHeader.append(details);
    }
    ed.append(objectHeader);

    const tabs = document.createElement("div");
    tabs.className = "subview-tabs";
    [["interface", "Interface"], ["json", "JSON"]].forEach(([id, label]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `subview-tab${state.objectMode === id ? " is-active" : ""}`;
      btn.textContent = label;
      btn.onclick = () => {
        state.objectMode = id;
        state.portEditor = { dir: "", id: "" };
        render();
      };
      tabs.append(btn);
    });
    ed.append(tabs);
    if (state.objectMode === "json") {
      const ta = document.createElement("textarea");
      ta.className = "json-preview";
      ta.readOnly = true;
      ta.value = JSON.stringify(obj, null, 2);
      ed.append(ta);
    } else {
      const editor = document.createElement("div");
      editor.className = "component-editor component-editor-interface";
      const layout = document.createElement("div");
      layout.className = "component-layout";

      const palette = document.createElement("div");
      palette.className = "component-pane component-palette";
      palette.innerHTML = '<div class="component-pane-title">Palette</div>';
      const paletteGroup = document.createElement("div");
      paletteGroup.className = "palette-group";
      [
        ["inputs", "Add Input Port", "signal.new_input", "signal"],
        ["outputs", "Add Output Port", "status.new_output", "status"]
      ].forEach(([key, label, defaultName, signalType]) => {
        const addPort = document.createElement("button");
        addPort.type = "button";
        addPort.className = "palette-button accent";
        addPort.textContent = label;
        addPort.onclick = () => {
          const uniqueName = nextPortName(obj.interface[key], defaultName);
          const port = ensurePort({ name: uniqueName, signal_type: signalType, data_type: "bool", description: "" }, uniqueName);
          obj.interface[key].push(port);
          state.objectQuickEditId = "";
          state.portEditor = { dir: key, id: port.id };
          selectPort(obj.id, key, port.id);
          touch("Port added.");
          render();
        };
        paletteGroup.append(addPort);
      });
      palette.append(paletteGroup);

      const center = document.createElement("div");
      center.className = "component-pane";
      center.innerHTML = '<div class="component-pane-title">Interface View</div>';
      const lanes = document.createElement("div");
      lanes.className = "port-lanes";

      [["inputs", "Inputs", "What the object receives."], ["outputs", "Outputs", "What the object exposes."]].forEach(([key, title, subtitle]) => {
        const column = document.createElement("div");
        column.className = "port-column";
        const colTitle = document.createElement("div");
        colTitle.className = "port-column-title";
        colTitle.textContent = title;
        column.append(colTitle);
        const sub = document.createElement("div");
        sub.className = "component-pane-subtitle";
        sub.textContent = subtitle;
        column.append(sub);

        if (!obj.interface[key].length) {
          const empty = document.createElement("div");
          empty.className = "subview-empty";
          empty.textContent = "No ports yet. Add one from the palette.";
          column.append(empty);
        } else {
          obj.interface[key].forEach((port, idx) => {
            const card = document.createElement("div");
            card.className = `port-card${state.selection.kind === "port" && state.selection.objectId === obj.id && state.selection.dir === key && state.selection.portId === port.id ? " is-active" : ""}`;
            const head = document.createElement("div");
            head.className = "port-card-head";
            const text = document.createElement("div");
            text.className = "port-card-text";
            text.innerHTML = `<strong>${port.name}</strong><span>${port.data_type} • ${port.signal_type}</span>`;
            head.append(text);
            const actions = document.createElement("div");
            actions.className = "port-card-actions";
            const gear = iconButton("gear", "Quick port settings");
            gear.classList.toggle("is-active", state.portEditor.dir === key && state.portEditor.id === port.id);
            gear.onclick = () => {
              state.objectQuickEditId = "";
              state.portEditor = state.portEditor.dir === key && state.portEditor.id === port.id ? { dir: "", id: "" } : { dir: key, id: port.id };
              render();
            };
            const trash = iconButton("trash", "Delete port", true);
            trash.onclick = () => {
              obj.interface[key].splice(idx, 1);
              if (state.portEditor.dir === key && state.portEditor.id === port.id) state.portEditor = { dir: "", id: "" };
              touch("Port removed.");
              render();
            };
            actions.append(gear, trash);
            head.append(actions);
            card.append(head);
            card.onclick = () => {
              selectPort(obj.id, key, port.id);
              render();
            };
            column.append(card);

            if (state.portEditor.dir === key && state.portEditor.id === port.id) {
              const quick = document.createElement("div");
              quick.className = "port-inline-editor";
              const quickHead = document.createElement("div");
              quickHead.className = "port-inline-header";
              const quickTitle = document.createElement("div");
              quickTitle.className = "port-inline-title";
              quickTitle.textContent = "Quick Settings";
              const close = document.createElement("button");
              close.type = "button";
              close.className = "port-mini-button";
              close.textContent = "Close";
              close.onclick = () => {
                state.portEditor = { dir: "", id: "" };
                selectPort(obj.id, key, port.id);
                render();
              };
              quickHead.append(quickTitle, close);
              quick.append(quickHead);

              const fg = document.createElement("div");
              fg.className = "field-grid compact-grid";
              const portNameField = textField("Port Name", port.name, (v) => {
                const oldName = port.name;
                const oldId = port.id;
                port.name = v;
                port.id = slugify(v);
                renamePortBindings(obj.id, key, oldName, port.name, oldId, port.id);
                if (state.portEditor.dir === key) state.portEditor.id = port.id;
                touch();
              });
              portNameField.classList.add("full");
              const descriptionField = textField("Description", port.description || "", (v) => { port.description = v; touch(); });
              descriptionField.classList.add("full");
              fg.append(
                portNameField,
                selectField("Signal Type", port.signal_type, SIGNAL_TYPES.map((v) => ({ value: v, label: v })), (v) => { port.signal_type = v; touch(); }),
                selectField("Data Type", port.data_type, DATA_TYPES.map((v) => ({ value: v, label: v })), (v) => { port.data_type = v; touch(); }),
                descriptionField
              );
              quick.append(fg);
              column.append(quick);
            }
          });
        }

        lanes.append(column);
      });

      center.append(lanes);
      layout.append(palette, center);
      editor.append(layout);
      ed.append(editor);
    }
    right.append(ed);
  }
  shell.append(left, right);
  refs.workspace.append(shell);
}

function populateComposerFromConnection(sourceObj, sourcePort, targetObj, targetPort, preferredSignal) {
  const existingSignal = preferredSignal && preferredSignal.source.object_id === sourceObj.id && preferredSignal.source.port === sourcePort.name
    ? preferredSignal
    : signals().find((signal) => signal.source.object_id === sourceObj.id && signal.source.port === sourcePort.name) || null;
  const nextComposer = defaultSignalComposer();
  nextComposer.signalName = existingSignal ? existingSignal.name : sourcePort.name;
  nextComposer.description = existingSignal ? existingSignal.description || "" : "";
  nextComposer.signal_type = existingSignal ? existingSignal.signal_type : sourcePort.signal_type;
  nextComposer.data_type = existingSignal ? existingSignal.data_type : sourcePort.data_type;
  nextComposer.sourceObjectId = sourceObj.id;
  nextComposer.sourceMode = "existing";
  nextComposer.sourcePort = sourcePort.id;
  nextComposer.targets = existingSignal
    ? (existingSignal.targets || []).map((target) => {
        const objectRef = findObjectById(target.object_id);
        const portRef = objectRef ? objectPorts(target.object_id, "inputs").find((port) => port.name === target.port) : null;
        return {
          objectId: target.object_id,
          mode: "existing",
          port: portRef ? portRef.id : "",
          newPort: ""
        };
      })
    : [];
  if (!nextComposer.targets.some((target) => target.objectId === targetObj.id && target.port === targetPort.id)) {
    nextComposer.targets.push({ objectId: targetObj.id, mode: "existing", port: targetPort.id, newPort: "" });
  }
  state.signalComposer = nextComposer;
  state.signalComposerOpen = true;
  if (existingSignal) selectSignal(existingSignal.id);
}

function commitSignalComposer() {
  const composer = state.signalComposer;
  const signalName = composer.signalName.trim();
  if (!signalName) return setMessage("Enter a signal name first.", "is-error");
  if (!composer.sourceObjectId) return setMessage("Choose a source object.", "is-error");
  const sourcePort = resolveOrCreatePort(
    composer.sourceObjectId,
    "outputs",
    composer.sourceMode,
    composer.sourcePort,
    composer.newSourcePort || signalName,
    composer.signal_type,
    composer.data_type
  );
  if (!sourcePort) return setMessage("Resolve the source output first.", "is-error");
  if (sourcePort.data_type !== composer.data_type) return setMessage("Source output data type does not match the route data type.", "is-error");

  const resolvedTargets = [];
  for (const target of composer.targets) {
    if (!target.objectId) return setMessage("Choose each target object.", "is-error");
    const targetPort = resolveOrCreatePort(
      target.objectId,
      "inputs",
      target.mode,
      target.port,
      target.newPort || signalName,
      composer.signal_type,
      composer.data_type
    );
    if (!targetPort) return setMessage("Resolve every target input before creating the route.", "is-error");
    if (targetPort.data_type !== composer.data_type) return setMessage(`Target input ${targetPort.name} has data type ${targetPort.data_type}, expected ${composer.data_type}.`, "is-error");
    resolvedTargets.push({ object_id: target.objectId, port: targetPort.name });
  }

  let signal = signals().find((item) => item.name === signalName);
  if (signal && signal.source.object_id && (signal.source.object_id !== composer.sourceObjectId || signal.source.port !== sourcePort.name)) {
    return setMessage("A signal with this name already exists with a different source.", "is-error");
  }
  if (!signal) {
    signal = {
      id: slugify(signalName),
      name: signalName,
      description: composer.description || "",
      signal_type: composer.signal_type,
      data_type: composer.data_type,
      source: { object_id: composer.sourceObjectId, port: sourcePort.name },
      targets: []
    };
    signals().push(signal);
  }
  signal.signal_type = composer.signal_type;
  signal.data_type = composer.data_type;
  signal.description = composer.description || signal.description || "";
  signal.source = { object_id: composer.sourceObjectId, port: sourcePort.name };
  resolvedTargets.forEach((target) => {
    if (!signal.targets.some((item) => item.object_id === target.object_id && item.port === target.port)) signal.targets.push(target);
  });

  selectSignal(signal.id);
  clearRouteConnect();
  state.signalComposer = defaultSignalComposer();
  state.signalComposerOpen = false;
  touch(`Route created: ${signalName}.`);
  render();
}

function buildSignalComposerOverlay(selectedSignal) {
  ensureSignalComposer();
  const composer = state.signalComposer;
  const overlay = document.createElement("div");
  overlay.className = "routing-overlay routing-overlay-left";
  const card = document.createElement("div");
  card.className = "routing-overlay-card";
  const head = document.createElement("div");
  head.className = "routing-overlay-head";
  head.innerHTML = "<strong>Add Route</strong><span>Graph actions prefill what they can. You decide the remaining contract details.</span>";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "port-mini-button";
  close.textContent = "Close";
  close.onclick = () => {
    state.signalComposerOpen = false;
    render();
  };
  head.append(close);
  card.append(head);

  const metaLayout = document.createElement("div");
  metaLayout.className = "signal-meta-grid";
  const nameBlock = document.createElement("div");
  nameBlock.className = "binding-block";
  const nameGrid = document.createElement("div");
  nameGrid.className = "field-grid compact-grid";
  nameGrid.append(
    textField("Signal Name", composer.signalName, (v) => {
      touchSignalName(v);
      queueRender();
    }),
    textField("Description", composer.description || "", (v) => {
      composer.description = v;
    })
  );
  nameBlock.append(nameGrid);
  const typeBlock = document.createElement("div");
  typeBlock.className = "binding-block";
  const typeGrid = document.createElement("div");
  typeGrid.className = "field-grid compact-grid";
  typeGrid.append(
    selectField("Type", composer.signal_type, SIGNAL_TYPES.map((v) => ({ value: v, label: v })), (v) => {
      composer.signal_type = v;
      queueRender();
    }),
    selectField("Data Type", composer.data_type, DATA_TYPES.map((v) => ({ value: v, label: v })), (v) => {
      composer.data_type = v;
      queueRender();
    })
  );
  typeBlock.append(typeGrid);
  metaLayout.append(nameBlock, typeBlock);
  card.append(metaLayout);

  const sourceChoices = [{ value: "", label: "Select source object" }, ...objectOptions()];
  const sourcePorts = objectPorts(composer.sourceObjectId, "outputs");
  const sourcePortChoices = [{ value: "", label: sourcePorts.length ? "Select existing output" : "No existing outputs" }, ...sourcePorts.map((port) => ({ value: port.id, label: port.name }))];
  const bindingsLayout = document.createElement("div");
  bindingsLayout.className = "signal-bindings-grid";
  const sourceCard = buildSignalBindingBlock(
    "",
    "Source Object",
    composer.sourceObjectId,
    sourceChoices,
    (value) => {
      composer.sourceObjectId = value;
      syncSourceBindingFromComposer();
      queueRender();
    },
    "Source Output",
    composer.sourceMode,
    composer.sourcePort,
    sourcePortChoices,
    (value) => {
      composer.sourcePort = value;
      const selected = sourcePorts.find((port) => port.id === value);
      if (selected) {
        composer.signal_type = selected.signal_type;
        composer.data_type = selected.data_type;
      }
      queueRender();
    },
    () => {
      composer.sourceMode = composer.sourceMode === "create" ? "existing" : "create";
      syncSourceBindingFromComposer();
      queueRender();
    },
    composer.newSourcePort,
    (value) => {
      composer.newSourcePort = value;
    }
  );
  bindingsLayout.append(buildSignalBindingGroup("Source Binding", [sourceCard]));

  const targetCards = [];
  composer.targets.forEach((target, index) => {
    const targetChoices = [{ value: "", label: "Select target object" }, ...objectOptions()];
    const targetPorts = objectPorts(target.objectId, "inputs");
    const targetPortChoices = [{ value: "", label: targetPorts.length ? "Select existing input" : "No existing inputs" }, ...targetPorts.map((port) => ({ value: port.id, label: port.name }))];
    targetCards.push(
      buildSignalBindingBlock(
        composer.targets.length > 1 ? `Target ${index + 1}` : "",
        "Target Object",
        target.objectId,
        targetChoices,
        (value) => {
          target.objectId = value;
          syncTargetBinding(target);
          queueRender();
        },
        "Target Input",
        target.mode,
        target.port,
        targetPortChoices,
        (value) => {
          target.port = value;
          queueRender();
        },
        () => {
          target.mode = target.mode === "create" ? "existing" : "create";
          syncTargetBinding(target);
          queueRender();
        },
        target.newPort,
        (value) => {
          target.newPort = value;
        },
        composer.targets.length > 1 ? () => {
          composer.targets.splice(index, 1);
          queueRender();
        } : null
      )
    );
  });
  bindingsLayout.append(buildSignalBindingGroup("Target Bindings", targetCards, () => {
    composer.targets.push(defaultTargetBinding());
    queueRender();
  }));
  card.append(bindingsLayout);

  const note = document.createElement("div");
  note.className = "small-note";
  note.textContent = selectedSignal ? `Selected route: ${selectedSignal.name}` : "Create a new route or extend one by drawing from an output to an input.";
  card.append(note);

  const createButton = document.createElement("button");
  createButton.type = "button";
  createButton.className = "btn primary";
  createButton.textContent = "Create Route";
  createButton.onclick = () => commitSignalComposer();
  card.append(createButton);
  overlay.append(card);
  return overlay;
}

function buildSignalMonitorOverlay(selectedSignal) {
  const overlay = document.createElement("div");
  overlay.className = "routing-overlay routing-overlay-right";
  const card = document.createElement("div");
  card.className = "routing-overlay-card";
  const head = document.createElement("div");
  head.className = "routing-overlay-head";
  head.innerHTML = "<strong>Signal Monitor</strong><span>Select a route to inspect or edit it.</span>";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "port-mini-button";
  close.textContent = "Close";
  close.onclick = () => {
    state.signalMonitorOpen = false;
    render();
  };
  head.append(close);
  card.append(head);

  const list = document.createElement("div");
  list.className = "routing-signal-list";
  if (!signals().length) {
    const empty = document.createElement("div");
    empty.className = "subview-empty";
    empty.textContent = "No signals yet.";
    list.append(empty);
  } else {
    signals().forEach((signal) => {
      const item = document.createElement("div");
      item.className = `routing-derived-link${selectedSignal && selectedSignal.id === signal.id ? " is-active" : ""}`;
      item.style.borderLeft = `3px solid ${signalColor(signal)}`;
      item.innerHTML = `<strong>${signal.name}</strong><span>${signal.signal_type} • ${signal.data_type}</span><span>${signal.source.object_id}.${signal.source.port} -> ${signal.targets.length} target(s)</span>`;
      item.onclick = () => {
        selectSignal(signal.id);
        render();
      };
      const remove = iconButton("trash", "Delete signal", true);
      remove.onclick = (event) => {
        event.stopPropagation();
        removeSignal(signal.id);
        render();
      };
      item.append(remove);
      list.append(item);
    });
  }
  card.append(list);
  overlay.append(card);
  return overlay;
}

function buildRoutingBoard(selectedSignal) {
  const mapShell = document.createElement("div");
  mapShell.className = "routing-map-shell";
  const map = document.createElement("div");
  map.className = "routing-map-panel";
  if (!objects().length) {
    const empty = document.createElement("div");
    empty.className = "subview-empty";
    empty.textContent = "Create objects first to start routing them.";
    map.append(empty);
    mapShell.append(map);
    return mapShell;
  }

  const board = document.createElement("div");
  board.className = "routing-board";
  const wireLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wireLayer.setAttribute("class", "routing-board-wires");
  board.append(wireLayer);

  const { layers } = computeRoutingLayers();
  autoLayoutRoutingScene();
  const sceneContext = buildRoutingSceneContext(layers);

  const sourceDotRefs = new Map();
  const targetDotRefs = new Map();
  const cardRefs = new Map();
  const signalSourceKeys = new Set(signals().map((signal) => `${signal.source.object_id}::${signal.source.port}`));
  const signalTargetKeys = new Set(signals().flatMap((signal) => (signal.targets || []).map((target) => `${target.object_id}::${target.port}`)));
  let sceneOffsetX = 0;
  let sceneOffsetY = 0;

  const renderObjectCard = (obj) => {
    const card = document.createElement("div");
    const selectedObjectUsed = selectedSignal && (
      selectedSignal.source.object_id === obj.id ||
      (selectedSignal.targets || []).some((target) => target.object_id === obj.id)
    );
    card.className = `routing-node-card${selectedObjectUsed ? " is-involved" : ""}`;
    card.style.left = `${obj.ui.routing.x + sceneOffsetX}px`;
    card.style.top = `${obj.ui.routing.y + sceneOffsetY}px`;
    cardRefs.set(obj.id, card);
    card.dataset.objectId = obj.id;
    card.innerHTML = `<div class="routing-node-title">${obj.name}</div><div class="routing-node-sub">${obj.id}</div>`;
    const header = document.createElement("div");
    header.className = "routing-node-drag";
    header.textContent = obj.name;
    header.onmousedown = (event) => {
      event.preventDefault();
      const shell = card.closest(".routing-map-shell");
      const shellRect = shell ? shell.getBoundingClientRect() : { left: 0, top: 0 };
      state.routeDrag = {
        objectId: obj.id,
        active: true,
        offsetX: event.clientX - shellRect.left + (shell ? shell.scrollLeft : 0) - (obj.ui.routing.x + sceneOffsetX),
        offsetY: event.clientY - shellRect.top + (shell ? shell.scrollTop : 0) - (obj.ui.routing.y + sceneOffsetY),
        sceneOffsetX,
        sceneOffsetY,
        shellSelector: ".routing-map-shell"
      };
    };
    card.innerHTML = "";
    card.append(header);
    const sub = document.createElement("div");
    sub.className = "routing-node-sub";
    sub.textContent = obj.id;
    card.append(sub);
    const portsWrap = document.createElement("div");
    portsWrap.className = "routing-node-ports";

    const inStack = document.createElement("div");
    inStack.className = "routing-port-stack";
    (obj.interface.inputs || []).forEach((port) => {
      const key = `${obj.id}::${port.name}`;
      const isBound = signalTargetKeys.has(key);
      const isSelectedBound = selectedSignal ? (selectedSignal.targets || []).some((target) => target.object_id === obj.id && target.port === port.name) : false;
      const isCompatible = state.routeConnect.active && port.data_type === state.routeConnect.dataType;
      const row = document.createElement("div");
      row.className = `routing-node-port port-in${isSelectedBound ? " is-active" : ""}${isCompatible ? " is-compatible" : ""}`;
      const dot = document.createElement("span");
      dot.className = `routing-port-dot ${port.signal_type}${isBound ? " has-route" : ""}${isSelectedBound ? " is-active" : ""}${isCompatible ? " is-compatible" : ""}`;
      targetDotRefs.set(key, dot);
      if (isCompatible) {
        dot.onmouseup = (event) => {
          event.preventDefault();
          const sourceObj = findObjectById(state.routeConnect.sourceObjectId);
          const sourcePort = sourceObj ? objectPorts(sourceObj.id, "outputs").find((candidate) => candidate.name === state.routeConnect.sourcePort) : null;
          if (sourceObj && sourcePort) {
            populateComposerFromConnection(sourceObj, sourcePort, obj, port, selectedSignal);
            touch(`Prepared route draft from ${sourceObj.name}.${sourcePort.name} to ${obj.name}.${port.name}.`);
          }
          clearRouteConnect();
          render();
        };
      }
      const label = document.createElement("span");
      label.textContent = port.name;
      row.append(dot, label);
      inStack.append(row);
    });

    const outStack = document.createElement("div");
    outStack.className = "routing-port-stack";
    (obj.interface.outputs || []).forEach((port) => {
      const key = `${obj.id}::${port.name}`;
      const isSignalSource = signalSourceKeys.has(key);
      const isSelectedSource = selectedSignal && selectedSignal.source.object_id === obj.id && selectedSignal.source.port === port.name;
      const row = document.createElement("div");
      row.className = `routing-node-port port-out${isSelectedSource ? " is-active" : ""}`;
      const label = document.createElement("span");
      label.textContent = port.name;
      const dot = document.createElement("span");
      dot.className = `routing-port-dot ${port.signal_type}${isSignalSource ? " has-route" : ""}${isSelectedSource ? " is-active" : ""}`;
      sourceDotRefs.set(key, dot);
      dot.onmousedown = (event) => {
        event.preventDefault();
        state.routeConnect = {
          signalId: selectedSignal && selectedSignal.source.object_id === obj.id && selectedSignal.source.port === port.name ? selectedSignal.id : "",
          sourceObjectId: obj.id,
          sourcePort: port.name,
          signalType: port.signal_type,
          dataType: port.data_type,
          active: true,
          mouseX: event.clientX,
          mouseY: event.clientY
        };
        render();
      };
      row.append(label, dot);
      outStack.append(row);
    });

    portsWrap.append(inStack, outStack);
    card.append(portsWrap);
    return card;
  };

  const routePaths = [];
  const trackUsage = new Map();
  routingSignalsInOrder(layers).forEach((signal) => {
    glossSignalSegments(buildSignalRouteSegments(signal, sceneContext, layers, trackUsage)).forEach((segmentPath) => {
      routePaths.push({ signal, points: segmentPath.points });
    });
  });

  const contentBounds = computeRoutingContentBounds(sceneContext, routePaths);
  sceneOffsetX = -contentBounds.left;
  sceneOffsetY = -contentBounds.top;
  board.style.minWidth = `${Math.max(960, contentBounds.right - contentBounds.left)}px`;
  board.style.minHeight = `${Math.max(720, contentBounds.bottom - contentBounds.top)}px`;

  board.innerHTML = "";
  board.append(wireLayer);
  objects().forEach((obj) => {
    board.append(renderObjectCard(obj));
  });

  map.append(board);

  requestAnimationFrame(() => {
    if (!board.isConnected) return;
    if (syncMeasuredRoutingObjectSizes(cardRefs)) {
      queueRender();
      return;
    }
    const metrics = buildRenderedRoutingMetrics(layers, board, cardRefs, sourceDotRefs, targetDotRefs);
    const boardRect = metrics.boardRect;
    const orderedSignals = routingSignalsInOrder(layers);
    const renderedRoutePaths = [];
    const renderedTrackUsage = new Map();
    orderedSignals.forEach((signal) => {
      glossSignalSegments(buildSignalRouteSegments(signal, metrics.sceneContext, layers, renderedTrackUsage, metrics)).forEach((segmentPath) => {
        renderedRoutePaths.push({ signal, points: segmentPath.points });
      });
    });
    const detangledRoutePaths = detangleRenderedRoutePaths(renderedRoutePaths);
    while (wireLayer.firstChild) wireLayer.removeChild(wireLayer.firstChild);
    detangledRoutePaths.forEach(({ signal, points }) => {
      const color = signalColor(signal, orderedSignals);
      const outline = document.createElementNS("http://www.w3.org/2000/svg", "path");
      outline.setAttribute("d", pathFromPoints(points));
      outline.setAttribute("class", `route-wire-outline${selectedSignal && signal.id === selectedSignal.id ? " is-selected" : ""}`);
      outline.style.setProperty("--route-color", color);
      wireLayer.append(outline);
    });
    detangledRoutePaths.forEach(({ signal, points }) => {
      const color = signalColor(signal, orderedSignals);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathFromPoints(points));
      path.setAttribute("class", `route-wire${selectedSignal && signal.id === selectedSignal.id ? " is-selected" : ""}`);
      path.style.setProperty("--route-color", color);
      path.style.pointerEvents = "stroke";
      path.onclick = () => {
        selectSignal(signal.id);
        setMessage(`Selected route ${signal.name}.`, "is-ok");
        render();
      };
      wireLayer.append(path);
    });

    routePreviewUpdater = null;
    if (state.routeConnect.active) {
      const previewSourceObj = findObjectById(state.routeConnect.sourceObjectId);
      const previewSourcePort = previewSourceObj ? objectPorts(previewSourceObj.id, "outputs").find((port) => port.name === state.routeConnect.sourcePort) : null;
      if (!previewSourceObj || !previewSourcePort) return;
      const previewSourceAnchor = metrics.sourceAnchors.get(`${previewSourceObj.id}::${previewSourcePort.name}`) || portAnchor(previewSourceObj, previewSourcePort, "outputs", "right");
      const preview = document.createElementNS("http://www.w3.org/2000/svg", "path");
      preview.setAttribute("class", "route-wire route-wire-preview");
      wireLayer.append(preview);
      routePreviewUpdater = () => {
        if (!board.isConnected || !state.routeConnect.active) return;
        const px = state.routeConnect.mouseX - boardRect.left;
        const py = state.routeConnect.mouseY - boardRect.top;
        preview.setAttribute("d", routeEdgePath(previewSourceAnchor, { x: px, y: py }, 0));
      };
      routePreviewUpdater();
    }
  });

  mapShell.append(map);
  return mapShell;
}

function renderSignals() {
  const selectedSignal = state.selection.kind === "signal" ? findSignalById(state.selection.signalId) : signals()[state.signalIndex] || null;
  const shell = document.createElement("section");
  shell.className = "routing-canvas-workspace";

  const toolbar = document.createElement("div");
  toolbar.className = "routing-canvas-toolbar";
  const addRouteButton = document.createElement("button");
  addRouteButton.type = "button";
  addRouteButton.className = `btn${state.signalComposerOpen ? " primary" : ""}`;
  addRouteButton.textContent = "Add Route";
  addRouteButton.onclick = () => {
    state.signalComposerOpen = !state.signalComposerOpen;
    if (state.signalComposerOpen && !state.signalComposer.targets.length) state.signalComposer.targets = [defaultTargetBinding()];
    render();
  };
  const monitorButton = document.createElement("button");
  monitorButton.type = "button";
  monitorButton.className = `btn${state.signalMonitorOpen ? " primary" : ""}`;
  monitorButton.textContent = "Signal Monitor";
  monitorButton.onclick = () => {
    state.signalMonitorOpen = !state.signalMonitorOpen;
    render();
  };
  toolbar.append(addRouteButton, monitorButton);
  shell.append(toolbar);

  const stage = document.createElement("div");
  stage.className = "routing-canvas-stage";
  stage.append(buildRoutingBoard(selectedSignal));
  if (state.signalComposerOpen) stage.append(buildSignalComposerOverlay(selectedSignal));
  if (state.signalMonitorOpen) stage.append(buildSignalMonitorOverlay(selectedSignal));
  shell.append(stage);
  refs.workspace.append(shell);
}

function renderLinks() {
  const p = panel("Link Mirror", "Derived automatically from system signals.");
  const list = document.createElement("div");
  list.className = "routing-inventory";
  if (!links().length) {
    const empty = document.createElement("div");
    empty.className = "subview-empty";
    empty.textContent = "No derived links yet.";
    list.append(empty);
  } else {
    links().forEach((l) => {
      const item = document.createElement("div");
      item.className = "routing-derived-link";
      item.innerHTML = `<strong>${l.semantic}</strong><span>${l.source.object_id}.${l.source.port} -> ${l.target.object_id}.${l.target.port}</span>`;
      list.append(item);
    });
  }
  p.append(list);
  refs.workspace.append(p);
}

function renderPlaceholder(title) {
  const p = panel(title, "This section is intentionally minimal while the editor is being restored.");
  const note = document.createElement("div");
  note.className = "subview-empty";
  note.textContent = "The workspace is stable again. We can expand this section safely from here.";
  p.append(note);
  refs.workspace.append(p);
}

function renderInspector() {
  const selectedObject = state.selection.kind === "object" ? findObjectById(state.selection.objectId) : null;
  const selectedPort = state.selection.kind === "port" ? findPort(state.selection.objectId, state.selection.dir, state.selection.portId) : null;
  const selectedSignal = state.selection.kind === "signal" ? findSignalById(state.selection.signalId) : null;
  refs.inspectorTitle.value = `${state.tab} workspace`;
  refs.inspectorSelection.innerHTML = "";
  clearNode(refs.inspectorContext);
  if (selectedObject && state.tab === "system" && state.registry === "objects") {
    refs.inspectorTitle.value = `Object: ${selectedObject.name}`;
    [["Object", selectedObject.name], ["ID", selectedObject.id], ["Inputs", String(selectedObject.interface.inputs.length)], ["Outputs", String(selectedObject.interface.outputs.length)]].forEach(([k, v]) => refs.inspectorSelection.append(kv(k, v)));
    const fields = document.createElement("div");
    fields.className = "field-grid compact-grid";
    const nameField = textField("Object Name", selectedObject.name, (v) => {
      selectedObject.name = v;
      selectedObject.id = slugify(v);
      if (state.objectQuickEditId) state.objectQuickEditId = selectedObject.id;
      state.selection.objectId = selectedObject.id;
      touch();
    });
    nameField.classList.add("full");
    const descriptionField = textField("Description", selectedObject.description || "", (v) => {
      selectedObject.description = v;
      touch();
    });
    descriptionField.classList.add("full");
    const idField = textField("Object ID", selectedObject.id, () => {});
    idField.querySelector("input").readOnly = true;
    const typeField = textField("Type", selectedObject.type, () => {});
    typeField.querySelector("input").readOnly = true;
    const categoryField = textField("Category", selectedObject.category, () => {});
    categoryField.querySelector("input").readOnly = true;
    fields.append(nameField, descriptionField, idField, typeField, categoryField);
    refs.inspectorSelection.append(fields);
    refs.inspectorNotes.textContent = "Selected object editor. This inspector should follow the current selection instead of acting like a static report panel.";
  } else if (selectedPort && state.tab === "system" && state.registry === "objects") {
    refs.inspectorTitle.value = `Port: ${selectedPort.name}`;
    [["Object", state.selection.objectId], ["Direction", state.selection.dir], ["Port ID", selectedPort.id]].forEach(([k, v]) => refs.inspectorSelection.append(kv(k, v)));
    const fields = document.createElement("div");
    fields.className = "field-grid compact-grid";
    const nameField = textField("Port Name", selectedPort.name, (v) => {
      const oldName = selectedPort.name;
      const oldId = selectedPort.id;
      selectedPort.name = v;
      selectedPort.id = slugify(v);
      renamePortBindings(state.selection.objectId, state.selection.dir, oldName, selectedPort.name, oldId, selectedPort.id);
      state.selection.portId = selectedPort.id;
      if (state.portEditor.dir === state.selection.dir) state.portEditor.id = selectedPort.id;
      touch();
    });
    nameField.classList.add("full");
    const descriptionField = textField("Description", selectedPort.description || "", (v) => {
      selectedPort.description = v;
      touch();
    });
    descriptionField.classList.add("full");
    fields.append(
      nameField,
      selectField("Signal Type", selectedPort.signal_type, SIGNAL_TYPES.map((v) => ({ value: v, label: v })), (v) => {
        selectedPort.signal_type = v;
        touch();
      }),
      selectField("Data Type", selectedPort.data_type, DATA_TYPES.map((v) => ({ value: v, label: v })), (v) => {
        selectedPort.data_type = v;
        touch();
      }),
      descriptionField
    );
    refs.inspectorSelection.append(fields);
    refs.inspectorNotes.textContent = "Selected port editor. Local quick settings stay near the card, and the right inspector mirrors the same selection.";
  } else if (selectedSignal && state.tab === "system" && state.registry === "signals") {
    refs.inspectorTitle.value = `Signal: ${selectedSignal.name}`;
    [["Source", `${selectedSignal.source.object_id}.${selectedSignal.source.port}`], ["Targets", String(selectedSignal.targets.length)]].forEach(([k, v]) => refs.inspectorSelection.append(kv(k, v)));
    const identity = document.createElement("div");
    identity.className = "port-inline-editor";
    const identityHead = document.createElement("div");
    identityHead.className = "port-inline-header";
    const identityTitle = document.createElement("div");
    identityTitle.className = "port-inline-title";
    identityTitle.textContent = "Signal";
    const deleteSignalButton = iconButton("trash", "Delete signal", true);
    deleteSignalButton.onclick = () => {
      removeSignal(selectedSignal.id);
      render();
    };
    identityHead.append(identityTitle, deleteSignalButton);
    identity.append(identityHead);

    const fields = document.createElement("div");
    fields.className = "field-grid compact-grid";
    const nameField = textField("Signal Name", selectedSignal.name, (v) => {
      selectedSignal.name = v;
      selectedSignal.id = slugify(v);
      state.selection.signalId = selectedSignal.id;
      touch();
    });
    nameField.classList.add("full");
    const descriptionField = textField("Description", selectedSignal.description || "", (v) => {
      selectedSignal.description = v;
      touch();
    });
    descriptionField.classList.add("full");
    fields.append(
      nameField,
      selectField("Type", selectedSignal.signal_type, SIGNAL_TYPES.map((v) => ({ value: v, label: v })), (v) => {
        selectedSignal.signal_type = v;
        touch();
        queueRender();
      }),
      selectField("Data Type", selectedSignal.data_type, DATA_TYPES.map((v) => ({ value: v, label: v })), (v) => {
        selectedSignal.data_type = v;
        touch();
        queueRender();
      }),
      descriptionField
    );
    identity.append(fields);
    refs.inspectorSelection.append(identity);

    const sourceSection = document.createElement("div");
    sourceSection.className = "port-inline-editor";
    const sourceHead = document.createElement("div");
    sourceHead.className = "port-inline-header";
    sourceHead.innerHTML = '<div class="port-inline-title">Source Binding</div>';
    sourceSection.append(sourceHead);
    const sourceFields = document.createElement("div");
    sourceFields.className = "field-grid compact-grid";
    const sourceObjectOptions = [{ value: "", label: "Select source object" }, ...objectOptions((obj) => obj.interface.outputs.length > 0 || true)];
    const sourcePorts = objectPorts(selectedSignal.source.object_id, "outputs");
    const currentSourcePort = sourcePorts.find((port) => port.name === selectedSignal.source.port);
    const sourcePortOptions = [{ value: "", label: sourcePorts.length ? "Select source output" : "No existing outputs" }, ...sourcePorts.map((port) => ({ value: port.id, label: port.name }))];
    sourceFields.append(
      selectField("Source Object", selectedSignal.source.object_id, sourceObjectOptions, (value) => {
        selectedSignal.source.object_id = value;
        const nextPort = preferredPort(objectPorts(value, "outputs"), selectedSignal.name);
        selectedSignal.source.port = nextPort ? nextPort.name : "";
        touch();
        queueRender();
      }),
      selectWithCreateField("Source Output", currentSourcePort ? currentSourcePort.id : "", sourcePortOptions, (value) => {
        const nextPort = sourcePorts.find((port) => port.id === value);
        selectedSignal.source.port = nextPort ? nextPort.name : "";
        if (nextPort) {
          selectedSignal.signal_type = nextPort.signal_type;
          selectedSignal.data_type = nextPort.data_type;
        }
        touch();
        queueRender();
      }, selectedSignal.source.object_id ? () => {
        const sourceObject = findObjectById(selectedSignal.source.object_id);
        if (!sourceObject) return;
        const name = nextPortName(sourceObject.interface.outputs, selectedSignal.name || "status.new_signal");
        const newPort = ensurePort({ name, signal_type: selectedSignal.signal_type, data_type: selectedSignal.data_type, description: "" }, name);
        sourceObject.interface.outputs.push(newPort);
        selectedSignal.source.port = newPort.name;
        touch();
        queueRender();
      } : null)
    );
    sourceSection.append(sourceFields);
    refs.inspectorSelection.append(sourceSection);

    const targetsSection = document.createElement("div");
    targetsSection.className = "port-inline-editor";
    const targetsHead = document.createElement("div");
    targetsHead.className = "port-inline-header";
    const targetsTitle = document.createElement("div");
    targetsTitle.className = "port-inline-title";
    targetsTitle.textContent = "Target Bindings";
    const addTarget = document.createElement("button");
    addTarget.type = "button";
    addTarget.className = "inline-plus-action";
    addTarget.innerHTML = '<span class="inline-plus-action-icon">+</span><span>Add Target</span>';
    addTarget.onclick = () => {
      selectedSignal.targets.push({ object_id: "", port: "" });
      touch();
      queueRender();
    };
    targetsHead.append(targetsTitle, addTarget);
    targetsSection.append(targetsHead);

    const targetList = document.createElement("div");
    targetList.className = "binding-group";
    if (!selectedSignal.targets.length) {
      const empty = document.createElement("div");
      empty.className = "subview-empty";
      empty.textContent = "No target bindings yet.";
      targetList.append(empty);
    } else {
      selectedSignal.targets.forEach((target, index) => {
        const targetCard = document.createElement("div");
        targetCard.className = "binding-block";
        const targetCardHead = document.createElement("div");
        targetCardHead.className = "binding-block-head";
        const targetLabel = document.createElement("div");
        targetLabel.className = "binding-block-title";
        targetLabel.textContent = selectedSignal.targets.length > 1 ? `Target ${index + 1}` : "Target";
        const remove = iconButton("trash", "Remove target", true);
        remove.onclick = () => {
          selectedSignal.targets.splice(index, 1);
          touch();
          queueRender();
        };
        targetCardHead.append(targetLabel, remove);
        targetCard.append(targetCardHead);

        const targetFields = document.createElement("div");
        targetFields.className = "field-grid compact-grid";
        const targetObjectOptions = [{ value: "", label: "Select target object" }, ...objectOptions()];
        const targetPorts = objectPorts(target.object_id, "inputs");
        const currentTargetPort = targetPorts.find((port) => port.name === target.port);
        const targetPortOptions = [{ value: "", label: targetPorts.length ? "Select target input" : "No existing inputs" }, ...targetPorts.map((port) => ({ value: port.id, label: port.name }))];
        targetFields.append(
          selectField("Target Object", target.object_id, targetObjectOptions, (value) => {
            target.object_id = value;
            const nextPort = nextUnusedTargetPort(selectedSignal, value, index);
            target.port = nextPort ? nextPort.name : "";
            touch();
            queueRender();
          }),
          selectWithCreateField("Target Input", currentTargetPort ? currentTargetPort.id : "", targetPortOptions, (value) => {
            const nextPort = targetPorts.find((port) => port.id === value);
            target.port = nextPort ? nextPort.name : "";
            touch();
            queueRender();
          }, target.object_id ? () => {
            const targetObject = findObjectById(target.object_id);
            if (!targetObject) return;
            const name = nextPortName(targetObject.interface.inputs, selectedSignal.name || "signal.new_input");
            const newPort = ensurePort({ name, signal_type: selectedSignal.signal_type, data_type: selectedSignal.data_type, description: "" }, name);
            targetObject.interface.inputs.push(newPort);
            target.port = newPort.name;
            touch();
            queueRender();
          } : null)
        );
        targetCard.append(targetFields);
        targetList.append(targetCard);
      });
    }
    targetsSection.append(targetList);
    refs.inspectorSelection.append(targetsSection);
    refs.inspectorNotes.textContent = "Selected signal editor. The right side now edits signal metadata plus source and target bindings.";
  } else {
    [["Selection", "None"], ["Mode", "Recovery build"], ["JSON", "Live mirror enabled"]].forEach(([k, v]) => refs.inspectorSelection.append(kv(k, v)));
    refs.inspectorNotes.textContent = "The editor has been restored with a minimal stable app.js after the previous file was corrupted.";
  }
  refs.json.value = JSON.stringify(state.model, null, 2);
}

function kv(k, v) {
  const row = document.createElement("div");
  row.className = "component-inspector-row";
  row.innerHTML = `<span>${k}</span><strong>${v}</strong>`;
  return row;
}

function renderStatus() {
  refs.breadcrumbs.textContent = `${state.model.project.meta.name} / ${state.tab}${state.tab === "system" ? ` / ${state.registry}` : ""}`;
  refs.fileStatus.className = `file-status${state.dirty ? " is-dirty" : " is-saved"}`;
  refs.fileStatus.innerHTML = `<strong>${state.dirty ? "Unsaved changes" : "Saved"}</strong><span>${state.fileName || `${state.model.project.meta.id}.json`} • recovery</span>`;
  refs.chipProject.textContent = `Project ${state.model.project.meta.name}`;
  refs.chipObjects.textContent = `Objects ${objects().length}`;
  refs.chipSignals.textContent = `Signals ${signals().length}`;
  refs.chipLinks.textContent = `Links ${links().length}`;
  refs.chipAlarms.textContent = `Alarms ${alarms().length}`;
}

function render() {
  try {
    normalize();
    routePreviewUpdater = null;
    refs.workspace.innerHTML = "";
    renderTabs();
    renderTree();
    if (state.tab === "project") renderProject();
    else if (state.tab === "system" && state.registry === "objects") renderObjects();
    else if (state.tab === "system" && state.registry === "signals") renderSignals();
    else if (state.tab === "system" && state.registry === "links") renderLinks();
    else renderPlaceholder(tabs.find((t) => t.id === state.tab)?.title || "Workspace");
    renderInspector();
    renderStatus();
    saveRecovery();
    if (!refs.message.textContent) setMessage("Ready.");
  } catch (error) {
    refs.workspace.innerHTML = "";
    const p = panel("UI Render Error", "Recovery build hit a render exception.");
    const note = document.createElement("div");
    note.className = "small-note";
    note.textContent = error && error.message ? error.message : String(error);
    p.append(note);
    refs.workspace.append(p);
    refs.inspectorNotes.textContent = `Recovery render failure: ${note.textContent}`;
    refs.json.value = "";
    setMessage("UI render error. Try Reset or clear the recovery draft.", "is-error");
  }
}

async function openProject() {
  if (window.showOpenFilePicker) {
    const [handle] = await window.showOpenFilePicker({ multiple: false, types: [{ description: "JSON", accept: { "application/json": [".json"] } }] });
    if (!handle) return;
    const file = await handle.getFile();
    const text = await file.text();
    state.model = JSON.parse(text);
    state.signalComposer = defaultSignalComposer();
    state.fileHandle = handle;
    state.fileName = handle.name;
    state.dirty = false;
    render();
    setMessage(`Opened ${state.model.project.meta.name}.`, "is-ok");
    return;
  }
  refs.importFile.click();
}

async function saveProject(asNew) {
  normalize();
  const text = JSON.stringify(state.model, null, 2);
  const name = `${state.model.project.meta.id || "project"}.json`;
  if (window.showSaveFilePicker) {
    let handle = state.fileHandle;
    if (!handle || asNew) {
      handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: "JSON", accept: { "application/json": [".json"] } }] });
    }
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    state.fileHandle = handle;
    state.fileName = handle.name;
    state.dirty = false;
    render();
    setMessage(`Saved ${handle.name}.`, "is-ok");
    return;
  }
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  state.fileName = name;
  state.dirty = false;
  render();
  setMessage("Project exported as JSON.", "is-ok");
}

refs.openBtn.onclick = () => openProject().catch((e) => setMessage(`Open failed: ${e.message || e}`, "is-error"));
refs.saveBtn.onclick = () => saveProject(false).catch((e) => setMessage(`Save failed: ${e.message || e}`, "is-error"));
refs.saveAsBtn.onclick = () => saveProject(true).catch((e) => setMessage(`Save As failed: ${e.message || e}`, "is-error"));
  refs.clearBtn.onclick = () => { localStorage.removeItem(STORAGE_KEY); setMessage("Recovery draft cleared.", "is-ok"); };
refs.resetBtn.onclick = () => { state.model = blankProject(); state.signalComposer = defaultSignalComposer(); state.dirty = true; state.objectIndex = -1; state.signalIndex = -1; state.objectQuickEditId = ""; render(); setMessage("Project reset.", "is-ok"); };
refs.importFile.onchange = async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    state.model = JSON.parse(await file.text());
    state.signalComposer = defaultSignalComposer();
    state.fileName = file.name;
    state.dirty = false;
    render();
    setMessage(`Opened ${state.model.project.meta.name}.`, "is-ok");
  } catch (e) {
    setMessage(`Import failed: ${e.message || e}`, "is-error");
  }
  refs.importFile.value = "";
};

document.querySelectorAll(".library-item").forEach((btn) => {
  btn.onclick = () => { state.tab = btn.dataset.tab; state.registry = btn.dataset.registry; render(); };
});

document.addEventListener("mousemove", (event) => {
  if (state.routeDrag.active && state.routeDrag.objectId) {
    const obj = findObjectById(state.routeDrag.objectId);
    const shell = document.querySelector(state.routeDrag.shellSelector || ".routing-map-shell");
    if (obj) {
      const shellRect = shell ? shell.getBoundingClientRect() : { left: 0, top: 0 };
      const scrollLeft = shell ? shell.scrollLeft : 0;
      const scrollTop = shell ? shell.scrollTop : 0;
      const sceneOffsetX = state.routeDrag.sceneOffsetX || 0;
      const sceneOffsetY = state.routeDrag.sceneOffsetY || 0;
      obj.ui.routing.manual = true;
      obj.ui.routing.x = Math.max(40, event.clientX - shellRect.left + scrollLeft - state.routeDrag.offsetX - sceneOffsetX);
      obj.ui.routing.y = Math.max(40, event.clientY - shellRect.top + scrollTop - state.routeDrag.offsetY - sceneOffsetY);
      queueRender();
    }
  }
  if (!state.routeConnect.active) return;
  state.routeConnect.mouseX = event.clientX;
  state.routeConnect.mouseY = event.clientY;
  if (routePreviewUpdater) routePreviewUpdater();
});

document.addEventListener("mouseup", () => {
  if (state.routeDrag.active) {
    state.routeDrag = { objectId: "", active: false, offsetX: 0, offsetY: 0, sceneOffsetX: 0, sceneOffsetY: 0, shellSelector: ".routing-map-shell" };
    touch("Object moved.");
  }
  if (!state.routeConnect.active) return;
  clearRouteConnect();
  render();
});

loadRecovery();
render();
setMessage("Recovery build loaded.");

