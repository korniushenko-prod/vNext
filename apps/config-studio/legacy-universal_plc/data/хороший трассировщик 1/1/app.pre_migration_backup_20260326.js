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
    const sourceId = signal.source.object_id;
    (signal.targets || []).forEach((target) => {
      if (!sourceId || !target.object_id || sourceId === target.object_id) return;
      if (!outgoing.has(sourceId)) outgoing.set(sourceId, new Set());
      if (!incoming.has(target.object_id)) incoming.set(target.object_id, new Set());
      outgoing.get(sourceId).add(target.object_id);
      incoming.get(target.object_id).add(sourceId);
    });
  });
  return { incoming, outgoing };
}

function buildRoutingComponents(outgoing) {
  const indices = new Map();
  const lowlink = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  const componentOf = new Map();
  let index = 0;

  function strongConnect(nodeId) {
    indices.set(nodeId, index);
    lowlink.set(nodeId, index);
    index += 1;
    stack.push(nodeId);
    onStack.add(nodeId);

    (outgoing.get(nodeId) || new Set()).forEach((nextId) => {
      if (!indices.has(nextId)) {
        strongConnect(nextId);
        lowlink.set(nodeId, Math.min(lowlink.get(nodeId), lowlink.get(nextId)));
      } else if (onStack.has(nextId)) {
        lowlink.set(nodeId, Math.min(lowlink.get(nodeId), indices.get(nextId)));
      }
    });

    if (lowlink.get(nodeId) === indices.get(nodeId)) {
      const component = [];
      let popped = "";
      do {
        popped = stack.pop();
        onStack.delete(popped);
        componentOf.set(popped, components.length);
        component.push(popped);
      } while (popped !== nodeId);
      components.push(component);
    }
  }

  objects().forEach((obj) => {
    if (!indices.has(obj.id)) strongConnect(obj.id);
  });

  return { components, componentOf };
}

function computeRoutingLayers() {
  const { incoming, outgoing } = buildSignalAdjacency();
  const { components, componentOf } = buildRoutingComponents(outgoing);
  const componentOutgoing = new Map();
  const componentIncoming = new Map();
  const componentLayers = new Map();

  components.forEach((_, index) => {
    componentOutgoing.set(index, new Set());
    componentIncoming.set(index, new Set());
  });

  objects().forEach((obj) => {
    const srcComponent = componentOf.get(obj.id);
    (outgoing.get(obj.id) || new Set()).forEach((nextId) => {
      const dstComponent = componentOf.get(nextId);
      if (srcComponent === dstComponent) return;
      componentOutgoing.get(srcComponent).add(dstComponent);
      componentIncoming.get(dstComponent).add(srcComponent);
    });
  });

  const queue = [];
  components.forEach((_, index) => {
    if (!(componentIncoming.get(index) || new Set()).size) {
      componentLayers.set(index, 0);
      queue.push(index);
    }
  });

  if (!queue.length && components.length) {
    componentLayers.set(0, 0);
    queue.push(0);
  }

  while (queue.length) {
    const current = queue.shift();
    const baseLayer = componentLayers.get(current) || 0;
    (componentOutgoing.get(current) || new Set()).forEach((next) => {
      const nextLayer = Math.max(componentLayers.get(next) || 0, baseLayer + 1);
      if (!componentLayers.has(next) || nextLayer !== componentLayers.get(next)) {
        componentLayers.set(next, nextLayer);
        queue.push(next);
      }
    });
  }

  const layers = new Map();
  objects().forEach((obj) => {
    layers.set(obj.id, componentLayers.get(componentOf.get(obj.id)) || 0);
  });
  return { layers, incoming, outgoing };
}

function autoLayoutRoutingScene() {
  const { layers, incoming, outgoing } = computeRoutingLayers();
  const layerGroups = new Map();
  objects().forEach((obj) => {
    updateRoutingObjectSize(obj);
    const layer = layers.get(obj.id) || 0;
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer).push(obj);
  });

  const sortedLayers = [...layerGroups.keys()].sort((a, b) => a - b);
  const centers = new Map();
  const baseX = 120;
  const layerStep = 420;
  const verticalGap = 90;

  const objectWeight = (obj) => (incoming.get(obj.id) || new Set()).size + (outgoing.get(obj.id) || new Set()).size;
  const neighborCenter = (obj, dir) => {
    const refs = dir === "in" ? [...(incoming.get(obj.id) || [])] : [...(outgoing.get(obj.id) || [])];
    const values = refs
      .map((id) => centers.get(id))
      .filter((value) => Number.isFinite(value));
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const seedGroup = (layer, group) => {
    group.forEach((obj, index) => {
      const currentCenter = obj.ui.routing.y + obj.ui.routing.h / 2;
      centers.set(obj.id, Number.isFinite(currentCenter) ? currentCenter : 80 + index * (obj.ui.routing.h + verticalGap));
      if (!obj.ui.routing.manual) obj.ui.routing.x = baseX + layer * layerStep;
    });
  };

  sortedLayers.forEach((layer) => seedGroup(layer, layerGroups.get(layer) || []));

  const orderGroup = (group, direction) => {
    group.sort((a, b) => {
      const aPrimary = neighborCenter(a, direction);
      const bPrimary = neighborCenter(b, direction);
      if (aPrimary !== null || bPrimary !== null) {
        if (aPrimary === null) return 1;
        if (bPrimary === null) return -1;
        if (Math.abs(aPrimary - bPrimary) > 1) return aPrimary - bPrimary;
      }
      const aSecondary = neighborCenter(a, direction === "in" ? "out" : "in");
      const bSecondary = neighborCenter(b, direction === "in" ? "out" : "in");
      if (aSecondary !== null || bSecondary !== null) {
        if (aSecondary === null) return 1;
        if (bSecondary === null) return -1;
        if (Math.abs(aSecondary - bSecondary) > 1) return aSecondary - bSecondary;
      }
      return objectWeight(b) - objectWeight(a) || a.name.localeCompare(b.name);
    });

    let y = 80;
    group.forEach((obj) => {
      if (!obj.ui.routing.manual) {
        obj.ui.routing.y = y;
      }
      centers.set(obj.id, obj.ui.routing.y + obj.ui.routing.h / 2);
      y += obj.ui.routing.h + verticalGap;
    });
  };

  for (let pass = 0; pass < 2; pass += 1) {
    sortedLayers.forEach((layer) => orderGroup(layerGroups.get(layer) || [], "in"));
    [...sortedLayers].reverse().forEach((layer) => orderGroup(layerGroups.get(layer) || [], "out"));
  }
}

function buildRoutingSceneContext(layers) {
  const inflate = 34;
  const layerBounds = new Map();
  const objectBounds = new Map();
  const layerOrder = [];
  let sceneTop = Infinity;
  let sceneBottom = -Infinity;
  let sceneLeft = Infinity;
  let sceneRight = -Infinity;

  objects().forEach((obj) => {
    const layer = layers.get(obj.id) || 0;
    const bounds = {
      left: obj.ui.routing.x - inflate,
      right: obj.ui.routing.x + obj.ui.routing.w + inflate,
      top: obj.ui.routing.y - inflate,
      bottom: obj.ui.routing.y + obj.ui.routing.h + inflate
    };
    objectBounds.set(obj.id, bounds);
    sceneLeft = Math.min(sceneLeft, bounds.left);
    sceneRight = Math.max(sceneRight, bounds.right);
    sceneTop = Math.min(sceneTop, bounds.top);
    sceneBottom = Math.max(sceneBottom, bounds.bottom);
    if (!layerBounds.has(layer)) {
      layerBounds.set(layer, bounds);
      layerOrder.push(layer);
      return;
    }
    const current = layerBounds.get(layer);
    current.left = Math.min(current.left, bounds.left);
    current.right = Math.max(current.right, bounds.right);
    current.top = Math.min(current.top, bounds.top);
    current.bottom = Math.max(current.bottom, bounds.bottom);
  });

  return {
    inflate,
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
  const y = obj.ui.routing.y + 58 + index * 24 + 11;
  const x = side === "right" ? obj.ui.routing.x + obj.ui.routing.w + 18 : obj.ui.routing.x - 18;
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
  const inflate = 34;
  const objectBounds = new Map();
  const layerBounds = new Map();
  const layerOrder = [];
  let sceneTop = Infinity;
  let sceneBottom = -Infinity;
  let sceneLeft = Infinity;
  let sceneRight = -Infinity;

  objects().forEach((obj) => {
    const card = cardRefs.get(obj.id);
    if (!card) return;
    const layer = layers.get(obj.id) || 0;
    const rect = elementRectRelativeToBoard(card, boardRect);
    const bounds = {
      left: rect.left - inflate,
      right: rect.right + inflate,
      top: rect.top - inflate,
      bottom: rect.bottom + inflate
    };
    objectBounds.set(obj.id, bounds);
    sceneLeft = Math.min(sceneLeft, bounds.left);
    sceneRight = Math.max(sceneRight, bounds.right);
    sceneTop = Math.min(sceneTop, bounds.top);
    sceneBottom = Math.max(sceneBottom, bounds.bottom);
    if (!layerBounds.has(layer)) {
      layerBounds.set(layer, { ...bounds });
      layerOrder.push(layer);
    } else {
      const current = layerBounds.get(layer);
      current.left = Math.min(current.left, bounds.left);
      current.right = Math.max(current.right, bounds.right);
      current.top = Math.min(current.top, bounds.top);
      current.bottom = Math.max(current.bottom, bounds.bottom);
    }
  });

  const sceneContext = {
    inflate,
    objectBounds,
    layerBounds,
    layerOrder: layerOrder.sort((a, b) => a - b),
    sceneLeft: Number.isFinite(sceneLeft) ? sceneLeft : 0,
    sceneRight: Number.isFinite(sceneRight) ? sceneRight : boardRect.width,
    sceneTop: Number.isFinite(sceneTop) ? sceneTop : 0,
    sceneBottom: Number.isFinite(sceneBottom) ? sceneBottom : boardRect.height
  };

  const buildAnchorMap = (dotRefs) => {
    const anchors = new Map();
    dotRefs.forEach((dot, key) => {
      const rect = elementRectRelativeToBoard(dot, boardRect);
      anchors.set(key, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    });
    return anchors;
  };

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
  return `${signal.source.object_id}::${signal.source.port}=>${target.object_id}`;
}

function uniquePointList(points) {
  const seen = new Set();
  const result = [];
  (points || []).forEach((point) => {
    if (!point) return;
    const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ x: Math.round(point.x), y: Math.round(point.y) });
  });
  return result;
}

function orthogonalPathCost(points) {
  let total = 0;
  for (let i = 0; i < (points || []).length - 1; i += 1) {
    total += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
    if (i < points.length - 2) total += 36;
  }
  return total;
}

function pathBendCount(points) {
  let bends = 0;
  for (let i = 0; i < (points || []).length - 2; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const c = points[i + 2];
    const dir1 = a.x === b.x ? "v" : "h";
    const dir2 = b.x === c.x ? "v" : "h";
    if (dir1 !== dir2) bends += 1;
  }
  return bends;
}

function pathOuterExposure(points, sceneContext) {
  if (!points || points.length < 2) return 0;
  const left = sceneContext.sceneLeft - 56;
  const right = sceneContext.sceneRight + 56;
  const top = Math.max(24, sceneContext.sceneTop - 56);
  const bottom = sceneContext.sceneBottom + 56;
  let exposure = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a.x === b.x) {
      if (Math.abs(a.x - left) <= 18 || Math.abs(a.x - right) <= 18) {
        exposure += Math.abs(a.y - b.y);
      }
    } else if (a.y === b.y) {
      if (Math.abs(a.y - top) <= 18 || Math.abs(a.y - bottom) <= 18) {
        exposure += Math.abs(a.x - b.x);
      }
    }
  }
  return exposure;
}

function pathCorePoints(points) {
  if (!points || points.length < 3) return [];
  return uniquePointList(points.slice(1, -1));
}

function appendCoreSegments(points, treePoints, treeSegments) {
  const core = pathCorePoints(points);
  treePoints.push(...core);
  for (let i = 0; i < core.length - 1; i += 1) {
    const a = core[i];
    const b = core[i + 1];
    if (a.x === b.x && a.y === b.y) continue;
    treeSegments.push({ a, b });
  }
}

function distanceToTreePoints(targetStub, treePoints) {
  if (!treePoints.length) return Infinity;
  return Math.min(...treePoints.map((point) => Math.abs(point.x - targetStub.x) + Math.abs(point.y - targetStub.y)));
}

function coreSegmentsFromPath(points) {
  const core = pathCorePoints(points);
  const segments = [];
  for (let i = 0; i < core.length - 1; i += 1) {
    const a = core[i];
    const b = core[i + 1];
    if (a.x === b.x && a.y === b.y) continue;
    segments.push({ a, b });
  }
  return segments;
}

function segmentLength(segment) {
  return Math.abs(segment.a.x - segment.b.x) + Math.abs(segment.a.y - segment.b.y);
}

function averageTargetStub(targets) {
  if (!targets || !targets.length) return null;
  const count = targets.length;
  return {
    x: targets.reduce((sum, entry) => sum + entry.targetStub.x, 0) / count,
    y: targets.reduce((sum, entry) => sum + entry.targetStub.y, 0) / count
  };
}

function computeColumnStackProfile(sourceAnchor, targets, sceneContext) {
  const relevantBounds = [];
  if (sourceAnchor) {
    const sourceBound = [...sceneContext.objectBounds.values()].find((bound) =>
      sourceAnchor.x >= bound.left && sourceAnchor.x <= bound.right && sourceAnchor.y >= bound.top && sourceAnchor.y <= bound.bottom
    );
    if (sourceBound) relevantBounds.push(sourceBound);
  }
  (targets || []).forEach((entry) => {
    const bound = sceneContext.objectBounds.get(entry.object.id);
    if (bound) relevantBounds.push(bound);
  });
  if (relevantBounds.length < 3) return { isColumnStack: false, side: "left" };

  const overlapLeft = Math.max(...relevantBounds.map((bound) => bound.left));
  const overlapRight = Math.min(...relevantBounds.map((bound) => bound.right));
  const horizontalOverlap = overlapRight - overlapLeft;
  const averageWidth = relevantBounds.reduce((sum, bound) => sum + (bound.right - bound.left), 0) / relevantBounds.length;
  const top = Math.min(...relevantBounds.map((bound) => bound.top));
  const bottom = Math.max(...relevantBounds.map((bound) => bound.bottom));
  const verticalSpan = bottom - top;
  const centerX = relevantBounds.reduce((sum, bound) => sum + (bound.left + bound.right) / 2, 0) / relevantBounds.length;
  const varianceX = relevantBounds.reduce((sum, bound) => {
    const x = (bound.left + bound.right) / 2;
    return sum + Math.abs(x - centerX);
  }, 0) / relevantBounds.length;

  const isColumnStack =
    horizontalOverlap >= averageWidth * 0.22 &&
    verticalSpan >= averageWidth * 1.2 &&
    varianceX <= averageWidth * 0.38;

  return {
    isColumnStack,
    side: centerX >= sourceAnchor.x ? "left" : "right"
  };
}

function dominantTrunkSegmentsFromPath(points, sourceAnchor, targets, options = {}) {
  const segments = coreSegmentsFromPath(points).filter((segment) => segment.a.x === segment.b.x || segment.a.y === segment.b.y);
  if (!segments.length) return [];

  const targetCenter = averageTargetStub(targets);
  const flowSign = targetCenter ? Math.sign(targetCenter.x - sourceAnchor.x) || 1 : 1;
  const horizontalSegments = segments.filter((segment) => segment.a.y === segment.b.y);
  const verticalSegments = segments.filter((segment) => segment.a.x === segment.b.x);

  if (options.allowSideBus && verticalSegments.length) {
    const sideSegments = [...verticalSegments].sort((a, b) => segmentLength(b) - segmentLength(a));
    const trunkX = Math.round(sideSegments[0].a.x);
    return verticalSegments.filter((segment) => Math.abs(segment.a.x - trunkX) <= 1);
  }

  const scoredHorizontal = horizontalSegments.map((segment) => {
    const left = Math.min(segment.a.x, segment.b.x);
    const right = Math.max(segment.a.x, segment.b.x);
    const segmentCenterX = (left + right) / 2;
    const forwardness = flowSign >= 0 ? segmentCenterX - sourceAnchor.x : sourceAnchor.x - segmentCenterX;
    const targetCoverage = (targets || []).reduce((sum, entry) => {
      const targetX = entry.targetStub.x;
      const targetY = entry.targetStub.y;
      const inFlow =
        flowSign >= 0 ? targetX >= left - 12 && targetX >= sourceAnchor.x : targetX <= right + 12 && targetX <= sourceAnchor.x;
      if (!inFlow) return sum;
      const proximity = Math.max(0, 120 - Math.abs(targetY - segment.a.y));
      return sum + proximity;
    }, 0);
    return {
      segment,
      score: segmentLength(segment) * 1.1 + Math.max(0, forwardness) * 0.85 + targetCoverage
    };
  }).sort((a, b) => b.score - a.score);

  if (scoredHorizontal.length) {
    const trunkY = Math.round(scoredHorizontal[0].segment.a.y);
    return horizontalSegments.filter((segment) => Math.abs(segment.a.y - trunkY) <= 1);
  }

  const fallback = [...segments].sort((a, b) => segmentLength(b) - segmentLength(a))[0];
  if (!fallback) return [];
  if (fallback.a.x === fallback.b.x) {
    const x = Math.round(fallback.a.x);
    return verticalSegments.filter((segment) => Math.abs(segment.a.x - x) <= 1);
  }
  const y = Math.round(fallback.a.y);
  return horizontalSegments.filter((segment) => Math.abs(segment.a.y - y) <= 1);
}

function projectPointToSegment(point, segment) {
  if (segment.a.x === segment.b.x) {
    const top = Math.min(segment.a.y, segment.b.y);
    const bottom = Math.max(segment.a.y, segment.b.y);
    return { x: Math.round(segment.a.x), y: Math.max(top, Math.min(bottom, Math.round(point.y))) };
  }
  const left = Math.min(segment.a.x, segment.b.x);
  const right = Math.max(segment.a.x, segment.b.x);
  return { x: Math.max(left, Math.min(right, Math.round(point.x))), y: Math.round(segment.a.y) };
}

function trunkDominanceBonus(points, sourceAnchor, remainingTargets, options = {}) {
  const dominantSegments = dominantTrunkSegmentsFromPath(points, sourceAnchor, remainingTargets, options);
  if (!dominantSegments.length || !remainingTargets.length) return 0;
  return remainingTargets.reduce((sum, entry) => {
    const best = Math.min(...dominantSegments.map((segment) => {
      const projection = projectPointToSegment(entry.targetStub, segment);
      return Math.abs(projection.x - entry.targetStub.x) + Math.abs(projection.y - entry.targetStub.y);
    }));
    return sum + Math.max(0, 120 - best);
  }, 0);
}

function estimateTreeAttachmentCost(primaryPath, sourceAnchor, primaryEntry, targetsWithStubs, columnStackProfile) {
  const treePoints = [];
  const treeSegments = [];
  appendCoreSegments(primaryPath, treePoints, treeSegments);
  const remainingTargets = targetsWithStubs.filter((entry) => entry !== primaryEntry);
  if (!remainingTargets.length) {
    return {
      attachCost: 0,
      branchPenalty: 0,
      dominantSegments: dominantTrunkSegmentsFromPath(primaryPath, sourceAnchor, targetsWithStubs, {
        allowSideBus: columnStackProfile.isColumnStack
      })
    };
  }

  const dominantSegments = dominantTrunkSegmentsFromPath(primaryPath, sourceAnchor, targetsWithStubs, {
    allowSideBus: columnStackProfile.isColumnStack
  });
  let attachCost = 0;
  let branchPenalty = 0;
  remainingTargets.forEach((entry) => {
    const attachPoints = attachCandidatesForTarget(entry.targetStub, treePoints, treeSegments, dominantSegments, {
      preferDownstream: !columnStackProfile.isColumnStack
    });
    if (!attachPoints.length) {
      attachCost += 600;
      branchPenalty += 400;
      return;
    }
    const best = attachPoints.reduce((winner, candidate) => {
      const distance = Math.abs(candidate.point.x - entry.targetStub.x) + Math.abs(candidate.point.y - entry.targetStub.y);
      const score = distance + candidate.priority;
      return !winner || score < winner.score ? { score, distance, candidate } : winner;
    }, null);
    attachCost += best.distance;
    if (best.distance > 180) branchPenalty += 90;
    if (!columnStackProfile.isColumnStack && best.candidate.point.x < sourceAnchor.x - 12) branchPenalty += 120;
  });

  return { attachCost, branchPenalty, dominantSegments };
}

function attachCandidatesForTarget(targetStub, treePoints, treeSegments, preferredSegments = [], options = {}) {
  const entries = [];
  const pushCandidate = (point, priority) => {
    if (!point) return;
    entries.push({ point: { x: Math.round(point.x), y: Math.round(point.y) }, priority });
  };
  uniquePointList(treePoints).forEach((point) => pushCandidate(point, 0));
  (preferredSegments || []).forEach((segment) => {
    const projection = projectPointToSegment(targetStub, segment);
    const priority = options.preferDownstream ? -48 : -22;
    pushCandidate(projection, priority);
  });
  (treeSegments || []).forEach((segment) => {
    const a = segment.a;
    const b = segment.b;
    if (a.x === b.x) {
      const top = Math.min(a.y, b.y);
      const bottom = Math.max(a.y, b.y);
      const y = Math.max(top, Math.min(bottom, Math.round(targetStub.y)));
      pushCandidate({ x: Math.round(a.x), y }, -10);
      return;
    }
    if (a.y === b.y) {
      const left = Math.min(a.x, b.x);
      const right = Math.max(a.x, b.x);
      const x = Math.max(left, Math.min(right, Math.round(targetStub.x)));
      pushCandidate({ x, y: Math.round(a.y) }, options.preferDownstream ? -18 : -10);
    }
  });

  const byKey = new Map();
  entries.forEach((entry) => {
    const key = `${entry.point.x}:${entry.point.y}`;
    let adjustedPriority = entry.priority;
    if (options.preferDownstream) {
      if (entry.point.x < targetStub.x - 24) adjustedPriority += 36;
      if (Math.abs(entry.point.y - targetStub.y) > 120) adjustedPriority += 24;
    } else {
      if (entry.point.x > targetStub.x + 24) adjustedPriority += 18;
    }
    const current = byKey.get(key);
    if (!current || adjustedPriority < current.priority) {
      byKey.set(key, { point: entry.point, priority: adjustedPriority });
    }
  });
  return [...byKey.values()].sort((a, b) => a.priority - b.priority);
}

function pathFromPoints(points) {
  if (!points || !points.length) return "";
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
}

function obstacleListExcluding(sceneContext, objectId) {
  return [...sceneContext.objectBounds.entries()]
    .filter(([id]) => id !== objectId)
    .map(([, bounds]) => bounds);
}

function pointInsideObstacle(point, obstacles) {
  return obstacles.some((bound) =>
    point.x > bound.left + 1 &&
    point.x < bound.right - 1 &&
    point.y > bound.top + 1 &&
    point.y < bound.bottom - 1
  );
}

const ROUTE_CLEARANCE = 12;
const ROUTE_SHADOW = 28;
const ROUTE_BAND_HALF = 10;
const ROUTE_STUB_REACH = 64;
const MIN_CHANNEL_GAP = ROUTE_BAND_HALF * 2 + ROUTE_SHADOW * 2 + 12;

function orthogonalSegmentIntersectsObstacle(a, b, bound, clearance = ROUTE_CLEARANCE) {
  const left = bound.left - clearance;
  const right = bound.right + clearance;
  const top = bound.top - clearance;
  const bottom = bound.bottom + clearance;
  if (a.x === b.x) {
    const x = a.x;
    const segTop = Math.min(a.y, b.y);
    const segBottom = Math.max(a.y, b.y);
    if (x <= left || x >= right) return false;
    return !(segBottom <= top || segTop >= bottom);
  }
  if (a.y === b.y) {
    const y = a.y;
    const segLeft = Math.min(a.x, b.x);
    const segRight = Math.max(a.x, b.x);
    if (y <= top || y >= bottom) return false;
    return !(segRight <= left || segLeft >= right);
  }
  return true;
}

function segmentHitsObstacles(a, b, obstacles, clearance = ROUTE_CLEARANCE) {
  return obstacles.some((bound) => orthogonalSegmentIntersectsObstacle(a, b, bound, clearance));
}

function orthogonalBandIntersectsObstacle(a, b, bound, bandHalf = ROUTE_BAND_HALF, clearance = ROUTE_CLEARANCE) {
  const left = bound.left - clearance;
  const right = bound.right + clearance;
  const top = bound.top - clearance;
  const bottom = bound.bottom + clearance;
  if (a.x === b.x) {
    const bandLeft = a.x - bandHalf;
    const bandRight = a.x + bandHalf;
    const segTop = Math.min(a.y, b.y);
    const segBottom = Math.max(a.y, b.y);
    if (bandRight <= left || bandLeft >= right) return false;
    return !(segBottom <= top || segTop >= bottom);
  }
  if (a.y === b.y) {
    const bandTop = a.y - bandHalf;
    const bandBottom = a.y + bandHalf;
    const segLeft = Math.min(a.x, b.x);
    const segRight = Math.max(a.x, b.x);
    if (bandBottom <= top || bandTop >= bottom) return false;
    return !(segRight <= left || segLeft >= right);
  }
  return true;
}

function bandHitsObstacles(a, b, obstacles, bandHalf = ROUTE_BAND_HALF, clearance = ROUTE_CLEARANCE) {
  return obstacles.some((bound) => orthogonalBandIntersectsObstacle(a, b, bound, bandHalf, clearance));
}

function orthogonalSegmentShadowPenalty(a, b, obstacles, shadow = ROUTE_SHADOW) {
  let penalty = 0;
  for (const bound of obstacles) {
    if (a.x === b.x) {
      const x = a.x;
      const segTop = Math.min(a.y, b.y);
      const segBottom = Math.max(a.y, b.y);
      const overlapsY = !(segBottom <= bound.top || segTop >= bound.bottom);
      if (!overlapsY) continue;
      const horizontalDistance = x < bound.left ? bound.left - x : x > bound.right ? x - bound.right : 0;
      if (horizontalDistance <= shadow) {
        penalty += horizontalDistance <= shadow * 0.45 ? 180 : horizontalDistance <= shadow * 0.8 ? 80 : 28;
      }
      continue;
    }
    if (a.y === b.y) {
      const y = a.y;
      const segLeft = Math.min(a.x, b.x);
      const segRight = Math.max(a.x, b.x);
      const overlapsX = !(segRight <= bound.left || segLeft >= bound.right);
      if (!overlapsX) continue;
      const verticalDistance = y < bound.top ? bound.top - y : y > bound.bottom ? y - bound.bottom : 0;
      if (verticalDistance <= shadow) {
        penalty += verticalDistance <= shadow * 0.45 ? 180 : verticalDistance <= shadow * 0.8 ? 80 : 28;
      }
    }
  }
  return penalty;
}

function validateOrthogonalPath(points, obstacles, clearance = ROUTE_CLEARANCE) {
  if (!points || points.length < 2) return false;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if ((a.x !== b.x && a.y !== b.y) || segmentHitsObstacles(a, b, obstacles, clearance)) {
      return false;
    }
  }
  return true;
}

function validateOrthogonalPathWithPortals(points, obstacles, options = {}) {
  if (!points || points.length < 2) return false;
  const skipLeading = options.skipLeadingSegments || 0;
  const skipTrailing = options.skipTrailingSegments || 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    if (i < skipLeading || i >= points.length - 1 - skipTrailing) continue;
    const a = points[i];
    const b = points[i + 1];
    if ((a.x !== b.x && a.y !== b.y) || segmentHitsObstacles(a, b, obstacles, ROUTE_CLEARANCE)) {
      return false;
    }
  }
  return true;
}

function buildSafeStub(anchor, side, sceneContext, objectId) {
  const obstacles = obstacleListExcluding(sceneContext, objectId);
  const direction = side === "right" ? 1 : -1;
  let distance = Math.max(28, (sceneContext.inflate || 34) + ROUTE_BAND_HALF + ROUTE_CLEARANCE + 12);
  let x = anchor.x + direction * distance;
  let guard = 0;

  while (
    (!horizontalClear(anchor.y, anchor.x, x, obstacles) || pointInsideObstacle({ x, y: anchor.y }, obstacles)) &&
    guard < 80
  ) {
    distance += 18;
    x = anchor.x + direction * distance;
    guard += 1;
  }

  return { x, y: anchor.y };
}

function horizontalClear(y, x1, x2, obstacles) {
  return !bandHitsObstacles({ x: x1, y }, { x: x2, y }, obstacles, ROUTE_BAND_HALF, ROUTE_CLEARANCE);
}

function verticalClear(x, y1, y2, obstacles) {
  return !bandHitsObstacles({ x, y: y1 }, { x, y: y2 }, obstacles, ROUTE_BAND_HALF, ROUTE_CLEARANCE);
}

function registerChannel(channelMap, value, meta = {}) {
  const key = Math.round(value);
  const existing = channelMap.get(key);
  const merged = existing ? { ...existing } : { kind: "derived", priority: 0 };
  const isLocalMeta = !!meta.scope;
  if (!existing || (meta.priority || 0) > (existing.priority || 0)) {
    merged.kind = meta.kind || "derived";
    merged.priority = meta.priority || 0;
  }
  if (meta.localAnchors?.length) {
    const anchors = new Set([...(merged.localAnchors || []), ...meta.localAnchors.map((item) => Math.round(item))]);
    merged.localAnchors = [...anchors];
  }
  if (meta.localRanges?.length) {
    const ranges = [...(merged.localRanges || [])];
    meta.localRanges.forEach((range) => {
      if (!range) return;
      const min = Math.round(Math.min(range.min, range.max));
      const max = Math.round(Math.max(range.min, range.max));
      if (!Number.isFinite(min) || !Number.isFinite(max)) return;
      if (!ranges.some((item) => item.min === min && item.max === max)) ranges.push({ min, max });
    });
    merged.localRanges = ranges;
  }
  const hasLocalScope = !!((merged.localAnchors && merged.localAnchors.length) || (merged.localRanges && merged.localRanges.length));
  if (isLocalMeta || hasLocalScope) {
    merged.global = false;
  } else {
    merged.global = true;
  }
  channelMap.set(key, merged);
}

function addLaneVariants(channelMap, center, width, meta = {}) {
  registerChannel(channelMap, center, meta);
  if (width >= 84) {
    registerChannel(channelMap, center - 18, { ...meta, kind: `${meta.kind || "channel"}-lane` });
    registerChannel(channelMap, center + 18, { ...meta, kind: `${meta.kind || "channel"}-lane` });
  }
  if (width >= 132) {
    registerChannel(channelMap, center - 36, { ...meta, kind: `${meta.kind || "channel"}-lane` });
    registerChannel(channelMap, center + 36, { ...meta, kind: `${meta.kind || "channel"}-lane` });
  }
}

function addReservedLaneVariants(channelMap, trackUsage, prefix, laneWidth, meta = {}) {
  trackUsage.forEach((reservation, key) => {
    if (!key.startsWith(prefix)) return;
    const value = Number(key.slice(prefix.length));
    if (!Number.isFinite(value)) return;
    const count = typeof reservation === "number" ? reservation : reservation.count || 0;
    const variants = Math.min(3, Math.max(1, count));
    for (let i = 1; i <= variants; i += 1) {
      registerChannel(channelMap, value - laneWidth * i, { ...meta, kind: `${meta.kind || "reserved"}-lane`, priority: (meta.priority || 0) + 2 });
      registerChannel(channelMap, value + laneWidth * i, { ...meta, kind: `${meta.kind || "reserved"}-lane`, priority: (meta.priority || 0) + 2 });
    }
  });
}

function distanceToTreePoints(targetStub, treePoints) {
  if (!treePoints.length) return Infinity;
  return Math.min(...treePoints.map((point) => Math.abs(point.x - targetStub.x) + Math.abs(point.y - targetStub.y)));
}

function buildCorridorCandidates(sourceStub, targetStub, sceneContext, trackUsage = new Map(), extraPoints = [], options = {}) {
  const xChannels = new Map();
  const yChannels = new Map();
  addLaneVariants(xChannels, sourceStub.x, 72, { kind: "stub-source", priority: 10, scope: "local", localAnchors: [sourceStub.y] });
  addLaneVariants(xChannels, targetStub.x, 72, { kind: "stub-target", priority: 10, scope: "local", localAnchors: [targetStub.y] });
  addLaneVariants(xChannels, (sourceStub.x + targetStub.x) / 2, 96, { kind: "mid", priority: 18 });
  if (!options.excludeOuter) {
    addLaneVariants(xChannels, sceneContext.sceneLeft - 56, 96, { kind: "outer", priority: 8 });
    addLaneVariants(xChannels, sceneContext.sceneRight + 56, 96, { kind: "outer", priority: 8 });
  }
  addLaneVariants(yChannels, sourceStub.y, 72, { kind: "stub-source", priority: 10, scope: "local", localAnchors: [sourceStub.x] });
  addLaneVariants(yChannels, targetStub.y, 72, { kind: "stub-target", priority: 10, scope: "local", localAnchors: [targetStub.x] });
  addLaneVariants(yChannels, (sourceStub.y + targetStub.y) / 2, 96, { kind: "mid", priority: 18 });
  if (!options.excludeOuter) {
    addLaneVariants(yChannels, Math.max(24, sceneContext.sceneTop - 56), 96, { kind: "outer", priority: 8 });
    addLaneVariants(yChannels, sceneContext.sceneBottom + 56, 96, { kind: "outer", priority: 8 });
  }

  extraPoints.forEach((point) => {
    addLaneVariants(xChannels, point.x, 72, { kind: "tree", priority: 24, scope: "local", localAnchors: [point.y], localRanges: [{ min: point.y - ROUTE_STUB_REACH, max: point.y + ROUTE_STUB_REACH }] });
    addLaneVariants(yChannels, point.y, 72, { kind: "tree", priority: 24, scope: "local", localAnchors: [point.x], localRanges: [{ min: point.x - ROUTE_STUB_REACH, max: point.x + ROUTE_STUB_REACH }] });
  });

  const bounds = [...sceneContext.objectBounds.values()];
  const byLeft = [...bounds].sort((a, b) => a.left - b.left);
  const byTop = [...bounds].sort((a, b) => a.top - b.top);

  bounds.forEach((bound) => {
    const verticalRange = { min: bound.top - ROUTE_CLEARANCE - ROUTE_SHADOW, max: bound.bottom + ROUTE_CLEARANCE + ROUTE_SHADOW };
    const horizontalRange = { min: bound.left - ROUTE_CLEARANCE - ROUTE_SHADOW, max: bound.right + ROUTE_CLEARANCE + ROUTE_SHADOW };
    addLaneVariants(xChannels, bound.left - 28, 72, { kind: "clearance-edge", priority: 14, scope: "local", localRanges: [verticalRange] });
    addLaneVariants(xChannels, bound.right + 28, 72, { kind: "clearance-edge", priority: 14, scope: "local", localRanges: [verticalRange] });
    addLaneVariants(yChannels, Math.max(24, bound.top - 28), 72, { kind: "clearance-edge", priority: 14, scope: "local", localRanges: [horizontalRange] });
    addLaneVariants(yChannels, bound.bottom + 28, 72, { kind: "clearance-edge", priority: 14, scope: "local", localRanges: [horizontalRange] });
  });

  const horizontalMin = Math.min(sourceStub.x, targetStub.x);
  const horizontalMax = Math.max(sourceStub.x, targetStub.x);
  const verticalMin = Math.min(sourceStub.y, targetStub.y);
  const verticalMax = Math.max(sourceStub.y, targetStub.y);
  const localBands = bounds
    .filter((bound) => !(bound.bottom < verticalMin - 60 || bound.top > verticalMax + 60))
    .sort((a, b) => a.top - b.top);
  for (let i = 0; i < localBands.length - 1; i += 1) {
    const gap = localBands[i + 1].top - localBands[i].bottom;
    if (gap >= MIN_CHANNEL_GAP) addLaneVariants(yChannels, localBands[i].bottom + gap / 2, gap, {
      kind: "local-gap",
      priority: 42,
      scope: "local",
      localRanges: [{ min: horizontalMin - 72, max: horizontalMax + 72 }]
    });
  }

  const localColumns = bounds
    .filter((bound) => !(bound.right < horizontalMin - 60 || bound.left > horizontalMax + 60))
    .sort((a, b) => a.left - b.left);
  for (let i = 0; i < localColumns.length - 1; i += 1) {
    const gap = localColumns[i + 1].left - localColumns[i].right;
    if (gap >= MIN_CHANNEL_GAP) addLaneVariants(xChannels, localColumns[i].right + gap / 2, gap, {
      kind: "local-gap",
      priority: 42,
      scope: "local",
      localRanges: [{ min: verticalMin - 72, max: verticalMax + 72 }]
    });
  }

  for (let i = 0; i < byLeft.length - 1; i += 1) {
    const gap = byLeft[i + 1].left - byLeft[i].right;
    if (gap >= MIN_CHANNEL_GAP) addLaneVariants(xChannels, byLeft[i].right + gap / 2, gap, {
      kind: "inter-group",
      priority: 34,
      scope: "local",
      localRanges: [{
        min: Math.min(byLeft[i].top, byLeft[i + 1].top) - 72,
        max: Math.max(byLeft[i].bottom, byLeft[i + 1].bottom) + 72
      }]
    });
  }
  for (let i = 0; i < byTop.length - 1; i += 1) {
    const gap = byTop[i + 1].top - byTop[i].bottom;
    if (gap >= MIN_CHANNEL_GAP) addLaneVariants(yChannels, byTop[i].bottom + gap / 2, gap, {
      kind: "inter-group",
      priority: 34,
      scope: "local",
      localRanges: [{
        min: Math.min(byTop[i].left, byTop[i + 1].left) - 72,
        max: Math.max(byTop[i].right, byTop[i + 1].right) + 72
      }]
    });
  }

  const stackBounds = bounds
    .filter((bound) => !(bound.right < horizontalMin - 80 || bound.left > horizontalMax + 80))
    .sort((a, b) => a.top - b.top);
  if (stackBounds.length >= 3) {
    const overlapLeft = Math.max(...stackBounds.map((bound) => bound.left));
    const overlapRight = Math.min(...stackBounds.map((bound) => bound.right));
    const averageWidth = stackBounds.reduce((sum, bound) => sum + (bound.right - bound.left), 0) / stackBounds.length;
    const stackTop = Math.min(...stackBounds.map((bound) => bound.top));
    const stackBottom = Math.max(...stackBounds.map((bound) => bound.bottom));
    const verticalSpan = stackBottom - stackTop;
    if (overlapRight > overlapLeft && overlapRight - overlapLeft >= averageWidth * 0.18 && verticalSpan >= averageWidth * 1.1) {
      const stackRange = { min: stackTop - 56, max: stackBottom + 56 };
      addLaneVariants(xChannels, overlapLeft - 28, 84, {
        kind: "stack-bus",
        priority: 54,
        scope: "local",
        localRanges: [stackRange]
      });
      addLaneVariants(xChannels, overlapRight + 28, 84, {
        kind: "stack-bus",
        priority: 54,
        scope: "local",
        localRanges: [stackRange]
      });
    }
  }

  addReservedLaneVariants(xChannels, trackUsage, "vx:", 18, { kind: "reserved", priority: 22 });
  addReservedLaneVariants(yChannels, trackUsage, "hy:", 18, { kind: "reserved", priority: 22 });

  return {
    xs: [...xChannels.keys()].sort((a, b) => a - b),
    ys: [...yChannels.keys()].sort((a, b) => a - b),
    xMeta: xChannels,
    yMeta: yChannels
  };
}

function buildPathPreference(sourceStub, targetStub, sceneContext) {
  const minX = Math.min(sourceStub.x, targetStub.x) - 80;
  const maxX = Math.max(sourceStub.x, targetStub.x) + 80;
  const minY = Math.min(sourceStub.y, targetStub.y) - 120;
  const maxY = Math.max(sourceStub.y, targetStub.y) + 120;
  const nearby = [...sceneContext.objectBounds.values()].filter((bound) =>
    !(bound.right < minX || bound.left > maxX || bound.bottom < minY || bound.top > maxY)
  );
  if (!nearby.length) return { preferredVerticalXs: [] };

  const overlapLeft = Math.max(...nearby.map((bound) => bound.left));
  const overlapRight = Math.min(...nearby.map((bound) => bound.right));
  const averageWidth = nearby.reduce((sum, bound) => sum + (bound.right - bound.left), 0) / nearby.length;
  const verticalSpan = Math.max(...nearby.map((bound) => bound.bottom)) - Math.min(...nearby.map((bound) => bound.top));
  if (overlapLeft >= overlapRight || overlapRight - overlapLeft < averageWidth * 0.2 || verticalSpan < averageWidth * 1.15) {
    return { preferredVerticalXs: [] };
  }

  return {
    preferredVerticalXs: [
      Math.round(overlapLeft - 28),
      Math.round(overlapRight + 28)
    ]
  };
}

function nodeSideCrossingPenalty(axisValue, sourceStub, targetStub, orientation) {
  const proximity = (a, b) => {
    const distance = Math.abs(a - b);
    if (distance <= 10) return 110;
    if (distance <= 18) return 56;
    if (distance <= 28) return 24;
    return 0;
  };
  if (orientation === "h") {
    return proximity(axisValue, sourceStub.y) + proximity(axisValue, targetStub.y);
  }
  return proximity(axisValue, sourceStub.x) + proximity(axisValue, targetStub.x);
}

function getReservedTrackPenalty(trackUsage, key, signalId) {
  const reservation = trackUsage.get(key);
  if (!reservation) return 0;
  if (typeof reservation === "number") return reservation * 28;
  if (reservation.signals && reservation.signals.has(signalId)) return Math.max(0, reservation.count - 1) * 18;
  return reservation.count * 96;
}

function getBundlePreferenceAdjustment(trackUsage, prefix, value, signalId) {
  const roundedValue = Math.round(value);
  let bestDistance = Infinity;
  let bestReservation = null;
  trackUsage.forEach((reservation, key) => {
    if (!key.startsWith(prefix)) return;
    const reservedValue = Number(key.slice(prefix.length));
    if (!Number.isFinite(reservedValue)) return;
    const distance = Math.abs(reservedValue - roundedValue);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestReservation = reservation;
    }
  });

  if (!bestReservation || !Number.isFinite(bestDistance)) return 0;
  const sameSignal = !!(bestReservation.signals && bestReservation.signals.has(signalId));
  if (bestDistance === 0) return sameSignal ? -2 : 0;
  if (bestDistance <= 18) return sameSignal ? -3 : -5;
  if (bestDistance <= 36) return sameSignal ? -2 : -3;
  if (bestDistance <= 54) return sameSignal ? -1 : -2;
  return 0;
}

function signalFamilyId(signalId) {
  const signal = signals().find((item) => item.id === signalId);
  if (!signal) return signalId || "";
  return `${signal.source.object_id}::${signal.source.port}`;
}

function getChannelOccupancyPenalty(trackUsage, prefix, value, signalId) {
  const roundedValue = Math.round(value);
  const familyId = signalFamilyId(signalId);
  let penalty = 0;
  trackUsage.forEach((reservation, key) => {
    if (!key.startsWith(prefix)) return;
    const reservedValue = Number(key.slice(prefix.length));
    if (!Number.isFinite(reservedValue)) return;
    const distance = Math.abs(reservedValue - roundedValue);
    if (distance > 54) return;
    const sameSignal = !!(reservation.signals && reservation.signals.has(signalId));
    const sameFamily = !!(reservation.families && reservation.families.has(familyId));
    if (sameSignal) return;
    const weight = distance <= 18 ? 18 : distance <= 36 ? 10 : 4;
    penalty += sameFamily ? Math.round(weight * 0.45) : weight;
  });
  return penalty;
}

function isExactTrackBlocked(trackUsage, key, signalId) {
  const reservation = trackUsage.get(key);
  if (!reservation || typeof reservation === "number") return false;
  if (!reservation.signals || !reservation.signals.size) return false;
  if (reservation.signals.has(signalId)) return false;
  return true;
}

function isNearbyTrackBlocked(trackUsage, prefix, value, signalId, minSpacing = 16) {
  const roundedValue = Math.round(value);
  let blocked = false;
  trackUsage.forEach((reservation, key) => {
    if (blocked || !key.startsWith(prefix)) return;
    const reservedValue = Number(key.slice(prefix.length));
    if (!Number.isFinite(reservedValue)) return;
    if (Math.abs(reservedValue - roundedValue) > minSpacing) return;
    if (typeof reservation === "number") {
      if (reservation > 0) blocked = true;
      return;
    }
    if (!reservation.signals || !reservation.signals.size) return;
    if (!reservation.signals.has(signalId)) blocked = true;
  });
  return blocked;
}

function corridorRegionKey(a, b) {
  if (!a || !b) return null;
  if (a.x === b.x) {
    const xBand = Math.round(a.x / 48);
    const topBand = Math.floor(Math.min(a.y, b.y) / 96);
    const bottomBand = Math.floor(Math.max(a.y, b.y) / 96);
    return `vr:${xBand}:${topBand}:${bottomBand}`;
  }
  if (a.y === b.y) {
    const yBand = Math.round(a.y / 48);
    const leftBand = Math.floor(Math.min(a.x, b.x) / 96);
    const rightBand = Math.floor(Math.max(a.x, b.x) / 96);
    return `hr:${yBand}:${leftBand}:${rightBand}`;
  }
  return null;
}

function routeEnvelope(points) {
  if (!points || !points.length) return null;
  return {
    left: Math.min(...points.map((point) => point.x)),
    right: Math.max(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
    bottom: Math.max(...points.map((point) => point.y))
  };
}

function routeFamilySeparationPenalty(trackUsage, points, signalId) {
  const envelope = routeEnvelope(points);
  if (!envelope) return 0;
  const familyId = signalFamilyId(signalId);
  let penalty = 0;
  trackUsage.forEach((reservation, key) => {
    if (!key.startsWith("env:")) return;
    if (typeof reservation === "number") return;
    if (reservation.families?.has(familyId)) return;
    const [, left, top, right, bottom] = key.split(":");
    const other = {
      left: Number(left),
      top: Number(top),
      right: Number(right),
      bottom: Number(bottom)
    };
    const overlapX = Math.max(0, Math.min(envelope.right, other.right) - Math.max(envelope.left, other.left));
    const overlapY = Math.max(0, Math.min(envelope.bottom, other.bottom) - Math.max(envelope.top, other.top));
    if (overlapX <= 0 || overlapY <= 0) return;
    const overlapArea = overlapX * overlapY;
    penalty += Math.min(520, 80 + Math.round(overlapArea / 180));
  });
  return penalty;
}

function getCorridorRegionPenalty(trackUsage, a, b, signalId) {
  const key = corridorRegionKey(a, b);
  if (!key) return 0;
  const reservation = trackUsage.get(key);
  if (!reservation) return 0;
  if (typeof reservation === "number") return reservation * 140;
  if (reservation.signals?.has(signalId)) return 0;
  return (reservation.count || 1) * 180;
}

function edgeAllowedByChannelScope(meta, axisStart, axisEnd) {
  if (!meta || meta.global) return true;
  const low = Math.min(axisStart, axisEnd);
  const high = Math.max(axisStart, axisEnd);
  const anchorMatch = (meta.localAnchors || []).some((anchor) => {
    const reachLow = anchor - ROUTE_STUB_REACH;
    const reachHigh = anchor + ROUTE_STUB_REACH;
    return low >= reachLow && high <= reachHigh;
  });
  if (anchorMatch) return true;
  return (meta.localRanges || []).some((range) => low >= range.min && high <= range.max);
}

function pointAllowedByChannelScope(meta, orthogonalValue) {
  if (!meta || meta.global) return true;
  const anchorMatch = (meta.localAnchors || []).some((anchor) => Math.abs(anchor - orthogonalValue) <= ROUTE_STUB_REACH);
  if (anchorMatch) return true;
  return (meta.localRanges || []).some((range) => orthogonalValue >= range.min && orthogonalValue <= range.max);
}

function mergeNumericRanges(ranges = []) {
  if (!ranges.length) return [];
  const sorted = [...ranges]
    .map((range) => ({ min: Math.min(range.min, range.max), max: Math.max(range.min, range.max) }))
    .sort((a, b) => a.min - b.min || a.max - b.max);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.min <= last.max + 1) {
      last.max = Math.max(last.max, current.max);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

function buildChannelInstances(values, metaMap, orientation, sceneContext) {
  const instances = [];
  const sceneMin = orientation === "x" ? Math.max(0, sceneContext.sceneTop - 120) : Math.max(0, sceneContext.sceneLeft - 120);
  const sceneMax = orientation === "x" ? sceneContext.sceneBottom + 120 : sceneContext.sceneRight + 120;
  values.forEach((value) => {
    const rounded = Math.round(value);
    const meta = metaMap.get(rounded) || { kind: "derived", priority: 0, global: true };
    const rawRanges = [];
    if (meta.global || (!meta.localAnchors?.length && !meta.localRanges?.length)) {
      rawRanges.push({ min: sceneMin, max: sceneMax });
    }
    (meta.localRanges || []).forEach((range) => rawRanges.push({ min: range.min, max: range.max }));
    (meta.localAnchors || []).forEach((anchor) => rawRanges.push({ min: anchor - ROUTE_STUB_REACH, max: anchor + ROUTE_STUB_REACH }));
    mergeNumericRanges(rawRanges).forEach((range, index) => {
      instances.push({
        id: `${orientation}:${rounded}:${index}`,
        orientation,
        coord: rounded,
        min: Math.max(sceneMin, Math.round(range.min)),
        max: Math.min(sceneMax, Math.round(range.max)),
        meta
      });
    });
  });
  return instances;
}

function reservePathTracks(points, trackUsage, signalId) {
  const familyId = signalFamilyId(signalId);
  const envelope = routeEnvelope(points);
  if (envelope) {
    const envKey = `env:${Math.round(envelope.left)}:${Math.round(envelope.top)}:${Math.round(envelope.right)}:${Math.round(envelope.bottom)}`;
    const envEntry = trackUsage.get(envKey) || { count: 0, signals: new Set(), families: new Set() };
    if (!envEntry.signals.has(signalId)) envEntry.count += 1;
    envEntry.signals.add(signalId);
    envEntry.families.add(familyId);
    trackUsage.set(envKey, envEntry);
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a.x === b.x) {
      const key = `vx:${Math.round(a.x)}`;
      const entry = trackUsage.get(key) || { count: 0, signals: new Set(), families: new Set() };
      if (!entry.signals.has(signalId)) entry.count += 1;
      entry.signals.add(signalId);
      entry.families.add(familyId);
      trackUsage.set(key, entry);
      const regionKey = corridorRegionKey(a, b);
      if (regionKey) {
        const regionEntry = trackUsage.get(regionKey) || { count: 0, signals: new Set(), families: new Set() };
        if (!regionEntry.signals.has(signalId)) regionEntry.count += 1;
        regionEntry.signals.add(signalId);
        regionEntry.families.add(familyId);
        trackUsage.set(regionKey, regionEntry);
      }
    } else if (a.y === b.y) {
      const key = `hy:${Math.round(a.y)}`;
      const entry = trackUsage.get(key) || { count: 0, signals: new Set(), families: new Set() };
      if (!entry.signals.has(signalId)) entry.count += 1;
      entry.signals.add(signalId);
      entry.families.add(familyId);
      trackUsage.set(key, entry);
      const regionKey = corridorRegionKey(a, b);
      if (regionKey) {
        const regionEntry = trackUsage.get(regionKey) || { count: 0, signals: new Set(), families: new Set() };
        if (!regionEntry.signals.has(signalId)) regionEntry.count += 1;
        regionEntry.signals.add(signalId);
        regionEntry.families.add(familyId);
        trackUsage.set(regionKey, regionEntry);
      }
    }
  }
}

function buildCorridorGraph(sourceStub, targetStub, sceneContext, trackUsage, signalId, extraPoints = [], options = {}) {
  const obstacles = [...sceneContext.objectBounds.values()];
  const { xs, ys, xMeta, yMeta } = buildCorridorCandidates(sourceStub, targetStub, sceneContext, trackUsage, extraPoints, options);
  const xChannels = buildChannelInstances(xs, xMeta, "x", sceneContext);
  const yChannels = buildChannelInstances(ys, yMeta, "y", sceneContext);
  const preference = buildPathPreference(sourceStub, targetStub, sceneContext);
  const nodes = [];
  const nodeById = new Map();
  const rowMap = new Map();
  const colMap = new Map();

  xChannels.forEach((xChannel) => {
    yChannels.forEach((yChannel) => {
      const x = xChannel.coord;
      const y = yChannel.coord;
      if (y < xChannel.min || y > xChannel.max) return;
      if (x < yChannel.min || x > yChannel.max) return;
      const node = { id: `${xChannel.id}|${yChannel.id}`, x, y, xChannel, yChannel };
      if (pointInsideObstacle(node, obstacles)) return;
      nodes.push(node);
      nodeById.set(node.id, node);
      if (!rowMap.has(yChannel.id)) rowMap.set(yChannel.id, []);
      if (!colMap.has(xChannel.id)) colMap.set(xChannel.id, []);
      rowMap.get(yChannel.id).push(node);
      colMap.get(xChannel.id).push(node);
    });
  });

  const adjacency = new Map();
  nodes.forEach((node) => adjacency.set(node.id, []));

  rowMap.forEach((rowNodes, rowId) => {
    rowNodes.sort((a, b) => a.x - b.x);
    for (let i = 0; i < rowNodes.length - 1; i += 1) {
      const a = rowNodes[i];
      const b = rowNodes[i + 1];
      const y = a.y;
      const trackKey = `hy:${Math.round(y)}`;
      const meta = a.yChannel?.meta || { priority: 0 };
      if (!horizontalClear(y, a.x, b.x, obstacles)) continue;
      if (isExactTrackBlocked(trackUsage, trackKey, signalId)) continue;
      if (isNearbyTrackBlocked(trackUsage, "hy:", y, signalId, 14)) continue;
      const reservationPenalty = getReservedTrackPenalty(trackUsage, trackKey, signalId);
      const bundleAdjustment = getBundlePreferenceAdjustment(trackUsage, "hy:", y, signalId);
      const occupancyPenalty = getChannelOccupancyPenalty(trackUsage, "hy:", y, signalId);
      const regionPenalty = getCorridorRegionPenalty(trackUsage, a, b, signalId);
      const nodePenalty = nodeSideCrossingPenalty(y, sourceStub, targetStub, "h");
      const shadowPenalty = orthogonalSegmentShadowPenalty(a, b, obstacles);
      let cost = Math.abs(a.x - b.x) + reservationPenalty + occupancyPenalty + regionPenalty + bundleAdjustment + shadowPenalty + nodePenalty;
      cost *= meta.priority >= 40 ? 0.74 : meta.priority >= 30 ? 0.84 : meta.priority >= 18 ? 0.94 : 1;
      if (meta.kind === "outer") cost += 180;
      cost = Math.max(6, cost);
      adjacency.get(a.id).push({ to: b.id, dir: "h", cost });
      adjacency.get(b.id).push({ to: a.id, dir: "h", cost });
    }
  });

  colMap.forEach((colNodes, colId) => {
    colNodes.sort((a, b) => a.y - b.y);
    for (let i = 0; i < colNodes.length - 1; i += 1) {
      const a = colNodes[i];
      const b = colNodes[i + 1];
      const x = a.x;
      const trackKey = `vx:${Math.round(x)}`;
      const meta = a.xChannel?.meta || { priority: 0 };
      if (!verticalClear(x, a.y, b.y, obstacles)) continue;
      if (isExactTrackBlocked(trackUsage, trackKey, signalId)) continue;
      if (isNearbyTrackBlocked(trackUsage, "vx:", x, signalId, 14)) continue;
      const reservationPenalty = getReservedTrackPenalty(trackUsage, trackKey, signalId);
      const bundleAdjustment = getBundlePreferenceAdjustment(trackUsage, "vx:", x, signalId);
      const occupancyPenalty = getChannelOccupancyPenalty(trackUsage, "vx:", x, signalId);
      const regionPenalty = getCorridorRegionPenalty(trackUsage, a, b, signalId);
      const nodePenalty = nodeSideCrossingPenalty(x, sourceStub, targetStub, "v");
      const shadowPenalty = orthogonalSegmentShadowPenalty(a, b, obstacles);
      let cost = Math.abs(a.y - b.y) + reservationPenalty + occupancyPenalty + regionPenalty + bundleAdjustment + shadowPenalty + nodePenalty;
      cost *= meta.priority >= 40 ? 0.74 : meta.priority >= 30 ? 0.84 : meta.priority >= 18 ? 0.94 : 1;
      if (meta.kind === "outer") cost += 180;
      if (preference.preferredVerticalXs.some((candidate) => Math.abs(candidate - x) <= 14)) cost *= 0.72;
      cost = Math.max(6, cost);
      adjacency.get(a.id).push({ to: b.id, dir: "v", cost });
      adjacency.get(b.id).push({ to: a.id, dir: "v", cost });
    }
  });

  return { nodes, nodeById, adjacency, obstacles };
}

function nodeIdsAtPoint(nodes, point) {
  return (nodes || [])
    .filter((node) => node.x === Math.round(point.x) && node.y === Math.round(point.y))
    .map((node) => node.id);
}

function pathAllowedByChannelScopes(points, xMeta, yMeta) {
  if (!points || points.length < 2) return false;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a.x === b.x) {
      const meta = xMeta.get(Math.round(a.x));
      if (!edgeAllowedByChannelScope(meta, a.y, b.y)) return false;
      continue;
    }
    if (a.y === b.y) {
      const meta = yMeta.get(Math.round(a.y));
      if (!edgeAllowedByChannelScope(meta, a.x, b.x)) return false;
      continue;
    }
    return false;
  }
  return true;
}

function pathBlockedByTrackRules(points, trackUsage, signalId) {
  if (!points || points.length < 2) return true;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a.x === b.x) {
      const key = `vx:${Math.round(a.x)}`;
      if (isExactTrackBlocked(trackUsage, key, signalId) || isNearbyTrackBlocked(trackUsage, "vx:", a.x, signalId, 14)) return true;
    } else if (a.y === b.y) {
      const key = `hy:${Math.round(a.y)}`;
      if (isExactTrackBlocked(trackUsage, key, signalId) || isNearbyTrackBlocked(trackUsage, "hy:", a.y, signalId, 14)) return true;
    } else {
      return true;
    }
  }
  return false;
}

function pathTrackPenalty(points, trackUsage, signalId, sourceStub, targetStub) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a.x === b.x) {
      total += getReservedTrackPenalty(trackUsage, `vx:${Math.round(a.x)}`, signalId);
      total += getChannelOccupancyPenalty(trackUsage, "vx:", a.x, signalId);
      total += getCorridorRegionPenalty(trackUsage, a, b, signalId);
      total += getBundlePreferenceAdjustment(trackUsage, "vx:", a.x, signalId);
      total += nodeSideCrossingPenalty(a.x, sourceStub, targetStub, "v");
    } else if (a.y === b.y) {
      total += getReservedTrackPenalty(trackUsage, `hy:${Math.round(a.y)}`, signalId);
      total += getChannelOccupancyPenalty(trackUsage, "hy:", a.y, signalId);
      total += getCorridorRegionPenalty(trackUsage, a, b, signalId);
      total += getBundlePreferenceAdjustment(trackUsage, "hy:", a.y, signalId);
      total += nodeSideCrossingPenalty(a.y, sourceStub, targetStub, "h");
    }
  }
  return total;
}

function solveDirectOrthogonalPath(sourceStub, targetStub, sceneContext, trackUsage, signalId, extraPoints = [], options = {}) {
  const { xs, ys, xMeta, yMeta } = buildCorridorCandidates(sourceStub, targetStub, sceneContext, trackUsage, extraPoints, options);
  const obstacles = [...sceneContext.objectBounds.values()];
  const candidatePaths = [];

  candidatePaths.push([sourceStub, targetStub]);
  candidatePaths.push([sourceStub, { x: sourceStub.x, y: targetStub.y }, targetStub]);
  candidatePaths.push([sourceStub, { x: targetStub.x, y: sourceStub.y }, targetStub]);
  ys.forEach((y) => {
    candidatePaths.push([sourceStub, { x: sourceStub.x, y }, { x: targetStub.x, y }, targetStub]);
  });
  xs.forEach((x) => {
    candidatePaths.push([sourceStub, { x, y: sourceStub.y }, { x, y: targetStub.y }, targetStub]);
  });

  const uniqueCandidates = [];
  const seen = new Set();
  candidatePaths.forEach((points) => {
    const simplified = simplifyOrthogonalPath(points);
    const key = simplified.map((point) => `${Math.round(point.x)}:${Math.round(point.y)}`).join("|");
    if (!key || seen.has(key)) return;
    seen.add(key);
    uniqueCandidates.push(simplified);
  });

  const scored = uniqueCandidates
    .filter((points) => pathAllowedByChannelScopes(points, xMeta, yMeta))
    .filter((points) => validateOrthogonalPath(points, obstacles, ROUTE_CLEARANCE))
    .filter((points) => !pathBlockedByTrackRules(points, trackUsage, signalId))
    .map((points) => ({
      points,
      score:
        orthogonalPathCost(points) +
        pathTrackPenalty(points, trackUsage, signalId, sourceStub, targetStub) +
        pathOuterExposure(points, sceneContext) * 2.2 +
        pathBendCount(points) * 26 +
        routeFamilySeparationPenalty(trackUsage, points, signalId)
    }))
    .sort((a, b) => a.score - b.score);

  return scored[0]?.points || null;
}

function fallbackOrthogonalPath(sourceStub, targetStub, sceneContext) {
  const { ys } = buildCorridorCandidates(sourceStub, targetStub, sceneContext);
  const obstacles = [...sceneContext.objectBounds.values()];
  const candidates = [];

  ys.forEach((y) => {
    if (
      verticalClear(sourceStub.x, sourceStub.y, y, obstacles) &&
      horizontalClear(y, sourceStub.x, targetStub.x, obstacles) &&
      verticalClear(targetStub.x, y, targetStub.y, obstacles)
    ) {
      const cost =
        Math.abs(sourceStub.y - y) +
        Math.abs(sourceStub.x - targetStub.x) +
        Math.abs(targetStub.y - y);
      candidates.push({
        points: [
          sourceStub,
          { x: sourceStub.x, y },
          { x: targetStub.x, y },
          targetStub
        ],
        cost
      });
    }
  });

  const { xs } = buildCorridorCandidates(sourceStub, targetStub, sceneContext);
  xs.forEach((x) => {
    if (
      horizontalClear(sourceStub.y, sourceStub.x, x, obstacles) &&
      verticalClear(x, sourceStub.y, targetStub.y, obstacles) &&
      horizontalClear(targetStub.y, x, targetStub.x, obstacles)
    ) {
      const cost =
        Math.abs(sourceStub.x - x) +
        Math.abs(sourceStub.y - targetStub.y) +
        Math.abs(targetStub.x - x);
      candidates.push({
        points: [
          sourceStub,
          { x, y: sourceStub.y },
          { x, y: targetStub.y },
          targetStub
        ],
        cost: cost + 12
      });
    }
  });

  if (candidates.length) {
    const winner = candidates.sort((a, b) => a.cost - b.cost).find((candidate) => validateOrthogonalPath(candidate.points, obstacles, ROUTE_CLEARANCE));
    if (winner) return winner.points;
  }

  const fallback = [
    sourceStub,
    { x: sourceStub.x, y: targetStub.y },
    targetStub
  ];
  if (validateOrthogonalPath(fallback, obstacles, ROUTE_CLEARANCE)) return fallback;
  return [
    sourceStub,
    { x: targetStub.x, y: sourceStub.y },
    targetStub
  ];
}

function shortestCorridorPath(sourceStub, targetStub, sceneContext) {
  return shortestCorridorPathForSignal(sourceStub, targetStub, sceneContext, new Map(), "");
}

function simplifyOrthogonalPath(points) {
  const compact = [];
  (points || []).forEach((point) => {
    const last = compact[compact.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y) compact.push(point);
  });
  if (compact.length < 3) return compact;
  const simplified = [compact[0]];
  for (let i = 1; i < compact.length - 1; i += 1) {
    const a = simplified[simplified.length - 1];
    const b = compact[i];
    const c = compact[i + 1];
    const sameVertical = a.x === b.x && b.x === c.x;
    const sameHorizontal = a.y === b.y && b.y === c.y;
    if (!sameVertical && !sameHorizontal) simplified.push(b);
  }
  simplified.push(compact[compact.length - 1]);
  return simplified;
}

function pathNeedsReroute(points, sceneContext) {
  if (!points || points.length < 2) return true;
  return pathOuterExposure(points, sceneContext) > 180 || pathBendCount(points) > 5;
}

function shortestCorridorPathForSignal(sourceStub, targetStub, sceneContext, trackUsage, signalId, reserve = true) {
  const localOnly = solveDirectOrthogonalPath(sourceStub, targetStub, sceneContext, trackUsage, signalId, [], { excludeOuter: true });
  const allCorridors = solveDirectOrthogonalPath(sourceStub, targetStub, sceneContext, trackUsage, signalId, [], {});
  const fallback = fallbackOrthogonalPath(sourceStub, targetStub, sceneContext);
  const candidates = [localOnly, allCorridors, fallback]
    .filter((points) => points && points.length)
    .map((points, index) => {
      const outerExposure = pathOuterExposure(points, sceneContext);
      const bends = pathBendCount(points);
      const separation = routeFamilySeparationPenalty(trackUsage, points, signalId);
      const reroutePenalty = index === 2 ? 120 : 0;
      const localBonus = index === 0 ? -40 : 0;
      return {
        points,
        score: orthogonalPathCost(points) + outerExposure * 2.2 + bends * 26 + separation + reroutePenalty + localBonus
      };
    })
    .sort((a, b) => a.score - b.score);
  let chosen = candidates[0]?.points || fallback;
  const simplified = simplifyOrthogonalPath(chosen);
  const finalPoints = simplified.length ? simplified : fallback;
  if (reserve) reservePathTracks(finalPoints, trackUsage, signalId);
  return finalPoints;
}

function shortestCorridorPathToAny(startStub, destinationEntries, referenceStub, sceneContext, trackUsage, signalId, reserve = true) {
  const destinations = (destinationEntries || []).map((entry) =>
    entry?.point ? { point: entry.point, priority: entry.priority || 0 } : { point: entry, priority: 0 }
  ).filter((entry) => entry.point);
  const destinationPoints = destinations.map((entry) => entry.point);
  const extraPoints = uniquePointList([...(destinationPoints || []), referenceStub, startStub]);
  const scored = destinations.map((entry) => {
    const localOnly = solveDirectOrthogonalPath(startStub, entry.point, sceneContext, trackUsage, signalId, extraPoints, { excludeOuter: true });
    const allCorridors = solveDirectOrthogonalPath(startStub, entry.point, sceneContext, trackUsage, signalId, extraPoints, {});
    const fallback = fallbackOrthogonalPath(startStub, entry.point, sceneContext);
    const candidates = [localOnly, allCorridors, fallback]
      .filter((points) => points && points.length)
      .map((points, index) => ({
        points,
        score:
          orthogonalPathCost(points) +
          pathTrackPenalty(points, trackUsage, signalId, startStub, entry.point) +
          pathOuterExposure(points, sceneContext) * 2.2 +
          pathBendCount(points) * 26 +
          routeFamilySeparationPenalty(trackUsage, points, signalId) +
          entry.priority +
          (index === 2 ? 120 : 0) +
          (index === 0 ? -40 : 0)
      }))
      .sort((a, b) => a.score - b.score);
    return candidates[0] || null;
  }).filter(Boolean).sort((a, b) => a.score - b.score);
  const best = scored[0];
  if (!best) return null;
  const compact = simplifyOrthogonalPath(best.points);
  if (!compact.length) return null;
  if (reserve) reservePathTracks(compact, trackUsage, signalId);
  return compact;
}

function segmentKey(a, b) {
  if (a.x === b.x) {
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    return `v:${a.x}:${top}:${bottom}`;
  }
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  return `h:${a.y}:${left}:${right}`;
}

function addPathSegments(points, seen, segments) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a.x === b.x && a.y === b.y) continue;
    const key = segmentKey(a, b);
    if (seen.has(key)) continue;
    seen.add(key);
    const segmentPoints = [a, b];
    segments.push({ points: segmentPoints, d: pathFromPoints(segmentPoints) });
  }
}

function glossSignalSegments(segmentPaths, sceneContext = null) {
  const verticals = new Map();
  const horizontals = new Map();

  (segmentPaths || []).forEach((segment) => {
    const [a, b] = segment.points || [];
    if (!a || !b) return;
    if (a.x === b.x) {
      const x = Math.round(a.x);
      const top = Math.min(a.y, b.y);
      const bottom = Math.max(a.y, b.y);
      if (!verticals.has(x)) verticals.set(x, []);
      verticals.get(x).push({ start: top, end: bottom });
      return;
    }
    if (a.y === b.y) {
      const y = Math.round(a.y);
      const left = Math.min(a.x, b.x);
      const right = Math.max(a.x, b.x);
      if (!horizontals.has(y)) horizontals.set(y, []);
      horizontals.get(y).push({ start: left, end: right });
    }
  });

  const mergeRanges = (ranges) => {
    if (!ranges.length) return [];
    const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i += 1) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      if (current.start <= last.end + 8) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push({ ...current });
      }
    }
    return merged;
  };

  const glossed = [];
  const obstacles = sceneContext ? [...sceneContext.objectBounds.values()] : null;
  const canUseMergedSegment = (points) => {
    if (!obstacles) return true;
    return validateOrthogonalPath(points, obstacles, ROUTE_CLEARANCE);
  };
  verticals.forEach((ranges, x) => {
    mergeRanges(ranges).forEach((range) => {
      const points = [{ x, y: range.start }, { x, y: range.end }];
      if (canUseMergedSegment(points)) {
        glossed.push({ points, d: pathFromPoints(points) });
        return;
      }
      ranges
        .filter((item) => item.start >= range.start && item.end <= range.end)
        .forEach((item) => {
          const originalPoints = [{ x, y: item.start }, { x, y: item.end }];
          glossed.push({ points: originalPoints, d: pathFromPoints(originalPoints) });
        });
    });
  });
  horizontals.forEach((ranges, y) => {
    mergeRanges(ranges).forEach((range) => {
      const points = [{ x: range.start, y }, { x: range.end, y }];
      if (canUseMergedSegment(points)) {
        glossed.push({ points, d: pathFromPoints(points) });
        return;
      }
      ranges
        .filter((item) => item.start >= range.start && item.end <= range.end)
        .forEach((item) => {
          const originalPoints = [{ x: item.start, y }, { x: item.end, y }];
          glossed.push({ points: originalPoints, d: pathFromPoints(originalPoints) });
        });
    });
  });

  return glossed;
}

function computeRoutingContentBounds(sceneContext, routePaths) {
  const points = [];
  objects().forEach((obj) => {
    points.push(
      { x: obj.ui.routing.x, y: obj.ui.routing.y },
      { x: obj.ui.routing.x + obj.ui.routing.w, y: obj.ui.routing.y + obj.ui.routing.h }
    );
  });
  routePaths.forEach((path) => {
    path.points.forEach((point) => points.push(point));
  });
  if (!points.length) {
    return { left: 0, top: 0, right: 1600, bottom: 1200 };
  }
  const pad = 120;
  return {
    left: Math.min(...points.map((point) => point.x)) - pad,
    top: Math.max(0, Math.min(...points.map((point) => point.y)) - pad),
    right: Math.max(...points.map((point) => point.x)) + pad,
    bottom: Math.max(...points.map((point) => point.y)) + pad
  };
}

function buildRouteFamilyBounds(sourceObject, entries, sceneContext) {
  const allBounds = [sceneContext.objectBounds.get(sourceObject.id), ...entries.map((entry) => entry.bounds)].filter(Boolean);
  return {
    left: Math.min(...allBounds.map((bounds) => bounds.left)),
    right: Math.max(...allBounds.map((bounds) => bounds.right)),
    top: Math.min(...allBounds.map((bounds) => bounds.top)),
    bottom: Math.max(...allBounds.map((bounds) => bounds.bottom))
  };
}

function laneOffset(kind, index, spacing) {
  if (!index) return 0;
  if (kind === "top") return -index * spacing;
  if (kind === "bottom") return index * spacing;
  const step = Math.ceil(index / 2) * spacing;
  return index % 2 ? -step : step;
}

function chooseFamilyLane(sourceAnchor, entries, familyBounds, sceneContext, trackUsage, baseKey, options = {}) {
  const spacing = 18;
  const pad = 42;
  const preferredOuter = options.preferredOuter || "any";
  const searchLeft = familyBounds.left - 120;
  const searchRight = familyBounds.right + 120;
  const occupiedBands = [...sceneContext.objectBounds.values()]
    .filter((bound) => bound.right >= searchLeft && bound.left <= searchRight)
    .map((bound) => ({ top: bound.top, bottom: bound.bottom }))
    .sort((a, b) => a.top - b.top);
  const verticalEnvelope = occupiedBands.length ? {
    top: Math.min(...occupiedBands.map((bound) => bound.top)),
    bottom: Math.max(...occupiedBands.map((bound) => bound.bottom))
  } : familyBounds;
  const candidates = [
    {
      key: `lane:top:${Math.round(verticalEnvelope.top - pad)}`,
      kind: "top",
      y: Math.max(24, verticalEnvelope.top - pad),
      penalty: preferredOuter === "bottom" ? 420 : 260
    },
    {
      key: `lane:bottom:${Math.round(verticalEnvelope.bottom + pad)}`,
      kind: "bottom",
      y: verticalEnvelope.bottom + pad,
      penalty: preferredOuter === "top" ? 420 : preferredOuter === "bottom" ? 160 : 260
    }
  ];

  for (let i = 0; i < occupiedBands.length - 1; i += 1) {
    const gap = occupiedBands[i + 1].top - occupiedBands[i].bottom;
    if (gap >= 44) {
      const centerY = occupiedBands[i].bottom + gap / 2;
      candidates.push({
        key: `lane:gap:${Math.round(centerY)}`,
        kind: "gap",
        y: centerY,
        penalty: 0
      });
    }
  }

  const ys = [sourceAnchor.y, ...entries.map((entry) => entry.anchor.y)];
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scored = candidates
    .map((candidate) => {
      const laneIndex = trackUsage.get(candidate.key) || 0;
      const offset = laneOffset(candidate.kind, laneIndex, spacing);
      const y = Math.max(24, candidate.y + offset);
      let cost = ys.reduce((sum, value) => sum + Math.abs(value - y), 0) + candidate.penalty;
      if (candidate.kind === "gap" && y >= minY && y <= maxY) cost -= 120;
      return {
        key: candidate.key,
        kind: candidate.kind,
        y,
        cost
      };
    })
    .sort((a, b) => a.cost - b.cost);

  const gapCandidates = scored.filter((candidate) => candidate.kind === "gap");
  const outerCandidates = scored.filter((candidate) => candidate.kind !== "gap");
  let best = scored[0];
  if (gapCandidates.length) {
    const bestGap = gapCandidates[0];
    const bestOuter = outerCandidates[0];
    best = (!bestOuter || bestOuter.cost > bestGap.cost - 220) ? bestGap : bestOuter;
  }

  trackUsage.set(best.key, (trackUsage.get(best.key) || 0) + 1);
  return best;
}

function buildGroupedLayerBranches(entries, layerKeyFactory, trackUsage, sceneContext) {
  return [...entries.reduce((map, entry) => {
    if (!map.has(entry.layer)) map.set(entry.layer, []);
    map.get(entry.layer).push(entry);
    return map;
  }, new Map()).entries()].map(([layer, layerEntries]) => {
    const key = layerKeyFactory(layer);
    const laneIndex = trackUsage.get(key) || 0;
    trackUsage.set(key, laneIndex + 1);
    const layerBounds = sceneContext.layerBounds.get(layer);
    return {
      layer,
      entries: layerEntries,
      corridorX: (layerBounds ? layerBounds.left : Math.min(...layerEntries.map((entry) => entry.anchor.x))) - 34 - laneIndex * 12
    };
  });
}

function buildForwardGroupSegments(signal, sourceAnchor, sourceLayer, sourceLayerBounds, entries, sceneContext, trackUsage) {
  if (!entries.length) return [];
  const segments = [];
  const sourceStubX = sourceAnchor.x + 28;
  const sourceObject = findObjectById(signal.source.object_id);
  if (!sourceObject) return [];
  const adjacentForward = entries.every((entry) => entry.layer === sourceLayer + 1);

  if (adjacentForward) {
    const nextLayerBounds = sceneContext.layerBounds.get(sourceLayer + 1);
    if (!nextLayerBounds) return [];
    const corridorLeft = sourceLayerBounds.right + 18;
    const corridorRight = nextLayerBounds.left - 18;
    const corridorCenter = corridorLeft + Math.max(24, (corridorRight - corridorLeft) / 2);
    const trackKey = `${signal.source.object_id}::${signal.source.port}=>corridor:${sourceLayer}->${sourceLayer + 1}`;
    const trackIndex = trackUsage.get(trackKey) || 0;
    trackUsage.set(trackKey, trackIndex + 1);
    const laneX = Math.max(corridorLeft + 12, Math.min(corridorRight - 12, corridorCenter + trackIndex * 18));
    const ys = entries.map((entry) => entry.anchor.y);
    const trunkTop = Math.min(sourceAnchor.y, ...ys);
    const trunkBottom = Math.max(sourceAnchor.y, ...ys);

    segments.push(pathFromPoints([
      { x: sourceAnchor.x, y: sourceAnchor.y },
      { x: sourceStubX, y: sourceAnchor.y },
      { x: laneX, y: sourceAnchor.y }
    ]));
    segments.push(pathFromPoints([
      { x: laneX, y: trunkTop },
      { x: laneX, y: trunkBottom }
    ]));

    entries.forEach((entry) => {
      const targetStubX = entry.anchor.x - 28;
      segments.push(pathFromPoints([
        { x: laneX, y: entry.anchor.y },
        { x: targetStubX, y: entry.anchor.y },
        { x: entry.anchor.x, y: entry.anchor.y }
      ]));
    });
    return segments.filter(Boolean);
  }

  const familyBounds = buildRouteFamilyBounds(sourceObject, entries, sceneContext);
  const laneChoice = chooseFamilyLane(
    sourceAnchor,
    entries,
    familyBounds,
    sceneContext,
    trackUsage,
    `${signal.source.object_id}::${signal.source.port}=>forwardlane`,
    { preferredOuter: "top" }
  );
  const familyLaneY = laneChoice.y;
  const sourceTrackKey = `${signal.source.object_id}::${signal.source.port}=>forwardsource:${laneChoice.kind}`;
  const sourceTrackIndex = trackUsage.get(sourceTrackKey) || 0;
  trackUsage.set(sourceTrackKey, sourceTrackIndex + 1);
  const sourceCorridorX = sourceLayerBounds.right + 34 + sourceTrackIndex * 12;
  const layerCorridors = buildGroupedLayerBranches(
    entries,
    (layer) => `${signal.source.object_id}::${signal.source.port}=>forwardlayer:${laneChoice.kind}:${layer}`,
    trackUsage,
    sceneContext
  );
  const trunkXs = [sourceCorridorX, ...layerCorridors.map((item) => item.corridorX)];
  const trunkLeft = Math.min(...trunkXs);
  const trunkRight = Math.max(...trunkXs);

  segments.push(pathFromPoints([
    { x: sourceAnchor.x, y: sourceAnchor.y },
    { x: sourceStubX, y: sourceAnchor.y },
    { x: sourceCorridorX, y: sourceAnchor.y },
    { x: sourceCorridorX, y: familyLaneY }
  ]));
  segments.push(pathFromPoints([
    { x: trunkLeft, y: familyLaneY },
    { x: trunkRight, y: familyLaneY }
  ]));

  layerCorridors.forEach(({ entries: layerEntries, corridorX }) => {
    const ys = layerEntries.map((entry) => entry.anchor.y);
    const groupTop = Math.min(...ys);
    const groupBottom = Math.max(...ys);
    segments.push(pathFromPoints([
      { x: corridorX, y: familyLaneY },
      { x: corridorX, y: groupTop }
    ]));
    if (groupBottom > groupTop) {
      segments.push(pathFromPoints([
        { x: corridorX, y: groupTop },
        { x: corridorX, y: groupBottom }
      ]));
    }
    layerEntries.forEach((entry) => {
      const targetStubX = entry.anchor.x - 28;
      segments.push(pathFromPoints([
        { x: corridorX, y: entry.anchor.y },
        { x: targetStubX, y: entry.anchor.y },
        { x: entry.anchor.x, y: entry.anchor.y }
      ]));
    });
  });

  return segments.filter(Boolean);
}

function buildReturnGroupSegments(signal, sourceAnchor, sourceLayerBounds, entries, sceneContext, trackUsage) {
  if (!entries.length) return [];
  const segments = [];
  const sourceStubX = sourceAnchor.x + 28;
  const sourceObject = findObjectById(signal.source.object_id);
  if (!sourceObject) return [];
  const familyBounds = buildRouteFamilyBounds(sourceObject, entries, sceneContext);
  const laneChoice = chooseFamilyLane(
    sourceAnchor,
    entries,
    familyBounds,
    sceneContext,
    trackUsage,
    `${signal.source.object_id}::${signal.source.port}=>returnlane`,
    { preferredOuter: "bottom" }
  );
  const familyLaneY = laneChoice.y;
  const rightTrackKey = `${signal.source.object_id}::${signal.source.port}=>returnright:${laneChoice.kind}`;
  const rightTrackIndex = trackUsage.get(rightTrackKey) || 0;
  trackUsage.set(rightTrackKey, rightTrackIndex + 1);
  const rightCorridorX = familyBounds.right + 34 + rightTrackIndex * 12;
  const leftTrackKey = `${signal.source.object_id}::${signal.source.port}=>returnleft:${laneChoice.kind}`;
  const leftTrackIndex = trackUsage.get(leftTrackKey) || 0;
  trackUsage.set(leftTrackKey, leftTrackIndex + 1);
  const leftCorridorX = familyBounds.left - 34 - leftTrackIndex * 12;
  const ys = entries.map((entry) => entry.anchor.y);
  const groupTop = Math.min(...ys);
  const groupBottom = Math.max(...ys);

  segments.push(pathFromPoints([
    { x: sourceAnchor.x, y: sourceAnchor.y },
    { x: sourceStubX, y: sourceAnchor.y },
    { x: rightCorridorX, y: sourceAnchor.y },
    { x: rightCorridorX, y: familyLaneY }
  ]));
  segments.push(pathFromPoints([
    { x: rightCorridorX, y: familyLaneY },
    { x: leftCorridorX, y: familyLaneY }
  ]));
  segments.push(pathFromPoints([
    { x: leftCorridorX, y: groupTop },
    { x: leftCorridorX, y: groupBottom }
  ]));
  entries.forEach((entry) => {
    const targetStubX = entry.anchor.x - 28;
    segments.push(pathFromPoints([
      { x: leftCorridorX, y: entry.anchor.y },
      { x: targetStubX, y: entry.anchor.y },
      { x: entry.anchor.x, y: entry.anchor.y }
    ]));
  });

  return segments.filter(Boolean);
}

function buildSignalRouteSegments(signal, sceneContext, layers, trackUsage, renderMetrics = null) {
  const sourceObject = findObjectById(signal.source.object_id);
  const sourcePort = sourceObject ? objectPorts(sourceObject.id, "outputs").find((port) => port.name === signal.source.port) : null;
  if (!sourceObject || !sourcePort || !(signal.targets || []).length) return [];

  const sourceKey = `${sourceObject.id}::${sourcePort.name}`;
  const sourceAnchor = renderMetrics?.sourceAnchors?.get(sourceKey) || portAnchor(sourceObject, sourcePort, "outputs", "right");
  const sourceStub = buildSafeStub(sourceAnchor, "right", sceneContext, sourceObject.id);
  const validTargets = (signal.targets || []).map((target) => {
    const object = findObjectById(target.object_id);
    const port = object ? objectPorts(target.object_id, "inputs").find((candidate) => candidate.name === target.port) : null;
    if (!object || !port) return null;
    const targetKey = `${target.object_id}::${target.port}`;
    return {
      target,
      object,
      port,
      anchor: renderMetrics?.targetAnchors?.get(targetKey) || portAnchor(object, port, "inputs", "left")
    };
  }).filter(Boolean);

  if (!validTargets.length) return [];
  const seen = new Set();
  const segments = [];
  const targetsWithStubs = validTargets.map((entry) => ({
    ...entry,
    targetStub: buildSafeStub(entry.anchor, "left", sceneContext, entry.object.id)
  }));
  const columnStackProfile = computeColumnStackProfile(sourceAnchor, targetsWithStubs, sceneContext);
  const routeObstaclesFor = () => [...sceneContext.objectBounds.values()];
  const isPrimaryPathValid = (points) => validateOrthogonalPathWithPortals(points, routeObstaclesFor(), {
    skipLeadingSegments: 1,
    skipTrailingSegments: 1
  });
  const isBranchPathValid = (points) => validateOrthogonalPathWithPortals(points, routeObstaclesFor(), {
    skipLeadingSegments: 1,
    skipTrailingSegments: 0
  });

  const primaryCandidates = targetsWithStubs.map((entry) => {
    const corridorPoints = shortestCorridorPathForSignal(sourceStub, entry.targetStub, sceneContext, trackUsage, signal.id, false);
    const fullPath = [sourceAnchor, sourceStub, ...corridorPoints.slice(1, -1), entry.targetStub, entry.anchor];
    const remainingTargets = targetsWithStubs.filter((targetEntry) => targetEntry !== entry);
    const corePoints = pathCorePoints(fullPath);
    const attachmentCost = remainingTargets.reduce((sum, targetEntry) => sum + distanceToTreePoints(targetEntry.targetStub, corePoints), 0);
    const dominanceBonus = trunkDominanceBonus(fullPath, sourceAnchor, remainingTargets, {
      allowSideBus: columnStackProfile.isColumnStack
    });
    const flowPenalty = columnStackProfile.isColumnStack ? 0 : Math.max(0, sourceAnchor.x - entry.targetStub.x) * 1.5;
    const outerPenalty = pathOuterExposure(fullPath, sceneContext) * 2.8;
    const bendPenalty = pathBendCount(fullPath) * 24;
    const separationPenalty = routeFamilySeparationPenalty(trackUsage, fullPath, signal.id);
    const treeEstimate = estimateTreeAttachmentCost(fullPath, sourceAnchor, entry, targetsWithStubs, columnStackProfile);
    return {
      entry,
      fullPath,
      cost: orthogonalPathCost(fullPath),
      score:
        orthogonalPathCost(fullPath) +
        attachmentCost * 0.45 +
        treeEstimate.attachCost * 0.75 +
        treeEstimate.branchPenalty +
        flowPenalty +
        outerPenalty +
        separationPenalty +
        bendPenalty -
        dominanceBonus
    };
  }).sort((a, b) => a.score - b.score || a.cost - b.cost);

  const primary = primaryCandidates[0];
  if (!primary) return [];

  let primaryPath = primary.fullPath;
  if (!isPrimaryPathValid(primaryPath)) {
    const fallback = [sourceAnchor, sourceStub, ...fallbackOrthogonalPath(sourceStub, primary.entry.targetStub, sceneContext).slice(1, -1), primary.entry.targetStub, primary.entry.anchor];
    if (isPrimaryPathValid(fallback)) {
      primaryPath = fallback;
    } else {
      return [];
    }
  }
  reservePathTracks(primaryPath, trackUsage, signal.id);
  addPathSegments(primaryPath, seen, segments);

  const treePoints = [];
  const treeSegments = [];
  appendCoreSegments(primaryPath, treePoints, treeSegments);
  const dominantSegments = dominantTrunkSegmentsFromPath(primaryPath, sourceAnchor, targetsWithStubs, {
    allowSideBus: columnStackProfile.isColumnStack
  });
  const remaining = targetsWithStubs.filter((entry) => entry !== primary.entry)
    .sort((a, b) => {
      const aScore = distanceToTreePoints(a.targetStub, treePoints);
      const bScore = distanceToTreePoints(b.targetStub, treePoints);
      return aScore - bScore;
    });

  remaining.forEach((entry) => {
    const attachPoints = attachCandidatesForTarget(entry.targetStub, treePoints, treeSegments, dominantSegments, {
      preferDownstream: !columnStackProfile.isColumnStack
    });
    const branchPoints = shortestCorridorPathToAny(entry.targetStub, attachPoints, sourceStub, sceneContext, trackUsage, signal.id, false);
    let branchPath = branchPoints ? [entry.anchor, entry.targetStub, ...branchPoints.slice(1)] : null;
    if (!branchPath || !isBranchPathValid(branchPath)) {
      const fallback = [sourceAnchor, sourceStub, ...fallbackOrthogonalPath(sourceStub, entry.targetStub, sceneContext).slice(1, -1), entry.targetStub, entry.anchor];
      if (isPrimaryPathValid(fallback)) {
        branchPath = fallback;
      } else {
        branchPath = null;
      }
    }
    if (!branchPath) return;
    reservePathTracks(branchPath, trackUsage, signal.id);
    addPathSegments(branchPath, seen, segments);
    appendCoreSegments(branchPath, treePoints, treeSegments);
  });

  return segments;
}

function signalRoutingPriority(signal, sceneContext) {
  const sourceObject = findObjectById(signal.source.object_id);
  const sourceBounds = sourceObject ? sceneContext.objectBounds.get(sourceObject.id) : null;
  const targets = (signal.targets || [])
    .map((target) => sceneContext.objectBounds.get(target.object_id))
    .filter(Boolean);
  if (!sourceBounds || !targets.length) return 0;
  const left = Math.min(sourceBounds.left, ...targets.map((bound) => bound.left));
  const right = Math.max(sourceBounds.right, ...targets.map((bound) => bound.right));
  const top = Math.min(sourceBounds.top, ...targets.map((bound) => bound.top));
  const bottom = Math.max(sourceBounds.bottom, ...targets.map((bound) => bound.bottom));
  const span = (right - left) + (bottom - top);
  return span + targets.length * 240;
}

function routeSignalsForScene(sceneContext, layers, renderMetrics = null) {
  const complexityOrder = [...signals()].sort((a, b) => signalRoutingPriority(b, sceneContext) - signalRoutingPriority(a, sceneContext));
  const evaluatePlan = (orderedSignals) => {
    const trackUsage = new Map();
    return orderedSignals.map((signal) => {
      const segments = glossSignalSegments(
        buildSignalRouteSegments(signal, sceneContext, layers, trackUsage, renderMetrics),
        sceneContext
      );
      const points = segments.flatMap((segment) => segment.points || []);
      return {
        signal,
        segments,
        badness: pathOuterExposure(points, sceneContext) + pathBendCount(points) * 80 + segments.length * 8
      };
    });
  };

  const pass1 = evaluatePlan(complexityOrder);
  const rerouteOrder = [...pass1]
    .sort((a, b) => b.badness - a.badness || signalRoutingPriority(b.signal, sceneContext) - signalRoutingPriority(a.signal, sceneContext))
    .map((entry) => entry.signal);
  return evaluatePlan(rerouteOrder);
}

function routeEdgePath(sourceAnchor, targetAnchor, trackIndex, options = null) {
  const stub = 28;
  const spacing = 18;
  const xStart = sourceAnchor.x + stub;
  const xEnd = targetAnchor.x - stub;

  if (!options) {
    const laneBase = xStart < xEnd ? xStart + Math.max(48, (xEnd - xStart) / 2) : Math.max(sourceAnchor.x, targetAnchor.x) + 100;
    const laneX = laneBase + trackIndex * spacing;
    return `M ${sourceAnchor.x} ${sourceAnchor.y} L ${xStart} ${sourceAnchor.y} L ${laneX} ${sourceAnchor.y} L ${laneX} ${targetAnchor.y} L ${xEnd} ${targetAnchor.y} L ${targetAnchor.x} ${targetAnchor.y}`;
  }

  const {
    sourceLayer,
    targetLayer,
    layerBounds,
    sceneTop
  } = options;

  const sourceLayerBounds = layerBounds.get(sourceLayer);
  const targetLayerBounds = layerBounds.get(targetLayer);
  if (!sourceLayerBounds || !targetLayerBounds) {
    return `M ${sourceAnchor.x} ${sourceAnchor.y} L ${xStart} ${sourceAnchor.y} L ${xStart} ${targetAnchor.y} L ${xEnd} ${targetAnchor.y} L ${targetAnchor.x} ${targetAnchor.y}`;
  }

  if (targetLayer === sourceLayer + 1) {
    const corridorLeft = sourceLayerBounds.right + 18;
    const corridorRight = targetLayerBounds.left - 18;
    const safeLeft = Math.min(corridorLeft, corridorRight);
    const safeRight = Math.max(corridorLeft, corridorRight);
    const center = safeLeft + Math.max(24, (safeRight - safeLeft) / 2);
    const laneX = Math.max(safeLeft + 12, Math.min(safeRight - 12, center + trackIndex * spacing));
    return `M ${sourceAnchor.x} ${sourceAnchor.y} L ${xStart} ${sourceAnchor.y} L ${laneX} ${sourceAnchor.y} L ${laneX} ${targetAnchor.y} L ${xEnd} ${targetAnchor.y} L ${targetAnchor.x} ${targetAnchor.y}`;
  }

  const sourceCorridorX = sourceLayerBounds.right + 34 + trackIndex * 12;
  const targetCorridorX = targetLayerBounds.left - 34 - trackIndex * 12;
  const topLaneY = Math.max(24, sceneTop - 54 - trackIndex * spacing);
  return `M ${sourceAnchor.x} ${sourceAnchor.y} L ${xStart} ${sourceAnchor.y} L ${sourceCorridorX} ${sourceAnchor.y} L ${sourceCorridorX} ${topLaneY} L ${targetCorridorX} ${topLaneY} L ${targetCorridorX} ${targetAnchor.y} L ${xEnd} ${targetAnchor.y} L ${targetAnchor.x} ${targetAnchor.y}`;
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
      item.innerHTML = `<strong>${signal.name}</strong><span>${signal.signal_type} • ${signal.data_type}</span><span>${signal.source.object_id}.${signal.source.port} -> ${signal.targets.length} target(s)</span>`;
      item.onclick = () => {
        selectSignal(signal.id);
        render();
      };
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
  routeSignalsForScene(sceneContext, layers).forEach(({ signal, segments }) => {
    segments.forEach((segmentPath) => {
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
    const renderedRoutePaths = [];
    routeSignalsForScene(metrics.sceneContext, layers, metrics).forEach(({ signal, segments }) => {
      segments.forEach((segmentPath) => {
        renderedRoutePaths.push({ signal, points: segmentPath.points });
      });
    });
    while (wireLayer.firstChild) wireLayer.removeChild(wireLayer.firstChild);
    renderedRoutePaths.forEach(({ signal, points }) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathFromPoints(points));
        path.setAttribute("class", `route-wire${selectedSignal && signal.id === selectedSignal.id ? " is-selected" : ""}`);
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
    identityHead.innerHTML = '<div class="port-inline-title">Signal</div>';
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

