(function () {
  const REFRESH_INTERVAL_MS = 1500;
  const ENDPOINTS = {
    data: "/api/dashboard/data",
    start: "/api/dashboard/start",
    stop: "/api/dashboard/stop",
    trip: "/api/dashboard/trip",
    reset: "/api/dashboard/reset",
  };

  const state = {
    selectedProgramId: "",
    dashboard: null,
  };

  const elements = {
    errorBanner: document.getElementById("error-banner"),
    messageBanner: document.getElementById("message-banner"),
    lastRefresh: document.getElementById("last-refresh"),
    transportCode: document.getElementById("transport-code"),
    summaryProgram: document.getElementById("summary-program"),
    summaryLifecycle: document.getElementById("summary-lifecycle"),
    summaryState: document.getElementById("summary-state"),
    summaryStateType: document.getElementById("summary-state-type"),
    summaryNext: document.getElementById("summary-next"),
    summaryNextReason: document.getElementById("summary-next-reason"),
    summaryAlarms: document.getElementById("summary-alarms"),
    summaryAlarmSeverity: document.getElementById("summary-alarm-severity"),
    programStatusBadge: document.getElementById("program-status-badge"),
    programName: document.getElementById("program-name"),
    programState: document.getElementById("program-state"),
    programElapsed: document.getElementById("program-elapsed"),
    programReason: document.getElementById("program-reason"),
    programStopFlag: document.getElementById("program-stop-flag"),
    programTripFlag: document.getElementById("program-trip-flag"),
    programLockout: document.getElementById("program-lockout"),
    programSelect: document.getElementById("program-select"),
    startButton: document.getElementById("start-button"),
    stopButton: document.getElementById("stop-button"),
    tripButton: document.getElementById("trip-button"),
    resetButton: document.getElementById("reset-button"),
    refreshButton: document.getElementById("refresh-button"),
    startReason: document.getElementById("start-reason"),
    stopReason: document.getElementById("stop-reason"),
    tripReason: document.getElementById("trip-reason"),
    resetReason: document.getElementById("reset-reason"),
    transitionCount: document.getElementById("transition-count"),
    blockedByList: document.getElementById("blocked-by-list"),
    transitionList: document.getElementById("transition-list"),
    outputsList: document.getElementById("outputs-list"),
    alarmsSummary: document.getElementById("alarms-summary"),
    alarmsList: document.getElementById("alarms-list"),
    historyList: document.getElementById("history-list"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatSeconds(ms) {
    return `${(Number(ms || 0) / 1000).toFixed(1)} s`;
  }

  function formatTimestamp(ms) {
    if (!ms && ms !== 0) {
      return "Waiting";
    }
    if (Number(ms) < 100000000000) {
      return `${ms} ms`;
    }
    const date = new Date(Number(ms));
    return Number.isNaN(date.getTime()) ? `${ms} ms` : date.toLocaleTimeString();
  }

  function commandContext(reason) {
    return {
      now_ms: Date.now(),
      source: "web_dashboard",
      reason,
      actor: "mechanic",
    };
  }

  function setBanner(target, message) {
    if (message) {
      target.textContent = message;
      target.classList.remove("hidden");
    } else {
      target.textContent = "";
      target.classList.add("hidden");
    }
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}`);
      }
      throw new Error("Response was not valid JSON.");
    }
    if (!response.ok) {
      throw new Error(payload && payload.message ? payload.message : `Request failed with HTTP ${response.status}`);
    }
    return payload;
  }

  function selectedProgram(dashboard) {
    return (dashboard.registered_programs || []).find((entry) => entry.id === state.selectedProgramId) || null;
  }

  function syncSelection(dashboard) {
    const programs = dashboard.registered_programs || [];
    const selectionStillExists = programs.some((entry) => entry.id === state.selectedProgramId);
    if (!selectionStillExists) {
      state.selectedProgramId = dashboard.selected_program_id || (programs[0] ? programs[0].id : "");
    }
    elements.programSelect.innerHTML = programs
      .map((entry) => {
        const activeTag = entry.is_active ? " (active)" : "";
        return `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}${activeTag}</option>`;
      })
      .join("");
    if (state.selectedProgramId) {
      elements.programSelect.value = state.selectedProgramId;
    }
  }

  function renderTransitions(dashboard) {
    const transitions = dashboard.transition_candidates || [];
    const blocked = dashboard.blocked_transitions || [];
    elements.transitionCount.textContent = `${transitions.length} candidate${transitions.length === 1 ? "" : "s"}`;

    if (!blocked.length) {
      elements.blockedByList.className = "stack-list empty-state";
      elements.blockedByList.innerHTML = "No blocking transition reasons right now.";
    } else {
      elements.blockedByList.className = "stack-list";
      elements.blockedByList.innerHTML = blocked
        .map(
          (entry) => `
            <article class="stack-item">
              <h3>${escapeHtml(entry.target_state_name || entry.target_state_id)}</h3>
              <p>${escapeHtml(entry.reason || "Blocked without reason text.")}</p>
              <div class="stack-meta">
                <span class="pill pill-danger">${entry.min_time_satisfied ? "Min time OK" : "Min time waiting"}</span>
                <span class="pill">${entry.eligible ? "Eligible" : "Not eligible"}</span>
              </div>
            </article>`
        )
        .join("");
    }

    if (!transitions.length) {
      elements.transitionList.className = "stack-list empty-state";
      elements.transitionList.innerHTML = "No transition candidates reported.";
      return;
    }

    elements.transitionList.className = "stack-list";
    elements.transitionList.innerHTML = transitions
      .map(
        (entry) => `
          <article class="stack-item">
            <h3>${escapeHtml(entry.target_state_name || entry.target_state_id)}</h3>
            <p>${escapeHtml(entry.reason || "No reason supplied.")}</p>
            <div class="stack-meta">
              <span class="pill ${entry.eligible ? "pill-ok" : "pill-danger"}">${entry.eligible ? "Eligible" : "Blocked"}</span>
              <span class="pill">${entry.min_time_satisfied ? "Min time satisfied" : "Waiting on min time"}</span>
              <span class="pill">${escapeHtml(entry.transition_id)}</span>
            </div>
          </article>`
      )
      .join("");
  }

  function renderOutputs(dashboard) {
    const actuators = dashboard.actuator_summaries || [];
    if (!actuators.length) {
      elements.outputsList.className = "stack-list empty-state";
      elements.outputsList.innerHTML = "No actuator data.";
      return;
    }

    elements.outputsList.className = "stack-list";
    elements.outputsList.innerHTML = actuators
      .map((entry) => {
        const emphasisPill =
          entry.emphasis === "safe_fallback"
            ? '<span class="pill pill-safe">Safe fallback</span>'
            : entry.emphasis === "sequence_owned"
              ? '<span class="pill pill-ok">Sequence owned</span>'
              : '<span class="pill">Observed</span>';
        return `
          <article class="stack-item">
            <h3>${escapeHtml(entry.id)}${entry.is_on ? " ON" : " OFF"}</h3>
            <p>${escapeHtml(entry.state_text)} | role: ${escapeHtml(entry.role)} | owner: ${escapeHtml(entry.owner || "unowned")}</p>
            <p>${escapeHtml(entry.reason || "No reason supplied.")}</p>
            <div class="stack-meta">
              ${emphasisPill}
              <span class="pill">${escapeHtml(entry.kind)}</span>
              <span class="pill">${escapeHtml(entry.priority)}</span>
            </div>
          </article>`;
      })
      .join("");
  }

  function renderAlarms(dashboard) {
    elements.alarmsSummary.innerHTML = `
      <strong>${dashboard.alarms_any_active ? "Alarm attention required" : "No active alarms"}</strong>
      <p>Count: ${dashboard.alarms_active_count || 0} | Highest severity: ${escapeHtml(
        dashboard.alarms_highest_severity || "none"
      )} | Trip: ${dashboard.alarms_trip_active ? "yes" : "no"} | Safety: ${dashboard.alarms_safety_active ? "yes" : "no"}</p>`;

    const alarms = dashboard.active_alarm_entries || [];
    if (!alarms.length) {
      elements.alarmsList.className = "stack-list empty-state";
      elements.alarmsList.innerHTML = "No active alarms.";
      return;
    }

    elements.alarmsList.className = "stack-list";
    elements.alarmsList.innerHTML = alarms
      .map(
        (entry) => `
          <article class="stack-item">
            <h3>${escapeHtml(entry.id)}</h3>
            <p>${entry.severity ? `Severity: ${escapeHtml(entry.severity)}` : "Severity detail unavailable."}</p>
          </article>`
      )
      .join("");
  }

  function renderHistory(dashboard) {
    const history = dashboard.recent_history || [];
    if (!history.length) {
      elements.historyList.className = "history-list empty-state";
      elements.historyList.innerHTML = "No recent history.";
      return;
    }

    elements.historyList.className = "history-list";
    elements.historyList.innerHTML = history
      .map(
        (entry) => `
          <article class="history-item">
            <h3>${escapeHtml(entry.event_type)} at ${escapeHtml(formatTimestamp(entry.timestamp_ms))}</h3>
            <p>From: ${escapeHtml(entry.from_state || "-")} | To: ${escapeHtml(entry.to_state || "-")} | Source: ${escapeHtml(
              entry.source || "unknown"
            )}</p>
            <p>${escapeHtml(entry.reason || "No reason supplied.")}</p>
          </article>`
      )
      .join("");
  }

  function renderDashboard(response) {
    const dashboard = response.dashboard || {};
    state.dashboard = dashboard;
    syncSelection(dashboard);

    const activeLabel = dashboard.active_program_name || "No active program";
    const currentState = dashboard.current_state_name || dashboard.current_state_id || "Waiting";
    const nextState = dashboard.next_transition_target_state_name || dashboard.next_transition_target_state_id || "Blocked";

    elements.lastRefresh.textContent = formatTimestamp(response.refresh_timestamp_ms);
    elements.transportCode.textContent = response.code || "DASHBOARD_DATA_UNAVAILABLE";
    elements.summaryProgram.textContent = activeLabel;
    elements.summaryLifecycle.textContent = dashboard.lifecycle || "idle";
    elements.summaryState.textContent = currentState;
    elements.summaryStateType.textContent = dashboard.current_state_type || "generic";
    elements.summaryNext.textContent = nextState;
    elements.summaryNextReason.textContent = dashboard.next_transition_reason || "No next transition available yet.";
    elements.summaryAlarms.textContent = String(dashboard.alarms_active_count || 0);
    elements.summaryAlarmSeverity.textContent = dashboard.alarms_highest_severity || "none";

    elements.programStatusBadge.textContent = dashboard.lifecycle || "idle";
    elements.programName.textContent = activeLabel;
    elements.programState.textContent = currentState;
    elements.programElapsed.textContent = formatSeconds(dashboard.state_elapsed_ms || 0);
    elements.programReason.textContent = dashboard.last_reason || "No active program.";
    elements.programStopFlag.textContent = dashboard.pending_normal_stop ? "Yes" : "No";
    elements.programTripFlag.textContent = dashboard.pending_trip ? "Yes" : "No";
    elements.programLockout.textContent = dashboard.lockout ? "Yes" : "No";

    const selected = selectedProgram(dashboard);
    const startEnabled = dashboard.active_program_id ? false : Boolean(selected ? selected.can_start : dashboard.can_start);
    elements.startButton.disabled = !startEnabled;
    elements.stopButton.disabled = !dashboard.can_stop;
    elements.tripButton.disabled = !dashboard.can_trip;
    elements.resetButton.disabled = !dashboard.can_reset;

    elements.startReason.textContent = startEnabled
      ? `Ready to start ${selected ? selected.name : "the selected program"}.`
      : (selected && selected.start_reason) || dashboard.start_reason || "Start is not allowed.";
    elements.stopReason.textContent = dashboard.can_stop ? "Ready." : dashboard.stop_reason || "Stop is not allowed.";
    elements.tripReason.textContent = dashboard.can_trip ? "Ready." : dashboard.trip_reason || "Trip is not allowed.";
    elements.resetReason.textContent = dashboard.can_reset ? "Ready." : dashboard.reset_reason || "Reset is not allowed.";

    renderTransitions(dashboard);
    renderOutputs(dashboard);
    renderAlarms(dashboard);
    renderHistory(dashboard);

    const warningText = (response.warnings || []).join(" ");
    setBanner(elements.errorBanner, response.success ? "" : response.message || "Dashboard data is unavailable.");
    setBanner(elements.messageBanner, response.success ? warningText || response.message || "" : "");
  }

  async function loadDashboard() {
    try {
      const response = await fetchJson(ENDPOINTS.data);
      renderDashboard(response);
    } catch (error) {
      setBanner(elements.errorBanner, error.message || "Failed to load dashboard data.");
    }
  }

  async function postCommand(endpoint, body) {
    try {
      const response = await fetchJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.updated_dashboard) {
        renderDashboard(response.updated_dashboard);
      } else {
        await loadDashboard();
      }

      setBanner(elements.messageBanner, response.message || "Command completed.");
      if (!response.accepted) {
        setBanner(elements.errorBanner, response.message || "Command was denied.");
      } else {
        setBanner(elements.errorBanner, "");
      }
    } catch (error) {
      setBanner(elements.errorBanner, error.message || "Command failed.");
    }
  }

  elements.programSelect.addEventListener("change", (event) => {
    state.selectedProgramId = event.target.value;
    if (state.dashboard) {
      renderDashboard({
        success: true,
        code: "DASHBOARD_OK",
        message: "",
        refresh_timestamp_ms: Date.now(),
        dashboard: state.dashboard,
        warnings: [],
      });
    }
  });

  elements.refreshButton.addEventListener("click", () => loadDashboard());
  elements.startButton.addEventListener("click", () =>
    postCommand(ENDPOINTS.start, {
      program_id: state.selectedProgramId,
      context: commandContext("dashboard start"),
    })
  );
  elements.stopButton.addEventListener("click", () =>
    postCommand(ENDPOINTS.stop, {
      context: commandContext("dashboard normal stop"),
    })
  );
  elements.tripButton.addEventListener("click", () =>
    postCommand(ENDPOINTS.trip, {
      context: commandContext("dashboard trip"),
    })
  );
  elements.resetButton.addEventListener("click", () =>
    postCommand(ENDPOINTS.reset, {
      context: commandContext("dashboard reset"),
    })
  );

  loadDashboard();
  window.setInterval(loadDashboard, REFRESH_INTERVAL_MS);
})();
