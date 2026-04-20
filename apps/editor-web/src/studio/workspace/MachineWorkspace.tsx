import { MachineCanvas } from "../machine/MachineCanvas";
import { ObjectTopologyCanvas } from "../machine/ObjectTopologyCanvas";
import { useStudioStore } from "../store/studioStore";

export function MachineWorkspace() {
  const project = useStudioStore((state) => state.project);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedGroupId = useStudioStore((state) => state.selectedGroupId);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedSectionId = useStudioStore((state) => state.selectedSectionId);
  const selectedRegionId = useStudioStore((state) => state.selectedRegionId);
  const selectedMachineId = useStudioStore((state) => state.selectedMachineId);
  const machineViewMode = useStudioStore((state) => state.machineViewMode);
  const machineFilterMode = useStudioStore((state) => state.machineFilterMode);
  const setMachineViewMode = useStudioStore((state) => state.setMachineViewMode);
  const setMachineFilterMode = useStudioStore((state) => state.setMachineFilterMode);
  const selectItem = useStudioStore((state) => state.selectItem);

  const selectedObject = project.objects.find((item) => item.id === selectedObjectId) ?? project.objects[0];
  const behaviorMachine = selectedObject.behavior?.machineId
    ? project.machines.find((item) => item.id === selectedObject.behavior?.machineId) ?? null
    : null;
  const machine =
    behaviorMachine ??
    project.machines.find((item) => item.id === selectedMachineId) ??
    project.machines[0] ??
    null;

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
      label: "Topology",
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
            label: "Topology",
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
              ? "Top level shows objects and only their public contracts. Internal behavior lives one level deeper."
              : "Object behavior view shows only how the selected object behaves inside its own boundary."}
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
            { id: "topology", label: "Topology" },
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
              <strong>Object Topology</strong>
              <p>Main screen shows objects and their external contracts, not internal implementation details.</p>
            </div>
            <div className="summary-card behavior-card">
              <span>Objects</span>
              <strong>{project.objects.length}</strong>
              <p>Burner, fuel, monitoring and protection stay readable as separate engineering units.</p>
            </div>
            <div className="summary-card behavior-card">
              <span>Links</span>
              <strong>{project.compositionLinks.length}</strong>
              <p>Every cross-object link is command, permission, status or fault only.</p>
            </div>
            <div className="summary-card behavior-card">
              <span>Selected Object</span>
              <strong>{selectedObject.name}</strong>
              <p>{selectedObject.behavior?.summary ?? "This object does not yet expose an internal behavior view."}</p>
            </div>
          </div>

          <div className="machine-workspace-grid machine-workspace-grid--topology">
            <section className="panel-card machine-browser">
              <h3>Objects</h3>
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
                <h3>Public Contract</h3>
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
      ) : machine ? (
        <>
          {behaviorSummary ? (
            <div className="behavior-summary-grid">
              <div className="summary-card behavior-card">
                <span>Behavior Lens</span>
                <strong>{machine.behaviorKind === "sequence" ? "Sequence" : machine.behaviorKind}</strong>
                <p>Canvas shows only internal behavior of {selectedObject.name}, not whole-project wiring.</p>
              </div>
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
            </div>
          ) : null}

          <div className="machine-workspace-grid">
            <section className="panel-card machine-browser">
              <h3>{selectedObject.name} Interface</h3>
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
                  <span>Machine</span>
                  <strong>{machine.name}</strong>
                </div>
                <div className="summary-card compact-card">
                  <span>States</span>
                  <strong>{machine.states.length}</strong>
                </div>
                <div className="summary-card compact-card">
                  <span>Transitions</span>
                  <strong>{machine.transitions.length}</strong>
                </div>
              </div>

              <div className="panel-card machine-browser__section">
                <h3>Internal Structure</h3>
                <ul className="plain-list">
                  {machine.sections.map((section) => (
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
                  ))}
                </ul>
              </div>

              <div className="panel-card machine-region-card">
                <h3>Behavior Regions</h3>
                <ul className="plain-list">
                  {(machine.regions || []).map((region) => (
                    <li
                      key={region.id}
                      className={region.id === selectedRegionId ? "is-focused" : ""}
                      onClick={() =>
                        selectItem("region", region.id, {
                          objectId: selectedObject.id,
                          machineId: machine.id,
                          regionId: region.id
                        })
                      }
                    >
                      <strong>{region.name}</strong>
                      <span>{region.summary}</span>
                    </li>
                  ))}
                </ul>
              </div>

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
            </section>

            <MachineCanvas />
          </div>
        </>
      ) : (
        <section className="panel-card">
          <h3>No behavior view</h3>
          <p className="muted-copy">Selected object does not yet expose a machine behavior definition.</p>
        </section>
      )}
    </div>
  );
}
