(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PackageCommissioningFixtures = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  const PACKAGE_COMMISSIONING_FIXTURES = Object.freeze([
    {
      id: "package-commissioning-pump-skid-supervisor-pilot",
      title: "PumpSkidSupervisor v1 Commissioning",
      description: "First production-like commissioning surface: bounded pilot package, explicit apply result, stateful readback, and package-level summaries without opening a broad HMI or SCADA layer.",
      package_overview_fixture_id: "package-overview-pump-skid-supervisor-pilot",
      package_instance_id: "pump_skid_supervisor_1",
      package_definition: {
        package_id: "std.pump_skid_supervisor.v1",
        title: "PumpSkidSupervisor v1",
        target_profile: "esp32.shipcontroller.v1"
      },
      summary_cards: [
        { id: "package_state", title: "Package State", value: "healthy", semantic_state: "healthy" },
        { id: "current_mode", title: "Current Mode", value: "auto", semantic_state: "healthy" },
        { id: "current_phase", title: "Current Phase", value: "running", semantic_state: "running" },
        { id: "ready", title: "Ready", value: "true", semantic_state: "healthy" },
        { id: "running", title: "Running", value: "true", semantic_state: "running" },
        { id: "faulted", title: "Faulted", value: "false", semantic_state: "healthy" },
        { id: "pressure", title: "Pressure", value: "3.4 bar", semantic_state: "informational" },
        { id: "runtime_total", title: "Runtime Total", value: "148.6 h", semantic_state: "informational" }
      ],
      configuration: {
        template_ref: "run_hours_pilot_template",
        preset_ref: "single_pump_with_run_hours",
        parameter_groups: [
          {
            id: "runtime_group",
            title: "Runtime / Service",
            entries: [
              { id: "service_interval", title: "Service Interval", value: "900 h", source: "template + preset" },
              { id: "warning_before", title: "Warning Before", value: "90 h", source: "template + preset" },
              { id: "persist_period", title: "Persist Period", value: "60 s", source: "template default" }
            ]
          },
          {
            id: "pressure_group",
            title: "Pressure / Alarm",
            entries: [
              { id: "threshold_high", title: "High Threshold", value: "7.0 bar", source: "template default" },
              { id: "hysteresis", title: "Hysteresis", value: "0.2 bar", source: "template default" },
              { id: "timeout", title: "Timeout", value: "5000 ms", source: "template default" }
            ]
          }
        ],
        bindings: [
          { id: "hw_pump_cmd_1", title: "Pump Command", binding_kind: "digital_out", target: "GPIO17", state: "bound" },
          { id: "hw_run_feedback_1", title: "Run Feedback", binding_kind: "digital_in", target: "GPIO34", state: "bound" },
          { id: "hw_fault_feedback_1", title: "Fault Feedback", binding_kind: "digital_in", target: "GPIO35", state: "bound" },
          { id: "hw_pressure_pv_1", title: "Pressure PV", binding_kind: "analog_in", target: "ADC0", state: "bound" }
        ],
        apply_button: {
          label: "Apply To Target",
          state: "ready"
        },
        apply_result: {
          state: "applied",
          summary: "Applied to the synthetic ESP32 pilot target with checksum echo.",
          request_id: "pilot-apply-1",
          checksum_sha256: "fafb2bfbb540a1c586642183cabf8ee7cf9cfbed9603338ff0dfa34f9867daf4",
          config_version: "2026-03-30T00:00:00Z"
        },
        readback_status: {
          state: "online",
          target_state: "online",
          collected_at: "1970-01-01T00:00:00.000Z",
          summary: "Readback matches the bounded pilot package baseline."
        }
      },
      commissioning: {
        live_signals: [
          { id: "package_ready", title: "Package Ready", value: "true", semantic_state: "healthy" },
          { id: "package_running", title: "Package Running", value: "true", semantic_state: "running" },
          { id: "package_faulted", title: "Package Faulted", value: "false", semantic_state: "healthy" },
          { id: "pressure_value", title: "Pressure Value", value: "3.4 bar", semantic_state: "informational" },
          { id: "runtime_total", title: "Runtime Total", value: "148.6 h", semantic_state: "informational" }
        ],
        operation_cards: [
          { id: "reset_runtime_counter", title: "Reset Runtime Counter", state: "idle", confirmation_policy: "required", summary: "Bounded reset baseline is available." },
          { id: "reset_maintenance_interval", title: "Reset Maintenance Interval", state: "idle", confirmation_policy: "required", summary: "Service interval reset is available." },
          { id: "start_supervision", title: "Start Supervision", state: "idle", confirmation_policy: "required", summary: "Package supervision start proxy is visible." }
        ],
        ownership_override: {
          current_lane: "auto",
          requested_lane: "manual",
          summary: "Automatic ownership is active while manual takeover remains visible for commissioning."
        },
        permissive_interlock: {
          state: "ready",
          summary: "All package permissives are clear and no interlock is active."
        },
        protection_recovery: {
          state: "ready",
          summary: "No trip or inhibit is latched; bounded recovery requests remain visible."
        }
      },
      diagnostics: [
        { severity: "info", code: "target.apply.applied", summary: "Synthetic pilot apply stored checksum echo and apply acknowledgement." },
        { severity: "info", code: "target.readback.pilot.live", summary: "Stateful readback baseline is available after apply for this pilot package." }
      ]
    }
  ]);

  return {
    PACKAGE_COMMISSIONING_FIXTURES,
    PACKAGE_COMMISSIONING_FIXTURE_IDS: [
      "package-commissioning-pump-skid-supervisor-pilot"
    ]
  };
});
