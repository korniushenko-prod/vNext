# PumpSkid v1 Controlled Rollout Readiness Review

## Verdict

`ready-for-controlled-pilot-with-guardrails`

## What Is Proven

- frozen pilot package remains stable in repo
- deploy/apply/readback path is deterministic and repeatable
- no-op re-apply and bounded diff scenarios are explicit
- commissioning surface remains coherent for package state and degraded cases
- no blocker was found in the bounded in-repo pilot path

## What Is Still Manual

- physical bench photos
- deploy/readback screenshots from a live target
- physical reboot evidence
- attached operator notes

## What Is Still Risky

- final confidence still depends on external bench evidence quality
- current UI is acceptable but dense for first-time operators

## Explicitly Out Of Scope

- new features
- protocol expansion
- boiler/vendor expansion
- safety sign-off
- fleet rollout orchestration

## Rollout Guardrails

1. use only the frozen canonical pilot package and target profile
2. treat any behavior drift as rollout-blocking
3. record any live bench mismatch against canonical project/artifact/readback
4. do not merge feature work under sign-off label

## Rollback Plan

Rollback or hold the controlled pilot immediately if:
- apply/readback becomes non-deterministic
- readback hides or contradicts actual state
- persistence loses retained values after reboot
- operator cannot complete commissioning without raw JSON/source inspection

## Success Criteria

- controlled internal demo/tryout can be completed on the frozen pilot path
- known limitations remain bounded and documented
- no blocker appears during first controlled usage
