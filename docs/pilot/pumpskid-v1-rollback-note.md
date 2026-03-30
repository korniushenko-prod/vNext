# PumpSkid v1 Rollback Note

## Use Rollback If

- apply/readback becomes non-deterministic
- the target reports a state not explainable by the canonical bundle
- persistence restore contradicts the canonical readback after reboot
- the operator walkthrough hits a blocker that requires hidden engineering steps

## Rollback Steps

1. Stop the rollout session and mark the session as `hold`.
2. Preserve the mismatching artifact, readback dump, timestamps, and operator notes.
3. Reapply only the last known-good canonical artifact from:
   `docs/pilot/pumpskid-v1-controlled-pilot.artifact.json`
4. Confirm that the bounded readback path returns to the canonical baseline.
5. Move any corrective work into a separately tracked bugfix or post-pilot backlog item.

## Not Allowed

- silent patch-in-place changes to the pilot package
- replacing the canonical artifact with an unreviewed local variant
- relabeling a blocker as a harmless guardrail without written review
