# universal_plc — Implementation Breakdown

**Документ:** Implementation Breakdown  
**Фаза:** Definition Studio + Composition v1  
**Дата:** 2026-03-26

## 1. Цель milestone

Собрать первый законченный вертикальный срез новой архитектуры:

- в проекте есть `Definitions`
- `ObjectType` и `ObjectInstance` живут как разные сущности
- на system-level пользователь работает только с instances
- по double click на instance открывается `Instance Overview`
- из `Instance Overview` можно перейти в `Object Definition Studio`
- в `Definition Studio` доступны surface'ы:
  - `Interface`
  - `Composition`
  - `State` (shell)
  - `Flow` (shell)
  - `Diagnostics`
- `Composition v1` позволяет:
  - добавлять child instances
  - задавать child param values
  - связывать `parent -> child`, `child -> child`, `child -> parent`
- проект сохраняется и повторно открывается без потери ID, refs и layout
- legacy project открывается через transition layer

Это первый момент, когда редактор становится не только system-level assembler, но и object authoring platform.

---

## 2. Что делаем сначала, а что нет

### Входит в эту фазу
- project schema vNext
- `ObjectType`
- `ObjectInstance`
- `type_ref`
- `Definitions` section
- `Definition Studio`
- `Interface` editor foundation
- `Instance Overview`
- `Composition v1`
- `Diagnostics` surface
- legacy compatibility adapter
- semantic validation для composition

### Не входит в эту фазу
- полноценный `State` editor
- полноценный `Flow` editor
- runtime
- codegen/compiler backend
- inheritance
- hardware redesign
- views redesign
- alarm graph editor

---

## 3. Рекомендуемая архитектура по слоям

Нужно разрезать реализацию не “по страницам”, а по четырём слоям.

### Layer A — Core Model
Чистая модель данных и contracts:
- persisted schema
- in-memory refs
- scope model
- validation input/output types
- migration contracts

### Layer B — Editor Store
Нормализованное состояние редактора:
- entities
- selection
- active scope
- surface state
- diagnostics cache
- command handlers

### Layer C — UI Surfaces
Конкретные surface’ы:
- `System`
- `Definitions`
- `Instance Overview`
- `Definition Studio / Interface`
- `Definition Studio / Composition`
- `Definition Studio / Diagnostics`

### Layer D — Semantic Build
Промежуточная сборка модели:
- ref resolution
- type expansion
- endpoint typing
- route validation
- diagnostics

---

## 4. Рекомендуемая структура модулей

Если есть возможность немного вычистить repo, я бы разложил так:

```text
src/
  core/
    model/
      project.ts
      objectType.ts
      objectInstance.ts
      refs.ts
      scopes.ts
      routes.ts
      params.ts
    schema/
      projectSchema.ts
      objectTypeSchema.ts
      objectInstanceSchema.ts
    migration/
      legacyToVNext.ts
      generatedTypes.ts
    build/
      validateProject.ts
      resolveTypeRefs.ts
      resolveComposition.ts
      diagnostics.ts

  store/
    editorStore.ts
    commands/
      definitions.ts
      interface.ts
      composition.ts
      instanceOverview.ts
    selectors/
      definitions.ts
      instances.ts
      composition.ts
      diagnostics.ts
    adapters/
      systemAssemblyAdapter.ts
      compositionAssemblyAdapter.ts

  ui/
    navigation/
    system/
    definitions/
      DefinitionsPage.tsx
      DefinitionStudio.tsx
      surfaces/
        InterfaceSurface.tsx
        CompositionSurface.tsx
        StateSurface.tsx
        FlowSurface.tsx
        DiagnosticsSurface.tsx
    instanceOverview/
    assembly/
      AssemblySurface.tsx
      AssemblyCanvas.tsx
      BoundaryRails.tsx
      RouteLayer.tsx
      SelectionInspector.tsx

  tests/
    model/
    migration/
    build/
    ui/
```

Смысл простой: `AssemblySurface` не знает, редактирует он System или Composition. Он работает через adapter.

---

## 5. Persisted model и editor store — не одно и то же

Persisted JSON должен оставаться близким к предметной модели:

- `definitions.object_types`
- `system.instances`
- `system.routes`
- `layouts`

Но store лучше держать нормализованным и scope-aware.

### Persisted model
Хорош для:
- сохранения
- diff
- schema validation
- migration

### Editor store
Хорош для:
- selection
- navigation
- quick lookup
- surface-specific view models
- diagnostics overlays

Не надо заставлять UI напрямую жить на сыром JSON дереве.

---

## 6. Канонический editor scope

Нужен один тип для текущего контекста редактирования.

```ts
type SurfaceId = "interface" | "composition" | "state" | "flow" | "diagnostics";

type EditorScope =
  | { kind: "system" }
  | { kind: "definitions" }
  | { kind: "definition"; typeId: string; surface: SurfaceId };
```

Дополнительно UI route может открывать transient panels:

```ts
interface UiPanelsState {
  instanceOverview?: {
    hostScope: "system" | "composition";
    instanceId: string;
    ownerTypeId?: string;
  };
}
```

### Почему это важно
Drill-in дальше в проекте больше не интерпретируется как zoom. Это всегда переход scope.

---

## 7. Нормализованный editor store

Минимальный store для первого milestone:

```ts
interface EditorStore {
  project: ProjectModel;

  navigation: {
    activeScope: EditorScope;
    panels: UiPanelsState;
  };

  selection: {
    system?: SelectionState;
    definitions: Record<string, SelectionState>; // key = `${typeId}:${surface}`
  };

  diagnostics: {
    project: DiagnosticItem[];
    byScope: Record<string, DiagnosticItem[]>;
  };

  dirty: {
    semantic: boolean;
    layout: boolean;
  };
}

type SelectionState =
  | { kind: "none" }
  | { kind: "instance"; instanceId: string }
  | { kind: "route"; routeId: string }
  | { kind: "parent_port"; portId: string };
```

### Ключевая мысль
Selection всегда живёт внутри scope. Нельзя хранить “одну глобальную выбранную ноду” на весь проект.

---

## 8. Командная модель

Вместо хаотичных mutate-вызовов лучше ввести явные editor commands.

### Definitions commands
- `createObjectType`
- `renameObjectType`
- `deleteObjectType`
- `openDefinitionSurface`

### Interface commands
- `addTypePort`
- `updateTypePort`
- `removeTypePort`
- `addTypeParam`
- `updateTypeParam`
- `removeTypeParam`

### System instance commands
- `createSystemInstance`
- `updateSystemInstance`
- `deleteSystemInstance`
- `openInstanceOverview`

### Composition commands
- `addCompositionChild`
- `removeCompositionChild`
- `moveCompositionChild`
- `setCompositionChildParamValue`
- `createCompositionRoute`
- `deleteCompositionRoute`
- `selectCompositionEntity`

### Diagnostics/build commands
- `rebuildDiagnostics`
- `validateScope`

Командная модель резко упрощает тесты и миграцию.

---

## 9. Референсная модель AssemblySurface

Самый важный технический ход: не писать отдельный второй canvas. Нужно выделить общий `AssemblySurface`.

### Он должен получать adapter:

```ts
interface AssemblyAdapter {
  getScopeKey(): string;

  listNodes(): AssemblyNodeVm[];
  listRoutes(): AssemblyRouteVm[];
  listBoundaryPorts(): AssemblyBoundaryPortVm[];

  canCreateChild(typeRef: string): boolean;
  createChild(input: CreateChildInput): void;
  deleteChild(instanceId: string): void;
  moveChild(instanceId: string, x: number, y: number): void;

  connect(from: AssemblyEndpointRef, to: AssemblyEndpointRef): ConnectResult;
  disconnect(routeId: string): void;

  getSelection(): SelectionState;
  setSelection(selection: SelectionState): void;

  getInspectorModel(selection: SelectionState): InspectorVm;
  getDiagnostics(): DiagnosticItem[];
}
```

### Будут два adapter’а
- `SystemAssemblyAdapter`
- `CompositionAssemblyAdapter`

`AssemblySurface` не должен знать разницу между ними.

---

## 10. Boundary model для Composition

В Composition есть boundary между parent interface и child instances.

Чтобы UI не путался, лучше ввести boundary port VM, а не пытаться напрямую рисовать parent ports как обычные child nodes.

```ts
interface AssemblyBoundaryPortVm {
  id: string;
  role: "source" | "sink";
  externalDirection: "in" | "out";
  title: string;
  valueType: string;
  channelKind: string;
}
```

### Правило отображения
- parent `in` => boundary `source`
- parent `out` => boundary `sink`

Это не меняет persisted schema. Это только правильная view-model для Composition surface.

---

## 11. View models для canvas

### Node VM
```ts
interface AssemblyNodeVm {
  id: string;
  title: string;
  subtitle?: string; // обычно type title
  ports: AssemblyPortVm[];
  x: number;
  y: number;
  w: number;
  h: number;
  badges?: string[];
}
```

### Port VM
```ts
interface AssemblyPortVm {
  id: string;
  title: string;
  direction: "in" | "out";
  valueType: string;
  channelKind: string;
}
```

### Route VM
```ts
interface AssemblyRouteVm {
  id: string;
  from: AssemblyEndpointRef;
  to: AssemblyEndpointRef;
  status: "ok" | "warning" | "error";
}
```

### Endpoint ref
```ts
type AssemblyEndpointRef =
  | { kind: "boundary_port"; portId: string }
  | { kind: "instance_port"; instanceId: string; portId: string };
```

---

## 12. UI layout первого milestone

### Project navigation
Слева:
- Definitions
- System
- Hardware
- Views

### Definitions
- list of types
- grouped by origin
- create type button

### Definition Studio
Tabs:
- Interface
- Composition
- State
- Flow
- Diagnostics

### Composition surface
- left palette / add child
- center canvas
- left rail: parent inputs
- right rail: parent outputs
- right inspector
- bottom diagnostics strip

### System
- instances on canvas
- double click opens `Instance Overview`

### Instance Overview
Лучше сделать drawer/panel, а не отдельную новую страницу первого шага.

---

## 13. Реализация Instance Overview

`Instance Overview` должен строиться через resolve phase, а не на сыром instance.

### VM для overview
```ts
interface InstanceOverviewVm {
  instanceId: string;
  title: string;
  typeRef: string;
  typeTitle?: string;
  origin: "project" | "generated" | "imported";
  params: ResolvedParamVm[];
  ports: ResolvedPortVm[];
  routeSummary: RouteSummaryVm;
  hardwareSummary?: unknown;
  viewsSummary?: unknown;
}
```

### Почему через resolved VM
Потому что effective interface instance вычисляется из type, а не лежит в instance schema.

---

## 14. Interface surface — минимальный функционал

Для первого среза Interface не обязан быть идеальным. Но должен быть законченным.

### Нужный минимум
- список ports
- add/edit/delete port
- список params
- add/edit/delete param
- stable IDs
- inline validation

### Что не нужно сейчас
- сложные группировки интерфейсов
- library-level templates
- alarm authoring sophistication

---

## 15. Composition surface — минимальный функционал

Это главный рабочий surface.

### Пользователь должен уметь
1. открыть `Composition`
2. увидеть parent boundary
3. добавить child instance по `type_ref`
4. переместить child на canvas
5. выбрать child и отредактировать `param_values`
6. создать route:
   - `parent -> child`
   - `child -> child`
   - `child -> parent`
7. выбрать route и увидеть validation status
8. удалить route
9. сохранить layout

### Что сознательно не делаем
- nested drill-in прямо из того же canvas по умолчанию
- multi-select editing
- mixed state/flow overlays
- param routes on canvas
- automatic signal generation

---

## 16. Диагностика в реальном времени

Нужно разделить validation на два уровня.

### Level 1 — immediate editor validation
Проверки на жестах и локальных изменениях:
- endpoint exists
- impossible self-connect
- wrong source/target direction
- duplicate driver

### Level 2 — scope rebuild validation
Пересчёт после изменения scope:
- missing `type_ref`
- missing ports
- param refs
- value type compatibility
- orphan layout entries

UI должен показывать оба уровня через один `Diagnostics` surface.

---

## 17. Semantic build v1

После каждого значимого semantic change вызывается build пайплайн.

### Pipeline
1. `validateProjectSchema(project)`
2. `resolveTypeRefs(project)`
3. `resolveSystemInstances(project)`
4. `resolveComposition(type)`
5. `validateCompositionRoutes(type)`
6. `collectDiagnostics()`

### Выход
```ts
interface BuildResult {
  ok: boolean;
  diagnostics: DiagnosticItem[];
  resolved: ResolvedProjectModel;
}
```

### Что важно
Build v1 не должен знать про runtime. Это семантическая нормализация и валидация, не execution engine.

---

## 18. Resolved model — минимальный контракт

```ts
interface ResolvedProjectModel {
  definitions: Record<string, ResolvedObjectType>;
  system: {
    instances: Record<string, ResolvedInstance>;
    routes: Record<string, ResolvedRoute>;
  };
}

interface ResolvedObjectType {
  id: string;
  ports: Record<string, PortDef>;
  params: Record<string, ParamDef>;
  composition?: ResolvedComposition;
}

interface ResolvedComposition {
  instances: Record<string, ResolvedInstance>;
  routes: Record<string, ResolvedCompositionRoute>;
}

interface ResolvedInstance {
  id: string;
  typeRef: string;
  resolvedTypeId?: string;
  ports: Record<string, PortDef>;
  params: Record<string, ResolvedParamValue>;
}
```

Сначала этого достаточно. Не надо пытаться строить весь будущий compiler IR.

---

## 19. Migration / transition layer

Это критично: нельзя ломать текущие проекты.

### Стратегия
При чтении legacy schema:
1. каждый legacy object становится `generated ObjectType`
2. создаётся `ObjectInstance`, который ссылается на него
3. generated type получает `origin = generated`
4. editor дальше работает уже только на новой in-memory модели

### Важное правило
Generated type сначала один-к-одному отражает старый объект. Не надо на импортe пытаться автоматически “вычислить общие типы”.

### Результат
Миграция становится безопасной, а не магической.

---

## 20. Save/load policy

### Load
- попытка прочитать `schema_version`
- если это legacy, включается adapter
- если это vNext, грузим напрямую

### Save
- legacy format назад не пишем
- после первого сохранения проект становится `schema_version = 0.4.0`
- до явного сохранения можно держать banner: “project opened via compatibility layer”

Это хороший и предсказуемый режим.

---

## 21. Минимальный набор тестов

Нельзя идти только через ручную проверку UI. Здесь нужен компактный, но жёсткий test pack.

### Model / schema tests
- create/read `ObjectType`
- create/read `ObjectInstance`
- parse/save `Composition`
- stable IDs preserved

### Build / validation tests
- missing `type_ref`
- missing child port
- duplicate driver on input
- parent param ref not found
- incompatible value types

### Migration tests
- legacy object -> generated type + instance
- imported project opens without semantic loss

### UI interaction tests
- double click system instance opens overview
- overview -> Open Type switches scope
- add child in composition
- create route parent -> child
- create route child -> parent

---

## 22. Правильный порядок внедрения

Ниже — не общий roadmap на годы, а порядок для ближайшей реализации.

### Slice 1 — Core model foundation
Сначала кодируем:
- project root vNext
- `ObjectType`
- `ObjectInstance`
- `type_ref`
- scope types
- schema readers/writers

**Готовность:** можно создать пустой vNext project model и сериализовать его.

### Slice 2 — Definitions shell
Потом:
- navigation entry `Definitions`
- type list
- `Definition Studio` tabs
- empty surfaces + active tab routing

**Готовность:** можно открыть type в `Definition Studio`.

### Slice 3 — Interface editor foundation
Потом:
- ports CRUD
- params CRUD
- inline validation

**Готовность:** type получает редактируемый interface.

### Slice 4 — Instance/type split on System
Потом:
- system objects становятся `ObjectInstance`
- effective interface берётся из type
- double click opens `Instance Overview`

**Готовность:** system editor больше не считает object самостоятельным definition.

### Slice 5 — Migration adapter
Потом:
- legacy open path
- generated types
- migration banner

**Готовность:** старые проекты открываются через новый editor без падений.

### Slice 6 — AssemblySurface extraction
Потом:
- выделить общий canvas host
- selection model
- route interactions
- inspector host

**Готовность:** system surface уже сидит на общем `AssemblySurface`.

### Slice 7 — Composition adapter
Потом:
- `CompositionAssemblyAdapter`
- boundary rails
- child instances
- composition routes
- layout save/load

**Готовность:** Composition v1 реально работает.

### Slice 8 — Diagnostics surface + build v1
Потом:
- structured diagnostics
- validation strip
- per-scope diagnostics

**Готовность:** editor показывает не только графику, но и semantic correctness.

Это и есть первый законченный milestone.

---

## 23. Разбиение на конкретные tickets

Ниже — уже почти готовая нарезка backlog.

### Epic A — Model
1. `Introduce vNext project root`
2. `Add ObjectType model`
3. `Add ObjectInstance model`
4. `Add type_ref + ref parser`
5. `Add EditorScope model`
6. `Split semantic model from layout model`

### Epic B — Definitions
7. `Add Definitions section to navigation`
8. `Implement type list grouped by origin`
9. `Implement Definition Studio shell`
10. `Implement surface routing for Interface/Composition/State/Flow/Diagnostics`

### Epic C — Interface
11. `Implement port CRUD`
12. `Implement param CRUD`
13. `Add interface validation`

### Epic D — System split
14. `Convert system editor to ObjectInstance-first`
15. `Resolve effective interface from type_ref`
16. `Implement Instance Overview`
17. `Add Open Type transition from Instance Overview`

### Epic E — Composition
18. `Extract generic AssemblySurface`
19. `Implement SystemAssemblyAdapter`
20. `Implement CompositionAssemblyAdapter`
21. `Add boundary rails for parent ports`
22. `Add child instance creation in Composition`
23. `Add child param inspector editing`
24. `Add Composition route creation`
25. `Add Composition route deletion`
26. `Add Composition layout persistence`

### Epic F — Build/Diagnostics
27. `Implement type_ref resolution`
28. `Implement composition route validation`
29. `Implement diagnostics store`
30. `Implement Diagnostics surface`
31. `Implement validation strip`

### Epic G — Migration
32. `Implement legacy -> generated type adapter`
33. `Expose Generated Types group in Definitions`
34. `Add migration banner and new-save path`

---

## 24. Самые опасные места

### Риск 1 — UI начнёт напрямую знать модель Composition
Нужно удержать границу: UI работает через adapter/view-model, а не через сырые `project.definitions.object_types[typeId]`.

### Риск 2 — system editor останется “чуть-чуть старым”
Если на system-level часть логики будет продолжать жить в старой object model, вы получите гибрид, который потом трудно чистить.

### Риск 3 — parent boundary semantics запутает направление
Нужно сразу делать boundary VM с ролями `source/sink`. Не тянуть на canvas сырой `direction` parent port без интерпретации.

### Риск 4 — params попытаются засунуть в routing
Это надо пресечь сразу. Param binding в inspector, не на canvas.

### Риск 5 — migration станет “невидимой магией”
Generated types должны быть видны пользователю. Иначе отладка миграции станет кошмаром.

---

## 25. Что считать демонстрацией успеха

Milestone готов, когда можно сделать такой сценарий:

1. Открыть проект.
2. Перейти в `Definitions`.
3. Создать type `boiler_supervisor`.
4. В `Interface` добавить parent ports и params.
5. В `Composition` добавить child instances:
   - `burner_sequence`
   - `safety_chain`
6. Настроить child `param_values`.
7. Создать routes:
   - `parent.cmd_start -> burner_sequence.cmd_start`
   - `burner_sequence.trip -> safety_chain.trip_in`
   - `burner_sequence.run_fb -> parent.run_fb`
8. На `System` создать instance `boiler_supervisor_1`.
9. По double click открыть `Instance Overview`.
10. Нажать `Open Type`.
11. Вернуться, сохранить проект, перезагрузить и увидеть те же structure/layout/refs.

Если этот сценарий проходит, новая архитектура реально встала на рельсы.

---

## 26. Что делать сразу после milestone

Сразу после `Definition Shell + Composition v1` логичный следующий шаг такой:

### Следующий шаг 1
`State v1 shell -> working state machine`
- one machine per object
- no parallel regions
- state list + transitions

### Следующий шаг 2
`Flow v1`
- named graphs
- acyclic data logic
- explicit stateful blocks

### Следующий шаг 3
`State <-> Flow linkage`
- entry/do/exit references
- always-on flow

Но это уже следующая фаза. Не смешивать её с Composition milestone.

---

## 27. Рекомендуемая формулировка для команды

> Мы переводим editor из режима system-only assembly в режим hierarchical object authoring.
> Для этого фиксируем split между `ObjectType` и `ObjectInstance`, вводим `Definition Studio`, а первым внутренним semantic surface делаем `Composition`, потому что он продолжает уже стабилизированный assembly/routing pattern в новом scope.

