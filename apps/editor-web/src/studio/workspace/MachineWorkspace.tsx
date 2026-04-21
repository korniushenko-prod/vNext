import { MachineCanvas } from "../machine/MachineCanvas";
import { ObjectControlCanvas } from "../machine/ObjectControlCanvas";
import { ObjectTopologyCanvas } from "../machine/ObjectTopologyCanvas";
import { ObjectStructureCanvas } from "../machine/ObjectStructureCanvas";
import { useStudioStore } from "../store/studioStore";

export function MachineWorkspace() {
  const project = useStudioStore((state) => state.project);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
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
  const machine = selectedObject.behavior?.machineId
    ? project.machines.find((item) => item.id === selectedObject.behavior?.machineId) ?? null
    : null;
  const supportsBehaviorLens = Boolean(machine || selectedObject.behaviorKind !== "sequence");
  const resolvedObjectViewLens =
    objectViewLens === "behavior" && !supportsBehaviorLens && selectedObject.structure ? "structure" : objectViewLens;

  const selectedSection =
    machine?.sections.find((item) => item.id === (selectedItemType === "section" ? selectedItemId : selectedSectionId)) ?? null;
  const selectedRegion =
    machine?.regions?.find((item) => item.id === (selectedItemType === "region" ? selectedItemId : selectedRegionId)) ?? null;
  const selectedState =
    machine?.states.find((item) => item.id === (selectedItemType === "state" ? selectedItemId : "")) ?? null;

  const breadcrumbs =
    machineViewMode === "topology"
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
                machineId: machine?.id ?? null
              })
          }
        ]
      : [
          {
            label: "System",
            onClick: () => setMachineViewMode("topology")
          },
          {
            label: selectedObject.name,
            onClick: () =>
              selectItem("object", selectedObject.id, {
                objectId: selectedObject.id,
                machineId: machine?.id ?? null
              })
          },
          selectedSection
            ? {
                label: selectedSection.name,
                onClick: () =>
                  selectItem("section", selectedSection.id, {
                    objectId: selectedObject.id,
                    machineId: machine?.id ?? null,
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
                    machineId: machine?.id ?? null,
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
                    machineId: machine?.id ?? null,
                    sectionId: selectedState.sectionId,
                    regionId: selectedState.regionId
                  })
              }
            : null
        ].filter(Boolean) as Array<{ label: string; onClick: () => void }>;

  const stageTitle =
    machineViewMode === "topology"
      ? "System Objects View"
      : resolvedObjectViewLens === "structure"
        ? `${selectedObject.name} / Structure`
        : machine
          ? `${selectedObject.name} / Behavior`
          : `${selectedObject.name} / ${selectedObject.behaviorKind}`;

  const stageSummary =
    machineViewMode === "topology"
      ? "Only large objects and contract-level links belong here."
      : resolvedObjectViewLens === "structure"
        ? "Boundary ports, internal nodes and local routes stay inside the object."
        : machine
          ? "Sequence stays inside the object boundary and does not leak into the system layer."
          : "Control and monitoring logic stay inside the object boundary with their own local meaning.";

  return (
    <div className="workspace workspace-machine">
      <div className="workspace-header">
        <div>
          <h2>Machine</h2>
          <p className="muted-copy">Tree on the left, canvas in the center, properties on the right.</p>
        </div>
      </div>

      <div className="machine-toolbar machine-toolbar--compact">
        <div className="machine-breadcrumbs" aria-label="Machine breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <button key={`${crumb.label}-${index}`} type="button" className="machine-breadcrumb" onClick={crumb.onClick}>
              {crumb.label}
            </button>
          ))}
        </div>

        <div className="machine-toolbar__controls">
          <div className="machine-filter-switcher" aria-label="System or object view">
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

          {machineViewMode === "object" ? (
            <div className="machine-filter-switcher" aria-label="Object lens">
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
          ) : null}

          {machineViewMode === "object" && resolvedObjectViewLens === "behavior" && machine ? (
            <div className="machine-filter-switcher" aria-label="Behavior filter">
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
          ) : null}
        </div>
      </div>

      <div className="workspace-context workspace-context--compact">
        <div>
          <strong>{stageTitle}</strong>
          <p>{stageSummary}</p>
        </div>
      </div>

      <div className="machine-stage">
        {machineViewMode === "topology" ? (
          <ObjectTopologyCanvas />
        ) : resolvedObjectViewLens === "structure" && selectedObject.structure ? (
          <ObjectStructureCanvas />
        ) : machine ? (
          <MachineCanvas />
        ) : resolvedObjectViewLens === "behavior" && supportsBehaviorLens ? (
          <ObjectControlCanvas />
        ) : (
          <section className="panel-card">
            <h3>No object view</h3>
            <p className="muted-copy">Selected object does not yet expose the requested internal view.</p>
          </section>
        )}
      </div>
    </div>
  );
}
