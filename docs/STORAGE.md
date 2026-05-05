# Storage

## Purpose

Stage 2 adds a typed storage layer that is still portable and host-testable.

At this stage storage is responsible for:
- active config slot
- backup config slot
- deterministic CRC32 integrity checks
- validation-aware save and load flow
- fallback to backup or factory defaults
- migration hook presence
- protected lifetime totalizers
- typed event log skeleton

It is intentionally not responsible for:
- real ESP32 flash or NVS access
- JSON parsing or public config serialization
- runtime apply/rollback into live modules
- HAL, API, Web UI or MQTT

## Backend model

Storage uses a backend abstraction with named records.

Stage 2 provides only an in-memory/mock backend.

The backend interface supports:
- `read_record(key)`
- `write_record(key, bytes)`
- `erase_record(key)`
- `record_exists(key)`
- `list_record_keys()`

`list_record_keys()` is included so the storage service can enumerate totalizer records without coupling to a concrete persistence implementation.

## Config slots

Two typed config slots exist:
- `active`
- `backup`

Each stored config slot contains:
- slot kind
- schema version
- config version
- payload CRC32
- fingerprint derived from CRC32
- saved sequence placeholder
- internal payload bytes

The payload bytes are an internal deterministic snapshot of `DeviceConfig`.

Important:
- this snapshot is reversible for storage use
- it is not the public config import/export format
- public serialization remains postponed

## Integrity philosophy

CRC32 is calculated over the internal deterministic payload bytes.

That means:
- equal configs produce equal bytes
- equal bytes produce equal CRC values
- CRC does not depend on memory addresses or native struct layout

If a stored record fails CRC or cannot be decoded, that slot is treated as unusable.

## Load strategy

`load_best_available_config()` uses this fallback order:

1. active slot
2. backup slot
3. factory default config

The result carries:
- selected source
- structured storage issues
- storage health snapshot

Typical issues include:
- `STORAGE_RECORD_MISSING`
- `STORAGE_CRC_MISMATCH`
- `STORAGE_CONFIG_INVALID`
- `STORAGE_BACKUP_USED`
- `STORAGE_FACTORY_DEFAULT_USED`

Backup or factory fallback also adds a storage event log entry in this stage.

## Validation rules

Storage does not activate or save invalid config as active.

Validation is delegated to the Stage 1 config validator and its issues are surfaced alongside storage issues.

This keeps the storage component typed and strict without introducing runtime apply behavior.

## Factory reset

Stage 2 factory reset behavior is explicit:
- active slot becomes `factory_default_config()`
- backup slot is cleared
- protected lifetime totalizers are preserved
- event log is preserved by default

The reset itself appends an event log entry.

If a future stage wants different policies, they can be configured through `StorageServiceOptions`.

## Protected lifetime totalizers

Typed totalizer records exist now so future flow runtime can depend on stable storage semantics later.

Stage 2 supports at minimum keys such as:
- `flow1.raw_pulse_lifetime`
- `flow1.volume_lifetime`

Current type choices:
- raw pulse lifetime uses `uint64_t`
- volume lifetime uses `double`

`double` is chosen here for simplicity and host-side portability in Stage 2. If a later stage needs fixed-point semantics for field or billing reasons, that can be introduced behind the typed storage API.

Protection rules:
- normal reset does not clear protected totals
- factory reset does not clear protected totals
- direct writes are allowed only through the explicit storage service internal API
- protected reset attempts are denied and logged

## Event log skeleton

The event log is intentionally lightweight in Stage 2.

Each event carries:
- `event_id`
- `category`
- `severity`
- `code`
- `message`
- `sequence_number`
- `source`
- metadata map

Current max-size policy:
- bounded log
- truncate oldest entries first
- append returns `STORAGE_EVENT_LOG_FULL` as a warning when truncation occurs

Advanced filtering, RTC timestamps and export are postponed.

## What is postponed

Later stages may add:
- ESP32 NVS or flash backend
- FRAM/MRAM backend
- public JSON import/export
- migration execution policy beyond the hook surface
- runtime-triggered periodic save policy
- richer event filtering and retention controls
