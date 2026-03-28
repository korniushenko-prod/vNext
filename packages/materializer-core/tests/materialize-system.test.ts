import { strict as assert } from "node:assert";
import test from "node:test";

import systemSignalProject from "./fixtures/system-signal-project.json" with { type: "json" };
import invalidTypeProject from "./fixtures/invalid-type-project.json" with { type: "json" };
import type { ProjectModel } from "../src/index.js";
import { MATERIALIZER_CORE_VERSION, materializeProject } from "../src/index.js";

test("materializeProject normalizes system signals into runtime connections", () => {
  const result = materializeProject(systemSignalProject as ProjectModel);
  assert.equal(result.ok, true);
  assert.ok(result.pack);
  assert.equal(Object.keys(result.pack!.instances).length, 2);
  assert.equal(Object.keys(result.pack!.connections).length, 1);
  const connection = Object.values(result.pack!.connections)[0];
  assert.equal(connection.origin.scope_kind, "system");
  assert.equal(connection.origin.signal_id, "sig_1");
  assert.equal(MATERIALIZER_CORE_VERSION, "0.1.0");
});

test("materializeProject emits diagnostics for missing type refs", () => {
  const result = materializeProject(invalidTypeProject as ProjectModel);
  assert.equal(result.ok, false);
  assert.equal(result.pack, null);
  assert.ok(result.diagnostics.some((entry) => entry.code === "type_ref.missing"));
});
