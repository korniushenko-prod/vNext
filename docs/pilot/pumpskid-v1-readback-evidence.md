# PumpSkid v1 Readback Evidence

## Canonical Readback

- `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.readback.snapshot.json`

## In-Repo Evidence

- adapter readback loop:
  `targets/esp32-target-adapter/tests/pilot-deploy-readback.test.ts`
- commissioning alignment:
  `apps/config-studio/tests/packages/package-commissioning-e2e.test.js`
- normalized readback / no-drift scenarios:
  `apps/config-studio/tests/packages/package-pilot-verification-harness.test.js`

## Verified Properties

- readback becomes available only after apply
- readback carries package, mode/phase, resource, and operation summary state
- normalized no-op re-apply readback shows no phantom drift
- degraded `no_snapshot` / `mismatch` / `stale` cases remain explicit

## Missing External Evidence

- real target screenshots or exported logs are not attached in-repo
