import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";

import invalidProject from "./fixtures/invalid-missing-type.project.json" with { type: "json" };

import { hasErrors, materializeProject } from "../src/index.js";

test("materializer diagnostics surface hard failures", () => {
  const result = materializeProject(invalidProject as ProjectModel);

  assert.equal(hasErrors(result.diagnostics), true);
  assert.ok(result.diagnostics.some((entry) => entry.phase === "build_type_registry"));
});