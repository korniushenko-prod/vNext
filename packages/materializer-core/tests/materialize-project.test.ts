import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";

import boilerCompositionProject from "./fixtures/boiler-composition.project.json" with { type: "json" };
import emptyProject from "./fixtures/empty-project.json" with { type: "json" };
import invalidProject from "./fixtures/invalid-missing-type.project.json" with { type: "json" };
import timedRelayProject from "./fixtures/timed-relay.project.json" with { type: "json" };

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
  assert.equal(Object.keys(result.pack.connections).length, 1);
  assert.ok(result.pack.connections.sig_relay_feedback__1);
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