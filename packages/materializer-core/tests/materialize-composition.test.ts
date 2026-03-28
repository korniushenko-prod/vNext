import { strict as assert } from "node:assert";
import test from "node:test";

import compositionProject from "./fixtures/composition-project.json" with { type: "json" };
import type { ProjectModel } from "../src/index.js";
import { materializeProject } from "../src/index.js";

test("materializeProject expands composition child instances and routes", () => {
  const result = materializeProject(compositionProject as ProjectModel);
  assert.equal(result.ok, true);
  assert.ok(result.pack);
  assert.ok(result.pack!.instances["boiler_supervisor_1"]);
  assert.ok(result.pack!.instances["boiler_supervisor_1.burner_seq"]);
  assert.equal(Object.keys(result.pack!.connections).length, 2);
});

test("materializeProject resolves parent_param into child runtime params", () => {
  const result = materializeProject(compositionProject as ProjectModel);
  assert.ok(result.pack);
  const child = result.pack!.instances["boiler_supervisor_1.burner_seq"];
  assert.equal(child.params.purge_time.value, "45s");
  assert.equal(child.params.purge_time.source, "parent_param");
});
