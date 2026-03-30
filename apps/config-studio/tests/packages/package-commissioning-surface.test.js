const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PACKAGE_COMMISSIONING_FIXTURE_IDS,
  PACKAGE_COMMISSIONING_FIXTURES
} = require("../../src/packages/fixtures/package-commissioning-fixtures");
const {
  createPackageCommissioningViewModel,
  renderPackageCommissioningMarkup
} = require("../../src/packages/ui/package-commissioning-surface");

function fixtureById(id) {
  return PACKAGE_COMMISSIONING_FIXTURES.find((entry) => entry.id === id);
}

test("package commissioning fixtures expose the pilot commissioning baseline", () => {
  assert.deepEqual(PACKAGE_COMMISSIONING_FIXTURE_IDS, [
    "package-commissioning-pump-skid-supervisor-pilot"
  ]);
});

test("commissioning view model exposes package, apply, and live readback state", () => {
  const surface = createPackageCommissioningViewModel({
    fixture: fixtureById("package-commissioning-pump-skid-supervisor-pilot")
  });

  assert.equal(surface.package_definition.package_id, "std.pump_skid_supervisor.v1");
  assert.equal(surface.summary_cards.length, 8);
  assert.equal(surface.configuration.apply_result.state, "applied");
  assert.equal(surface.configuration.readback_status.state, "online");
  assert.equal(surface.commissioning.live_signals.length, 5);
  assert.equal(surface.commissioning.operation_cards.length, 3);
});

test("commissioning markup renders configuration, commissioning, and diagnostics sections", () => {
  const surface = createPackageCommissioningViewModel({
    fixture: fixtureById("package-commissioning-pump-skid-supervisor-pilot")
  });

  const markup = renderPackageCommissioningMarkup(surface);
  assert.match(markup, /Configuration \/ Apply/);
  assert.match(markup, /Binding Summary/);
  assert.match(markup, /Live Signals/);
  assert.match(markup, /Protection \/ Recovery/);
  assert.match(markup, /target\.apply\.applied/);
  assert.match(markup, /Readback matches the bounded pilot package baseline/);
});

test("commissioning surface keeps stale and mismatch diagnostics explicit", () => {
  const fixture = structuredClone(fixtureById("package-commissioning-pump-skid-supervisor-pilot"));
  fixture.configuration.readback_status.state = "mismatch";
  fixture.configuration.readback_status.summary = "Expected running=true but target readback returned false.";
  fixture.diagnostics = [
    { severity: "warning", code: "target.readback.mismatch", summary: "Expected running=true but target readback returned false." },
    { severity: "warning", code: "target.readback.stale", summary: "Readback snapshot is older than the commissioning freshness window." }
  ];

  const surface = createPackageCommissioningViewModel({ fixture });
  const markup = renderPackageCommissioningMarkup(surface);

  assert.equal(surface.configuration.readback_status.state, "mismatch");
  assert.match(markup, /target\.readback\.mismatch/);
  assert.match(markup, /target\.readback\.stale/);
  assert.match(markup, /Expected running=true but target readback returned false/);
});
