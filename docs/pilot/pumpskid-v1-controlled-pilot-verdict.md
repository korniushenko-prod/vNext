# PumpSkid v1 Controlled Pilot Verdict

## Status

`ready-for-controlled-pilot-with-guardrails`

## Allowed Final Verdicts

- `ready-for-controlled-pilot`
- `ready-for-controlled-pilot-with-guardrails`
- `hold-for-fixes`

## Bench Summary

- canonical bench used:
  `LilyGO LoRa32 T3_V1.6.1 + OLED`, `ESP32-C3 bench injector`, `GPIO34/35` input path, `GPIO25` output LED
- deploy completed:
  yes
- readback captured:
  yes
- reboot verified:
  yes
- persistence verified:
  yes within current bench scope
- commissioning walkthrough completed:
  yes, bounded bench walkthrough
- operator notes attached:
  yes, thread + repo evidence trail
- physical evidence attached:
  yes, bounded bench confirmation through live device behavior

## Final Verdict

`ready-for-controlled-pilot-with-guardrails`

## Rationale

The bounded PR-35A bench phase passed on April 16, 2026.

Confirmed on the live bench:

- `run_feedback_1` stable on `GPIO34`
- `fault_feedback_1` stable on `GPIO35`
- output proof on `GPIO25` through the LED lamp
- channels/signals visible in the UI without manual refresh fighting
- reboot path returns with readable data and expected output activity

Guardrails remain:

- this verdict is a bench-scope verdict, not field validation
- frontend stabilization and machine-first roadmap work continue separately
- advanced UI/editor surfaces were stabilized enough for bench use, but are not reclassified as field-proven
