import { strict as assert } from "node:assert";
import test from "node:test";

import deploymentResult from "./fixtures/deployment-result-valid.json" with { type: "json" };
import { validateTargetDeploymentResult } from "../src/index.js";

test("validateTargetDeploymentResult accepts canonical deployment result", () => {
  const result = validateTargetDeploymentResult(deploymentResult);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("deployment result fixture exposes artifact ids as keyed records", () => {
  const artifactIds = Object.keys(deploymentResult.artifacts);
  assert.deepEqual(artifactIds, ["bundle_1"]);
});
