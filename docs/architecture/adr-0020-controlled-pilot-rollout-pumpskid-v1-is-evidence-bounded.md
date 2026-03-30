# ADR-0020: Controlled Pilot Rollout For PumpSkidSupervisor v1 Is Evidence-Bounded

## Status

Accepted

## Context

`PumpSkidSupervisor v1` already has a frozen pilot MVP and a bounded sign-off
bundle. The next track is not a new platform wave. It is a rollout track that
must:

- keep the pilot bundle frozen
- use one canonical project/artifact/readback triplet
- separate in-repo proof from physical/manual evidence
- allow only guarded controlled pilot release decisions

## Decision

Controlled pilot rollout for `PumpSkidSupervisor v1` is treated as an
evidence-bounded operational track.

This means:

- rollout uses the canonical controlled pilot bundle in `docs/pilot/`
- rollout verdicts are limited to:
  - `ready-for-controlled-pilot`
  - `ready-for-controlled-pilot-with-guardrails`
  - `hold-for-fixes`
- missing physical/manual evidence must stay explicit and classified
- no new platform/package capabilities may be introduced under rollout pressure

## Consequences

- the rollout can move forward only under documented guardrails
- evidence closure becomes part of the source-controlled deliverable set
- any live contradiction against canonical artifact/readback becomes rollout-hold material
- broader product/platform changes stay outside this track
