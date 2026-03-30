import { strict as assert } from "node:assert";
import test from "node:test";

import invalidExecutionHook from "./fixtures/package-supervision-invalid-execution-hook.project.json" with { type: "json" };
import invalidMissingChild from "./fixtures/package-supervision-invalid-missing-child.project.json" with { type: "json" };
import invalidSummaryMismatch from "./fixtures/package-supervision-invalid-summary-mismatch.project.json" with { type: "json" };
import invalidUnknownProxyTarget from "./fixtures/package-supervision-invalid-unknown-proxy-target.project.json" with { type: "json" };
import validPackageSupervision from "./fixtures/package-supervision-valid.project.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("package supervision fixture passes additive contract validation", () => {
  const result = validateProjectModel(validPackageSupervision);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package supervision catches missing child references in aggregate mappings", () => {
  const result = validateProjectModel(invalidMissingChild);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_supervision.member.unresolved"));
});

test("package supervision catches unknown operation proxy targets", () => {
  const result = validateProjectModel(invalidUnknownProxyTarget);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_operation_proxy.target.unresolved"));
});

test("package supervision forbids direct execution hooks on package operation proxies", () => {
  const result = validateProjectModel(invalidExecutionHook);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_operation_proxy.execution_hook.forbidden"));
});

test("package supervision catches mismatched summary source value types", () => {
  const result = validateProjectModel(invalidSummaryMismatch);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_supervision.summary_source.value_type_mismatch"));
});
