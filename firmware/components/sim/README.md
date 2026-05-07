# Simulator Component

Stage 26 adds a host-side deterministic simulator and integration harness for end-to-end runtime validation before hardware bring-up.

Current scope:
- explicit-time `SimClock`
- typed scheduled event injection
- simple deterministic plant models for pressure, flow and temperature
- `SimHarness` wiring real runtime services to mock HAL backends
- `SimScenarioRunner` for fixed-step scenario execution
- structured simulator status and result reporting

Intentionally postponed:
- real hardware backends
- hidden wall-clock timing, sleeps or threads
- HTTP, Web UI or real MQTT broker integration
- high-fidelity physics, CFD or generic SCADA simulation
