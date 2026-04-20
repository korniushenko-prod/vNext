import type {
  IoBindingDefinition,
  LogicBlockDefinition,
  MachineDefinition,
  MachineRegionDefinition,
  MachineSceneGroupDefinition,
  MachineSectionDefinition,
  MachineStateDefinition,
  MachineTransitionDefinition,
  SignalDefinition
} from "../model/demoProject";
import type { SelectedItemType } from "../store/studioStore";
import { useStudioStore } from "../store/studioStore";

type SelectItemFn = (
  type: SelectedItemType,
  id: string | null,
  options?: { machineId?: string | null; groupId?: string | null; sectionId?: string | null; regionId?: string | null }
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
  signalIds?: string[];
  blockIds?: string[];
  bindingIds?: string[];
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void;
  selectItem: SelectItemFn;
}) {
  const { signalIds = [], blockIds = [], bindingIds = [], setActiveWorkspace, selectItem } = options;
  return (
    <div className="inspector-actions">
      {signalIds[0] ? (
        <button
          type="button"
          className="inspector-link"
          onClick={() => {
            setActiveWorkspace("logic");
            selectItem("signal", signalIds[0]);
          }}
        >
          Open related signal
        </button>
      ) : null}
      {blockIds[0] ? (
        <button
          type="button"
          className="inspector-link"
          onClick={() => {
            setActiveWorkspace("logic");
            selectItem("block", blockIds[0]);
          }}
        >
          Open related block
        </button>
      ) : null}
      {bindingIds[0] ? (
        <button
          type="button"
          className="inspector-link"
          onClick={() => {
            setActiveWorkspace("bind");
            selectItem("binding", bindingIds[0]);
          }}
        >
          Open related binding
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

function renderGroupInspector(
  group: MachineSceneGroupDefinition,
  machine: MachineDefinition,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
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
        signalIds: group.relatedSignalIds,
        blockIds: group.relatedBlockIds,
        bindingIds: group.relatedBindingIds,
        setActiveWorkspace,
        selectItem
      })}
    </>
  );
}

function renderSectionInspector(
  section: MachineSectionDefinition,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
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
        signalIds: section.relatedSignalIds,
        blockIds: section.relatedBlockIds,
        bindingIds: section.relatedBindingIds,
        setActiveWorkspace,
        selectItem
      })}
    </>
  );
}

function renderRegionInspector(
  region: MachineRegionDefinition,
  machine: MachineDefinition,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
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
        signalIds: region.relatedSignalIds,
        blockIds: region.relatedBlockIds,
        bindingIds: region.relatedBindingIds,
        setActiveWorkspace,
        selectItem
      })}
    </>
  );
}

function renderStateInspector(
  state: MachineStateDefinition,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
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
        signalIds: state.relatedSignalIds,
        blockIds: state.relatedBlockIds,
        bindingIds: state.relatedBindingIds,
        setActiveWorkspace,
        selectItem
      })}
    </>
  );
}

function renderTransitionInspector(
  transition: MachineTransitionDefinition,
  setActiveWorkspace: (workspace: "bind" | "logic" | "machine" | "observe") => void,
  selectItem: SelectItemFn
) {
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
        signalIds: transition.relatedSignalIds,
        blockIds: transition.relatedBlockIds,
        bindingIds: transition.relatedBindingIds,
        setActiveWorkspace,
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
  const selectedMachineId = useStudioStore((state) => state.selectedMachineId);
  const setActiveWorkspace = useStudioStore((state) => state.setActiveWorkspace);
  const selectItem = useStudioStore((state) => state.selectItem);

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

  return (
    <aside className="studio-panel studio-panel--right">
      <section className="panel-card">
        <h2>Inspector</h2>
        {selectedItemType === "machine"
          ? renderMachineInspector(machine)
          : selectedGroup
          ? renderGroupInspector(selectedGroup, machine, setActiveWorkspace, selectItem)
          : selectedSection
          ? renderSectionInspector(selectedSection, setActiveWorkspace, selectItem)
          : selectedRegion
          ? renderRegionInspector(selectedRegion, machine, setActiveWorkspace, selectItem)
          : selectedState
          ? renderStateInspector(selectedState, setActiveWorkspace, selectItem)
          : selectedTransition
          ? renderTransitionInspector(selectedTransition, setActiveWorkspace, selectItem)
          : selectedSignal
          ? renderSignalInspector(selectedSignal)
          : selectedBlock
          ? renderBlockInspector(selectedBlock)
          : selectedBinding
          ? renderBindingInspector(selectedBinding)
          : (
            <div className="empty-state">
              <strong>Nothing selected</strong>
              <p>Select a state, transition, signal, block or binding to inspect it here.</p>
            </div>
          )}
      </section>
    </aside>
  );
}
