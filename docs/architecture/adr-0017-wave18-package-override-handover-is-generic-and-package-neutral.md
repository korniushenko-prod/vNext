# ADR-0017: Wave 18 Package Override Handover Is Generic And Package-Neutral

## Status

Accepted

## Context

Wave 18 introduces package-level override / handover as an additive layer over
already flattened child members.

The accepted reference slices are:

- `BoilerSupervisorOverrides v1`
- `PumpSkidSupervisorOverrides v1`

The architecture must allow package-level authority holders, explicit current /
requested holder summary, and bounded handover requests without reopening
package execution runtime, safety semantics, or vendor/domain-specific
handover engines.

## Decision

Package override / handover is frozen as:

- additive authoring metadata in `ProjectModel`
- additive runtime metadata in `RuntimePack.package_override_handover`
- additive target-facing metadata in adapter capability/readback/artifact layers
- additive read-only package overview surface in `config-studio`

Package override / handover remains:

- generic
- package-neutral
- metadata-first
- execution-neutral
- non-safety

Canonical holder lanes are:

- `auto`
- `manual`
- `service`
- `remote`

Canonical request kinds are:

- `request_takeover`
- `request_release`
- `request_return_to_auto`

Canonical request states are:

- `accepted`
- `blocked`
- `denied`
- `unsupported`

Canonical denial reasons are:

- `blocked_by_policy`
- `held_by_other_owner`
- `not_available`

## Consequences

- package override / handover does not create a package execution engine
- package override / handover does not create backend handover transport
- package override / handover does not introduce safety semantics
- holder/request refs remain flattened child runtime objects
- boiler-like content remains reference-only and non-privileged
- the second non-boiler domain remains mandatory for acceptance

## Freeze Boundary

Frozen in Wave 18:

- authority holders
- handover summary
- bounded handover requests
- summary outputs
- aggregate monitors
- trace groups
- synthetic target snapshots
- deterministic ShipController artifact section
- read-only package overview surface

Explicitly not opened by Wave 18:

- package-local imperative handover execution
- backend transport for handover requests
- operator handover wizard flows
- safety workflows
- vendor-specific override / handover logic
