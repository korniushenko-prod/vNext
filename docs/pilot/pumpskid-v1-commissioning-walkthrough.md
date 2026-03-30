# PumpSkid v1 Commissioning Walkthrough

## Goal

Verify that a developer or service engineer can use the current
`config-studio` commissioning surface without hidden steps.

## Walkthrough

1. Open `PumpSkidSupervisor v1` in `config-studio`.
2. Inspect the package summary cards for state, mode, phase, pressure, and
   runtime.
3. Review the configuration/apply block:
   - template
   - preset
   - parameter groups
   - bench bindings
4. Apply the bounded pilot pack to the ESP32 pilot target.
5. Collect readback.
6. Review live signals.
7. Review bounded operation cards.
8. Review ownership / override summary.
9. Review permissive / interlock summary.
10. Review protection / recovery summary.
11. Review diagnostics.

## Expected UX Outcome

- the operator can tell what is currently active
- the operator can tell what is configurable
- the operator can tell what is degraded or unsupported
- the operator can interpret `no_snapshot`, `stale`, and failed-operation states
  without inspecting raw JSON

## Friction Notes

- current surface is intentionally read-heavy and verification-oriented
- no new wizard or redesign is introduced in this track
- unsupported lanes must stay explicit instead of being hidden
