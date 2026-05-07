# ConditionTree

## Purpose

`ConditionTree` is the shared condition language for future:
- Rules
- Sequence transitions and guards
- alarm condition sources
- PID guards
- service and test logic

Stage 8 adds only condition description, validation and evaluation. It does not execute actions.

## Model

The static tree model contains:
- `tree_id`
- `root_node_id`
- typed node collection

Every node contains:
- `node_id`
- optional `name` and `description`
- `kind`
- node-local timing and hysteresis options
- typed payload

The evaluator owns separate per-node runtime state. Static tree descriptors stay immutable after construction.

## Supported node kinds

Group nodes:
- `all`
- `any`
- `not`

Leaf nodes:
- `constant_bool`
- `signal_compare`
- `signal_range`
- `signal_flag`

## Supported value types

Leaf nodes use typed values:
- `bool`
- `int64`
- `double`
- `string`

`signal_compare` does not fall back to string-only matching. Numeric `int64` and `double` may be mixed. In mixed numeric comparisons, both sides are promoted to `double`.

## Operators

`signal_compare` supports:
- `eq`
- `neq`
- `gt`
- `gte`
- `lt`
- `lte`

Type rules:
- `bool` supports `eq` and `neq`
- `string` supports `eq` and `neq`
- `int64` and `double` support all compare operators
- unsupported operator and type combinations return structured errors

## Range nodes

`signal_range` supports inclusive numeric ranges with:
- lower bound
- upper bound
- `in_range` or `out_of_range`

Stage 8 rules:
- numeric signals only
- lower must be less than or equal to upper
- range hysteresis is postponed and rejected by the validator

## Signal flags

`signal_flag` reads `SignalRegistry` snapshot state and supports:
- `valid`
- `fault`
- `stale`
- `initialized`

The node compares the selected flag with an expected boolean.

## Validation

`validate_tree(tree)` rejects:
- empty trees
- missing roots
- duplicate node ids
- invalid child references
- payload and node kind mismatches
- invalid child counts for `all`, `any`, `not`
- unsupported delay or hysteresis placements
- invalid operator or range configuration

## Runtime and determinism

Evaluation depends only on:
- the current `SignalRegistry` contents
- explicit caller-supplied `now_ms`
- the evaluator's owned per-node runtime state

There is no hidden wall clock and no singleton state.

The evaluator is deterministic for repeated calls with the same:
- tree
- registry state
- `now_ms`
- evaluator runtime state

## Delay semantics

Stage 8 supports leaf-only delay on:
- `signal_compare`
- `signal_range`
- `signal_flag`

Stage 8 rejects delay on:
- group nodes
- `constant_bool`

Delay flow:
1. Compute raw result from the node payload.
2. Apply `delay_on_ms` for `false -> true` transitions.
3. Apply `delay_off_ms` for `true -> false` transitions.
4. Cancel pending transitions if the raw result flips back before the delay completes.

Repeated evaluation with the same `now_ms` is stable.

## Hysteresis semantics

Stage 8 supports hysteresis only on numeric `signal_compare` nodes with:
- `gt`
- `gte`
- `lt`
- `lte`

Stage 8 rejects hysteresis on:
- `eq`
- `neq`
- `signal_range`
- `signal_flag`
- group nodes
- `constant_bool`

Latch behavior uses the node's previous effective result:
- `gt` and `gte`: once true, stay true until value falls below `threshold - hysteresis`
- `lt` and `lte`: once true, stay true until value rises above `threshold + hysteresis`

## Trace ordering

The evaluator produces a flattened trace in deterministic post-order:
1. children in stored order
2. parent node after all children

The evaluator does not short-circuit trace generation for `all` or `any`. It still visits all relevant children so future UI can explain failures completely.

Each trace entry contains:
- `node_id`
- `node_kind`
- raw result
- effective result
- structured error code
- reason string
- optional `signal_path`
- optional value summary

## Intentionally postponed

Stage 8 does not add:
- Rules runtime
- Sequence Engine runtime
- automatic AlarmService condition evaluation
- action execution
- persistence for trees
- text expression parsing
- HTTP API, Web UI or MQTT
- ESP-IDF-specific backend work
