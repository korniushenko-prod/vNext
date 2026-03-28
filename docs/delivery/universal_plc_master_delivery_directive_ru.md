# universal_plc — мастер-директива на разработку

Статус: принять как рабочую директиву команды  
Язык: русский  
Назначение: отдать в разработку без распыления, без споров о мелких нюансах, с жёстким порядком внедрения

---

## 1. Что мы делаем

`universal_plc` — это единый продукт из трёх слоёв:

1. **Authoring Platform**
   - язык проекта
   - Definitions / System / Hardware / Views
   - библиотека стандартных объектов
   - package authoring
   - compile preview

2. **Materializer**
   - validation
   - semantic build
   - hierarchy expansion
   - lowering project model в flat runtime pack
   - target-specific emitters

3. **Runtime Target**
   - ESP32 runtime engine
   - operations executor
   - telemetry / diagnostics
   - commissioning / service backend
   - apply/deploy target

Главная формула продукта:

> Пользователь работает с проектной моделью.  
> Materializer превращает её в runtime pack.  
> ESP32 runtime исполняет runtime pack.

---

## 2. Что запрещено считать продуктом

Следующие идеи запрещены как архитектурная основа:

1. Firmware JSON как главный язык продукта.
2. Один и тот же JSON для authoring и runtime.
3. Один универсальный canvas для System + Composition + State + Flow.
4. Обязательная сборка типовых объектов из низкоуровневых primitives.
5. Отдельный специальный UI под каждый сложный компонент.
6. Прямой editor → runtime CRUD как основная интеграция.
7. Протаскивание target-ограничений ESP32 прямо в authoring schema.
8. Вечный переходный `vm`-слой как центр фронтенд-архитектуры.

---

## 3. Неподвижные архитектурные инварианты

Это не обсуждается до завершения Phases 0–5.

### 3.1. Две разные канонические модели

Есть:
- **Canonical Project Schema**
- **Canonical Materialized Runtime Pack**

Их нельзя сливать.

### 3.2. Верхний уровень остаётся signal-first

В `System` канонически живут:
- `instances`
- `signals`
- `alarms`

`system.routes` не являются source-of-truth.
Они допустимы только как:
- derived representation
- build output
- debug view
- lowering artifact

### 3.3. Внутри типа Composition остаётся route-first

В `Composition` канонически живут:
- child instances
- routes
- parent boundary mapping
- child param bindings

Внутренний `signals`-мир не вводится на этом этапе.

### 3.4. Базовая сущность платформы

Главная сущность:
- `ObjectType`
- `ObjectInstance`

Любой объект, от таймера до котла, должен укладываться в эту пару.

### 3.5. Прогрессивное раскрытие сложности

Простое:
- инстанцируется как готовый library object
- настраивается через component face

Сложное:
- раскрывается через Definition → Composition → State → Flow

Это обязательный принцип UX.

### 3.6. User-friendly задаётся в модели

У каждого component/object type должны быть не только:
- ports
- params
- internals

Но и capability facets:
- setup
- tuning
- operations
- debug
- simulation
- views
- recipes
- security
- comms

---

## 4. Целевая архитектура продукта

## 4.1. Canonical Project Schema

Корень проекта:

- `meta`
- `imports`
- `definitions`
- `system`
- `hardware`
- `views`
- `layouts`

### `definitions`
Содержит:
- `object_types`
- позже `packages` refs / imported types

### `system`
Содержит:
- `instances`
- `signals`
- `alarms`

### `hardware`
Содержит:
- physical resource bindings
- transport/interface bindings
- I/O bindings

### `views`
Содержит:
- generated and manual views
- HMI screens
- menu definitions

### `layouts`
Содержит:
- editor-only layout metadata
- canvas positions
- viewport state

Не содержит semantic data.

---

## 4.2. ObjectType

Каждый `ObjectType` имеет две группы секций.

### Engineering sections
- `interface`
- `implementation.native`
- `implementation.composition`
- `implementation.state`
- `implementation.flow`
- `diagnostics`

### Capability facets
- `facets.setup`
- `facets.tuning`
- `facets.operations`
- `facets.debug`
- `facets.simulation`
- `facets.views`
- `facets.recipes`
- `facets.security`
- `facets.comms`

---

## 4.3. ObjectInstance

`ObjectInstance` хранит:
- `id`
- `type_ref`
- title
- enabled
- param overrides
- tags/context
- optional refs into hardware/views

Instance не хранит собственный interface contract.
Он берёт effective interface из type.

---

## 4.4. Materialized Runtime Pack

Materializer выпускает flat normalized output:

- `meta`
- `target_profile`
- `channels`
- `signals`
- `blocks`
- `sequences`
- `alarms`
- `views_runtime`
- `operations_runtime`
- `ownership`
- `diagnostics`

Это не authoring JSON и не UI store.
Это compile output.

---

## 4.5. ESP32 runtime

ESP32 runtime отвечает только за:
- load/apply pack
- execute signals/blocks/sequences/alarms
- expose telemetry
- expose diagnostics
- execute operations
- expose commissioning/service API

ESP32 runtime **не является владельцем проектной модели**.

---

## 5. Унифицированная модель компонентов

Чтобы простое было простым, а сложное оставалось сильным, вводится единый объектный каркас по 4 уровням.

### Уровень A — Primitive / leaf objects
Примеры:
- digital input
- digital output
- timer
- analog input
- pulse counter
- communication endpoint

Пользователь обычно не авторит им внутренности.

### Уровень B — Standard library objects
Примеры:
- TimedRelay
- Flowmeter
- PIDController
- ValveActuator
- PumpController
- TripLatch
- CommBridge

Это основная повседневная библиотека.

### Уровень C — Composite engineered objects
Примеры:
- BurnerSequence
- ValveTrain
- SafetyChain
- PumpGroup

Здесь уже появляются Composition / State / Flow.

### Уровень D — Domain package objects
Примеры:
- BoilerSupervisor
- BoilerController
- WaterTreatmentUnit
- ProcessSkid

Это package-level сборки с views, alarms, operations и presets.

### Ключевое правило

Пользователь не обязан собирать объект уровня B из primitives каждый раз.
Это задача library, а не пользователя.

---

## 6. Что обязательно закладывается сейчас

## 6.1. Rich parameter metadata

Каждый параметр обязан поддерживать:
- `title`
- `description`
- `value_type`
- `unit`
- `default`
- `min`
- `max`
- `step`
- `enum_options`
- `group`
- `ui_hint`
- `access_role`
- `live_edit_policy`
- `persist_policy`
- `recipe_scope`
- `confirm_on_change`
- `restart_required`
- `danger_level`

Без этого не будет:
- generated forms
- generated on-device menus
- безопасного online edit
- нормальной настройки PID/flowmeter/boiler

## 6.2. Operation / Job framework

Любая длительная или опасная операция обязана моделироваться как job:
- `available`
- `can_start`
- `start`
- `running`
- `progress`
- `result`
- `failed`
- `cancelled`

Примеры:
- PID autotune
- flowmeter calibration
- reset totalizer
- valve bump test
- self-check
- force sequence restart

## 6.3. Debug / Trend service

Единый платформенный сервис:
- trace groups
- sample hints
- ring buffers
- timestamps
- event markers
- chart hints
- object grouping

Не отдельный график под каждый компонент.

## 6.4. Signal quality/status model

Каждый runtime-observable signal должен поддерживать:
- `quality`
- `timestamp`
- `simulated`
- `forced`
- `source_mode`
- maybe `stale_reason`

## 6.5. Simulation contract

Симуляция должна использовать тот же object contract:
- те же ports
- те же params
- те же operations
- те же diagnostics

Различается только binding backend:
- real hardware
- simulated plant

## 6.6. View/Menu contract

Компонент должен декларативно описывать:
- overview widgets
- setup fields
- tuning widgets
- action buttons
- trends
- diagnostics cards
- compact HMI/menu representation

## 6.7. Access / online change policy

Должны существовать:
- role rules
- live edit rules
- commissioning-only guards
- confirm/revert rules
- audit log hooks

## 6.8. Target capability profiles

Должны быть профили target’ов:
- `esp32-minimal`
- `esp32-standard`
- позже `sim-desktop`

Materializer обязан уметь сказать:
- влезает / не влезает
- поддерживается / не поддерживается
- degraded / full

---

## 7. Целевая структура репозитория

Рекомендуемая форма: **monorepo**.

```text
/universal_plc
  /apps
    /config-studio-web
    /service-ui-web
    /esp32-runtime
  /packages
    /schema-project
    /schema-runtime-pack
    /materializer-core
    /target-esp32-emitter
    /library-std
    /package-boiler
    /shared-types
    /shared-diagnostics
  /docs
  /tools
  /tests
    /fixtures
    /integration
    /golden
```

### Правила границ

#### `config-studio-web`
Можно:
- редактировать canonical project schema
- вызывать materializer preview
- запускать apply/deploy

Нельзя:
- знать внутренний runtime block graph как authoring source

#### `service-ui-web`
Можно:
- смотреть live runtime data
- делать commissioning
- управлять operations
- просматривать trends / diagnostics

Нельзя:
- быть владельцем проектной модели

#### `schema-project`
Владелец canonical project schema.

#### `schema-runtime-pack`
Владелец canonical materialized runtime schema.

#### `materializer-core`
Владелец mapping project → runtime pack.

#### `target-esp32-emitter`
Владелец lowering runtime pack → firmware/apply payload.

#### `library-std`
Владелец стандартных library objects.

#### `package-boiler`
Владелец доменной boiler-сборки.

---

## 8. План объединения двух текущих проектов

## 8.1. Что берём из UI-ветки

Используем как базу authoring half:
- Definitions
- ObjectType / ObjectInstance
- Instance Overview
- Composition v1
- semantic build skeleton
- signal-first System UX

## 8.2. Что берём из ESP32 runtime-ветки

Используем как базу runtime half:
- signal registry
- block execution
- sequence engine
- alarm engine
- resource manager
- telemetry/service backend

## 8.3. Что создаём заново как общий слой

Обязательные новые shared packages:
- `schema-project`
- `schema-runtime-pack`
- `materializer-core`
- `target-esp32-emitter`

## 8.4. Что выбрасываем или выводим из ядра

- runtime config как главный язык продукта
- прямые UI-знания о runtime block internals
- вечный VM bridge
- канонический `system.routes`
- позиционные generated ids

---

## 9. Порядок внедрения без распыления

Работы выполняются только в этом порядке.
Переход к следующей фазе запрещён до exit gate предыдущей.

# Phase 0 — Freeze Foundation

## Цель
Заморозить архитектурный контракт, чтобы дальше не спорить по базе.

## Делает
- архитектор / техлид
- core/schema lead
- frontend lead
- runtime lead

## Результат
Приняты и заморожены:
- canonical project schema
- canonical runtime pack schema
- system signal-first rule
- composition route-first rule
- capability facets contract
- repo/package boundaries
- PR order
- stop-list

## Задачи
1. Утвердить мастер-директиву.
2. Утвердить canonical project schema.
3. Утвердить runtime pack schema.
4. Утвердить materializer boundary.
5. Утвердить repo topology.
6. Утвердить initial target profiles.
7. Утвердить standard library v1 shortlist.

## Exit gate
Есть один принятый документ + схема пакетов + список запрещённых обходных путей.

---

# Phase 1 — Shared Schema Packages

## Цель
Вынести канонические схемы в общий пакетный слой.

## Делает
- schema/core team

## Результат
Появляются пакеты:
- `schema-project`
- `schema-runtime-pack`
- `shared-types`

## Задачи
1. Описать TS types для project schema.
2. Описать TS types для runtime pack.
3. Описать JSON schema / validators.
4. Описать refs и stable IDs.
5. Описать rich param metadata.
6. Описать operation/job contracts.
7. Описать debug facets.
8. Описать simulation facets.
9. Описать comms facets.
10. Описать views/menu facets.
11. Написать fixtures примеров:
   - TimedRelay
   - Flowmeter
   - PID
   - Boiler skeleton

## Exit gate
Типы, схемы и fixtures собираются независимо от UI и runtime.

---

# Phase 2 — UI Canonicalization

## Цель
Превратить UI-ветку из переходной в каноническую authoring half.

## Делает
- frontend/config-studio team

## Результат
UI редактирует canonical project schema напрямую, без скрытого legacy-центра.

## Задачи
1. Заменить top-level endpoint shape на `instance_id + port_id`.
2. Убрать канонический `system.routes` из project store.
3. Свести `vm`-слой к migration adapter only.
4. Перевести Definitions на shared schema package.
5. Перевести System на shared schema package.
6. Перевести Instance Overview на semantic snapshot.
7. Стабилизировать Composition v1 на shared contracts.
8. Добавить facets shell:
   - setup
   - tuning
   - operations
   - debug
   - simulation
   - views
9. Добавить diagnostics surface на shared build results.
10. Добавить “build preview” как отдельный режим.

## Что не делать
- не делать пока полноценный State editor
- не делать пока полноценный Flow editor
- не рисовать ручные экраны под PID/flowmeter

## Exit gate
UI сохраняет и читает только canonical project schema, а build preview работает через shared materializer contracts.

---

# Phase 3 — Materializer Core v1

## Цель
Создать единственный путь project → runtime pack.

## Делает
- compiler/materializer team
- schema/core team

## Результат
Рабочий `materializer-core` с preview и golden tests.

## Задачи
1. Validation pipeline.
2. Reference resolution.
3. Effective interface resolution.
4. Composition expansion.
5. Ownership propagation.
6. System signal lowering to normalized routes.
7. Native template expansion.
8. Alarm lowering.
9. Operation lowering.
10. Debug trace lowering.
11. Target profile checks.
12. Diagnostics report.
13. Golden outputs for fixtures.

## Exit gate
Materializer принимает project schema fixture и выдаёт deterministic runtime pack fixture.

---

# Phase 4 — ESP32 Target Adapter

## Цель
Соединить runtime pack с текущим ESP32 runtime без возврата runtime в роль владельца модели.

## Делает
- runtime/embedded team
- compiler/materializer team

## Результат
ESP32 принимает pack/apply payload, исполняет его и отдаёт telemetry/operations/diagnostics.

## Задачи
1. Определить apply payload contract.
2. Реализовать `target-esp32-emitter`.
3. Маппить runtime pack на firmware config/apply format.
4. Перевести generated ids на stable semantic ids.
5. Обеспечить ownership/traceability на runtime.
6. Реализовать pack versioning.
7. Реализовать runtime diagnostics mapping.
8. Реализовать operations_runtime executor bridge.
9. Реализовать target profile capability checks.
10. Подготовить integration harness: pack → runtime → telemetry.

## Exit gate
Один fixture-проект materialize’ится, применяется на runtime, выдаёт ожидаемую телеметрию и diagnostics.

---

# Phase 5 — Standard Library v1

## Цель
Проверить архитектуру на 5 эталонных объектах.

## Делает
- library team
- frontend team
- runtime team
- materializer team

## Обязательные объекты v1
1. `TimedRelay`
2. `Flowmeter`
3. `PIDController`
4. `CommBridge`
5. `ActuatorOrPumpObject`

## Для каждого объекта обязательно
- external interface
- rich params
- operations
- debug traces
- diagnostics
- views/menu hints
- simulation hooks
- native/composite implementation strategy
- materialization test

## Exit gate
Все 5 объектов проходят полный путь:
Definition → System → Materializer → Runtime → Commissioning UX.

---

# Phase 6 — Component Faces / Commissioning UX

## Цель
Сделать user-friendly слой не ручным, а декларативным.

## Делает
- frontend/config-studio
- service-ui
- library team

## Результат
Появляются user-facing component faces:
- Overview
- Setup
- Tune
- Actions
- Trends
- Diagnostics
- Simulation/Test

## Задачи
1. Generated setup forms.
2. Generated tuning forms.
3. Actions/job execution UI.
4. Trends UI on shared debug service.
5. Diagnostics panels.
6. Compact HMI/menu generation contract.
7. Live edit guardrails.
8. Audit hooks UI.
9. Role-based control visibility.

## Exit gate
Пользователь может настроить TimedRelay, Flowmeter и PID без входа в raw internals.

---

# Phase 7 — Simulation / Test Bench

## Цель
Ввести simulation как первую-class capability, а не параллельный мир.

## Делает
- simulation/tooling team
- frontend
- library

## Результат
Есть единый simulation contract и минимум один test bench.

## Задачи
1. Simulation backend contract.
2. Virtual I/O layer.
3. Fault injection contract.
4. Time scale support.
5. Replay/test scenario format.
6. Simple plant models for fixtures.
7. UI to switch real/sim binding where allowed.

## Exit gate
Flowmeter и PID можно гонять в lightweight simulation/test mode.

---

# Phase 8 — Boiler Package v1

## Цель
Собрать доменный пакет и проверить, что платформа работает на реальном сложном кейсе.

## Делает
- package team
- library team
- runtime
- frontend

## Состав
- `BoilerSupervisor`
- `BurnerSequence`
- `SafetyChain`
- `ValveTrain`
- `Flowmeter`
- `PIDController`
- alarms
- operator views
- commissioning views

## Задачи
1. Определить package-level object types.
2. Собрать Composition.
3. Определить State machine(s).
4. Определить package views.
5. Определить package diagnostics.
6. Прогнать through materializer.
7. Поднять on target/sim target.

## Exit gate
Boiler package собирается без специальных обходов архитектуры.

---

# Phase 9 — Beta Hardening

## Цель
Сделать продукт пригодным к повторяемой разработке и демонстрации.

## Делает
- все команды

## Задачи
1. Migration pipeline.
2. Versioning rules.
3. Project diff/apply strategy.
4. Performance profile.
5. Memory profile.
6. Docs for developers.
7. Docs for library authors.
8. Docs for package authors.
9. QA regression suites.
10. Acceptance demos.

## Exit gate
Есть repeatable demo flow и повторяемая сборка продукта.

---

## 10. Точный порядок PR без обсуждений

Никаких параллельных крупных веток мимо этого порядка.

### PR-1 Freeze Contract
- мастер-директива
- package boundaries
- contract freeze

### PR-2 Shared Schema Packages
- `schema-project`
- `schema-runtime-pack`
- validators
- fixtures

### PR-3 UI Canonicalization
- project store canonicalization
- stable refs
- no canonical `system.routes`
- vm bridge reduced to migration only

### PR-4 Materializer Core
- resolution
- expansion
- lowering
- diagnostics
- golden tests

### PR-5 ESP32 Target Adapter
- emitter
- apply payload
- runtime integration
- stable ids on target

### PR-6 Standard Library v1
- TimedRelay
- Flowmeter
- PIDController
- CommBridge
- Actuator/Pump

### PR-7 Component Faces v1
- Overview
- Setup
- Tune
- Actions
- Trends
- Diagnostics

### PR-8 Simulation/Test Bench
- contracts
- virtual I/O
- simple plant models

### PR-9 Boiler Package Skeleton
- package definitions
- views
- alarms
- package build path

### PR-10 Beta Hardening
- migration
- QA
- docs
- performance

---

## 11. Что делает каждая команда

## 11.1. Архитектор / техлид
Отвечает за:
- freeze decisions
- boundary control
- anti-chaos discipline
- approve only contract-consistent changes
- reject shortcut solutions

### Его задачи
- принять Phase 0
- держать stop-list
- не пускать фичи мимо roadmap
- арбитражить только архитектурные разрывы

## 11.2. Schema / Core team
Отвечает за:
- schema packages
- refs
- validators
- shared model contracts
- fixtures

## 11.3. Frontend / Config Studio team
Отвечает за:
- canonical project editing
- Definitions/System UI
- Definition Studio shell
- Instance Overview
- Composition v1
- build preview
- component faces UI

## 11.4. Compiler / Materializer team
Отвечает за:
- semantic build
- lowering
- diagnostics
- emitters interface
- golden tests

## 11.5. Runtime / ESP32 team
Отвечает за:
- runtime pack apply
- stable runtime ids
- telemetry
- operations
- diagnostics bridge
- resource/capability target profile

## 11.6. Library team
Отвечает за:
- standard objects
- native/composite implementations
- facets completeness
- examples and docs

## 11.7. Package team
Отвечает за:
- boiler package
- domain presets
- domain views
- domain alarms

## 11.8. QA / Integration team
Отвечает за:
- golden tests
- integration fixtures
- runtime validation
- migration tests
- regression matrix

---

## 12. Definition of Done по типам работ

## 12.1. Схема считается готовой, если
- есть TS type
- есть validator
- есть JSON fixture
- есть migration rule if needed
- есть markdown doc

## 12.2. UI feature считается готовой, если
- работает на canonical store
- не знает runtime internals напрямую
- имеет integration test
- имеет empty/project reload persistence test
- не ломает scope boundaries

## 12.3. Materializer feature считается готовой, если
- deterministic output
- golden snapshot
- diagnostics output
- stable ids
- no hidden dependency on UI state

## 12.4. Runtime integration считается готовой, если
- apply payload accepted
- runtime exposes expected telemetry
- diagnostics mapped back
- operations report lifecycle
- stable runtime ids preserved

## 12.5. Library object считается готовым, если
- object contract complete
- setup/debug/actions defined
- materializes to runtime pack
- runs on runtime target or sim target
- has docs and example fixture

---

## 13. Контроль качества и тестовый контур

## 13.1. Fixtures обязательны

Обязательные fixtures:
- `timed_relay_minimal`
- `flowmeter_hall`
- `flowmeter_analog_diff`
- `pid_basic`
- `comm_bridge_modbus`
- `boiler_skeleton`

## 13.2. Golden tests обязательны

Снимки для:
- project normalization
- semantic snapshot
- materialized runtime pack
- esp32 emitted payload

## 13.3. Integration tests обязательны

Пути:
- authoring project → materializer
- materializer → emitter
- emitter → runtime apply
- runtime telemetry → service UI
- operation start → progress → done

## 13.4. Negative tests обязательны

Проверять:
- missing refs
- bad port ids
- invalid param overrides
- target profile overflow
- illegal live edit
- multi-driver input
- unsupported feature on target

---

## 14. Список рисков и как их рубить сразу

## Риск 1
UI снова начнёт жить двумя моделями.

### Контрмера
После Phase 2 любые новые UI-фичи только на canonical store.

## Риск 2
Runtime снова начнёт диктовать authoring semantics.

### Контрмера
Никаких новых user-facing editor сущностей из firmware JSON.
Только через schema + materializer.

## Риск 3
Каждый сложный компонент получит свой особый UI.

### Контрмера
Capability facets обязательны для library objects.

## Риск 4
Слишком ранний уход в State/Flow editor.

### Контрмера
До завершения PR-5 State/Flow остаются shell-level.

## Риск 5
Команда распылится на boiler раньше времени.

### Контрмера
Boiler package только после Standard Library v1.

## Риск 6
Нестабильные generated ids сломают diff/apply/debug.

### Контрмера
Stable semantic ids — обязательный acceptance criterion для materializer и runtime adapter.

---

## 15. Конкретный стартовый пакет на разработку

Это можно отдавать немедленно.

# Sprint 1 — Freeze + Schemas

### Архитектор / лид
1. Утвердить мастер-директиву.
2. Утвердить repo structure.
3. Утвердить stop-list.
4. Утвердить initial target profiles.
5. Утвердить library shortlist v1.

### Schema/Core
1. Создать `packages/schema-project`.
2. Создать `packages/schema-runtime-pack`.
3. Описать `ProjectModel`.
4. Описать `ObjectType`.
5. Описать `ObjectInstance`.
6. Описать `SystemSignal` canonical contract.
7. Описать `CompositionRoute` contract.
8. Описать `ParamMetadata`.
9. Описать `OperationFacet` contract.
10. Описать `DebugFacet` contract.
11. Описать `SimulationFacet` contract.

### Frontend
1. Подключить `schema-project` как dependency.
2. Вынести adapters для current project store.
3. Подготовить refactor plan по removing canonical `system.routes`.
4. Подготовить refactor plan по stable endpoint refs.

### Materializer
1. Создать `packages/materializer-core`.
2. Подготовить architecture skeleton.
3. Описать pipeline phases.
4. Подготовить first fixture-based tests.

### Runtime
1. Описать expected apply payload contract draft.
2. Описать mapping constraints from runtime pack to runtime engine.
3. Составить список unstable ids to eliminate.

## Sprint 1 exit gate
- packages созданы
- базовые типы и контракты описаны
- refactor plan утверждён
- materializer skeleton создан
- runtime adapter draft описан

---

# Sprint 2 — UI Canonicalization + Materializer Skeleton

### Frontend
1. Перевести system endpoints на `instance_id/port_id`.
2. Свести `system.routes` к derived only.
3. Свести `vm` к migration bridge only.
4. Подключить canonical validators.
5. Добавить build preview tab.

### Schema/Core
1. Закрыть validators.
2. Добавить fixtures.
3. Добавить migration helpers.

### Materializer
1. Validation stage.
2. Ref resolution stage.
3. System signal lowering stage.
4. Composition expansion skeleton.
5. Diagnostics report skeleton.

### Runtime
1. Начать stable id migration map.
2. Подготовить runtime-side structures for apply.

## Sprint 2 exit gate
UI живёт на canonical project model, а materializer умеет выдавать первый semantic/build report.

---

# Sprint 3 — Runtime Pack + First End-to-End Path

### Materializer
1. Выдать first runtime pack for `timed_relay_minimal`.
2. Добавить ownership mapping.
3. Добавить diagnostics pack.

### Runtime
1. Реализовать apply payload parser.
2. Реализовать runtime pack load path.
3. Отдать telemetry for first fixture.

### Frontend
1. Build preview renders runtime pack summary.
2. Apply/deploy action wired to runtime adapter.
3. Instance Overview shows build diagnostics.

### QA
1. End-to-end test: project → pack → runtime → telemetry.
2. Golden outputs.

## Sprint 3 exit gate
`timed_relay_minimal` проходит путь целиком.

---

## 16. После Sprint 3 порядок остаётся такой

1. `TimedRelay`
2. `Flowmeter`
3. `PIDController`
4. `CommBridge`
5. `Actuator/Pump`
6. component faces
7. simulation hooks
8. boiler skeleton

Это обязательная очередность. Не менять без архитектурного решения.

---

## 17. Что нельзя начинать раньше времени

До Phase 5 запрещено:
- большой Flow editor
- большой State editor
- кастомный boiler UI
- сложный simulator UI
- отдельный PID screen, не основанный на facets
- отдельный flowmeter screen, не основанный на facets
- ручные special-case menus под конкретный library object
- переработка runtime под новый authoring semantics напрямую, в обход materializer

---

## 18. Финальная цель

Цель не просто “собрать редактор” и не просто “оживить прошивку”.

Цель:

> Сделать platform-grade universal embedded automation product, где:
> - простые механизмы настраиваются быстро и понятно,
> - сложные объекты собираются иерархически,
> - runtime остаётся отдельным target layer,
> - новые компоненты добавляются без специальных костылей в UI и ядре.

Если команда держится этой директивы, продукт соберётся в одну систему.  
Если команда начнёт срезать путь через runtime CRUD, специальные UI для отдельных компонентов и ранний уход в случайные фичи — проект снова разъедется.

