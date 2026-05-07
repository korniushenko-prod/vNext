(function () {
  const ENDPOINTS = {
    catalog: "/ui/program-builder/catalog",
    preview: "/ui/program-builder/preview",
    create: "/ui/program-builder/create",
  };

  const fallbackModel = {
    code: "BUILDER_UI_OK",
    message: "Static fallback view loaded. Future HTTP binding can replace this transport.",
    refresh_timestamp_ms: Date.now(),
    value: {
      skeleton_kind: "custom_blank",
      skeleton_label: "Custom Blank",
      program_type: "custom",
      preview_valid: false,
      create_allowed: false,
      will_create_disabled: true,
      create_disabled_note: "Created programs are disabled by default in Stage 20 and do not auto-start.",
      advanced_editor_note: "Custom state editing and output matrix editing arrive in later stages.",
      skeleton_options: [
        { kind: "custom_blank", label: "Custom Blank", description: "Minimal review skeleton.", program_type: "custom", required_binding_count: 0, required_parameter_count: 0 },
        { kind: "pump_basic", label: "Pump Basic", description: "Primary output plus min run/off review timing.", program_type: "pump", required_binding_count: 1, required_parameter_count: 2 },
        { kind: "compressor_basic", label: "Compressor Basic", description: "Primary output plus cooldown review timing.", program_type: "compressor", required_binding_count: 1, required_parameter_count: 2 },
        { kind: "burner_supervisory_skeleton", label: "Burner Supervisory Skeleton", description: "Validated safety-facing burner scaffold with no hazardous defaults.", program_type: "burner", required_binding_count: 5, required_parameter_count: 3 },
        { kind: "incinerator_supervisory_skeleton", label: "Incinerator Supervisory Skeleton", description: "Validated supervisory scaffold with temperature thresholds captured for review.", program_type: "incinerator", required_binding_count: 4, required_parameter_count: 2 },
        { kind: "dosing_basic", label: "Dosing Basic", description: "Primary output plus target-volume review parameter.", program_type: "dosing", required_binding_count: 1, required_parameter_count: 1 },
      ],
      binding_fields: [],
      parameter_fields: [],
      preview_states: [],
      preview_transitions: [],
      warnings: [
        "Static fallback is showing structure only. Real preview data will arrive from the future ProgramBuilder adapter transport.",
      ],
      issues: [],
    },
    validation_issues: [],
  };

  const state = {
    model: fallbackModel,
    draft: {
      skeleton_kind: "custom_blank",
      program_id: "",
      program_name: "",
      description: "",
    },
  };

  const elements = {
    transportCode: document.getElementById("transport-code"),
    lastRefresh: document.getElementById("last-refresh"),
    errorBanner: document.getElementById("error-banner"),
    messageBanner: document.getElementById("message-banner"),
    skeletonSelect: document.getElementById("skeleton-select"),
    skeletonSummary: document.getElementById("skeleton-summary"),
    programId: document.getElementById("program-id"),
    programName: document.getElementById("program-name"),
    programDescription: document.getElementById("program-description"),
    programTypeLabel: document.getElementById("program-type-label"),
    bindingFields: document.getElementById("binding-fields"),
    parameterFields: document.getElementById("parameter-fields"),
    previewIssues: document.getElementById("preview-issues"),
    previewStates: document.getElementById("preview-states"),
    previewTransitions: document.getElementById("preview-transitions"),
    createButton: document.getElementById("create-button"),
    createNote: document.getElementById("create-note"),
    createResult: document.getElementById("create-result"),
    previewButton: document.getElementById("preview-button"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatTimestamp(value) {
    const date = new Date(Number(value || 0));
    return Number.isNaN(date.getTime()) ? "Waiting" : date.toLocaleTimeString();
  }

  function setBanner(element, message) {
    if (message) {
      element.textContent = message;
      element.classList.remove("hidden");
    } else {
      element.textContent = "";
      element.classList.add("hidden");
    }
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload && payload.message ? payload.message : `Request failed with HTTP ${response.status}`);
    }
    return payload;
  }

  function selectedSkeleton(model) {
    return (model.value && model.value.skeleton_options || []).find((entry) => entry.kind === state.draft.skeleton_kind);
  }

  function renderSkeletonOptions(model) {
    const options = model.value ? model.value.skeleton_options || [] : [];
    elements.skeletonSelect.innerHTML = options
      .map((entry) => `<option value="${escapeHtml(entry.kind)}">${escapeHtml(entry.label)}</option>`)
      .join("");
    elements.skeletonSelect.value = state.draft.skeleton_kind;

    const skeleton = selectedSkeleton(model);
    if (!skeleton) {
      elements.skeletonSummary.className = "stack-list empty-state";
      elements.skeletonSummary.textContent = "No skeleton selected yet.";
      return;
    }

    elements.skeletonSummary.className = "stack-list";
    elements.skeletonSummary.innerHTML = `
      <article class="stack-item">
        <h3>${escapeHtml(skeleton.label)}</h3>
        <p>${escapeHtml(skeleton.description)}</p>
        <p>Program type: ${escapeHtml(skeleton.program_type)} | Required bindings: ${skeleton.required_binding_count} | Required parameters: ${skeleton.required_parameter_count}</p>
      </article>`;
  }

  function renderBindingFields(model) {
    const fields = model.value ? model.value.binding_fields || [] : [];
    if (!fields.length) {
      elements.bindingFields.className = "stack-list empty-state";
      elements.bindingFields.textContent = "This skeleton does not require bindings in the static fallback.";
      return;
    }

    elements.bindingFields.className = "stack-list";
    elements.bindingFields.innerHTML = fields
      .map(
        (field) => `
          <article class="stack-item">
            <h3>${escapeHtml(field.label)}${field.required ? " required" : ""}</h3>
            <p>${escapeHtml(field.description)}</p>
            <p>Kind: ${escapeHtml(field.resource_kind)} | Constraints: ${escapeHtml(field.constraints || "n/a")}</p>
            <p>Available: ${escapeHtml((field.available_options || []).join(", ") || "no matching runtime entries")}</p>
            <p>Current value: ${escapeHtml(field.value || "not set")}${field.missing ? " | missing" : ""}</p>
          </article>`
      )
      .join("");
  }

  function renderParameterFields(model) {
    const fields = model.value ? model.value.parameter_fields || [] : [];
    if (!fields.length) {
      elements.parameterFields.className = "stack-list empty-state";
      elements.parameterFields.textContent = "This skeleton does not require parameters yet.";
      return;
    }

    elements.parameterFields.className = "stack-list";
    elements.parameterFields.innerHTML = fields
      .map(
        (field) => `
          <article class="stack-item">
            <h3>${escapeHtml(field.label)}${field.required ? " required" : ""}</h3>
            <p>${escapeHtml(field.description)}</p>
            <p>Type: ${escapeHtml(field.type)} | Range: ${escapeHtml(field.range_text || "n/a")}</p>
            <p>Current value: ${escapeHtml(field.value_text || "not set")}${field.missing ? " | missing" : ""}</p>
          </article>`
      )
      .join("");
  }

  function renderPreview(model) {
    const wizard = model.value || {};
    const issues = wizard.issues || [];
    const states = wizard.preview_states || [];
    const transitions = wizard.preview_transitions || [];

    if (!issues.length) {
      elements.previewIssues.className = "stack-list empty-state";
      elements.previewIssues.textContent = "No preview validation issues yet.";
    } else {
      elements.previewIssues.className = "stack-list";
      elements.previewIssues.innerHTML = issues
        .map(
          (issue) => `
            <article class="stack-item">
              <h3>${escapeHtml(issue.code)}</h3>
              <p>${escapeHtml(issue.message)}</p>
              <p>Path: ${escapeHtml(issue.path)} | Severity: ${escapeHtml(issue.severity)}</p>
            </article>`
        )
        .join("");
    }

    if (!states.length) {
      elements.previewStates.className = "stack-list empty-state";
      elements.previewStates.textContent = "No generated state list yet.";
    } else {
      elements.previewStates.className = "stack-list";
      elements.previewStates.innerHTML = states
        .map(
          (step) => `
            <article class="stack-item">
              <h3>${escapeHtml(step.state_name)}</h3>
              <p>State id: ${escapeHtml(step.state_id)} | Type: ${escapeHtml(step.type)} | Non-skippable: ${step.non_skippable ? "yes" : "no"}</p>
              <p>${escapeHtml(step.outputs_summary)}</p>
            </article>`
        )
        .join("");
    }

    if (!transitions.length) {
      elements.previewTransitions.className = "stack-list empty-state";
      elements.previewTransitions.textContent = "No transition summary yet.";
    } else {
      elements.previewTransitions.className = "stack-list";
      elements.previewTransitions.innerHTML = transitions
        .map((line) => `<article class="stack-item"><p>${escapeHtml(line)}</p></article>`)
        .join("");
    }

    elements.createButton.disabled = !wizard.create_allowed;
    elements.createNote.textContent = `${wizard.create_disabled_note || ""} ${wizard.advanced_editor_note || ""}`.trim();
  }

  function renderCreateResult(message) {
    elements.createResult.className = "stack-list";
    elements.createResult.innerHTML = `<article class="stack-item"><p>${escapeHtml(message)}</p></article>`;
  }

  function render(model) {
    state.model = model;
    const wizard = model.value || {};
    elements.transportCode.textContent = model.code || "BUILDER_UI_DATA_UNAVAILABLE";
    elements.lastRefresh.textContent = formatTimestamp(model.refresh_timestamp_ms);
    elements.programTypeLabel.textContent = wizard.program_type || "custom";
    elements.programId.value = state.draft.program_id;
    elements.programName.value = state.draft.program_name;
    elements.programDescription.value = state.draft.description;

    renderSkeletonOptions(model);
    renderBindingFields(model);
    renderParameterFields(model);
    renderPreview(model);

    const warningText = (wizard.warnings || []).join(" ");
    setBanner(elements.errorBanner, model.success ? "" : model.message || "Builder data unavailable.");
    setBanner(elements.messageBanner, model.success ? warningText || model.message || "" : "");
  }

  async function loadCatalog() {
    try {
      const payload = await fetchJson(ENDPOINTS.catalog);
      render(payload);
    } catch (error) {
      render(fallbackModel);
      setBanner(elements.messageBanner, fallbackModel.message);
      setBanner(elements.errorBanner, error.message || "Static fallback loaded.");
    }
  }

  elements.skeletonSelect.addEventListener("change", () => {
    state.draft.skeleton_kind = elements.skeletonSelect.value;
    const current = JSON.parse(JSON.stringify(fallbackModel));
    current.value.skeleton_kind = state.draft.skeleton_kind;
    current.value.skeleton_options = fallbackModel.value.skeleton_options;
    current.value.skeleton_label = selectedSkeleton({ value: current.value })?.label || "";
    render(current);
  });

  elements.programId.addEventListener("input", () => {
    state.draft.program_id = elements.programId.value;
  });
  elements.programName.addEventListener("input", () => {
    state.draft.program_name = elements.programName.value;
  });
  elements.programDescription.addEventListener("input", () => {
    state.draft.description = elements.programDescription.value;
  });

  elements.previewButton.addEventListener("click", () => {
    const current = JSON.parse(JSON.stringify(fallbackModel));
    current.value.preview_valid = false;
    current.value.create_allowed = false;
    current.value.issues = [
      {
        path: "draft.program_id",
        code: "BUILDER_UI_STATIC_PREVIEW",
        severity: "warning",
        message: "Static page placeholder: wire this button to the future preview endpoint for live validation.",
      },
    ];
    current.value.warnings = [
      "Static fallback preview shows page behavior only. Real preview data comes from the C++ adapter in a later binding step.",
    ];
    render(current);
  });

  elements.createButton.addEventListener("click", () => {
    renderCreateResult("Create transport is not bound in this static page yet. The backend contract is ready for future HTTP integration.");
  });

  loadCatalog();
})();
