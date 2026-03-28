# universal_plc vNext: структура репозитория и стартовый чеклист недели 1

## Нужна ли ссылка на репозиторий

Нет, для старта не нужна.

Текущий план уже можно запускать без ссылки, потому что архитектурная база зафиксирована:
- `universal_plc` = editor / model / authoring / schema / materializer base
- `ShipController` = runtime / hardware / device services / ESP32 target base

Публичная ссылка пригодится позже только для точной привязки плана к реальным каталогам, package names и текущему дереву проекта.

---

## Жёсткое решение по форме репозитория

Делаем **один vNext-репозиторий** с разделением на:
- `apps` — пользовательские приложения
- `packages` — shared contracts / materializer / library metadata
- `targets` — реальные runtime targets
- `docs` — архитектура и delivery
- `tools` — миграции, генерация, fixture scripts
- `tests` — интеграционные и schema fixtures

### Каноническая структура

```text
vnext/
  README.md
  package.json
  pnpm-workspace.yaml           # или npm workspaces; без тяжёлого monorepo framework

  /docs
    /architecture
      universal_plc_canonical_contract_and_merge_plan.md
      universal_plc_component_capability_spec_v1.md
      adr-0001-product-boundaries.md
      adr-0002-system-signals-vs-composition-routes.md
      adr-0003-materializer-boundary.md
    /delivery
      universal_plc_master_delivery_directive_ru.md
      universal_plc_github_jira_backlog_ru.md
      universal_plc_issue_matrix.csv
      universal_plc_github_jira_import.csv
    /merge
      merge-checklist-week1.md
      source-map-universal_plc-to-vnext.md
      source-map-shipcontroller-to-vnext.md

  /apps
    /config-studio               # бывший universal_plc UI/editor
      index.html
      src/
      public/
      tests/
    /commissioning-ui            # позже; не в неделе 1

  /packages
    /project-schema              # canonical authoring schema
      src/
      tests/
    /runtime-pack-schema         # canonical materialized runtime schema
      src/
      tests/
    /materializer-core           # project -> runtime pack
      src/
      tests/
    /target-adapter-contracts    # интерфейсы target emit/apply/readback
      src/
    /component-capabilities      # setup/tuning/debug/simulation/view facets
      src/
    /std-library                 # стандартные ObjectTypes / native type metadata
      src/
      fixtures/
    /shared-utils
      src/

  /targets
    /shipcontroller-esp32        # импортированная runtime/hardware база
      platformio.ini             # или текущий target build file
      src/
      include/
      data/
      test/

  /tools
    /migrations
      legacy-to-vnext/
    /emitters
      esp32/
    /fixtures

  /tests
    /fixtures
      /projects
      /runtime-packs
    /integration
      timed-relay-e2e/
      flowmeter-e2e/
```

---

## Что откуда переносим

### Из `universal_plc` переносим в первую очередь
- архитектурные документы
- planning package
- текущий `vNext` project model
- logic вокруг `Definitions / System / Hardware / Views`
- `ObjectType / ObjectInstance`
- `Instance Overview`
- `Composition`
- локальный `semantic build` как зачаток materializer-проверок
- migration helpers из legacy model

### Из `ShipController` переносим в первую очередь
- runtime engine
- hardware abstraction
- comms
- signal/state/alarm/resource layers
- web/device services
- target build environment

### Что не переносим в неделю 1 как основу
- случайные старые UI-файлы, не входящие в vNext линию
- ad-hoc runtime CRUD как канонический editor API
- старые temporary schemas
- экспериментальные screens без связи с canonical model

---

## Жёсткие правила по веткам

### Основные ветки
- `main` — baseline, защищённая, только стабильные merge
- `vnext` — интеграционная ветка всего объединения

### Рабочие ветки
Только короткоживущие ветки от `vnext`:
- `docs/...`
- `feat/...`
- `refactor/...`
- `chore/...`
- `fix/...`

### Правила
1. Прямые коммиты в `main` запрещены.
2. Прямые коммиты в `vnext` запрещены.
3. Всё только через PR.
4. Пока не закрыт первый end-to-end slice, все feature PR идут в `vnext`, не в `main`.
5. Один PR = одна цель.
6. Нельзя смешивать в одном PR:
   - schema changes
   - UI refactor
   - runtime migration
   - docs overhaul

---

## Что считаем done для старта

К концу недели 1 должно существовать:

1. `vNext` repo skeleton.
2. `docs/architecture` и `docs/delivery` перенесены и зафиксированы.
3. `project-schema` package создан.
4. `runtime-pack-schema` package создан.
5. `materializer-core` package создан как skeleton.
6. `config-studio` app заведён в новый repo как отдельное приложение.
7. `shipcontroller-esp32` target заведён в новый repo как отдельный target.
8. Сборка UI и сборка target запускаются независимо.
9. Есть один integration fixture project.
10. Есть один integration checklist для `TimedRelay` slice.

---

## Чего нельзя делать на неделе 1

Запрещено:
- переписывать сразу весь UI
- внедрять новый большой component library
- трогать State/Flow implementation deeply
- переписывать runtime engine под новую модель заранее
- делать simulator
- делать boiler package
- менять runtime target behaviour ради красоты архитектуры
- спорить о мелком naming, если граница слоя уже ясна

Неделя 1 — это **не feature week**, а **foundation week**.

---

## Детальный чеклист недели 1

## День 1 — Freeze и skeleton

### Задачи
- создать ветку `vnext` от текущего baseline
- создать каталоги `docs`, `apps`, `packages`, `targets`, `tools`, `tests`
- перенести canonical docs в `docs/architecture`
- перенести planning package в `docs/delivery`
- добавить `README` корня с картой продукта
- создать `docs/merge/merge-checklist-week1.md`

### Результат дня
- структура репозитория существует
- архитектурные документы лежат в канонических путях
- planning package лежит отдельно от architecture package

---

## День 2 — Shared packages foundation

### Задачи
- создать `packages/project-schema`
- создать `packages/runtime-pack-schema`
- создать `packages/target-adapter-contracts`
- завести минимальные exports и README для каждого package
- зафиксировать версии `0.1.0-internal`
- положить в `project-schema` канонические типы:
  - `ProjectModel`
  - `ObjectType`
  - `ObjectInstance`
  - `SystemSignal`
  - `CompositionRoute`
- положить в `runtime-pack-schema` канонические типы:
  - `RuntimePack`
  - `RuntimeSignal`
  - `RuntimeBlock`
  - `RuntimeSequence`
  - `RuntimeAlarm`

### Результат дня
- shared contracts существуют отдельно от UI и runtime
- команда больше не спорит, где находится канонический тип

---

## День 3 — Import config-studio without architecture drift

### Задачи
- создать `apps/config-studio`
- перенести текущую vNext UI-ветку туда
- убрать мёртвые и legacy-only entrypoints из автозагрузки
- подключить `project-schema` как зависимость
- зафиксировать в коде правило:
  - `system.signals` каноничны
  - `system.routes` только derived
- создать `TODO` список по UI canonicalization, но без полного переписывания

### Результат дня
- UI поднимается как отдельное приложение в новом repo
- UI уже смотрит на shared schema package, а не только на локальные ad-hoc структуры

---

## День 4 — Import shipcontroller target as isolated target

### Задачи
- создать `targets/shipcontroller-esp32`
- перенести runtime/hardware код без смысловой перестройки
- добиться независимой сборки target внутри нового repo
- отделить target-specific docs в `targets/shipcontroller-esp32/README.md`
- не переписывать runtime config model в этот день

### Результат дня
- target живёт внутри общего repo, но ещё не скрещён с новым project model напрямую
- сохраняется рабочая сборка runtime

---

## День 5 — Materializer skeleton and first fixture

### Задачи
- создать `packages/materializer-core`
- положить туда функции-заглушки:
  - `validateProjectModel()`
  - `resolveProjectModel()`
  - `materializeProject()`
  - `emitTargetPack()`
- завести первый fixture project: `timed-relay-minimal`
- завести первый expected runtime pack fixture
- создать integration test, который проверяет:
  - project fixture читается
  - materializer выдаёт runtime pack без ошибок структуры

### Результат дня
- есть первый end-to-end контракт между authoring и runtime pack
- materializer существует как отдельный слой, а не как часть UI

---

## День 6 — Mapping documents and source maps

### Задачи
- составить `source-map-universal_plc-to-vnext.md`
- составить `source-map-shipcontroller-to-vnext.md`
- указать для каждого крупного модуля:
  - source path
  - target path
  - owner
  - phase
  - status: keep / move / replace / deprecate
- отдельно отметить legacy куски, которые не переезжают

### Результат дня
- команда видит, что именно переносим, а что оставляем за бортом
- снижается риск хаотичного копирования файлов

---

## День 7 — Review gate

### Проверка
Недельный gate считается пройденным, если:
- `vnext` repo structure создан
- docs перенесены
- shared schema packages существуют
- `config-studio` живёт в `apps/config-studio`
- `shipcontroller-esp32` живёт в `targets/shipcontroller-esp32`
- materializer skeleton создан
- fixture `timed-relay-minimal` создан
- integration test на fixture создан
- у каждого блока назначен owner

Если хотя бы один из этих пунктов не выполнен, неделя 1 не считается завершённой.

---

## Стартовые PR в точном порядке

### PR-01
`docs: import architecture package and delivery package into /docs`

### PR-02
`chore: create vnext repo skeleton and workspace boundaries`

### PR-03
`feat(schema): add project-schema and runtime-pack-schema packages`

### PR-04
`feat(ui): import config-studio into apps/config-studio`

### PR-05
`chore(target): import shipcontroller-esp32 into targets/shipcontroller-esp32`

### PR-06
`feat(materializer): add materializer-core skeleton and timed-relay fixture`

### PR-07
`docs(merge): add source maps and week1 merge checklist`

---

## Кто за что отвечает в неделю 1

### Architect / Lead
- freeze решений
- review границ слоёв
- approve PR-01, PR-02, PR-07

### Schema / Core
- PR-03
- fixture typing
- export contract reviews

### Frontend
- PR-04
- проверка, что UI поднимается из нового пути
- запрет на большой рефактор в этот момент

### Runtime / Embedded
- PR-05
- сохранить рабочую сборку target
- не переписывать engine prematurely

### Materializer / Compiler
- PR-06
- fixture pipeline
- первый e2e contract

---

## Что делаем на неделе 2

Только после прохождения gate недели 1:
- канонизация endpoint shape в UI (`instance_id + port_id`)
- вынос derived `system.routes` из канонического project model
- подключение UI к shared schema types глубже
- `emitEsp32FirmwareConfig()` adapter skeleton
- первый настоящий `TimedRelay` slice

---

## Короткая директива для команды

1. Не спорим о новых фичах до закрытия foundation week.
2. Не сливаем project model и runtime config.
3. Не ломаем текущий runtime ради теоретической чистоты.
4. Не делаем universal canvas.
5. Не делаем massive UI rewrite на старте.
6. Сначала слой границ, потом код, потом расширение функций.

