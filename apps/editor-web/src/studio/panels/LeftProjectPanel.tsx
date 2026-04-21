import { useMemo, useState } from "react";
import type {
  LogicBlockDefinition,
  MachineDefinition,
  PlcObjectDefinition,
  SignalDefinition
} from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";

type TreeKeyMap = Record<string, boolean>;

function useTreeState(initial: string[]) {
  const [openKeys, setOpenKeys] = useState<TreeKeyMap>(Object.fromEntries(initial.map((key) => [key, true])));

  return {
    isOpen: (key: string) => openKeys[key] ?? false,
    setOpen: (key: string, value: boolean) =>
      setOpenKeys((current) => ({
        ...current,
        [key]: value
      })),
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

const portFamilyPresentation = {
  command: { label: "Commands", icon: "↘" },
  input: { label: "Inputs", icon: "←" },
  output: { label: "Outputs", icon: "→" },
  status: { label: "Status", icon: "≡" },
  permission: { label: "Permissions", icon: "✓" },
  alarm: { label: "Alarms", icon: "⚠" }
} as const;

const signalLayerPresentation = {
  raw: { label: "Raw", icon: "R" },
  conditioned: { label: "Conditioned", icon: "C" },
  semantic: { label: "Semantic", icon: "S" }
} as const;

const linkKindPresentation = {
  command: { label: "Commands", icon: "CMD" },
  permission: { label: "Permissions", icon: "PER" },
  status: { label: "Status", icon: "STS" },
  fault: { label: "Faults", icon: "FLT" }
} as const;

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

function getBlockIcon(block: LogicBlockDefinition) {
  switch (block.type) {
    case "Selector":
      return "SEL";
    case "Resolver":
      return "RSV";
    case "CommandLogic":
      return "CMD";
    case "PermissiveMatrix":
      return "PRM";
    case "ThresholdMonitor":
      return "THR";
    case "TimerOn":
      return "TMR";
    case "Pid":
      return "PID";
    default:
      return "BLK";
  }
}

function getSignalScope(signal: SignalDefinition) {
  const parts = signal.name.split(".");
  if (parts.length < 2) {
    return "general";
  }

  if (parts[0] === "raw" && parts.length >= 3 && (parts[1] === "di" || parts[1] === "ai" || parts[1] === "do" || parts[1] === "ao")) {
    return parts[2].split("_")[0] || parts[1];
  }

  return parts[1] || "general";
}

function getScopeLabel(scope: string) {
  return scope
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function renderPortFamilies(
  object: PlcObjectDefinition,
  objectOpen: boolean,
  tree: ReturnType<typeof useTreeState>
) {
  const familyEntries = [
    { key: "command", ports: object.commands },
    { key: "input", ports: object.inputs },
    { key: "output", ports: object.outputs },
    { key: "status", ports: object.status },
    { key: "permission", ports: object.permissions },
    { key: "alarm", ports: object.alarms }
  ] as const;

  return familyEntries
    .filter((entry) => entry.ports.length > 0)
    .map(({ key, ports }) => {
    const branchKey = `object:${object.id}:contract:${key}`;
    const presentation = portFamilyPresentation[key];
    const open = tree.isOpen(branchKey) || objectOpen;

    return (
      <TreeBranch
        key={branchKey}
        label={presentation.label}
        meta={String(ports.length)}
        icon={presentation.icon}
        open={open}
        onToggle={() => tree.toggle(branchKey)}
      >
        {ports.map((port) => (
          <TreeLeaf key={port.id} label={port.name} meta={port.dataType} icon={presentation.icon} />
        ))}
      </TreeBranch>
    );
    });
}

export function LeftProjectPanel() {
  const project = useStudioStore((state) => state.project);
  const activeWorkspace = useStudioStore((state) => state.activeWorkspace);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const setActiveWorkspace = useStudioStore((state) => state.setActiveWorkspace);
  const setMachineViewMode = useStudioStore((state) => state.setMachineViewMode);
  const setObjectViewLens = useStudioStore((state) => state.setObjectViewLens);
  const selectItem = useStudioStore((state) => state.selectItem);

  const tree = useTreeState([
    "project-root",
    "system-objects",
    "system-links",
    "signals",
    "signals:semantic",
    "blocks",
    "bindings"
  ]);

  const machinesById = useMemo(
    () => Object.fromEntries(project.machines.map((machine) => [machine.id, machine])),
    [project.machines]
  ) as Record<string, MachineDefinition>;

  const signalsByLayer = useMemo(
    () =>
      ({
        raw: project.signals.filter((signal) => signal.layer === "raw"),
        conditioned: project.signals.filter((signal) => signal.layer === "conditioned"),
        semantic: project.signals.filter((signal) => signal.layer === "semantic")
      }) satisfies Record<SignalDefinition["layer"], SignalDefinition[]>,
    [project.signals]
  );

  const blocksByType = useMemo(() => {
    const groups = new Map<string, LogicBlockDefinition[]>();

    for (const block of project.blocks) {
      const bucket = groups.get(block.type) ?? [];
      bucket.push(block);
      groups.set(block.type, bucket);
    }

    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [project.blocks]);

  const linksByKind = useMemo(() => {
    const groups = new Map<keyof typeof linkKindPresentation, typeof project.compositionLinks>();

    for (const link of project.compositionLinks) {
      const bucket = groups.get(link.kind) ?? [];
      bucket.push(link);
      groups.set(link.kind, bucket);
    }

    return (Object.keys(linkKindPresentation) as Array<keyof typeof linkKindPresentation>)
      .map((kind) => [kind, groups.get(kind) ?? []] as const)
      .filter(([, links]) => links.length > 0);
  }, [project.compositionLinks]);

  const signalsByLayerAndScope = useMemo(() => {
    return (Object.keys(signalLayerPresentation) as Array<keyof typeof signalLayerPresentation>).map((layer) => {
      const scopeMap = new Map<string, SignalDefinition[]>();
      for (const signal of signalsByLayer[layer]) {
        const scope = getSignalScope(signal);
        const bucket = scopeMap.get(scope) ?? [];
        bucket.push(signal);
        scopeMap.set(scope, bucket);
      }

      return [
        layer,
        Array.from(scopeMap.entries()).sort(([left], [right]) => left.localeCompare(right))
      ] as const;
    });
  }, [signalsByLayer]);

  const bindingsByScope = useMemo(() => {
    const signalById = new Map(project.signals.map((signal) => [signal.id, signal]));
    const scopeMap = new Map<string, typeof project.bindings>();

    for (const binding of project.bindings) {
      const signal = signalById.get(binding.signalId);
      const scope = signal ? getSignalScope(signal) : "general";
      const bucket = scopeMap.get(scope) ?? [];
      bucket.push(binding);
      scopeMap.set(scope, bucket);
    }

    return Array.from(scopeMap.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [project.bindings, project.signals]);

  return (
    <aside className="studio-panel studio-panel--left">
      <section className="panel-card tree-panel">
        <div className="tree-panel__header">
          <h3>Project Tree</h3>
          <span>{project.name}</span>
        </div>

        <div className="tree-root">
          <TreeBranch
            label={project.name}
            meta="Project"
            icon="PRJ"
            open={tree.isOpen("project-root")}
            onToggle={() => tree.toggle("project-root")}
          >
            <TreeBranch
              label="System Objects"
              meta={String(project.objects.length)}
              icon="SYS"
              open={tree.isOpen("system-objects")}
              onToggle={() => tree.toggle("system-objects")}
            >
              {project.objects.map((object) => {
              const objectKey = `object:${object.id}`;
              const objectOpen = tree.isOpen(objectKey) || selectedObjectId === object.id;
              const objectMachine = object.behavior?.machineId ? machinesById[object.behavior.machineId] ?? null : null;
              const selectedObjectBranch =
                (selectedItemType === "object" && selectedItemId === object.id) ||
                (selectedItemType === "subobject" && selectedObjectId === object.id) ||
                (selectedItemType === "machine" && objectMachine?.id === selectedItemId) ||
                (selectedItemType === "state" && objectMachine?.states.some((state) => state.id === selectedItemId)) ||
                (selectedItemType === "transition" &&
                  objectMachine?.transitions.some((transition) => transition.id === selectedItemId));

              return (
                <TreeBranch
                  key={object.id}
                  label={object.name}
                  meta={`${object.type} / ${object.behaviorKind}`}
                  icon={getObjectIcon(object)}
                  open={objectOpen}
                  selected={selectedObjectBranch}
                  onToggle={() => tree.toggle(objectKey)}
                  onSelect={() => {
                    setActiveWorkspace("machine");
                    setMachineViewMode("topology");
                    selectItem("object", object.id, {
                      objectId: object.id,
                      machineId: objectMachine?.id ?? null
                    });
                  }}
                >
                  <TreeBranch
                    label="Contract"
                    meta={String(
                      object.commands.length +
                        object.inputs.length +
                        object.outputs.length +
                        object.status.length +
                        object.permissions.length +
                        object.alarms.length
                    )}
                    icon="INT"
                    open={tree.isOpen(`object:${object.id}:contract`) || objectOpen}
                    onToggle={() => tree.toggle(`object:${object.id}:contract`)}
                  >
                    {renderPortFamilies(object, objectOpen, tree)}
                  </TreeBranch>

                  {object.structure?.nodes.length ? (
                    <TreeBranch
                      label="Internal Parts"
                      meta={String(object.structure.nodes.length)}
                      icon="NDS"
                      open={tree.isOpen(`object:${object.id}:internal`) || objectOpen}
                      onToggle={() => tree.toggle(`object:${object.id}:internal`)}
                    >
                      {object.structure.nodes.map((node) => (
                        <TreeLeaf
                          key={node.id}
                          label={node.title}
                          meta={node.kind}
                          icon="◇"
                          selected={selectedItemType === "subobject" && selectedItemId === node.id}
                          onClick={() => {
                            setActiveWorkspace("machine");
                            setMachineViewMode("object");
                            setObjectViewLens("structure");
                            selectItem("subobject", node.id, {
                              objectId: object.id,
                              machineId: objectMachine?.id ?? null
                            });
                          }}
                        />
                      ))}
                    </TreeBranch>
                  ) : null}

                  {object.structure?.routes.length ? (
                    <TreeBranch
                      label="Internal Links"
                      meta={String(object.structure.routes.length)}
                      icon="LNK"
                      open={tree.isOpen(`object:${object.id}:links`) || objectOpen}
                      onToggle={() => tree.toggle(`object:${object.id}:links`)}
                    >
                      {object.structure.routes.map((route) => (
                        <TreeLeaf key={route.id} label={route.label} meta={route.id} icon="┄" />
                      ))}
                    </TreeBranch>
                  ) : null}

                  {objectMachine ? (
                    <TreeBranch
                      label="Behavior"
                      meta={`${objectMachine.states.length} states`}
                      icon="BEH"
                      open={tree.isOpen(`object:${object.id}:behavior`) || objectOpen}
                      onToggle={() => tree.toggle(`object:${object.id}:behavior`)}
                    >
                      <TreeLeaf
                        label={objectMachine.name}
                        meta="sequence"
                        icon="↻"
                        selected={selectedItemType === "machine" && selectedItemId === objectMachine.id}
                        onClick={() => {
                          setActiveWorkspace("machine");
                          setMachineViewMode("object");
                          setObjectViewLens("behavior");
                          selectItem("machine", objectMachine.id, {
                            objectId: object.id,
                            machineId: objectMachine.id
                          });
                        }}
                      />

                      <TreeBranch
                        label="Sections"
                        meta={String(objectMachine.sections.length)}
                        icon="SCT"
                        open={tree.isOpen(`object:${object.id}:sections`) || objectOpen}
                        onToggle={() => tree.toggle(`object:${object.id}:sections`)}
                      >
                      {objectMachine.sections.map((section) => {
                        const sectionKey = `object:${object.id}:section:${section.id}`;
                        const sectionOpen = tree.isOpen(sectionKey) || selectedItemId === section.id;
                        const states = objectMachine.states.filter((state) => state.sectionId === section.id);
                        const regions = objectMachine.regions?.filter((region) => section.regionIds?.includes(region.id)) ?? [];
                        const transitions = objectMachine.transitions.filter((transition) => transition.sectionId === section.id);

                        return (
                          <TreeBranch
                            key={section.id}
                            label={section.name}
                            meta={`${states.length} states`}
                            icon="SEC"
                            open={sectionOpen}
                            selected={selectedItemType === "section" && selectedItemId === section.id}
                            onToggle={() => tree.toggle(sectionKey)}
                            onSelect={() => {
                              setActiveWorkspace("machine");
                              setMachineViewMode("object");
                              setObjectViewLens("behavior");
                              selectItem("section", section.id, {
                                objectId: object.id,
                                machineId: objectMachine.id,
                                sectionId: section.id
                              });
                            }}
                          >
                            {regions.length ? (
                              <TreeBranch
                                label="Regions"
                                meta={String(regions.length)}
                                icon="RGN"
                                open={tree.isOpen(`${sectionKey}:regions`) || sectionOpen}
                                onToggle={() => tree.toggle(`${sectionKey}:regions`)}
                              >
                                {regions.map((region) => (
                                  <TreeLeaf
                                    key={region.id}
                                    label={region.name}
                                    meta={region.type}
                                    icon="◫"
                                    selected={selectedItemType === "region" && selectedItemId === region.id}
                                    onClick={() => {
                                      setActiveWorkspace("machine");
                                      setMachineViewMode("object");
                                      setObjectViewLens("behavior");
                                      selectItem("region", region.id, {
                                        objectId: object.id,
                                        machineId: objectMachine.id,
                                        sectionId: section.id,
                                        regionId: region.id
                                      });
                                    }}
                                  />
                                ))}
                              </TreeBranch>
                            ) : null}

                            <TreeBranch
                              label="States"
                              meta={String(states.length)}
                              icon="STS"
                              open={tree.isOpen(`${sectionKey}:states`) || sectionOpen}
                              onToggle={() => tree.toggle(`${sectionKey}:states`)}
                            >
                            {states.map((state) => (
                              <TreeLeaf
                                key={state.id}
                                label={state.name}
                                meta={state.kind}
                                icon="•"
                                selected={selectedItemType === "state" && selectedItemId === state.id}
                                onClick={() => {
                                  setActiveWorkspace("machine");
                                  setMachineViewMode("object");
                                  setObjectViewLens("behavior");
                                  selectItem("state", state.id, {
                                    objectId: object.id,
                                    machineId: objectMachine.id,
                                    sectionId: state.sectionId,
                                    regionId: state.regionId
                                  });
                                }}
                              />
                            ))}
                            </TreeBranch>

                            {transitions.length ? (
                              <TreeBranch
                                label="Transitions"
                                meta={String(transitions.length)}
                                icon="TRX"
                                open={tree.isOpen(`${sectionKey}:transitions`) || sectionOpen}
                                onToggle={() => tree.toggle(`${sectionKey}:transitions`)}
                              >
                                {transitions.map((transition) => (
                                  <TreeLeaf
                                    key={transition.id}
                                    label={transition.event || `${transition.source} -> ${transition.target}`}
                                    meta={transition.guard || transition.action || transition.id}
                                    icon="→"
                                    selected={selectedItemType === "transition" && selectedItemId === transition.id}
                                    onClick={() => {
                                      setActiveWorkspace("machine");
                                      setMachineViewMode("object");
                                      setObjectViewLens("behavior");
                                      selectItem("transition", transition.id, {
                                        objectId: object.id,
                                        machineId: objectMachine.id,
                                        sectionId: transition.sectionId ?? null
                                      });
                                    }}
                                  />
                                ))}
                              </TreeBranch>
                            ) : null}
                          </TreeBranch>
                        );
                      })}
                      </TreeBranch>
                    </TreeBranch>
                  ) : (
                    <TreeBranch
                      label="Behavior"
                      meta={object.behaviorKind}
                      icon="BEH"
                      open={tree.isOpen(`object:${object.id}:behavior`) || objectOpen}
                      onToggle={() => tree.toggle(`object:${object.id}:behavior`)}
                    >
                      <TreeLeaf
                        label="Open internal view"
                        meta={object.behaviorKind}
                        icon="↻"
                        selected={selectedItemType === "object" && selectedItemId === object.id && activeWorkspace === "machine"}
                        onClick={() => {
                          setActiveWorkspace("machine");
                          setMachineViewMode("object");
                          setObjectViewLens(object.structure ? "structure" : "behavior");
                          selectItem("object", object.id, {
                            objectId: object.id,
                            machineId: null
                          });
                        }}
                      />
                    </TreeBranch>
                  )}
                </TreeBranch>
              );
            })}
            </TreeBranch>

            <TreeBranch
              label="System Links"
              meta={String(project.compositionLinks.length)}
              icon="LKS"
              open={tree.isOpen("system-links")}
              onToggle={() => tree.toggle("system-links")}
            >
              {linksByKind.map(([kind, links]) => (
                <TreeBranch
                  key={kind}
                  label={linkKindPresentation[kind].label}
                  meta={String(links.length)}
                  icon={linkKindPresentation[kind].icon}
                  open={tree.isOpen(`system-links:${kind}`)}
                  onToggle={() => tree.toggle(`system-links:${kind}`)}
                >
                  {links.map((link) => (
                    <TreeLeaf
                      key={link.id}
                      label={link.label}
                      meta={`${link.sourceObjectId} -> ${link.targetObjectId}`}
                      icon="⇄"
                      selected={selectedItemType === "object-link" && selectedItemId === link.id}
                      onClick={() => {
                        setActiveWorkspace("machine");
                        setMachineViewMode("topology");
                        selectItem("object-link", link.id, {
                          objectId: link.sourceObjectId
                        });
                      }}
                    />
                  ))}
                </TreeBranch>
              ))}
            </TreeBranch>

            <TreeBranch
              label="Signals"
              meta={String(project.signals.length)}
              icon="SIG"
              open={tree.isOpen("signals")}
              onToggle={() => tree.toggle("signals")}
            >
              {signalsByLayerAndScope.map(([layer, scopes]) => (
                <TreeBranch
                  key={layer}
                  label={signalLayerPresentation[layer].label}
                  meta={String(signalsByLayer[layer].length)}
                  icon={signalLayerPresentation[layer].icon}
                  open={tree.isOpen(`signals:${layer}`)}
                  onToggle={() => tree.toggle(`signals:${layer}`)}
                >
                  {scopes.map(([scope, signals]) => (
                    <TreeBranch
                      key={`${layer}:${scope}`}
                      label={getScopeLabel(scope)}
                      meta={String(signals.length)}
                      icon={signalLayerPresentation[layer].icon}
                      open={tree.isOpen(`signals:${layer}:${scope}`)}
                      onToggle={() => tree.toggle(`signals:${layer}:${scope}`)}
                    >
                      {signals.map((signal) => (
                        <TreeLeaf
                          key={signal.id}
                          label={signal.name}
                          meta={signal.type}
                          icon={signalLayerPresentation[layer].icon}
                          selected={selectedItemType === "signal" && selectedItemId === signal.id}
                          onClick={() => {
                            setActiveWorkspace("logic");
                            selectItem("signal", signal.id);
                          }}
                        />
                      ))}
                    </TreeBranch>
                  ))}
                </TreeBranch>
              ))}
            </TreeBranch>

            <TreeBranch
              label="Blocks"
              meta={String(project.blocks.length)}
              icon="BLK"
              open={tree.isOpen("blocks")}
              onToggle={() => tree.toggle("blocks")}
            >
              {blocksByType.map(([type, blocks]) => {
                const branchKey = `blocks:${type}`;

                return (
                  <TreeBranch
                    key={type}
                    label={type}
                    meta={String(blocks.length)}
                    icon={getBlockIcon(blocks[0])}
                    open={tree.isOpen(branchKey)}
                    onToggle={() => tree.toggle(branchKey)}
                  >
                    {blocks.map((block) => (
                      <TreeLeaf
                        key={block.id}
                        label={block.name}
                        meta={`${block.inputs.length} in / ${block.outputs.length} out`}
                        icon={getBlockIcon(block)}
                        selected={selectedItemType === "block" && selectedItemId === block.id}
                        onClick={() => {
                          setActiveWorkspace("logic");
                          selectItem("block", block.id);
                        }}
                      />
                    ))}
                  </TreeBranch>
                );
              })}
            </TreeBranch>

            <TreeBranch
              label="Bindings"
              meta={String(project.bindings.length)}
              icon="I/O"
              open={tree.isOpen("bindings")}
              onToggle={() => tree.toggle("bindings")}
            >
              {bindingsByScope.map(([scope, bindings]) => (
                <TreeBranch
                  key={scope}
                  label={getScopeLabel(scope)}
                  meta={String(bindings.length)}
                  icon="I/O"
                  open={tree.isOpen(`bindings:${scope}`)}
                  onToggle={() => tree.toggle(`bindings:${scope}`)}
                >
                  {bindings.map((binding) => (
                    <TreeLeaf
                      key={binding.id}
                      label={binding.physicalSource}
                      meta={binding.signalId}
                      icon={binding.type === "analog" ? "AI" : "DI"}
                      selected={selectedItemType === "binding" && selectedItemId === binding.id}
                      onClick={() => {
                        setActiveWorkspace("bind");
                        selectItem("binding", binding.id);
                      }}
                    />
                  ))}
                </TreeBranch>
              ))}
            </TreeBranch>
          </TreeBranch>
        </div>
      </section>
    </aside>
  );
}
