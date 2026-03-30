const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PACKAGE_COMMISSIONING_FIXTURES
} = require("../../src/packages/fixtures/package-commissioning-fixtures");
const {
  createPackageCommissioningViewModel,
  renderPackageCommissioningMarkup
} = require("../../src/packages/ui/package-commissioning-surface");

function pilotFixture() {
  return structuredClone(PACKAGE_COMMISSIONING_FIXTURES.find((entry) => entry.id === "package-commissioning-pump-skid-supervisor-pilot"));
}

test("documented commissioning walkthrough stays executable from the current pilot surface without hidden steps", () => {
  const surface = createPackageCommissioningViewModel({
    fixture: pilotFixture()
  });
  const markup = renderPackageCommissioningMarkup(surface);

  assert.match(markup, /Package Summary/);
  assert.match(markup, /Configuration \/ Apply/);
  assert.match(markup, /Parameter Groups/);
  assert.match(markup, /Binding Summary/);
  assert.match(markup, /Live Signals/);
  assert.match(markup, /Operation Cards/);
  assert.match(markup, /Ownership \/ Override/);
  assert.match(markup, /Permissive \/ Interlock/);
  assert.match(markup, /Protection \/ Recovery/);
  assert.match(markup, /Diagnostics/);
  assert.match(markup, /Apply To Target/);
  assert.match(markup, /Readback matches the bounded pilot package baseline/);
});

test("commissioning walkthrough keeps no_snapshot, unsupported, stale, and failed-operation feedback understandable", () => {
  const fixture = pilotFixture();
  fixture.configuration.readback_status.state = "no_snapshot";
  fixture.configuration.readback_status.summary = "No readback snapshot has been collected yet after opening the commissioning surface.";
  fixture.commissioning.operation_cards[0].state = "failed";
  fixture.commissioning.operation_cards[0].summary = "Reset Runtime Counter failed because confirmation was not supplied.";
  fixture.commissioning.permissive_interlock.state = "unsupported_by_target";
  fixture.commissioning.permissive_interlock.summary = "Permissive lane is visible but currently unsupported on this degraded target baseline.";
  fixture.diagnostics = [
    { severity: "warning", code: "target.readback.stale", summary: "Readback snapshot is older than the commissioning freshness window." },
    { severity: "warning", code: "target.operations.failed", summary: "Reset Runtime Counter failed because confirmation was not supplied." },
    { severity: "info", code: "target.package_permissive_interlock.unsupported", summary: "Permissive/interlock summary is visible but unsupported by the degraded target lane." }
  ];

  const surface = createPackageCommissioningViewModel({ fixture });
  const markup = renderPackageCommissioningMarkup(surface);

  assert.equal(surface.configuration.readback_status.state, "no_snapshot");
  assert.equal(surface.commissioning.operation_cards[0].state, "failed");
  assert.equal(surface.commissioning.permissive_interlock.state, "unsupported_by_target");
  assert.match(markup, /no_snapshot/);
  assert.match(markup, /unsupported_by_target/i);
  assert.match(markup, /confirmation was not supplied/i);
  assert.match(markup, /target\.readback\.stale/);
});
