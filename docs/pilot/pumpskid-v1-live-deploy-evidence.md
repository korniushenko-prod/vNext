# PumpSkid v1 Live Deploy Evidence

## Status

`completed-bench-scope`

## Session Metadata

- hardware unit id:
  bounded bench rig
- target identity:
  LilyGO LoRa32 T3_V1.6.1 with OLED
- firmware / build version:
  live bench runtime as of April 16, 2026
- operator:
  local bench operator
- engineer:
  Codex pairing session
- session date:
  April 16, 2026
- session start time:
  live interactive session

## Frozen Inputs Used

- project:
  `docs/pilot/pumpskid-v1-controlled-pilot.project.json`
- artifact:
  `docs/pilot/pumpskid-v1-controlled-pilot.artifact.json`
- harness:
  `docs/pilot/pumpskid-v1-deploy-apply-readback-harness.md`

## Deploy Capture

- deploy command/process:
  PlatformIO upload and uploadfs through the bounded bench workflow
- target connectivity check:
  passed
- artifact checksum:
  repo-controlled frozen pilot inputs used
- deploy start timestamp:
  live session
- deploy end timestamp:
  live session
- result:
  passed within current bench scope

## Attached Evidence

- screenshot / photo refs:
  repo bench notes + live observed device behavior
- console log refs:
  request trace, serial checks, upload/apply/readback interaction during session
- mismatch note:
  none blocking for bench closure

## Bench Result

Bench phase completed and accepted for current scope. The result is sufficient
to close the bounded stage-testing phase, but not to claim field validation.
