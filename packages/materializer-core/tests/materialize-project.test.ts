import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import { validateRuntimePack } from "@universal-plc/runtime-pack-schema";

import boilerCompositionProject from "./fixtures/boiler-composition.project.json" with { type: "json" };
import capabilityHardeningProject from "./fixtures/capability-hardening-demo.project.json" with { type: "json" };
import capabilityHardeningRuntimeSnapshot from "./fixtures/capability-hardening-demo.runtime-pack.snapshot.json" with { type: "json" };
import emptyProject from "./fixtures/empty-project.json" with { type: "json" };
import invalidProject from "./fixtures/invalid-missing-type.project.json" with { type: "json" };
import invalidPulseFlowmeterBadModeProject from "./fixtures/invalid-pulse-flowmeter-bad-mode.project.json" with { type: "json" };
import invalidPulseFlowmeterMissingSourceProject from "./fixtures/invalid-pulse-flowmeter-missing-source.project.json" with { type: "json" };
import pulseFlowmeterProject from "./fixtures/pulse-flowmeter.project.minimal.json" with { type: "json" };
import pulseFlowmeterRuntimeSnapshot from "./fixtures/pulse-flowmeter.runtime-pack.snapshot.json" with { type: "json" };
import timedRelayLibraryProject from "./fixtures/timed-relay-library.project.json" with { type: "json" };
import timedRelayProject from "./fixtures/timed-relay.project.json" with { type: "json" };
import timedRelayRuntimeSnapshot from "./fixtures/timed-relay.runtime-pack.snapshot.json" with { type: "json" };

import { materializeProject } from "../src/index.js";

test("empty project materializes into an empty runtime pack", () => {
  const result = materializeProject(emptyProject as ProjectModel);

  assert.equal(result.ok, true);
  assert.equal(Object.keys(result.pack.instances).length, 0);
  assert.equal(Object.keys(result.pack.connections).length, 0);
  assert.equal(result.diagnostics.length, 0);
});

test("timed relay project materializes a system instance and a normalized connection", () => {
  const result = materializeProject(timedRelayProject as ProjectModel);

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.relay_1);
  assert.equal(result.pack.instances.relay_1.native_execution?.native_kind, "std.timed_relay.v1");
  assert.equal(result.pack.instances.relay_1.params.pulse_time_ms.source, "instance_override");
  assert.equal(result.pack.instances.relay_1.params.pulse_time_ms.provenance?.owner_id, "relay_1");
  assert.equal(Object.keys(result.pack.connections).length, 1);
  assert.ok(result.pack.connections.conn_sig_relay_feedback_t1);
  assert.equal(result.pack.connections.conn_sig_relay_feedback_t1.origin.origin_layer, "system");
  assert.ok(result.pack.resources.relay_out_pin);
  assert.ok(result.pack.operations.op_relay_1_test_pulse);
  assert.ok(result.pack.trace_groups.tg_relay_1_basic);
});

test("boiler composition project materializes child instances and composition connections", () => {
  const result = materializeProject(boilerCompositionProject as ProjectModel);

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.boiler_supervisor_1);
  assert.ok(result.pack.instances["boiler_supervisor_1.burner_seq"]);
  assert.ok(result.pack.connections["boiler_supervisor_1::route_1"]);
  assert.ok(result.pack.connections["boiler_supervisor_1::route_2"]);
});

test("missing type produces a diagnostic and no runtime instance", () => {
  const result = materializeProject(invalidProject as ProjectModel);

  assert.equal(result.ok, false);
  assert.equal(Object.keys(result.pack.instances).length, 0);
  assert.ok(result.diagnostics.some((entry) => entry.code === "system_instance.type_ref.unresolved"));
});

test("timed relay library slice materializes library refs, resources, operations and trace groups", () => {
  const result = materializeProject(timedRelayLibraryProject as ProjectModel, {
    pack_id: "timed-relay-demo-pack",
    generated_at: "2026-03-28T12:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.start_button_1);
  assert.ok(result.pack.instances.relay_1);
  assert.ok(result.pack.instances.pump_contact_1);
  assert.equal(result.pack.instances.relay_1.native_execution?.native_kind, "std.timed_relay.v1");
  assert.ok(result.pack.connections.conn_sig_start_to_trigger_t1);
  assert.ok(result.pack.connections.conn_sig_relay_to_output_t1);
  assert.ok(result.pack.resources.res_start_button_1);
  assert.ok(result.pack.resources.res_pump_contact_1);
  assert.ok(result.pack.operations.op_relay_1_test_pulse);
  assert.ok(result.pack.trace_groups.tg_relay_1_basic);
});

test("timed relay library slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(timedRelayLibraryProject as ProjectModel, {
    pack_id: "timed-relay-demo-pack",
    generated_at: "2026-03-28T12:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(timedRelayRuntimeSnapshot)
  );
});

test("capability hardening demo materializes runtime metadata blocks", () => {
  const result = materializeProject(capabilityHardeningProject as ProjectModel, {
    pack_id: "capability-hardening-demo-pack",
    generated_at: "2026-03-28T18:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.meter_1);
  assert.ok(result.pack.frontend_requirements.fe_meter_1_pulse_source);
  assert.ok(result.pack.monitors.mon_meter_1_pulse_timeout);
  assert.ok(result.pack.operations.op_meter_1_reset_totalizer);
  assert.ok(result.pack.trace_groups.tg_meter_1_flow_metrics);
  assert.ok(result.pack.persistence_slots.ps_meter_1_total_volume);
  assert.equal(result.pack.instances.meter_1.params.k_factor.metadata?.unit, "pulses_per_liter");
});

test("capability hardening demo matches the runtime pack golden snapshot", () => {
  const result = materializeProject(capabilityHardeningProject as ProjectModel, {
    pack_id: "capability-hardening-demo-pack",
    generated_at: "2026-03-28T18:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(capabilityHardeningRuntimeSnapshot)
  );
});

test("pulse flowmeter hall_pulse slice materializes runtime metadata and native execution", () => {
  const result = materializeProject(pulseFlowmeterProject as ProjectModel, {
    pack_id: "pulse-flowmeter-demo-pack",
    generated_at: "2026-03-28T20:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.flowmeter_1);
  assert.equal(result.pack.instances.flowmeter_1.native_execution?.native_kind, "std.pulse_flowmeter.v1");
  assert.equal(result.pack.instances.flowmeter_1.native_execution?.mode, "hall_pulse");
  assert.deepEqual(result.pack.instances.flowmeter_1.native_execution?.frontend_requirement_ids, [
    "fe_flowmeter_1_hall_pulse_source"
  ]);
  assert.ok(result.pack.frontend_requirements.fe_flowmeter_1_hall_pulse_source);
  assert.equal(result.pack.frontend_requirements.fe_flowmeter_1_hall_pulse_source.required, true);
  assert.ok(result.pack.operations.op_flowmeter_1_reset_totalizer);
  assert.ok(result.pack.trace_groups.tg_flowmeter_1_process);
  assert.ok(result.pack.trace_groups.tg_flowmeter_1_source);
  assert.ok(result.pack.monitors.mon_flowmeter_1_no_pulse_timeout);
  assert.ok(result.pack.persistence_slots.ps_flowmeter_1_totalizer);

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("pulse flowmeter hall_pulse slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(pulseFlowmeterProject as ProjectModel, {
    pack_id: "pulse-flowmeter-demo-pack",
    generated_at: "2026-03-28T20:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(pulseFlowmeterRuntimeSnapshot)
  );
});

test("pulse flowmeter analog_threshold_pulse mode materializes the analog frontend requirement", () => {
  const analogProject = structuredClone(pulseFlowmeterProject) as ProjectModel;

  analogProject.definitions.object_types.analog_input = {
    id: "analog_input",
    kind: "object_type",
    meta: {
      title: "Analog Input",
      version: "1.0.0",
      origin: "library",
      library_id: "std"
    },
    interface: {
      ports: {
        value: {
          id: "value",
          direction: "out",
          channel_kind: "telemetry",
          value_type: "float"
        }
      },
      params: {},
      alarms: {}
    },
    locals: {
      signals: {},
      vars: {}
    },
    implementation: {
      native: {
        native_kind: "std.analog_input.v1",
        target_kinds: ["esp32.shipcontroller.v1"],
        config_template: "shipcontroller.analog_input.v1"
      },
      composition: null,
      state: null,
      flow: null
    },
    diagnostics: {}
  };

  delete analogProject.system.instances.pulse_source_1;
  analogProject.system.instances.analog_source_1 = {
    id: "analog_source_1",
    kind: "object_instance",
    type_ref: "library:std/analog_input",
    title: "Analog Pulse Source",
    enabled: true,
    param_values: {}
  };

  analogProject.system.instances.flowmeter_1.param_values!.sensor_mode = {
    kind: "literal",
    value: "analog_threshold_pulse"
  };

  analogProject.system.signals.sig_pulse_source_to_flowmeter = {
    id: "sig_pulse_source_to_flowmeter",
    title: "Analog Source -> Flowmeter",
    source: {
      instance_id: "analog_source_1",
      port_id: "value"
    },
    targets: {
      t1: {
        instance_id: "flowmeter_1",
        port_id: "analog_source"
      }
    }
  };

  analogProject.hardware.bindings = {
    hw_analog_source_1: {
      id: "hw_analog_source_1",
      instance_id: "analog_source_1",
      port_id: "value",
      binding_kind: "analog_in",
      config: {
        pin: 34
      }
    }
  };

  const result = materializeProject(analogProject);

  assert.equal(result.ok, true);
  assert.equal(result.pack.instances.flowmeter_1.native_execution?.mode, "analog_threshold_pulse");
  assert.deepEqual(result.pack.instances.flowmeter_1.native_execution?.frontend_requirement_ids, [
    "fe_flowmeter_1_analog_threshold_source"
  ]);
  assert.equal(result.pack.frontend_requirements.fe_flowmeter_1_analog_threshold_source.required, true);
  assert.ok(result.pack.resources.hw_analog_source_1);
});

test("pulse flowmeter remote_pulse mode materializes the remote frontend requirement", () => {
  const remoteProject = structuredClone(pulseFlowmeterProject) as ProjectModel;

  remoteProject.definitions.object_types.remote_pulse_source = {
    id: "remote_pulse_source",
    kind: "object_type",
    meta: {
      title: "Remote Pulse Source",
      version: "1.0.0",
      origin: "library",
      library_id: "std"
    },
    interface: {
      ports: {
        value: {
          id: "value",
          direction: "out",
          channel_kind: "signal",
          value_type: "bool"
        }
      },
      params: {},
      alarms: {}
    },
    locals: {
      signals: {},
      vars: {}
    },
    implementation: {
      native: null,
      composition: null,
      state: null,
      flow: null
    },
    diagnostics: {}
  };

  delete remoteProject.system.instances.pulse_source_1;
  remoteProject.system.instances.remote_source_1 = {
    id: "remote_source_1",
    kind: "object_instance",
    type_ref: "library:std/remote_pulse_source",
    title: "Remote Pulse Source",
    enabled: true,
    param_values: {}
  };

  remoteProject.system.instances.flowmeter_1.param_values!.sensor_mode = {
    kind: "literal",
    value: "remote_pulse"
  };

  remoteProject.system.signals.sig_pulse_source_to_flowmeter = {
    id: "sig_pulse_source_to_flowmeter",
    title: "Remote Source -> Flowmeter",
    source: {
      instance_id: "remote_source_1",
      port_id: "value"
    },
    targets: {
      t1: {
        instance_id: "flowmeter_1",
        port_id: "remote_pulse"
      }
    }
  };

  remoteProject.hardware.bindings = {
    hw_remote_source_1: {
      id: "hw_remote_source_1",
      instance_id: "remote_source_1",
      port_id: "value",
      binding_kind: "service",
      config: {
        topic: "flowmeter/remote_pulse"
      }
    }
  };

  const result = materializeProject(remoteProject);

  assert.equal(result.ok, true);
  assert.equal(result.pack.instances.flowmeter_1.native_execution?.mode, "remote_pulse");
  assert.deepEqual(result.pack.instances.flowmeter_1.native_execution?.frontend_requirement_ids, [
    "fe_flowmeter_1_remote_pulse_source"
  ]);
  assert.equal(result.pack.frontend_requirements.fe_flowmeter_1_remote_pulse_source.required, true);
  assert.ok(result.pack.resources.hw_remote_source_1);
});

test("pulse flowmeter missing source binding produces the canonical frontend resource diagnostic", () => {
  const result = materializeProject(invalidPulseFlowmeterMissingSourceProject as ProjectModel);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "frontend.resource.missing"));
});

test("pulse flowmeter bad mode produces the canonical unsupported mode diagnostic", () => {
  const result = materializeProject(invalidPulseFlowmeterBadModeProject as ProjectModel);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "frontend.mode.unsupported"));
});

function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)])
    );
  }

  return value;
}
