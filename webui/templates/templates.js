const templates = [
  {
    kind: "pressure_pump",
    label: "Pressure Pump",
    description: "Relay-driven pressure pump bundle with low/high pressure rules and optional high-pressure trip supervision.",
    supervisory: false,
    states: [],
    bindings: [
      { id: "pressure_signal", label: "Pressure Signal", required: true, kind: "signal", constraints: "numeric signal" },
      { id: "primary_output", label: "Primary Output", required: true, kind: "actuator", constraints: "relay actuator" }
    ],
    parameters: [
      { id: "start_threshold", label: "Start Threshold", required: true, type: "double" },
      { id: "stop_threshold", label: "Stop Threshold", required: true, type: "double" },
      { id: "hysteresis", label: "Hysteresis", required: true, type: "double" },
      { id: "high_trip_threshold", label: "High Trip Threshold", required: false, type: "double" }
    ]
  },
  {
    kind: "pump_with_flowmeter",
    label: "Pump With Flowmeter",
    description: "Pressure pump bundle extended with no-flow supervision and a dedicated no-flow trip alarm.",
    supervisory: false,
    states: [],
    bindings: [
      { id: "pressure_signal", label: "Pressure Signal", required: true, kind: "signal", constraints: "numeric signal" },
      { id: "flow_rate_signal", label: "Flow Rate Signal", required: true, kind: "signal", constraints: "numeric signal" },
      { id: "primary_output", label: "Primary Output", required: true, kind: "actuator", constraints: "relay actuator" }
    ],
    parameters: [
      { id: "start_threshold", label: "Start Threshold", required: true, type: "double" },
      { id: "stop_threshold", label: "Stop Threshold", required: true, type: "double" },
      { id: "hysteresis", label: "Hysteresis", required: true, type: "double" },
      { id: "min_flow_threshold", label: "Min Flow Threshold", required: true, type: "double" },
      { id: "high_trip_threshold", label: "High Trip Threshold", required: false, type: "double" }
    ]
  },
  {
    kind: "batch_dosing",
    label: "Batch Dosing",
    description: "Safe supervisory dosing skeleton with READY_CHECK, DISPENSE and lockout branches.",
    supervisory: false,
    states: ["READY_CHECK", "START", "DISPENSE", "COMPLETE", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"],
    bindings: [
      { id: "primary_output", label: "Primary Output", required: true, kind: "actuator", constraints: "relay or pwm actuator" },
      { id: "batch_done_signal", label: "Batch Done Signal", required: false, kind: "signal", constraints: "boolean signal" },
      { id: "fault_signal", label: "Fault Signal", required: false, kind: "signal", constraints: "boolean signal" }
    ],
    parameters: [
      { id: "target_volume", label: "Target Volume", required: true, type: "double" }
    ]
  },
  {
    kind: "pid_pressure_pwm_pump",
    label: "PID Pressure PWM Pump",
    description: "PID descriptor bundle for a pressure-controlled PWM pump with optional high-pressure alarm generation.",
    supervisory: false,
    states: [],
    bindings: [
      { id: "pressure_signal", label: "Pressure Signal", required: true, kind: "signal", constraints: "numeric signal" },
      { id: "pwm_output", label: "PWM Output", required: true, kind: "actuator", constraints: "pwm actuator" }
    ],
    parameters: [
      { id: "setpoint", label: "Setpoint", required: true, type: "double" },
      { id: "kp", label: "Kp", required: true, type: "double" },
      { id: "ki", label: "Ki", required: true, type: "double" },
      { id: "kd", label: "Kd", required: true, type: "double" },
      { id: "output_min", label: "Output Min", required: true, type: "double" },
      { id: "output_max", label: "Output Max", required: true, type: "double" },
      { id: "deadband", label: "Deadband", required: true, type: "double" },
      { id: "high_trip_threshold", label: "High Trip Threshold", required: false, type: "double" }
    ]
  },
  {
    kind: "pid_flow_pwm_pump",
    label: "PID Flow PWM Pump",
    description: "PID descriptor bundle for a flow-controlled PWM pump.",
    supervisory: false,
    states: [],
    bindings: [
      { id: "flow_rate_signal", label: "Flow Rate Signal", required: true, kind: "signal", constraints: "numeric signal" },
      { id: "pwm_output", label: "PWM Output", required: true, kind: "actuator", constraints: "pwm actuator" }
    ],
    parameters: [
      { id: "setpoint", label: "Setpoint", required: true, type: "double" },
      { id: "kp", label: "Kp", required: true, type: "double" },
      { id: "ki", label: "Ki", required: true, type: "double" },
      { id: "kd", label: "Kd", required: true, type: "double" },
      { id: "output_min", label: "Output Min", required: true, type: "double" },
      { id: "output_max", label: "Output Max", required: true, type: "double" },
      { id: "deadband", label: "Deadband", required: true, type: "double" }
    ]
  },
  {
    kind: "compressor_basic",
    label: "Compressor Basic",
    description: "Basic supervisory compressor skeleton with cooldown and optional pressure/fault alarms.",
    supervisory: false,
    states: ["OFF", "READY_CHECK", "START", "RUN", "COOLDOWN", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"],
    bindings: [
      { id: "main_output", label: "Main Output", required: true, kind: "actuator", constraints: "relay actuator" },
      { id: "pressure_signal", label: "Pressure Signal", required: false, kind: "signal", constraints: "numeric signal" },
      { id: "fault_signal", label: "Fault Signal", required: false, kind: "signal", constraints: "boolean signal" }
    ],
    parameters: [
      { id: "cooldown_ms", label: "Cooldown Ms", required: true, type: "int64" }
    ]
  },
  {
    kind: "burner_supervisory_skeleton",
    label: "Burner Supervisory Skeleton",
    description: "Supervisory-only burner sequence skeleton. Not certified burner logic.",
    supervisory: true,
    states: ["OFF", "READY_CHECK", "PREPURGE", "IGNITION", "FLAME_PROVE", "RUN", "POSTPURGE", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"],
    bindings: [
      { id: "fan_output", label: "Fan Output", required: true, kind: "actuator", constraints: "relay or pwm fan actuator" },
      { id: "ignition_output", label: "Ignition Output", required: true, kind: "actuator", constraints: "relay ignition actuator" },
      { id: "fuel_output", label: "Fuel Output", required: true, kind: "actuator", constraints: "relay fuel actuator" },
      { id: "flame_signal", label: "Flame Signal", required: true, kind: "signal", constraints: "boolean signal" },
      { id: "air_ok_signal", label: "Air OK Signal", required: true, kind: "signal", constraints: "boolean signal" }
    ],
    parameters: [
      { id: "prepurge_ms", label: "Prepurge Ms", required: true, type: "int64" },
      { id: "ignition_timeout_ms", label: "Ignition Timeout Ms", required: true, type: "int64" },
      { id: "postpurge_ms", label: "Postpurge Ms", required: true, type: "int64" }
    ]
  },
  {
    kind: "incinerator_supervisory_skeleton",
    label: "Incinerator Supervisory Skeleton",
    description: "Supervisory-only incinerator sequence skeleton. Not certified combustion logic.",
    supervisory: true,
    states: ["OFF", "READY_CHECK", "DIESEL_WARMUP", "SLUDGE_ENABLE", "SLUDGE_RUN", "COOLDOWN", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"],
    bindings: [
      { id: "fan_output", label: "Fan Output", required: true, kind: "actuator", constraints: "relay or pwm fan actuator" },
      { id: "diesel_output", label: "Diesel Output", required: true, kind: "actuator", constraints: "relay diesel actuator" },
      { id: "sludge_output", label: "Sludge Output", required: true, kind: "actuator", constraints: "relay or pwm sludge actuator" },
      { id: "chamber_temp_signal", label: "Chamber Temp Signal", required: true, kind: "signal", constraints: "numeric signal" },
      { id: "flame_signal", label: "Flame Signal", required: false, kind: "signal", constraints: "boolean signal" },
      { id: "sludge_ready_signal", label: "Sludge Ready Signal", required: false, kind: "signal", constraints: "boolean signal" }
    ],
    parameters: [
      { id: "warmup_temp", label: "Warmup Temp", required: true, type: "double" },
      { id: "cooldown_temp", label: "Cooldown Temp", required: true, type: "double" }
    ]
  }
];

const dom = {
  kind: document.getElementById("templateKind"),
  description: document.getElementById("templateDescription"),
  supervisory: document.getElementById("supervisoryNotice"),
  disabledNote: document.getElementById("disabledNote"),
  bindings: document.getElementById("bindings"),
  parameters: document.getElementById("parameters"),
  previewSummary: document.getElementById("previewSummary"),
  previewArtifacts: document.getElementById("previewArtifacts"),
  issues: document.getElementById("issues"),
  previewButton: document.getElementById("previewButton"),
  applyButton: document.getElementById("applyButton"),
  banner: document.getElementById("banner")
};

function renderTemplateOptions() {
  dom.kind.innerHTML = templates
    .map((item) => `<option value="${item.kind}">${item.label}</option>`)
    .join("");
}

function selectedTemplate() {
  return templates.find((item) => item.kind === dom.kind.value) || templates[0];
}

function fieldMeta(required, kindOrType, constraints) {
  const tags = [
    `<span class="slot-kind">${kindOrType}</span>`,
    required ? `<span class="required-tag">required</span>` : `<span class="slot-kind">optional</span>`
  ];
  if (constraints) {
    tags.push(`<span class="constraint-tag">${constraints}</span>`);
  }
  return tags.join("");
}

function renderBindings(template) {
  dom.bindings.innerHTML = template.bindings
    .map((item) => `
      <div class="field">
        <label for="binding-${item.id}">${item.label}</label>
        <div>${fieldMeta(item.required, item.kind, item.constraints)}</div>
        <input id="binding-${item.id}" data-binding="${item.id}" placeholder="${item.id}">
      </div>
    `)
    .join("");
}

function renderParameters(template) {
  dom.parameters.innerHTML = template.parameters
    .map((item) => `
      <div class="field">
        <label for="parameter-${item.id}">${item.label}</label>
        <div>${fieldMeta(item.required, item.type, "")}</div>
        <input id="parameter-${item.id}" data-parameter="${item.id}" placeholder="${item.id}">
      </div>
    `)
    .join("");
}

function renderForm() {
  const template = selectedTemplate();
  dom.description.textContent = template.description;
  dom.disabledNote.textContent = "Generated programs, rules and PID controllers are created disabled by default. Nothing auto-starts or auto-enables after apply.";
  dom.supervisory.textContent = template.supervisory
    ? "Supervisory-only template. Burner and incinerator bundles stay as review skeletons and are not certified control logic."
    : "";
  dom.supervisory.classList.toggle("hidden", !template.supervisory);
  renderBindings(template);
  renderParameters(template);
  dom.previewSummary.innerHTML = "";
  dom.previewArtifacts.innerHTML = "";
  dom.issues.innerHTML = "";
  dom.applyButton.disabled = true;
  dom.banner.className = "banner hidden";
}

function collectDraft(template) {
  const bindings = {};
  const parameters = {};

  template.bindings.forEach((item) => {
    const input = document.querySelector(`[data-binding="${item.id}"]`);
    bindings[item.id] = input ? input.value.trim() : "";
  });
  template.parameters.forEach((item) => {
    const input = document.querySelector(`[data-parameter="${item.id}"]`);
    parameters[item.id] = input ? input.value.trim() : "";
  });

  return { bindings, parameters };
}

function draftIssues(template, draft) {
  const issues = [];

  template.bindings.forEach((item) => {
    if (item.required && !draft.bindings[item.id]) {
      issues.push(`TEMPLATE_MISSING_REQUIRED_BINDING: ${item.id}`);
    }
  });

  template.parameters.forEach((item) => {
    if (item.required && !draft.parameters[item.id]) {
      issues.push(`TEMPLATE_MISSING_REQUIRED_PARAMETER: ${item.id}`);
    }
  });

  if (template.kind === "batch_dosing" && !draft.bindings.batch_done_signal) {
    issues.push("TEMPLATE_MISSING_OPTIONAL_BATCH_DONE_WARNING: batch_done_signal is optional, but without it DISPENSE remains a manual supervisory hold.");
  }
  if (template.kind === "incinerator_supervisory_skeleton" && !draft.bindings.flame_signal) {
    issues.push("TEMPLATE_OPTIONAL_SAFETY_SLOT_WARNING: flame_signal is not bound, so flame supervision is absent.");
  }
  if (template.kind === "incinerator_supervisory_skeleton" && !draft.bindings.sludge_ready_signal) {
    issues.push("TEMPLATE_OPTIONAL_SAFETY_SLOT_WARNING: sludge_ready_signal is not bound, so sludge-enable permissive supervision remains manual.");
  }

  return issues;
}

function buildArtifactCards(template) {
  const artifacts = [];
  const instanceId = "preview.instance";

  if (template.kind === "pressure_pump") {
    artifacts.push({ kind: "rule", id: `${instanceId}.rule.low_pressure_on`, detail: "Low pressure ON rule" });
    artifacts.push({ kind: "rule", id: `${instanceId}.rule.high_pressure_off`, detail: "High pressure OFF rule" });
  }
  if (template.kind === "pump_with_flowmeter") {
    artifacts.push({ kind: "rule", id: `${instanceId}.rule.low_pressure_on`, detail: "Low pressure ON rule" });
    artifacts.push({ kind: "rule", id: `${instanceId}.rule.high_pressure_off`, detail: "High pressure OFF rule" });
    artifacts.push({ kind: "rule", id: `${instanceId}.rule.no_flow_alarm`, detail: "No-flow supervision rule" });
    artifacts.push({ kind: "alarm", id: `${instanceId}.alarm.no_flow_trip`, detail: "No-flow trip alarm" });
  }
  if (template.kind === "batch_dosing" || template.kind === "compressor_basic" || template.kind === "burner_supervisory_skeleton" || template.kind === "incinerator_supervisory_skeleton") {
    artifacts.push({ kind: "program", id: `${instanceId}.program.main`, detail: template.states.join(", ") });
  }
  if (template.kind === "pid_pressure_pwm_pump" || template.kind === "pid_flow_pwm_pump") {
    artifacts.push({ kind: "pid", id: `${instanceId}.pid.main`, detail: "Disabled PID descriptor" });
  }
  if (template.kind === "burner_supervisory_skeleton") {
    artifacts.push({ kind: "alarm", id: `${instanceId}.alarm.air_fault`, detail: "Air fault alarm" });
    artifacts.push({ kind: "alarm", id: `${instanceId}.alarm.flame_fault`, detail: "Flame fault alarm" });
  }

  return artifacts;
}

function previewDraft() {
  const template = selectedTemplate();
  const draft = collectDraft(template);
  const issues = draftIssues(template, draft);
  const blockingIssues = issues.filter((issue) => issue.includes("MISSING_REQUIRED"));
  const artifacts = buildArtifactCards(template);

  dom.issues.innerHTML = issues.length
    ? issues.map((item) => `<li>${item}</li>`).join("")
    : "<li>TEMPLATE_UI_OK: Preview is coherent and apply may proceed once runtime apply guards pass.</li>";

  dom.previewSummary.innerHTML = `
    <p><strong>Preview summary:</strong> ${template.label}</p>
    <p class="muted">Programs, rules and PID controllers will be created disabled. Apply uses the backend Template API and performs rollback on partial failure.</p>
  `;

  dom.previewArtifacts.innerHTML = artifacts
    .map((item) => `
      <article class="artifact-card">
        <h3>${item.kind.toUpperCase()}</h3>
        <p>${item.id}</p>
        <p>${item.detail}</p>
      </article>
    `)
    .join("");

  dom.applyButton.disabled = blockingIssues.length > 0;
}

function applyDraft() {
  const template = selectedTemplate();
  dom.banner.textContent = `Static page preview only: ${template.label} would call POST /ui/templates/apply through the transport-neutral Template API backend.`;
  dom.banner.className = "banner ok";
}

renderTemplateOptions();
renderForm();
dom.kind.addEventListener("change", renderForm);
dom.previewButton.addEventListener("click", previewDraft);
dom.applyButton.addEventListener("click", applyDraft);
