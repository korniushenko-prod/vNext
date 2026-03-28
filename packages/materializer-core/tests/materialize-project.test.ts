import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";

import boilerCompositionProject from "./fixtures/boiler-composition.project.json" with { type: "json" };
import emptyProject from "./fixtures/empty-project.json" with { type: "json" };
import invalidProject from "./fixtures/invalid-missing-type.project.json" with { type: "json" };
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
