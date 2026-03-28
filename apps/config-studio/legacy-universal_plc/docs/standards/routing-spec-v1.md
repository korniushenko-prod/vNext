# Routing Spec v1

## Purpose

`Routing Spec v1` defines how visual routes between system objects should behave in the platform editor.

This document exists to prevent the routing map from turning into ad-hoc SVG heuristics. It gives us one stable contract for:

- UI behavior
- visual readability
- model constraints
- future incremental router work

The routing engine must serve the editor and the user first. It is not only a geometry problem. It is a readability problem.

## Scope

This spec covers:

- `System / Signals & Routing`
- visual routing between top-level object ports
- route interaction on the routing canvas

This spec does not yet cover:

- internal `Flow` node routing inside component editors
- hardware wiring views
- operator-facing runtime dashboards

## Core Principles

### 1. Orthogonal Only

Routes must use Manhattan geometry:

- horizontal segments
- vertical segments
- 90-degree turns only

No diagonal lines.
No bezier curves.

### 2. Strong Port Sides

Ports have fixed sides:

- inputs on the left
- outputs on the right

Routes must respect the side of the port.

That means:

- an output leaves the object to the right first
- an input is entered from the left last

These are mandatory stubs, not optional style choices.

### 3. Objects Are Obstacles

Each object has a forbidden routing zone.

This zone is not just the visible card rectangle. It includes clearance around the card.

Routes must not pass:

- through the object body
- through its clearance zone

This is the single most important visual rule.

### 4. Use Corridors, Not Freehand Space

Routes should travel through reserved routing corridors.

The router should prefer:

- gaps between object groups
- inter-layer corridors
- outer fallback corridors

Routes should not choose arbitrary free space when a corridor exists.

### 5. Shared Trunk For Fan-Out

If one signal feeds multiple targets:

- use one shared trunk
- split into branches close to target groups
- branch again only when necessary

Do not draw one long independent line per target if the signal is clearly one logical route.

### 6. Layered Reading Direction

The default reading direction is left to right.

So:

- source-heavy objects tend left
- consumer-heavy objects tend right
- forward signals should prefer forward corridors
- return signals should use separate return corridors

### 7. Shortest Readable Path

The goal is not shortest Euclidean geometry.
The goal is shortest readable orthogonal path.

The router should prefer:

- the nearest valid corridor
- fewer turns
- less scenic detour
- less crossing

### 7.1 Column Stack Exception

If a group of objects forms a mostly vertical stack with overlapping horizontal footprint, the router may prefer a shared side-bus corridor along the left or right side of the stack.

This is often more readable than forcing the route through small internal gaps.

Use this when:

- objects visually form a column
- the side corridor is clean
- the route reads like a vertical bus or feedback spine

Do not use this as a default excuse for large scenic loops.

### 8. Predictable Parallel Offsets

If multiple routes use the same corridor:

- they should run in parallel
- they should preserve minimum spacing
- they should not collapse into each other randomly

Shared overlap is allowed only on a deliberate shared trunk.

### 9. Incremental Behavior

When an object moves:

- recompute affected route families
- preserve stable route identity where possible
- avoid full chaotic reroute when unnecessary

The editor should feel controllable, not alive in the bad sense.

### 10. Gloss Pass

After base routing, apply a simplification pass:

- remove unnecessary bends
- merge collinear segments
- shorten redundant trunks
- tighten branch entry where safe

Primary route solving and visual cleanup are separate phases.

## Routing Model

### Object

Each routed object must expose:

- `id`
- `x`
- `y`
- `w`
- `h`
- `clearance bounds`
- input ports
- output ports

### Port

Each routed port must expose:

- owning object
- side
- anchor point
- signal/data type

### Signal Route

A system signal route consists of:

- one source output
- zero or more target inputs
- one or more route segments

### Route Family

A route family is a subset of one signal route routed together because they share a major corridor.

Examples:

- forward family
- return family
- same-layer family

### Corridor

A corridor is a routing lane or routing band where orthogonal segments are allowed.

Types:

- inter-layer corridor
- local gap corridor
- outer top corridor
- outer bottom corridor
- return side corridor

## Required Router Passes

### Pass 1. Scene Layout

Place objects in stable scene coordinates.

Requirements:

- keep layer ordering
- avoid card overlap
- preserve manual placement when possible

### Pass 2. Clearance Map

Build forbidden zones for all objects.

Requirements:

- visible card bounds
- inflated clearance bounds
- port stub allowance outside card edge

### Pass 3. Corridor Discovery

Find routing corridors.

Requirements:

- inter-layer corridors
- local horizontal windows between groups
- outer fallback corridors
- return corridors

### Pass 4. Family Routing

Route each signal as one or more route families.

Requirements:

- forward family separation from return family
- shared trunk where appropriate
- shortest readable corridor choice

### Pass 5. Track Reservation

Reserve space inside a corridor for each route.

Requirements:

- minimum spacing between parallel routes
- stable offsets for repeated routes
- no accidental overlap except on shared trunk

### Pass 6. Gloss

Clean the result.

Requirements:

- remove redundant bends
- merge straight segments
- shorten branch approach where safe

## UI Interaction Rules

### Route Creation

User may create a route by:

- drag from output to input
- using `Add Route`

If drag is used:

- source and target bindings are prefilled
- route form asks only for what is still missing

### Route Selection

When the user clicks a route:

- the route becomes selected
- the signal appears in inspector
- route metadata and bindings become editable

### Port Highlighting

When dragging from an output:

- only compatible inputs are highlighted
- incompatible inputs stay passive

### Route Editing

The route is edited through:

- routing canvas selection
- inspector fields

The canvas is for topology.
The inspector is for detail editing.

## Visual Rules

### Minimum Clearance

Every route must stay outside object clearance.

### Minimum Track Spacing

Parallel tracks must keep a consistent visible gap.

### Shared Trunk Visibility

If a signal has fan-out:

- shared segments should look shared
- branch points should be visually legible

### Avoid Decorative Loops

Large outer loops are allowed only when they are truly necessary.

They are not acceptable as the default answer when a local corridor exists.

## Priority Order

If rules conflict, routing should optimize in this order:

1. do not cross forbidden object bounds
2. respect port sides
3. preserve signal correctness
4. prefer local readable corridor
5. minimize crossings
6. minimize bends
7. minimize overall path length

## Current Gaps

As of `v1`, the editor still needs stronger implementation in:

- obstacle-aware corridor construction
- explicit lane reservation against nearby object fields
- crossing minimization
- gloss pass after routing
- more stable incremental reroute after drag

## Implementation Direction

The current code should move toward:

- real corridor graph construction
- route-family based solving
- shared trunk + branch routing
- obstacle-aware lane reservation
- post-route glossing

This spec should be treated as the canonical routing contract for future UI work.
