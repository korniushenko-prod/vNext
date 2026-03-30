import { strict as assert } from "node:assert";
import test from "node:test";

import packageOverrideHandoverPack from "./fixtures/package-override-handover.runtime-pack.json" with { type: "json" };
import { validateRuntimePack } from "../src/index.js";

test("package override/handover runtime pack fixture stays structurally valid", () => {
  const result = validateRuntimePack(packageOverrideHandoverPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package override/handover runtime pack exposes current holder, lane, and bounded request visibility target-neutrally", () => {
  const packageEntry = packageOverrideHandoverPack.package_override_handover.pkgho_boiler_supervisor_overrides_1;
  assert.equal(packageEntry.handover_summary.current_holder_id, "manual_owner");
  assert.equal(packageEntry.handover_summary.current_lane, "manual");
  assert.equal(packageEntry.handover_summary.requested_holder_id, "service_owner");
  assert.equal(packageEntry.handover_requests.release_to_auto.state, "accepted");
  assert.equal(packageEntry.handover_requests.service_takeover.blocked_reason, "blocked_by_policy");
});
