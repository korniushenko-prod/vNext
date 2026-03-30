import { strict as assert } from "node:assert";
import test from "node:test";

import packageOverrideHandoverCapability from "./fixtures/package-override-handover-capability.json" with { type: "json" };
import packageOverrideHandoverSnapshot from "./fixtures/package-override-handover-snapshot.json" with { type: "json" };
import {
  validateTargetCapabilityProfile,
  validateTargetReadbackSnapshot
} from "../src/index.js";

test("package override/handover capability fixture stays structurally valid", () => {
  const result = validateTargetCapabilityProfile(packageOverrideHandoverCapability);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package override/handover snapshot fixture stays structurally valid", () => {
  const result = validateTargetReadbackSnapshot(packageOverrideHandoverSnapshot);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package override/handover fixtures expose bounded holder and handover request visibility", () => {
  assert.equal(packageOverrideHandoverCapability.package_override_handover_support.supported_request_kinds[0], "request_takeover");
  assert.equal(
    packageOverrideHandoverSnapshot.package_override_handover_snapshots.boiler_supervisor_overrides_1.handover_summary.current_holder_id,
    "manual_owner"
  );
  assert.equal(
    packageOverrideHandoverSnapshot.package_override_handover_snapshots.boiler_supervisor_overrides_1.handover_request_states.service_takeover.blocked_reason,
    "blocked_by_policy"
  );
});
