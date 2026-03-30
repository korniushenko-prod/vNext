# Pilot Sign-off Acceptance Gates

## Gate 1: Frozen Scope Intact

- no new platform features
- no hidden pilot behavior drift
- no silent fixture rewrites that change meaning

## Gate 2: Canonical Path Traceable

- canonical project, runtime pack, artifact, readback, and commissioning
  fixture are explicitly referenced
- deploy/apply/readback evidence points to the same bounded pilot package

## Gate 3: Verification Baseline Still Green

- `config-studio` verification harness remains green
- bounded deploy/apply/readback path remains green
- no unexplained drift in canonical pilot outputs

## Gate 4: Manual Evidence Package Exists

- bench evidence inventory exists
- missing physical evidence is listed explicitly
- no fabricated manual evidence is presented as captured evidence

## Gate 5: Rollout Decision Is Explicit

One and only one verdict is allowed:
- `ready-for-controlled-pilot`
- `ready-for-controlled-pilot-with-guardrails`
- `hold-for-fixes`

## Gate 6: Rollback Rule Exists

- rollout guardrails are documented
- rollback triggers are documented
- post-pilot backlog is separated from sign-off
