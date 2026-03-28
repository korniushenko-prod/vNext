# Pattern-First UI Reorganization v1

## Purpose

This document redefines the future UI organization so the product feels like:

- a universal controller
- not a boiler constructor
- not a raw block editor by default

This pass assumes:

- for now we work only with the expanded / advanced-capable UI
- simplification for ordinary users should be added later on top of a stable advanced structure

## Core Rule

The UI should separate:

1. hardware and board setup
2. automation and logic setup
3. runtime/service observation

The current top-level tab model is too flat.

It mixes:

- board/chip concerns
- network/platform concerns
- signals/channels
- modules/sequences
- diagnostics

into one line of peers.

That makes the controller feel more like a toolbox than a coherent system.

## Target Top-Level Structure

The future top-level UI should be organized into these groups.

### 1. `Обзор`

Purpose:

- current controller summary
- quick health
- active alarms
- active sequences
- quick navigation

Should contain:

- controller identity
- runtime health
- alarm summary
- sequence summary
- quick open links into hardware and automation

### 2. `Аппаратная часть`

Purpose:

- everything related to board, chip, GPIO, buses and platform resources

This is where the user should think:

- what board/chip am I using
- what pins and buses exist
- what external devices are attached
- what network/platform settings apply

Subsections:

- `Плата и чип`
- `GPIO / Hardware`
- `Шаблоны платы`
- `Comms / Devices`
- `Network`
- `Diagnostics`

### 3. `Автоматика`

Purpose:

- everything related to process behavior and logic

This is where the user should think:

- what values exist
- what modules use them
- what sequences run
- what policies stop or permit the mechanism

Subsections:

- `Channels`
- `Signals`
- `Patterns / Modules`
- `Sequences`
- `Alarms`
- `Display`
- `Advanced Blocks`

### 4. `Сервис`

Purpose:

- live observation and troubleshooting

This should become the home of:

- live probing
- inspector
- dependency/service maps
- event summaries
- why-is-it-waiting style explanations

Subsections:

- `Inspector`
- `Live state`
- `Events / History`
- `Dependency map`

## Why This Split Is Better

This split matches how real work happens.

### Hardware side asks:

- which ESP board
- which pins
- which bus
- which Modbus device
- which output hardware

### Automation side asks:

- which process value
- which threshold or PID
- which actuator policy
- which trip
- which sequence

These are different kinds of thinking and should not compete in one flat navigation layer.

## Pattern-First Rule Inside `Автоматика`

Inside `Автоматика`, the default primary screen should not be:

- raw blocks
- raw boiler templates
- raw device details

The default primary screen should be:

- `Patterns / Modules`

And that screen should be universal.

It should present:

- measured value patterns
- on/off control patterns
- PID patterns
- actuator patterns
- duty/standby patterns
- totalizer patterns
- trip/policy patterns
- sequence patterns

Then the user composes mechanisms from them.

## Tabs That Should Move Or Be Reframed

### Move to `Аппаратная часть`

- `Hardware`
- `Templates`
- `Comms`
- `Network`
- `Diagnostics`

### Move to `Автоматика`

- `Channels`
- `Signals`
- `Modules`
- `Sequences`
- `Alarms`
- `Display`
- `Blocks`

But:

- `Blocks` should be relabeled and visually demoted to `Advanced Blocks`

Because it is not the preferred user-facing authoring layer.

### Move to `Сервис`

- `Inspector`

Later also:

- event/history views
- service explanations
- runtime dependency views

## Recommended Automation Order

Inside `Автоматика`, the preferred workflow should read like this:

1. `Patterns / Modules`
2. `Signals`
3. `Channels`
4. `Sequences`
5. `Alarms`
6. `Display`
7. `Advanced Blocks`

Meaning:

- users think in functions first
- then inspect the signals
- then bind to channels if needed
- then tune scenario logic

not the other way around

## Russian-First Help Model

The UI should increasingly become Russian-first for commissioning.

Every major pattern, module and editor should have:

- short Russian title
- one-sentence Russian summary
- `Что делает`
- `Когда использовать`
- `Что нужно привязать`
- `Что выдаёт`
- `Типичные ошибки`

The first concrete user-facing registry for that help model is now captured in:

- `docs/russian-pattern-template-registry-v1.md`

This should exist at least for:

- every module family
- every module template
- every major sequence role
- every actuator capability
- every measured-value pattern
- every alarm/trip policy type

## Help Depth Levels

### Level 1: Inline

Very short text near the field.

Examples:

- `Источник значения`
- `Порог включения`
- `Минимум OFF`

### Level 2: Popover

Structured quick help:

- what it does
- when to use it
- common mistake

### Level 3: Full Guide

Longer manual pages:

- how to assemble a mechanism
- how to tune patterns
- how to debug it

The user specifically wants this later for:

- building complex mechanisms

So the UI should be prepared for that documentation path now.

## Recommended Module/Pattern Naming

Avoid names that feel boiler-only.

Prefer:

- `Измеряемая величина`
- `Порог / Окно`
- `On/Off управление`
- `PID регулирование`
- `Исполнительный механизм`
- `Duty / Standby`
- `Trip / Lockout`
- `Сценарий`
- `Супервизия / Freshness`
- `Сумматор / Totalizer`
- `Преобразование / Компенсация`

Then mechanism-specific presets can sit under them.

Example:

- family: `Измеряемая величина`
- template preset: `Температура топлива`
- template preset: `Давление пара`
- template preset: `Расход`

## Boiler As A Pilot In This UI

Boiler still remains useful.

But in the UI it should appear as:

- one complex reference workspace
- one composed mechanism

not as the main category the whole UI is built around.

## Immediate UI Corrections

The next practical corrections should be:

1. regroup top-level tabs conceptually into:
   - `Обзор`
   - `Аппаратная часть`
   - `Автоматика`
   - `Сервис`
2. demote raw `Blocks` to an advanced area
3. keep `Modules` but reframe them as universal patterns/modules
4. add Russian inline help for every pattern/module template
5. stop presenting boiler as the center of the module layer
6. prepare full Russian assembly guides later

## Product Consequence

After this reorganization the UI should feel like:

- configure board and devices in one place
- configure automation in another place
- observe and debug in a third place

That is much closer to a universal marine controller than the current flat tab model.
