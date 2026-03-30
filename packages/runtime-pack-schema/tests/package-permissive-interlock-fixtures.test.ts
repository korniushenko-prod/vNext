import { strict as assert } from "node:assert";
import test from "node:test";

import packagePermissiveInterlockPack from "./fixtures/package-permissive-interlock.runtime-pack.json" with { type: "json" };
import { validateRuntimePack } from "../src/index.js";

test("package permissive/interlock runtime pack fixture stays structurally valid", () => {
  const result = validateRuntimePack(packagePermissiveInterlockPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package permissive/interlock runtime fixture keeps gate ids qualified and package-neutral", () => {
  const gateEntry = packagePermissiveInterlockPack.package_permissive_interlock.pkggate_pkg_1;
  assert.equal(gateEntry.permissives.feedwater_ok.qualified_id, "pkggate_pkg_1.perm.feedwater_ok");
  assert.equal(gateEntry.interlocks.package_faulted.active_state, "faulted");
});
