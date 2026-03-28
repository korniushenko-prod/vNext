# Autorouting Guide v1

## Purpose

This document explains how the current visual autorouting approach in `universal_plc` should be understood, maintained, and extended.

It is not just a note about SVG paths.
It is a practical implementation guide.

The goal is:

- readable system-level routes
- repeatable implementation rules
- clear boundaries between hard routing constraints and visual polish

## Scope

This guide applies to:

- `System / Signals & Routing`
- top-level object-to-object routes
- visual signal map rendering

It does not yet apply to:

- component internal flow routing
- hardware channel wiring
- runtime operator views

## Main Idea

A route is not just a line.
A route is the result of four layers:

1. object geometry
2. endpoint geometry
3. orthogonal route solving
4. safe visual polish

If any one of those layers lies, the route becomes unreadable.

## Core Model

### 1. Objects Are Obstacles

Each object card is a real obstacle.
The forbidden zone is:

- card body
- clearance around card

Never route through the object body.
Never treat the whole source or target object as freely passable.
Only short port exits/entries are allowed.

### 2. Ports Have Fixed Sides

- inputs are on the left
- outputs are on the right

This is mandatory.
It is not a style choice.

### 3. Endpoints Must Be Measured From DOM

Use the rendered port dot positions, not guessed formula coordinates.

Reason:

- routes must visually hit real ports
- DOM geometry must match routing geometry

### 4. Orthogonal Only

Routes use only:

- horizontal segments
- vertical segments
- 90 degree turns

No diagonal segments.
No freeform curves.

## Hard Rules vs Soft Rules

### Hard Rules

These must never be broken:

1. route must hit the correct port
2. route must not pass through object keep-out
3. route must respect port side
4. route must remain orthogonal
5. visual polish must not invalidate route legality

### Soft Rules

These are preferences and scoring criteria:

1. fewer bends
2. shorter readable path
3. less outer exposure
4. less overlap with other signals
5. more separation between competing signals

Hard rules always win.

## Recommended Routing Pipeline

### Step 1. Build Scene Geometry

For each object:

- get card rect
- get input dot centers
- get output dot centers
- build keep-out rectangle with clearance

### Step 2. Build Endpoints

For each source or target port:

- anchor at real dot center
- create short legal entry/exit corridor
- do not allow that short corridor to become a global highway

### Step 3. Build Route Candidates

Use an orthogonal graph or lane model that represents real corridors.

Important rule:

- local channels stay local
- do not let a port row or column silently become a scene-wide routing band

### Step 4. Solve The Route

Solve with hard legality first, then compare candidates using soft score.

Prefer:

- local route over scenic outer loop
- readable trunk over accidental geometry
- valid branch attachment over arbitrary nearest point

### Step 5. Build Signal Tree

Treat one signal as one route tree.

That means:

- one source
- one or more targets
- shared trunk when appropriate
- short branches from trunk to targets

Do not think of one signal as unrelated point-to-point lines.

### Step 6. Reserve Track Space

Different signals should not visually collapse onto the same centerline.

Needed behaviors:

- exact-track blocking or strong separation
- corridor ownership or near-track penalty
- visible offset between competing signal families

### Step 7. Safe Gloss

Gloss is allowed only when it preserves legality.

Safe gloss may:

- merge collinear segments
- remove unnecessary duplicates
- reduce visual noise

Unsafe gloss is forbidden if it:

- shifts endpoint segments away from ports
- merges paths through keep-out
- creates fake continuity between different routes

## Practical Rules From This Project

### What Worked

1. rewriting the router around one coherent model
2. using measured DOM endpoint geometry
3. keeping source/target objects as obstacles except for short port entry/exit
4. rendering all outlines below all colored wires
5. detangling only internal long segments, not endpoint segments

### What Failed

1. penalty stacking without one coherent route model
2. excluding source/target objects wholesale from obstacle checks
3. advisory validation that still allowed invalid routes to render
4. glossing before re-checking keep-out
5. letting local channels act like global scene highways

## Visual Readability Rules

### Signal Colors

Each signal must have a distinct color.

Why:

- users must immediately see different logical routes
- debugging is faster when routes are visually unique

### Outline

Each route should have a dark outline.

Why:

- route remains readable on any background
- intersections are clearer
- bright colors remain legible

### Outline Rendering Order

Render order should be:

1. all outlines
2. all colored routes

Do not render outline and color as a pair per route.
That creates false break artifacts where later outlines cover earlier colored wires.

### Endpoint Protection

Do not apply detangle offsets to the first or last route segment.

Why:

- endpoint correctness matters more than overlap polish
- routes must visually land exactly in their ports

## Troubleshooting Checklist

If a route looks wrong, check in this order:

1. does the route actually hit the correct port?
2. is an endpoint segment being shifted by a post-pass?
3. is a local channel leaking into a global lane?
4. is the route being allowed through source/target obstacle area?
5. is gloss merging segments without rechecking keep-out?
6. are two different signals occupying the same exact or near track?
7. is the route solver choosing an outer scenic path before testing local candidates?

## What To Extend Next

The next improvements should be incremental and safe:

1. stronger competing-signal separation near shared source/target zones
2. better near-target branch choice
3. more mature corridor ownership
4. explicit bad-route reroute pass

Do not reintroduce the older penalty-heavy multi-model router.
Extend the rewritten core instead.
