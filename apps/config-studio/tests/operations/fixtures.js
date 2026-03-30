const fs = require("node:fs");
const path = require("node:path");
const {
  READONLY_OPERATION_FIXTURES
} = require("../../src/operations/fixtures/operation-readonly-fixtures");

const workspaceRoot = path.resolve(__dirname, "../../../../");
const fixtureRoot = path.resolve(__dirname, "./fixtures");

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
}

const metadataOnlySupport = {
  enabled: true,
  invoke: false,
  cancel: false,
  progress: false,
  result_payload: false,
  confirmation: true
};

function fixtureById(id) {
  const fixture = READONLY_OPERATION_FIXTURES.find((entry) => entry.id === id);
  return fixture ? structuredClone(fixture) : null;
}

module.exports = {
  loadJson,
  metadataOnlySupport,
  pulseFlowmeterPack: loadJson("packages/materializer-core/tests/fixtures/pulse-flowmeter.runtime-pack.snapshot.json"),
  runHoursPack: loadJson("packages/materializer-core/tests/fixtures/run-hours-counter.runtime-pack.snapshot.json"),
  maintenancePack: loadJson("packages/materializer-core/tests/fixtures/maintenance-counter.runtime-pack.snapshot.json"),
  pidPack: loadJson("packages/materializer-core/tests/fixtures/pid-controller.runtime-pack.snapshot.json"),
  pidAutotunePack: loadJson("targets/esp32-target-adapter/tests/fixtures/pid-controller-autotune.runtime-pack.json"),
  timedRelayPack: loadJson("packages/materializer-core/tests/fixtures/timed-relay.runtime-pack.snapshot.json"),
  readonlyFlowmeterFixture: fixtureById("operations-readonly-flowmeter"),
  readonlyRunHoursFixture: fixtureById("operations-readonly-runhours"),
  readonlyMaintenanceFixture: fixtureById("operations-readonly-maintenance"),
  readonlyPidFixture: fixtureById("operations-readonly-pid"),
  readonlyUnsupportedFixture: fixtureById("operations-readonly-unsupported")
};
