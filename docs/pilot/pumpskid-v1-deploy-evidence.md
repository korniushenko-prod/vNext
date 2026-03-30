# PumpSkid v1 Deploy Evidence

## Canonical Build

- project:
  `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.project.e2e.json`
- runtime pack:
  `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.runtime-pack.snapshot.json`
- artifact:
  `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.shipcontroller-artifact.json`

## In-Repo Evidence

- synthetic deploy/apply path is covered by:
  `targets/esp32-target-adapter/tests/pilot-deploy-readback.test.ts`
- full commissioning path is covered by:
  `apps/config-studio/tests/packages/package-commissioning-e2e.test.js`
- sign-off verification harness extends this with no-op re-apply and diff checks in:
  `apps/config-studio/tests/packages/package-pilot-verification-harness.test.js`

## Captured Facts

- artifact emission is deterministic
- apply returns explicit checksum/config-version metadata
- no-op re-apply does not create phantom drift
- explicit parameter and template-derived updates produce bounded diffs

## Missing External Evidence

- real bench screenshots/logs are not attached yet
- operator-side deploy observations are not attached yet
