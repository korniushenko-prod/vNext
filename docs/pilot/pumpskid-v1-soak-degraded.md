# PumpSkid v1 Soak / Persistence / Degraded Notes

## Soak Baseline

The bounded pilot verification harness repeats:
- fresh apply
- no-op re-apply
- changed-value apply
- readback collection

The goal is to confirm:
- no checksum drift without config change
- no phantom drift in normalized readback
- no corruption of package summary state

## Persistence Baseline

The pilot target profile already declares persistence support and the canonical
pilot pack carries persistence slots for retained package members.

The verification harness confirms:
- persistence-bearing members are present in the effective pack
- a reboot-style restore using the same effective pack yields the same
  normalized readback

This remains a bounded synthetic persistence proof. A physical reboot note still
belongs to external bench evidence.

## Degraded Conditions

The verification track keeps the following degraded conditions explicit:
- `no_snapshot`
- stale readback
- failed operation response
- unsupported package lane
- missing hardware binding
- unsupported target profile

## Acceptance Rule

The pilot remains acceptable only while degraded conditions stay visible and
recoverable, without corrupting package state or hiding the real status from the
operator.
