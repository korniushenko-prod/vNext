# Safety

## Important disclaimer

This project is not a certified safety PLC.

This project is not a certified burner management system.

External hardware safety devices are required for real machinery where applicable, including:
- emergency stop chains
- flame safeguard devices
- thermal relays
- fuses
- contactors
- independent thermostats or pressure switches
- normally closed independent safety chains

## Firmware expectations

The firmware must fail safe.

Safety and Trip must always override:
- Manual
- PID
- Sequence
- Rules

Invalid configuration must not be applied. If validation fails, outputs must remain in or return to safe state.

Manual mode must never override Safety or Trip.
