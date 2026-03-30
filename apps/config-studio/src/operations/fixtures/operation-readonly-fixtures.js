(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.OperationReadonlyFixtures = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  const metadataOnlySupport = Object.freeze({
    enabled: true,
    invoke: false,
    cancel: false,
    progress: true,
    result_payload: true,
    confirmation: true
  });

  const executionBaselineSupport = Object.freeze({
    enabled: true,
    invoke: true,
    cancel: true,
    progress: true,
    result_payload: true,
    confirmation: true,
    execution_baseline_kinds: ["reset_totalizer", "reset_counter", "reset_interval"],
    confirmation_token_validation: "when_required",
    failure_payload: true,
    audit_hooks: true,
    recommendation_lifecycle: true,
    progress_payload: true
  });

  const READONLY_OPERATION_FIXTURES = Object.freeze([
    {
      id: "operations-readonly-flowmeter",
      title: "PulseFlowmeter + reset_totalizer",
      description: "Execution-baseline reset flow for a totalizer with completed snapshot and result payload.",
      subject_label: "Pulse Flowmeter #1",
      runtimePack: {
        pack_id: "operations-readonly-flowmeter-pack",
        operations: {
          op_flowmeter_1_reset_totalizer: {
            id: "op_flowmeter_1_reset_totalizer",
            owner_instance_id: "flowmeter_1",
            kind: "reset_totalizer",
            title: "Reset Totalizer",
            confirmation_policy: "required",
            availability: {
              mode: "always",
              required_states: []
            },
            progress_mode: "none",
            cancel_mode: "not_cancellable",
            result_contract: {
              mode: "applyable_result",
              fields: [
                { id: "completed", value_type: "bool", title: "Completed" },
                { id: "total_volume", value_type: "float", title: "Total Volume" }
              ]
            }
          }
        },
        operation_runtime_contract: {
          invoke_supported: true,
          cancel_supported: false,
          progress_supported: true,
          result_supported: true,
          audit_required: true,
          execution_baseline_kinds: ["reset_totalizer", "reset_counter", "reset_interval"],
          confirmation_token_validation: "when_required",
          failure_payload_supported: true,
          audit_hook_mode: "operation_events"
        }
      },
      runtimeSnapshot: {
        operation_snapshots: {
          op_flowmeter_1_reset_totalizer: {
            operation_id: "op_flowmeter_1_reset_totalizer",
            state: "completed",
            message: "Totalizer reset acknowledged by target.",
            result: {
              completed: true,
              total_volume: 0
            }
          }
        }
      },
      operationsSupport: executionBaselineSupport
    },
    {
      id: "operations-readonly-runhours",
      title: "RunHoursCounter + reset_counter",
      description: "Execution-baseline reset operation stays runnable but shows no live snapshot yet.",
      subject_label: "Run Hours Counter #1",
      runtimePack: {
        pack_id: "operations-readonly-runhours-pack",
        operations: {
          op_run_hours_1_reset_counter: {
            id: "op_run_hours_1_reset_counter",
            owner_instance_id: "run_hours_1",
            kind: "reset_counter",
            title: "Reset Counter",
            confirmation_policy: "required",
            availability: {
              mode: "always",
              required_states: []
            },
            progress_mode: "none",
            cancel_mode: "not_cancellable",
            result_contract: {
              mode: "applyable_result",
              fields: [
                { id: "completed", value_type: "bool", title: "Completed" },
                { id: "total_seconds", value_type: "u32", title: "Total Seconds" }
              ]
            }
          }
        },
        operation_runtime_contract: {
          invoke_supported: true,
          cancel_supported: false,
          progress_supported: true,
          result_supported: true,
          audit_required: true,
          execution_baseline_kinds: ["reset_totalizer", "reset_counter", "reset_interval"],
          confirmation_token_validation: "when_required",
          failure_payload_supported: true,
          audit_hook_mode: "operation_events"
        }
      },
      runtimeSnapshot: {
        operation_snapshots: {}
      },
      operationsSupport: executionBaselineSupport
    },
    {
      id: "operations-readonly-maintenance",
      title: "MaintenanceCounter + service operations",
      description: "Two maintenance actions share one surface: metadata-only acknowledge and execution-baseline reset interval.",
      subject_label: "Maintenance Counter #1",
      runtimePack: {
        pack_id: "operations-readonly-maintenance-pack",
        operations: {
          op_maintenance_counter_1_acknowledge_due: {
            id: "op_maintenance_counter_1_acknowledge_due",
            owner_instance_id: "maintenance_counter_1",
            kind: "acknowledge_due",
            title: "Acknowledge Due",
            confirmation_policy: "none",
            availability: {
              mode: "guarded",
              required_states: ["due_active"]
            },
            progress_mode: "signal_based",
            result_contract: {
              mode: "applyable_result",
              fields: [
                { id: "completed", value_type: "bool", title: "Completed" },
                { id: "acknowledged", value_type: "bool", title: "Acknowledged" }
              ]
            }
          },
          op_maintenance_counter_1_reset_interval: {
            id: "op_maintenance_counter_1_reset_interval",
            owner_instance_id: "maintenance_counter_1",
            kind: "reset_interval",
            title: "Reset Interval",
            confirmation_policy: "required",
            availability: {
              mode: "always",
              required_states: []
            },
            progress_mode: "none",
            cancel_mode: "not_cancellable",
            result_contract: {
              mode: "applyable_result",
              fields: [
                { id: "completed", value_type: "bool", title: "Completed" },
                { id: "remaining_out", value_type: "float", title: "Remaining" },
                { id: "progress_out", value_type: "float", title: "Progress" }
              ]
            }
          }
        },
        operation_runtime_contract: {
          invoke_supported: true,
          cancel_supported: false,
          progress_supported: true,
          result_supported: true,
          audit_required: true,
          execution_baseline_kinds: ["reset_totalizer", "reset_counter", "reset_interval"],
          confirmation_token_validation: "when_required",
          failure_payload_supported: true,
          audit_hook_mode: "operation_events"
        }
      },
      runtimeSnapshot: {
        operation_snapshots: {
          op_maintenance_counter_1_acknowledge_due: {
            operation_id: "op_maintenance_counter_1_acknowledge_due",
            state: "failed",
            message: "Acknowledge rejected because due signal already cleared."
          },
          op_maintenance_counter_1_reset_interval: {
            operation_id: "op_maintenance_counter_1_reset_interval",
            state: "completed",
            message: "Maintenance interval reset captured in persistent storage.",
            result: {
              completed: true,
              remaining_out: 500,
              progress_out: 0
            }
          }
        }
      },
      operationsSupport: executionBaselineSupport
    },
    {
      id: "operations-readonly-pid",
      title: "PID + hold/release/autotune",
      description: "PID hold/release stay generic while autotune uses a specialized execution lane with progress and recommendation preview.",
      subject_label: "PID Controller #1",
      runtimePack: {
        pack_id: "operations-readonly-pid-pack",
        operations: {
          op_pid_1_hold: {
            id: "op_pid_1_hold",
            owner_instance_id: "pid_1",
            kind: "hold",
            title: "Hold Output",
            confirmation_policy: "required",
            availability: {
              mode: "always",
              required_states: []
            },
            progress_mode: "signal_based",
            result_contract: {
              mode: "applyable_result",
              fields: [
                { id: "completed", value_type: "bool", title: "Completed" },
                { id: "hold_active", value_type: "bool", title: "Hold Active" }
              ]
            }
          },
          op_pid_1_release: {
            id: "op_pid_1_release",
            owner_instance_id: "pid_1",
            kind: "release",
            title: "Release Hold",
            confirmation_policy: "required",
            availability: {
              mode: "guarded",
              required_states: ["hold_active"]
            },
            progress_mode: "signal_based",
            result_contract: {
              mode: "applyable_result",
              fields: [
                { id: "completed", value_type: "bool", title: "Completed" },
                { id: "hold_active", value_type: "bool", title: "Hold Active" }
              ]
            }
          },
          op_pid_1_autotune: {
            id: "op_pid_1_autotune",
            owner_instance_id: "pid_1",
            kind: "autotune",
            title: "PID Autotune",
            confirmation_policy: "required",
            availability: {
              mode: "always",
              required_states: []
            },
            progress_mode: "signal_based",
            progress_contract: {
              fields: [
                { id: "phase", value_type: "string", title: "Autotune Phase" },
                { id: "sample_count", value_type: "u32", title: "Collected Samples" }
              ]
            },
            result_contract: {
              mode: "recommendation",
              fields: [
                { id: "completed", value_type: "bool", title: "Completed" },
                { id: "recommended_kp", value_type: "float", title: "Recommended Kp" },
                { id: "recommended_ti", value_type: "float", title: "Recommended Ti" },
                { id: "recommended_td", value_type: "float", title: "Recommended Td" },
                { id: "summary", value_type: "string", title: "Summary" }
              ],
              failure_fields: [
                { id: "error", value_type: "string", title: "Error" },
                { id: "diagnostics", value_type: "string", title: "Diagnostics" }
              ],
              recommendation_lifecycle: {
                mode: "apply_reject",
                apply_confirmation_policy: "required",
                reject_confirmation_policy: "required"
              }
            }
          }
        },
        operation_runtime_contract: {
          invoke_supported: true,
          cancel_supported: true,
          progress_supported: true,
          result_supported: true,
          audit_required: true,
          confirmation_token_validation: "when_required",
          failure_payload_supported: true,
          audit_hook_mode: "operation_events",
          recommendation_lifecycle_supported: true,
          progress_payload_supported: true
        }
      },
      runtimeSnapshot: {
        operation_snapshots: {
          op_pid_1_hold: {
            operation_id: "op_pid_1_hold",
            state: "running",
            progress: 55,
            message: "Hold output ramping down."
          },
          op_pid_1_release: {
            operation_id: "op_pid_1_release",
            state: "cancelled",
            message: "Release request cancelled before apply."
          },
          op_pid_1_autotune: {
            operation_id: "op_pid_1_autotune",
            state: "completed",
            progress: 100,
            progress_payload: {
              phase: "settle",
              sample_count: 128
            },
            recommendation_state: "available",
            message: "Autotune completed. Review recommendation before apply.",
            result: {
              completed: true,
              recommended_kp: 1.9,
              recommended_ti: 10.5,
              recommended_td: 0.2,
              summary: "Stable relay test complete."
            }
          }
        }
      },
      operationsSupport: executionBaselineSupport
    },
    {
      id: "operations-readonly-unsupported",
      title: "Unsupported target / degraded read-only state",
      description: "The surface must stay visible even when the target reports operations as unsupported.",
      subject_label: "Remote Point Frontend #1",
      runtimePack: {
        pack_id: "operations-readonly-unsupported-pack",
        operations: {
          op_remote_point_1_self_test: {
            id: "op_remote_point_1_self_test",
            owner_instance_id: "remote_point_1",
            kind: "self_test",
            title: "Self Test",
            confirmation_policy: "none",
            availability: {
              mode: "always",
              required_states: []
            },
            progress_mode: "state_based",
            result_contract: {
              mode: "none",
              fields: []
            }
          }
        },
        operation_runtime_contract: {
          invoke_supported: false,
          cancel_supported: false,
          progress_supported: false,
          result_supported: false,
          audit_required: false
        }
      },
      runtimeSnapshot: {
        operation_snapshots: {}
      },
      operationsSupport: {
        enabled: false,
        invoke: false,
        cancel: false,
        progress: false,
        result_payload: false,
        confirmation: false
      }
    }
  ]);

  return {
    READONLY_FIXTURE_IDS: READONLY_OPERATION_FIXTURES.map((fixture) => fixture.id),
    READONLY_OPERATION_FIXTURES
  };
});
