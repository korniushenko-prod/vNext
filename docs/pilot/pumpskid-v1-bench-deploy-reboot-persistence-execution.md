# PumpSkid v1 Bench Deploy / Reboot / Persistence Execution

## Execution Status

`ready-with-external-evidence-gap`

## Scenario Status

1. deploy:
   bounded in-repo harness is green
2. apply:
   bounded adapter apply path is green
3. readback:
   canonical readback package is deterministic in repo
4. warm reboot:
   reboot-style restore remains reproducible in repo
5. cold reboot / power cycle:
   external/manual evidence only
6. persistence after reboot:
   proven in repo, physical proof still external
7. degraded boot note:
   no hidden degraded bootstrap path is introduced; degraded cases remain explicit diagnostics

## Evidence Sources

- deploy/readback report:
  `docs/pilot/pumpskid-v1-deploy-readback-report.md`
- reboot/persistence report:
  `docs/pilot/pumpskid-v1-reboot-persistence-report.md`
- deploy evidence inventory:
  `docs/pilot/pumpskid-v1-deploy-evidence.md`
- readback evidence inventory:
  `docs/pilot/pumpskid-v1-readback-evidence.md`
- reboot evidence inventory:
  `docs/pilot/pumpskid-v1-reboot-persistence-evidence.md`
- physical photo placeholder:
  `docs/pilot/pumpskid-v1-bench-photos/README.md`

## Known Gap

The repo still does not contain attached live bench photos, live reboot logs, or
power-cycle proof. That gap is acceptable only under a guarded controlled-pilot
verdict and must stay explicit.
