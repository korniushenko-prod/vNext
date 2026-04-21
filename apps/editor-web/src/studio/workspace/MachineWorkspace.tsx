import { MachineCanvas } from "../machine/MachineCanvas";
import { ObjectControlCanvas } from "../machine/ObjectControlCanvas";
import { ObjectTopologyCanvas } from "../machine/ObjectTopologyCanvas";
import { ObjectStructureCanvas } from "../machine/ObjectStructureCanvas";
import { useStudioStore } from "../store/studioStore";

export function MachineWorkspace() {
  const project = useStudioStore((state) => state.project);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedGroupId = useStudioStore((state) => state.selectedGroupId);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedSectionId = useStudioStore((state) => state.selectedSectionId);
  const selectedRegionId = useStudioStore((state) => state.selectedRegionId);
  const machineViewMode = useStudioStore((state) => state.machineViewMode);
  const objectViewLens = useStudioStore((state) => state.objectViewLens);
  const machineFilterMode = useStudioStore((state) => state.machineFilterMode);
  const setMachineViewMode = useStudioStore((state) => state.setMachineViewMode);
  const setObjectViewLens = useStudioStore((state) => state.setObjectViewLens);
  const setMachineFilterMode = useStudioStore((state) => state.setMachineFilterMode);
  const selectItem = useStudioStore((state) => state.selectItem);

  const selectedObject = project.objects.find((item) => item.id === selectedObjectId) ?? project.objects[0];
  const behaviorMachine = selectedObject.behavior?.machineId
    ? project.machines.find((item) => item.id === selectedObject.behavior?.machineId) ?? null
    : null;
  const machine = behaviorMachine;
  const supportsBehaviorLens = Boolean(machine || selectedObject.behaviorKind !== "sequence");
  const resolvedObjectViewLens =
    objectViewLens === "behavior" && !supportsBehaviorLens && selectedObject.structure ? "structure" : objectViewLens;

  const selectedState = machine && selectedItemType === "state" ? machine.states.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedTransition =
    machine && selectedItemType === "transition" ? machine.transitions.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedGroup =
    machine?.sceneGroups?.find((item) => item.id === (selectedItemType === "group" ? selectedItemId : selectedGroupId)) ?? null;
  const selectedSection =
    machine?.sections.find(
      (item) =>
        item.id ===
        (selectedItemType === "section"
          ? selectedItemId
          : selectedState?.sectionId ?? selectedTransition?.sectionId ?? selectedSectionId)
    ) ?? null;
  const selectedRegion =
    machine?.regions?.find(
      (item) =>
        item.id ===
        (selectedItemType === "region"
          ? selectedItemId
          : selectedState?.regionId ??
            machine.states.find((state) => state.id === selectedTransition?.source)?.regionId ??
            selectedRegionId)
    ) ?? null;

  const topologyBreadcrumbs = [
    {
      label: "System",
      onClick: () => setMachineViewMode("topology")
    },
    {
      label: selectedObject.name,
      onClick: () => selectItem("object", selectedObject.id, { objectId: selectedObject.id, machineId: machine?.id ?? null })
    }
  ];

  const behaviorBreadcrumbs =
    machineViewMode === "object" && machine
      ? [
          {
            label: "System",
            onClick: () => setMachineViewMode("topology")
          },
          {
            label: selectedObject.name,
            onClick: () =>
              selectItem("object", selectedObject.id, {
                objectId: selectedObject.id,
                machineId: machine.id
              })
          },
          {
            label: machine.name,
            onClick: () =>
              selectItem("machine", machine.id, {
                objectId: selectedObject.id,
                machineId: machine.id
              })
          },
          selectedSection
            ? {
                label: selectedSection.name,
                onClick: () =>
                  selectItem("section", selectedSection.id, {
                    objectId: selectedObject.id,
                    machineId: machine.id,
                    sectionId: selectedSection.id
                  })
              }
            : null,
          selectedRegion
            ? {
                label: selectedRegion.name,
                onClick: () =>
                  selectItem("region", selectedRegion.id, {
                    objectId: selectedObject.id,
                    machineId: machine.id,
                    regionId: selectedRegion.id
                  })
              }
            : null,
          selectedState
            ? {
                label: selectedState.name,
                onClick: () =>
                  selectItem("state", selectedState.id, {
                    objectId: selectedObject.id,
                    machineId: machine.id,
                    groupId: selectedGroup?.id ?? null,
                    sectionId: selectedState.sectionId,
                    regionId: selectedState.regionId
                  })
              }
            : selectedTransition
            ? {
                label: selectedTransition.event || selectedTransition.id,
                onClick: () =>
                  selectItem("transition", selectedTransition.id, {
                    objectId: selectedObject.id,
                    machineId: machine.id,
                    groupId: selectedGroup?.id ?? null,
                    sectionId: selectedTransition.sectionId,
                    regionId: selectedRegion?.id ?? null
                  })
              }
            : null
        ].filter(Boolean) as Array<{ label: string; onClick: () => void }>
      : topologyBreadcrumbs;

  const behaviorSummary =
    machine && machine.behaviorSummary
      ? {
          primary: machine.behaviorSummary.primaryStateIds
            .map((stateId) => machine.states.find((state) => state.id === stateId)?.name)
            .filter(Boolean)
            .join(" -> "),
          fault: machine.behaviorSummary.faultStateIds
            .map((stateId) => machine.states.find((state) => state.id === stateId)?.name)
            .filter(Boolean)
            .join(" -> "),
          recovery: machine.behaviorSummary.recoveryTransitionIds
            .map((transitionId) => machine.transitions.find((transition) => transition.id === transitionId))
            .filter(Boolean)
            .map((transition) => transition?.event || `${transition?.source} -> ${transition?.target}`)
            .filter(Boolean)
            .join(" -> ")
        }
      : null;

  return (
    <div className="workspace workspace-machine">
      <div className="workspace-header">
        <div>
          <h2>Machine</h2>
          <p className="muted-copy">
            {machineViewMode === "topology"
              ? "System view shows only large engineering objects and their public contracts. Internal logic stays one level deeper."
              : "Object view shows the inside of one object: its behavior, structure and local evaluation context."}
          </p>
        </div>
      </div>

      <div className="machine-toolbar">
        <div className="machine-breadcrumbs" aria-label="Machine breadcrumbs">
          {behaviorBreadcrumbs.map((crumb, index) => (
            <button key={`${crumb.label}-${index}`} type="button" className="machine-breadcrumb" onClick={crumb.onClick}>
              {crumb.label}
            </button>
          ))}
        </div>

        <div className="machine-filter-switcher" aria-label="Machine view mode">
          {[
            { id: "topology", label: "System" },
            { id: "object", label: "Object" }
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={machineViewMode === mode.id ? "is-active" : ""}
              onClick={() => setMachineViewMode(mode.id as "topology" | "object")}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {machineViewMode === "topology" ? (
        <>
          <div className="behavior-summary-grid">
            <div className="summary-card behavior-card">
              <span>Canvas Role</span>
              <strong>System Objects</strong>
              <p>Main screen shows only large objects, their contract ports and their cross-object relationships.</p>
            </div>
            <div className="summary-card behavior-card">
              <span>Objects</span>
              <strong>{project.objects.length}</strong>
              <p>Burner, fuel, water, pressure and protection stay readable as separate engineering units.</p>
            </div>
            <div className="summary-card behavior-card">
              <span>Links</span>
              <strong>{project.compositionLinks.length}</strong>
              <p>Every cross-object link is command, permission, status or fault. No internal leaks.</p>
            </div>
            <div className="summary-card behavior-card">
              <span>Selected Object</span>
              <strong>{selectedObject.name}</strong>
              <p>{selectedObject.behavior?.summary ?? selectedObject.structure?.summary ?? "This object does not yet expose an internal view."}</p>
            </div>
          </div>

          <div className="machine-workspace-grid machine-workspace-grid--topology">
            <section className="panel-card machine-browser">
              <h3>System Objects</h3>
              <ul className="plain-list">
                {project.objects.map((object) => (
                  <li
                    key={object.id}
                    className={object.id === selectedObject.id ? "is-focused" : ""}
                    onClick={() =>
                      selectItem("object", object.id, {
                        objectId: object.id,
                        machineId: object.behavior?.machineId ?? null
                      })
                    }
                  >
                    <strong>{object.name}</strong>
                    <span>
                      {object.type} / {object.behaviorKind}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="machine-browser__meta">
                <div className="summary-card compact-card">
                  <span>Commands</span>
                  <strong>{selectedObject.commands.length}</strong>
                </div>
                <div className="summary-card compact-card">
                  <span>Inputs</span>
                  <strong>{selectedObject.inputs.length}</strong>
                </div>
                <div className="summary-card compact-card">
                  <span>Outputs</span>
                  <strong>{selectedObject.outputs.length}</strong>
                </div>
              </div>

              <div className="panel-card machine-browser__section">
                <h3>External Contract</h3>
                <ul className="plain-list">
                  {[
                    ...selectedObject.commands.map((port) => `Command/${port.name}`),
                    ...selectedObject.inputs.map((port) => `Input/${port.name}`),
                    ...selectedObject.outputs.map((port) => `Output/${port.name}`),
                    ...selectedObject.status.map((port) => `Status/${port.name}`),
                    ...selectedObject.permissions.map((port) => `Permission/${port.name}`),
                    ...selectedObject.alarms.map((port) => `Alarm/${port.name}`)
                  ].map((item) => (
                    <li key={item}>
                      <strong>{item.split("/")[1]}</strong>
                      <span>{item.split("/")[0]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <ObjectTopologyCanvas />
          </div>
        </>
      ) : (
        <>
          {resolvedObjectViewLens === "behavior" && behaviorSummary ? (
              <div className="behavior-summary-grid">
                <div className="summary-card behavior-card">
                  <span>Object Lens</span>
                  <strong>{resolvedObjectViewLens === "behavior" ? "Behavior" : "Structure"}</strong>
                <p>
                    {resolvedObjectViewLens === "behavior"
                      ? `Canvas shows only internal behavior of ${selectedObject.name}, not whole-system wiring.`
                      : `Canvas shows ports, internal units and local routes inside ${selectedObject.name}.`}
                </p>
              </div>
              {machine ? (
                <>
                  <div className="summary-card behavior-card">
                    <span>Normal Path</span>
                    <strong>{behaviorSummary.primary}</strong>
                  </div>
                  <div className="summary-card behavior-card">
                    <span>Fault Path</span>
                    <strong>{behaviorSummary.fault}</strong>
                  </div>
                  <div className="summary-card behavior-card">
                    <span>Recovery</span>
                    <strong>{behaviorSummary.recovery}</strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="summary-card behavior-card">
                    <span>Mode / Status</span>
                    <strong>{selectedObject.status.map((port) => port.name).join(", ") || "No status ports"}</strong>
                  </div>
                  <div className="summary-card behavior-card">
                    <span>Permissions</span>
                    <strong>{selectedObject.permissions.map((port) => port.name).join(", ") || "No permissives"}</strong>
                  </div>
                  <div className="summary-card behavior-card">
                    <span>Outputs</span>
                    <strong>{selectedObject.outputs.map((port) => port.name).join(", ") || "No outputs"}</strong>
                  </div>
                </>
              )}
            </div>
          ) : resolvedObjectViewLens === "structure" && selectedObject.structure ? (
            <div className="behavior-summary-grid">
              <div className="summary-card behavior-card">
                <span>Object Lens</span>
                <strong>Structure</strong>
                <p>Canvas shows interface boundary, internal units and local routes inside {selectedObject.name}.</p>
              </div>
              <div className="summary-card behavior-card">
                <span>Internal Units</span>
                <strong>{selectedObject.structure.nodes.length}</strong>
              </div>
              <div className="summary-card behavior-card">
                <span>Local Routes</span>
                <strong>{selectedObject.structure.routes.length}</strong>
              </div>
              <div className="summary-card behavior-card">
                <span>Boundary Ports</span>
                <strong>
                  {selectedObject.commands.length +
                    selectedObject.inputs.length +
                    selectedObject.outputs.length +
                    selectedObject.status.length +
                    selectedObject.permissions.length +
                    selectedObject.alarms.length}
                </strong>
              </div>
            </div>
          ) : null}

          <div className="machine-workspace-grid">
            <section className="panel-card machine-browser">
              <h3>{selectedObject.name} Contract</h3>
              <ul className="plain-list">
                {selectedObject.commands.map((port) => (
                  <li key={port.id}>
                    <strong>{port.name}</strong>
                    <span>Command</span>
                  </li>
                ))}
                {selectedObject.inputs.map((port) => (
                  <li key={port.id}>
                    <strong>{port.name}</strong>
                    <span>Input</span>
                  </li>
                ))}
                {selectedObject.outputs.map((port) => (
                  <li key={port.id}>
                    <strong>{port.name}</strong>
                    <span>Output</span>
                  </li>
                ))}
              </ul>

              <div className="machine-browser__meta">
                <div className="summary-card compact-card">
                  <span>{resolvedObjectViewLens === "behavior" ? (machine ? "Behavior" : "Behavior") : "Nodes"}</span>
                  <strong>{resolvedObjectViewLens === "behavior" ? machine?.name || `${selectedObject.behaviorKind} view` : selectedObject.structure?.nodes.length || 0}</strong>
                </div>
                <div className="summary-card compact-card">
                  <span>{resolvedObjectViewLens === "behavior" ? (machine ? "States" : "Permissions") : "Routes"}</span>
                  <strong>{resolvedObjectViewLens === "behavior" ? (machine?.states.length || selectedObject.permissions.length) : selectedObject.structure?.routes.length || 0}</strong>
                </div>
                <div className="summary-card compact-card">
                  <span>{resolvedObjectViewLens === "behavior" ? (machine ? "Transitions" : "Alarms") : "Ports"}</span>
                  <strong>
                    {resolvedObjectViewLens === "behavior"
                      ? machine?.transitions.length || selectedObject.alarms.length
                      : selectedObject.commands.length +
                        selectedObject.inputs.length +
                        selectedObject.outputs.length +
                        selectedObject.status.length +
                        selectedObject.permissions.length +
                        selectedObject.alarms.length}
                  </strong>
                </div>
              </div>

              <div className="panel-card machine-browser__section">
                <h3>{resolvedObjectViewLens === "behavior" ? "Internal Parts" : "Internal Units"}</h3>
                <ul className="plain-list">
                  {resolvedObjectViewLens === "behavior"
                    ? machine
                      ? machine.sections.map((section) => (
                          <li
                            key={section.id}
                            className={section.id === selectedSectionId ? "is-focused" : ""}
                            onClick={() =>
                              selectItem("section", section.id, {
                                objectId: selectedObject.id,
                                machineId: machine.id,
                                sectionId: section.id
                              })
                            }
                          >
                            <strong>{section.name}</strong>
                            <span>{section.summary}</span>
                          </li>
                        ))
                      : selectedObject.structure?.nodes.map((node) => (
                          <li
                            key={node.id}
                            className={selectedItemType === "subobject" && selectedItemId === node.id ? "is-focused" : ""}
                            onClick={() =>
                              selectItem("subobject", node.id, {
                                objectId: selectedObject.id,
                                machineId: selectedObject.behavior?.machineId ?? null
                              })
                            }
                          >
                          <strong>{node.title}</strong>
                          <span>{node.kind}</span>
                        </li>
                      ))
                    : selectedObject.structure?.nodes.map((node) => (
                        <li
                          key={node.id}
                          className={selectedItemType === "subobject" && selectedItemId === node.id ? "is-focused" : ""}
                          onClick={() =>
                            selectItem("subobject", node.id, {
                              objectId: selectedObject.id,
                              machineId: selectedObject.behavior?.machineId ?? null
                            })
                          }
                        >
                          <strong>{node.title}</strong>
                          <span>{node.summary}</span>
                        </li>
                      ))}
                </ul>
              </div>

              {resolvedObjectViewLens === "behavior" ? (
                <div className="panel-card machine-region-card">
                  <h3>{machine ? "Behavior Regions" : "Control Focus"}</h3>
                  <ul className="plain-list">
                    {machine
                      ? (machine.regions || []).map((region) => (
                          <li
                            key={region.id}
                            className={region.id === selectedRegionId ? "is-focused" : ""}
                            onClick={() =>
                              selectItem("region", region.id, {
                                objectId: selectedObject.id,
                                machineId: machine?.id ?? null,
                                regionId: region.id
                              })
                            }
                          >
                            <strong>{region.name}</strong>
                            <span>{region.summary}</span>
                          </li>
                        ))
                      : [
                          <li key="mode">
                            <strong>Mode</strong>
                            <span>{selectedObject.status.map((port) => port.name).join(", ") || "No status ports"}</span>
                          </li>,
                          <li key="perm">
                            <strong>Permissives</strong>
                            <span>{selectedObject.permissions.map((port) => port.name).join(", ") || "No permissives"}</span>
                          </li>,
                          <li key="faults">
                            <strong>Faults</strong>
                            <span>{selectedObject.alarms.map((port) => port.name).join(", ") || "No alarm ports"}</span>
                          </li>
                        ]}
                  </ul>
                </div>
              ) : (
                <div className="panel-card machine-region-card">
                  <h3>Boundary Summary</h3>
                  <ul className="plain-list">
                    <li>
                      <strong>Incoming</strong>
                      <span>{selectedObject.commands.length + selectedObject.inputs.length + selectedObject.permissions.length} ports</span>
                    </li>
                    <li>
                      <strong>Outgoing</strong>
                      <span>{selectedObject.outputs.length + selectedObject.status.length + selectedObject.alarms.length} ports</span>
                    </li>
                  </ul>
                </div>
              )}

              <div className="panel-card machine-region-card">
                <h3>Object Lens</h3>
                <div className="machine-filter-switcher" aria-label="Object view lens">
                  {[
                    { id: "behavior", label: "Behavior", disabled: !supportsBehaviorLens },
                    { id: "structure", label: "Structure", disabled: !selectedObject.structure }
                  ].map((lens) => (
                    <button
                      key={lens.id}
                      type="button"
                      disabled={lens.disabled}
                      className={resolvedObjectViewLens === lens.id ? "is-active" : ""}
                      onClick={() => setObjectViewLens(lens.id as "behavior" | "structure")}
                    >
                      {lens.label}
                    </button>
                  ))}
                </div>
              </div>

              {resolvedObjectViewLens === "behavior" && machine ? (
                <div className="panel-card machine-region-card">
                  <h3>View Filter</h3>
                  <div className="machine-filter-switcher" aria-label="Machine filter mode">
                    {[
                      { id: "all", label: "All" },
                      { id: "focus", label: "Focus" },
                      { id: "region", label: "Region" }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        className={machineFilterMode === mode.id ? "is-active" : ""}
                        onClick={() => setMachineFilterMode(mode.id as "all" | "focus" | "region")}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {resolvedObjectViewLens === "structure" && selectedObject.structure ? (
              <ObjectStructureCanvas />
            ) : machine ? (
              <MachineCanvas />
            ) : resolvedObjectViewLens === "behavior" && supportsBehaviorLens ? (
              <ObjectControlCanvas />
            ) : (
              <section className="panel-card">
                <h3>No behavior view</h3>
                <p className="muted-copy">Selected object does not yet expose a machine behavior definition.</p>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
