"use strict";

(() => {
  const DISABLED_TABS = new Set([
    "editor",
    "modules"
  ]);

  const UNIT_PRESETS = [
    { value: "", label: "No units" },
    { value: "%", label: "%" },
    { value: "C", label: "C" },
    { value: "bar", label: "bar" },
    { value: "rpm", label: "rpm" },
    { value: "ms", label: "ms" },
    { value: "s", label: "s" },
    { value: "L/min", label: "L/min" },
    { value: "m3/h", label: "m3/h" },
    { value: "__custom__", label: "Custom..." }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function boolBadge(value) {
    const active = Boolean(value);
    return `<span class="status-pill ${active ? "ok" : "pending"}">${active ? "yes" : "no"}</span>`;
  }

  function formatMsForTable(value) {
    const ms = Number(value || 0);
    if (!Number.isFinite(ms)) return "-";
    if (ms >= 3600000) return `${(ms / 3600000).toFixed(ms % 3600000 ? 1 : 0)} h`;
    if (ms >= 60000) return `${(ms / 60000).toFixed(ms % 60000 ? 1 : 0)} min`;
    if (ms >= 1000) return `${(ms / 1000).toFixed(ms % 1000 ? 1 : 0)} s`;
    return `${ms} ms`;
  }

  async function getJson(url, options = undefined) {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`${url} -> ${response.status}`);
    }
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`${url} returned non-JSON payload`);
    }
  }

  async function safeGetJson(url, fallback, errors) {
    try {
      return await getJson(url);
    } catch (error) {
      if (Array.isArray(errors)) errors.push(`${url}: ${error.message}`);
      return fallback;
    }
  }

  function openModal(id) {
    const node = $(id);
    if (node) node.classList.remove("hidden");
  }

  function closeModal(id) {
    const node = $(id);
    if (node) node.classList.add("hidden");
  }

  function setSaveStatus(text) {
    if ($("saveStatus")) $("saveStatus").textContent = text;
  }

  const state = {
    runtime: null,
    boards: { active: "", list: {} },
    hardware: { pins: [] },
    channels: { channels: {} },
    signals: { signals: {} },
    status: { channels: {} },
    diagnostics: { channels: {} },
    inspector: { channels: {} },
    chip: { model: "-", revision: "-" },
    templates: { chip_templates: {}, board_templates: {} },
    ui: {
      uiLanguage: "ru",
      uiMode: "commissioning",
      primaryTab: "overview",
      activeTab: "overview",
      signalFilter: "all",
      signalSearch: "",
      displaySelectedScreen: "",
      inspectorTimer: null
    }
  };

  function getUiLanguage() {
    return state.ui.uiLanguage || $("uiLanguage")?.value || "ru";
  }

  function getUiMode() {
    return state.ui.uiMode || $("uiMode")?.value || "commissioning";
  }

  function getI18nValue(lang, key, fallback = "") {
    return window.SHIP_I18N?.[lang]?.[key] ?? window.SHIP_I18N?.ru?.[key] ?? fallback;
  }

  function t(key) {
    const lang = getUiLanguage();
    return window.SHIP_UI_TEXT?.[lang]?.[key] ?? window.SHIP_UI_TEXT?.ru?.[key] ?? key;
  }

  function setUiLanguage(lang) {
    const next = lang === "en" ? "en" : "ru";
    state.ui.uiLanguage = next;
    if ($("uiLanguage")) $("uiLanguage").value = next;
    if ($("uiLangRu")) $("uiLangRu").classList.toggle("active", next === "ru");
    if ($("uiLangEn")) $("uiLangEn").classList.toggle("active", next === "en");
    if ($("uiLanguageLabel")) $("uiLanguageLabel").textContent = getI18nValue(next, "languageLabel", "Language");
    if ($("uiModeLabel")) $("uiModeLabel").textContent = getI18nValue(next, "modeLabel", "Mode");
    applyHelpLanguage();
  }

  function setUiMode(mode) {
    const next = ["operator", "commissioning", "advanced"].includes(mode) ? mode : "commissioning";
    state.ui.uiMode = next;
    if ($("uiMode")) $("uiMode").value = next;
    applyUiMode();
  }

  function setPrimaryTabValue(primaryTab) {
    state.ui.primaryTab = primaryTab || "overview";
    document.querySelectorAll(".primary-tabs button").forEach((button) => {
      button.classList.toggle("active", button.dataset.primaryTab === state.ui.primaryTab);
    });
  }

  function setActiveTab(tabId) {
    const nextTab = tabId || "overview";
    state.ui.activeTab = nextTab;
    document.querySelectorAll(".tabs button").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === nextTab);
    });
    document.querySelectorAll("[id^='tab-']").forEach((panel) => {
      panel.classList.toggle("hidden", panel.id !== `tab-${nextTab}`);
    });
  }

  function updateModeNote() {
    const note = $("uiModeNote");
    if (!note) return;
    if (state.ui.uiMode === "operator") {
      note.innerHTML = "<div><b>Operator mode</b><span>Only the essential runtime surfaces stay visible.</span></div>";
    } else if (state.ui.uiMode === "advanced") {
      note.innerHTML = "<div><b>Расширенный режим</b><span>Открыты детальные runtime-таблицы и сервисные данные.</span></div>";
    } else {
      note.innerHTML = "<div><b>Commissioning mode</b><span>Bench-critical I/O, signals and diagnostics are available.</span></div>";
    }
  }

  function syncSecondaryNav(visibleButtons) {
    const select = $("secondaryTabSelect");
    if (!select) return;
    select.innerHTML = visibleButtons
      .map((button) => `<option value="${button.dataset.tab}">${escapeHtml(button.textContent || button.dataset.tab)}</option>`)
      .join("");
    if (visibleButtons.some((button) => button.dataset.tab === state.ui.activeTab)) {
      select.value = state.ui.activeTab;
    } else if (visibleButtons[0]) {
      select.value = visibleButtons[0].dataset.tab;
    }
    select.disabled = visibleButtons.length === 0;
  }

  function applyUiMode() {
    const mode = state.ui.uiMode || "commissioning";
    const primary = state.ui.primaryTab || "overview";
    updateModeNote();

    document.querySelectorAll(".tab-group").forEach((group) => {
      group.classList.toggle("hidden", group.dataset.primaryGroup !== primary);
    });

    const visibleButtons = [];
    document.querySelectorAll(".tabs button").forEach((button) => {
      const isPrimaryMatch = button.closest(".tab-group")?.dataset.primaryGroup === primary;
      const modes = (button.dataset.modes || "operator,commissioning,advanced").split(",");
      const isModeMatch = modes.includes(mode);
      const isDisabled = DISABLED_TABS.has(button.dataset.tab || "");
      const hidden = !isPrimaryMatch || !isModeMatch || isDisabled;
      button.classList.toggle("hidden", hidden);
      if (!hidden) visibleButtons.push(button);
    });

    const activeVisible = visibleButtons.find((button) => button.dataset.tab === state.ui.activeTab) || visibleButtons[0];
    if (activeVisible) {
      setActiveTab(activeVisible.dataset.tab);
    } else {
      setActiveTab("overview");
    }
    syncSecondaryNav(visibleButtons);
  }

  function populateUnitPresets() {
    const select = $("signalUnitsPreset");
    if (!select) return;
    select.innerHTML = UNIT_PRESETS.map((preset) => `<option value="${preset.value}">${escapeHtml(preset.label)}</option>`).join("");
    if (!select.value) select.value = "";
  }

  function setSignalUnits(units) {
    const preset = $("signalUnitsPreset");
    const customWrap = $("signalUnitsCustomWrap");
    const customInput = $("signalUnitsCustom");
    const value = String(units || "");
    if (!preset || !customWrap || !customInput) return;
    const known = UNIT_PRESETS.some((entry) => entry.value === value);
    if (known) {
      preset.value = value;
      customInput.value = "";
      customWrap.classList.add("hidden");
    } else if (value) {
      preset.value = "__custom__";
      customInput.value = value;
      customWrap.classList.remove("hidden");
    } else {
      preset.value = "";
      customInput.value = "";
      customWrap.classList.add("hidden");
    }
  }

  function getSignalUnits() {
    const presetValue = $("signalUnitsPreset")?.value || "";
    if (presetValue === "__custom__") {
      return $("signalUnitsCustom")?.value?.trim?.() || "";
    }
    return presetValue;
  }

  function updateSignalUnitsVisibility() {
    const preset = $("signalUnitsPreset");
    const customWrap = $("signalUnitsCustomWrap");
    const customInput = $("signalUnitsCustom");
    if (!preset || !customWrap || !customInput) return;
    const customMode = preset.value === "__custom__";
    customWrap.classList.toggle("hidden", !customMode);
    if (!customMode) {
      customInput.value = "";
    }
  }

  function applyHelpLanguage() {
    const lang = getUiLanguage();
    if ($("signalsOverviewNote")) $("signalsOverviewNote").textContent = getI18nValue(lang, "signalsOverview", "");
    if ($("helpSignalsSummary")) $("helpSignalsSummary").textContent = getI18nValue(lang, "signalsSummary", "? Signals help");
    if ($("helpSignalsBody")) $("helpSignalsBody").innerHTML = getI18nValue(lang, "signalsBody", "");
    if ($("helpSelectorSummary")) $("helpSelectorSummary").textContent = getI18nValue(lang, "selectorSummary", "? Selector help");
    if ($("helpSelectorBody")) $("helpSelectorBody").innerHTML = getI18nValue(lang, "selectorBody", "");
    if ($("signalUnitsCustomWrap")) $("signalUnitsCustomWrap").classList.toggle("hidden", $("signalUnitsPreset")?.value !== "__custom__");
  }

  function openHelpPopover(key) {
    const lang = getUiLanguage();
    const entry = window.SHIP_HELP?.[lang]?.[key] ?? window.SHIP_HELP?.ru?.[key];
    if (!entry) return;
    if ($("helpPopoverTitle")) $("helpPopoverTitle").textContent = entry.title || "Help";
    if ($("helpPopoverSummary")) $("helpPopoverSummary").textContent = entry.summary || "";
    if ($("helpPopoverBody")) {
      const body = []
        .concat((entry.body || []).map((paragraph) => `<p>${paragraph}</p>`))
        .concat(entry.warning ? [`<div class="warning-box">${entry.warning}</div>`] : []);
      $("helpPopoverBody").innerHTML = body.join("");
    }
    if ($("helpPopoverLinks")) {
      $("helpPopoverLinks").innerHTML = (entry.links || [])
        .map((link) => `<button type="button" class="ghost" data-help-action="${escapeHtml(link.action || "")}">${escapeHtml(link.label || "")}</button>`)
        .join("");
    }
    openModal("helpPopover");
  }

  function runHelpAction(action) {
    if (!action) return;
    if (action.startsWith("switch:")) {
      const tabId = action.slice("switch:".length);
      const target = document.querySelector(`.tabs button[data-tab="${tabId}"]:not(.hidden)`);
      if (target) target.click();
      closeModal("helpPopover");
    }
  }

  window.$ = $;
  window.state = state;
  window.escapeHtml = escapeHtml;
  window.boolBadge = boolBadge;
  window.formatMsForTable = formatMsForTable;
  window.getJson = getJson;
  window.safeGetJson = safeGetJson;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.setSaveStatus = setSaveStatus;
  window.getUiLanguage = getUiLanguage;
  window.getUiMode = getUiMode;
  window.t = t;
  window.setUiLanguage = setUiLanguage;
  window.setUiMode = setUiMode;
  window.setPrimaryTabValue = setPrimaryTabValue;
  window.setActiveTab = setActiveTab;
  window.applyUiMode = applyUiMode;
  window.populateUnitPresets = populateUnitPresets;
  window.setSignalUnits = setSignalUnits;
  window.getSignalUnits = getSignalUnits;
  window.updateSignalUnitsVisibility = updateSignalUnitsVisibility;
  window.applyHelpLanguage = applyHelpLanguage;
  window.openHelpPopover = openHelpPopover;
  window.runHelpAction = runHelpAction;

  document.addEventListener("DOMContentLoaded", () => {
    populateUnitPresets();
    setUiLanguage($("uiLanguage")?.value || "ru");
    setPrimaryTabValue(document.querySelector(".primary-tabs button.active")?.dataset.primaryTab || "overview");
    setActiveTab(document.querySelector(".tabs button.active")?.dataset.tab || "overview");
    applyUiMode();
    setSaveStatus("UI shell ready");
  }, { once: true });
})();
