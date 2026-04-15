// Block-specific UI logic

const BLOCK_TYPE_LABELS = {
  timer: { ru: "Таймер", en: "Timer" },
  button: { ru: "Кнопка / события", en: "Button / events" },
  latch: { ru: "Latch / память", en: "Latch / memory" },
  selector: { ru: "Selector / выбор", en: "Selector / selection" },
  comparator: { ru: "Comparator / порог", en: "Comparator / threshold" },
  scale_map: { ru: "Scale / map", en: "Scale / map" },
  logic_gate: { ru: "Logic gate", en: "Logic gate" },
  edge_detect: { ru: "Edge / one-shot", en: "Edge / one-shot" },
  hysteresis: { ru: "Hysteresis / deadband", en: "Hysteresis / deadband" },
  counter: { ru: "Counter / счетчик", en: "Counter" },
  interlock: { ru: "Interlock / permissive", en: "Interlock / permissive" },
  mode_authority: { ru: "Mode / authority", en: "Mode / authority" },
  freshness: { ru: "Freshness / heartbeat", en: "Freshness / heartbeat" },
  signal_extractor: { ru: "Signal extractor / извлечение", en: "Signal extractor" },
  totalizer: { ru: "Totalizer", en: "Totalizer" },
  rate_estimator: { ru: "Rate estimator", en: "Rate estimator" },
  window_aggregator: { ru: "Window aggregator", en: "Window aggregator" }
};

const BLOCK_MODE_OPTIONS_MAP = {
  timer: [
    { value: "pulse", ru: "Импульс", en: "Pulse" },
    { value: "delay_on", ru: "Задержка включения", en: "On delay" },
    { value: "delay_off", ru: "Задержка выключения", en: "Off delay" },
    { value: "interval", ru: "Интервал", en: "Interval" },
    { value: "interval_while_enabled", ru: "Интервал по enable", en: "Interval while enabled" }
  ],
  button: [
    { value: "events", ru: "События кнопки", en: "Button events" }
  ],
  latch: [
    { value: "toggle", ru: "Toggle", en: "Toggle" },
    { value: "set_reset", ru: "Set / reset", en: "Set / reset" },
    { value: "set_only", ru: "Set only", en: "Set only" },
    { value: "reset_only", ru: "Reset only", en: "Reset only" }
  ],
  selector: [
    { value: "select", ru: "Выбор A/B", en: "Select A/B" }
  ],
  comparator: [
    { value: "gt", ru: ">", en: ">" },
    { value: "gte", ru: ">=", en: ">=" },
    { value: "lt", ru: "<", en: "<" },
    { value: "lte", ru: "<=", en: "<=" },
    { value: "eq", ru: "=", en: "=" },
    { value: "between", ru: "Между", en: "Between" },
    { value: "outside", ru: "Вне окна", en: "Outside" }
  ],
  scale_map: [
    { value: "scale", ru: "Scale", en: "Scale" },
    { value: "clamp", ru: "Clamp", en: "Clamp" },
    { value: "map", ru: "Map диапазона", en: "Range map" }
  ],
  logic_gate: [
    { value: "and", ru: "AND", en: "AND" },
    { value: "or", ru: "OR", en: "OR" },
    { value: "xor", ru: "XOR", en: "XOR" },
    { value: "not", ru: "NOT", en: "NOT" }
  ],
  edge_detect: [
    { value: "rising", ru: "Передний фронт", en: "Rising edge" },
    { value: "falling", ru: "Задний фронт", en: "Falling edge" },
    { value: "both", ru: "Оба фронта", en: "Both edges" }
  ],
  hysteresis: [
    { value: "high", ru: "High / low", en: "High / low" },
    { value: "inside_band", ru: "Внутри зоны", en: "Inside band" },
    { value: "outside_band", ru: "Вне зоны", en: "Outside band" }
  ],
  counter: [
    { value: "rising", ru: "Считать фронты", en: "Count edges" }
  ],
  interlock: [
    { value: "interlock", ru: "Request + permissive + inhibit", en: "Request + permissive + inhibit" },
    { value: "permissive", ru: "Только permissive", en: "Permissive only" },
    { value: "inhibit", ru: "Только inhibit", en: "Inhibit only" }
  ],
  mode_authority: [
    { value: "local_remote", ru: "Local / remote", en: "Local / remote" },
    { value: "local_remote_service", ru: "Local / remote / service", en: "Local / remote / service" },
    { value: "auto_manual", ru: "Auto / manual", en: "Auto / manual" },
    { value: "auto_manual_service", ru: "Auto / manual / service", en: "Auto / manual / service" }
  ],
  freshness: [
    { value: "fresh", ru: "Свежесть", en: "Freshness" },
    { value: "stale", ru: "Устаревание", en: "Stale" },
    { value: "comm_loss", ru: "Потеря связи", en: "Comm loss" }
  ],
  totalizer: [
    { value: "delta", ru: "Delta total", en: "Delta total" }
  ],
  rate_estimator: [
    { value: "per_second", ru: "В секунду", en: "Per second" },
    { value: "per_minute", ru: "В минуту", en: "Per minute" },
    { value: "per_hour", ru: "В час", en: "Per hour" }
  ],
  window_aggregator: [
    { value: "average", ru: "Среднее", en: "Average" },
    { value: "sum", ru: "Сумма", en: "Sum" },
    { value: "min", ru: "Минимум", en: "Minimum" },
    { value: "max", ru: "Максимум", en: "Maximum" }
  ]
};

const BLOCK_SCENARIOS = [
  { value: "manual", label: { ru: "Ручная настройка", en: "Manual" }, type: "", mode: "" },
  { value: "timer_pulse", label: { ru: "Таймер: импульс", en: "Timer: pulse" }, type: "timer", mode: "pulse" },
  { value: "timer_interval", label: { ru: "Таймер: интервал", en: "Timer: interval" }, type: "timer", mode: "interval" },
  { value: "button_events", label: { ru: "Кнопка: события", en: "Button: events" }, type: "button", mode: "events" },
  { value: "latch_toggle", label: { ru: "Latch: toggle", en: "Latch: toggle" }, type: "latch", mode: "toggle" },
  { value: "selector_ab", label: { ru: "Selector: A/B", en: "Selector: A/B" }, type: "selector", mode: "select" },
  { value: "comparator_threshold", label: { ru: "Comparator: порог", en: "Comparator: threshold" }, type: "comparator", mode: "gt" },
  { value: "scale_linear", label: { ru: "Scale: линейно", en: "Scale: linear" }, type: "scale_map", mode: "scale" },
  { value: "logic_and", label: { ru: "Logic: AND", en: "Logic: AND" }, type: "logic_gate", mode: "and" },
  { value: "edge_pulse", label: { ru: "Edge: impulse", en: "Edge: pulse" }, type: "edge_detect", mode: "rising" },
  { value: "hysteresis_window", label: { ru: "Hysteresis", en: "Hysteresis" }, type: "hysteresis", mode: "high" },
  { value: "counter_edges", label: { ru: "Counter: фронты", en: "Counter: edges" }, type: "counter", mode: "rising" },
  { value: "interlock_gate", label: { ru: "Interlock gate", en: "Interlock gate" }, type: "interlock", mode: "interlock" },
  { value: "mode_local_remote", label: { ru: "Mode: local/remote", en: "Mode: local/remote" }, type: "mode_authority", mode: "local_remote" },
  { value: "freshness_watchdog", label: { ru: "Freshness watchdog", en: "Freshness watchdog" }, type: "freshness", mode: "fresh" },
  { value: "signal_extract", label: { ru: "Signal extractor", en: "Signal extractor" }, type: "signal_extractor", mode: "digital_direct" },
  { value: "totalizer_flow", label: { ru: "Totalizer: flow", en: "Totalizer: flow" }, type: "totalizer", mode: "delta" },
  { value: "rate_live", label: { ru: "Rate estimator", en: "Rate estimator" }, type: "rate_estimator", mode: "per_minute" },
  { value: "window_average", label: { ru: "Window average", en: "Window average" }, type: "window_aggregator", mode: "average" }
];

const TIMER_UNITS = [
  { value: "ms", label: "ms", factor: 1 },
  { value: "s", label: "s", factor: 1000 },
  { value: "min", label: "min", factor: 60000 },
  { value: "h", label: "h", factor: 3600000 }
];

function slugifyIdPart(value, fallback = "item") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function blockTypeLabel(type) {
  const lang = getUiLanguage() === "ru" ? "ru" : "en";
  return BLOCK_TYPE_LABELS[type]?.[lang] || type || "-";
}

function getBlockModeOptions(type) {
  const lang = getUiLanguage() === "ru" ? "ru" : "en";
  return (BLOCK_MODE_OPTIONS_MAP[type] || []).map((entry) => ({
    value: entry.value,
    label: entry[lang] || entry.en || entry.value
  }));
}

function renderBlockScenarioOptions() {
  const select = $("blockScenario");
  if (!select) return;
  const lang = getUiLanguage() === "ru" ? "ru" : "en";
  const current = select.value || "manual";
  select.innerHTML = BLOCK_SCENARIOS.map((entry) => (
    `<option value="${entry.value}">${escapeHtml(entry.label[lang] || entry.label.en || entry.value)}</option>`
  )).join("");
  select.value = BLOCK_SCENARIOS.some((entry) => entry.value === current) ? current : "manual";
  const cards = $("blockScenarioCards");
  if (cards) {
    cards.innerHTML = BLOCK_SCENARIOS.filter((entry) => entry.value !== "manual").map((entry) => (
      `<button type="button" class="ghost" data-block-scenario-card="${entry.value}">${escapeHtml(entry.label[lang] || entry.label.en || entry.value)}</button>`
    )).join("");
  }
}

function renderTimerUnitOptions() {
  ["blockDurationUnit", "blockPeriodUnit"].forEach((id) => {
    const select = $(id);
    if (!select) return;
    const current = select.value || "s";
    select.innerHTML = TIMER_UNITS.map((unit) => `<option value="${unit.value}">${unit.label}</option>`).join("");
    select.value = TIMER_UNITS.some((unit) => unit.value === current) ? current : "s";
  });
}

function unitFactor(unitValue) {
  return TIMER_UNITS.find((entry) => entry.value === unitValue)?.factor || 1;
}

function chooseTimerUnit(ms) {
  const value = Number(ms || 0);
  if (!Number.isFinite(value) || value < 1000) return "ms";
  if (value % 3600000 === 0) return "h";
  if (value % 60000 === 0) return "min";
  if (value % 1000 === 0) return "s";
  return "ms";
}

function setTimerFieldMs(prefix, milliseconds) {
  const valueInput = $(`${prefix}Value`);
  const unitSelect = $(`${prefix}Unit`);
  if (!valueInput || !unitSelect) return;
  renderTimerUnitOptions();
  const totalMs = Number(milliseconds || 0);
  const unit = chooseTimerUnit(totalMs);
  unitSelect.value = unit;
  valueInput.value = String(totalMs / unitFactor(unit));
}

function getTimerFieldMs(prefix) {
  const value = parseFloat($(`${prefix}Value`)?.value || "0");
  const unit = $(`${prefix}Unit`)?.value || "ms";
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * unitFactor(unit)));
}

function setIntervalTimerFields(onMs, fullCycleMs) {
  setTimerFieldMs("blockDuration", onMs);
  setTimerFieldMs("blockPeriod", fullCycleMs);
}

function getIntervalFullCycleMs() {
  return getTimerFieldMs("blockPeriod");
}

function autoGpioCandidates() {
  return (state.hardware?.pins || [])
    .filter((pin) => !["exclusive", "forbidden"].includes(pin.class))
    .filter((pin) => pin.available || pin.channel || pin.owner === "free")
    .sort((a, b) => a.gpio - b.gpio);
}

function renderAutoGpioOptions() {
  const currentValues = {};
  ["blockAutoTriggerGpio", "blockAutoToggleGpio", "blockAutoSetGpio", "blockAutoResetGpio"].forEach((id) => {
    currentValues[id] = $(id)?.value || "";
  });
  const options = autoGpioCandidates()
    .map((pin) => `<option value="${pin.gpio}">GPIO${pin.gpio} - ${escapeHtml(pin.class || "available")}${pin.reason ? ` - ${escapeHtml(pin.reason)}` : ""}</option>`)
    .join("");
  ["blockAutoTriggerGpio", "blockAutoToggleGpio", "blockAutoSetGpio", "blockAutoResetGpio"].forEach((id) => {
    const select = $(id);
    if (!select) return;
    select.innerHTML = `<option value="-1">${getUiLanguage() === "ru" ? "Выбери GPIO" : "Select GPIO"}</option>${options}`;
    if (currentValues[id] && select.querySelector(`option[value="${currentValues[id]}"]`)) {
      select.value = currentValues[id];
    } else {
      select.value = "-1";
    }
  });
}

function blockOutputEntries() {
  const channels = Object.keys(state.channels?.channels || {}).map((id) => ({
    value: id,
    label: `${id} - channel`
  }));
  const signals = Object.entries(state.signals?.signals || {}).map(([id, signal]) => ({
    value: id,
    label: `${id} - ${signal.label || signal.class || "signal"}`
  }));
  const unique = new Map();
  channels.concat(signals).forEach((entry) => {
    if (!unique.has(entry.value)) unique.set(entry.value, entry.label);
  });
  return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
}

function renderBlockOutputOptions() {
  const select = $("blockOutputPreset");
  if (!select) return;
  const current = $("blockOutput")?.value?.trim?.() || select.value || "";
  const options = blockOutputEntries()
    .map((entry) => `<option value="${entry.value}">${escapeHtml(entry.label)}</option>`)
    .join("");
  select.innerHTML = `<option value="">${getUiLanguage() === "ru" ? "Свободный ID / вручную" : "Manual / free ID"}</option>${options}`;
  if (current && select.querySelector(`option[value="${current}"]`)) {
    select.value = current;
  } else {
    select.value = "";
  }
}

function syncBlockOutputFromPreset() {
  const preset = $("blockOutputPreset")?.value || "";
  if ($("blockOutput") && preset) $("blockOutput").value = preset;
  updateBlockAssistantPreview();
}

function scenarioForCurrentBlock() {
  const type = $("blockType")?.value || "";
  const mode = $("blockMode")?.value || "";
  return BLOCK_SCENARIOS.find((entry) => entry.type === type && entry.mode === mode)
    || BLOCK_SCENARIOS.find((entry) => entry.type === type)
    || BLOCK_SCENARIOS[0];
}

function syncScenarioFromCurrentBlock() {
  const scenario = scenarioForCurrentBlock();
  if ($("blockScenario")) $("blockScenario").value = scenario.value;
  if ($("blockScenarioNote")) {
    $("blockScenarioNote").textContent = getUiLanguage() === "ru"
      ? `Тип ${blockTypeLabel($("blockType")?.value || "")} сейчас лучше всего совпадает со сценарием "${scenario.label.ru || scenario.label.en}".`
      : `Current ${blockTypeLabel($("blockType")?.value || "")} setup matches "${scenario.label.en || scenario.label.ru}".`;
  }
}

function applyBlockScenario(value) {
  const scenario = BLOCK_SCENARIOS.find((entry) => entry.value === value) || BLOCK_SCENARIOS[0];
  if (scenario.value === "manual") {
    syncScenarioFromCurrentBlock();
    return;
  }
  resetBlockForm(scenario.type || "timer");
  if ($("blockType") && scenario.type) $("blockType").value = scenario.type;
  syncBlockModeOptions(scenario.mode || undefined);
  if ($("blockScenario")) $("blockScenario").value = scenario.value;
  if ($("blockScenarioNote")) {
    $("blockScenarioNote").textContent = getUiLanguage() === "ru"
      ? `Применён быстрый сценарий "${scenario.label.ru || scenario.label.en}".`
      : `Applied quick scenario "${scenario.label.en || scenario.label.ru}".`;
  }
}

function currentBlockBaseId() {
  const type = $("blockType")?.value || "block";
  const primary = $("blockCompareInput")?.value
    || $("blockInput")?.value
    || $("blockTrigger")?.value
    || $("blockPrimary")?.value
    || $("blockToggleInput")?.value
    || $("blockSetInput")?.value
    || $("blockResetInput")?.value
    || $("blockOutput")?.value;
  const typePrefixMap = {
    timer: "timer",
    button: "button",
    latch: "latch",
    selector: "selector",
    comparator: "cmp",
    scale_map: "scale",
    logic_gate: "logic",
    edge_detect: "edge",
    hysteresis: "hyst",
    counter: "counter",
    interlock: "interlock",
    mode_authority: "mode",
    freshness: "fresh",
    totalizer: "total",
    rate_estimator: "rate",
    window_aggregator: "window"
  };
  return `${typePrefixMap[type] || slugifyIdPart(type, "block")}_${slugifyIdPart(primary, "main")}`;
}

function buildBlockHumanSummary() {
  const type = $("blockType")?.value || "";
  const mode = $("blockMode")?.value || "";
  const output = $("blockOutput")?.value?.trim?.() || "-";
  const lang = getUiLanguage() === "ru" ? "ru" : "en";
  const typeLabel = blockTypeLabel(type);
  const modeLabel = getBlockModeOptions(type).find((entry) => entry.value === mode)?.label || mode || "-";
  if (lang === "ru") {
    return `${typeLabel}: режим ${modeLabel}, выход ${output}`;
  }
  return `${typeLabel}: mode ${modeLabel}, output ${output}`;
}

function setBlockManualIdMode(mode) {
  const manual = mode === "manual";
  state.ui.blockManualId = manual;
  if ($("blockIdMode")) $("blockIdMode").value = manual ? "manual" : "auto";
  if ($("blockId")) $("blockId").readOnly = !manual;
  refreshBlockIdPresentation();
}

function syncAutoBlockId(force = false) {
  const idInput = $("blockId");
  if (!idInput) return;
  const autoMode = ($("blockIdMode")?.value || "auto") === "auto";
  if (!force && !autoMode) return;
  if (state.ui.blockEditingExisting && !force) return;
  idInput.value = currentBlockBaseId();
  refreshBlockIdPresentation();
}

function refreshBlockIdPresentation() {
  const blockId = $("blockId")?.value?.trim?.() || currentBlockBaseId();
  if ($("blockIdChip")) $("blockIdChip").value = buildBlockHumanSummary();
  if ($("blockIdSummary")) {
    $("blockIdSummary").textContent = getUiLanguage() === "ru"
      ? `Предлагаемый ID: ${blockId}. ${buildBlockHumanSummary()}`
      : `Suggested ID: ${blockId}. ${buildBlockHumanSummary()}`;
  }
}

function updateBlockAssistantVisibility() {
  const type = $("blockType")?.value || "";
  const autoHelperTypes = new Set(["timer", "latch"]);
  $("blockAssistantCard")?.classList.toggle("hidden", !autoHelperTypes.has(type) && type !== "signal_extractor");
  ["blockAutoTrigger", "blockAutoToggle", "blockAutoSet", "blockAutoReset"].forEach((name) => {
    const enabled = Boolean($(`${name}Enable`)?.checked);
    $(`${name}Fields`)?.classList.toggle("hidden", !enabled);
  });
  const showTiming = ["timer", "latch"].includes(type);
  $("blockAutoButtonTiming")?.classList.toggle("hidden", !showTiming);
}

function refreshBlockSectionVisibility() {
  updateBlockAssistantVisibility();
  ["blockControlSection", "blockOutputSection", "blockTimingSection", "blockAdvancedSection"].forEach((id) => {
    $(id)?.classList.remove("hidden");
  });
}

function setWrapVisible(id, visible) {
  const node = $(id);
  if (!node) return;
  node.classList.toggle("hidden", !visible);
}

function setBlockTypeVisibility() {
  const type = $("blockType")?.value || "timer";
  const mode = $("blockMode")?.value || "";
  const allWraps = [
    "blockTriggerWrap", "blockEnableWrap", "blockPrimaryWrap", "blockSecondaryWrap", "blockSelectWrap",
    "blockInputWrap", "blockToggleInputWrap", "blockSetInputWrap", "blockResetInputWrap",
    "blockCompareInputWrap", "blockCompareSignalWrap", "blockAuxInputWrap", "blockOutputPresetWrap",
    "blockOutputWrap", "blockDurationWrap", "blockPeriodWrap", "blockDebounceWrap", "blockLongPressWrap",
    "blockDoublePressWrap", "blockCompareValueWrap", "blockCompareValueBWrap", "blockCompareValueCWrap",
    "blockCompareValueDWrap", "blockRetriggerWrap", "blockStartImmediatelyWrap", "blockRetainWrap",
    "blockResetPriorityWrap", "blockAutoTriggerWrap", "blockAutoToggleWrap", "blockAutoSetWrap", "blockAutoResetWrap"
  ];
  allWraps.forEach((id) => setWrapVisible(id, false));
  setWrapVisible("blockOutputWrap", type !== "button");
  setWrapVisible("blockOutputPresetWrap", type !== "button");

  switch (type) {
    case "timer":
      setWrapVisible("blockTriggerWrap", mode !== "interval");
      setWrapVisible("blockEnableWrap", mode === "interval_while_enabled");
      setWrapVisible("blockDurationWrap", true);
      setWrapVisible("blockPeriodWrap", mode === "interval" || mode === "interval_while_enabled");
      setWrapVisible("blockRetriggerWrap", mode !== "interval");
      setWrapVisible("blockStartImmediatelyWrap", mode === "interval" || mode === "interval_while_enabled");
      setWrapVisible("blockAutoTriggerWrap", mode !== "interval");
      break;
    case "button":
      setWrapVisible("blockInputWrap", true);
      setWrapVisible("blockDebounceWrap", true);
      setWrapVisible("blockLongPressWrap", true);
      setWrapVisible("blockDoublePressWrap", true);
      setWrapVisible("blockOutputWrap", false);
      setWrapVisible("blockOutputPresetWrap", false);
      break;
    case "latch":
      setWrapVisible(mode === "toggle" ? "blockToggleInputWrap" : "blockSetInputWrap", mode !== "reset_only");
      setWrapVisible("blockResetInputWrap", mode === "set_reset" || mode === "reset_only");
      setWrapVisible("blockRetainWrap", true);
      setWrapVisible("blockResetPriorityWrap", mode === "set_reset");
      setWrapVisible("blockAutoToggleWrap", mode === "toggle");
      setWrapVisible("blockAutoSetWrap", mode === "set_reset" || mode === "set_only");
      setWrapVisible("blockAutoResetWrap", mode === "set_reset" || mode === "reset_only");
      break;
    case "selector":
      setWrapVisible("blockPrimaryWrap", true);
      setWrapVisible("blockSecondaryWrap", true);
      setWrapVisible("blockSelectWrap", true);
      break;
    case "comparator":
      setWrapVisible("blockCompareInputWrap", true);
      setWrapVisible("blockCompareSignalWrap", true);
      setWrapVisible("blockCompareValueWrap", true);
      setWrapVisible("blockCompareValueBWrap", mode === "between" || mode === "outside");
      break;
    case "scale_map":
      setWrapVisible("blockCompareInputWrap", true);
      setWrapVisible("blockCompareValueWrap", true);
      setWrapVisible("blockCompareValueBWrap", true);
      setWrapVisible("blockCompareValueCWrap", mode === "map");
      setWrapVisible("blockCompareValueDWrap", mode === "map");
      break;
    case "logic_gate":
      setWrapVisible("blockCompareInputWrap", true);
      setWrapVisible("blockCompareSignalWrap", mode !== "not");
      break;
    case "edge_detect":
      setWrapVisible("blockCompareInputWrap", true);
      setWrapVisible("blockDurationWrap", true);
      setWrapVisible("blockRetriggerWrap", true);
      break;
    case "hysteresis":
      setWrapVisible("blockCompareInputWrap", true);
      setWrapVisible("blockCompareValueWrap", true);
      setWrapVisible("blockCompareValueBWrap", true);
      break;
    case "counter":
    case "totalizer":
    case "rate_estimator":
    case "window_aggregator":
      setWrapVisible("blockCompareInputWrap", true);
      setWrapVisible("blockResetInputWrap", type === "counter" || type === "totalizer");
      setWrapVisible("blockCompareValueWrap", true);
      setWrapVisible("blockCompareValueBWrap", type !== "window_aggregator");
      setWrapVisible("blockCompareValueCWrap", type === "totalizer");
      setWrapVisible("blockCompareValueDWrap", type === "totalizer");
      setWrapVisible("blockDurationWrap", type === "rate_estimator" || type === "window_aggregator");
      setWrapVisible("blockPeriodWrap", type === "window_aggregator");
      setWrapVisible("blockRetainWrap", type === "totalizer");
      break;
    default:
      setWrapVisible("blockCompareInputWrap", true);
      break;
  }

  updateBlockAssistantVisibility();
  refreshBlockIdPresentation();
}

function updateBlockAssistantPreview() {
  const preview = $("blockAssistantPreview");
  if (!preview) return;
  const lines = [
    `${getUiLanguage() === "ru" ? "Блок" : "Block"}: ${blockTypeLabel($("blockType")?.value || "")}`,
    `${getUiLanguage() === "ru" ? "Режим" : "Mode"}: ${(getBlockModeOptions($("blockType")?.value || "").find((entry) => entry.value === ($("blockMode")?.value || ""))?.label || $("blockMode")?.value || "-")}`,
    `${getUiLanguage() === "ru" ? "Сводка" : "Summary"}: ${buildBlockHumanSummary()}`
  ];
  const output = $("blockOutput")?.value?.trim?.();
  if (output) lines.push(`${getUiLanguage() === "ru" ? "Выход" : "Output"}: ${output}`);
  preview.innerHTML = lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
}

function defaultModeForType(type) {
  return getBlockModeOptions(type)[0]?.value || "";
}

function syncBlockModeOptions(preferredMode) {
  const type = $("blockType")?.value || "timer";
  const select = $("blockMode");
  if (!select) return;
  const previous = preferredMode || select.value || defaultModeForType(type);
  const options = getBlockModeOptions(type);
  select.innerHTML = options.map((entry) => `<option value="${entry.value}">${escapeHtml(entry.label)}</option>`).join("");
  select.value = options.some((entry) => entry.value === previous) ? previous : (options[0]?.value || "");
  setBlockTypeVisibility();
  updateBlockAssistantPreview();
}

function renderBlockOptions(){const signalEntries=Object.entries(state.signals?.signals||{});const signalOptions=signalEntries.map(([id,s])=>'<option value="'+id+'">'+id+' - '+(s.label||s.class||'signal')+'</option>').join('');['blockTrigger','blockEnable','blockPrimary','blockSecondary','blockSelect','blockInput','blockToggleInput','blockSetInput','blockResetInput','blockCompareInput','blockCompareSignal'].forEach(id=>{$(id).innerHTML='<option value="">Select signal</option>'+signalOptions});}
function renderCleanupReview(){const review=state.ui.cleanupReview;const items=review?.candidates||[];$('cleanupSummary').textContent=review?(t('cleanupSummaryPrefix')+review.block_id+t('cleanupSummaryMiddle')):t('cleanupNoData');$('cleanupItems').innerHTML=items.length?items.map((item,index)=>{const refs=item.references||[];const refsHtml=refs.length?refs.map(ref=>'<div class="muted-line">• '+escapeHtml(cleanupReferenceText(ref))+'</div>').join(''):'<div class="muted-line">'+t('cleanupExternalNone')+'</div>';const checked=item.recommended_delete?'checked':'';return '<label class="section-card"><div class="checkbox-row"><input type="checkbox" data-cleanup-index="'+index+'" '+checked+'><strong>'+escapeHtml(cleanupItemTitle(item))+'</strong><span class="caps">'+(item.recommended_delete?t('cleanupWillDelete'):t('cleanupWillKeep'))+'</span></div><div class="muted-line" style="margin-top:8px">'+t('cleanupRolePrefix')+escapeHtml(cleanupRoleLabel(item.kind,item.role))+'</div><div class="muted-line">'+t('cleanupRefsPrefix')+refs.length+'</div><div class="muted-line" style="margin-top:8px">'+t('cleanupInUse')+'</div>'+refsHtml+'</label>'}).join(''):'<div class="note">'+t('cleanupNoRelated')+'</div>';updateCleanupSelectionHints()}
async function openCleanupReview(blockId){$('cleanupStatus').textContent=t('cleanupLoading');$('cleanupSummary').textContent=t('cleanupLoading');$('cleanupItems').innerHTML='';openModal('cleanupModal');try{const review=await getJson('/block-delete-review?block_id='+encodeURIComponent(blockId));state.ui.cleanupReview=review;renderCleanupReview();$('cleanupStatus').textContent=t('cleanupReviewReady')}catch(e){$('cleanupStatus').textContent=t('saveFailed')+e.message;$('cleanupSummary').textContent='Не удалось получить список зависимостей.';$('cleanupItems').innerHTML=''}}
async function confirmCleanupDelete(){const review=state.ui.cleanupReview;const blockId=review?.block_id;if(!blockId){$('cleanupStatus').textContent=t('cleanupNoReview');return}const selectedChannels=[];const selectedBlocks=[];document.querySelectorAll('[data-cleanup-index]').forEach(box=>{if(!box.checked)return;const item=review.candidates[parseInt(box.dataset.cleanupIndex,10)];if(!item)return;if(item.kind==='channel')selectedChannels.push(item.id);if(item.kind==='block')selectedBlocks.push(item.id)});$('cleanupStatus').textContent=t('deletingBlock');try{const r=await getJson('/block-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({block_id:blockId,delete_channels:selectedChannels,delete_blocks:selectedBlocks})});await loadAll();state.ui.cleanupReview=null;closeModal('cleanupModal');resetBlockForm();closeModal('blockModal');$('blockSaveStatus').textContent=r.message||t('blockDeleted')}catch(e){$('cleanupStatus').textContent=t('saveFailed')+e.message}}
function renderBlocks(){const filter=state.ui.blockFilter||'all';const search=(state.ui.blockSearch||'').trim().toLowerCase();const isRu=getUiLanguage()==='ru';const rows=Object.entries(state.blocks?.blocks||{}).filter(([id,block])=>{if(filter!=='all'&&block.type!==filter)return false;const haystack=(id+' '+(block.type||'')+' '+(block.mode||'')+' '+(block.input_a||'')+' '+(block.input_b||'')+' '+(block.control||'')+' '+(block.output_a||'')+' '+(block.compare_signal||'')+' '+(block.compare_value??'')+' '+(block.compare_value_b??'')+' '+(block.value_a??'')+' '+(block.value_b??'')+' '+(block.value_c??'')+' '+(block.value_d??'')).toLowerCase();return !search||haystack.includes(search)}).map(([id,block])=>{const route=block.type==='selector'?((block.input_a||'-')+' / '+(block.input_b||'-')+' / '+(block.control||'-')):block.type==='button'?(block.input_a||'-'):block.type==='latch'?((block.mode==='set_reset'||block.mode==='set_only'?'set '+(block.input_a||'-'):'toggle '+(block.input_a||'-'))+(block.mode==='set_reset'||block.mode==='reset_only'?(' / reset '+(block.input_b||'-')):'')):block.type==='comparator'?((block.input_a||'-')+' '+(block.mode||'gt')+' '+(block.compare_signal||((block.mode==='between'||block.mode==='outside')?((block.compare_value??0)+'..'+(block.compare_value_b??0)):(block.compare_value??0)))):block.type==='scale_map'?((block.input_a||'-')+' ['+(block.mode||'scale')+']'):block.type==='logic_gate'?(block.mode==='not'?('NOT '+(block.input_a||'-')):((block.input_a||'-')+' '+String(block.mode||'and').toUpperCase()+' '+(block.input_b||'-'))):block.type==='edge_detect'?((block.input_a||'-')+' ['+(block.mode||'rising')+']'):block.type==='hysteresis'?((block.input_a||'-')+' ['+(block.mode||'high')+']'):((block.input_a||'-')+(block.input_b?(' / en '+block.input_b):''));const timerOff=(block.mode==='interval'||block.mode==='interval_while_enabled')?Math.max((block.period_ms||0)-(block.duration_ms||0),0):0;const timing=block.type==='timer'?((block.mode==='interval'||block.mode==='interval_while_enabled')?((isRu?'ВКЛ ':'ON ')+formatMsForTable(block.duration_ms||0)+' / '+(isRu?'ВЫКЛ ':'OFF ')+formatMsForTable(timerOff)):formatMsForTable(block.duration_ms||0)):block.type==='button'?('db '+formatMsForTable(block.debounce_ms||50)+' / long '+formatMsForTable(block.long_press_ms||800)+' / dbl '+formatMsForTable(block.double_press_ms||350)):block.type==='scale_map'?(block.mode==='map'?((block.value_a??0)+'..'+(block.value_b??0)+' -> '+(block.value_c??0)+'..'+(block.value_d??0)):block.mode==='clamp'?((isRu?'диапазон ':'range ')+(block.value_a??0)+'..'+(block.value_b??0)):((isRu?'k=':'k=')+(block.value_a??1)+' / '+(isRu?'b=':'b=')+(block.value_b??0))):block.type==='logic_gate'?(isRu?'логика':'logic'):block.type==='edge_detect'?(isRu?'импульс '+formatMsForTable(block.duration_ms||100):'pulse '+formatMsForTable(block.duration_ms||100)):block.type==='hysteresis'?(block.mode==='outside_band'||block.mode==='inside_band'?((isRu?'центр ':'center ')+(block.value_a??0)+' / '+(isRu?'полуширина ':'half-band ')+(block.value_b??0)):((isRu?'пороги ':'thresholds ')+(block.value_a??0)+'..'+(block.value_b??0))):'-';const modeLabel=getBlockModeOptions(block.type||'').find(opt=>opt.value===(block.mode||''))?.label||(block.mode||'-');const idCell=block.auto_generated?id+' <span class="caps">('+t('generated')+(block.generated_by?': '+block.generated_by:'')+')</span>':id;return '<tr><td>'+idCell+'</td><td>'+blockTypeLabel(block.type||'')+'</td><td>'+modeLabel+'</td><td>'+route+'</td><td>'+(block.output_a||'-')+'</td><td>'+timing+'</td><td><div class="row-actions"><button data-edit-block="'+id+'">Edit</button><button data-delete-block="'+id+'">Delete</button></div></td></tr>'}).join('');$('blocksTable').innerHTML=rows||'<tr><td colspan="7">No blocks available for this filter</td></tr>'}
function setBlockFilter(value){state.ui.blockFilter=value||'all';if($('blockFilter'))$('blockFilter').value=state.ui.blockFilter;renderBlocks()}
function setBlockSearch(value){state.ui.blockSearch=value||'';if($('blockSearch'))$('blockSearch').value=state.ui.blockSearch;renderBlocks()}
function resetBlockForm(type='timer'){window.ensureAllBlockTypeOptions?.();state.ui.blockEditingExisting=false;state.ui.blockManualId=false;renderBlockOptions();renderAutoGpioOptions();renderBlockScenarioOptions();renderTimerUnitOptions();$('blockId').value='';$('blockType').value=type;syncBlockModeOptions(type==='timer'?'pulse':type==='button'?'events':type==='latch'?'toggle':type==='comparator'?'gt':type==='scale_map'?'scale':type==='logic_gate'?'and':type==='edge_detect'?'rising':type==='hysteresis'?'high':'selector');renderBlockOutputOptions();$('blockOutputPreset').value='';$('blockOutput').value='';setTimerFieldMs('blockDuration',type==='edge_detect'?100:5000);setIntervalTimerFields(5000,30000);$('blockDebounce').value='50';$('blockLongPress').value='800';$('blockDoublePress').value='350';$('blockCompareValue').value=type==='scale_map'?'1':'0';$('blockCompareValueB').value=type==='hysteresis'?'1':'0';$('blockCompareValueC').value='0';$('blockCompareValueD').value='1';$('blockAutoButtonDebounce').value='50';$('blockAutoButtonLongPress').value='800';$('blockAutoButtonDoublePress').value='350';$('blockRetrigger').checked=false;$('blockStartImmediately').checked=false;$('blockRetain').checked=false;$('blockResetPriority').checked=false;['blockAutoTriggerEnable','blockAutoToggleEnable','blockAutoSetEnable','blockAutoResetEnable','blockAutoTriggerPullup','blockAutoTriggerInverted','blockAutoTogglePullup','blockAutoToggleInverted','blockAutoSetPullup','blockAutoSetInverted','blockAutoResetPullup','blockAutoResetInverted'].forEach(id=>{$(id).checked=false});['blockTrigger','blockEnable','blockPrimary','blockSecondary','blockSelect','blockInput','blockToggleInput','blockSetInput','blockResetInput','blockCompareInput','blockCompareSignal'].forEach(id=>{$(id).value=''});['blockAutoTriggerEvent','blockAutoToggleEvent','blockAutoSetEvent','blockAutoResetEvent'].forEach(id=>{$(id).value='short_press'});$('blockScenario').value='manual';$('blockIdMode').value='auto';setBlockTypeVisibility();syncScenarioFromCurrentBlock();syncAutoBlockId(true);$('blockSaveStatus').textContent=t('createOrEditBlock')}
function editBlock(id){const block=state.blocks?.blocks?.[id];if(!block)return;window.ensureAllBlockTypeOptions?.();state.ui.blockEditingExisting=true;state.ui.blockManualId=true;renderBlockOptions();renderAutoGpioOptions();renderBlockScenarioOptions();renderTimerUnitOptions();$('blockId').value=id;$('blockType').value=block.type||'timer';syncBlockModeOptions(block.mode||($('blockType').value==='timer'?'pulse':$('blockType').value==='button'?'events':$('blockType').value==='latch'?'toggle':$('blockType').value==='comparator'?'gt':$('blockType').value==='scale_map'?'scale':$('blockType').value==='logic_gate'?'and':$('blockType').value==='edge_detect'?'rising':$('blockType').value==='hysteresis'?'high':'selector'));renderBlockOutputOptions();$('blockTrigger').value=block.input_a||'';$('blockEnable').value=block.input_b||'';$('blockPrimary').value=block.input_a||'';$('blockSecondary').value=block.input_b||'';$('blockSelect').value=block.control||'';$('blockInput').value=block.input_a||'';$('blockToggleInput').value=block.toggle_input||block.input_a||'';$('blockSetInput').value=block.set_input||block.input_a||'';$('blockResetInput').value=block.reset_input||block.input_b||'';$('blockCompareInput').value=block.input_a||'';$('blockCompareSignal').value=block.compare_signal||block.input_b||'';$('blockOutput').value=block.output_a||'';$('blockOutputPreset').value=block.output_a||'';if((block.type||'timer')==='timer'&&((block.mode||'')==='interval'||(block.mode||'')==='interval_while_enabled'))setIntervalTimerFields(block.duration_ms||5000,block.period_ms||30000);else{setTimerFieldMs('blockDuration',block.duration_ms||((block.type||'')==='edge_detect'?100:5000));setTimerFieldMs('blockPeriod',block.period_ms||30000)}$('blockDebounce').value=String(block.debounce_ms||50);$('blockLongPress').value=String(block.long_press_ms||800);$('blockDoublePress').value=String(block.double_press_ms||350);$('blockCompareValue').value=String(block.value_a??block.compare_value??0);$('blockCompareValueB').value=String(block.value_b??block.compare_value_b??0);$('blockCompareValueC').value=String(block.value_c??0);$('blockCompareValueD').value=String(block.value_d??1);$('blockAutoButtonDebounce').value='50';$('blockAutoButtonLongPress').value='800';$('blockAutoButtonDoublePress').value='350';$('blockRetrigger').checked=!!block.retrigger;$('blockStartImmediately').checked=!!block.start_immediately;$('blockRetain').checked=!!block.retain;$('blockResetPriority').checked=!!block.reset_priority;['blockAutoTriggerEnable','blockAutoToggleEnable','blockAutoSetEnable','blockAutoResetEnable'].forEach(id=>{$(id).checked=false});$('blockIdMode').value='manual';setBlockTypeVisibility();syncScenarioFromCurrentBlock();refreshBlockIdPresentation();$('blockSaveStatus').textContent=t('editBlockPrefix')+id;openModal('blockModal')}
async function saveBlockDefinition(){$('blockSaveStatus').textContent=t('savingBlock');if(!state.ui.blockManualId&&!state.ui.blockEditingExisting)syncAutoBlockId(true);const type=$('blockType').value;const mode=$('blockMode').value;const payload={block_id:$('blockId').value.trim(),type:type,mode:mode,output:$('blockOutput').value.trim(),auto_button_debounce_ms:parseInt($('blockAutoButtonDebounce').value,10)||50,auto_button_long_press_ms:parseInt($('blockAutoButtonLongPress').value,10)||800,auto_button_double_press_ms:parseInt($('blockAutoButtonDoublePress').value,10)||350};if(!payload.block_id){$('blockSaveStatus').textContent=t('blockIdRequired');return}if(type==='timer'){payload.trigger=$('blockTrigger').value;payload.enable=$('blockEnable').value;payload.duration_ms=getTimerFieldMs('blockDuration')||5000;payload.period_ms=(mode==='interval'||mode==='interval_while_enabled')?(getIntervalFullCycleMs()||0):(getTimerFieldMs('blockPeriod')||0);payload.retrigger=$('blockRetrigger').checked;payload.start_immediately=$('blockStartImmediately').checked;payload.auto_trigger_enabled=$('blockAutoTriggerEnable').checked;payload.auto_trigger_gpio=parseInt($('blockAutoTriggerGpio').value,10)||-1;payload.auto_trigger_pullup=$('blockAutoTriggerPullup').checked;payload.auto_trigger_inverted=$('blockAutoTriggerInverted').checked;payload.auto_trigger_event=$('blockAutoTriggerEvent').value;if(!payload.auto_trigger_enabled&&!payload.trigger&&mode!=='interval'&&mode!=='interval_while_enabled'){$('blockSaveStatus').textContent=t('triggerRequired');return}if(mode==='interval_while_enabled'&&!payload.enable){$('blockSaveStatus').textContent=t('enableRequired');return}if((mode==='interval'||mode==='interval_while_enabled')&&!payload.period_ms){$('blockSaveStatus').textContent=t('periodRequired');return}if(payload.auto_trigger_enabled&&payload.auto_trigger_gpio<0){$('blockSaveStatus').textContent=t('autoTriggerGpioRequired');return}if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return}}else if(type==='selector'){payload.primary=$('blockPrimary').value;payload.secondary=$('blockSecondary').value;payload.select=$('blockSelect').value;if(!payload.primary||!payload.secondary||!payload.select||!payload.output){$('blockSaveStatus').textContent=t('selectorFieldsRequired');return}}else if(type==='button'){payload.input=$('blockInput').value;payload.debounce_ms=parseInt($('blockDebounce').value,10)||50;payload.long_press_ms=parseInt($('blockLongPress').value,10)||800;payload.double_press_ms=parseInt($('blockDoublePress').value,10)||350;if(!payload.input){$('blockSaveStatus').textContent=t('inputRequired');return}delete payload.output}else if(type==='latch'){payload.retain=$('blockRetain').checked;payload.reset_priority=$('blockResetPriority').checked;payload.auto_toggle_enabled=$('blockAutoToggleEnable').checked;payload.auto_toggle_gpio=parseInt($('blockAutoToggleGpio').value,10)||-1;payload.auto_toggle_pullup=$('blockAutoTogglePullup').checked;payload.auto_toggle_inverted=$('blockAutoToggleInverted').checked;payload.auto_toggle_event=$('blockAutoToggleEvent').value;payload.auto_set_enabled=$('blockAutoSetEnable').checked;payload.auto_set_gpio=parseInt($('blockAutoSetGpio').value,10)||-1;payload.auto_set_pullup=$('blockAutoSetPullup').checked;payload.auto_set_inverted=$('blockAutoSetInverted').checked;payload.auto_set_event=$('blockAutoSetEvent').value;payload.auto_reset_enabled=$('blockAutoResetEnable').checked;payload.auto_reset_gpio=parseInt($('blockAutoResetGpio').value,10)||-1;payload.auto_reset_pullup=$('blockAutoResetPullup').checked;payload.auto_reset_inverted=$('blockAutoResetInverted').checked;payload.auto_reset_event=$('blockAutoResetEvent').value;if(mode==='set_reset'){payload.set_input=$('blockSetInput').value;payload.reset_input=$('blockResetInput').value;if((!payload.auto_set_enabled&&!payload.set_input)||(!payload.auto_reset_enabled&&!payload.reset_input)||!payload.output){$('blockSaveStatus').textContent=t('setResetOutputRequired');return}if(payload.auto_set_enabled&&payload.auto_set_gpio<0){$('blockSaveStatus').textContent=t('autoSetGpioRequired');return}if(payload.auto_reset_enabled&&payload.auto_reset_gpio<0){$('blockSaveStatus').textContent=t('autoResetGpioRequired');return}}else if(mode==='set_only'){payload.set_input=$('blockSetInput').value;if((!payload.auto_set_enabled&&!payload.set_input)||!payload.output){$('blockSaveStatus').textContent=t('setOutputRequired');return}if(payload.auto_set_enabled&&payload.auto_set_gpio<0){$('blockSaveStatus').textContent=t('autoSetGpioRequired');return}}else if(mode==='reset_only'){payload.reset_input=$('blockResetInput').value;if((!payload.auto_reset_enabled&&!payload.reset_input)||!payload.output){$('blockSaveStatus').textContent=t('resetOutputRequired');return}if(payload.auto_reset_enabled&&payload.auto_reset_gpio<0){$('blockSaveStatus').textContent=t('autoResetGpioRequired');return}}else{payload.toggle_input=$('blockToggleInput').value;if((!payload.auto_toggle_enabled&&!payload.toggle_input)||!payload.output){$('blockSaveStatus').textContent=t('toggleOutputRequired');return}if(payload.auto_toggle_enabled&&payload.auto_toggle_gpio<0){$('blockSaveStatus').textContent=t('autoToggleGpioRequired');return}}}else if(type==='comparator'){payload.input=$('blockCompareInput').value;payload.compare_signal=$('blockCompareSignal').value;payload.compare_value=parseFloat($('blockCompareValue').value||'0');payload.compare_value_b=parseFloat($('blockCompareValueB').value||'0');if(!payload.input){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен сравниваемый сигнал':'Comparator input is required';return}if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return}if(mode==='between'||mode==='outside'){if(!Number.isFinite(payload.compare_value)||!Number.isFinite(payload.compare_value_b)){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужны обе уставки A и B':'Both comparator thresholds A and B are required';return}}else if(!payload.compare_signal&&!Number.isFinite(payload.compare_value)){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужна уставка или сигнал уставки':'A setpoint or compare signal is required';return}}else if(type==='scale_map'){payload.input=$('blockCompareInput').value;payload.value_a=parseFloat($('blockCompareValue').value||'0');payload.value_b=parseFloat($('blockCompareValueB').value||'0');payload.value_c=parseFloat($('blockCompareValueC').value||'0');payload.value_d=parseFloat($('blockCompareValueD').value||'1');if(!payload.input){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен исходный сигнал':'Source signal is required';return}if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return}if((mode==='scale'||mode==='clamp')&&(!Number.isFinite(payload.value_a)||!Number.isFinite(payload.value_b))){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужны оба параметра A и B':'Both A and B values are required';return}if(mode==='map'&&(!Number.isFinite(payload.value_a)||!Number.isFinite(payload.value_b)||!Number.isFinite(payload.value_c)||!Number.isFinite(payload.value_d))){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужны все четыре значения диапазонов':'All four mapping values are required';return}}else if(type==='logic_gate'){payload.input=$('blockCompareInput').value;payload.input_b=$('blockCompareSignal').value;if(!payload.input){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен вход A':'Input A is required';return}if(mode!=='not'&&!payload.input_b){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен вход B':'Input B is required';return}if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return}}else if(type==='edge_detect'){payload.input=$('blockCompareInput').value;payload.duration_ms=getTimerFieldMs('blockDuration')||100;payload.retrigger=$('blockRetrigger').checked;if(!payload.input){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен входной сигнал':'Input signal is required';return}if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return}}else if(type==='hysteresis'){payload.input=$('blockCompareInput').value;payload.value_a=parseFloat($('blockCompareValue').value||'0');payload.value_b=parseFloat($('blockCompareValueB').value||'1');if(!payload.input){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен исходный сигнал':'Source signal is required';return}if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return}if(!Number.isFinite(payload.value_a)||!Number.isFinite(payload.value_b)){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужны оба порога или параметры зоны':'Both thresholds or band parameters are required';return}}try{const r=await getJson('/block-definition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});await loadAll();editBlock(payload.block_id);$('blockSaveStatus').textContent=r.message||t('blockSaved')}catch(e){$('blockSaveStatus').textContent='Save failed: '+e.message}}
async function deleteBlockDefinition(id){const blockId=id||$('blockId').value.trim();if(!blockId){$('blockSaveStatus').textContent=t('selectBlockFirst');return}await openCleanupReview(blockId)}

(function(){
const _origRenderBlocks=renderBlocks;
renderBlocks=function(){
  const filter=state.ui.blockFilter||'all';
  const search=(state.ui.blockSearch||'').trim().toLowerCase();
  const isRu=getUiLanguage()==='ru';
  const rows=Object.entries(state.blocks?.blocks||{}).filter(([id,block])=>{
    if(filter!=='all'&&block.type!==filter)return false;
    const haystack=(id+' '+(block.type||'')+' '+(block.mode||'')+' '+(block.input_a||'')+' '+(block.input_b||'')+' '+(block.input_c||'')+' '+(block.control||'')+' '+(block.output_a||'')+' '+(block.compare_signal||'')+' '+(block.compare_value??'')+' '+(block.compare_value_b??'')+' '+(block.value_a??'')+' '+(block.value_b??'')+' '+(block.value_c??'')+' '+(block.value_d??'')).toLowerCase();
    return !search||haystack.includes(search);
  }).map(([id,block])=>{
    const route=block.type==='selector'?((block.input_a||'-')+' / '+(block.input_b||'-')+' / '+(block.control||'-')):
      block.type==='button'?(block.input_a||'-'):
      block.type==='latch'?((block.mode==='set_reset'||block.mode==='set_only'?'set '+(block.input_a||'-'):'toggle '+(block.input_a||'-'))+(block.mode==='set_reset'||block.mode==='reset_only'?(' / reset '+(block.input_b||'-')):'')):
      block.type==='comparator'?((block.input_a||'-')+' '+(block.mode||'gt')+' '+(block.compare_signal||((block.mode==='between'||block.mode==='outside')?((block.compare_value??0)+'..'+(block.compare_value_b??0)):(block.compare_value??0)))):
      block.type==='scale_map'?((block.input_a||'-')+' ['+(block.mode||'scale')+']'):
      block.type==='logic_gate'?(block.mode==='not'?('NOT '+(block.input_a||'-')):((block.input_a||'-')+' '+String(block.mode||'and').toUpperCase()+' '+(block.input_b||'-'))):
      block.type==='edge_detect'?((block.input_a||'-')+' ['+(block.mode||'rising')+']'):
      block.type==='hysteresis'?((block.input_a||'-')+' ['+(block.mode||'high')+']'):
      block.type==='interlock'?(((block.input_a||'-')+' / '+(block.input_b||'-')+' / '+(block.input_c||'-'))):
      ((block.input_a||'-')+(block.input_b?(' / en '+block.input_b):''));
    const timerOff=(block.mode==='interval'||block.mode==='interval_while_enabled')?Math.max((block.period_ms||0)-(block.duration_ms||0),0):0;
    const timing=block.type==='timer'?((block.mode==='interval'||block.mode==='interval_while_enabled')?((isRu?'ВКЛ ':'ON ')+formatMsForTable(block.duration_ms||0)+' / '+(isRu?'ВЫКЛ ':'OFF ')+formatMsForTable(timerOff)):formatMsForTable(block.duration_ms||0)):
      block.type==='button'?('db '+formatMsForTable(block.debounce_ms||50)+' / long '+formatMsForTable(block.long_press_ms||800)+' / dbl '+formatMsForTable(block.double_press_ms||350)):
      block.type==='scale_map'?(block.mode==='map'?((block.value_a??0)+'..'+(block.value_b??0)+' -> '+(block.value_c??0)+'..'+(block.value_d??0)):block.mode==='clamp'?((isRu?'диапазон ':'range ')+(block.value_a??0)+'..'+(block.value_b??0)):((isRu?'k=':'k=')+(block.value_a??1)+' / '+(isRu?'b=':'b=')+(block.value_b??0))):
      block.type==='logic_gate'?(isRu?'логика':'logic'):
      block.type==='edge_detect'?(isRu?'импульс '+formatMsForTable(block.duration_ms||100):'pulse '+formatMsForTable(block.duration_ms||100)):
      block.type==='hysteresis'?(block.mode==='outside_band'||block.mode==='inside_band'?((isRu?'центр ':'center ')+(block.value_a??0)+' / '+(isRu?'полуширина ':'half-band ')+(block.value_b??0)):((isRu?'пороги ':'thresholds ')+(block.value_a??0)+'..'+(block.value_b??0))):
      block.type==='interlock'?(block.mode==='permissive'?(isRu?'request && permissive':'request && permissive'):block.mode==='inhibit'?(isRu?'request && !inhibit':'request && !inhibit'):(isRu?'request && permissive && !inhibit':'request && permissive && !inhibit')):
      '-';
    const modeLabel=getBlockModeOptions(block.type||'').find(opt=>opt.value===(block.mode||''))?.label||(block.mode||'-');
    const idCell=block.auto_generated?id+' <span class="caps">('+t('generated')+(block.generated_by?': '+block.generated_by:'')+')</span>':id;
    return '<tr><td>'+idCell+'</td><td>'+blockTypeLabel(block.type||'')+'</td><td>'+modeLabel+'</td><td>'+route+'</td><td>'+(block.output_a||'-')+'</td><td>'+timing+'</td><td><div class="row-actions"><button data-edit-block="'+id+'">Edit</button><button data-delete-block="'+id+'">Delete</button></div></td></tr>';
  }).join('');
  $('blocksTable').innerHTML=rows||'<tr><td colspan="7">No blocks available for this filter</td></tr>';
};

const _origResetBlockForm=resetBlockForm;
resetBlockForm=function(type='timer'){
  _origResetBlockForm(type==='interlock'?'logic_gate':type);
  ensureInterlockBlockUi?.();
  if(type==='interlock'){
    $('blockType').value='interlock';
    syncBlockModeOptions('interlock');
    if($('blockCompareInput'))$('blockCompareInput').value='';
    if($('blockCompareSignal'))$('blockCompareSignal').value='';
    if($('blockAuxInput'))$('blockAuxInput').value='';
    setBlockTypeVisibility();
    syncScenarioFromCurrentBlock();
    syncAutoBlockId(true);
  }
};

const _origEditBlock=editBlock;
editBlock=function(id){
  _origEditBlock(id);
  const block=state.blocks?.blocks?.[id];
  if(block?.type==='interlock'){
    ensureInterlockBlockUi?.();
    if($('blockAuxInput'))$('blockAuxInput').value=block.input_c||block.inhibit_signal||'';
    setBlockTypeVisibility();
    updateBlockAssistantPreview();
  }
};

const _origSaveBlockDefinition=saveBlockDefinition;
saveBlockDefinition=async function(){
  if(($('blockType')?.value||'')!=='interlock'){
    return _origSaveBlockDefinition();
  }
  $('blockSaveStatus').textContent=t('savingBlock');
  if(!state.ui.blockManualId&&!state.ui.blockEditingExisting)syncAutoBlockId(true);
  const payload={
    block_id:$('blockId').value.trim(),
    type:'interlock',
    mode:$('blockMode').value||'interlock',
    input:$('blockCompareInput').value||'',
    input_b:$('blockCompareSignal').value||'',
    input_c:$('blockAuxInput')?.value||'',
    output:$('blockOutput').value.trim()
  };
  if(!payload.block_id){$('blockSaveStatus').textContent=t('blockIdRequired');return;}
  if((payload.mode==='permissive'||payload.mode==='interlock')&&!payload.input_b){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен permissive signal':'Permissive signal is required';return;}
  if((payload.mode==='inhibit'||payload.mode==='interlock')&&!payload.input_c){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен inhibit/interlock signal':'Inhibit/interlock signal is required';return;}
  if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return;}
  try{
    const r=await getJson('/block-definition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    await loadAll();
    editBlock(payload.block_id);
    $('blockSaveStatus').textContent=r.message||t('blockSaved');
  }catch(e){
    $('blockSaveStatus').textContent='Save failed: '+e.message;
  }
};
})();

(function(){
const _origRenderBlocksModeAuthority=renderBlocks;
renderBlocks=function(){
  const filter=state.ui.blockFilter||'all';
  const search=(state.ui.blockSearch||'').trim().toLowerCase();
  const isRu=getUiLanguage()==='ru';
  const rows=Object.entries(state.blocks?.blocks||{}).filter(([id,block])=>{
    if(filter!=='all'&&block.type!==filter)return false;
    const haystack=(id+' '+(block.type||'')+' '+(block.mode||'')+' '+(block.input_a||'')+' '+(block.input_b||'')+' '+(block.input_c||'')+' '+(block.control||'')+' '+(block.output_a||'')+' '+(block.compare_signal||'')+' '+(block.compare_value??'')+' '+(block.compare_value_b??'')+' '+(block.value_a??'')+' '+(block.value_b??'')+' '+(block.value_c??'')+' '+(block.value_d??'')).toLowerCase();
    return !search||haystack.includes(search);
  }).map(([id,block])=>{
    const route=block.type==='selector'?((block.input_a||'-')+' / '+(block.input_b||'-')+' / '+(block.control||'-')):
      block.type==='button'?(block.input_a||'-'):
      block.type==='latch'?((block.mode==='set_reset'||block.mode==='set_only'?'set '+(block.input_a||'-'):'toggle '+(block.input_a||'-'))+(block.mode==='set_reset'||block.mode==='reset_only'?(' / reset '+(block.input_b||'-')):'')):
      block.type==='comparator'?((block.input_a||'-')+' '+(block.mode||'gt')+' '+(block.compare_signal||((block.mode==='between'||block.mode==='outside')?((block.compare_value??0)+'..'+(block.compare_value_b??0)):(block.compare_value??0)))):
      block.type==='scale_map'?((block.input_a||'-')+' ['+(block.mode||'scale')+']'):
      block.type==='logic_gate'?(block.mode==='not'?('NOT '+(block.input_a||'-')):((block.input_a||'-')+' '+String(block.mode||'and').toUpperCase()+' '+(block.input_b||'-'))):
      block.type==='edge_detect'?((block.input_a||'-')+' ['+(block.mode||'rising')+']'):
      block.type==='hysteresis'?((block.input_a||'-')+' ['+(block.mode||'high')+']'):
      block.type==='interlock'?(((block.input_a||'-')+' / '+(block.input_b||'-')+' / '+(block.input_c||'-'))):
      block.type==='mode_authority'?(((block.input_a||'-')+' / '+(block.input_b||'-')+' / '+(block.control||'-')+(block.input_c?(' / '+block.input_c):''))):
      block.type==='freshness'?((block.input_a||'-')+' ['+(block.mode||'fresh')+']'):
      ((block.input_a||'-')+(block.input_b?(' / en '+block.input_b):''));
    const timerOff=(block.mode==='interval'||block.mode==='interval_while_enabled')?Math.max((block.period_ms||0)-(block.duration_ms||0),0):0;
    const timing=block.type==='timer'?((block.mode==='interval'||block.mode==='interval_while_enabled')?((isRu?'ВКЛ ':'ON ')+formatMsForTable(block.duration_ms||0)+' / '+(isRu?'ВЫКЛ ':'OFF ')+formatMsForTable(timerOff)):formatMsForTable(block.duration_ms||0)):
      block.type==='button'?('db '+formatMsForTable(block.debounce_ms||50)+' / long '+formatMsForTable(block.long_press_ms||800)+' / dbl '+formatMsForTable(block.double_press_ms||350)):
      block.type==='scale_map'?(block.mode==='map'?((block.value_a??0)+'..'+(block.value_b??0)+' -> '+(block.value_c??0)+'..'+(block.value_d??0)):block.mode==='clamp'?((isRu?'диапазон ':'range ')+(block.value_a??0)+'..'+(block.value_b??0)):((isRu?'k=':'k=')+(block.value_a??1)+' / '+(isRu?'b=':'b=')+(block.value_b??0))):
      block.type==='logic_gate'?(isRu?'логика':'logic'):
      block.type==='edge_detect'?(isRu?'импульс '+formatMsForTable(block.duration_ms||100):'pulse '+formatMsForTable(block.duration_ms||100)):
      block.type==='hysteresis'?(block.mode==='outside_band'||block.mode==='inside_band'?((isRu?'центр ':'center ')+(block.value_a??0)+' / '+(isRu?'полуширина ':'half-band ')+(block.value_b??0)):((isRu?'пороги ':'thresholds ')+(block.value_a??0)+'..'+(block.value_b??0))):
      block.type==='interlock'?(block.mode==='permissive'?(isRu?'request && permissive':'request && permissive'):block.mode==='inhibit'?(isRu?'request && !inhibit':'request && !inhibit'):(isRu?'request && permissive && !inhibit':'request && permissive && !inhibit')):
      block.type==='mode_authority'?(block.mode==='auto_manual_service'?(isRu?'auto / manual / service':'auto / manual / service'):
        block.mode==='auto_manual'?(isRu?'auto / manual':'auto / manual'):
        block.mode==='local_remote_service'?(isRu?'local / remote / service':'local / remote / service'):
        (isRu?'local / remote':'local / remote')):
      block.type==='freshness'?((block.mode==='comm_loss'?(isRu?'потеря связи ':'comm loss '):block.mode==='stale'?(isRu?'устаревание ':'stale '):(isRu?'свежесть ':'fresh '))+formatMsForTable(block.duration_ms||5000)):
      '-';
    const modeLabel=getBlockModeOptions(block.type||'').find(opt=>opt.value===(block.mode||''))?.label||(block.mode||'-');
    const idCell=block.auto_generated?id+' <span class="caps">('+t('generated')+(block.generated_by?': '+block.generated_by:'')+')</span>':id;
    return '<tr><td>'+idCell+'</td><td>'+blockTypeLabel(block.type||'')+'</td><td>'+modeLabel+'</td><td>'+route+'</td><td>'+(block.output_a||'-')+'</td><td>'+timing+'</td><td><div class="row-actions"><button data-edit-block="'+id+'">Edit</button><button data-delete-block="'+id+'">Delete</button></div></td></tr>';
  }).join('');
  $('blocksTable').innerHTML=rows||'<tr><td colspan="7">No blocks available for this filter</td></tr>';
};

const _origResetBlockFormModeAuthority=resetBlockForm;
resetBlockForm=function(type='timer'){
  _origResetBlockFormModeAuthority(type==='mode_authority'?'selector':type);
  ensureModeAuthorityBlockUi?.();
  if(type==='mode_authority'){
    $('blockType').value='mode_authority';
    syncBlockModeOptions('local_remote');
    if($('blockPrimary'))$('blockPrimary').value='';
    if($('blockSecondary'))$('blockSecondary').value='';
    if($('blockSelect'))$('blockSelect').value='';
    if($('blockAuxInput'))$('blockAuxInput').value='';
    if($('blockOutput'))$('blockOutput').value='';
    if($('blockOutputPreset'))$('blockOutputPreset').value='';
    setBlockTypeVisibility();
    syncScenarioFromCurrentBlock();
    syncAutoBlockId(true);
  }
};

const _origEditBlockModeAuthority=editBlock;
editBlock=function(id){
  _origEditBlockModeAuthority(id);
  const block=state.blocks?.blocks?.[id];
  if(block?.type==='mode_authority'){
    ensureModeAuthorityBlockUi?.();
    if($('blockPrimary'))$('blockPrimary').value=block.input_a||block.primary||'';
    if($('blockSecondary'))$('blockSecondary').value=block.input_b||block.secondary||'';
    if($('blockSelect'))$('blockSelect').value=block.control||block.mode_select||'';
    if($('blockAuxInput'))$('blockAuxInput').value=block.input_c||block.service_signal||'';
    setBlockTypeVisibility();
    updateBlockAssistantPreview();
  }
};

const _origSaveBlockDefinitionModeAuthority=saveBlockDefinition;
saveBlockDefinition=async function(){
  if(($('blockType')?.value||'')!=='mode_authority'){
    return _origSaveBlockDefinitionModeAuthority();
  }
  $('blockSaveStatus').textContent=t('savingBlock');
  if(!state.ui.blockManualId&&!state.ui.blockEditingExisting)syncAutoBlockId(true);
  const mode=$('blockMode').value||'local_remote';
  const payload={
    block_id:$('blockId').value.trim(),
    type:'mode_authority',
    mode,
    primary:$('blockPrimary').value||'',
    secondary:$('blockSecondary').value||'',
    service_signal:$('blockAuxInput')?.value||'',
    mode_select:$('blockSelect').value||'',
    output:$('blockOutput').value.trim()
  };
  if(!payload.block_id){$('blockSaveStatus').textContent=t('blockIdRequired');return;}
  if(!payload.primary){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен primary signal':'Primary signal is required';return;}
  if(!payload.secondary){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен secondary signal':'Secondary signal is required';return;}
  if(!payload.mode_select){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен mode select signal':'Mode select signal is required';return;}
  if(mode.endsWith('_service')&&!payload.service_signal){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен service signal':'Service signal is required';return;}
  if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return;}
  try{
    const r=await getJson('/block-definition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    await loadAll();
    editBlock(payload.block_id);
    $('blockSaveStatus').textContent=r.message||t('blockSaved');
  }catch(e){
    $('blockSaveStatus').textContent='Save failed: '+e.message;
  }
};
})();

(function(){
const _origResetBlockFormFreshness=resetBlockForm;
resetBlockForm=function(type='timer'){
  _origResetBlockFormFreshness(type==='freshness'?'edge_detect':type);
  ensureFreshnessBlockUi?.();
  if(type==='freshness'){
    $('blockType').value='freshness';
    syncBlockModeOptions('fresh');
    if($('blockCompareInput'))$('blockCompareInput').value='';
    setTimerFieldMs('blockDuration',5000);
    if($('blockOutput'))$('blockOutput').value='';
    if($('blockOutputPreset'))$('blockOutputPreset').value='';
    setBlockTypeVisibility();
    syncScenarioFromCurrentBlock();
    syncAutoBlockId(true);
  }
};

const _origEditBlockFreshness=editBlock;
editBlock=function(id){
  _origEditBlockFreshness(id);
  const block=state.blocks?.blocks?.[id];
  if(block?.type==='freshness'){
    ensureFreshnessBlockUi?.();
    if($('blockCompareInput'))$('blockCompareInput').value=block.input_a||block.input||'';
    setTimerFieldMs('blockDuration',block.duration_ms||5000);
    setBlockTypeVisibility();
    updateBlockAssistantPreview();
  }
};

const _origSaveBlockDefinitionFreshness=saveBlockDefinition;
saveBlockDefinition=async function(){
  if(($('blockType')?.value||'')!=='freshness'){
    return _origSaveBlockDefinitionFreshness();
  }
  $('blockSaveStatus').textContent=t('savingBlock');
  if(!state.ui.blockManualId&&!state.ui.blockEditingExisting)syncAutoBlockId(true);
  const payload={
    block_id:$('blockId').value.trim(),
    type:'freshness',
    mode:$('blockMode').value||'fresh',
    input:$('blockCompareInput').value||'',
    duration_ms:getTimerFieldMs('blockDuration')||5000,
    output:$('blockOutput').value.trim()
  };
  if(!payload.block_id){$('blockSaveStatus').textContent=t('blockIdRequired');return;}
  if(!payload.input){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен контролируемый signal':'Monitored signal is required';return;}
  if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return;}
  try{
    const r=await getJson('/block-definition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    await loadAll();
    editBlock(payload.block_id);
    $('blockSaveStatus').textContent=r.message||t('blockSaved');
  }catch(e){
    $('blockSaveStatus').textContent='Save failed: '+e.message;
  }
};
})();

(function(){
function ensureSignalExtractorBlockUi(){
  const blockType=$('blockType');
  if(blockType && !blockType.querySelector('option[value="signal_extractor"]')){
    const option=document.createElement('option');
    option.value='signal_extractor';
    option.textContent='Signal extractor';
    blockType.appendChild(option);
  }
  const blockFilter=$('blockFilter');
  if(blockFilter && !blockFilter.querySelector('option[value="signal_extractor"]')){
    const option=document.createElement('option');
    option.value='signal_extractor';
    option.textContent='Signal extractor';
    blockFilter.appendChild(option);
  }
  if($('blockCompareSignalWrap') && !$('blockAuxInputWrap')){
    $('blockCompareSignalWrap').insertAdjacentHTML('afterend','<label id="blockAuxInputWrap" class="hidden"><span class="field-label">Третий вход</span><select id="blockAuxInput"></select></label>');
  }
}
window.ensureSignalExtractorBlockUi=ensureSignalExtractorBlockUi;
ensureSignalExtractorBlockUi();

const _origRenderBlockOptionsSignalExtractor=renderBlockOptions;
renderBlockOptions=function(){
  _origRenderBlockOptionsSignalExtractor();
  const signalEntries=Object.entries(state.signals?.signals||{});
  const signalOptions=signalEntries.map(([id,s])=>'<option value="'+id+'">'+id+' - '+(s.label||s.class||'signal')+'</option>').join('');
  if($('blockAuxInput'))$('blockAuxInput').innerHTML='<option value="">Select signal</option>'+signalOptions;
};

const _origBlockTypeLabelSignalExtractor=blockTypeLabel;
blockTypeLabel=function(type){
  if(type==='signal_extractor')return getUiLanguage()==='ru'?'Signal extractor / извлечение':'Signal extractor';
  return _origBlockTypeLabelSignalExtractor(type);
};

const _origGetBlockModeOptionsSignalExtractor=getBlockModeOptions;
getBlockModeOptions=function(type){
  const ru=getUiLanguage()==='ru';
  if(type==='signal_extractor'){
    return[
      {value:'digital_direct',label:ru?'Прямой цифровой сигнал':'Digital Direct'},
      {value:'analog_threshold',label:ru?'Аналог -> цифровой порог':'Analog Threshold'},
      {value:'analog_diff_pair',label:ru?'Разность A-B -> цифровой порог':'Analog Differential Pair'}
    ];
  }
  return _origGetBlockModeOptionsSignalExtractor(type);
};

const _origCurrentBlockBaseIdSignalExtractor=currentBlockBaseId;
currentBlockBaseId=function(){
  const type=$('blockType')?.value||'';
  if(type==='signal_extractor'){
    const input=slugifyIdPart($('blockCompareInput')?.value||'','source');
    return 'extract_'+input;
  }
  return _origCurrentBlockBaseIdSignalExtractor();
};

const _origBuildBlockHumanSummarySignalExtractor=buildBlockHumanSummary;
buildBlockHumanSummary=function(){
  const type=$('blockType')?.value||'';
  if(type==='signal_extractor'){
    const isRu=getUiLanguage()==='ru';
    const inputA=($('blockCompareInput')?.value||'').trim();
    const mode=$('blockMode')?.value||'digital_direct';
    if(inputA)return (isRu?'Извлечение ':'Extract ')+inputA+' ['+mode+']';
    return isRu?'Извлечение сигнала':'Signal extractor';
  }
  return _origBuildBlockHumanSummarySignalExtractor();
};

const _origResetBlockFormSignalExtractor=resetBlockForm;
resetBlockForm=function(type='timer'){
  _origResetBlockFormSignalExtractor(type==='signal_extractor'?'comparator':type);
  ensureSignalExtractorBlockUi?.();
  if(type!=='signal_extractor')return;
  $('blockType').value='signal_extractor';
  syncBlockModeOptions('digital_direct');
  $('blockCompareInput').value='';
  $('blockCompareSignal').value='';
  if($('blockAuxInput'))$('blockAuxInput').value='';
  $('blockCompareValue').value='0.8';
  $('blockCompareValueB').value='0.4';
  $('blockOutput').value='';
  $('blockOutputPreset').value='';
  setBlockTypeVisibility();
  syncScenarioFromCurrentBlock();
  syncAutoBlockId(true);
};

const _origEditBlockSignalExtractor=editBlock;
editBlock=function(id){
  _origEditBlockSignalExtractor(id);
  const block=state.blocks?.blocks?.[id];
  if(!block||block.type!=='signal_extractor')return;
  ensureSignalExtractorBlockUi?.();
  $('blockCompareInput').value=block.input_a||block.input||block.source_a||'';
  $('blockCompareSignal').value=block.input_b||block.source_b||'';
  if($('blockAuxInput'))$('blockAuxInput').value=block.input_c||block.quality_input||block.quality_source||'';
  $('blockCompareValue').value=String(block.threshold_on??block.value_a??block.compare_value??0.8);
  $('blockCompareValueB').value=String(block.threshold_off??block.value_b??block.compare_value_b??0.4);
  renderBlockOutputOptions();
  setBlockTypeVisibility();
  updateBlockAssistantPreview();
};

const _origUpdateBlockAssistantPreviewSignalExtractor=updateBlockAssistantPreview;
updateBlockAssistantPreview=function(){
  const type=$('blockType')?.value||'';
  if(type==='signal_extractor'){
    const isRu=getUiLanguage()==='ru';
    const mode=$('blockMode')?.value||'digital_direct';
    const inputA=$('blockCompareInput')?.value||'-';
    const inputB=$('blockCompareSignal')?.value||'-';
    const quality=$('blockAuxInput')?.value||'-';
    const thresholdOn=$('blockCompareValue')?.value||'0.8';
    const thresholdOff=$('blockCompareValueB')?.value||'0.4';
    const output=$('blockOutput')?.value.trim()||t('chooseOutput');
    const lines=[
      (isRu?'Режим':'Mode')+': '+mode,
      'A: '+inputA
    ];
    if(mode==='analog_diff_pair')lines.push('B: '+inputB);
    if(quality && quality!=='-')lines.push((isRu?'Quality':'Quality')+': '+quality);
    if(mode!=='digital_direct')lines.push((isRu?'Пороги':'Thresholds')+': ON '+thresholdOn+' / OFF '+thresholdOff);
    lines.push((isRu?'Выход состояния':'State output')+': '+output);
    lines.push((isRu?'Отладочное значение':'Debug value')+': '+output+'_value');
    $('blockAssistantPreview').innerHTML=lines.map(line=>'<div>'+line+'</div>').join('');
    return;
  }
  return _origUpdateBlockAssistantPreviewSignalExtractor();
};

const _origSetBlockTypeVisibilitySignalExtractor=setBlockTypeVisibility;
setBlockTypeVisibility=function(){
  _origSetBlockTypeVisibilitySignalExtractor();
  if(($('blockType')?.value||'')!=='signal_extractor')return;
  const mode=$('blockMode')?.value||'digital_direct';
  const show=id=>$(id)?.classList.remove('hidden');
  const hide=id=>$(id)?.classList.add('hidden');
  ['blockTriggerWrap','blockEnableWrap','blockPrimaryWrap','blockSecondaryWrap','blockSelectWrap','blockInputWrap','blockToggleInputWrap','blockSetInputWrap','blockResetInputWrap','blockOutputPresetWrap','blockDurationWrap','blockPeriodWrap','blockDebounceWrap','blockLongPressWrap','blockDoublePressWrap','blockCompareValueCWrap','blockCompareValueDWrap','blockRetriggerWrap','blockStartImmediatelyWrap','blockRetainWrap','blockResetPriorityWrap','blockAutoTriggerWrap','blockAutoToggleWrap','blockAutoSetWrap','blockAutoResetWrap'].forEach(hide);
  ['blockCompareInputWrap','blockOutputWrap'].forEach(show);
  if(mode==='analog_diff_pair')show('blockCompareSignalWrap');else hide('blockCompareSignalWrap');
  show('blockAuxInputWrap');
  if(mode==='digital_direct'){
    hide('blockCompareValueWrap');
    hide('blockCompareValueBWrap');
  }else{
    show('blockCompareValueWrap');
    show('blockCompareValueBWrap');
  }
  if($('blockCompareInputWrap'))$('blockCompareInputWrap').querySelector('.field-label').innerHTML=(getUiLanguage()==='ru'?'Источник A':'Source A');
  if($('blockCompareSignalWrap'))$('blockCompareSignalWrap').querySelector('.field-label').innerHTML=(getUiLanguage()==='ru'?'Источник B':'Source B');
  if($('blockAuxInputWrap'))$('blockAuxInputWrap').querySelector('.field-label').innerHTML=(getUiLanguage()==='ru'?'Quality signal':'Quality signal');
  if($('blockCompareValueWrap'))$('blockCompareValueWrap').querySelector('.field-label').innerHTML=(getUiLanguage()==='ru'?'Порог ON':'Threshold ON');
  if($('blockCompareValueBWrap'))$('blockCompareValueBWrap').querySelector('.field-label').innerHTML=(getUiLanguage()==='ru'?'Порог OFF':'Threshold OFF');
  if($('blockOutputWrap'))$('blockOutputWrap').querySelector('.field-label').innerHTML=(getUiLanguage()==='ru'?'Выход state signal':'State output signal');
  if($('blockTimingHint'))$('blockTimingHint').textContent=mode==='digital_direct'
    ?(getUiLanguage()==='ru'?'Блок публикует бинарное состояние напрямую из входа A и дополнительное debug-значение в signal с суффиксом _value.':'The block publishes a binary state directly from source A and also emits a debug analog signal with the _value suffix.')
    :(getUiLanguage()==='ru'?'Блок превращает аналоговый сигнал в устойчивое бинарное состояние по порогам ON/OFF и одновременно публикует рабочее значение в signal с суффиксом _value.':'The block turns an analog signal into a stable binary state using ON/OFF thresholds and also publishes the working value with the _value suffix.');
  if($('blockOutputNote'))$('blockOutputNote').textContent=getUiLanguage()==='ru'
    ?'Укажи базовый выходной signal ID. Блок создаст бинарный output и дополнительный debug signal с суффиксом _value.'
    :'Choose the base output signal ID. The block will publish the binary output and an extra debug signal with the _value suffix.';
  if($('blockEditorNote'))$('blockEditorNote').textContent=getUiLanguage()==='ru'
    ?'Signal extractor: единый входной слой для digital, analog threshold и diff pair. Это правильная точка для наладки why ON / why OFF перед counter, rate, totalizer и sequence.'
    :'Signal extractor: one input-conditioning layer for digital, analog threshold and differential pairs. Use it to debug why ON / why OFF before counters, rate blocks, totalizers and sequences.';
  refreshBlockSectionVisibility();
  updateBlockAssistantPreview();
};

const _origSaveBlockDefinitionSignalExtractor=saveBlockDefinition;
saveBlockDefinition=async function(){
  const type=$('blockType')?.value||'';
  if(type!=='signal_extractor')return _origSaveBlockDefinitionSignalExtractor();
  $('blockSaveStatus').textContent=t('savingBlock');
  if(!state.ui.blockManualId&&!state.ui.blockEditingExisting)syncAutoBlockId(true);
  const mode=$('blockMode').value||'digital_direct';
  const payload={
    block_id:$('blockId').value.trim(),
    type:'signal_extractor',
    mode,
    input:$('blockCompareInput').value,
    input_b:$('blockCompareSignal').value,
    quality_input:$('blockAuxInput')?.value||'',
    threshold_on:parseFloat($('blockCompareValue').value||'0.8'),
    threshold_off:parseFloat($('blockCompareValueB').value||'0.4'),
    output:$('blockOutput').value.trim()
  };
  if(!payload.block_id){$('blockSaveStatus').textContent=t('blockIdRequired');return;}
  if(!payload.input){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен источник A':'Source A is required';return;}
  if(mode==='analog_diff_pair'&&!payload.input_b){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен источник B для diff pair':'Source B is required for differential mode';return;}
  if(mode!=='digital_direct'){
    if(!Number.isFinite(payload.threshold_on)||!Number.isFinite(payload.threshold_off)){
      $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужны оба порога ON/OFF':'Both ON/OFF thresholds are required';
      return;
    }
  }
  if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return;}
  try{
    const r=await getJson('/block-definition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    await loadAll();
    editBlock(payload.block_id);
    $('blockSaveStatus').textContent=r.message||t('blockSaved');
  }catch(e){
    $('blockSaveStatus').textContent='Save failed: '+e.message;
  }
};

const _origRenderBlocksSignalExtractor=renderBlocks;
renderBlocks=function(){
  _origRenderBlocksSignalExtractor();
  if(!state.blocks?.blocks)return;
  const filter=state.ui.blockFilter||'all';
  const search=(state.ui.blockSearch||'').trim().toLowerCase();
  const rows=Object.entries(state.blocks.blocks).filter(([id,block])=>{
    if(filter!=='all'&&block.type!==filter)return false;
    const haystack=(id+' '+(block.type||'')+' '+(block.mode||'')+' '+(block.input_a||'')+' '+(block.input_b||'')+' '+(block.input_c||'')+' '+(block.output_a||'')).toLowerCase();
    return !search||haystack.includes(search);
  }).map(([id,block])=>{
    if(block.type!=='signal_extractor')return null;
    const modeLabel=getBlockModeOptions('signal_extractor').find(opt=>opt.value===(block.mode||''))?.label||(block.mode||'-');
    const route=(block.mode==='analog_diff_pair')
      ?((block.input_a||'-')+' - '+(block.input_b||'-')+(block.input_c?(' / q '+block.input_c):''))
      :((block.input_a||'-')+(block.input_c?(' / q '+block.input_c):''));
    return {id,html:'<tr data-signal-extractor-row="'+id+'"><td>'+(block.auto_generated?id+' <span class="caps">('+t('generated')+(block.generated_by?': '+block.generated_by:'')+')</span>':id)+'</td><td>'+blockTypeLabel(block.type||'')+'</td><td>'+modeLabel+'</td><td>'+route+'</td><td>'+(block.output_a||'-')+'</td><td>'+(block.mode==='digital_direct'?(getUiLanguage()==='ru'?'прямой state + _value':'direct state + _value'):(getUiLanguage()==='ru'?'ON '+(block.threshold_on??block.value_a??block.compare_value??'0.8')+' / OFF '+(block.threshold_off??block.value_b??block.compare_value_b??'0.4'):'ON '+(block.threshold_on??block.value_a??block.compare_value??'0.8')+' / OFF '+(block.threshold_off??block.value_b??block.compare_value_b??'0.4')))+'</td><td><div class="row-actions"><button data-edit-block="'+id+'">Edit</button><button data-delete-block="'+id+'">Delete</button></div></td></tr>'};
  }).filter(Boolean);
  if(!rows.length)return;
  const table=$('blocksTable');
  if(!table)return;
  rows.forEach(({id,html})=>{
    const existing=table.querySelector('[data-signal-extractor-row="'+id+'"]');
    if(existing)existing.outerHTML=html;
  });
};
})();

(function(){
const BLOCK_GROUPS=[
  {id:'all',label:'Все'},
  {id:'timing',label:'Таймеры и события'},
  {id:'logic',label:'Логика и условия'},
  {id:'selection',label:'Выбор и режимы'},
  {id:'signal',label:'Подготовка сигнала'},
  {id:'planned',label:'Скоро'}
];
const BLOCK_REGISTRY={
  timer:{group:'timing',title:'Таймер',summary:'Задержки, импульсы и интервалы.',when:'Когда нужен on-delay, off-delay, pulse или интервал.',outputs:'Дискретный сигнал времени.',status:'available',buttonId:'newTimerBlock',filter:'timer'},
  edge_detect:{group:'timing',title:'Edge / one-shot',summary:'Короткий импульс по фронту сигнала.',when:'Для переходов sequence, счётчиков и одноразовых действий.',outputs:'Короткий pulse.',status:'available',buttonId:'newEdgeDetectBlock',filter:'edge_detect'},
  button:{group:'timing',title:'Кнопка / события',summary:'Чистые short/long/double события из входа.',when:'Для кнопок, селекторов и панели оператора.',outputs:'События нажатия.',status:'available',buttonId:'newButtonBlock',filter:'button'},
  counter:{group:'timing',title:'Counter / счётчик',summary:'Считает фронты и события по входному сигналу.',when:'Для pulse count, RPM, шагов, дискретных событий и reset по отдельному входу.',outputs:'Текущее значение счётчика.',status:'available',buttonId:'newCounterBlock',filter:'counter'},
  comparator:{group:'logic',title:'Comparator / порог',summary:'Сравнение сигнала с уставкой или окном.',when:'Если нужно правило выше/ниже/между.',outputs:'Бинарный результат.',status:'available',buttonId:'newComparatorBlock',filter:'comparator'},
  logic_gate:{group:'logic',title:'Logic gate',summary:'Базовая булева логика AND / OR / NOT / XOR.',when:'Для простых логических комбинаций сигналов.',outputs:'Бинарный результат.',status:'available',buttonId:'newLogicGateBlock',filter:'logic_gate'},
  hysteresis:{group:'logic',title:'Hysteresis / deadband',summary:'Устойчивое бинарное решение на noisy analog.',when:'Для границ, где обычный порог дрожит.',outputs:'Бинарный результат с гистерезисом.',status:'available',buttonId:'newHysteresisBlock',filter:'hysteresis'},
  interlock:{group:'logic',title:'Interlock / permissive',summary:'Собирает request, permissive и inhibit.',when:'Для разрешений и запретов вокруг команды или перехода.',outputs:'Разрешённая команда.',status:'available',buttonId:'newInterlockBlock',filter:'interlock'},
  latch:{group:'selection',title:'Latch / память',summary:'Запоминает состояние по toggle или set/reset.',when:'Для памяти команды, режима или локального состояния.',outputs:'Запомненный бинарный state.',status:'available',buttonId:'newLatchBlock',filter:'latch'},
  selector:{group:'selection',title:'Selector / выбор',summary:'Выбирает один из двух источников.',when:'Для local/remote, auto/manual, primary/backup.',outputs:'Выбранный сигнал.',status:'available',buttonId:'newSelectorBlock',filter:'selector'},
  mode_authority:{group:'selection',title:'Mode / authority',summary:'Явный блок режимов и владения управлением.',when:'Для auto/manual/service, local/remote и takeover.',outputs:'Выбранный управляющий путь.',status:'available',buttonId:'newModeAuthorityBlock',filter:'mode_authority'},
  freshness:{group:'selection',title:'Freshness / heartbeat',summary:'Контроль свежести и потери связи.',when:'Для внешних устройств, bus-сигналов и heartbeats.',outputs:'Fresh / stale / comm-loss logic.',status:'available',buttonId:'newFreshnessBlock',filter:'freshness'},
  scale_map:{group:'signal',title:'Scale / map',summary:'Масштабирование, map и clamp аналогового сигнала.',when:'Для подготовки инженерного значения к логике.',outputs:'Нормализованный signal.',status:'available',buttonId:'newScaleMapBlock',filter:'scale_map'},
  signal_extractor:{group:'signal',title:'Signal extractor / извлечение',summary:'Один входной слой для digital, threshold и diff-пары.',when:'Для analog -> digital, pulse source, flow pickup, Fan RPM и live tuning.',outputs:'Бинарное состояние + debug value.',status:'available',buttonId:'newSignalExtractorBlock',filter:'signal_extractor'},
  pwm:{group:'planned',title:'PWM',summary:'ШИМ для fast/slow window drive.',when:'Для нагревателей, дозирования, соленоидов и analog-like on/off drive.',outputs:'PWM output.',status:'planned'},
  totalizer:{group:'signal',title:'Totalizer',summary:'Накопительный счётчик инженерной величины.',when:'Для объёма, массы, наработки и расхода.',outputs:'Running total.',status:'available',filter:'totalizer'},
  rate_estimator:{group:'signal',title:'Rate estimator',summary:'Оценка скорости по приращению счётчика или total.',when:'Для RPM, л/мин, частоты и мгновенного расхода.',outputs:'Engineering rate.',status:'available',filter:'rate_estimator'},
  window_aggregator:{group:'signal',title:'Window aggregator',summary:'Скользящее окно и bucket-агрегация.',when:'Для 15m/1h/24h average, rolling totals и service trends.',outputs:'Rolling average / window sum.',status:'available',filter:'window_aggregator'}
};
function ensureAllBlockTypeOptions(){
  const blockType=$('blockType');
  if(blockType){
    Object.entries(BLOCK_REGISTRY).forEach(([id,entry])=>{
      if(blockType.querySelector('option[value="'+id+'"]'))return;
      const option=document.createElement('option');
      option.value=id;
      option.textContent=entry.title;
      blockType.appendChild(option);
    });
  }
  const blockFilter=$('blockFilter');
  if(blockFilter){
    Object.entries(BLOCK_REGISTRY).forEach(([id,entry])=>{
      const value=entry.filter||id;
      if(blockFilter.querySelector('option[value="'+value+'"]'))return;
      const option=document.createElement('option');
      option.value=value;
      option.textContent=entry.title;
      blockFilter.appendChild(option);
    });
  }
}
window.ensureAllBlockTypeOptions=ensureAllBlockTypeOptions;
const BUTTON_TO_BLOCK=Object.fromEntries(Object.entries(BLOCK_REGISTRY).filter(([,entry])=>entry.buttonId).map(([id,entry])=>[entry.buttonId,id]));
function ensureBlockRegistryState(){
  if(!state.ui.blockRegistryGroup)state.ui.blockRegistryGroup='all';
  if(!state.ui.blockRegistryFocus)state.ui.blockRegistryFocus='timer';
}
function ensureBlockFilterOptions(){
  const select=$('blockFilter');
  if(!select)return;
    const defs=[
      {value:'signal_extractor',label:'Signal extractor'},
      {value:'totalizer',label:'Totalizer'},
      {value:'rate_estimator',label:'Rate estimator'},
      {value:'window_aggregator',label:'Window aggregator'}
    ];
  defs.forEach(def=>{
    if(select.querySelector('option[value="'+def.value+'"]'))return;
    const option=document.createElement('option');
    option.value=def.value;
    option.textContent=def.label;
    select.appendChild(option);
  });
}
function renderBlockRegistryUi(){
  ensureBlockRegistryState();
  ensureAllBlockTypeOptions();
  ensureBlockFilterOptions();
  const chips=$('blockSemanticChips');
  const help=$('blockRegistryHelp');
  const groups=document.querySelectorAll('#blockCatalog .block-catalog-group');
  if(chips){
    chips.innerHTML=BLOCK_GROUPS.map(group=>'<button class="registry-chip'+(state.ui.blockRegistryGroup===group.id?' active':'')+'" data-block-group="'+group.id+'">'+group.label+'</button>').join('');
  }
  groups.forEach(groupEl=>{
    const groupId=groupEl.dataset.blockCatalogGroup||'';
    const visible=state.ui.blockRegistryGroup==='all'||groupId===state.ui.blockRegistryGroup;
    groupEl.classList.toggle('hidden',!visible);
  });
  Object.entries(BUTTON_TO_BLOCK).forEach(([buttonId,blockId])=>{
    const btn=$(buttonId);
    if(btn)btn.classList.toggle('block-catalog-active',state.ui.blockRegistryFocus===blockId);
  });
  const selected=BLOCK_REGISTRY[state.ui.blockRegistryFocus]||BLOCK_REGISTRY.timer;
  if(help){
    help.innerHTML='<h3>'+escapeHtml(selected.title)+'</h3><div class="kv" style="margin-top:12px"><div><span>Что делает</span><strong>'+escapeHtml(selected.summary)+'</strong></div><div><span>Когда использовать</span><strong>'+escapeHtml(selected.when)+'</strong></div><div><span>Что выдаёт</span><strong>'+escapeHtml(selected.outputs)+'</strong></div><div><span>Статус</span><strong>'+(selected.status==='available'?'Доступен сейчас':'Запланирован в базовую библиотеку')+'</strong></div></div>';
  }
}
const _origRenderBlocksRegistryUi=renderBlocks;
renderBlocks=function(){
  _origRenderBlocksRegistryUi();
  renderBlockRegistryUi();
};
const root=$('tab-blocks');
if(root&&!root.dataset.blockRegistryBound){
  root.dataset.blockRegistryBound='1';
  root.addEventListener('click',event=>{
    const group=event.target?.closest?.('[data-block-group]')?.dataset?.blockGroup;
    const coming=event.target?.closest?.('[data-block-coming]')?.dataset?.blockComing;
    const id=event.target?.id;
    if(group){
      state.ui.blockRegistryGroup=group;
      renderBlockRegistryUi();
      return;
    }
    if(coming){
      state.ui.blockRegistryFocus=coming;
      renderBlockRegistryUi();
      const entry=BLOCK_REGISTRY[coming];
      if(entry?.status==='available'){
        resetBlockForm(coming);
        openModal('blockModal');
        return;
      }
      if($('blocksOverviewNote'))$('blocksOverviewNote').textContent='Блок "'+coming+'" уже входит в обязательную базу и будет добавлен следующим этапом как стандартный primitive.';
      return;
    }
    if(id&&BUTTON_TO_BLOCK[id]){
      state.ui.blockRegistryFocus=BUTTON_TO_BLOCK[id];
      renderBlockRegistryUi();
    }
  });
}
const _origResetBlockFormCounter=resetBlockForm;
resetBlockForm=function(type='timer'){
  _origResetBlockFormCounter(type);
  if(type!=='counter')return;
  $('blockType').value='counter';
  syncBlockModeOptions('rising');
  $('blockCompareValue').value='1';
  $('blockCompareValueB').value='0';
  $('blockResetInput').value='';
  renderBlockOutputOptions();
  setBlockTypeVisibility();
  syncScenarioFromCurrentBlock();
};
const _origEditBlockCounter=editBlock;
editBlock=function(id){
  _origEditBlockCounter(id);
  const block=state.blocks?.blocks?.[id];
  if(!block||block.type!=='counter')return;
  $('blockCompareInput').value=block.input_a||'';
  $('blockResetInput').value=block.reset_input||block.input_b||'';
  $('blockCompareValue').value=String(block.step??block.value_a??block.compare_value??1);
  $('blockCompareValueB').value=String(block.initial_value??block.value_b??block.compare_value_b??0);
  renderBlockOutputOptions();
  setBlockTypeVisibility();
};
const _origSaveBlockDefinitionCounter=saveBlockDefinition;
saveBlockDefinition=async function(){
  const type=$('blockType')?.value||'';
  if(type!=='counter')return _origSaveBlockDefinitionCounter();
  $('blockSaveStatus').textContent=t('savingBlock');
  if(!state.ui.blockManualId&&!state.ui.blockEditingExisting)syncAutoBlockId(true);
  const payload={
    block_id:$('blockId').value.trim(),
    type:'counter',
    mode:$('blockMode').value||'rising',
    input:$('blockCompareInput').value,
    reset_input:$('blockResetInput').value,
    compare_value:parseFloat($('blockCompareValue').value||'1'),
    compare_value_b:parseFloat($('blockCompareValueB').value||'0'),
    output:$('blockOutput').value.trim()
  };
  if(!payload.block_id){
    $('blockSaveStatus').textContent=t('blockIdRequired');
    return;
  }
  if(!payload.input){
    $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен сигнал счёта':'Count signal is required';
    return;
  }
  if(!payload.output){
    $('blockSaveStatus').textContent=t('outputRequired');
    return;
  }
  if(!Number.isFinite(payload.compare_value)){
    $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен шаг счёта':'Count step is required';
    return;
  }
  if(!Number.isFinite(payload.compare_value_b)){
    $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужно начальное значение':'Initial value is required';
    return;
  }
  try{
    const r=await getJson('/block-definition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    await loadAll();
    editBlock(payload.block_id);
    $('blockSaveStatus').textContent=r.message||t('blockSaved');
  }catch(e){
    $('blockSaveStatus').textContent='Save failed: '+e.message;
  }
};

const _origResetBlockFormFlowPrimitives=resetBlockForm;
resetBlockForm=function(type='timer'){
  _origResetBlockFormFlowPrimitives(type);
  if(type==='totalizer'){
    $('blockType').value='totalizer';
    syncBlockModeOptions('delta');
    $('blockCompareValue').value='1';
    $('blockCompareValueB').value='0';
    $('blockCompareValueC').value='1';
    $('blockCompareValueD').value='60000';
    $('blockResetInput').value='';
    $('blockRetain').checked=false;
    renderBlockOutputOptions();
    setBlockTypeVisibility();
    syncScenarioFromCurrentBlock();
    return;
  }
  if(type==='rate_estimator'){
    $('blockType').value='rate_estimator';
    syncBlockModeOptions('per_minute');
    setTimerFieldMs('blockDuration',1000);
    $('blockCompareValue').value='1';
    $('blockCompareValueB').value='1';
    renderBlockOutputOptions();
    setBlockTypeVisibility();
    syncScenarioFromCurrentBlock();
    return;
  }
  if(type==='window_aggregator'){
    $('blockType').value='window_aggregator';
    syncBlockModeOptions('average');
    setTimerFieldMs('blockDuration',3600000);
    setTimerFieldMs('blockPeriod',60000);
    $('blockCompareValue').value='1';
    renderBlockOutputOptions();
    setBlockTypeVisibility();
    syncScenarioFromCurrentBlock();
  }
};

const _origEditBlockFlowPrimitives=editBlock;
editBlock=function(id){
  _origEditBlockFlowPrimitives(id);
  const block=state.blocks?.blocks?.[id];
  if(!block)return;
  if(block.type==='totalizer'){
    $('blockCompareInput').value=block.input_a||'';
    $('blockResetInput').value=block.reset_input||block.input_b||'';
    $('blockCompareValue').value=String(block.scale??block.value_a??block.compare_value??1);
    $('blockCompareValueB').value=String(block.initial_value??block.value_b??block.compare_value_b??0);
    $('blockCompareValueC').value=String(block.save_every_delta??block.value_c??1);
    $('blockCompareValueD').value=String(block.save_every_ms??block.value_d??60000);
    $('blockRetain').checked=!!block.retain;
    renderBlockOutputOptions();
    setBlockTypeVisibility();
    return;
  }
  if(block.type==='rate_estimator'){
    $('blockCompareInput').value=block.input_a||'';
    $('blockCompareValue').value=String(block.scale??block.value_a??block.compare_value??1);
    $('blockCompareValueB').value=String(block.smoothing_alpha??block.value_b??block.compare_value_b??1);
    setTimerFieldMs('blockDuration',block.sample_ms||block.duration_ms||1000);
    renderBlockOutputOptions();
    setBlockTypeVisibility();
    return;
  }
  if(block.type==='window_aggregator'){
    $('blockCompareInput').value=block.input_a||'';
    $('blockCompareValue').value=String(block.scale??block.value_a??block.compare_value??1);
    setTimerFieldMs('blockDuration',block.window_ms||block.duration_ms||3600000);
    setTimerFieldMs('blockPeriod',block.bucket_ms||block.period_ms||60000);
    renderBlockOutputOptions();
    setBlockTypeVisibility();
  }
};

const _origSaveBlockDefinitionFlowPrimitives=saveBlockDefinition;
saveBlockDefinition=async function(){
  const type=$('blockType')?.value||'';
  if(type==='totalizer'){
    $('blockSaveStatus').textContent=t('savingBlock');
    if(!state.ui.blockManualId&&!state.ui.blockEditingExisting)syncAutoBlockId(true);
    const payload={
      block_id:$('blockId').value.trim(),
      type:'totalizer',
      mode:$('blockMode').value||'delta',
      input:$('blockCompareInput').value,
      reset_input:$('blockResetInput').value,
      compare_value:parseFloat($('blockCompareValue').value||'1'),
      compare_value_b:parseFloat($('blockCompareValueB').value||'0'),
      value_c:parseFloat($('blockCompareValueC').value||'1'),
      value_d:parseFloat($('blockCompareValueD').value||'60000'),
      retain:$('blockRetain').checked,
      output:$('blockOutput').value.trim()
    };
    if(!payload.block_id){$('blockSaveStatus').textContent=t('blockIdRequired');return;}
    if(!payload.input){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен входной сигнал totalizer':'Totalizer input is required';return;}
    if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return;}
    if(!Number.isFinite(payload.compare_value)){ $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен scale':'Scale is required'; return; }
    if(!Number.isFinite(payload.compare_value_b)){ $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужно начальное значение':'Initial value is required'; return; }
    if(!Number.isFinite(payload.value_c) || payload.value_c<=0){ $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен положительный save delta':'A positive save delta is required'; return; }
    if(!Number.isFinite(payload.value_d) || payload.value_d<=0){ $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен положительный save interval':'A positive save interval is required'; return; }
    try{
      const r=await getJson('/block-definition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      await loadAll();
      editBlock(payload.block_id);
      $('blockSaveStatus').textContent=r.message||t('blockSaved');
    }catch(e){
      $('blockSaveStatus').textContent='Save failed: '+e.message;
    }
    return;
  }
  if(type==='rate_estimator'){
    $('blockSaveStatus').textContent=t('savingBlock');
    if(!state.ui.blockManualId&&!state.ui.blockEditingExisting)syncAutoBlockId(true);
    const payload={
      block_id:$('blockId').value.trim(),
      type:'rate_estimator',
      mode:$('blockMode').value||'per_minute',
      input:$('blockCompareInput').value,
      duration_ms:getTimerFieldMs('blockDuration')||1000,
      compare_value:parseFloat($('blockCompareValue').value||'1'),
      compare_value_b:parseFloat($('blockCompareValueB').value||'1'),
      output:$('blockOutput').value.trim()
    };
    if(!payload.block_id){$('blockSaveStatus').textContent=t('blockIdRequired');return;}
    if(!payload.input){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен входной счётчик или total':'Rate source is required';return;}
    if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return;}
    if(!Number.isFinite(payload.compare_value)){ $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен scale':'Scale is required'; return; }
    if(!Number.isFinite(payload.compare_value_b)){ $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен alpha':'Smoothing alpha is required'; return; }
    try{
      const r=await getJson('/block-definition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      await loadAll();
      editBlock(payload.block_id);
      $('blockSaveStatus').textContent=r.message||t('blockSaved');
    }catch(e){
      $('blockSaveStatus').textContent='Save failed: '+e.message;
    }
    return;
  }
  if(type==='window_aggregator'){
    $('blockSaveStatus').textContent=t('savingBlock');
    if(!state.ui.blockManualId&&!state.ui.blockEditingExisting)syncAutoBlockId(true);
    const payload={
      block_id:$('blockId').value.trim(),
      type:'window_aggregator',
      mode:$('blockMode').value||'average',
      input:$('blockCompareInput').value,
      period_ms:getTimerFieldMs('blockPeriod')||60000,
      duration_ms:getTimerFieldMs('blockDuration')||3600000,
      compare_value:parseFloat($('blockCompareValue').value||'1'),
      output:$('blockOutput').value.trim()
    };
    if(!payload.block_id){$('blockSaveStatus').textContent=t('blockIdRequired');return;}
    if(!payload.input){$('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен входной сигнал окна':'Window source is required';return;}
    if(!payload.output){$('blockSaveStatus').textContent=t('outputRequired');return;}
    if(!Number.isFinite(payload.compare_value)){ $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Нужен scale':'Scale is required'; return; }
    if(payload.period_ms<=0||payload.duration_ms<=0||payload.period_ms>payload.duration_ms){ $('blockSaveStatus').textContent=getUiLanguage()==='ru'?'Bucket должен быть >0 и не больше окна':'Bucket must be >0 and not exceed the window'; return; }
    try{
      const r=await getJson('/block-definition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      await loadAll();
      editBlock(payload.block_id);
      $('blockSaveStatus').textContent=r.message||t('blockSaved');
    }catch(e){
      $('blockSaveStatus').textContent='Save failed: '+e.message;
    }
    return;
  }
  return _origSaveBlockDefinitionFlowPrimitives();
};
})();
