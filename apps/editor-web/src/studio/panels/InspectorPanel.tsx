import type {
  BehaviorKind,
  DataType,
  IoBindingDefinition,
  LogicBlockDefinition,
  MachineDefinition,
  ObjectCompositionLinkDefinition,
  ObjectContractFamily,
  MachineRegionDefinition,
  MachineSceneGroupDefinition,
  MachineSectionDefinition,
  MachineStateDefinition,
  MachineTransitionDefinition,
  ObjectStructureNodeDefinition,
  PlcObjectDefinition,
  SignalDefinition,
  UniversalPlcDemoProject
} from "../model/demoProject";
import { buildSignalTrace, getSignalById } from "../model/signalTrace";
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

function InspectorField({
  label,
  name,
  defaultValue,
  placeholder
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="inspector-form__field">
      <span>{label}</span>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} />
    </label>
  );
}

function InspectorSelect({
  label,
  name,
  defaultValue,
  options
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="inspector-form__field">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const behaviorKindOptions: Array<{ value: BehaviorKind; label: string }> = [
  { value: "sequence", label: "Sequence" },
  { value: "control", label: "Control" },
  { value: "monitoring", label: "Monitoring" }
];

const dataTypeOptions: Array<{ value: DataType; label: string }> = [
  { value: "bool", label: "Bool" },
  { value: "number", label: "Number" },
  { value: "string", label: "String" },
  { value: "enum", label: "Enum" }
];

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

function renderProjectInspector(options: {
  project: UniversalPlcDemoProject;
  updateProjectMeta: (input: { name: string; id?: string }) => void;
  addObject: (input: { name: string; type?: string; behaviorKind: BehaviorKind; summary?: string }) => void;
}) {
  const { project, updateProjectMeta, addObject } = options;
  const quickCreate = (preset: { name: string; type: string; behaviorKind: BehaviorKind; summary: string }) => {
    addObject(preset);
  };

  return (
    <>
      <h3>{project.name}</h3>
      <details className="inspector-disclosure" open>
        <summary>
          <span>Project Metadata</span>
          <strong>{project.id}</strong>
        </summary>
        <form
          className="inspector-form inspector-form--compact"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            updateProjectMeta({
              name: String(formData.get("name") ?? ""),
              id: String(formData.get("id") ?? "")
            });
          }}
        >
          <div className="inspector-form__grid">
            <InspectorField label="Name" name="name" defaultValue={project.name} placeholder="Untitled Project" />
            <InspectorField label="Id" name="id" defaultValue={project.id} placeholder="untitled_project" />
          </div>
          <button type="submit" className="inspector-link">
            Save Project
          </button>
        </form>
      </details>

      <details className="inspector-disclosure" open>
        <summary>
          <span>Quick Start</span>
          <strong>{project.objects.length} objects</strong>
        </summary>
        <div className="inspector-form inspector-form--compact">
          <div className="inspector-actions">
            <button
              type="button"
              className="inspector-link"
              onClick={() =>
                quickCreate({
                  name: "FuelGroup",
                  type: "FuelGroup",
                  behaviorKind: "control",
                  summary: "Three-pump fuel group with AUTO, MANUAL RUN, OFF, pressure supervision and standby rotation."
                })
              }
            >
              Add FuelGroup
            </button>
            <button
              type="button"
              className="inspector-link"
              onClick={() =>
                quickCreate({
                  name: "BoilerOledPanel",
                  type: "OperatorHmiPanel",
                  behaviorKind: "control",
                  summary: "OLED panel with Up, Down, OK and Back for status, reset and parameter entry."
                })
              }
            >
              Add OLED Panel
            </button>
            <button
              type="button"
              className="inspector-link"
              onClick={() =>
                quickCreate({
                  name: "BoilerProtection",
                  type: "BoilerProtection",
                  behaviorKind: "monitoring",
                  summary: "Trip and permissive layer that collects unsafe conditions and reset paths."
                })
              }
            >
              Add Protection
            </button>
          </div>
        </div>
      </details>

      <details className="inspector-disclosure">
        <summary>
          <span>Add Object</span>
          <strong>Custom</strong>
        </summary>
        <form
          className="inspector-form inspector-form--compact"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            addObject({
              name: String(formData.get("name") ?? ""),
              type: String(formData.get("type") ?? ""),
              behaviorKind: String(formData.get("behaviorKind") ?? "control") as BehaviorKind,
              summary: String(formData.get("summary") ?? "")
            });
            event.currentTarget.reset();
          }}
        >
          <div className="inspector-form__grid">
            <InspectorField label="Name" name="name" placeholder="FuelGroup" />
            <InspectorField label="Type" name="type" placeholder="FuelGroup" />
            <InspectorSelect label="Behavior Kind" name="behaviorKind" defaultValue="control" options={behaviorKindOptions} />
            <InspectorField label="Summary" name="summary" placeholder="What this object owns and exports." />
          </div>
          <button type="submit" className="inspector-link">
            Create Object
          </button>
        </form>
      </details>
    </>
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
  setObjectViewLens: (lens: "behavior" | "structure") => void,
  selectItem: SelectItemFn,
  openFullObjectEditor: (objectId: string) => void,
  updateObjectMeta: (
    objectId: string,
    input: { name: string; type: string; behaviorKind: BehaviorKind; summary: string }
  ) => void,
  addObjectPort: (
    objectId: string,
    family: ObjectContractFamily,
    input: { name: string; dataType: DataType; summary?: string }
  ) => void,
  updateObjectPort: (
    objectId: string,
    family: ObjectContractFamily,
    portId: string,
    input: { name: string; dataType: DataType; summary?: string }
  ) => void,
  deleteObjectPort: (objectId: string, family: ObjectContractFamily, portId: string) => void
) {
  const canOpenBehavior = Boolean(object.behavior?.machineId);
  const canOpenStructure = true;
  const defaultObjectLens = canOpenBehavior ? "behavior" : "structure";
  const contractFamilies: Array<{ key: ObjectContractFamily; label: string; ports: typeof object.commands }> = [
    { key: "commands", label: "Commands", ports: object.commands },
    { key: "inputs", label: "Inputs", ports: object.inputs },
    { key: "outputs", label: "Outputs", ports: object.outputs },
    { key: "status", label: "Status", ports: object.status },
    { key: "permissions", label: "Permissions", ports: object.permissions },
    { key: "faults", label: "Faults", ports: object.faults }
  ];

  return (
    <>
      <h3>{object.name}</h3>
      <details className="inspector-disclosure" open>
        <summary>
          <span>Object Metadata</span>
          <strong>{object.type}</strong>
        </summary>
        <form
          key={`metadata-${object.id}`}
          className="inspector-form inspector-form--compact"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            updateObjectMeta(object.id, {
              name: String(formData.get("name") ?? object.name),
              type: String(formData.get("type") ?? object.type),
              behaviorKind: String(formData.get("behaviorKind") ?? object.behaviorKind) as BehaviorKind,
              summary: String(formData.get("summary") ?? object.summary)
            });
          }}
        >
          <div className="inspector-form__grid">
            <InspectorField label="Name" name="name" defaultValue={object.name} />
            <InspectorField label="Type" name="type" defaultValue={object.type} />
            <InspectorSelect
              label="Behavior Kind"
              name="behaviorKind"
              defaultValue={object.behaviorKind}
              options={behaviorKindOptions}
            />
            <InspectorField label="Summary" name="summary" defaultValue={object.summary} />
          </div>
          <button type="submit" className="inspector-link">
            Save Metadata
          </button>
        </form>
      </details>

      <details className="inspector-disclosure" open>
        <summary>
          <span>Contract Ports</span>
          <strong>
            {contractFamilies.reduce((sum, family) => sum + family.ports.length, 0)}
          </strong>
        </summary>
        <div className="inspector-contract-groups">
          {contractFamilies.map((family) => (
            <details key={family.key} className="inspector-disclosure inspector-disclosure--nested">
              <summary>
                <span>{family.label}</span>
                <strong>{family.ports.length}</strong>
              </summary>

              <div className="inspector-port-list">
                {family.ports.length ? (
                  family.ports.map((port) => (
                    <form
                      key={port.id}
                      className="inspector-port-item inspector-port-item--editable"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        updateObjectPort(object.id, family.key, port.id, {
                          name: String(formData.get("portName") ?? port.name),
                          dataType: String(formData.get("dataType") ?? port.dataType) as DataType,
                          summary: String(formData.get("portSummary") ?? port.summary)
                        });
                      }}
                    >
                      <div className="inspector-port-item__grid">
                        <input name="portName" defaultValue={port.name} aria-label={`${port.name} name`} />
                        <select name="dataType" defaultValue={port.dataType} aria-label={`${port.name} type`}>
                          {dataTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          name="portSummary"
                          defaultValue={port.summary}
                          placeholder="What this port means to other objects."
                          aria-label={`${port.name} summary`}
                        />
                      </div>
                      <div className="inspector-port-item__actions">
                        <button type="submit" className="inspector-link">
                          Save
                        </button>
                        <button
                          type="button"
                          className="overlay-port-delete"
                          onClick={() => deleteObjectPort(object.id, family.key, port.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </form>
                  ))
                ) : (
                  <p className="muted-copy">No ports yet.</p>
                )}
              </div>

              <form
                className="inspector-form inspector-form--compact"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  addObjectPort(object.id, family.key, {
                    name: String(formData.get("portName") ?? ""),
                    dataType: String(formData.get("dataType") ?? "bool") as DataType,
                    summary: String(formData.get("portSummary") ?? "")
                  });
                  event.currentTarget.reset();
                }}
              >
                <div className="inspector-form__grid">
                  <InspectorField label="Port Name" name="portName" placeholder="fuelReady" />
                  <InspectorSelect label="Data Type" name="dataType" defaultValue="bool" options={dataTypeOptions} />
                  <InspectorField label="Summary" name="portSummary" placeholder="What this port means to other objects." />
                </div>
                <button type="submit" className="inspector-link">
                  Add {family.label.slice(0, -1)}
                </button>
              </form>
            </details>
          ))}
        </div>
      </details>

      <div className="inspector-actions">
        <button type="button" className="inspector-link" onClick={() => openFullObjectEditor(object.id)}>
          Open Full Editor
        </button>
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
        {canOpenBehavior || canOpenStructure ? (
          <button
            type="button"
            className="inspector-link"
            onClick={() => {
              setObjectViewLens(defaultObjectLens === "behavior" ? "behavior" : "structure");
              setMachineViewMode("object");
              selectItem(canOpenBehavior ? "machine" : "object", object.behavior?.machineId ?? object.id, {
                objectId: object.id,
                machineId: object.behavior?.machineId ?? null
              });
            }}
          >
            Open internal view
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
        <SectionRow label="Parameters" value={node.parameters ? JSON.stringify(node.parameters) : ""} />
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

function renderBindingInspector(binding: IoBindingDefinition, logicalSignal: SignalDefinition | null) {
  return (
    <>
      <h3>{binding.id}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Binding" />
        <SectionRow label="Raw signal" value={binding.signalId} />
        <SectionRow label="Signal layer" value={logicalSignal?.layer || ""} />
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

function renderSignalInspector(signal: SignalDefinition, trace: ReturnType<typeof buildSignalTrace> | null) {
  return (
    <>
      <h3>{signal.name}</h3>
      <dl className="inspector-grid">
        <SectionRow label="Selected" value="Signal" />
        <SectionRow label="Name" value={signal.name} />
        <SectionRow label="Layer" value={signal.layer} />
        <SectionRow label="Summary" value={signal.summary} />
        <SectionRow label="Type" value={signal.type} />
        <SectionRow label="Direction" value={signal.direction} />
        <SectionRow label="Value" value={signal.value !== undefined ? String(signal.value) : ""} />
        <SectionRow label="Derived from" value={trace?.upstream.map((item) => item.id).join(" -> ") || ""} />
        <SectionRow label="Consumed by" value={signal.consumerRefs?.map((item) => `${item.objectId}.${item.portName}`).join(", ") || ""} />
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
  const createBlankProject = useStudioStore((state) => state.createBlankProject);
  const updateProjectMeta = useStudioStore((state) => state.updateProjectMeta);
  const addObject = useStudioStore((state) => state.addObject);
  const updateObjectMeta = useStudioStore((state) => state.updateObjectMeta);
  const addObjectPort = useStudioStore((state) => state.addObjectPort);
  const updateObjectPort = useStudioStore((state) => state.updateObjectPort);
  const deleteObjectPort = useStudioStore((state) => state.deleteObjectPort);
  const openFullObjectEditor = useStudioStore((state) => state.openFullObjectEditor);

  const selectedObject = selectedItemType === "object" ? project.objects.find((item) => item.id === selectedItemId) ?? null : null;
  const currentObject =
    project.objects.find((item) => item.id === (selectedObject?.id || selectedObjectId || project.objects[0]?.id)) ?? null;
  const selectedObjectLink =
    selectedItemType === "object-link" ? project.compositionLinks.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedSubobject =
    selectedItemType === "subobject" ? currentObject?.structure?.nodes.find((item) => item.id === selectedItemId) ?? null : null;
  const machine = project.machines.find((item) => item.id === selectedMachineId) ?? project.machines[0] ?? null;
  const selectedGroup =
    selectedItemType === "group" ? machine?.sceneGroups?.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedSection =
    selectedItemType === "section" ? machine?.sections.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedRegion =
    selectedItemType === "region" ? machine?.regions?.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedState = selectedItemType === "state" ? machine?.states.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedTransition =
    selectedItemType === "transition" ? machine?.transitions.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedSignal =
    selectedItemType === "signal" ? project.signals.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedBlock =
    selectedItemType === "block" ? project.blocks.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedBinding =
    selectedItemType === "binding" ? project.bindings.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedBindingSignal = selectedBinding ? getSignalById(project, selectedBinding.signalId) : null;
  const selectedSignalTrace = selectedSignal ? buildSignalTrace(project, selectedSignal.id) : null;
  const selectedStateGroup =
    selectedState ? machine?.sceneGroups?.find((group) => group.stateIds.includes(selectedState.id)) ?? null : null;
  const selectedLinkSource =
    selectedObjectLink ? project.objects.find((item) => item.id === selectedObjectLink.sourceObjectId) ?? null : null;
  const selectedLinkTarget =
    selectedObjectLink ? project.objects.find((item) => item.id === selectedObjectLink.targetObjectId) ?? null : null;

  return (
    <aside className="studio-panel studio-panel--right inspector-panel">
      <section className="panel-card inspector-panel__card">
        <h2>Inspector</h2>
        {selectedItemType === "project" || project.objects.length === 0
          ? renderProjectInspector({
              project,
              updateProjectMeta,
              addObject
            })
          : selectedObject
          ? (
            <div key={selectedObject.id}>
              {renderObjectInspector(
                selectedObject,
                setMachineViewMode,
                setObjectViewLens,
                selectItem,
                openFullObjectEditor,
                updateObjectMeta,
                addObjectPort,
                updateObjectPort,
                deleteObjectPort
              )}
            </div>
          )
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
          : selectedItemType === "machine" && machine
          ? renderMachineInspector(machine)
          : selectedGroup && machine
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
          : selectedSection && machine
          ? renderSectionInspector(
              selectedSection,
              machine.id,
              setActiveWorkspace,
              setMachineFilterMode,
              focusLogicContext,
              focusBindContext,
              selectItem
            )
          : selectedRegion && machine
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
          : selectedState && machine
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
          : selectedTransition && machine
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
          ? renderSignalInspector(selectedSignal, selectedSignalTrace)
          : selectedBlock
          ? renderBlockInspector(selectedBlock)
          : selectedBinding
          ? renderBindingInspector(selectedBinding, selectedBindingSignal)
          : (
            <div className="empty-state">
              <strong>Nothing selected</strong>
              <p>Start from the project root, create the first object, and the rest of the tree will grow from there.</p>
              <div className="inspector-actions">
                <button type="button" className="inspector-link" onClick={createBlankProject}>
                  Reset to Blank Project
                </button>
                <button type="button" className="inspector-link" onClick={() => selectItem("project", "project-root")}>
                  Select Project Root
                </button>
              </div>
            </div>
          )}
      </section>
    </aside>
  );
}
