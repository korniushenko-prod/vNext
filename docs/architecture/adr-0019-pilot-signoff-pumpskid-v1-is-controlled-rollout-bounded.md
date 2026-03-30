# ADR-0019: PumpSkid v1 Pilot Sign-off Is Controlled-Rollout Bounded

Date: 2026-03-30

## Status

Accepted

## Context

`PumpSkidSupervisor v1` has already been frozen as the first bounded pilot MVP.
The verification track closed with `ready-with-known-issues`, mainly because
physical/manual evidence remained external to the repo.

The next step is not a new platform wave but a sign-off checkpoint deciding
whether the frozen pilot may proceed to a controlled pilot rollout.

## Decision

Pilot sign-off for `PumpSkidSupervisor v1` is accepted as a controlled-rollout
bounded step.

This sign-off step:
- reuses the already frozen pilot package and verification outputs
- may add only evidence packaging, verification wrappers, and documentation
- must not hide feature work, platform redesign, or silent fixture drift

The sign-off verdict for the in-repo checkpoint is:
- `ready-for-controlled-pilot-with-guardrails`

This verdict is valid only because:
- the bounded in-repo deploy/apply/readback path is green
- the commissioning surface remains understandable
- no blocker is present in canonical pilot semantics

It does **not** mean:
- full physical bench sign-off is complete
- safety sign-off exists
- rollout may expand beyond the bounded pilot target/profile

## Consequences

- the pilot package stays frozen
- any further change must be called out explicitly as bugfix or post-pilot work
- physical/manual evidence remains a required external complement to the in-repo
  sign-off bundle
- if live bench evidence contradicts canonical pilot behavior, rollout must be
  held and tracked as blocking follow-up
