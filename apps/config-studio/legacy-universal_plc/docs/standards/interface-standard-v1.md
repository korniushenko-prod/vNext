# Interface Standard v1

All native controllers use standard port families:

- `request.*`
- `command.*`
- `demand.*`
- `permit.*`
- `trip.*`
- `alarm.*`
- `feedback.*`
- `status.*`
- `state.*`
- `config.*`

Required runtime properties:

- typed ports only
- deterministic tick behavior
- explainable blocking/fault state
- lifecycle compatibility across controllers

Lifecycle contract for process controllers:

- `request.start`
- `request.stop`
- `request.reset`
- `permit.start`
- `permit.run`
- `trip.any`

Initial official contracts captured in code:

- `PermissiveGroup`
- `TripGroup`
- `AlarmObject`
- `PumpPairController`
- `SequenceController`
