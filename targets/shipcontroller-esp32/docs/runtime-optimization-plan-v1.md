# Runtime Optimization Plan V1

## Goal

Improve runtime performance without breaking the human-readable JSON model.

## Principle

- `config` keeps string ids such as `input1`, `tank_level_selected`, `timer_1`
- `runtime` resolves these ids into indexes once after config load
- fast loops work with indexes, not repeated string lookups

## Why

The controller may process signals on:

- 10 ms loops
- 100 ms loops
- 1000 ms loops

Repeated `String` lookups in those loops will eventually waste CPU and add jitter.

## Current Step

Implemented for:

- `timer`
- `selector`

These blocks now keep resolved signal indexes for their hot paths.

## Migration Strategy

1. Keep JSON and UI readable
2. Add runtime resolve step after config load
3. Store indexes/handles in block runtime state
4. Run update loops by index
5. Keep unresolved blocks visible as config/runtime errors

## Next Candidates

- `comparator`
- `alarm`
- `scale/clamp/map`
- `PID`

## Rule

Do not optimize by making configuration unreadable.

Optimize by separating:

- user-facing config ids
- runtime-resolved execution graph
