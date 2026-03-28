# Working Bases Import Manifest

Date: 2026-03-28
Status: accepted
Canonical repo: `vNext`

## Decision

`vNext` is the only active working repository.
The previous projects are preserved here as imported historical working bases.

## Imported Bases

### 1. ShipController runtime base

Source:
- `C:\Users\Administrator\Documents\PlatformIO\Projects\ShipController`

Imported into:
- `targets/shipcontroller-esp32`

Purpose:
- runtime
- hardware integration
- target execution
- embedded services

### 2. universal_plc authoring base

Source:
- `C:\Users\Administrator\Documents\PlatformIO\Projects\universal_plc`

Imported into:
- `apps/config-studio/legacy-universal_plc`

Purpose:
- editor
- authoring model
- UI shell
- previous config studio implementation

## Exclusions

The import intentionally excludes:
- `.git`
- `.pio`
- `.vscode`
- temporary caches
- generated build folders
- ad-hoc integration workspaces
- zip archives

## Working Rule

From this point forward:
- new work happens only in `vNext`
- `ShipController` and `universal_plc` are treated as historical bases
- code is reused by controlled migration into canonical packages/apps/targets inside `vNext`

## Immediate Layout

- `apps/config-studio` — current vNext config studio app
- `apps/config-studio/legacy-universal_plc` — imported legacy authoring base
- `targets/shipcontroller-esp32` — imported runtime base
- `packages/*` — canonical shared contracts and future shared logic
