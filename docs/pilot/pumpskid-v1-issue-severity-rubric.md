# PumpSkid v1 Issue Severity Rubric

## Blocker

Use when any of the following is true:
- deploy/apply fails on the canonical pilot path
- readback contradicts effective applied values in a way that hides the real target state
- package mode / operation semantics become misleading or unsafe to interpret
- pilot commissioning cannot be completed without raw JSON or source-code knowledge

## Major

Use when:
- degraded states are surfaced but confusing
- bounded operations work but feedback is ambiguous
- diff or persistence behavior is unstable but recoverable
- package remains usable only with workaround steps

## Minor

Use when:
- copy, labels, or grouping cause friction but not wrong action
- evidence formatting is incomplete
- diagnostics are slightly noisy but still interpretable

## Non-Issue

Do not log as defect when:
- the platform intentionally remains bounded
- unsupported lanes are explicitly labeled as unsupported
- manual bench evidence is pending but synthetic verification already marks the
  gap clearly
