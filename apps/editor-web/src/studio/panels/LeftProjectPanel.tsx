import { useMemo, useState } from "react";
import { BUILTIN_BLOCK_LIBRARY_GROUPS } from "../model/blockCatalog";
import type { BehaviorKind, PlcObjectDefinition } from "../model/demoProject";
import type { OverlayAnchorPoint } from "../store/studioStore";
import { useStudioStore } from "../store/studioStore";

interface LibraryItemDefinition {
  id: string;
  label: string;
  kind: string;
  summary: string;
  behaviorKind?: BehaviorKind;
  objectType?: string;
  inputs?: Array<{ name: string; dataType?: "bool" | "number" | "string" | "enum"; summary?: string }>;
  outputs?: Array<{ name: string; dataType?: "bool" | "number" | "string" | "enum"; summary?: string }>;
}

const LIBRARY_GROUPS: Array<{ id: string; label: string; items: LibraryItemDefinition[] }> = [
  ...BUILTIN_BLOCK_LIBRARY_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items.map((item) => ({
      id: item.id,
      label: item.label,
      kind: item.kind,
      summary: item.summary,
      inputs: item.inputs,
      outputs: item.outputs
    }))
  })),
  {
    id: "objects",
    label: "Objects / Templates",
    items: [
      {
        id: "blink-relay-primitive",
        label: "BlinkRelayPrimitive",
        kind: "Object",
        objectType: "BlinkRelayPrimitive",
        behaviorKind: "control",
        summary: "Native relay blink primitive with ON/OFF durations and OLED-ready status outputs.",
        inputs: [{ name: "enable" }],
        outputs: [
          { name: "relayOut" },
          { name: "relayState" },
          { name: "phase", dataType: "string" },
          { name: "remainingSeconds", dataType: "number" }
        ]
      },
      {
        id: "pump-unit",
        label: "PumpUnit",
        kind: "Object",
        objectType: "PumpUnit",
        behaviorKind: "control",
        summary: "Pump object with command, feedback and ready/fault outputs.",
        inputs: [{ name: "startCmd" }, { name: "runFb" }, { name: "faultFb" }, { name: "pressureValue", dataType: "number" }],
        outputs: [{ name: "running" }, { name: "ready" }, { name: "fault" }]
      },
      {
        id: "ready-resolver",
        label: "ReadyResolver",
        kind: "Object",
        objectType: "ReadyResolver",
        behaviorKind: "control",
        summary: "Resolves several conditions into one engineering-ready signal.",
        inputs: [{ name: "inA" }, { name: "inB" }, { name: "inC" }],
        outputs: [{ name: "ready" }]
      },
      {
        id: "fault-aggregator",
        label: "FaultAggregator",
        kind: "Object",
        objectType: "FaultAggregator",
        behaviorKind: "monitoring",
        summary: "Combines several fault conditions into one alarm output.",
        inputs: [{ name: "faultA" }, { name: "faultB" }, { name: "faultC" }],
        outputs: [{ name: "fault" }]
      }
    ]
  }
];

type TreeKeyMap = Record<string, boolean>;

function useTreeState(initial: string[]) {
  const [openKeys, setOpenKeys] = useState<TreeKeyMap>(Object.fromEntries(initial.map((key) => [key, true])));

  return {
    isOpen: (key: string) => openKeys[key] ?? false,
    toggle: (key: string) =>
      setOpenKeys((current) => ({
        ...current,
        [key]: !(current[key] ?? false)
      }))
  };
}

function TreeBranch({
  label,
  meta,
  icon,
  open,
  selected,
  onToggle,
  onSelect,
  children
}: {
  label: string;
  meta?: string;
  icon?: string;
  open: boolean;
  selected?: boolean;
  onToggle: () => void;
  onSelect?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="tree-branch">
      <div className={`tree-branch__row${selected ? " is-selected" : ""}`}>
        <button type="button" className="tree-branch__toggle" onClick={onToggle} aria-label={open ? "Collapse" : "Expand"}>
          <span className="tree-branch__chevron">{open ? "▾" : "▸"}</span>
        </button>
        <button type="button" className="tree-branch__content" onClick={onSelect ?? onToggle}>
          <span className="tree-branch__main">
            {icon ? <span className="tree-branch__icon">{icon}</span> : null}
            <span className="tree-branch__label">{label}</span>
          </span>
          {meta ? <span className="tree-branch__meta">{meta}</span> : null}
        </button>
      </div>
      {open && children ? <div className="tree-branch__children">{children}</div> : null}
    </div>
  );
}

function TreeLeaf({
  label,
  meta,
  icon,
  selected,
  onClick
}: {
  label: string;
  meta?: string;
  icon?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="tree-leaf__main">
        {icon ? <span className="tree-leaf__icon">{icon}</span> : null}
        <span className="tree-leaf__label">{label}</span>
      </span>
      {meta ? <span className="tree-leaf__meta">{meta}</span> : null}
    </>
  );

  if (!onClick) {
    return <div className="tree-leaf tree-leaf--static">{content}</div>;
  }

  return (
    <button type="button" className={`tree-leaf${selected ? " is-selected" : ""}`} onClick={onClick}>
      {content}
    </button>
  );
}

function getObjectIcon(object: PlcObjectDefinition) {
  switch (object.behaviorKind) {
    case "sequence":
      return "SEQ";
    case "control":
      return "CTL";
    case "monitoring":
      return "MON";
    default:
      return "OBJ";
  }
}

function getContextLabel(selectedObject: PlcObjectDefinition | null) {
  return selectedObject ? `Add to ${selectedObject.name}` : "Add System Object";
}

function collectExpandedObjectIds(objects: PlcObjectDefinition[], startObjectId: string | null) {
  const byId = new Map(objects.map((object) => [object.id, object]));
  const expanded = new Set<string>();

  let cursor = startObjectId ? byId.get(startObjectId) ?? null : null;
  while (cursor) {
    expanded.add(cursor.id);
    cursor = cursor.parentObjectId ? byId.get(cursor.parentObjectId) ?? null : null;
  }

  return expanded;
}

function createObjectPreset(type: "fuel" | "oled" | "protection" | "custom", parentObjectId?: string | null): {
  name: string;
  type?: string;
  behaviorKind: BehaviorKind;
  summary?: string;
  parentObjectId?: string | null;
} {
  switch (type) {
    case "fuel":
      return {
        name: parentObjectId ? "FuelSubgroup" : "FuelGroup",
        type: "FuelGroup",
        behaviorKind: "control",
        summary: "Fuel object with pump selection, standby rotation and pressure supervision.",
        parentObjectId: parentObjectId ?? null
      };
    case "oled":
      return {
        name: "BoilerOledPanel",
        type: "OperatorHmiPanel",
        behaviorKind: "control",
        summary: "OLED panel with Up, Down, OK and Back for status, reset and parameter entry.",
        parentObjectId: parentObjectId ?? null
      };
    case "protection":
      return {
        name: "BoilerProtection",
        type: "BoilerProtection",
        behaviorKind: "monitoring",
        summary: "Trip and permissive layer that collects unsafe conditions and reset paths.",
        parentObjectId: parentObjectId ?? null
      };
    default:
      return {
        name: parentObjectId ? "NestedObject" : "NewObject",
        type: "CustomObject",
        behaviorKind: "control",
        summary: "Custom object to be defined by the user.",
        parentObjectId: parentObjectId ?? null
      };
  }
}

export function LeftProjectPanel() {
  const project = useStudioStore((state) => state.project);
  const activeWorkspace = useStudioStore((state) => state.activeWorkspace);
  const graphScopeStack = useStudioStore((state) => state.graphScopeStack);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const setActiveWorkspace = useStudioStore((state) => state.setActiveWorkspace);
  const clearGraphScope = useStudioStore((state) => state.clearGraphScope);
  const selectItem = useStudioStore((state) => state.selectItem);
  const addObject = useStudioStore((state) => state.addObject);
  const ensureObjectStructure = useStudioStore((state) => state.ensureObjectStructure);
  const addStructureNode = useStudioStore((state) => state.addStructureNode);
  const addStructureObjectNode = useStudioStore((state) => state.addStructureObjectNode);

  const workspaceTree = [
    {
      id: "machine" as const,
      label: "Machine",
      icon: "MAC",
      meta: "Design"
    },
    {
      id: "bind" as const,
      label: "Bind",
      icon: "IO",
      meta: "Ports / GPIO"
    },
    {
      id: "logic" as const,
      label: "Logic",
      icon: "LOG",
      meta: "Blocks"
    },
    {
      id: "observe" as const,
      label: "Observe",
      icon: "OBS",
      meta: "Runtime"
    }
  ];

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const tree = useTreeState(["project-root", "system-objects"]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, PlcObjectDefinition[]>();
    for (const object of project.objects) {
      const key = object.parentObjectId ?? null;
      const bucket = map.get(key) ?? [];
      bucket.push(object);
      map.set(key, bucket);
    }
    return map;
  }, [project.objects]);

  const topLevelObjects = childrenByParent.get(null) ?? [];
  const currentGraphObjectId = graphScopeStack[graphScopeStack.length - 1] ?? null;
  const selectedObject = project.objects.find((item) => item.id === (currentGraphObjectId ?? selectedObjectId)) ?? null;
  const treeFocusObjectId =
    currentGraphObjectId ?? (selectedItemType === "object" && selectedItemId ? selectedItemId : selectedObjectId);
  const expandedObjectIds = useMemo(
    () => collectExpandedObjectIds(project.objects, treeFocusObjectId),
    [project.objects, treeFocusObjectId]
  );
  const libraryEnabled = activeWorkspace === "machine" && Boolean(currentGraphObjectId) && Boolean(selectedObject);

  function addLibraryItem(item: LibraryItemDefinition) {
    if (!selectedObject) {
      return;
    }

    ensureObjectStructure(selectedObject.id, `Internal view for ${selectedObject.name}.`);
    const nodeIndex = selectedObject.structure?.nodes.length ?? 0;
    const column = nodeIndex % 3;
    const row = Math.floor(nodeIndex / 3);

    const position = {
      x: 200 + column * 250,
      y: 120 + row * 180
    };

    if (item.kind === "Object") {
      addStructureObjectNode(selectedObject.id, {
        object: {
          name: item.label,
          type: item.objectType ?? item.label,
          behaviorKind: item.behaviorKind ?? "control",
          summary: item.summary
        },
        node: {
          title: item.label,
          summary: item.summary,
          position,
          inputs: item.inputs,
          outputs: item.outputs
        }
      });
      return;
    }

    addStructureNode(selectedObject.id, {
      title: item.label,
      kind: item.label,
      summary: item.summary,
      position,
      inputs: item.inputs,
      outputs: item.outputs
    });
  }

  function createAnchorPoint(target: HTMLElement): OverlayAnchorPoint {
    const rect = target.getBoundingClientRect();
    return {
      left: rect.right + 14,
      top: rect.top - 8
    };
  }

  function addPreset(
    type: "fuel" | "oled" | "protection" | "custom",
    parentObjectId?: string | null,
    anchorTarget?: HTMLElement | null
  ) {
    addObject(createObjectPreset(type, parentObjectId), anchorTarget ? createAnchorPoint(anchorTarget) : null);
    setAddMenuOpen(false);
  }

  function renderObjectBranch(object: PlcObjectDefinition): React.ReactNode {
    const objectKey = `object:${object.id}`;
    const childObjects = childrenByParent.get(object.id) ?? [];
    const machineSelected = selectedItemType === "object" && selectedItemId === object.id;
    const objectOpen = tree.isOpen(objectKey) || expandedObjectIds.has(object.id) || machineSelected;
    const hasChildren = childObjects.length > 0;

    return (
      <TreeBranch
        key={object.id}
        label={object.name}
        meta={undefined}
        icon={getObjectIcon(object)}
        open={objectOpen}
        selected={machineSelected}
        onToggle={() => tree.toggle(objectKey)}
        onSelect={() => {
          setActiveWorkspace("machine");
          clearGraphScope();
          selectItem("object", object.id, {
            objectId: object.id
          });
        }}
        >
          <TreeBranch
            label="Internal Parts"
            meta={String(childObjects.length)}
            icon="NDS"
            open={tree.isOpen(`${objectKey}:children`) || objectOpen}
            onToggle={() => tree.toggle(`${objectKey}:children`)}
          >
            {hasChildren ? childObjects.map((child) => renderObjectBranch(child)) : null}
          </TreeBranch>
      </TreeBranch>
    );
  }

  return (
    <aside className="studio-panel studio-panel--left">
      <section className="panel-card tree-panel">
        <div className="tree-panel__header tree-panel__header--with-action">
          <div>
            <h3>Project Tree</h3>
            <span>{project.name}</span>
          </div>
          <button
            type="button"
            className="tree-global-add"
            onClick={() => setAddMenuOpen((current) => !current)}
            aria-label="Add"
          >
            +
          </button>
        </div>

        {addMenuOpen ? (
          <div className="tree-add-menu">
            <div className="tree-add-menu__title">{getContextLabel(selectedObject)}</div>
            <button type="button" onClick={(event) => addPreset("fuel", selectedObject?.id ?? null, event.currentTarget)}>
              {selectedObject ? "Nested FuelGroup" : "FuelGroup"}
            </button>
            <button type="button" onClick={(event) => addPreset("oled", null, event.currentTarget)}>
              OLED Panel
            </button>
            <button type="button" onClick={(event) => addPreset("protection", null, event.currentTarget)}>
              Protection
            </button>
            <button type="button" onClick={(event) => addPreset("custom", selectedObject?.id ?? null, event.currentTarget)}>
              {selectedObject ? "Nested Custom Object" : "Custom Object"}
            </button>
          </div>
        ) : null}

        <div className="tree-root">
          <TreeBranch
            label="Workspace"
            meta={workspaceTree.find((workspace) => workspace.id === activeWorkspace)?.label ?? activeWorkspace}
            icon="WSP"
            open={tree.isOpen("workspace-root")}
            onToggle={() => tree.toggle("workspace-root")}
          >
            {workspaceTree.map((workspace) => (
              <TreeLeaf
                key={workspace.id}
                label={workspace.label}
                meta={workspace.meta}
                icon={workspace.icon}
                selected={activeWorkspace === workspace.id}
                onClick={() => setActiveWorkspace(workspace.id)}
              />
            ))}
          </TreeBranch>

          <TreeBranch
            label={project.name}
            meta={undefined}
            icon="PRJ"
            open={tree.isOpen("project-root")}
            selected={selectedItemType === "project"}
            onToggle={() => tree.toggle("project-root")}
            onSelect={() => {
              setActiveWorkspace("machine");
              clearGraphScope();
              selectItem("project", "project-root");
            }}
          >
            <TreeBranch
              label="System Objects"
              meta={String(topLevelObjects.length)}
              icon="SYS"
              open={tree.isOpen("system-objects")}
              onToggle={() => tree.toggle("system-objects")}
            >
              {topLevelObjects.length ? topLevelObjects.map((object) => renderObjectBranch(object)) : <TreeLeaf label="No objects yet" icon="·" />}
            </TreeBranch>
          </TreeBranch>
        </div>
      </section>

      <section className="panel-card tree-panel library-panel">
        <div className="tree-panel__header">
          <h3>Library</h3>
          <span>{libraryEnabled ? `Place items into ${selectedObject?.name}` : "Open an object to place items"}</span>
        </div>

        <div className="library-panel__body">
          {LIBRARY_GROUPS.map((group) => (
            <details key={group.id} className="inspector-disclosure inspector-disclosure--nested" open>
              <summary>
                <span>{group.label}</span>
                <strong>{group.items.length}</strong>
              </summary>
              <div className="library-panel__items">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="library-item"
                    disabled={!libraryEnabled}
                    title={item.summary}
                    onClick={() => addLibraryItem(item)}
                  >
                    <span className="library-item__row">
                      <span className="library-item__icon">▸</span>
                      <strong>{item.label}</strong>
                    </span>
                  </button>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </aside>
  );
}
