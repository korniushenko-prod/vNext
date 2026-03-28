# universal_plc — GitHub/Jira backlog, roadmap и issue matrix
Статус: proposed-for-execution  
Дата: 2026-03-27  
Цель: превратить зафиксированную архитектуру в управляемый backlog для реальной команды.
## 1. Каноническая формула продукта
`universal_plc = Authoring Platform -> Materializer -> Runtime Target`
- **Authoring Platform**: canonical project schema, Definitions/System/Hardware/Views, ObjectType/ObjectInstance, component faces, package authoring.
- **Materializer**: validation, semantic build, ref resolution, hierarchy expansion, lowering в runtime pack, target emitters.
- **Runtime Target**: ESP32 execution engine, telemetry/diagnostics/operations, commissioning/service API.
### Жёсткие правила
1. `project schema != runtime schema`
2. `System = signal-first`
3. `Composition = route-first`
4. `ObjectType + ObjectInstance` — базовая сущность
5. user-friendly реализуется через capability facets, а не через набор специальных экранов
6. простые механизмы должны собираться из готовых library objects, а не из primitives вручную
## 2. Репозиторная структура после объединения
```text
packages/
  schema/
  contracts/
  materializer/
  target-esp32/
apps/
  config-studio/
  service-ui/
runtime/
  esp32-core/
libraries/
  std/
packages-domain/
  boiler/
docs/
  adr/
  specs/
  playbooks/
```
## 3. Epics
### EPIC-01 — Foundation Freeze
Заморозить каноническую архитектуру, границы слоёв и запреты до продолжения активной разработки.
- Задач: 6
- Ключевые выходы: Принять ADR: Product Foundation Freeze, Заморозить canonical project schema v0.4.x, Заморозить canonical runtime pack schema v0.1...
### EPIC-02 — Shared Schema & Packages
Вынести общий типовой контракт в shared packages/schema и packages/contracts.
- Задач: 7
- Ключевые выходы: Создать packages/schema, Реализовать canonical TS types, Реализовать validators для project schema...
### EPIC-03 — UI Canonicalization
Довести текущую UI-ветку до канонической authoring-модели без второго доменного мира.
- Задач: 8
- Ключевые выходы: Подключить shared schema package в UI, Перевести system endpoints на instance_id/port_id, Убрать canonical system.routes из project model...
### EPIC-04 — Materializer Core
Сделать materializer единственным путём project -> runtime pack.
- Задач: 8
- Ключевые выходы: Создать packages/materializer, Сделать pipeline semantic validation, Реализовать ref resolution...
### EPIC-05 — ESP32 Runtime Adapter
Подключить ESP32 runtime как target backend для runtime pack.
- Задач: 7
- Ключевые выходы: Описать target profile esp32/v1, Реализовать emitter runtime pack -> firmware config, Реализовать apply/deploy flow...
### EPIC-06 — Standard Library v1
Собрать первую библиотеку эталонных объектов и проверить платформу на реальных компонентах.
- Задач: 7
- Ключевые выходы: Зафиксировать TimedRelay object contract, Зафиксировать Flowmeter object contract, Зафиксировать PIDController object contract...
### EPIC-07 — Component Faces & Commissioning UX
Построить user-friendly surfaces поверх capability facets.
- Задач: 8
- Ключевые выходы: Сделать generic Overview face renderer, Сделать generic Setup face renderer, Сделать generic Tune face renderer...
### EPIC-08 — Simulation & Test Bench
Добавить единый simulation/test contract без второго несовместимого мира.
- Задач: 5
- Ключевые выходы: Зафиксировать simulation contract v1, Сделать virtual hardware binding layer, Сделать test bench runner для sequences/states...
### EPIC-09 — Boiler Package v1
Собрать первый доменный package поверх library objects и materializer pipeline.
- Задач: 6
- Ключевые выходы: Спроектировать BoilerSupervisor external contract, Собрать BoilerSupervisor composition skeleton, Добавить BurnerSequence state contract...
### EPIC-10 — Beta Hardening & Product Unification
Довести объединённый продукт до beta с диагностикой, миграциями и стабильным delivery loop.
- Задач: 8
- Ключевые выходы: Собрать unified repository structure, Настроить CI для schema/materializer/runtime/ui, Сделать compatibility test matrix...
## 4. Sprint plan
- **S1** — Freeze foundation: ADR, schemas, runtime pack, facets, merge contract.
- **S2** — Shared schema + UI stable endpoints + materializer package skeleton.
- **S3** — UI canonicalization baseline + semantic validation + ref resolution.
- **S4** — Composition elaboration + system signal lowering + canonical runtime pack + target profile.
- **S5** — ESP32 emitter/apply/live bridge + runtime stable ids + TimedRelay.
- **S6** — Flowmeter/PID/CommBridge/Actuator library contracts + templates + first component faces.
- **S7** — Tune/Actions/Trends/Diagnostics/HMI policies + simulation contract.
- **S8** — Simulation backend + test bench + BoilerSupervisor skeleton.
- **S9** — Boiler package views/tests + CI/compatibility + unified repo structure.
- **S10** — Beta hardening, docs, release flow, readiness review, demo bundle.
## 5. PR-цепочка верхнего уровня
- PR-1 Freeze Contract
- PR-2 packages/schema + packages/contracts
- PR-3 UI Canonicalization
- PR-4 packages/materializer core
- PR-5 target-esp32 adapter
- PR-6 Standard Library v1
- PR-7 Component Faces v1
- PR-8 Simulation/Test Bench v1
- PR-9 Boiler Package v1
- PR-10 Beta Hardening
## 6. Рабочие группы и зоны ответственности
| Группа | Сфера |
|---|---|
| Architecture Lead | ADR, freeze, merge contract, repo structure |
| Schema/Core | packages/schema, validators, migrations, fixtures |
| Frontend | config studio, component faces, migration UX |
| Materializer | semantic build, runtime pack, ownership mapping |
| Runtime/ESP32 | emitter, deploy/apply, live bridge, diagnostics |
| Library | standard objects, templates, examples |
| Package | boiler package, domain presets, package views |
| QA/DevOps | fixtures, golden tests, compatibility matrix, CI, release |
## 7. Definition of Done по фазам
- **Foundation Freeze done**: все архитектурные двусмысленности закрыты ADR/spec и не обсуждаются заново в PR.
- **UI Canonicalization done**: UI использует shared schema, system endpoints стабилизированы, `system.routes` не каноничны.
- **Materializer done**: любой fixture-проект детерминированно превращается в runtime pack с ownership.
- **ESP32 Adapter done**: runtime pack можно применить к firmware и получить live state/diagnostics обратно.
- **Library v1 done**: TimedRelay, Flowmeter, PID, CommBridge, Actuator имеют contract + lowering + faces.
- **Boiler Package done**: boiler package materialize-ится и проходит commissioning сценарии.
## 8. Полный issue backlog
### EPIC-01 — Foundation Freeze
| ID | Title | Owner | Priority | Sprint | Points | DependsOn | Done when |
|---|---|---|---|---|---:|---|---|
| A-1 | Принять ADR: Product Foundation Freeze | Lead | P0 | S1 | 3 | - | Есть утверждённый ADR с формулой продукта, границами слоёв и запретами. |
| A-2 | Заморозить canonical project schema v0.4.x | Core | P0 | S1 | 5 | A-1 | Есть документ, fixture и versioning rules для project schema. |
| A-3 | Заморозить canonical runtime pack schema v0.1 | Lead+Runtime | P0 | S1 | 5 | A-1 | Есть отдельный документ runtime pack с ownership, diagnostics и target constraints. |
| A-4 | Заморозить capability facets v1 | Lead+Library | P0 | S1 | 5 | A-2 | Есть spec для setup/tuning/operations/debug/simulation/views/recipes/security/comms. |
| A-5 | Заморозить merge contract UI <-> Materializer <-> Runtime | Lead | P0 | S1 | 3 | A-2|A-3 | Есть схема данных, потоки apply/telemetry и ownership mapping. |
| A-6 | Подготовить decision log по спорным местам | Lead | P1 | S1 | 2 | A-1 | Есть список решений: system.signals canonical, composition route-first, routes derived only. |
### EPIC-02 — Shared Schema & Packages
| ID | Title | Owner | Priority | Sprint | Points | DependsOn | Done when |
|---|---|---|---|---|---:|---|---|
| B-1 | Создать packages/schema | Core | P0 | S1 | 3 | A-2 | Есть отдельный пакет со сборкой и экспортами. |
| B-2 | Реализовать canonical TS types | Core | P0 | S1 | 5 | B-1 | ObjectType/ObjectInstance/SystemSignal/CompositionRoute описаны и экспортируются. |
| B-3 | Реализовать validators для project schema | Core | P0 | S2 | 5 | B-2 | Есть структурная и ссылочная валидация с путями ошибок. |
| B-4 | Реализовать миграции legacy -> 0.4.x | Core | P1 | S2 | 5 | B-2 | Есть migration pipeline и фикстуры старых проектов. |
| B-5 | Подготовить fixture library | Core+QA | P1 | S2 | 3 | B-3|B-4 | Есть минимальные fixture-проекты: relay, flowmeter, pid, boiler skeleton. |
| B-6 | Создать packages/contracts для facets и operations | Core | P1 | S2 | 3 | A-4|B-2 | Есть экспортируемые контракты facets, operations, trace groups, view hints. |
| B-7 | Добавить versioning и migration notes | Core | P1 | S2 | 2 | B-4 | Правила schema versioning и миграции опубликованы. |
### EPIC-03 — UI Canonicalization
| ID | Title | Owner | Priority | Sprint | Points | DependsOn | Done when |
|---|---|---|---|---|---:|---|---|
| C-1 | Подключить shared schema package в UI | Frontend | P0 | S2 | 3 | B-2 | UI компилируется на shared schema без локальных дублей типов. |
| C-2 | Перевести system endpoints на instance_id/port_id | Frontend | P0 | S2 | 5 | C-1 | Все system signals, inspector и selection используют стабильные endpoint ids. |
| C-3 | Убрать canonical system.routes из project model | Frontend | P0 | S2 | 3 | C-2 | Routes на system-level строятся только как derived/preview data. |
| C-4 | Сузить vm до transient view-model | Frontend | P1 | S3 | 5 | C-1 | В vm нет второй доменной логики, только transient UI state. |
| C-5 | Стабилизировать Definitions / Instance Overview / Composition | Frontend | P0 | S3 | 8 | C-1 | Навигация, selection, layout, inspector и diagnostics стабильны. |
| C-6 | Добавить shells для component faces | Frontend | P1 | S3 | 5 | A-4|C-5 | Есть вкладки Overview/Setup/Tune/Actions/Trends/Diagnostics/Simulation с базовой навигацией. |
| C-7 | Подключить semantic build preview к UI | Frontend+Mat | P1 | S3 | 5 | D-2 | UI может запускать validate/build preview и показывать diagnostics по owner ids. |
| C-8 | Стабилизировать migration UX для legacy projects | Frontend | P2 | S3 | 3 | B-4|C-5 | Есть понятное отображение Generated Types и migration notices. |
### EPIC-04 — Materializer Core
| ID | Title | Owner | Priority | Sprint | Points | DependsOn | Done when |
|---|---|---|---|---|---:|---|---|
| D-1 | Создать packages/materializer | Materializer | P0 | S2 | 3 | A-3|B-2 | Есть пакет со сборкой, API и тестовым harness. |
| D-2 | Сделать pipeline semantic validation | Materializer | P0 | S3 | 5 | D-1|B-3 | Есть структурированный report с severities, paths, owner ids. |
| D-3 | Реализовать ref resolution | Materializer | P0 | S3 | 5 | D-2 | Type refs, params, ports и child refs корректно резолвятся. |
| D-4 | Реализовать composition elaboration | Materializer | P0 | S4 | 8 | D-3 | Hierarchy разворачивается с детерминированными generated ids и ownership. |
| D-5 | Реализовать system signal lowering | Materializer | P0 | S4 | 5 | D-3 | System signals понижаются в normalized routes без потери identity. |
| D-6 | Собрать canonical runtime pack | Materializer | P0 | S4 | 8 | D-4|D-5 | На выходе deterministic runtime pack с signals/blocks/sequences/alarms/diagnostics. |
| D-7 | Сделать ownership + diagnostics mapping | Materializer | P1 | S4 | 5 | D-6 | Каждый runtime node знает owner object/type/face. |
| D-8 | Добавить golden tests на relay/flowmeter/pid/boiler | Mat+QA | P1 | S4 | 5 | D-6|B-5 | Есть golden outputs и regression suite. |
### EPIC-05 — ESP32 Runtime Adapter
| ID | Title | Owner | Priority | Sprint | Points | DependsOn | Done when |
|---|---|---|---|---|---:|---|---|
| E-1 | Описать target profile esp32/v1 | Runtime | P0 | S4 | 3 | A-3 | Ограничения и capabilities ESP32 описаны формально. |
| E-2 | Реализовать emitter runtime pack -> firmware config | Runtime | P0 | S5 | 8 | D-6|E-1 | Emitter выдаёт совместимый firmware config для текущего ядра. |
| E-3 | Реализовать apply/deploy flow | Runtime | P1 | S5 | 5 | E-2 | Есть validate/upload/apply/restart/progress flow. |
| E-4 | Реализовать live state bridge | Runtime | P1 | S5 | 5 | E-2 | Signals/status/alarms/operations доступны по стабильным ids. |
| E-5 | Реализовать diagnostics bridge | Runtime | P1 | S5 | 3 | E-4|D-7 | Ошибки runtime мапятся на owner ids и surfaces. |
| E-6 | Стабилизировать generated runtime ids | Runtime | P0 | S5 | 5 | E-2 | Derived ids не зависят от порядка и опираются на semantic ownership. |
| E-7 | Подготовить service API for operations/trends | Runtime | P1 | S5 | 5 | E-4 | Есть API под operations lifecycle и trace groups. |
### EPIC-06 — Standard Library v1
| ID | Title | Owner | Priority | Sprint | Points | DependsOn | Done when |
|---|---|---|---|---|---:|---|---|
| F-1 | Зафиксировать TimedRelay object contract | Library | P0 | S5 | 3 | A-4|D-6 | Есть contract: interface, params, operations/debug/view facets и lowering template. |
| F-2 | Зафиксировать Flowmeter object contract | Library | P0 | S6 | 8 | A-4|D-6 | Есть contract для sensor modes, scaling, totalizer, reset, debug, alarms. |
| F-3 | Зафиксировать PIDController object contract | Library | P0 | S6 | 8 | A-4|D-6 | Есть contract для tuning, modes, autotune operation, trends, limits. |
| F-4 | Зафиксировать CommBridge object contract | Library | P1 | S6 | 5 | A-4|D-6 | Есть contract для transport binding, remote points, health/status, timeout. |
| F-5 | Зафиксировать Actuator/Pump/Valve contract | Library | P1 | S6 | 5 | A-4|D-6 | Есть contract для command/status, interlocks, alarms, diagnostics. |
| F-6 | Сделать lowering templates v1 для library objects | Library+Mat | P0 | S6 | 5 | F-1|F-2|F-3 | TimedRelay/Flowmeter/PID lower deterministically to runtime pack. |
| F-7 | Подготовить docs/examples library objects | Library | P1 | S6 | 3 | F-1|F-2|F-3|F-4|F-5 | Есть examples и usage notes для команды и тестов. |
### EPIC-07 — Component Faces & Commissioning UX
| ID | Title | Owner | Priority | Sprint | Points | DependsOn | Done when |
|---|---|---|---|---|---:|---|---|
| G-1 | Сделать generic Overview face renderer | Frontend | P1 | S6 | 5 | C-6|F-1|F-2|F-3|F-4|F-5 | Объект показывает статусы, health, key values одинаково и понятно. |
| G-2 | Сделать generic Setup face renderer | Frontend | P1 | S6 | 5 | C-6|A-4 | Генерируются формы по param metadata с units, ranges, hints. |
| G-3 | Сделать generic Tune face renderer | Frontend | P1 | S7 | 5 | G-2|F-3 | Есть безопасный UX для tuning params и commit/revert. |
| G-4 | Сделать generic Actions face renderer | Frontend+Runtime | P1 | S7 | 5 | A-4|E-7 | Operations доступны с lifecycle, confirm policy и progress. |
| G-5 | Сделать generic Trends face renderer | Frontend+Runtime | P1 | S7 | 5 | A-4|E-7 | Есть один trend widget по trace groups. |
| G-6 | Сделать generic Diagnostics face renderer | Frontend+Runtime | P1 | S7 | 5 | E-5 | Показываются alarms/errors/warnings grouped by owner. |
| G-7 | Сделать on-device menu contract + renderer hints | Frontend+Runtime | P1 | S7 | 5 | A-4|E-4 | Есть compact menu schema для дисплея и web UI. |
| G-8 | Добавить access + live edit policies UX | Frontend+Runtime | P1 | S7 | 5 | A-4|E-4 | UI различает immediate/confirm/restart-only/commissioning-only и роли доступа. |
### EPIC-08 — Simulation & Test Bench
| ID | Title | Owner | Priority | Sprint | Points | DependsOn | Done when |
|---|---|---|---|---|---:|---|---|
| H-1 | Зафиксировать simulation contract v1 | Lead+Library | P1 | S7 | 3 | A-4 | Описаны model hooks, fault injection, time scaling, virtual bindings. |
| H-2 | Сделать virtual hardware binding layer | Runtime+Mat | P1 | S8 | 5 | H-1|D-6 | Можно переключать object/hardware bindings between real and simulated backends. |
| H-3 | Сделать test bench runner для sequences/states | Frontend+Runtime | P1 | S8 | 5 | H-2 | Есть сценарное воспроизведение событий и проверка стадий. |
| H-4 | Сделать fault injection UX | Frontend | P2 | S8 | 3 | H-1|G-4 | Можно безопасно включать типовые fault modes. |
| H-5 | Добавить replay + captured traces | Frontend+Runtime | P2 | S8 | 5 | G-5|H-3 | Trace data можно сохранить и переиграть для debug. |
### EPIC-09 — Boiler Package v1
| ID | Title | Owner | Priority | Sprint | Points | DependsOn | Done when |
|---|---|---|---|---|---:|---|---|
| I-1 | Спроектировать BoilerSupervisor external contract | Package | P0 | S8 | 5 | F-2|F-3|F-5 | Есть external interface, params, alarms, views и ownership model. |
| I-2 | Собрать BoilerSupervisor composition skeleton | Package | P0 | S8 | 8 | I-1 | Есть composition из flowmeter/pid/sequence/trip/actuator objects. |
| I-3 | Добавить BurnerSequence state contract | Package+Library | P1 | S8 | 5 | I-2 | Есть state contract для purge/ignite/run/fault и diagnostics hooks. |
| I-4 | Сделать boiler package views | Package+Frontend | P1 | S9 | 5 | I-2|G-1|G-5 | Есть boiler-specific overview/setup/tune/diagnostics surfaces. |
| I-5 | Сделать boiler package materialization tests | Package+QA | P1 | S9 | 5 | I-2|D-8 | Boiler package успешно materialize-ится и применим на target profile. |
| I-6 | Подготовить commissioning сценарии boiler | Package+QA | P1 | S9 | 3 | I-4|H-3 | Есть scripts/checklists для startup, fault, shutdown, tuning. |
### EPIC-10 — Beta Hardening & Product Unification
| ID | Title | Owner | Priority | Sprint | Points | DependsOn | Done when |
|---|---|---|---|---|---:|---|---|
| J-1 | Собрать unified repository structure | Lead+DevOps | P1 | S9 | 5 | B-1|D-1 | Монорепо или workspace layout стабилен для ui/schema/materializer/runtime. |
| J-2 | Настроить CI для schema/materializer/runtime/ui | DevOps+QA | P1 | S9 | 5 | J-1 | Есть lint/test/golden/integration pipeline. |
| J-3 | Сделать compatibility test matrix | QA | P1 | S9 | 5 | J-2|E-2 | Есть matrix: legacy projects, v0.4 projects, esp32 target profile. |
| J-4 | Сделать product packaging и release flow | DevOps+Lead | P2 | S10 | 5 | J-1|J-2 | Есть reproducible release flow для UI + materializer + runtime firmware. |
| J-5 | Сделать beta documentation set | Lead+All | P2 | S10 | 5 | J-2|I-5 | Есть setup guide, authoring guide, commissioning guide и target limits. |
| J-6 | Провести beta readiness review | Lead+QA | P1 | S10 | 3 | J-3|J-4|J-5 | Есть checklist и go/no-go решение на beta. |
| J-7 | Закрыть P0/P1 runtime-owner diagnostics gaps | Runtime+Frontend | P1 | S10 | 5 | E-5|G-6 | P0/P1 пробелы в owner mapping и diagnostics закрыты. |
| J-8 | Подготовить first customer/demo bundle | Lead+Package | P2 | S10 | 3 | I-4|J-5 | Есть демонстрационный пакет: relay/flowmeter/pid/boiler. |
## 9. Что нельзя делать до завершения S4
- не добавлять большие UI-фичи поверх нестабильной модели
- не расширять runtime schema как авторский язык продукта
- не плодить специальные экраны под компоненты без facets
- не тянуть `Flow/State` в production authoring, пока не зафиксирован materializer
## 10. Что команда может делать параллельно без риска
- Schema/Core: пакеты, типы, validators, migrations, fixtures
- Frontend: canonicalization UI shell, navigation, stable endpoints, faces shells
- Materializer: validation/resolution/elaboration/runtime pack
- Runtime: target profile, emitter, ids stabilization, live bridges
- Library: contracts TimedRelay/Flowmeter/PID/CommBridge/Actuator
## 11. Стартовый пакет на ближайший спринт
| ID | Title | Owner | Priority | Points |
|---|---|---|---|---:|
| A-1 | Принять ADR: Product Foundation Freeze | Lead | P0 | 3 |
| A-2 | Заморозить canonical project schema v0.4.x | Core | P0 | 5 |
| A-3 | Заморозить canonical runtime pack schema v0.1 | Lead+Runtime | P0 | 5 |
| A-4 | Заморозить capability facets v1 | Lead+Library | P0 | 5 |
| A-5 | Заморозить merge contract UI <-> Materializer <-> Runtime | Lead | P0 | 3 |
| A-6 | Подготовить decision log по спорным местам | Lead | P1 | 2 |
| B-1 | Создать packages/schema | Core | P0 | 3 |
| B-2 | Реализовать canonical TS types | Core | P0 | 5 |

## 12. Следующий минимальный checkpoint
После завершения S4 должны одновременно существовать:
- shared schema package
- canonicalized UI model
- materializer core
- canonical runtime pack
- target profile esp32/v1

Только после этого безопасно масштабировать library objects и commissioning UX.
