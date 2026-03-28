# Web UI LittleFS Migration Plan v1

## Goal

Reduce firmware flash usage by moving the Web UI out of the firmware binary and into `LittleFS`, while keeping:

- the current API contract
- the current runtime model
- a safe fallback path during migration

The migration must be incremental, so the project can keep running on hardware after each step.

## Why This Matters

Current firmware size pressure is driven mostly by:

- the large built-in HTML/CSS/JS payload in `src/web/web.cpp`
- embedded help/popover text
- embedded `ru/en` localization strings
- always-linked platform libraries such as `WiFi`, `WebServer`, `OLED`, `LoRa`

Moving the UI payload to `LittleFS` is the largest practical flash reduction available without changing the runtime architecture.

## Agreed Migration Strategy

Use a **dual-mode transition**:

1. If `LittleFS` contains `/index.html`, serve the Web UI from filesystem.
2. If it does not exist yet, keep serving the current built-in fallback UI from firmware.

This makes the migration safe:

- no big-bang rewrite
- no forced switch on hardware
- easy rollback

## Phase 1

### Objective

Introduce filesystem-backed UI serving without removing the current built-in page.

### Deliverables

- `handleRoot()` first tries to serve `/index.html` from `LittleFS`
- unmatched static routes are served from `LittleFS` when files exist
- current built-in UI remains as fallback

### Result

The firmware is ready to accept a file-based UI at any time, but existing devices still work without uploading Web assets yet.

### Current Status

- completed
- `data/index.html` already contains the extracted current Web UI
- firmware now keeps only a minimal built-in recovery page
- measured firmware flash usage dropped to about `76.5%`

## Phase 2

### Objective

Move the current single-page UI into files under `data/`.

### Proposed file split

- `data/index.html`
- `data/app.css`
- `data/app.js`
- `data/help.ru.json`
- `data/help.en.json`
- `data/i18n.ru.json`
- `data/i18n.en.json`

### Rules

- keep API endpoints unchanged
- no duplicated business logic in frontend and backend
- only move presentation, localization, and help data first

### Current Status

- in progress
- `index.html` is already separated from firmware and now references:
  - `app.css`
  - `app.js`
- the largest text dictionaries are now separated too:
  - `app-i18n.js`
  - `app-help.js`
  - `app-ui-text.js`
- the main frontend runtime is now separated into:
  - `app.js`
  - `app-features.js`
  - `app-init.js`
- the feature layer is now also split by area:
  - `app-signals.js`
  - `app-blocks.js`
  - `app-display.js`
  - `app-templates.js`
- `app-features.js` is now the shared layer for overview, channels, diagnostics, settings, and bootstrap-related rendering
- next practical extraction targets:
  - optional later conversion of frontend dictionaries from JS globals to JSON assets
  - continued cleanup of shared helpers only where it clearly improves maintainability without over-fragmenting the UI

## Phase 3

### Objective

Reduce firmware `rodata` by removing embedded help/localization blobs from `web.cpp`.

### Deliverables

- help content loaded from JSON files
- UI strings loaded from JSON or modular JS objects
- reduced inline `R"rawliteral(...)"` size

## Phase 4

### Objective

Break the monolithic frontend into maintainable pieces.

### Proposed frontend structure

- `app.js`
- `api.js`
- `state.js`
- `tabs/overview.js`
- `tabs/signals.js`
- `tabs/blocks.js`
- `tabs/display.js`
- `shared/help.js`
- `shared/i18n.js`

This is a UI maintainability step first, but it also helps keep future flash growth under control.

## Phase 5

### Objective

Add compile-time product profiles for optional subsystems.

### Candidate feature flags

- `FEATURE_LORA`
- `FEATURE_OLED`
- `FEATURE_DISPLAY_WEB`
- `FEATURE_TEMPLATE_EDITOR`

This is the second major flash reduction lever after moving the UI out of firmware.

## Constraints

- do not break the current configuration model
- do not remove the current API endpoints
- do not introduce a second display or signal model
- keep operator/commissioning/advanced behavior consistent across migration

## Immediate Next Step

After the current split, the next practical move is:

1. stabilize the multi-file frontend on real hardware
2. keep the area-based JS split stable during feature work
3. avoid further micro-splitting unless it clearly reduces coupling
4. move next product work into reusable UI modules instead of growing `app-features.js` again
