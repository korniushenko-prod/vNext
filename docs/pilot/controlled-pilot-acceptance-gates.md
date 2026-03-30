# Controlled Pilot Acceptance Gates

## Gate 1: Scope Remains Frozen

- no new platform or package capabilities appear during rollout
- no hidden semantic drift is introduced into the pilot package
- no silent rewrite of canonical outputs is accepted

## Gate 2: Canonical Bundle Is Traceable

- project, artifact, readback, package overview, and commissioning references are explicit
- deploy/apply/readback evidence points to the same controlled pilot bundle

## Gate 3: Harness Is Repeatable

- rollout harness can rematerialize the same bounded package
- emitted artifact matches the canonical artifact
- apply/readback stays deterministic in the bounded adapter path

## Gate 4: Bench / Reboot / Persistence Evidence Is Closed Honestly

- in-repo evidence and external/manual evidence are separated explicitly
- no fabricated physical/manual evidence is presented as captured evidence
- missing physical evidence, if any, is classified as guardrail or blocker

## Gate 5: Operator Walkthrough Is Classified

- walkthrough route is documented
- friction points are recorded
- each friction point is classified as acceptable guardrail or rollout blocker

## Gate 6: Final Decision Is Explicit

Exactly one verdict is allowed:

- `ready-for-controlled-pilot`
- `ready-for-controlled-pilot-with-guardrails`
- `hold-for-fixes`
