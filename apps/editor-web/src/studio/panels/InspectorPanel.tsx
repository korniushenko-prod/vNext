import type {
  IoBindingDefinition,
  LogicBlockDefinition,
  MachineStateDefinition,
  MachineTransitionDefinition,
  SignalDefinition
} from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";

function SectionRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function renderStateInspector(state: MachineStateDefinition) {
  return (
    <>
      <h3>{state.name}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value={state.name} />
        <SectionRow label="Kind" value={state.kind} />
        <SectionRow label="Entry actions" value={state.entryActions?.join(", ") || ""} />
        <SectionRow label="Exit actions" value={state.exitActions?.join(", ") || ""} />
        <SectionRow label="Timeout" value={state.timeoutMs ? `${state.timeoutMs} ms` : ""} />
        <SectionRow label="Diagnostics" value="Placeholder" />
      </dl>
    </>
  );
}

function renderTransitionInspector(transition: MachineTransitionDefinition) {
  return (
    <>
      <h3>{transition.id}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Transition" />
        <SectionRow label="Source" value={transition.source} />
        <SectionRow label="Target" value={transition.target} />
        <SectionRow label="Event" value={transition.event || ""} />
        <SectionRow label="Guard" value={transition.guard || ""} />
        <SectionRow label="Delay" value={transition.delayMs ? `${transition.delayMs} ms` : ""} />
        <SectionRow label="Action" value={transition.action || ""} />
      </dl>
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

  const machine = project.machines[0];
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
        {selectedState
          ? renderStateInspector(selectedState)
          : selectedTransition
          ? renderTransitionInspector(selectedTransition)
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
