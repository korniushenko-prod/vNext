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
    if (typeof renderAlarmSignalOptions === "function") renderAlarmSignalOptions();
    if (typeof renderBlockOptions === "function") renderBlockOptions();
    if (typeof renderDisplaySignalOptions === "function") renderDisplaySignalOptions();
    renderChannelConditioningSummary();
    renderChannelCalibrationAssistant();
    renderChannelPreview();
  });
  on("refreshBlocks", "click", async () => {
    state.blocks = await getJson("/blocks");
    if (typeof renderBlocks === "function") renderBlocks();
  });
  on("refreshDisplay", "click", async () => {
    state.display = await getJson("/display");
    if (typeof renderDisplay === "function") renderDisplay();
  });
  on("refreshAlarms", "click", async () => {
    state.alarms = await getJson("/alarms");
    if (typeof renderAlarms === "function") renderAlarms();
  });
  on("refreshSequences", "click", async () => {
    state.sequences = await getJson("/sequences");
    if (typeof renderSequences === "function") renderSequences();
  });
  on("refreshComms", "click", async () => {
    state.buses = await getJson("/buses");
    state.devices = await getJson("/devices");
    state.externalResources = await getJson("/external-resources");
    if (typeof renderComms === "function") renderComms();
    renderChannelOptions();
    renderChannelConditioningSummary();
    renderChannelPreview();
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

  on("newBus", "click", () => {
    if (typeof resetBusForm === "function") resetBusForm();
  });
  on("saveBus", "click", () => {
    if (typeof saveBus === "function") saveBus();
  });
  on("deleteBus", "click", () => {
    if (typeof deleteBus === "function") deleteBus();
  });
  on("busType", "change", () => {
    if (typeof renderBusTypeVisibility === "function") renderBusTypeVisibility();
  });
  on("newDevice", "click", () => {
    if (typeof resetDeviceForm === "function") resetDeviceForm();
  });
  on("saveDevice", "click", () => {
    if (typeof saveDevice === "function") saveDevice();
  });
  on("deviceApplyDriverPreset", "click", () => {
    if (typeof applyDeviceDriverPreset === "function") applyDeviceDriverPreset();
  });
  on("deviceNewExternalResource", "click", () => {
    if (typeof prefillExternalResourceFromCurrentDevice === "function") prefillExternalResourceFromCurrentDevice();
  });
  on("seedDeviceResources", "click", () => {
    if (typeof seedDeviceResources === "function") seedDeviceResources();
  });
  on("deleteDevice", "click", () => {
    if (typeof deleteDevice === "function") deleteDevice();
  });
  on("deviceResourceModeActions", "click", (event) => {
    const modeId = event.target?.dataset?.deviceResourceMode;
    if (modeId && typeof prefillExternalResourceFromCurrentDeviceMode === "function") {
      prefillExternalResourceFromCurrentDeviceMode(modeId);
    }
  });
  on("newExternalResource", "click", () => {
    if (typeof resetExternalResourceForm === "function") resetExternalResourceForm();
  });
  on("saveExternalResource", "click", () => {
    if (typeof saveExternalResource === "function") saveExternalResource();
  });
  on("externalResourceApplyPreset", "click", () => {
    if (typeof applyExternalResourcePreset === "function") applyExternalResourcePreset();
  });
  on("externalResourceEditChannel", "click", () => {
    if (typeof editLinkedExternalResourceChannel === "function") editLinkedExternalResourceChannel();
  });
  on("externalResourceBindNow", "click", () => {
    if (typeof bindCurrentExternalResource === "function") bindCurrentExternalResource();
  });
  on("externalResourceShowNow", "click", () => {
    if (typeof showCurrentExternalResourceOnDisplay === "function") showCurrentExternalResourceOnDisplay();
  });
  on("externalResourceWriteZero", "click", () => {
    if (typeof setExternalResourceWritePreset === "function") setExternalResourceWritePreset("min");
  });
  on("externalResourceWriteMid", "click", () => {
    if (typeof setExternalResourceWritePreset === "function") setExternalResourceWritePreset("mid");
  });
  on("externalResourceWriteMax", "click", () => {
    if (typeof setExternalResourceWritePreset === "function") setExternalResourceWritePreset("max");
  });
  on("externalResourceWriteNow", "click", () => {
    if (typeof writeExternalResourceNow === "function") writeExternalResourceNow();
  });
  on("externalResourceWriteOff", "click", () => {
    if (typeof writeExternalResourceDigital === "function") writeExternalResourceDigital(false);
  });
  on("externalResourceWriteOn", "click", () => {
    if (typeof writeExternalResourceDigital === "function") writeExternalResourceDigital(true);
  });
  on("deleteExternalResource", "click", () => {
    if (typeof deleteExternalResource === "function") deleteExternalResource();
  });
  on("deviceDriver", "change", () => {
    if (typeof updateDeviceDriverNote === "function") updateDeviceDriverNote();
  });
  on("deviceBusId", "change", () => {
    if (typeof updateDeviceDriverNote === "function") updateDeviceDriverNote();
  });
  on("externalResourceDeviceId", "change", () => {
    if (typeof updateExternalResourceNote === "function") updateExternalResourceNote();
  });
  on("externalResourceKind", "change", () => {
    if (typeof updateExternalResourceNote === "function") updateExternalResourceNote();
  });
  on("externalResourceCapability", "change", () => {
    if (typeof updateExternalResourceNote === "function") updateExternalResourceNote();
  });
  on("externalResourceSourceIndex", "input", () => {
    if (typeof updateExternalResourceNote === "function") updateExternalResourceNote();
  });
  on("externalResourceModeActions", "click", (event) => {
    const modeId = event.target?.dataset?.externalResourceMode;
    if (modeId && typeof applyExternalResourceModePreset === "function") {
      applyExternalResourceModePreset(modeId);
    }
  });

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
  on("blockFilter", "change", (event) => {
    if (typeof setBlockFilter === "function") setBlockFilter(event.target.value);
  });
  on("blockSearch", "input", (event) => {
    if (typeof setBlockSearch === "function") setBlockSearch(event.target.value);
  });

  on("newAlarm", "click", () => {
    if (typeof resetAlarmForm === "function") resetAlarmForm();
  });
  on("saveAlarm", "click", () => {
    if (typeof saveAlarmDefinition === "function") saveAlarmDefinition();
  });
  on("deleteAlarm", "click", () => {
    if (typeof deleteAlarmDefinition === "function") deleteAlarmDefinition();
  });
  on("ackAllAlarms", "click", () => {
    if (typeof ackAllAlarms === "function") ackAllAlarms();
  });
  on("alarmViewFilter", "change", (event) => {
    state.ui.alarmFilter = event.target.value;
    if (typeof renderAlarms === "function") renderAlarms();
  });
  on("alarmShowActiveCount", "click", () => {
    if (typeof prefillDisplayWidgetFromSystemSource === "function") {
      prefillDisplayWidgetFromSystemSource("system.alarm_active_count", "Active Alarms", "pair");
    }
  });
  on("alarmShowUnackedCount", "click", () => {
    if (typeof prefillDisplayWidgetFromSystemSource === "function") {
      prefillDisplayWidgetFromSystemSource("system.alarm_unacked_count", "Unacked Alarms", "pair");
    }
  });
  on("alarmShowLatest", "click", () => {
    if (typeof prefillDisplayWidgetFromSystemSource === "function") {
      prefillDisplayWidgetFromSystemSource("system.alarm_latest", "Latest Alarm", "pair");
    }
  });

  if (typeof ensureActuatorSequenceTemplateUi === "function") ensureActuatorSequenceTemplateUi();
  on("newSequence", "click", () => {
    if (typeof resetSequenceForm === "function") resetSequenceForm();
    if (typeof resetSequenceStateForm === "function") resetSequenceStateForm();
    if (typeof resetSequenceTransitionForm === "function") resetSequenceTransitionForm();
  });
  on("sequenceSeedActuator", "click", () => {
    if (typeof ensureActuatorSequenceTemplateUi === "function") ensureActuatorSequenceTemplateUi();
    if ($("sequenceTemplateId")) $("sequenceTemplateId").value = $("sequenceId")?.value || "actuator_cycle";
    if ($("sequenceTemplateLabel")) $("sequenceTemplateLabel").value = $("sequenceLabel")?.value || "Actuator cycle";
  });
  on("saveSequence", "click", () => {
    if (typeof saveSequenceDefinition === "function") saveSequenceDefinition();
  });
  on("deleteSequence", "click", () => {
    if (typeof deleteSequenceDefinition === "function") deleteSequenceDefinition();
  });
  on("resetSequenceNow", "click", () => {
    if (typeof resetSequenceRuntimeNow === "function") resetSequenceRuntimeNow();
  });
  on("sequenceShowRunningCount", "click", () => {
    if (typeof prefillDisplayWidgetFromSystemSource === "function") {
      prefillDisplayWidgetFromSystemSource("system.sequence_running_count", "Running Sequences", "pair");
    }
  });
  on("sequenceShowLatest", "click", () => {
    if (typeof prefillDisplayWidgetFromSystemSource === "function") {
      prefillDisplayWidgetFromSystemSource("system.sequence_latest", "Latest Sequence", "pair");
    }
  });
  on("sequenceShowLatestState", "click", () => {
    if (typeof prefillDisplayWidgetFromSystemSource === "function") {
      prefillDisplayWidgetFromSystemSource("system.sequence_latest_state", "Sequence State", "pair");
    }
  });
  on("sequenceApplyActuatorTemplate", "click", () => {
    if (typeof seedActuatorSequenceTemplate === "function") seedActuatorSequenceTemplate();
  });
  on("newSequenceState", "click", () => {
    if (typeof resetSequenceStateForm === "function") {
      resetSequenceStateForm($("sequenceStateParent")?.value || state.ui.sequenceSelected || "");
    }
  });
  on("saveSequenceState", "click", () => {
    if (typeof saveSequenceState === "function") saveSequenceState();
  });
  on("deleteSequenceState", "click", () => {
    if (typeof deleteSequenceState === "function") deleteSequenceState();
  });
  on("newSequenceTransition", "click", () => {
    if (typeof resetSequenceTransitionForm === "function") {
      resetSequenceTransitionForm(
        $("sequenceTransitionParent")?.value || state.ui.sequenceSelected || "",
        $("sequenceTransitionState")?.value || state.ui.sequenceStateSelected || ""
      );
    }
  });
  on("saveSequenceTransition", "click", () => {
    if (typeof saveSequenceTransition === "function") saveSequenceTransition();
  });
  on("deleteSequenceTransition", "click", () => {
    if (typeof deleteSequenceTransition === "function") deleteSequenceTransition();
  });
  on("sequenceSelect", "change", (event) => {
    state.ui.sequenceSelected = event.target.value;
    if (typeof ensureSequenceSelections === "function") ensureSequenceSelections(event.target.value, "", "");
    if (event.target.value && typeof editSequence === "function") editSequence(event.target.value);
    else if (typeof resetSequenceForm === "function") resetSequenceForm();
    if (typeof renderSequences === "function") renderSequences();
  });
  on("sequenceStateParent", "change", (event) => {
    if (typeof ensureSequenceSelections === "function") ensureSequenceSelections(event.target.value, "", "");
    if (typeof resetSequenceStateForm === "function") resetSequenceStateForm(event.target.value);
    if (typeof resetSequenceTransitionForm === "function") resetSequenceTransitionForm(event.target.value);
    if (typeof renderSequences === "function") renderSequences();
  });
  on("sequenceStateSelect", "change", (event) => {
    const sequenceId = $("sequenceStateParent")?.value || state.ui.sequenceSelected || "";
    if (event.target.value && typeof editSequenceState === "function") editSequenceState(sequenceId, event.target.value);
    else if (typeof resetSequenceStateForm === "function") resetSequenceStateForm(sequenceId);
    if (typeof renderSequences === "function") renderSequences();
  });
  on("sequenceTransitionParent", "change", (event) => {
    if (typeof ensureSequenceSelections === "function") ensureSequenceSelections(event.target.value, "", "");
    if (typeof resetSequenceTransitionForm === "function") resetSequenceTransitionForm(event.target.value);
    if (typeof renderSequences === "function") renderSequences();
  });
  on("sequenceTransitionState", "change", (event) => {
    const sequenceId = $("sequenceTransitionParent")?.value || state.ui.sequenceSelected || "";
    state.ui.sequenceStateSelected = event.target.value;
    if (typeof ensureSequenceSelections === "function") ensureSequenceSelections(sequenceId, event.target.value, "");
    if (typeof resetSequenceTransitionForm === "function") resetSequenceTransitionForm(sequenceId, event.target.value);
    if (typeof renderSequences === "function") renderSequences();
  });
  on("sequenceTransitionSelect", "change", (event) => {
    const sequenceId = $("sequenceTransitionParent")?.value || state.ui.sequenceSelected || "";
    const stateId = $("sequenceTransitionState")?.value || state.ui.sequenceStateSelected || "";
    if (event.target.value && typeof editSequenceTransition === "function") {
      editSequenceTransition(sequenceId, stateId, event.target.value);
    } else if (typeof resetSequenceTransitionForm === "function") {
      resetSequenceTransitionForm(sequenceId, stateId);
    }
    if (typeof renderSequences === "function") renderSequences();
  });

  on("newDisplayScreen", "click", () => {
    state.ui.displaySelectedScreen = "";
    if (typeof resetDisplayScreenForm === "function") resetDisplayScreenForm();
  });
  on("saveDisplayScreen", "click", () => {
    if (typeof saveDisplayScreen === "function") saveDisplayScreen();
  });
  on("deleteDisplayScreen", "click", () => {
    if (typeof deleteDisplayScreen === "function") deleteDisplayScreen();
  });
  on("newDisplayWidget", "click", () => {
    if (typeof resetDisplayWidgetForm === "function") {
      resetDisplayWidgetForm(state.ui.displaySelectedScreen);
      openModal("displayWidgetModal");
    }
  });
  on("saveDisplayWidget", "click", () => {
    if (typeof saveDisplayWidget === "function") saveDisplayWidget();
  });
  on("deleteDisplayWidget", "click", () => {
    if (typeof deleteDisplayWidget === "function") deleteDisplayWidget();
  });
  on("closeDisplayWidgetModal", "click", () => closeModal("displayWidgetModal"));
  on("displayWidgetModal", "click", (event) => {
    if (event.target === event.currentTarget) closeModal("displayWidgetModal");
  });
  on("displayScreenSelect", "change", (event) => {
    state.ui.displaySelectedScreen = event.target.value;
    if (typeof resetDisplayScreenForm === "function") resetDisplayScreenForm();
    if (typeof renderDisplay === "function") renderDisplay();
  });

  on("newTimerBlock", "click", () => typeof resetBlockForm === "function" && (resetBlockForm("timer"), openModal("blockModal")));
  on("newButtonBlock", "click", () => typeof resetBlockForm === "function" && (resetBlockForm("button"), openModal("blockModal")));
  on("newCounterBlock", "click", () => typeof resetBlockForm === "function" && (resetBlockForm("counter"), openModal("blockModal")));
  on("newLatchBlock", "click", () => typeof resetBlockForm === "function" && (resetBlockForm("latch"), openModal("blockModal")));
  on("newSelectorBlock", "click", () => typeof resetBlockForm === "function" && (resetBlockForm("selector"), openModal("blockModal")));
  on("newComparatorBlock", "click", () => typeof resetBlockForm === "function" && (resetBlockForm("comparator"), openModal("blockModal")));
  on("newScaleMapBlock", "click", () => typeof resetBlockForm === "function" && (resetBlockForm("scale_map"), openModal("blockModal")));
  on("newLogicGateBlock", "click", () => typeof resetBlockForm === "function" && (resetBlockForm("logic_gate"), openModal("blockModal")));
  on("newEdgeDetectBlock", "click", () => typeof resetBlockForm === "function" && (resetBlockForm("edge_detect"), openModal("blockModal")));
  on("newHysteresisBlock", "click", () => typeof resetBlockForm === "function" && (resetBlockForm("hysteresis"), openModal("blockModal")));
  on("saveBlock", "click", () => {
    if (typeof saveBlockDefinition === "function") saveBlockDefinition();
  });
  on("resetBlockForm", "click", () => {
    if (typeof resetBlockForm === "function") resetBlockForm($("blockType")?.value);
  });
  on("deleteBlock", "click", () => {
    if (typeof deleteBlockDefinition === "function") deleteBlockDefinition();
  });
  on("closeBlockModal", "click", () => closeModal("blockModal"));
  on("blockModal", "click", (event) => {
    if (event.target === event.currentTarget) closeModal("blockModal");
  });
  on("closeCleanupModal", "click", () => closeModal("cleanupModal"));
  on("cancelCleanupDelete", "click", () => closeModal("cleanupModal"));
  on("confirmCleanupDelete", "click", () => {
    if (typeof confirmCleanupDelete === "function") confirmCleanupDelete();
  });
  on("cleanupKeepAll", "click", () => {
    if (typeof setCleanupSelection === "function") setCleanupSelection("none");
  });
  on("cleanupSelectRecommended", "click", () => {
    if (typeof setCleanupSelection === "function") setCleanupSelection("recommended");
  });
  on("cleanupSelectAll", "click", () => {
    if (typeof setCleanupSelection === "function") setCleanupSelection("all");
  });
  on("cleanupModal", "click", (event) => {
    if (event.target === event.currentTarget) closeModal("cleanupModal");
  });
  on("cleanupItems", "change", (event) => {
    if (event.target?.matches?.("[data-cleanup-index]") && typeof updateCleanupSelectionHints === "function") {
      updateCleanupSelectionHints();
    }
  });
  on("blockScenario", "change", () => {
    if (typeof applyBlockScenario === "function") applyBlockScenario($("blockScenario")?.value);
  });
  on("blockIdMode", "change", () => {
    if (typeof setBlockManualIdMode === "function") setBlockManualIdMode($("blockIdMode")?.value);
  });
  on("blockType", "change", () => {
    if (typeof syncBlockModeOptions === "function") syncBlockModeOptions();
    if (typeof renderBlockOutputOptions === "function") renderBlockOutputOptions();
    setBlockTypeVisibility();
    if (typeof syncScenarioFromCurrentBlock === "function") syncScenarioFromCurrentBlock();
    if (typeof syncAutoBlockId === "function") syncAutoBlockId();
  });
  on("blockMode", "change", () => {
    setBlockTypeVisibility();
    if (typeof syncScenarioFromCurrentBlock === "function") syncScenarioFromCurrentBlock();
    if (typeof syncAutoBlockId === "function") syncAutoBlockId();
  });
  on("blockOutputPreset", "change", () => {
    if (typeof syncBlockOutputFromPreset === "function") syncBlockOutputFromPreset();
    if (typeof syncAutoBlockId === "function") syncAutoBlockId();
  });
  on("blockOutput", "input", () => {
    if (typeof updateBlockAssistantPreview === "function") updateBlockAssistantPreview();
    if (typeof syncAutoBlockId === "function") syncAutoBlockId();
  });
  ["blockInput", "blockTrigger", "blockToggleInput", "blockSetInput", "blockResetInput", "blockPrimary", "blockSecondary", "blockSelect", "blockEnable"].forEach((id) => {
    on(id, "change", () => {
      if (typeof syncAutoBlockId === "function") syncAutoBlockId();
    });
  });
  ["blockTrigger", "blockEnable", "blockPrimary", "blockSecondary", "blockSelect", "blockInput", "blockToggleInput", "blockSetInput", "blockResetInput", "blockAutoTriggerGpio", "blockAutoTriggerEvent", "blockAutoToggleGpio", "blockAutoToggleEvent", "blockAutoSetGpio", "blockAutoSetEvent", "blockAutoResetGpio", "blockAutoResetEvent", "blockDurationValue", "blockDurationUnit", "blockPeriodValue", "blockPeriodUnit"].forEach((id) => {
    on(id, "change", () => {
      if (typeof updateBlockAssistantPreview === "function") updateBlockAssistantPreview();
    });
  });
  ["blockAutoTriggerEnable", "blockAutoToggleEnable", "blockAutoSetEnable", "blockAutoResetEnable"].forEach((id) => {
    on(id, "change", () => {
      if (typeof updateBlockAssistantVisibility === "function") updateBlockAssistantVisibility();
      if (typeof syncScenarioFromCurrentBlock === "function") syncScenarioFromCurrentBlock();
      if (typeof syncAutoBlockId === "function") syncAutoBlockId();
    });
  });
  on("blockCompareInput", "change", () => {
    if (typeof syncAutoBlockId === "function") syncAutoBlockId();
    if (typeof updateBlockAssistantPreview === "function") updateBlockAssistantPreview();
  });
  on("blockCompareSignal", "change", () => {
    if (typeof syncAutoBlockId === "function") syncAutoBlockId();
    if (typeof updateBlockAssistantPreview === "function") updateBlockAssistantPreview();
    setBlockTypeVisibility();
  });
  on("blockCompareValue", "input", () => {
    if (typeof updateBlockAssistantPreview === "function") updateBlockAssistantPreview();
  });
  on("blockCompareValueB", "input", () => {
    if (typeof updateBlockAssistantPreview === "function") updateBlockAssistantPreview();
  });
  on("blockCompareValueC", "input", () => {
    if (typeof updateBlockAssistantPreview === "function") updateBlockAssistantPreview();
  });
  on("blockCompareValueD", "input", () => {
    if (typeof updateBlockAssistantPreview === "function") updateBlockAssistantPreview();
  });

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
  on("blocksTable", "click", (event) => {
    const editId = event.target?.dataset?.editBlock;
    const deleteId = event.target?.dataset?.deleteBlock;
    if (editId && typeof editBlock === "function") editBlock(editId);
    if (deleteId && typeof deleteBlockDefinition === "function") deleteBlockDefinition(deleteId);
  });
  on("displayWidgetsTable", "click", (event) => {
    const editValue = event.target?.dataset?.editDisplayWidget;
    const deleteValue = event.target?.dataset?.deleteDisplayWidget;
    if (editValue && typeof editDisplayWidget === "function") {
      const parts = editValue.split("|");
      editDisplayWidget(parts[0], parts[1]);
    }
    if (deleteValue && typeof deleteDisplayWidget === "function") {
      const parts = deleteValue.split("|");
      deleteDisplayWidget(parts[0], parts[1]);
    }
  });
  on("busesTable", "click", (event) => {
    const editId = event.target?.dataset?.editBus;
    const deleteId = event.target?.dataset?.deleteBus;
    if (editId && typeof editBus === "function") editBus(editId);
    if (deleteId && typeof deleteBus === "function") deleteBus(deleteId);
  });
  on("devicesTable", "click", (event) => {
    const editId = event.target?.dataset?.editDevice;
    const deleteId = event.target?.dataset?.deleteDevice;
    const seedId = event.target?.dataset?.seedDevice;
    const newResourceId = event.target?.dataset?.newResourceForDevice;
    if (editId && typeof editDevice === "function") editDevice(editId);
    if (seedId && typeof seedDeviceResourcesFromId === "function") seedDeviceResourcesFromId(seedId);
    if (newResourceId && typeof prefillExternalResourceFromDeviceId === "function") {
      prefillExternalResourceFromDeviceId(newResourceId);
    }
    if (deleteId && typeof deleteDevice === "function") deleteDevice(deleteId);
  });
  on("externalResourcesTable", "click", (event) => {
    const bindId = event.target?.dataset?.bindExternalResource;
    const showId = event.target?.dataset?.showExternalResource;
    const editId = event.target?.dataset?.editExternalResource;
    const deleteId = event.target?.dataset?.deleteExternalResource;
    if (bindId && typeof prefillChannelFromExternalResource === "function") prefillChannelFromExternalResource(bindId);
    if (showId && typeof prefillDisplayWidgetFromExternalResource === "function") prefillDisplayWidgetFromExternalResource(showId);
    if (editId && typeof editExternalResource === "function") editExternalResource(editId);
    if (deleteId && typeof deleteExternalResource === "function") deleteExternalResource(deleteId);
  });
  on("activeAlarmsTable", "click", (event) => {
    const ackId = event.target?.dataset?.ackAlarm;
    const editId = event.target?.dataset?.editAlarm;
    if (ackId && typeof ackAlarm === "function") ackAlarm(ackId);
    if (editId && typeof editAlarm === "function") editAlarm(editId);
  });
  on("alarmsTable", "click", (event) => {
    const editId = event.target?.dataset?.editAlarm;
    const deleteId = event.target?.dataset?.deleteAlarm;
    if (editId && typeof editAlarm === "function") editAlarm(editId);
    if (deleteId && typeof deleteAlarmDefinition === "function") deleteAlarmDefinition(deleteId);
  });
  on("sequencesTable", "click", (event) => {
    const editId = event.target?.dataset?.editSequence;
    const resetId = event.target?.dataset?.resetSequence;
    const deleteId = event.target?.dataset?.deleteSequence;
    if (editId && typeof editSequence === "function") editSequence(editId);
    if (resetId && typeof resetSequenceRuntimeNow === "function") resetSequenceRuntimeNow(resetId);
    if (deleteId && typeof deleteSequenceDefinition === "function") deleteSequenceDefinition(deleteId);
  });
  on("sequenceStatesTable", "click", (event) => {
    const editValue = event.target?.dataset?.editSequenceState;
    const deleteValue = event.target?.dataset?.deleteSequenceState;
    if (editValue && typeof editSequenceState === "function") {
      const parts = editValue.split("|");
      editSequenceState(parts[0], parts[1]);
    }
    if (deleteValue && typeof deleteSequenceState === "function") {
      const parts = deleteValue.split("|");
      deleteSequenceState(parts[0], parts[1]);
    }
  });
  on("sequenceTransitionsTable", "click", (event) => {
    const editValue = event.target?.dataset?.editSequenceTransition;
    const deleteValue = event.target?.dataset?.deleteSequenceTransition;
    if (editValue && typeof editSequenceTransition === "function") {
      const parts = editValue.split("|");
      editSequenceTransition(parts[0], parts[1], parts[2]);
    }
    if (deleteValue && typeof deleteSequenceTransition === "function") {
      const parts = deleteValue.split("|");
      deleteSequenceTransition(parts[0], parts[1], parts[2]);
    }
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

  if (typeof ensureInterlockBlockUi === "function") ensureInterlockBlockUi();
  on("newInterlockBlock", "click", () => {
    if (typeof resetBlockForm === "function") {
      resetBlockForm("interlock");
      openModal("blockModal");
    }
  });
  if (typeof ensureModeAuthorityBlockUi === "function") ensureModeAuthorityBlockUi();
  on("newModeAuthorityBlock", "click", () => {
    if (typeof resetBlockForm === "function") {
      resetBlockForm("mode_authority");
      openModal("blockModal");
    }
  });
  if (typeof ensureFreshnessBlockUi === "function") ensureFreshnessBlockUi();
  on("newFreshnessBlock", "click", () => {
    if (typeof resetBlockForm === "function") {
      resetBlockForm("freshness");
      openModal("blockModal");
    }
  });
  document.querySelectorAll("[data-block-coming]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.blockComing || "block";
      if ($("blocksOverviewNote")) {
        $("blocksOverviewNote").textContent = `Блок "${name}" уже входит в обязательную базу и будет добавлен следующим этапом как стандартный primitive.`;
      }
    });
  });

  populateUnitPresets();
  applyHelpLanguage();
  resetSignalForm();
  resetChannelForm();
  if (typeof resetBusForm === "function") resetBusForm();
  if (typeof resetDeviceForm === "function") resetDeviceForm();
  if (typeof resetExternalResourceForm === "function") resetExternalResourceForm();
  if (typeof resetSequenceForm === "function") resetSequenceForm();
  if (typeof resetSequenceStateForm === "function") resetSequenceStateForm();
  if (typeof resetSequenceTransitionForm === "function") resetSequenceTransitionForm();
  if (typeof resetBlockForm === "function" && $("blockType")) resetBlockForm();
  if (typeof setTemplateTab === "function") setTemplateTab("chip");
  updateNetworkVisibility();
  updatePasswordVisibility();
  setTimeout(() => bootstrapUi(), 0);
})();
