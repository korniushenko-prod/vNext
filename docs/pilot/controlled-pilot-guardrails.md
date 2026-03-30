# Controlled Pilot Guardrails

## Allowed Guardrails

- use only the canonical controlled pilot bundle
- deploy only against the frozen bench profile in `docs/pilot/controlled-pilot-environment-manifest.md`
- treat missing in-repo physical screenshots as documentation gaps, not as implicit proof
- keep commissioning inside the existing bounded service flow
- log every mismatch against canonical project/artifact/readback before attempting rerun

## Known Limitations

- physical bench photos are still stored outside the repo
- live reboot / power-cycle evidence is still external/manual
- commissioning UX is acceptable but dense for first-time operators

## Rollout Hold Conditions

Hold or rollback the controlled pilot immediately if:

- emitted artifact differs from the canonical artifact without an approved pilot bugfix
- readback hides, omits, or contradicts actual target state
- retained values are lost after warm or cold restart
- an operator cannot finish the documented walkthrough without engineering-only context

## Not Allowed During Rollout

- ad-hoc feature tweaks under rollout urgency
- target-specific behavior expansion
- new generic platform abstractions
- silent drift in fixtures or docs that changes the meaning of the frozen pilot
