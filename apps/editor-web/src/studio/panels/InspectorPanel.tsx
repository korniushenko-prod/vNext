import type {
  IoBindingDefinition,
  LogicBlockDefinition,
  MachineDefinition,
  ObjectCompositionLinkDefinition,
  MachineRegionDefinition,
  MachineSceneGroupDefinition,
  MachineSectionDefinition,
  MachineStateDefinition,
  MachineTransitionDefinition,
  ObjectStructureNodeDefinition,
  PlcObjectDefinition,
  SignalDefinition
} from "../model/demoProject";
import type { LogicWorkspaceContext, SelectItemOptions, SelectedItemType } from "../store/studioStore";
import { useStudioStore } from "../store/studioStore";

type SelectItemFn = (
  type: SelectedItemType,
  id: string | null,
  options?: SelectItemOptions
) => void;

function SectionRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function renderReferenceActions(options: {
  sourceLabel: string;
  signalIds?: string[];
  blockIds?: string[];
  bindingIds?: string[];
  focusMachine?: () => void;
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void;
  focusLogicContext: (context: LogicWorkspaceContext | null) => void;
  focusBindContext: (context: { title: string; bindingIds: string[] } | null) => void;
  selectItem: SelectItemFn;
}) {
  const {
    sourceLabel,
    signalIds = [],
    blockIds = [],
    bindingIds = [],
    focusMachine,
    setActiveWorkspace,
    focusLogicContext,
    focusBindContext,
    selectItem
  } = options;
  return (
    <div className="inspector-actions">
      {focusMachine ? (
        <button type="button" className="inspector-link" onClick={focusMachine}>
          Focus on canvas
        </button>
      ) : null}
      {signalIds[0] || blockIds[0] ? (
        <button
          type="button"
          className="inspector-link"
          onClick={() => {
            setActiveWorkspace("logic");
            focusLogicContext({
              title: `${sourceLabel} -> related signals and blocks`,
              signalIds,
              blockIds
            });
            selectItem(signalIds[0] ? "signal" : "block", signalIds[0] ?? blockIds[0] ?? null);
          }}
        >
          Open Logic Context
        </button>
      ) : null}
      {bindingIds[0] ? (
        <button
          type="button"
          className="inspector-link"
          onClick={() => {
            setActiveWorkspace("bind");
            focusBindContext({
              title: `${sourceLabel} -> related bindings`,
              bindingIds
            });
            selectItem("binding", bindingIds[0]);
          }}
        >
          Open Bind Context
        </button>
      ) : null}
    </div>
  );
}

function renderMachineInspector(machine: MachineDefinition) {
  return (
    <>
      <h3>{machine.name}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Machine" />
        <SectionRow label="States" value={String(machine.states.length)} />
        <SectionRow label="Transitions" value={String(machine.transitions.length)} />
        <SectionRow label="Scene groups" value={String(machine.sceneGroups?.length || 0)} />
        <SectionRow label="Sections" value={String(machine.sections.length)} />
        <SectionRow label="Regions" value={String(machine.regions?.length || 0)} />
      </dl>
    </>
  );
}

function renderObjectInspector(
  object: PlcObjectDefinition,
  setMachineViewMode: (mode: "topology" | "object") => void,
  selectItem: SelectItemFn
) {
  return (
    <>
      <h3>{object.name}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Object" />
        <SectionRow label="Type" value={object.type} />
        <SectionRow label="Behavior" value={object.behaviorKind} />
        <SectionRow label="Commands" value={String(object.commands.length)} />
        <SectionRow label="Inputs" value={String(object.inputs.length)} />
        <SectionRow label="Outputs" value={String(object.outputs.length)} />
        <SectionRow label="Status" value={String(object.status.length)} />
        <SectionRow label="Permissions" value={String(object.permissions.length)} />
        <SectionRow label="Alarms" value={String(object.alarms.length)} />
      </dl>
      <div className="inspector-actions">
        <button
          type="button"
          className="inspector-link"
          onClick={() => {
            setMachineViewMode("topology");
            selectItem("object", object.id, { objectId: object.id, machineId: object.behavior?.machineId ?? null });
          }}
        >
          Focus in topology
        </button>
        {object.behavior?.machineId ? (
          <button
            type="button"
            className="inspector-link"
            onClick={() => {
              setMachineViewMode("object");
              selectItem("machine", object.behavior?.machineId ?? null, {
                objectId: object.id,
                machineId: object.behavior?.machineId ?? null
              });
            }}
          >
            Open behavior view
          </button>
        ) : null}
      </div>
    </>
  );
}

function renderObjectLinkInspector(link: ObjectCompositionLinkDefinition, source: PlcObjectDefinition, target: PlcObjectDefinition) {
  return (
    <>
      <h3>{link.label}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Composition Link" />
        <SectionRow label="Type" value={link.kind} />
        <SectionRow label="Source" value={source.name} />
        <SectionRow label="Target" value={target.name} />
        <SectionRow label="Source Port" value={link.sourcePortId || ""} />
        <SectionRow label="Target Port" value={link.targetPortId || ""} />
        <SectionRow label="Meaning" value={link.summary} />
      </dl>
    </>
  );
}

function renderSubobjectInspector(
  object: PlcObjectDefinition,
  node: ObjectStructureNodeDefinition,
  setMachineViewMode: (mode: "topology" | "object") => void,
  setObjectViewLens: (lens: "behavior" | "structure") => void,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
  focusLogicContext: (context: LogicWorkspaceContext | null) => void,
  focusBindContext: (context: { title: string; bindingIds: string[] } | null) => void,
  selectItem: SelectItemFn
) {
  return (
    <>
      <h3>{node.title}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Internal Node" />
        <SectionRow label="Parent Object" value={object.name} />
        <SectionRow label="Kind" value={node.kind} />
        <SectionRow label="Summary" value={node.summary} />
        <SectionRow label="Inputs" value={node.inputs.map((port) => port.name).join(", ")} />
        <SectionRow label="Outputs" value={node.outputs.map((port) => port.name).join(", ")} />
      </dl>
      <div className="inspector-actions">
        <button
          type="button"
          className="inspector-link"
          onClick={() => {
            setMachineViewMode("object");
            setObjectViewLens("structure");
            selectItem("subobject", node.id, { objectId: object.id, machineId: object.behavior?.machineId ?? null });
          }}
        >
          Focus in structure
        </button>
      </div>
      {renderReferenceActions({
        sourceLabel: `${object.name} / ${node.title}`,
        signalIds: node.relatedSignalIds,
        blockIds: node.relatedBlockIds,
        bindingIds: node.relatedBindingIds,
        setActiveWorkspace,
        focusLogicContext,
        focusBindContext,
        selectItem
      })}
    </>
  );
}

function renderGroupInspector(
  group: MachineSceneGroupDefinition,
  machine: MachineDefinition,
  machineId: string,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
  setMachineFilterMode: (mode: "all" | "focus" | "region") => void,
  focusLogicContext: (context: LogicWorkspaceContext | null) => void,
  focusBindContext: (context: { title: string; bindingIds: string[] } | null) => void,
  selectItem: SelectItemFn
) {
  const states = machine.states.filter((state) => group.stateIds.includes(state.id)).map((state) => state.name);
  return (
    <>
      <h3>{group.name}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Scene Group" />
        <SectionRow label="Summary" value={group.summary} />
        <SectionRow label="States" value={states.join(", ")} />
        <SectionRow label="Sections" value={group.sectionIds?.join(", ") || ""} />
        <SectionRow label="Regions" value={group.regionIds?.join(", ") || ""} />
        <SectionRow label="Color" value={group.color} />
      </dl>
      {renderReferenceActions({
        sourceLabel: group.name,
        signalIds: group.relatedSignalIds,
        blockIds: group.relatedBlockIds,
        bindingIds: group.relatedBindingIds,
        focusMachine: () => {
          setActiveWorkspace("machine");
          setMachineFilterMode("focus");
          selectItem("group", group.id, { machineId, groupId: group.id });
        },
        setActiveWorkspace,
        focusLogicContext,
        focusBindContext,
        selectItem
      })}
    </>
  );
}

function renderSectionInspector(
  section: MachineSectionDefinition,
  machineId: string,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
  setMachineFilterMode: (mode: "all" | "focus" | "region") => void,
  focusLogicContext: (context: LogicWorkspaceContext | null) => void,
  focusBindContext: (context: { title: string; bindingIds: string[] } | null) => void,
  selectItem: SelectItemFn
) {
  return (
    <>
      <h3>{section.name}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Section" />
        <SectionRow label="Summary" value={section.summary} />
        <SectionRow label="Regions" value={section.regionIds?.join(", ") || ""} />
        <SectionRow label="Color" value={section.color} />
      </dl>
      {renderReferenceActions({
        sourceLabel: section.name,
        signalIds: section.relatedSignalIds,
        blockIds: section.relatedBlockIds,
        bindingIds: section.relatedBindingIds,
        focusMachine: () => {
          setActiveWorkspace("machine");
          setMachineFilterMode("focus");
          selectItem("section", section.id, { machineId, sectionId: section.id });
        },
        setActiveWorkspace,
        focusLogicContext,
        focusBindContext,
        selectItem
      })}
    </>
  );
}

function renderRegionInspector(
  region: MachineRegionDefinition,
  machine: MachineDefinition,
  machineId: string,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
  setMachineFilterMode: (mode: "all" | "focus" | "region") => void,
  focusLogicContext: (context: LogicWorkspaceContext | null) => void,
  focusBindContext: (context: { title: string; bindingIds: string[] } | null) => void,
  selectItem: SelectItemFn
) {
  const states = machine.states.filter((state) => region.stateIds.includes(state.id)).map((state) => state.name);
  return (
    <>
      <h3>{region.name}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Region" />
        <SectionRow label="Type" value={region.type} />
        <SectionRow label="Purpose" value={region.summary} />
        <SectionRow label="States" value={states.join(", ")} />
        <SectionRow label="Color" value={region.color} />
      </dl>
      {renderReferenceActions({
        sourceLabel: region.name,
        signalIds: region.relatedSignalIds,
        blockIds: region.relatedBlockIds,
        bindingIds: region.relatedBindingIds,
        focusMachine: () => {
          setActiveWorkspace("machine");
          setMachineFilterMode("region");
          selectItem("region", region.id, { machineId, regionId: region.id });
        },
        setActiveWorkspace,
        focusLogicContext,
        focusBindContext,
        selectItem
      })}
    </>
  );
}

function renderStateInspector(
  state: MachineStateDefinition,
  machineId: string,
  groupId: string | null,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
  setMachineFilterMode: (mode: "all" | "focus" | "region") => void,
  focusLogicContext: (context: LogicWorkspaceContext | null) => void,
  focusBindContext: (context: { title: string; bindingIds: string[] } | null) => void,
  selectItem: SelectItemFn
) {
  return (
    <>
      <h3>{state.name}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value={state.name} />
        <SectionRow label="Kind" value={state.kind} />
        <SectionRow label="Section" value={state.sectionId} />
        <SectionRow label="Region" value={state.regionId || ""} />
        <SectionRow label="Entry actions" value={state.entryActions?.join(", ") || ""} />
        <SectionRow label="Exit actions" value={state.exitActions?.join(", ") || ""} />
        <SectionRow label="Timeout" value={state.timeoutMs ? `${state.timeoutMs} ms` : ""} />
        <SectionRow label="Diagnostics" value="Placeholder" />
      </dl>
      {renderReferenceActions({
        sourceLabel: state.name,
        signalIds: state.relatedSignalIds,
        blockIds: state.relatedBlockIds,
        bindingIds: state.relatedBindingIds,
        focusMachine: () => {
          setActiveWorkspace("machine");
          setMachineFilterMode("focus");
          selectItem("state", state.id, {
            machineId,
            groupId,
            sectionId: state.sectionId,
            regionId: state.regionId
          });
        },
        setActiveWorkspace,
        focusLogicContext,
        focusBindContext,
        selectItem
      })}
    </>
  );
}

function renderTransitionInspector(
  transition: MachineTransitionDefinition,
  machine: MachineDefinition,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
  setMachineFilterMode: (mode: "all" | "focus" | "region") => void,
  focusLogicContext: (context: LogicWorkspaceContext | null) => void,
  focusBindContext: (context: { title: string; bindingIds: string[] } | null) => void,
  selectItem: SelectItemFn
) {
  const sourceState = machine.states.find((state) => state.id === transition.source) ?? null;
  const relatedGroup =
    sourceState ? machine.sceneGroups?.find((group) => group.stateIds.includes(sourceState.id)) ?? null : null;
  return (
    <>
      <h3>{transition.id}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Transition" />
        <SectionRow label="Source" value={transition.source} />
        <SectionRow label="Target" value={transition.target} />
        <SectionRow label="Section" value={transition.sectionId || ""} />
        <SectionRow label="Event" value={transition.event || ""} />
        <SectionRow label="Guard" value={transition.guard || ""} />
        <SectionRow label="Delay" value={transition.delayMs ? `${transition.delayMs} ms` : ""} />
        <SectionRow label="Action" value={transition.action || ""} />
      </dl>
      {renderReferenceActions({
        sourceLabel: transition.id,
        signalIds: transition.relatedSignalIds,
        blockIds: transition.relatedBlockIds,
        bindingIds: transition.relatedBindingIds,
        focusMachine: () => {
          setActiveWorkspace("machine");
          setMachineFilterMode("focus");
          selectItem("transition", transition.id, {
            machineId: machine.id,
            groupId: relatedGroup?.id ?? null,
            sectionId: transition.sectionId,
            regionId: sourceState?.regionId ?? null
          });
        },
        setActiveWorkspace,
        focusLogicContext,
        focusBindContext,
        selectItem
      })}
    </>
  );
}

function renderBindingInspector(binding: IoBindingDefinition) {
  return (
    <>
      <h3>{binding.id}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Binding" />
        <SectionRow label="Logical signal" value={binding.signalId} />
        <SectionRow label="Physical channel" value={binding.physicalSource} />
        <SectionRow label="Direction" value={binding.direction} />
        <SectionRow label="Type" value={binding.type} />
        <SectionRow label="Debounce" value={binding.debounceMs ? `${binding.debounceMs} ms` : ""} />
        <SectionRow label="Inversion" value={binding.inverted ? "true" : "false"} />
        <SectionRow label="Scaling" value={binding.scale ? String(binding.scale) : ""} />
        <SectionRow label="Fail-safe value" value={binding.failSafeValue !== undefined ? String(binding.failSafeValue) : ""} />
      </dl>
    </>
  );
}

function renderSignalInspector(signal: SignalDefinition) {
  return (
    <>
      <h3>{signal.name}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Signal" />
        <SectionRow label="Name" value={signal.name} />
        <SectionRow label="Type" value={signal.type} />
        <SectionRow label="Direction" value={signal.direction} />
        <SectionRow label="Value" value={signal.value !== undefined ? String(signal.value) : ""} />
      </dl>
    </>
  );
}

function renderBlockInspector(block: LogicBlockDefinition) {
  return (
    <>
      <h3>{block.name}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Block" />
        <SectionRow label="Name" value={block.name} />
        <SectionRow label="Type" value={block.type} />
        <SectionRow label="Inputs" value={block.inputs.join(", ")} />
        <SectionRow label="Outputs" value={block.outputs.join(", ")} />
        <SectionRow label="Parameters" value={block.parameters ? JSON.stringify(block.parameters) : ""} />
      </dl>
    </>
  );
}

export function InspectorPanel() {
  const project = useStudioStore((state) => state.project);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedMachineId = useStudioStore((state) => state.selectedMachineId);
  const setActiveWorkspace = useStudioStore((state) => state.setActiveWorkspace);
  const setMachineViewMode = useStudioStore((state) => state.setMachineViewMode);
  const setObjectViewLens = useStudioStore((state) => state.setObjectViewLens);
  const setMachineFilterMode = useStudioStore((state) => state.setMachineFilterMode);
  const focusLogicContext = useStudioStore((state) => state.focusLogicContext);
  const focusBindContext = useStudioStore((state) => state.focusBindContext);
  const selectItem = useStudioStore((state) => state.selectItem);

  const selectedObject = selectedItemType === "object" ? project.objects.find((item) => item.id === selectedItemId) ?? null : null;
  const currentObject = project.objects.find((item) => item.id === (selectedObject?.id || selectedObjectId || project.objects[0]?.id)) ?? project.objects[0];
  const selectedObjectLink =
    selectedItemType === "object-link" ? project.compositionLinks.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedSubobject =
    selectedItemType === "subobject" ? currentObject?.structure?.nodes.find((item) => item.id === selectedItemId) ?? null : null;
  const machine = project.machines.find((item) => item.id === selectedMachineId) ?? project.machines[0];
  const selectedGroup =
    selectedItemType === "group" ? machine.sceneGroups?.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedSection =
    selectedItemType === "section" ? machine.sections.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedRegion =
    selectedItemType === "region" ? machine.regions?.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedState = selectedItemType === "state" ? machine.states.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedTransition =
    selectedItemType === "transition" ? machine.transitions.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedSignal =
    selectedItemType === "signal" ? project.signals.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedBlock =
    selectedItemType === "block" ? project.blocks.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedBinding =
    selectedItemType === "binding" ? project.bindings.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedStateGroup =
    selectedState ? machine.sceneGroups?.find((group) => group.stateIds.includes(selectedState.id)) ?? null : null;
  const selectedLinkSource =
    selectedObjectLink ? project.objects.find((item) => item.id === selectedObjectLink.sourceObjectId) ?? null : null;
  const selectedLinkTarget =
    selectedObjectLink ? project.objects.find((item) => item.id === selectedObjectLink.targetObjectId) ?? null : null;

  return (
    <aside className="studio-panel studio-panel--right">
      <section className="panel-card">
        <h2>Inspector</h2>
        {selectedObject
          ? renderObjectInspector(selectedObject, setMachineViewMode, selectItem)
          : selectedObjectLink && selectedLinkSource && selectedLinkTarget
          ? renderObjectLinkInspector(selectedObjectLink, selectedLinkSource, selectedLinkTarget)
          : selectedSubobject && currentObject
          ? renderSubobjectInspector(
              currentObject,
              selectedSubobject,
              setMachineViewMode,
              setObjectViewLens,
              setActiveWorkspace,
              focusLogicContext,
              focusBindContext,
              selectItem
            )
          : selectedItemType === "machine"
          ? renderMachineInspector(machine)
          : selectedGroup
          ? renderGroupInspector(
              selectedGroup,
              machine,
              machine.id,
              setActiveWorkspace,
              setMachineFilterMode,
              focusLogicContext,
              focusBindContext,
              selectItem
            )
          : selectedSection
          ? renderSectionInspector(
              selectedSection,
              machine.id,
              setActiveWorkspace,
              setMachineFilterMode,
              focusLogicContext,
              focusBindContext,
              selectItem
            )
          : selectedRegion
          ? renderRegionInspector(
              selectedRegion,
              machine,
              machine.id,
              setActiveWorkspace,
              setMachineFilterMode,
              focusLogicContext,
              focusBindContext,
              selectItem
            )
          : selectedState
          ? renderStateInspector(
              selectedState,
              machine.id,
              selectedStateGroup?.id ?? null,
              setActiveWorkspace,
              setMachineFilterMode,
              focusLogicContext,
              focusBindContext,
              selectItem
            )
          : selectedTransition
          ? renderTransitionInspector(
              selectedTransition,
              machine,
              setActiveWorkspace,
              setMachineFilterMode,
              focusLogicContext,
              focusBindContext,
              selectItem
            )
          : selectedSignal
          ? renderSignalInspector(selectedSignal)
          : selectedBlock
          ? renderBlockInspector(selectedBlock)
          : selectedBinding
          ? renderBindingInspector(selectedBinding)
          : (
            <div className="empty-state">
              <strong>Nothing selected</strong>
              <p>Select an object, link, state, transition, signal, block or binding to inspect it here.</p>
            </div>
          )}
      </section>
    </aside>
  );
}
