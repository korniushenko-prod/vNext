import { strict as assert } from "node:assert";
import test from "node:test";

import invalidPackageSupervisionPack from "./fixtures/package-supervision-invalid.runtime-pack.json" with { type: "json" };
import packageSupervisionPack from "./fixtures/package-supervision.runtime-pack.json" with { type: "json" };
import { validateRuntimePack } from "../src/index.js";

test("package supervision runtime pack fixture stays structurally valid", () => {
  const result = validateRuntimePack(packageSupervisionPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package supervision runtime pack exposes package operation proxies and summary outputs target-neutrally", () => {
  const packageEntry = packageSupervisionPack.package_supervision.pkg_boiler_supervisor_1;
  assert.equal(packageEntry.summary_outputs.runtime_total.source.instance_id, "boiler_supervisor_1__run_hours_1");
  assert.equal(packageEntry.operation_proxies.reset_runtime_counter.target_operation_id, "op_boiler_supervisor_1__run_hours_1_reset_counter");
});

test("invalid package supervision runtime pack is rejected by additive validators", () => {
  const result = validateRuntimePack(invalidPackageSupervisionPack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.string"));
});
