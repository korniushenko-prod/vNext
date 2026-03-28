const STORAGE_KEY = "universal_plc.project_draft.v1";

const DEFAULT_PROJECT = {
  schema_version: "1.0",
  project: {
    meta: {
      id: "demo_boiler",
      name: "Demo Boiler",
      description: "Reference validation package for universal_plc",
      author: "OpenAI",
      created_at: "2026-03-24T00:00:00Z",
      updated_at: "2026-03-24T00:00:00Z",
      tags: ["boiler", "reference", "demo"]
    },
    settings: {
      tick_ms: 100,
      timezone: "UTC",
      default_view: "boiler_overview",
      autosave: true,
      simulation_enabled: true,
      debug_enabled: true
    },
    hardware: {
      modules: [
        {
          id: "cpu_1",
          type: "ESP32_CPU",
          name: "CPU Module",
          channels: []
        }
      ]
    },
    system: {
      id: "boiler_system",
      name: "Demo Boiler System",
      objects: [
        {
          id: "burner_start_permit",
          type: "PermissiveGroup",
          category: "group",
          name: "Burner Start Permissive",
          template_id: "permissive_group_v1",
          interface: { inputs: [], outputs: [] },
          config: {
            controller_type: "PermissiveGroup",
            version: "1.0",
            parameters: { logic_type: "all_true", n_required: 0, custom_expr: "" },
            behavior: {
              fail_on_bad_quality: true,
              empty_group_result: false,
              short_circuit_eval: true
            },
            ui: {
              show_member_states: true,
              show_false_only: true,
              compact_style: "list"
            },
            debug: {
              trace_member_changes: true,
              trace_result_changes: true,
              keep_history: 100
            }
          },
          internal_model: { model_type: "flow", flow: {}, state_machine: null },
          bindings: [],
          runtime_defaults: {},
          tags: ["native", "reference"]
        }
      ],
      signals: [],
      signal_groups: [],
      alarms: [],
      alarm_matrix: [],
      links: []
    },
    runtime_defaults: { signals: {}, objects: {} },
    views: [
      {
        id: "boiler_overview",
        type: "system_view",
        name: "Boiler Overview",
        scope: "system",
        layout: {},
        filters: { show_link_types: ["trip", "permissive", "status"] }
      }
    ]
  }
};

const TABS = [
  { id: "project", title: "Project", note: "Project identity and global settings." },
  { id: "system", title: "System", note: "Objects, signals, links and alarms." },
  { id: "hardware", title: "Hardware", note: "Hardware modules and channels." },
  { id: "views", title: "Views", note: "View definitions and layout metadata." }
];

const PROJECT_FIELDS = {
  meta: [
    { label: "Schema Version", path: "schema_version", type: "text" },
    { label: "Project ID", path: "project.meta.id", type: "text" },
    { label: "Project Name", path: "project.meta.name", type: "text" },
    { label: "Author", path: "project.meta.author", type: "text" },
    { label: "Created At", path: "project.meta.created_at", type: "text" },
    { label: "Updated At", path: "project.meta.updated_at", type: "text" },
    { label: "Description", path: "project.meta.description", type: "textarea", full: true },
    { label: "Tags", path: "project.meta.tags", type: "tags", full: true, hint: "Comma separated tags." }
  ],
  settings: [
    { label: "Tick (ms)", path: "project.settings.tick_ms", type: "number", min: 10, step: 10 },
    { label: "Timezone", path: "project.settings.timezone", type: "text" },
    { label: "Default View", path: "project.settings.default_view", type: "text" },
    { label: "Autosave", path: "project.settings.autosave", type: "checkbox" },
    { label: "Simulation Enabled", path: "project.settings.simulation_enabled", type: "checkbox" },
    { label: "Debug Enabled", path: "project.settings.debug_enabled", type: "checkbox" }
  ]
};

const REGISTRIES = {
  objects: {
    title: "Objects",
    path: "project.system.objects",
    createItem: () => ({
      id: "",
      type: "PermissiveGroup",
      category: "group",
      name: "New Object",
      template_id: "",
      interface: { inputs: [], outputs: [] },
      config: {},
      internal_model: { model_type: "flow", flow: {}, state_machine: null },
      bindings: [],
      runtime_defaults: {},
      tags: []
    }),
    titleForItem: (item) => item.name || item.id || "Unnamed object",
    metaForItem: (item) => [item.type, item.category, item.id].filter(Boolean).join(" · "),
    fields: [
      { label: "Object ID", path: "id", type: "text" },
      { label: "Name", path: "name", type: "text" },
      { label: "Type", path: "type", type: "text" },
      { label: "Category", path: "category", type: "text" },
      { label: "Template ID", path: "template_id", type: "text" },
      { label: "Tags", path: "tags", type: "tags", full: true, hint: "Comma separated object tags." },
      { label: "Interface Inputs", path: "interface.inputs", type: "json", full: true },
      { label: "Interface Outputs", path: "interface.outputs", type: "json", full: true },
      { label: "Config", path: "config", type: "json", full: true },
      { label: "Internal Model", path: "internal_model", type: "json", full: true },
      { label: "Bindings", path: "bindings", type: "json", full: true },
      { label: "Runtime Defaults", path: "runtime_defaults", type: "json", full: true }
    ]
  },
  signals: {
    title: "Signals",
    path: "project.system.signals",
    createItem: () => ({
      id: "",
      name: "New Signal",
      kind: "derived",
      signal_type: "status",
      data_type: "bool",
      source: { object_id: "", port: "" },
      metadata: { unit: "", description: "" }
    }),
    titleForItem: (item) => item.name || item.id || "Unnamed signal",
    metaForItem: (item) => [item.signal_type, item.data_type, item.id].filter(Boolean).join(" · "),
    fields: [
      { label: "Signal ID", path: "id", type: "text" },
      { label: "Name", path: "name", type: "text" },
      { label: "Kind", path: "kind", type: "text" },
      { label: "Signal Type", path: "signal_type", type: "text" },
      { label: "Data Type", path: "data_type", type: "text" },
      { label: "Source Object ID", path: "source.object_id", type: "text" },
      { label: "Source Port", path: "source.port", type: "text" },
      { label: "Unit", path: "metadata.unit", type: "text" },
      { label: "Description", path: "metadata.description", type: "textarea", full: true }
    ]
  },
  links: {
    title: "Links",
    path: "project.system.links",
    createItem: () => ({
      id: "",
      source: { object_id: "", port: "" },
      target: { object_id: "", port: "" },
      kind: "status",
      semantic: "",
      transform: null,
      visibility_level: "system"
    }),
    titleForItem: (item) => item.id || "Unnamed link",
    metaForItem: (item) => [item.kind, item.semantic, item.visibility_level].filter(Boolean).join(" · "),
    fields: [
      { label: "Link ID", path: "id", type: "text" },
      { label: "Source Object ID", path: "source.object_id", type: "text" },
      { label: "Source Port", path: "source.port", type: "text" },
      { label: "Target Object ID", path: "target.object_id", type: "text" },
      { label: "Target Port", path: "target.port", type: "text" },
      { label: "Kind", path: "kind", type: "text" },
      { label: "Semantic", path: "semantic", type: "text" },
      { label: "Visibility Level", path: "visibility_level", type: "text" },
      { label: "Transform", path: "transform", type: "json", full: true }
    ]
  },
  alarms: {
    title: "Alarms",
    path: "project.system.alarms",
    createItem: () => ({
      id: "",
      name: "New Alarm",
      severity: "alarm",
      latched: true,
      reset_policy: "manual_reset",
      condition_signal: "",
      message: "",
      actions: []
    }),
    titleForItem: (item) => item.name || item.id || "Unnamed alarm",
    metaForItem: (item) => [item.severity, item.condition_signal].filter(Boolean).join(" · "),
    fields: [
      { label: "Alarm ID", path: "id", type: "text" },
      { label: "Name", path: "name", type: "text" },
      { label: "Severity", path: "severity", type: "text" },
      { label: "Reset Policy", path: "reset_policy", type: "text" },
      { label: "Condition Signal", path: "condition_signal", type: "text" },
      { label: "Latched", path: "latched", type: "checkbox" },
      { label: "Message", path: "message", type: "textarea", full: true },
      { label: "Actions", path: "actions", type: "json", full: true }
    ]
  },
  modules: {
    title: "Modules",
    path: "project.hardware.modules",
    createItem: () => ({ id: "", type: "DI_Module", name: "New Module", channels: [] }),
    titleForItem: (item) => item.name || item.id || "Unnamed module",
    metaForItem: (item) => [item.type, item.id].filter(Boolean).join(" · "),
    fields: [
      { label: "Module ID", path: "id", type: "text" },
      { label: "Type", path: "type", type: "text" },
      { label: "Name", path: "name", type: "text" },
      { label: "Channels", path: "channels", type: "json", full: true }
    ]
  },
  views: {
    title: "Views",
    path: "project.views",
    createItem: () => ({ id: "", type: "system_view", name: "New View", scope: "system", layout: {}, filters: {} }),
    titleForItem: (item) => item.name || item.id || "Unnamed view",
    metaForItem: (item) => [item.type, item.scope, item.id].filter(Boolean).join(" · "),
    fields: [
      { label: "View ID", path: "id", type: "text" },
      { label: "Type", path: "type", type: "text" },
      { label: "Name", path: "name", type: "text" },
      { label: "Scope", path: "scope", type: "text" },
      { label: "Layout", path: "layout", type: "json", full: true },
      { label: "Filters", path: "filters", type: "json", full: true }
    ]
  }
};

const nav = document.querySelector("#section-nav");
const tabBar = document.querySelector("#tab-bar");
const workspaceMain = document.querySelector("#workspace-main");
const projectTree = document.querySelector("#project-tree");
const breadcrumbs = document.querySelector("#breadcrumbs");
const messageBox = document.querySelector("#message-box");
const jsonPreview = document.querySelector("#json-preview");
const inspectorTitle = document.querySelector("#inspector-title");
const inspectorContext = document.querySelector("#inspector-context");
const inspectorSelection = document.querySelector("#inspector-selection");
const inspectorNotes = document.querySelector("#inspector-notes");
const saveLocalButton = document.querySelector("#save-local");
const resetDefaultButton = document.querySelector("#reset-default");
const exportButton = document.querySelector("#export-json");
const importButton = document.querySelector("#import-json");
const importFile = document.querySelector("#import-file");
const chipProject = document.querySelector("#chip-project");
const chipObjects = document.querySelector("#chip-objects");
const chipSignals = document.querySelector("#chip-signals");
const chipLinks = document.querySelector("#chip-links");
const chipAlarms = document.querySelector("#chip-alarms");

let projectModel = deepClone(DEFAULT_PROJECT);
let activeTab = "project";
const selection = { objects: 0, signals: -1, links: -1, alarms: -1, modules: 0, views: 0 };

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setMessage(text, tone = "") {
  messageBox.textContent = text;
  messageBox.classList.remove("is-ok", "is-error");
  if (tone) {
    messageBox.classList.add(tone);
  }
}

function getByPath(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function setByPath(object, path, value) {
  const parts = path.split(".");
  let current = object;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }
  current[parts[parts.length - 1]] = value;
}

function normalizeProjectModel(model) {
  const project = model.project ?? (model.project = {});
  project.meta ??= {};
  project.settings ??= {};
  project.hardware ??= {};
  project.system ??= {};
  project.runtime_defaults ??= {};
  project.views ??= [];
  project.meta.tags ??= [];
  project.hardware.modules ??= [];
  project.system.objects ??= [];
  project.system.signals ??= [];
  project.system.signal_groups ??= [];
  project.system.alarms ??= [];
  project.system.alarm_matrix ??= [];
  project.system.links ??= [];
}

function getRegistryItems(registryId) {
  const items = getByPath(projectModel, REGISTRIES[registryId].path);
  return Array.isArray(items) ? items : [];
}

function clampSelection(registryId) {
  const items = getRegistryItems(registryId);
  if (items.length === 0) {
    selection[registryId] = -1;
  } else if (selection[registryId] == null || selection[registryId] < 0) {
    selection[registryId] = 0;
  } else if (selection[registryId] >= items.length) {
    selection[registryId] = items.length - 1;
  }
}

function refreshPreview() {
  jsonPreview.value = JSON.stringify(projectModel, null, 2);
}

function touchUpdatedAt() {
  setByPath(projectModel, "project.meta.updated_at", new Date().toISOString());
}

function saveDraft() {
  touchUpdatedAt();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projectModel));
  refreshPreview();
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    projectModel = deepClone(DEFAULT_PROJECT);
  } else {
    try {
      projectModel = JSON.parse(raw);
    } catch (error) {
      projectModel = deepClone(DEFAULT_PROJECT);
    }
  }
  normalizeProjectModel(projectModel);
}

function exportJson() {
  touchUpdatedAt();
  const blob = new Blob([JSON.stringify(projectModel, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const projectId = getByPath(projectModel, "project.meta.id") || "universal_plc_project";
  link.href = url;
  link.download = `${projectId}.json`;
  link.click();
  URL.revokeObjectURL(url);
  refreshPreview();
}

async function importJson(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  normalizeProjectModel(parsed);
  projectModel = parsed;
  Object.keys(selection).forEach((registryId) => clampSelection(registryId));
  renderApp();
  saveDraft();
}

function commaListToArray(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function valueForField(target, field) {
  const value = getByPath(target, field.path);
  if (field.type === "json") {
    return JSON.stringify(value === undefined ? {} : value, null, 2);
  }
  if (field.type === "tags") {
    return Array.isArray(value) ? value.join(", ") : "";
  }
  return value ?? "";
}

function updateFieldValue(target, field, element) {
  if (field.type === "checkbox") {
    setByPath(target, field.path, element.checked);
  } else if (field.type === "number") {
    setByPath(target, field.path, Number(element.value));
  } else if (field.type === "tags") {
    setByPath(target, field.path, commaListToArray(element.value));
  } else if (field.type === "json") {
    setByPath(target, field.path, JSON.parse(element.value));
  } else {
    setByPath(target, field.path, element.value);
  }
}

function createPanel(title, description) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const header = document.createElement("div");
  header.className = "panel-header-block";
  const titleBlock = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = title;
  const text = document.createElement("div");
  text.className = "registry-summary";
  text.textContent = description;
  titleBlock.append(heading, text);
  header.append(titleBlock);
  panel.append(header);
  return panel;
}

function createKvRow(key, value) {
  const row = document.createElement("div");
  row.className = "kv";
  row.innerHTML = `<span class="kv-key">${key}</span><span class="kv-value">${value}</span>`;
  return row;
}

function renderKvList(container, entries) {
  container.innerHTML = "";
  entries.forEach(([key, value]) => container.append(createKvRow(key, value)));
}

function singularLabel(title) {
  return title.endsWith("s") ? title.slice(0, -1) : title;
}

function getSelectedRegistryInfo() {
  if (activeTab === "system") {
    for (const registryId of ["objects", "signals", "links", "alarms"]) {
      const items = getRegistryItems(registryId);
      const index = selection[registryId];
      if (index >= 0 && items[index]) {
        return { registryId, item: items[index], title: REGISTRIES[registryId].title };
      }
    }
  }
  if (activeTab === "hardware") {
    const items = getRegistryItems("modules");
    const index = selection.modules;
    if (index >= 0 && items[index]) return { registryId: "modules", item: items[index], title: "Modules" };
  }
  if (activeTab === "views") {
    const items = getRegistryItems("views");
    const index = selection.views;
    if (index >= 0 && items[index]) return { registryId: "views", item: items[index], title: "Views" };
  }
  return null;
}

function renderBreadcrumbs() {
  const projectId = getByPath(projectModel, "project.meta.id") || "project";
  const tabTitle = TABS.find((tab) => tab.id === activeTab)?.title || "Workspace";
  const selected = getSelectedRegistryInfo();
  breadcrumbs.textContent = selected
    ? `Project / ${projectId} / ${tabTitle} / ${selected.title} / ${selected.item.id || selected.item.name || "selected"}`
    : `Project / ${projectId} / ${tabTitle}`;
}

function renderSidebarNav() {
  nav.innerHTML = "";
  TABS.forEach((tab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mode-item${activeTab === tab.id ? " is-active" : ""}`;
    button.innerHTML =
      `<div class="icon view">${tab.title.slice(0, 2).toUpperCase()}</div>` +
      `<div><div class="item-title">${tab.title}</div><div class="item-sub">${tab.note}</div></div>`;
    button.addEventListener("click", () => {
      activeTab = tab.id;
      renderApp();
    });
    nav.append(button);
  });
}

function renderTabBar() {
  tabBar.innerHTML = "";
  TABS.forEach((tab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab-button${activeTab === tab.id ? " is-active" : ""}`;
    button.textContent = tab.title;
    button.addEventListener("click", () => {
      activeTab = tab.id;
      renderApp();
    });
    tabBar.append(button);
  });
}

function renderProjectTree() {
  projectTree.innerHTML = "";
  const entries = [
    { label: `Project / ${getByPath(projectModel, "project.meta.name") || "Unnamed"}`, active: activeTab === "project" },
    { label: `System / Objects (${getRegistryItems("objects").length})`, active: activeTab === "system" },
    { label: `System / Signals (${getRegistryItems("signals").length})`, active: activeTab === "system" },
    { label: `System / Links (${getRegistryItems("links").length})`, active: activeTab === "system" },
    { label: `System / Alarms (${getRegistryItems("alarms").length})`, active: activeTab === "system" },
    { label: `Hardware / Modules (${getRegistryItems("modules").length})`, active: activeTab === "hardware" },
    { label: `Views / Registry (${getRegistryItems("views").length})`, active: activeTab === "views" }
  ];
  entries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = `tree-item${entry.active ? " is-active" : ""}`;
    item.textContent = entry.label;
    projectTree.append(item);
  });
}

function renderStatusChips() {
  chipProject.textContent = `Project ${getByPath(projectModel, "project.meta.id") || "unset"}`;
  chipObjects.textContent = `Objects ${getRegistryItems("objects").length}`;
  chipSignals.textContent = `Signals ${getRegistryItems("signals").length}`;
  chipLinks.textContent = `Links ${getRegistryItems("links").length}`;
  chipAlarms.textContent = `Alarms ${getRegistryItems("alarms").length}`;
}

function renderInspector() {
  const selected = getSelectedRegistryInfo();
  const tabTitle = TABS.find((tab) => tab.id === activeTab)?.title || "Workspace";
  inspectorTitle.value = selected
    ? `${selected.title}: ${selected.item.name || selected.item.id || "selected"}`
    : `${tabTitle} workspace`;

  renderKvList(inspectorContext, [
    ["Tab", tabTitle],
    ["Project", getByPath(projectModel, "project.meta.id") || "unset"],
    ["System", getByPath(projectModel, "project.system.id") || "unset"],
    ["Views", String(getRegistryItems("views").length)]
  ]);

  if (!selected) {
    renderKvList(inspectorSelection, [
      ["Selection", "None"],
      ["Mode", "UI-first editing"],
      ["JSON", "Live mirror enabled"]
    ]);
    inspectorNotes.textContent =
      "Use the workspace tabs and registry editors to shape the platform model. Raw JSON stays visible, but it is not the primary authoring flow.";
    return;
  }

  const selectionEntries = Object.entries(selected.item)
    .slice(0, 6)
    .map(([key, value]) => [key, typeof value === "object" ? "[object]" : String(value)]);
  renderKvList(inspectorSelection, selectionEntries);
  inspectorNotes.textContent =
    `Editing ${singularLabel(selected.title)} in the ${tabTitle} workspace. Keep boiler-specific details out of the core shell unless they belong to a package or project reference.`;
}

function createFieldElement(target, field, rerenderOnChange = false) {
  const wrap = document.createElement("div");
  wrap.className = `field${field.full ? " full" : ""}`;

  if (field.type !== "checkbox") {
    const label = document.createElement("label");
    label.textContent = field.label;
    wrap.append(label);
  }

  let input;
  if (field.type === "textarea" || field.type === "json") {
    input = document.createElement("textarea");
    if (field.type === "json") {
      input.classList.add("json-field");
    }
  } else if (field.type === "checkbox") {
    const checkboxWrap = document.createElement("label");
    checkboxWrap.className = "checkbox-field";
    input = document.createElement("input");
    input.type = "checkbox";
    const text = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = field.label;
    text.append(title);
    if (field.hint) {
      const hint = document.createElement("div");
      hint.className = "field-hint";
      hint.textContent = field.hint;
      text.append(hint);
    }
    checkboxWrap.append(input, text);
    wrap.append(checkboxWrap);
  } else {
    input = document.createElement("input");
    input.type = field.type;
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;
    if (field.step !== undefined) input.step = field.step;
  }

  if (field.type !== "checkbox") {
    input.value = valueForField(target, field);
    wrap.append(input);
  } else {
    input.checked = Boolean(getByPath(target, field.path));
  }

  const commit = (shouldRerender) => {
    try {
      updateFieldValue(target, field, input);
      refreshPreview();
      renderInspector();
      renderProjectTree();
      renderStatusChips();
      renderBreadcrumbs();
      setMessage("Draft updated locally.", "is-ok");
      if (shouldRerender) {
        renderApp();
      }
    } catch (error) {
      setMessage(`Invalid value for "${field.label}".`, "is-error");
    }
  };

  if (field.type === "json") {
    input.addEventListener("change", () => commit(rerenderOnChange));
  } else if (field.type === "checkbox") {
    input.addEventListener("change", () => commit(rerenderOnChange));
  } else {
    input.addEventListener("input", () => commit(false));
    input.addEventListener("change", () => commit(rerenderOnChange));
  }

  if (field.hint && field.type !== "checkbox") {
    const hint = document.createElement("div");
    hint.className = "field-hint";
    hint.textContent = field.hint;
    wrap.append(hint);
  }

  return wrap;
}

function renderProjectTab() {
  const summary = createPanel(
    "Project Workspace",
    "Use this area for stable project identity and global settings. These fields should remain reusable across all domain packages."
  );
  const summaryGrid = document.createElement("div");
  summaryGrid.className = "workspace-summary-grid";
  [
    ["Project ID", getByPath(projectModel, "project.meta.id") || "unset"],
    ["Project Name", getByPath(projectModel, "project.meta.name") || "unset"],
    ["Timezone", getByPath(projectModel, "project.settings.timezone") || "unset"],
    ["Default View", getByPath(projectModel, "project.settings.default_view") || "unset"]
  ].forEach(([title, value]) => {
    const card = document.createElement("div");
    card.className = "workspace-card";
    card.innerHTML = `<h4>${title}</h4><div class="registry-summary">${value}</div>`;
    summaryGrid.append(card);
  });
  summary.append(summaryGrid);

  const metaPanel = createPanel("Project Meta", "Identity, authorship and portability metadata.");
  const metaGrid = document.createElement("div");
  metaGrid.className = "field-grid";
  PROJECT_FIELDS.meta.forEach((field) => metaGrid.append(createFieldElement(projectModel, field)));
  metaPanel.append(metaGrid);

  const settingsPanel = createPanel("Project Settings", "Global project behavior and editor/runtime defaults.");
  const settingsGrid = document.createElement("div");
  settingsGrid.className = "field-grid";
  PROJECT_FIELDS.settings.forEach((field) => settingsGrid.append(createFieldElement(projectModel, field)));
  settingsPanel.append(settingsGrid);

  workspaceMain.append(summary, metaPanel, settingsPanel);
}

function generateUniqueId(registryId, prefix) {
  const items = getRegistryItems(registryId);
  let index = items.length + 1;
  while (items.some((item) => item.id === `${prefix}_${index}`)) {
    index += 1;
  }
  return `${prefix}_${index}`;
}

function createRegistryItem(registryId) {
  const item = REGISTRIES[registryId].createItem();
  if (!item.id) {
    item.id = generateUniqueId(registryId, singularLabel(registryId).toLowerCase() || "item");
  }
  if (!item.name && registryId !== "links") {
    item.name = item.id;
  }
  return item;
}

function renderRegistryEditor(registryId, description) {
  clampSelection(registryId);
  const config = REGISTRIES[registryId];
  const items = getRegistryItems(registryId);
  const selectedIndex = selection[registryId];
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null;

  const panel = createPanel(config.title, description);
  const grid = document.createElement("div");
  grid.className = "registry-grid";

  const list = document.createElement("div");
  list.className = "registry-list";
  const listHeader = document.createElement("div");
  listHeader.className = "registry-header";
  const titleWrap = document.createElement("div");
  titleWrap.innerHTML = `<h4>${config.title} Registry</h4><div class="registry-summary">${items.length} item(s)</div>`;
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "btn";
  addButton.textContent = `Add ${singularLabel(config.title)}`;
  addButton.addEventListener("click", () => {
    items.push(createRegistryItem(registryId));
    selection[registryId] = items.length - 1;
    renderApp();
    setMessage(`${singularLabel(config.title)} added.`, "is-ok");
  });
  listHeader.append(titleWrap, addButton);
  list.append(listHeader);

  const itemList = document.createElement("div");
  itemList.className = "registry-items";
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "registry-empty";
    empty.textContent = "No items yet. Use the add button to start shaping this registry.";
    itemList.append(empty);
  } else {
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `registry-item${index === selectedIndex ? " is-active" : ""}`;
      button.innerHTML =
        `<div class="registry-item-title">${config.titleForItem(item)}</div>` +
        `<div class="registry-item-meta">${config.metaForItem(item) || "No metadata yet"}</div>`;
      button.addEventListener("click", () => {
        selection[registryId] = index;
        renderApp();
      });
      itemList.append(button);
    });
  }
  list.append(itemList);

  const detail = document.createElement("div");
  detail.className = "registry-detail";
  if (!selectedItem) {
    detail.innerHTML = `<h4>No ${config.title.toLowerCase()} selected</h4><div class="registry-summary">Select an item or create a new one to edit its details.</div>`;
  } else {
    const detailHeader = document.createElement("div");
    detailHeader.className = "registry-header";
    const detailTitle = document.createElement("div");
    detailTitle.innerHTML =
      `<h4>${config.titleForItem(selectedItem)}</h4>` +
      `<div class="registry-summary">${config.metaForItem(selectedItem) || "Detail editor"}</div>`;
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      items.splice(selectedIndex, 1);
      clampSelection(registryId);
      renderApp();
      setMessage(`${singularLabel(config.title)} deleted.`, "is-ok");
    });
    detailHeader.append(detailTitle, deleteButton);
    detail.append(detailHeader);
    const fields = document.createElement("div");
    fields.className = "field-grid";
    config.fields.forEach((field) => fields.append(createFieldElement(selectedItem, field, true)));
    detail.append(fields);
  }

  grid.append(list, detail);
  panel.append(grid);
  workspaceMain.append(panel);
}

function renderSystemTab() {
  const summary = createPanel(
    "System Workspace",
    "Model system behavior through first-class registries. Objects, signals, links and alarms should be editable as real platform entities."
  );
  const cards = document.createElement("div");
  cards.className = "workspace-summary-grid";
  [
    ["Objects", getRegistryItems("objects").length],
    ["Signals", getRegistryItems("signals").length],
    ["Links", getRegistryItems("links").length],
    ["Alarms", getRegistryItems("alarms").length]
  ].forEach(([title, value]) => {
    const card = document.createElement("div");
    card.className = "workspace-card";
    card.innerHTML = `<h4>${title}</h4><div class="registry-summary">${value} item(s)</div>`;
    cards.append(card);
  });
  summary.append(cards);

  const systemMeta = createPanel(
    "System Identity",
    "The system container itself should be visible and editable without dropping to raw JSON."
  );
  const metaGrid = document.createElement("div");
  metaGrid.className = "field-grid";
  [
    { label: "System ID", path: "project.system.id", type: "text" },
    { label: "System Name", path: "project.system.name", type: "text" }
  ].forEach((field) => metaGrid.append(createFieldElement(projectModel, field)));
  systemMeta.append(metaGrid);

  workspaceMain.append(summary, systemMeta);
  renderRegistryEditor("objects", "Controllers, groups and package-level objects live here.");
  renderRegistryEditor("signals", "Global signal registry across the project.");
  renderRegistryEditor("links", "Typed connections between object ports.");
  renderRegistryEditor("alarms", "Alarm objects and their impacts should stay visible at the system layer.");
}

function renderHardwareTab() {
  const summary = createPanel(
    "Hardware Workspace",
    "Keep hardware explicit as data. The compiler and runtime should consume this registry instead of hiding assumptions in firmware."
  );
  const cards = document.createElement("div");
  cards.className = "workspace-summary-grid";
  const card = document.createElement("div");
  card.className = "workspace-card";
  card.innerHTML = `<h4>Modules</h4><div class="registry-summary">${getRegistryItems("modules").length} module(s)</div>`;
  cards.append(card);
  summary.append(cards);

  workspaceMain.append(summary);
  renderRegistryEditor("modules", "Modules and channels for the installation hardware registry.");
}

function renderViewsTab() {
  const summary = createPanel(
    "Views Workspace",
    "Views belong to the project schema. Define them in data now so future runtime and editor surfaces remain aligned."
  );
  const cards = document.createElement("div");
  cards.className = "workspace-summary-grid";
  const card = document.createElement("div");
  card.className = "workspace-card";
  card.innerHTML = `<h4>Views</h4><div class="registry-summary">${getRegistryItems("views").length} view(s)</div>`;
  cards.append(card);
  summary.append(cards);

  workspaceMain.append(summary);
  renderRegistryEditor("views", "System, object, state and flow views for the project.");
}

function renderWorkspace() {
  workspaceMain.innerHTML = "";
  if (activeTab === "project") {
    renderProjectTab();
  } else if (activeTab === "system") {
    renderSystemTab();
  } else if (activeTab === "hardware") {
    renderHardwareTab();
  } else {
    renderViewsTab();
  }
}

function renderApp() {
  normalizeProjectModel(projectModel);
  Object.keys(selection).forEach((registryId) => clampSelection(registryId));
  renderSidebarNav();
  renderTabBar();
  renderProjectTree();
  renderStatusChips();
  renderWorkspace();
  refreshPreview();
  renderInspector();
  renderBreadcrumbs();
}

saveLocalButton.addEventListener("click", () => {
  saveDraft();
  renderInspector();
  renderProjectTree();
  renderBreadcrumbs();
  setMessage("Draft saved to local storage.", "is-ok");
});

resetDefaultButton.addEventListener("click", () => {
  projectModel = deepClone(DEFAULT_PROJECT);
  normalizeProjectModel(projectModel);
  Object.keys(selection).forEach((registryId) => clampSelection(registryId));
  renderApp();
  saveDraft();
  setMessage("Draft reset to reference project.", "is-ok");
});

exportButton.addEventListener("click", () => {
  exportJson();
  renderInspector();
  renderProjectTree();
  renderBreadcrumbs();
  setMessage("JSON exported.", "is-ok");
});

importButton.addEventListener("click", () => {
  importFile.click();
});

importFile.addEventListener("change", async () => {
  const [file] = importFile.files;
  if (!file) {
    return;
  }
  try {
    await importJson(file);
    setMessage("JSON imported into local draft.", "is-ok");
  } catch (error) {
    setMessage("Import failed: invalid JSON file.", "is-error");
  } finally {
    importFile.value = "";
  }
});

function bootstrap() {
  loadDraft();
  renderApp();
  setMessage("Dark workspace ready. Shape the model through UI-first flows.", "is-ok");
}

bootstrap();
