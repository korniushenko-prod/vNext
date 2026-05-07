# Firmware

This directory contains the firmware runtime modules and hardware abstraction for the controller.

The runtime architecture remains board-agnostic.
The current primary bring-up baseline is ESP32 on LILYGO T3 V1.6.1 / LoRa32 V2.1.6.

The current RC keeps two target compile surfaces:
- `lilygo_t3_v161_bringup` for Stage 27 regression compile coverage
- `lilygo_t3_v161_bench_web` for Stage 29/30 browser and bench validation
