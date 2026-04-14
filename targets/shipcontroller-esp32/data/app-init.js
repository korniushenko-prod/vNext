(() => {
  const on = (id, event, handler) => {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
    return el;
  };

  document.querySelectorAll(".primary-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      setPrimaryTabValue(button.dataset.primaryTab || "overview");
      applyUiMode();
    });
  });

  document.querySelectorAll(".tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("hidden")) return;
      document.querySelectorAll(".tabs button").forEach((node) => node.classList.toggle("active", node === button));
      state.ui.activeTab = button.dataset.tab || "overview";
      applyUiMode();
    });
  });

  on("secondaryTabSelect", "change", () => {
    const tab = $("secondaryTabSelect")?.value || "";
    if (!tab) return;
    document.querySelector(`.tabs button[data-tab="${tab}"]:not(.hidden)`)?.click();
  });

  on("uiLanguage", "change", (event) => setUiLanguage(event.target.value));
  on("uiLangRu", "click", () => setUiLanguage("ru"));
  on("uiLangEn", "click", () => setUiLanguage("en"));
  on("uiMode", "change", (event) => setUiMode(event.target.value));
  on("quickGoNetworkCard", "click", () => {
    setPrimaryTabValue("hardware");
    applyUiMode();
    document.querySelector('.tabs button[data-tab="network"]:not(.hidden)')?.click();
  });

  on("signalUnitsPreset", "change", () => {
    const isCustom = $("signalUnitsPreset")?.value === "__custom__";
    $("signalUnitsCustomWrap")?.classList.toggle("hidden", !isCustom);
    if (!isCustom && $("signalUnitsCustom")) $("signalUnitsCustom").value = "";
  });

  on("refreshAll", "click", loadAll);
  on("detectChipNow", "click", async () => {
    state.chip = await getJson("/chip");
    renderSummary();
  });
  on("refreshHardware", "click", async () => {
    state.hardware = await getJson("/hardware");
    renderHardware();
  });
  on("refreshChannels", "click", async () => {
    state.channels = await getJson("/channels");
    renderChannels();
    renderChannelOptions();
    renderChannelConditioningSummary();
    renderChannelCalibrationAssistant();
    renderChannelPreview();
  });
  on("refreshSignals", "click", async () => {
    state.signals = await getJson("/signals");
    renderSignals();
    renderSignalOptions();
  });
  on("refreshStatus", "click", async () => {
    state.status = await getJson("/status");
    renderChannels();
    renderChannelConditioningSummary();
    renderChannelCalibrationAssistant();
    renderChannelPreview();
  });
  on("refreshDiagnostics", "click", async () => {
    state.diagnostics = await getJson("/diagnostics");
    renderDiagnostics();
  });
  on("refreshInspector", "click", () => refreshInspector().catch((error) => {
    if ($("inspectorStatus")) $("inspectorStatus").textContent = `Inspector error: ${error.message}`;
  }));
  on("inspectorAuto", "change", updateInspectorTimer);
  on("inspectorInterval", "change", updateInspectorTimer);

  on("reloadSettings", "click", loadAll);
  on("saveSettings", "click", saveSettings);
  on("wifiMode", "change", updateNetworkVisibility);
  on("wifiStartupPolicy", "change", updateNetworkVisibility);
  on("wifiShowPasswords", "change", updatePasswordVisibility);

  on("saveTemplateSelection", "click", saveTemplateSelection);
  on("activeBoardTemplate", "change", () => {
    if ($("derivedChipTemplate")) $("derivedChipTemplate").value = selectedBoardTemplateChipId() || "-";
  });
  on("chipTemplateSelect", "change", () => loadSelectedTemplateIntoEditor("chip"));
  on("boardTemplateSelect", "change", () => loadSelectedTemplateIntoEditor("board"));
  on("loadChipTemplate", "click", () => loadSelectedTemplateIntoEditor("chip"));
  on("loadBoardTemplate", "click", () => loadSelectedTemplateIntoEditor("board"));
  on("newChipTemplate", "click", newChipTemplate);
  on("newBoardTemplate", "click", newBoardTemplate);
  on("seedChipTemplate", "click", seedChipTemplate);
  on("addChipPin", "click", addChipPin);
  on("addBoardRule", "click", addBoardRule);
  on("deleteChipTemplate", "click", () => deleteTemplate("chip"));
  on("deleteBoardTemplate", "click", () => deleteTemplate("board"));
  on("saveChipTemplate", "click", () => saveTemplate("chip", false));
  on("saveApplyChipTemplate", "click", () => saveTemplate("chip", true));
  on("saveBoardTemplate", "click", () => saveTemplate("board", false));
  on("saveApplyBoardTemplate", "click", () => saveTemplate("board", true));
  on("syncChipFromVisual", "click", syncChipVisualToJson);
  on("syncBoardFromVisual", "click", syncBoardVisualToJson);
  on("chipTemplateLabel", "input", syncChipVisualToJson);
  on("boardTemplateLabel", "input", syncBoardVisualToJson);
  on("boardTemplateChipTemplate", "change", syncBoardVisualToJson);

  document.querySelectorAll(".template-tabs button").forEach((button) => {
    button.addEventListener("click", () => setTemplateTab(button.dataset.templateTab || "chip"));
  });

  on("chipPinsTable", "change", (event) => {
    const row = event.target?.closest?.("[data-chip-gpio]");
    const field = event.target?.dataset?.chipField;
    if (!row || !field) return;
    updateChipPinField(row.dataset.chipGpio, field, event.target.type === "checkbox" ? event.target.checked : event.target.value);
  });
  on("chipPinsTable", "click", (event) => {
    const removeGpio = event.target?.dataset?.removeChipPin;
    if (removeGpio) removeChipPin(removeGpio);
  });
  on("boardRulesTable", "change", (event) => {
    const row = event.target?.closest?.("[data-board-rule]");
    const field = event.target?.dataset?.boardField;
    if (!row || field === undefined) return;
    updateBoardRuleField(parseInt(row.dataset.boardRule, 10), field, event.target.type === "checkbox" ? event.target.checked : event.target.value);
  });
  on("boardRulesTable", "click", (event) => {
    const removeIndex = event.target?.dataset?.removeBoardRule;
    if (removeIndex !== undefined) removeBoardRule(parseInt(removeIndex, 10));
  });

  on("saveChannel", "click", saveChannel);
  on("resetChannelForm", "click", resetChannelForm);
  on("channelType", "change", updateChannelTypeVisibility);
  on("channelSourceMode", "change", () => {
    updateChannelSourceVisibility();
    updateChannelTypeVisibility();
  });
  ["channelId", "channelUnits", "channelRawMin", "channelRawMax", "channelEngMin", "channelEngMax", "channelOffset", "channelScale", "channelClampMin", "channelClampMax", "channelStartupValue"].forEach((id) => {
    on(id, "input", () => {
      renderChannelConditioningSummary();
      renderChannelCalibrationAssistant();
      renderChannelPreview();
    });
  });
  ["channelProfile", "channelFilter", "channelClampEnabled", "channelGpio", "channelExternalResource"].forEach((id) => {
    on(id, "change", () => {
      if (id === "channelProfile") updateChannelProfileNote();
      renderChannelConditioningSummary();
      renderChannelCalibrationAssistant();
      renderChannelPreview();
    });
  });
  on("channelFilterAlpha", "input", () => {
    renderChannelConditioningSummary();
    renderChannelCalibrationAssistant();
    renderChannelPreview();
  });
  on("channelUseLiveWindow", "click", applyLiveWindowToChannel);
  on("channelResetAnalogMath", "click", resetChannelAnalogMath);
  on("channelEditExternalResource", "click", openCurrentChannelExternalResource);
  on("channelShowOnDisplay", "click", showCurrentChannelOnDisplay);
  on("channelCalLowEng", "input", renderChannelCalibrationAssistant);
  on("channelCalHighEng", "input", renderChannelCalibrationAssistant);
  on("channelCaptureLow", "click", () => captureChannelCalibrationPoint("low"));
  on("channelCaptureHigh", "click", () => captureChannelCalibrationPoint("high"));
  on("channelApplyCalibration", "click", applyChannelCalibrationPoints);
  on("channelCheckCalibration", "click", checkChannelCalibrationResult);
  on("channelRollbackCalibration", "click", rollbackChannelCalibration);

  on("newSignal", "click", () => {
    resetSignalForm();
    openModal("signalModal");
  });
  on("saveSignal", "click", saveSignalDefinition);
  on("resetSignalForm", "click", resetSignalForm);
  on("deleteSignal", "click", () => deleteSignalDefinition());
  on("closeSignalModal", "click", () => closeModal("signalModal"));
  on("signalModal", "click", (event) => {
    if (event.target === event.currentTarget) closeModal("signalModal");
  });
  on("signalFilter", "change", (event) => setSignalFilter(event.target.value));
  on("signalSearch", "input", (event) => setSignalSearch(event.target.value));

  on("channelsTable", "click", (event) => {
    const editId = event.target?.dataset?.editChannel;
    const deleteId = event.target?.dataset?.deleteChannel;
    if (editId) editChannel(editId);
    if (deleteId) deleteChannel(deleteId);
  });
  on("signalsTable", "click", (event) => {
    const viewId = event.target?.dataset?.viewSignal;
    const editId = event.target?.dataset?.editSignal;
    const deleteId = event.target?.dataset?.deleteSignal;
    if (viewId) editSignal(viewId);
    if (editId) editSignal(editId);
    if (deleteId) deleteSignalDefinition(deleteId);
  });

  document.addEventListener("click", (event) => {
    const helpNode = event.target?.closest?.("[data-help]");
    if (helpNode?.dataset?.help) {
      event.preventDefault();
      event.stopPropagation();
      openHelpPopover(helpNode.dataset.help);
      return;
    }
    const helpActionNode = event.target?.closest?.("[data-help-action]");
    if (helpActionNode?.dataset?.helpAction) {
      event.preventDefault();
      runHelpAction(helpActionNode.dataset.helpAction);
    }
  });

  on("closeHelpPopover", "click", () => closeModal("helpPopover"));
  on("helpPopoverOk", "click", () => closeModal("helpPopover"));
  on("helpPopover", "click", (event) => {
    if (event.target === event.currentTarget) closeModal("helpPopover");
  });

  populateUnitPresets();
  applyHelpLanguage();
  resetSignalForm();
  resetChannelForm();
  updateNetworkVisibility();
  updatePasswordVisibility();
  setTimeout(() => bootstrapUi(), 0);
})();
