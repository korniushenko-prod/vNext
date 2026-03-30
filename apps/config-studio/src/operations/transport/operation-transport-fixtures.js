(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.OperationTransportFixtures = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
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

  const OPERATION_TRANSPORT_FIXTURES = Object.freeze([
    {
      fixture_id: "operations-readonly-flowmeter",
      operations_support: executionBaselineSupport,
      default_inputs: {},
      invoke_results: {
        op_flowmeter_1_reset_totalizer: {
          accepted: true,
          state: "accepted",
          message: "Reset totalizer request queued."
        }
      },
      cancel_results: {}
    },
    {
      fixture_id: "operations-readonly-runhours",
      operations_support: executionBaselineSupport,
      default_inputs: {},
      invoke_results: {
        op_run_hours_1_reset_counter: {
          accepted: true,
          state: "accepted",
          message: "Reset counter request queued."
        }
      },
      cancel_results: {}
    },
    {
      fixture_id: "operations-readonly-maintenance",
      operations_support: executionBaselineSupport,
      default_inputs: {},
      invoke_results: {
        op_maintenance_counter_1_reset_interval: {
          accepted: true,
          state: "accepted",
          message: "Maintenance interval reset queued."
        }
      },
      cancel_results: {}
    },
    {
      fixture_id: "operations-readonly-pid",
      operations_support: executionBaselineSupport,
      default_inputs: {
        op_pid_1_autotune: {
          tuning_mode: "guided"
        }
      },
      invoke_results: {
        op_pid_1_autotune: {
          accepted: true,
          state: "running",
          message: "PID autotune started through the synthetic service lane.",
          progress_payload: {
            phase: "relay_test",
            sample_count: 12
          },
          recommendation_state: "none"
        },
        "op_pid_1_autotune::apply_recommendation": {
          accepted: true,
          state: "completed",
          message: "PID autotune recommendation applied through the synthetic service lane.",
          recommendation_state: "applied",
          result: {
            completed: true,
            applied: true
          }
        },
        "op_pid_1_autotune::reject_recommendation": {
          accepted: true,
          state: "rejected",
          message: "PID autotune recommendation rejected through the synthetic service lane.",
          recommendation_state: "rejected"
        }
      },
      cancel_results: {
        op_pid_1_autotune: {
          accepted: true,
          state: "cancelled",
          message: "PID autotune cancelled through the synthetic service lane.",
          recommendation_state: "none"
        }
      }
    },
    {
      fixture_id: "operations-readonly-unsupported",
      operations_support: {
        enabled: false,
        invoke: false,
        cancel: false,
        progress: false,
        result_payload: false,
        confirmation: false
      },
      default_inputs: {},
      invoke_results: {},
      cancel_results: {}
    }
  ]);

  function getTransportFixture(fixtureId) {
    return OPERATION_TRANSPORT_FIXTURES.find((fixture) => fixture.fixture_id === fixtureId) || null;
  }

  function createSyntheticOperationTransport() {
    return {
      async invokeOperation(request, context = {}) {
        return resolveSyntheticResult("invoke", request, context);
      },
      async cancelOperation(request, context = {}) {
        return resolveSyntheticResult("cancel", request, context);
      }
    };
  }

  function resolveSyntheticResult(action, request, context) {
    if (!request || typeof request.operation_id !== "string" || !request.operation_id) {
      return rejected("Malformed transport payload.");
    }

    const fixture = getTransportFixture(context.fixture_id);
    if (!fixture) {
      return rejected("Unknown transport fixture.");
    }

    const results = action === "invoke" ? fixture.invoke_results : fixture.cancel_results;
    const requestKey = action === "invoke" && typeof request.action === "string" && request.action !== "invoke"
      ? `${request.operation_id}::${request.action}`
      : request.operation_id;
    return results[requestKey]
      ? structuredClone(results[requestKey])
      : rejected("Unknown operation id.");
  }

  function rejected(message) {
    return {
      accepted: false,
      state: "rejected",
      message
    };
  }

  return {
    OPERATION_TRANSPORT_FIXTURES,
    createSyntheticOperationTransport,
    getTransportFixture
  };
});
