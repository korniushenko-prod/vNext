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
  portEditor: { dir: "", id: "" },
  selection: { kind: "none", objectId: "", dir: "", portId: "", signalId: "" },
  routeConnect: { signalId: "", sourceObjectId: "", sourcePort: "", active: false, mouseX: 0, mouseY: 0 },
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
  state.routeConnect = { signalId: "", sourceObjectId: "", sourcePort: "", active: false, mouseX: 0, mouseY: 0 };
}

function orthogonalPath(x1, y1, x2, y2) {
  if (Math.abs(y2 - y1) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const elbowX = x2 >= x1 ? x1 + Math.max(40, (x2 - x1) / 2) : x1 + 48;
  return `M ${x1} ${y1} L ${elbowX} ${y1} L ${elbowX} ${y2} L ${x2} ${y2}`;
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

function renderSignals() {
  ensureSignalComposer();
  const composer = state.signalComposer;
  const shell = document.createElement("section");
  shell.className = "signal-routing-workspace";

  const left = document.createElement("div");
  left.className = "signal-routing-column";
  const create = panel("Create Route", "Create one named system signal, then bind one producer and one or more consumers.");

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
  create.append(metaLayout);

  const sourceChoices = [{ value: "", label: "Select source object" }, ...objectOptions((obj) => obj.interface.outputs.length > 0 || true)];
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
  create.append(bindingsLayout);

  const sourceValidationPort = composer.sourceMode === "existing"
    ? sourcePorts.find((port) => port.id === composer.sourcePort)
    : null;
  const validationNote = document.createElement("div");
  validationNote.className = "small-note";
  if (sourceValidationPort && sourceValidationPort.data_type !== composer.data_type) {
    validationNote.textContent = `Source output data type is ${sourceValidationPort.data_type}, but route data type is ${composer.data_type}.`;
    validationNote.style.color = "#fca5a5";
  } else {
    validationNote.textContent = "Type and data type should match across the selected producer and all consumers.";
  }
  create.append(validationNote);

  const createButton = document.createElement("button");
  createButton.type = "button";
  createButton.className = "btn primary";
  createButton.textContent = "Create Route";
  createButton.onclick = () => {
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
    touch(`Route created: ${signalName}.`);
    render();
  };
  create.append(createButton);
  left.append(create);

  const right = document.createElement("div");
  right.className = "signal-routing-column";
  const monitor = panel("Signal Monitor", "Select a route to edit it in the inspector.");
  const list = document.createElement("div");
  list.className = "routing-signal-list";
  if (!signals().length) {
    const empty = document.createElement("div");
    empty.className = "subview-empty";
    empty.textContent = "No signals yet.";
    list.append(empty);
  } else {
    signals().forEach((s, index) => {
      const item = document.createElement("div");
      item.className = `routing-derived-link${state.selection.kind === "signal" && state.selection.signalId === s.id ? " is-active" : ""}`;
      item.innerHTML = `<strong>${s.name}</strong><span>${s.signal_type} • ${s.data_type}</span><span>${s.source.object_id}.${s.source.port} -> ${s.targets.length} target(s)</span>`;
      item.onclick = () => {
        selectSignal(s.id);
        render();
      };
      list.append(item);
    });
  }
  monitor.append(list);
  left.append(monitor);

  const map = panel("Routing Map", "Objects, exposed ports, and current bindings for the selected route.");
  const selectedSignal = state.selection.kind === "signal" ? findSignalById(state.selection.signalId) : signals()[state.signalIndex] || signals()[0] || null;
  if (!selectedSignal) {
    const empty = document.createElement("div");
    empty.className = "subview-empty";
    empty.textContent = "Select or create a signal to see its routing map.";
    map.append(empty);
  } else {
    const sourceObject = findObjectById(selectedSignal.source.object_id);
    const sourcePort = sourceObject ? objectPorts(sourceObject.id, "outputs").find((port) => port.name === selectedSignal.source.port) : null;
    const board = document.createElement("div");
    board.className = "routing-board";
    const wireLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    wireLayer.setAttribute("class", "routing-board-wires");

    const dotRefs = { source: null, targets: [] };
    const involvedObjectIds = new Set([selectedSignal.source.object_id, ...(selectedSignal.targets || []).map((target) => target.object_id)]);
    const candidateTargets = objects().filter((obj) => obj.id !== selectedSignal.source.object_id);

    const sourceColumn = document.createElement("div");
    sourceColumn.className = "routing-board-column";
    if (sourceObject) {
      const sourceCard = document.createElement("div");
      sourceCard.className = "routing-node-card routing-node-card-source";
      sourceCard.innerHTML = `<div class="routing-node-title">${sourceObject.name}</div><div class="routing-node-sub">${sourceObject.id}</div>`;
      const portsWrap = document.createElement("div");
      portsWrap.className = "routing-node-ports";
      const inStack = document.createElement("div");
      inStack.className = "routing-port-stack";
      (sourceObject.interface.inputs || []).forEach((port) => {
        const portRow = document.createElement("div");
        portRow.className = "routing-node-port port-in";
        portRow.innerHTML = `<span class="routing-port-dot ${port.signal_type}"></span><span>${port.name}</span>`;
        inStack.append(portRow);
      });
      const outStack = document.createElement("div");
      outStack.className = "routing-port-stack";
        (sourceObject.interface.outputs || []).forEach((port) => {
          const portRow = document.createElement("div");
          portRow.className = `routing-node-port port-out${selectedSignal.source.port === port.name ? " is-active" : ""}`;
          const label = document.createElement("span");
          label.textContent = port.name;
          const dot = document.createElement("span");
          dot.className = `routing-port-dot ${port.signal_type}${selectedSignal.source.port === port.name ? " is-active" : ""}`;
          if (selectedSignal.source.port === port.name) {
            dotRefs.source = dot;
            if (state.routeConnect.active && state.routeConnect.signalId === selectedSignal.id) dot.classList.add("is-connecting");
            dot.onmousedown = (event) => {
              event.preventDefault();
              state.routeConnect = {
                signalId: selectedSignal.id,
                sourceObjectId: sourceObject.id,
                sourcePort: port.name,
                active: true,
                mouseX: event.clientX,
                mouseY: event.clientY
              };
              render();
            };
          }
        portRow.append(label, dot);
        outStack.append(portRow);
      });
      portsWrap.append(inStack, outStack);
      sourceCard.append(portsWrap);
      sourceColumn.append(sourceCard);
    }

    const centerColumn = document.createElement("div");
    centerColumn.className = "routing-board-center";
    const signalCard = document.createElement("div");
    signalCard.className = "routing-signal-card";
    signalCard.innerHTML = `
      <div class="routing-signal-badge">Signal</div>
      <div class="routing-signal-meta">${selectedSignal.signal_type} • ${selectedSignal.data_type}</div>
      <div class="routing-signal-desc">${selectedSignal.targets.length} target(s)</div>
    `;
    centerColumn.append(signalCard);

    const targetsColumn = document.createElement("div");
    targetsColumn.className = "routing-board-column";
    if (!candidateTargets.length) {
      const empty = document.createElement("div");
      empty.className = "subview-empty";
      empty.textContent = "No target objects yet.";
      targetsColumn.append(empty);
    } else {
      candidateTargets.forEach((obj) => {
        const targetCard = document.createElement("div");
        targetCard.className = `routing-node-card${involvedObjectIds.has(obj.id) ? " is-involved" : ""}`;
        targetCard.innerHTML = `<div class="routing-node-title">${obj.name}</div><div class="routing-node-sub">${obj.id}</div>`;
        const portsWrap = document.createElement("div");
        portsWrap.className = "routing-node-ports";
        const inStack = document.createElement("div");
        inStack.className = "routing-port-stack";
        (obj.interface.inputs || []).forEach((port) => {
          const isBound = (selectedSignal.targets || []).some((target) => target.object_id === obj.id && target.port === port.name);
          const isCompatible = state.routeConnect.active && state.routeConnect.signalId === selectedSignal.id && canBindSignalToPort(selectedSignal, port);
          const portRow = document.createElement("div");
          portRow.className = `routing-node-port port-in${isBound ? " is-active" : ""}${isCompatible ? " is-compatible" : ""}`;
          const dot = document.createElement("span");
          dot.className = `routing-port-dot ${port.signal_type}${isBound ? " is-active" : ""}${isCompatible ? " is-compatible" : ""}`;
          if (isBound) dotRefs.targets.push({ objectId: obj.id, portName: port.name, dot });
          if (isCompatible) {
            dot.onmouseup = (event) => {
              event.preventDefault();
              if (ensureSignalTarget(selectedSignal, obj.id, port.name)) touch(`Bound ${selectedSignal.name} to ${obj.name}.${port.name}.`);
              clearRouteConnect();
              render();
            };
          }
          const label = document.createElement("span");
          label.textContent = port.name;
          portRow.append(dot, label);
          inStack.append(portRow);
        });

        const outStack = document.createElement("div");
        outStack.className = "routing-port-stack";
        (obj.interface.outputs || []).forEach((port) => {
          const portRow = document.createElement("div");
          portRow.className = "routing-node-port port-out";
          portRow.innerHTML = `<span>${port.name}</span><span class="routing-port-dot ${port.signal_type}"></span>`;
          outStack.append(portRow);
        });

        portsWrap.append(inStack, outStack);
        targetCard.append(portsWrap);
        targetsColumn.append(targetCard);
      });
    }

    board.append(wireLayer, sourceColumn, centerColumn, targetsColumn);
    map.append(board);

    requestAnimationFrame(() => {
      if (!board.isConnected) return;
      const boardRect = board.getBoundingClientRect();
      while (wireLayer.firstChild) wireLayer.removeChild(wireLayer.firstChild);
      if (!dotRefs.source) return;
      const sourceRect = dotRefs.source.getBoundingClientRect();
      const x1 = sourceRect.left - boardRect.left + sourceRect.width / 2;
      const y1 = sourceRect.top - boardRect.top + sourceRect.height / 2;
      dotRefs.targets.forEach((targetRef) => {
        const targetRect = targetRef.dot.getBoundingClientRect();
        const x2 = targetRect.left - boardRect.left + targetRect.width / 2;
        const y2 = targetRect.top - boardRect.top + targetRect.height / 2;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", orthogonalPath(x1, y1, x2, y2));
        path.setAttribute("class", "route-wire");
        path.style.pointerEvents = "stroke";
        path.onclick = () => {
          selectSignal(selectedSignal.id);
          setMessage(`Selected route ${selectedSignal.name}.`, "is-ok");
          render();
        };
        wireLayer.append(path);
      });

      routePreviewUpdater = null;
      if (state.routeConnect.active && state.routeConnect.signalId === selectedSignal.id) {
        const preview = document.createElementNS("http://www.w3.org/2000/svg", "path");
        preview.setAttribute("class", "route-wire route-wire-preview");
        wireLayer.append(preview);
        routePreviewUpdater = () => {
          if (!board.isConnected || !state.routeConnect.active || state.routeConnect.signalId !== selectedSignal.id) return;
          const px = state.routeConnect.mouseX - boardRect.left;
          const py = state.routeConnect.mouseY - boardRect.top;
          preview.setAttribute("d", orthogonalPath(x1, y1, px, py));
        };
        routePreviewUpdater();
      }
    });
  }
  right.append(map);

  shell.append(left, right);
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
  refs.inspectorContext.innerHTML = "";
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
  if (!state.routeConnect.active) return;
  state.routeConnect.mouseX = event.clientX;
  state.routeConnect.mouseY = event.clientY;
  if (routePreviewUpdater) routePreviewUpdater();
});

document.addEventListener("mouseup", () => {
  if (!state.routeConnect.active) return;
  clearRouteConnect();
  render();
});

loadRecovery();
render();
setMessage("Recovery build loaded.");
