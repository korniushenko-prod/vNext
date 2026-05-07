(function () {
  const stateTypes = ["generic", "wait", "action", "purge", "ignition", "run", "stop", "cooldown", "lockout", "custom"];
  const programTypes = ["generic", "pump", "compressor", "burner", "incinerator", "dosing", "custom"];
  const actionKinds = ["relay_request", "pwm_request", "timer_start", "timer_stop", "alarm_set_condition", "write_virtual_signal", "log_note"];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makePrograms() {
    return [
      {
        id: "pump1",
        name: "Pump 1",
        type: "pump",
        enabled: true,
        description: "Basic pump sequence loaded from SequenceService fallback data.",
        initial_state_id: "start",
        normal_stop_state_id: "stop",
        trip_state_id: "trip",
        lockout_state_id: "lockout",
        start_condition: "permit.start == true",
        reset_condition: "permit.reset == true",
        runtime: {
          active: false,
          lifecycle: "idle",
          current_state: "",
          previous_state: "",
          state_elapsed_ms: 0,
          pending_normal_stop: false,
          pending_trip: false,
          lockout: false,
          last_reason: "",
          transition_candidates: [],
        },
        states: [
          { id: "start", name: "Start", enabled: true, state_type: "action", non_skippable: false, manual_allowed: false, min_time_ms: "", max_time_ms: "", timeout_target_state_id: "", guard_fail_target_state_id: "", guard_condition: "", entry_actions: [], active_actions: [], exit_actions: [], transitions: [{ id: "to_run", name: "To Run", enabled: true, target_state_id: "run", require_min_time_done: false, condition_tree: "always" }] },
          { id: "run", name: "Run", enabled: true, state_type: "run", non_skippable: false, manual_allowed: true, min_time_ms: "1000", max_time_ms: "", timeout_target_state_id: "", guard_fail_target_state_id: "", guard_condition: "guard.ok == true", entry_actions: [], active_actions: [{ id: "run_relay", description: "Main relay on", kind: "relay_request", target: "relay.main", value: "on", reason: "run relay" }], exit_actions: [], transitions: [{ id: "to_stop", name: "To Stop", enabled: true, target_state_id: "stop", require_min_time_done: true, condition_tree: "transition.ready == true" }] },
          { id: "stop", name: "Stop", enabled: true, state_type: "stop", non_skippable: false, manual_allowed: false, min_time_ms: "", max_time_ms: "", timeout_target_state_id: "", guard_fail_target_state_id: "", guard_condition: "", entry_actions: [{ id: "stop_note", description: "Stop note", kind: "log_note", target: "", value: "Stopped", reason: "" }], active_actions: [], exit_actions: [], transitions: [] },
          { id: "trip", name: "Trip", enabled: true, state_type: "stop", non_skippable: true, manual_allowed: false, min_time_ms: "", max_time_ms: "", timeout_target_state_id: "", guard_fail_target_state_id: "", guard_condition: "", entry_actions: [{ id: "trip_alarm", description: "Trip alarm", kind: "alarm_set_condition", target: "alarm.trip", value: "true", reason: "" }], active_actions: [], exit_actions: [], transitions: [{ id: "to_lockout", name: "To Lockout", enabled: true, target_state_id: "lockout", require_min_time_done: false, condition_tree: "always" }] },
          { id: "lockout", name: "Lockout", enabled: true, state_type: "lockout", non_skippable: true, manual_allowed: false, min_time_ms: "", max_time_ms: "", timeout_target_state_id: "", guard_fail_target_state_id: "", guard_condition: "", entry_actions: [], active_actions: [], exit_actions: [], transitions: [] },
        ],
      },
      {
        id: "burner.demo",
        name: "Burner Demo",
        type: "burner",
        enabled: true,
        description: "Active fallback program to demonstrate read-only safety banner.",
        initial_state_id: "prepurge",
        normal_stop_state_id: "shutdown",
        trip_state_id: "trip",
        lockout_state_id: "lockout",
        start_condition: "signal.air_ok == true",
        reset_condition: "permit.reset == true",
        runtime: {
          active: true,
          lifecycle: "running",
          current_state: "fire",
          previous_state: "ignite",
          state_elapsed_ms: 4200,
          pending_normal_stop: false,
          pending_trip: false,
          lockout: false,
          last_reason: "steady run",
          transition_candidates: [
            { transition_id: "to_shutdown", target_state_id: "shutdown", eligible: false, reason: "condition false" },
            { transition_id: "to_trip", target_state_id: "trip", eligible: false, reason: "no trip request" },
          ],
        },
        states: [
          { id: "prepurge", name: "Prepurge", enabled: true, state_type: "purge", non_skippable: true, manual_allowed: false, min_time_ms: "3000", max_time_ms: "", timeout_target_state_id: "", guard_fail_target_state_id: "", guard_condition: "signal.air_ok == true", entry_actions: [], active_actions: [{ id: "fan_on", description: "Fan on", kind: "relay_request", target: "relay.fan", value: "on", reason: "purge" }], exit_actions: [], transitions: [{ id: "to_ignite", name: "To Ignite", enabled: true, target_state_id: "ignite", require_min_time_done: true, condition_tree: "always" }] },
          { id: "ignite", name: "Ignite", enabled: true, state_type: "ignition", non_skippable: true, manual_allowed: false, min_time_ms: "1000", max_time_ms: "8000", timeout_target_state_id: "trip", guard_fail_target_state_id: "trip", guard_condition: "signal.air_ok == true", entry_actions: [], active_actions: [{ id: "ignition", description: "Ignition on", kind: "relay_request", target: "relay.ignition", value: "on", reason: "ignite" }], exit_actions: [], transitions: [{ id: "to_fire", name: "To Fire", enabled: true, target_state_id: "fire", require_min_time_done: true, condition_tree: "signal.flame == true" }] },
          { id: "fire", name: "Fire", enabled: true, state_type: "run", non_skippable: false, manual_allowed: true, min_time_ms: "", max_time_ms: "", timeout_target_state_id: "", guard_fail_target_state_id: "trip", guard_condition: "signal.air_ok == true", entry_actions: [], active_actions: [{ id: "fuel_on", description: "Fuel on", kind: "relay_request", target: "relay.fuel", value: "on", reason: "fire" }], exit_actions: [], transitions: [{ id: "to_shutdown", name: "To Shutdown", enabled: true, target_state_id: "shutdown", require_min_time_done: false, condition_tree: "pending_normal_stop == true" }, { id: "to_trip", name: "To Trip", enabled: true, target_state_id: "trip", require_min_time_done: false, condition_tree: "pending_trip == true" }] },
          { id: "shutdown", name: "Shutdown", enabled: true, state_type: "stop", non_skippable: false, manual_allowed: false, min_time_ms: "", max_time_ms: "", timeout_target_state_id: "", guard_fail_target_state_id: "", guard_condition: "", entry_actions: [], active_actions: [], exit_actions: [], transitions: [] },
          { id: "trip", name: "Trip", enabled: true, state_type: "stop", non_skippable: true, manual_allowed: false, min_time_ms: "", max_time_ms: "", timeout_target_state_id: "", guard_fail_target_state_id: "", guard_condition: "", entry_actions: [{ id: "trip_note", description: "Trip note", kind: "log_note", target: "", value: "Trip", reason: "" }], active_actions: [], exit_actions: [], transitions: [{ id: "to_lockout", name: "To Lockout", enabled: true, target_state_id: "lockout", require_min_time_done: false, condition_tree: "always" }] },
          { id: "lockout", name: "Lockout", enabled: true, state_type: "lockout", non_skippable: true, manual_allowed: false, min_time_ms: "", max_time_ms: "", timeout_target_state_id: "", guard_fail_target_state_id: "", guard_condition: "", entry_actions: [], active_actions: [], exit_actions: [], transitions: [] },
        ],
      },
    ];
  }

  const model = {
    programs: makePrograms(),
    selectedProgramId: "pump1",
    selectedStateId: "start",
    transportCode: "PROGRAM_EDITOR_OK",
    message: "Static fallback page loaded. Future binding can connect these forms to ProgramEditorApiService.",
    error: "",
  };

  const elements = {
    transportCode: document.getElementById("transport-code"),
    lastRefresh: document.getElementById("last-refresh"),
    errorBanner: document.getElementById("error-banner"),
    messageBanner: document.getElementById("message-banner"),
    commandBanner: document.getElementById("command-banner"),
    programList: document.getElementById("program-list"),
    runtimePanel: document.getElementById("runtime-panel"),
    issuesPanel: document.getElementById("issues-panel"),
    previewPanel: document.getElementById("preview-panel"),
    statesList: document.getElementById("states-list"),
    stateDetail: document.getElementById("state-detail"),
    selectedStateLabel: document.getElementById("selected-state-label"),
    programId: document.getElementById("program-id"),
    programName: document.getElementById("program-name"),
    programType: document.getElementById("program-type"),
    programEnabled: document.getElementById("program-enabled"),
    programDescription: document.getElementById("program-description"),
    initialState: document.getElementById("initial-state-id"),
    normalStopState: document.getElementById("normal-stop-state-id"),
    tripState: document.getElementById("trip-state-id"),
    lockoutState: document.getElementById("lockout-state-id"),
    startCondition: document.getElementById("start-condition"),
    resetCondition: document.getElementById("reset-condition"),
    saveButton: document.getElementById("save-button"),
    deleteButton: document.getElementById("delete-button"),
    enableButton: document.getElementById("enable-button"),
    disableButton: document.getElementById("disable-button"),
    previewButton: document.getElementById("preview-button"),
    refreshButton: document.getElementById("refresh-button"),
    addStateButton: document.getElementById("add-state-button"),
    cloneStateButton: document.getElementById("clone-state-button"),
    removeStateButton: document.getElementById("remove-state-button"),
    moveStateUpButton: document.getElementById("move-state-up-button"),
    moveStateDownButton: document.getElementById("move-state-down-button"),
  };

  function currentProgram() {
    return model.programs.find((program) => program.id === model.selectedProgramId) || model.programs[0];
  }

  function selectedState() {
    const program = currentProgram();
    return program.states.find((item) => item.id === model.selectedStateId) || program.states[0];
  }

  function uniqueId(base, existing) {
    let index = 1;
    let candidate = `${base}_${index}`;
    while (existing.includes(candidate)) {
      index += 1;
      candidate = `${base}_${index}`;
    }
    return candidate;
  }

  function stateOptions(program) {
    return program.states.map((item) => `<option value="${item.id}">${item.id}</option>`).join("");
  }

  function issue(code, message, path) {
    return { code, message, path };
  }

  function validate(program) {
    const issues = [];
    const ids = new Set();

    if (!program.name.trim()) {
      issues.push(issue("PROGRAM_EDITOR_EMPTY_NAME", "Program name must not be empty.", "program.name"));
    }
    if (!program.states.length) {
      issues.push(issue("PROGRAM_EDITOR_EMPTY_STATES", "Program must keep at least one state.", "program.states"));
    }

    program.states.forEach((item, index) => {
      if (ids.has(item.id)) {
        issues.push(issue("PROGRAM_EDITOR_DUPLICATE_STATE_ID", `Duplicate state id '${item.id}' is not allowed.`, `program.states[${index}].id`));
      }
      ids.add(item.id);

      if (item.max_time_ms && !item.timeout_target_state_id) {
        issues.push(issue("PROGRAM_EDITOR_INVALID_TIMEOUT_TARGET", `State '${item.id}' needs a timeout target when max_time_ms is set.`, `program.states[${index}].timeout_target_state_id`));
      }
      if (item.timeout_target_state_id && !program.states.some((candidate) => candidate.id === item.timeout_target_state_id)) {
        issues.push(issue("PROGRAM_EDITOR_INVALID_TIMEOUT_TARGET", `Timeout target '${item.timeout_target_state_id}' was not found.`, `program.states[${index}].timeout_target_state_id`));
      }
      if (item.guard_fail_target_state_id && !program.states.some((candidate) => candidate.id === item.guard_fail_target_state_id)) {
        issues.push(issue("PROGRAM_EDITOR_INVALID_GUARD_TARGET", `Guard fail target '${item.guard_fail_target_state_id}' was not found.`, `program.states[${index}].guard_fail_target_state_id`));
      }

      item.transitions.forEach((transition, transitionIndex) => {
        if (!program.states.some((candidate) => candidate.id === transition.target_state_id)) {
          issues.push(issue("PROGRAM_EDITOR_INVALID_TRANSITION_TARGET", `Transition '${transition.id}' points to missing state '${transition.target_state_id}'.`, `program.states[${index}].transitions[${transitionIndex}].target_state_id`));
        }
      });
    });

    ["initial_state_id", "normal_stop_state_id", "trip_state_id", "lockout_state_id"].forEach((field) => {
      if (!ids.has(program[field])) {
        issues.push(issue("PROGRAM_EDITOR_MISSING_SPECIAL_STATE", `Special state '${field}' must reference an existing state.`, `program.${field}`));
      }
    });

    if (program.runtime.active) {
      issues.push(issue("PROGRAM_EDITOR_ACTIVE_PROGRAM_EDIT_DENIED", "Active program is read-only and cannot be saved in Stage 21.", "program.runtime"));
    }

    return issues;
  }

  function preview(program) {
    const issues = validate(program);
    return {
      issues,
      saveAllowed: issues.length === 0,
      warnings: program.runtime.active ? ["Active program is read-only. Save and delete remain denied until it stops."] : [],
      stateLines: program.states.map((item) => `${item.id} | ${item.state_type} | transitions=${item.transitions.length}`),
      transitionLines: program.states.flatMap((item) => item.transitions.map((transition) => `${item.id} -> ${transition.target_state_id}`)),
    };
  }

  function renderBanner(element, message, hiddenWhenEmpty) {
    if (!message) {
      element.textContent = "";
      if (hiddenWhenEmpty) {
        element.classList.add("hidden");
      }
      return;
    }
    element.textContent = message;
    element.classList.remove("hidden");
  }

  function renderProgramList() {
    const program = currentProgram();
    elements.programList.innerHTML = model.programs
      .map((item) => `
        <button class="state-card ${item.id === program.id ? "active" : ""}" type="button" data-program-id="${item.id}">
          <strong>${item.name}</strong>
          <div class="meta-line">
            <span>${item.id}</span>
            <span class="badge">${item.runtime.active ? "active" : item.enabled ? "idle" : "disabled"}</span>
          </div>
        </button>`)
      .join("");

    Array.from(elements.programList.querySelectorAll("[data-program-id]")).forEach((button) => {
      button.addEventListener("click", () => {
        model.selectedProgramId = button.dataset.programId;
        model.selectedStateId = currentProgram().states.length ? currentProgram().states[0].id : "";
        render();
      });
    });
  }

  function renderMetadata(program) {
    elements.programId.value = program.id;
    elements.programName.value = program.name;
    elements.programDescription.value = program.description || "";
    elements.programEnabled.checked = program.enabled;
    elements.startCondition.value = program.start_condition || "";
    elements.resetCondition.value = program.reset_condition || "";
    elements.programType.innerHTML = programTypes.map((type) => `<option value="${type}">${type}</option>`).join("");
    elements.programType.value = program.type;
    [elements.initialState, elements.normalStopState, elements.tripState, elements.lockoutState].forEach((select) => {
      select.innerHTML = stateOptions(program);
    });
    elements.initialState.value = program.initial_state_id;
    elements.normalStopState.value = program.normal_stop_state_id;
    elements.tripState.value = program.trip_state_id;
    elements.lockoutState.value = program.lockout_state_id;
  }

  function renderRuntime(program) {
    const runtime = program.runtime;
    elements.runtimePanel.innerHTML = `
      <article class="runtime-card">
        <div class="meta-line">
          <span>Status: ${runtime.active ? "active" : "inactive"}</span>
          <span>Lifecycle: ${runtime.active ? runtime.lifecycle : "idle"}</span>
          <span>Lockout: ${runtime.lockout ? "yes" : "no"}</span>
        </div>
        <div class="meta-line">
          <span>Current: ${runtime.current_state || "Program not active"}</span>
          <span>Previous: ${runtime.previous_state || "-"}</span>
          <span>Elapsed: ${runtime.state_elapsed_ms} ms</span>
        </div>
        <div class="meta-line">
          <span>Pending normal stop: ${runtime.pending_normal_stop ? "yes" : "no"}</span>
          <span>Pending trip: ${runtime.pending_trip ? "yes" : "no"}</span>
        </div>
        <p class="muted">Last reason: ${runtime.last_reason || "none"}</p>
      </article>
      ${runtime.transition_candidates.length ? runtime.transition_candidates.map((candidate) => `
        <article class="runtime-card">
          <strong>${candidate.transition_id}</strong>
          <p>${candidate.target_state_id}</p>
          <p class="muted">${candidate.eligible ? "eligible" : "not eligible"} | ${candidate.reason}</p>
        </article>`).join("") : '<article class="runtime-card"><p class="muted">No transition candidate checklist available while inactive.</p></article>'}
    `;
  }

  function renderStates(program) {
    elements.statesList.innerHTML = program.states
      .map((item) => `
        <button class="state-card ${item.id === model.selectedStateId ? "active" : ""}" type="button" data-state-id="${item.id}">
          <strong>${item.name}</strong>
          <div class="meta-line">
            <span>${item.id}</span>
            <span>${item.state_type}</span>
            <span>${item.transitions.length} transition(s)</span>
          </div>
        </button>`)
      .join("");

    Array.from(elements.statesList.querySelectorAll("[data-state-id]")).forEach((button) => {
      button.addEventListener("click", () => {
        model.selectedStateId = button.dataset.stateId;
        render();
      });
    });
  }

  function actionEditor(sectionName, actions) {
    return `
      <article class="stack-item">
        <div class="panel-header">
          <h3>${sectionName}</h3>
          <button type="button" data-add-action="${sectionName}">Add Action</button>
        </div>
        <div class="action-list">
          ${actions.length ? actions.map((action, index) => `
            <div class="stack-item">
              <div class="inline-fields">
                <label>Action ID<input type="text" data-action-field="${sectionName}" data-action-index="${index}" data-field-name="id" value="${action.id}" /></label>
                <label>Kind<select data-action-field="${sectionName}" data-action-index="${index}" data-field-name="kind">${actionKinds.map((kind) => `<option value="${kind}" ${kind === action.kind ? "selected" : ""}>${kind}</option>`).join("")}</select></label>
              </div>
              <div class="inline-fields">
                <label>Description<input type="text" data-action-field="${sectionName}" data-action-index="${index}" data-field-name="description" value="${action.description || ""}" /></label>
                <label>Target<input type="text" data-action-field="${sectionName}" data-action-index="${index}" data-field-name="target" value="${action.target || ""}" /></label>
              </div>
              <div class="inline-fields">
                <label>Value<input type="text" data-action-field="${sectionName}" data-action-index="${index}" data-field-name="value" value="${action.value || ""}" /></label>
                <label>Reason / Note<input type="text" data-action-field="${sectionName}" data-action-index="${index}" data-field-name="reason" value="${action.reason || ""}" /></label>
              </div>
              <button type="button" data-remove-action="${sectionName}" data-action-index="${index}">Remove Action</button>
            </div>`).join("") : '<p class="muted">No actions in this section.</p>'}
        </div>
      </article>`;
  }

  function bindStateDetail(program, item) {
    const assign = (field, value) => {
      item[field] = value;
      render();
    };

    document.getElementById("state-id-field").addEventListener("input", (event) => assign("id", event.target.value));
    document.getElementById("state-name-field").addEventListener("input", (event) => assign("name", event.target.value));
    document.getElementById("state-type-field").addEventListener("change", (event) => assign("state_type", event.target.value));
    document.getElementById("state-guard-field").addEventListener("input", (event) => assign("guard_condition", event.target.value));
    document.getElementById("state-min-field").addEventListener("input", (event) => assign("min_time_ms", event.target.value));
    document.getElementById("state-max-field").addEventListener("input", (event) => assign("max_time_ms", event.target.value));
    document.getElementById("state-timeout-field").addEventListener("input", (event) => assign("timeout_target_state_id", event.target.value));
    document.getElementById("state-guard-target-field").addEventListener("input", (event) => assign("guard_fail_target_state_id", event.target.value));
    document.getElementById("state-enabled-field").addEventListener("change", (event) => assign("enabled", event.target.checked));
    document.getElementById("state-non-skippable-field").addEventListener("change", (event) => assign("non_skippable", event.target.checked));
    document.getElementById("state-manual-field").addEventListener("change", (event) => assign("manual_allowed", event.target.checked));

    document.getElementById("add-transition-button").addEventListener("click", () => {
      const ids = item.transitions.map((transition) => transition.id);
      item.transitions.push({ id: uniqueId("transition", ids), name: "New Transition", enabled: true, target_state_id: item.id, require_min_time_done: false, condition_tree: "" });
      render();
    });

    document.getElementById("move-transition-up-button").addEventListener("click", () => {
      if (item.transitions.length > 1) {
        const [first, second] = item.transitions;
        item.transitions[0] = second;
        item.transitions[1] = first;
        render();
      }
    });

    document.getElementById("move-transition-down-button").addEventListener("click", () => {
      if (item.transitions.length > 1) {
        const first = item.transitions.shift();
        item.transitions.push(first);
        render();
      }
    });

    Array.from(elements.stateDetail.querySelectorAll("[data-transition-index]")).forEach((node) => {
      const index = Number(node.dataset.transitionIndex);
      const field = node.dataset.transitionField;
      node.addEventListener(node.type === "checkbox" ? "change" : "input", (event) => {
        item.transitions[index][field] = node.type === "checkbox" ? event.target.checked : event.target.value;
      });
    });
    Array.from(elements.stateDetail.querySelectorAll("[data-remove-transition]")).forEach((button) => {
      button.addEventListener("click", () => {
        item.transitions.splice(Number(button.dataset.removeTransition), 1);
        render();
      });
    });

    Array.from(elements.stateDetail.querySelectorAll("[data-add-action]")).forEach((button) => {
      button.addEventListener("click", () => {
        const section = button.dataset.addAction;
        const ids = item[section].map((action) => action.id);
        item[section].push({ id: uniqueId("action", ids), description: "New action", kind: "log_note", target: "", value: "", reason: "" });
        render();
      });
    });

    Array.from(elements.stateDetail.querySelectorAll("[data-action-field]")).forEach((node) => {
      const section = node.dataset.actionField;
      const index = Number(node.dataset.actionIndex);
      const fieldName = node.dataset.fieldName;
      node.addEventListener(node.tagName === "SELECT" ? "change" : "input", (event) => {
        item[section][index][fieldName] = event.target.value;
      });
    });
    Array.from(elements.stateDetail.querySelectorAll("[data-remove-action]")).forEach((button) => {
      button.addEventListener("click", () => {
        const section = button.dataset.removeAction;
        item[section].splice(Number(button.dataset.actionIndex), 1);
        render();
      });
    });
  }

  function renderStateDetail(program) {
    const item = selectedState();
    if (!item) {
      elements.selectedStateLabel.textContent = "No state selected";
      elements.stateDetail.innerHTML = '<article class="stack-item"><p class="muted">Select a state to edit its fields.</p></article>';
      return;
    }

    elements.selectedStateLabel.textContent = item.id;
    elements.stateDetail.innerHTML = `
      <article class="stack-item">
        <div class="inline-fields">
          <label>State ID<input id="state-id-field" type="text" value="${item.id}" /></label>
          <label>Name<input id="state-name-field" type="text" value="${item.name}" /></label>
        </div>
        <div class="inline-fields">
          <label>Type<select id="state-type-field">${stateTypes.map((type) => `<option value="${type}" ${type === item.state_type ? "selected" : ""}>${type}</option>`).join("")}</select></label>
          <label>Guard Condition<textarea id="state-guard-field" rows="2">${item.guard_condition || ""}</textarea></label>
        </div>
        <div class="inline-fields">
          <label>Min Time ms<input id="state-min-field" type="text" value="${item.min_time_ms || ""}" /></label>
          <label>Max Time ms<input id="state-max-field" type="text" value="${item.max_time_ms || ""}" /></label>
        </div>
        <div class="inline-fields">
          <label>Timeout Target<input id="state-timeout-field" type="text" value="${item.timeout_target_state_id || ""}" /></label>
          <label>Guard Fail Target<input id="state-guard-target-field" type="text" value="${item.guard_fail_target_state_id || ""}" /></label>
        </div>
        <div class="inline-fields">
          <label class="checkbox"><input id="state-enabled-field" type="checkbox" ${item.enabled ? "checked" : ""} /> Enabled</label>
          <label class="checkbox"><input id="state-non-skippable-field" type="checkbox" ${item.non_skippable ? "checked" : ""} /> Non-skippable</label>
          <label class="checkbox"><input id="state-manual-field" type="checkbox" ${item.manual_allowed ? "checked" : ""} /> Manual allowed</label>
        </div>
      </article>
      <article class="stack-item">
        <div class="panel-header">
          <h3>Transitions</h3>
          <div class="button-strip">
            <button type="button" id="add-transition-button">Add Transition</button>
            <button type="button" id="move-transition-up-button">Move First Up</button>
            <button type="button" id="move-transition-down-button">Move First Down</button>
          </div>
        </div>
        <div class="transition-list">
          ${item.transitions.length ? item.transitions.map((transition, index) => `
            <div class="stack-item">
              <div class="inline-fields">
                <label>ID<input type="text" data-transition-index="${index}" data-transition-field="id" value="${transition.id}" /></label>
                <label>Name<input type="text" data-transition-index="${index}" data-transition-field="name" value="${transition.name}" /></label>
              </div>
              <div class="inline-fields">
                <label>Target State<input type="text" data-transition-index="${index}" data-transition-field="target_state_id" value="${transition.target_state_id}" /></label>
                <label>Condition<textarea data-transition-index="${index}" data-transition-field="condition_tree" rows="2">${transition.condition_tree || ""}</textarea></label>
              </div>
              <div class="inline-fields">
                <label class="checkbox"><input type="checkbox" data-transition-index="${index}" data-transition-field="enabled" ${transition.enabled ? "checked" : ""} /> Enabled</label>
                <label class="checkbox"><input type="checkbox" data-transition-index="${index}" data-transition-field="require_min_time_done" ${transition.require_min_time_done ? "checked" : ""} /> Require min time done</label>
              </div>
              <button type="button" data-remove-transition="${index}">Remove Transition</button>
            </div>`).join("") : '<p class="muted">No transitions in this state.</p>'}
        </div>
      </article>
      ${actionEditor("entry_actions", item.entry_actions)}
      ${actionEditor("active_actions", item.active_actions)}
      ${actionEditor("exit_actions", item.exit_actions)}
    `;

    bindStateDetail(program, item);
  }

  function renderIssues(program) {
    const details = preview(program);
    elements.issuesPanel.innerHTML = details.issues.length
      ? details.issues.map((item) => `
          <article class="stack-item">
            <strong>${item.code}</strong>
            <p>${item.message}</p>
            <p class="muted">${item.path}</p>
          </article>`).join("")
      : '<article class="stack-item"><p class="muted">No validation issues. Save is allowed for inactive programs.</p></article>';

    elements.previewPanel.innerHTML = `
      <article class="stack-item">
        <strong>Save allowed</strong>
        <p>${details.saveAllowed ? "yes" : "no"}</p>
      </article>
      ${details.warnings.map((warning) => `<article class="stack-item"><p>${warning}</p></article>`).join("")}
      <article class="stack-item">
        <strong>State summary</strong>
        <p>${details.stateLines.join(" | ") || "none"}</p>
      </article>
      <article class="stack-item">
        <strong>Transition summary</strong>
        <p>${details.transitionLines.join(" | ") || "none"}</p>
      </article>`;

    elements.saveButton.disabled = !details.saveAllowed;
    elements.deleteButton.disabled = program.runtime.active;
    elements.enableButton.disabled = program.enabled;
    elements.disableButton.disabled = program.runtime.active || !program.enabled;
    elements.commandBanner.textContent = program.runtime.active ? "Active program is read-only" : "Inactive program can be previewed and saved";
  }

  function render() {
    const program = currentProgram();
    model.selectedStateId = program.states.some((item) => item.id === model.selectedStateId)
      ? model.selectedStateId
      : (program.states.length ? program.states[0].id : "");
    elements.transportCode.textContent = model.transportCode;
    elements.lastRefresh.textContent = new Date().toLocaleTimeString();
    renderBanner(elements.errorBanner, model.error, true);
    renderBanner(elements.messageBanner, model.message, true);
    renderProgramList();
    renderMetadata(program);
    renderRuntime(program);
    renderStates(program);
    renderStateDetail(program);
    renderIssues(program);
  }

  elements.programName.addEventListener("input", (event) => {
    currentProgram().name = event.target.value;
    render();
  });
  elements.programType.addEventListener("change", (event) => {
    currentProgram().type = event.target.value;
    render();
  });
  elements.programEnabled.addEventListener("change", (event) => {
    currentProgram().enabled = event.target.checked;
    render();
  });
  elements.programDescription.addEventListener("input", (event) => {
    currentProgram().description = event.target.value;
  });
  elements.initialState.addEventListener("change", (event) => {
    currentProgram().initial_state_id = event.target.value;
    render();
  });
  elements.normalStopState.addEventListener("change", (event) => {
    currentProgram().normal_stop_state_id = event.target.value;
    render();
  });
  elements.tripState.addEventListener("change", (event) => {
    currentProgram().trip_state_id = event.target.value;
    render();
  });
  elements.lockoutState.addEventListener("change", (event) => {
    currentProgram().lockout_state_id = event.target.value;
    render();
  });
  elements.startCondition.addEventListener("input", (event) => {
    currentProgram().start_condition = event.target.value;
  });
  elements.resetCondition.addEventListener("input", (event) => {
    currentProgram().reset_condition = event.target.value;
  });

  elements.addStateButton.addEventListener("click", () => {
    const program = currentProgram();
    const ids = program.states.map((item) => item.id);
    const newId = uniqueId("state", ids);
    program.states.push({
      id: newId,
      name: "New State",
      enabled: true,
      state_type: "custom",
      non_skippable: false,
      manual_allowed: false,
      min_time_ms: "",
      max_time_ms: "",
      timeout_target_state_id: "",
      guard_fail_target_state_id: "",
      guard_condition: "",
      entry_actions: [],
      active_actions: [],
      exit_actions: [],
      transitions: [],
    });
    model.selectedStateId = newId;
    render();
  });

  elements.cloneStateButton.addEventListener("click", () => {
    const program = currentProgram();
    const current = selectedState();
    if (!current) {
      return;
    }
    const ids = program.states.map((item) => item.id);
    const cloned = clone(current);
    cloned.id = uniqueId(`${current.id}_copy`, ids);
    cloned.name = `${current.name} Copy`;
    cloned.transitions = cloned.transitions.map((transition) => ({ ...transition, id: `${transition.id}_copy` }));
    program.states.push(cloned);
    model.selectedStateId = cloned.id;
    render();
  });

  elements.removeStateButton.addEventListener("click", () => {
    const program = currentProgram();
    const index = program.states.findIndex((item) => item.id === model.selectedStateId);
    if (index >= 0) {
      program.states.splice(index, 1);
      model.selectedStateId = program.states.length ? program.states[0].id : "";
      render();
    }
  });

  elements.moveStateUpButton.addEventListener("click", () => {
    const program = currentProgram();
    const index = program.states.findIndex((item) => item.id === model.selectedStateId);
    if (index > 0) {
      const temp = program.states[index - 1];
      program.states[index - 1] = program.states[index];
      program.states[index] = temp;
      render();
    }
  });

  elements.moveStateDownButton.addEventListener("click", () => {
    const program = currentProgram();
    const index = program.states.findIndex((item) => item.id === model.selectedStateId);
    if (index >= 0 && index < program.states.length - 1) {
      const temp = program.states[index + 1];
      program.states[index + 1] = program.states[index];
      program.states[index] = temp;
      render();
    }
  });

  elements.previewButton.addEventListener("click", () => {
    model.message = "Preview refreshed from the local fallback model. Wire this action to ProgramEditorApiService for live validation later.";
    model.error = "";
    render();
  });

  elements.saveButton.addEventListener("click", () => {
    model.message = "Static fallback save complete. Real save should call the safe inactive-only SequenceService replace flow.";
    model.error = "";
    render();
  });

  elements.deleteButton.addEventListener("click", () => {
    const active = currentProgram().runtime.active;
    if (active) {
      model.error = "Active program delete is denied in Stage 21.";
    } else {
      const id = currentProgram().id;
      model.programs = model.programs.filter((item) => item.id !== id);
      model.selectedProgramId = model.programs.length ? model.programs[0].id : "";
      model.selectedStateId = model.programs.length && currentProgram().states.length ? currentProgram().states[0].id : "";
      model.error = "";
      model.message = `Program '${id}' deleted from the static fallback list.`;
    }
    render();
  });

  elements.enableButton.addEventListener("click", () => {
    currentProgram().enabled = true;
    model.message = "Program enabled in the fallback model.";
    model.error = "";
    render();
  });

  elements.disableButton.addEventListener("click", () => {
    const program = currentProgram();
    if (program.runtime.active) {
      model.error = "Active program disable is denied in Stage 21.";
    } else {
      program.enabled = false;
      model.error = "";
      model.message = "Program disabled in the fallback model.";
    }
    render();
  });

  elements.refreshButton.addEventListener("click", () => {
    model.message = "Local fallback data refreshed.";
    model.error = "";
    render();
  });

  render();
})();
