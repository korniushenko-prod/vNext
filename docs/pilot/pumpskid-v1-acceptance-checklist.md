# PumpSkid v1 Acceptance Checklist

## Automated

- [x] canonical pilot project materializes without diagnostics
- [x] canonical artifact is deterministic
- [x] fresh apply succeeds
- [x] no-op re-apply is stable
- [x] explicit parameter diff is bounded and readable
- [x] template-derived effective diff is bounded and readable
- [x] normalized readback shows no phantom drift
- [x] reboot-style restore remains stable in the synthetic harness
- [x] commissioning walkthrough is executable from the current surface
- [x] degraded states remain understandable
- [x] missing binding and unsupported target diagnostics remain explicit

## Manual / External Evidence

- [ ] bench screenshots attached
- [ ] operator notes attached
- [ ] physical reboot note attached

## Decision Gate

- if all automated items pass and no blocker exists, the MVP is acceptable for
  controlled internal pilot usage
- if manual evidence is still pending, acceptance must be recorded as
  `ready-with-known-issues`, not `fully bench-signed-off`
