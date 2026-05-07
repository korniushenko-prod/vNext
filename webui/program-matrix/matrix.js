(function () {
  const sampleViews = {
    "burner.demo": {
      result_code: "MATRIX_UI_OK",
      message: "Program matrix detail refreshed.",
      has_matrix: true,
      has_warnings: true,
      read_only_note:
        "Read-only descriptor view. Matrix cells come only from state active_actions, not runtime arbitration.",
      matrix_title: "Burner Demo Output Matrix",
      empty_title: "",
      empty_message: "",
      runtime_summary: {
        code: "MATRIX_UI_OK",
        banner: "Active state highlighted. Matrix remains a descriptor view.",
        active: true,
        selected_program_active: true,
        active_program_id: "burner.demo",
        lifecycle: "running",
        current_state: "run",
        lockout: "No",
        last_reason: "Operator start request accepted.",
      },
      columns: [
        { actuator_id: "relay.fan", header_label: "Fan Relay", sublabel: "relay.fan", kind: "relay", role: "fan" },
        { actuator_id: "relay.ignition", header_label: "Ignition Relay", sublabel: "relay.ignition", kind: "relay", role: "ignition" },
        { actuator_id: "relay.fuel", header_label: "Fuel Relay", sublabel: "relay.fuel", kind: "relay", role: "fuel" },
      ],
      rows: [
        {
          state_id: "start",
          state_name: "Start",
          state_type: "action",
          currently_active: false,
          badges: ["initial"],
          cells: [
            { actuator_id: "relay.fan", label: "", cell_type: "none", empty: true, explicit_off: false, warning: "" },
            { actuator_id: "relay.ignition", label: "", cell_type: "none", empty: true, explicit_off: false, warning: "" },
            { actuator_id: "relay.fuel", label: "", cell_type: "none", empty: true, explicit_off: false, warning: "" },
          ],
        },
        {
          state_id: "purge",
          state_name: "Purge",
          state_type: "purge",
          currently_active: false,
          badges: [],
          cells: [
            { actuator_id: "relay.fan", label: "ON", cell_type: "relay_on", empty: false, explicit_off: false, warning: "" },
            { actuator_id: "relay.ignition", label: "OFF", cell_type: "relay_off", empty: false, explicit_off: true, warning: "" },
            { actuator_id: "relay.fuel", label: "OFF", cell_type: "relay_off", empty: false, explicit_off: true, warning: "" },
          ],
        },
        {
          state_id: "run",
          state_name: "Run",
          state_type: "run",
          currently_active: true,
          badges: [],
          cells: [
            { actuator_id: "relay.fan", label: "ON", cell_type: "relay_on", empty: false, explicit_off: false, warning: "" },
            { actuator_id: "relay.ignition", label: "ON", cell_type: "relay_on", empty: false, explicit_off: false, warning: "Duplicate actuator requests detected in this state." },
            { actuator_id: "relay.fuel", label: "ON", cell_type: "relay_on", empty: false, explicit_off: false, warning: "" },
          ],
        },
        {
          state_id: "trip",
          state_name: "Trip",
          state_type: "stop",
          currently_active: false,
          badges: ["trip"],
          cells: [
            { actuator_id: "relay.fan", label: "OFF", cell_type: "relay_off", empty: false, explicit_off: true, warning: "" },
            { actuator_id: "relay.ignition", label: "OFF", cell_type: "relay_off", empty: false, explicit_off: true, warning: "" },
            { actuator_id: "relay.fuel", label: "ON", cell_type: "relay_on", empty: false, explicit_off: false, warning: "Unsafe trip fuel hold detected." },
          ],
        },
        {
          state_id: "lockout",
          state_name: "Lockout",
          state_type: "lockout",
          currently_active: false,
          badges: ["lockout"],
          cells: [
            { actuator_id: "relay.fan", label: "", cell_type: "none", empty: true, explicit_off: false, warning: "" },
            { actuator_id: "relay.ignition", label: "OFF", cell_type: "relay_off", empty: false, explicit_off: true, warning: "" },
            { actuator_id: "relay.fuel", label: "OFF", cell_type: "relay_off", empty: false, explicit_off: true, warning: "" },
          ],
        },
      ],
      issues: [
        { path: "programs/burner.demo/states/run/active_actions", code: "MATRIX_DUPLICATE_ACTUATOR_ACTION", severity: "warning", message: "Run contains duplicate ignition relay requests.", blocking: false },
        { path: "programs/burner.demo/states/trip", code: "MATRIX_UNSAFE_TRIP_OUTPUT", severity: "error", message: "Trip contains a persistent fuel actuator ON action.", blocking: true },
      ],
      legend: [
        { token: "blank", label: "Blank", description: "No persistent actuator action in that state." },
        { token: "ON", label: "ON", description: "Relay is held ON by an active_action." },
        { token: "OFF", label: "OFF", description: "Relay is held OFF explicitly by an active_action." },
        { token: "ACTIVE", label: "Highlighted row", description: "Current active state when the selected program is running." },
      ],
      state_details: [
        { state_id: "start", state_name: "Start", state_type: "action", badge_line: "initial", guard_summary: "none", timeout_summary: "none", guard_fail_summary: "none", entry_actions: [{ id: "start_note", kind: "log_note", summary: "record start note", reason: "" }], active_actions: [], exit_actions: [], transitions: [{ id: "to_purge", target_state_id: "purge", summary: "purge", enabled: true }] },
        { state_id: "purge", state_name: "Purge", state_type: "purge", badge_line: "", guard_summary: "signal.air_ok == true", timeout_summary: "none", guard_fail_summary: "guard fail -> trip", entry_actions: [], active_actions: [{ id: "purge_fan", kind: "relay_request", summary: "relay.fan=ON", reason: "combustion air", persistent: true }], exit_actions: [{ id: "stop_purge_timer", kind: "timer_stop", summary: "stop timer timer.purge", reason: "" }], transitions: [{ id: "to_run", target_state_id: "run", summary: "run if signal.flame == true", enabled: true }] },
        { state_id: "run", state_name: "Run", state_type: "run", badge_line: "", guard_summary: "none", timeout_summary: "none", guard_fail_summary: "none", entry_actions: [], active_actions: [{ id: "run_fan", kind: "relay_request", summary: "relay.fan=ON", reason: "air flow", persistent: true }, { id: "run_fuel", kind: "relay_request", summary: "relay.fuel=ON", reason: "fuel hold", persistent: true }], exit_actions: [], transitions: [{ id: "to_trip", target_state_id: "trip", summary: "trip if signal.flame == false", enabled: true }] },
        { state_id: "trip", state_name: "Trip", state_type: "stop", badge_line: "trip", guard_summary: "none", timeout_summary: "none", guard_fail_summary: "none", entry_actions: [{ id: "trip_alarm", kind: "alarm_set_condition", summary: "alarm.trip=true", reason: "" }], active_actions: [{ id: "trip_fuel_bad", kind: "relay_request", summary: "relay.fuel=ON", reason: "unsafe demo", persistent: true }], exit_actions: [], transitions: [{ id: "to_lockout", target_state_id: "lockout", summary: "lockout", enabled: true }] },
        { state_id: "lockout", state_name: "Lockout", state_type: "lockout", badge_line: "lockout", guard_summary: "none", timeout_summary: "none", guard_fail_summary: "none", entry_actions: [], active_actions: [{ id: "lockout_ignition_off", kind: "relay_request", summary: "relay.ignition=OFF", reason: "safe off", persistent: true }], exit_actions: [], transitions: [] },
      ],
      selected_state: { state_id: "run" },
    },
    "pump.demo": {
      result_code: "MATRIX_UI_OK",
      message: "Program matrix detail refreshed.",
      has_matrix: true,
      has_warnings: false,
      read_only_note:
        "Read-only descriptor view. Matrix cells come only from state active_actions, not runtime arbitration.",
      matrix_title: "Pump Demo Output Matrix",
      empty_title: "",
      empty_message: "",
      runtime_summary: {
        code: "MATRIX_UI_OK",
        banner: "Program not active",
        active: false,
        selected_program_active: false,
        active_program_id: "burner.demo",
        lifecycle: "running",
        current_state: "run",
        lockout: "No",
        last_reason: "Another program owns runtime.",
      },
      columns: [
        { actuator_id: "relay.main", header_label: "Main Relay", sublabel: "relay.main", kind: "relay", role: "pump" },
        { actuator_id: "pwm.main", header_label: "Main PWM", sublabel: "pwm.main", kind: "pwm", role: "pump" },
      ],
      rows: [
        { state_id: "start", state_name: "Start", state_type: "action", currently_active: false, badges: ["initial"], cells: [{ actuator_id: "relay.main", label: "", cell_type: "none", empty: true, explicit_off: false, warning: "" }, { actuator_id: "pwm.main", label: "", cell_type: "none", empty: true, explicit_off: false, warning: "" }] },
        { state_id: "run", state_name: "Run", state_type: "run", currently_active: false, badges: [], cells: [{ actuator_id: "relay.main", label: "ON", cell_type: "relay_on", empty: false, explicit_off: false, warning: "" }, { actuator_id: "pwm.main", label: "PWM 45%", cell_type: "pwm_enabled", empty: false, explicit_off: false, warning: "" }] },
        { state_id: "stop", state_name: "Stop", state_type: "stop", currently_active: false, badges: ["stop"], cells: [{ actuator_id: "relay.main", label: "OFF", cell_type: "relay_off", empty: false, explicit_off: true, warning: "" }, { actuator_id: "pwm.main", label: "PWM OFF", cell_type: "pwm_disabled", empty: false, explicit_off: true, warning: "" }] },
      ],
      issues: [],
      legend: [
        { token: "blank", label: "Blank", description: "No persistent actuator action in that state." },
        { token: "ON", label: "ON", description: "Relay is held ON by an active_action." },
        { token: "OFF", label: "OFF", description: "Relay is held OFF explicitly by an active_action." },
        { token: "PWM", label: "PWM 45%", description: "PWM output is enabled and held at the shown duty." },
      ],
      state_details: [
        { state_id: "start", state_name: "Start", state_type: "action", badge_line: "initial", guard_summary: "none", timeout_summary: "none", guard_fail_summary: "none", entry_actions: [], active_actions: [], exit_actions: [], transitions: [{ id: "to_run", target_state_id: "run", summary: "run", enabled: true }] },
        { state_id: "run", state_name: "Run", state_type: "run", badge_line: "", guard_summary: "none", timeout_summary: "none", guard_fail_summary: "none", entry_actions: [], active_actions: [{ id: "run_main", kind: "relay_request", summary: "relay.main=ON", reason: "pump hold", persistent: true }], exit_actions: [], transitions: [{ id: "to_stop", target_state_id: "stop", summary: "stop if signal.pressure_high == true", enabled: true }] },
        { state_id: "stop", state_name: "Stop", state_type: "stop", badge_line: "stop", guard_summary: "none", timeout_summary: "none", guard_fail_summary: "none", entry_actions: [], active_actions: [{ id: "stop_main", kind: "relay_request", summary: "relay.main=OFF", reason: "pump off", persistent: true }], exit_actions: [], transitions: [] },
      ],
      selected_state: { state_id: "run" },
    },
  };

  const dataset = window.PROGRAM_MATRIX_BOOTSTRAP || {
    activeProgramId: "burner.demo",
    programs: [
      { id: "burner.demo", name: "Burner Demo", badge: "active" },
      { id: "pump.demo", name: "Pump Demo", badge: "idle" },
    ],
    views: sampleViews,
  };

  const els = {
    selector: document.getElementById("programSelector"),
    refreshButton: document.getElementById("refreshButton"),
    runtimeBanner: document.getElementById("runtimeBanner"),
    matrixTitle: document.getElementById("matrixTitle"),
    readOnlyNote: document.getElementById("readOnlyNote"),
    emptyState: document.getElementById("emptyState"),
    matrixWrap: document.getElementById("matrixWrap"),
    warningsPanel: document.getElementById("warningsPanel"),
    detailPanel: document.getElementById("detailPanel"),
    legendPanel: document.getElementById("legendPanel"),
  };

  const state = { programId: dataset.activeProgramId || "", stateId: "" };

  function esc(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderSelector() {
    const options = ['<option value="">Choose a program</option>'].concat(
      dataset.programs.map((program) => `<option value="${esc(program.id)}"${program.id === state.programId ? " selected" : ""}>${esc(program.name)} (${esc(program.badge)})</option>`)
    );
    els.selector.innerHTML = options.join("");
  }

  function renderRuntime(view) {
    els.runtimeBanner.innerHTML = `
      <div class="summary-grid">
        <div class="summary-item"><strong>Banner</strong><span>${esc(view.runtime_summary.banner)}</span></div>
        <div class="summary-item"><strong>Lifecycle</strong><span>${esc(view.runtime_summary.lifecycle)}</span></div>
        <div class="summary-item"><strong>Current State</strong><span>${esc(view.runtime_summary.current_state)}</span></div>
        <div class="summary-item"><strong>Lockout</strong><span>${esc(view.runtime_summary.lockout)}</span></div>
        <div class="summary-item"><strong>Last Reason</strong><span>${esc(view.runtime_summary.last_reason || "n/a")}</span></div>
      </div>`;
  }

  function renderWarnings(view) {
    els.warningsPanel.innerHTML = view.issues.length
      ? view.issues.map((issue) => `<div class="notice ${issue.blocking ? "error" : "warning"}"><strong>${esc(issue.code)}</strong><div>${esc(issue.message)}</div><div class="muted">${esc(issue.path)}</div></div>`).join("")
      : '<div class="notice">No matrix warnings for this program.</div>';
  }

  function renderLegend(view) {
    els.legendPanel.innerHTML = view.legend.map((item) => `<div class="legend-item"><span class="legend-token">${esc(item.label)}</span><strong>${esc(item.token)}</strong><div class="muted">${esc(item.description)}</div></div>`).join("");
  }

  function renderDetail(view) {
    const detail = view.state_details.find((item) => item.state_id === state.stateId) || view.state_details[0];
    if (!detail) {
      els.detailPanel.innerHTML = '<div class="notice">Select a state row to inspect detail.</div>';
      return;
    }
    state.stateId = detail.state_id;
    const renderList = (items) => items.length ? `<div class="detail-list">${items.map((item) => `<div class="detail-item"><strong>${esc(item.kind)}</strong><div>${esc(item.summary)}</div><div class="muted">${esc(item.reason || "")}</div></div>`).join("")}</div>` : '<div class="muted">None</div>';
    els.detailPanel.innerHTML = `
      <div class="detail-card">
        <div><strong>${esc(detail.state_name)}</strong></div>
        <div class="muted">${esc(detail.state_type)}${detail.badge_line ? " · " + esc(detail.badge_line) : ""}</div>
        <div class="detail-section"><h3>Entry Actions</h3>${renderList(detail.entry_actions || [])}</div>
        <div class="detail-section"><h3>Active Actions</h3>${renderList(detail.active_actions || [])}</div>
        <div class="detail-section"><h3>Exit Actions</h3>${renderList(detail.exit_actions || [])}</div>
        <div class="detail-section"><h3>Transitions</h3>${renderList((detail.transitions || []).map((item) => ({ kind: item.id, summary: item.summary, reason: "" })))}</div>
        <div class="detail-section"><h3>Guard</h3><div class="detail-item">${esc(detail.guard_summary || "none")}</div></div>
        <div class="detail-section"><h3>Timeout</h3><div class="detail-item">${esc(detail.timeout_summary || "none")}</div></div>
      </div>`;
  }

  function cellClass(cell) {
    if (cell.empty) return "cell cell-blank";
    if (cell.cell_type === "relay_on") return "cell cell-on";
    if (cell.cell_type === "relay_off" || cell.cell_type === "pwm_disabled") return "cell cell-off";
    return "cell cell-pwm";
  }

  function renderMatrix(view) {
    if (!view.has_matrix) {
      els.matrixWrap.innerHTML = "";
      return;
    }
    const head = `<tr><th class="state-meta">State</th>${view.columns.map((column) => `<th><div>${esc(column.header_label)}</div><div class="column-sub">${esc(column.role)} · ${esc(column.kind)}</div><div class="column-sub">${esc(column.sublabel)}</div></th>`).join("")}</tr>`;
    const body = view.rows.map((row) => {
      const badges = (row.badges || []).map((badge) => `<span class="badge">${esc(badge)}</span>`).join("");
      const cells = row.cells.map((cell) => `<td><div class="${cellClass(cell)}${cell.warning ? " cell-warning" : ""}" title="${esc(cell.warning || "")}">${cell.empty ? "&middot;" : esc(cell.label)}</div></td>`).join("");
      return `<tr class="${row.currently_active ? "active-row" : ""}" data-state-id="${esc(row.state_id)}"><td class="state-meta"><div><strong>${esc(row.state_name)}</strong></div><div class="muted">${esc(row.state_type)}</div><div class="badge-row">${badges}</div></td>${cells}</tr>`;
    }).join("");
    els.matrixWrap.innerHTML = `<table class="matrix-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
    els.matrixWrap.querySelectorAll("tbody tr").forEach((row) => row.addEventListener("click", () => { state.stateId = row.dataset.stateId || ""; renderDetail(view); }));
  }

  function renderView(view) {
    els.matrixTitle.textContent = view.matrix_title || "No program selected";
    els.readOnlyNote.textContent = view.read_only_note || "";
    if (!view.has_matrix) {
      els.emptyState.innerHTML = `<strong>${esc(view.empty_title || "Choose a program")}</strong><p class="muted">${esc(view.empty_message || "Use the selector to inspect a matrix.")}</p>`;
    } else {
      els.emptyState.innerHTML = "";
    }
    renderRuntime(view);
    renderMatrix(view);
    renderWarnings(view);
    renderLegend(view);
    renderDetail(view);
  }

  function loadProgram() {
    const view = dataset.views[state.programId];
    if (!view) {
      renderView({
        has_matrix: false,
        read_only_note: "Read-only descriptor view. Matrix cells come only from state active_actions, not runtime arbitration.",
        empty_title: "Choose a program",
        empty_message: "Use the selector to inspect a program matrix.",
        runtime_summary: { banner: "Program not selected", lifecycle: "idle", current_state: "Program not active", lockout: "No", last_reason: "" },
        issues: [],
        legend: sampleViews["burner.demo"].legend,
        state_details: [],
      });
      return;
    }
    state.stateId = (view.selected_state && view.selected_state.state_id) || state.stateId || "";
    renderView(view);
  }

  renderSelector();
  loadProgram();
  els.selector.addEventListener("change", (event) => { state.programId = event.target.value; state.stateId = ""; loadProgram(); });
  els.refreshButton.addEventListener("click", loadProgram);
})();
