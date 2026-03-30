# ADR-0016: Wave 17 Package Arbitration Is Generic And Package-Neutral

## Status

Accepted

## Context

Wave 17 introduces package-level command arbitration as an additive layer over
already flattened child members.

The accepted reference slices are:

- `BoilerSupervisorArbitration v1`
- `PumpSkidSupervisorArbitration v1`

The architecture must allow package-level ownership lanes and explicit command
outcomes without reopening package execution runtime, hidden workflow engines,
or vendor/domain-specific command logic.

## Decision

Package arbitration is frozen as:

- additive authoring metadata in `ProjectModel`
- additive runtime metadata in `RuntimePack.package_arbitration`
- additive target-facing metadata in adapter capability/readback/artifact layers
- additive read-only package overview surface in `config-studio`

Package arbitration remains:

- generic
- package-neutral
- metadata-first
- execution-neutral

Canonical ownership lanes are:

- `auto`
- `manual`
- `service`
- `remote`

Canonical request kinds are:

- `request_start`
- `request_stop`
- `request_reset`
- `request_enable`
- `request_disable`

Canonical arbitration outcomes are:

- `accepted`
- `blocked`
- `denied`
- `superseded`
- `unsupported`

## Consequences

- package arbitration does not create a package execution engine
- package arbitration does not create vendor-specific command transport
- package arbitration does not introduce safety semantics
- command targets remain flattened child runtime instances
- boiler-like content remains reference-only and non-privileged
- the second non-boiler domain remains mandatory for acceptance

## Freeze Boundary

Frozen in Wave 17:

- ownership lanes
- ownership summary
- command lanes
- command summary
- summary outputs
- aggregate monitors
- trace groups
- synthetic target snapshots
- deterministic ShipController artifact section
- read-only package overview surface

Explicitly not opened by Wave 17:

- package-local imperative command execution
- backend transport for package commands
- package command wizard flows
- safety workflows
- vendor-specific command arbitration logic
