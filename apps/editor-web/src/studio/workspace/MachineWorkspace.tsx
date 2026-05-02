import { ObjectSequenceCanvas } from "../machine/ObjectSequenceCanvas";
import { ObjectPortComposer } from "../machine/ObjectPortComposer";
import { ObjectTopologyCanvas } from "../machine/ObjectTopologyCanvas";
import { ObjectStructureCanvas } from "../machine/ObjectStructureCanvas";
import { useStudioStore } from "../store/studioStore";

export function MachineWorkspace() {
  const project = useStudioStore((state) => state.project);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const sequenceScopeNodeId = useStudioStore((state) => state.sequenceScopeNodeId);
  const graphScopeStack = useStudioStore((state) => state.graphScopeStack);
  const selectedSectionId = useStudioStore((state) => state.selectedSectionId);
  const selectedRegionId = useStudioStore((state) => state.selectedRegionId);
  const exitGraphScope = useStudioStore((state) => state.exitGraphScope);
  const clearGraphScope = useStudioStore((state) => state.clearGraphScope);
  const selectItem = useStudioStore((state) => state.selectItem);
  const createBlankProject = useStudioStore((state) => state.createBlankProject);

  const currentGraphObjectId = graphScopeStack[graphScopeStack.length - 1] ?? null;
  const inObjectScope = Boolean(currentGraphObjectId);
  const selectedObject =
    project.objects.find((item) => item.id === (currentGraphObjectId ?? selectedObjectId)) ?? project.objects[0] ?? null;
  const activeSequenceNode =
    selectedObject && sequenceScopeNodeId
      ? selectedObject.structure?.nodes.find((item) => item.id === sequenceScopeNodeId && item.sequence) ?? null
      : null;
  if (!selectedObject) {
    return (
      <div className="workspace workspace-machine">
        <div className="workspace-header">
          <div>
            <h2>Machine</h2>
            <p className="muted-copy">Tree on the left, canvas in the center, properties on the right.</p>
          </div>
        </div>

        <section className="panel-card empty-authoring-state">
          <h3>Start with a system object</h3>
          <p className="muted-copy">
            This canvas stays empty until we create the first real object. Select the project root in the tree, add an
            object from the inspector, and then we can define its contract and internal behavior.
          </p>
          <div className="inspector-actions">
            <button type="button" className="inspector-link" onClick={() => selectItem("project", "project-root")}>
              Open Project Inspector
            </button>
            <button
              type="button"
              className="inspector-link"
              onClick={() => {
                selectItem("project", "project-root");
                window.setTimeout(() => {
                  const firstAction = document.querySelector<HTMLButtonElement>(".inspector-actions .inspector-link");
                  firstAction?.focus();
                }, 0);
              }}
            >
              Start Authoring
            </button>
            <button type="button" className="inspector-link" onClick={createBlankProject}>
              Reset Blank Project
            </button>
          </div>
        </section>
      </div>
    );
  }

  const machine = selectedObject.behavior?.machineId
    ? project.machines.find((item) => item.id === selectedObject.behavior?.machineId) ?? null
    : null;

  const selectedSection =
    machine?.sections.find((item) => item.id === (selectedItemType === "section" ? selectedItemId : selectedSectionId)) ?? null;
  const selectedRegion =
    machine?.regions?.find((item) => item.id === (selectedItemType === "region" ? selectedItemId : selectedRegionId)) ?? null;
  const selectedState =
    machine?.states.find((item) => item.id === (selectedItemType === "state" ? selectedItemId : "")) ?? null;

  const breadcrumbs =
    !inObjectScope
      ? [
          {
            label: "System",
            onClick: clearGraphScope
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
            onClick: clearGraphScope
          },
          ...graphScopeStack
            .map((objectId) => {
              const crumbObject = project.objects.find((item) => item.id === objectId);
              if (!crumbObject) {
                return null;
              }
              return {
                label: crumbObject.name,
                onClick: () =>
                  selectItem("object", crumbObject.id, {
                    objectId: crumbObject.id,
                    machineId: crumbObject.behavior?.machineId ?? null
                  })
              };
            })
            .filter(Boolean),
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
    !inObjectScope
      ? "Objects and Links"
      : activeSequenceNode
        ? `${selectedObject.name} / ${activeSequenceNode.title}`
        : selectedObject.name;

  const stageSummary =
    !inObjectScope
      ? "Main canvas shows large objects and the contract-level links between them."
      : activeSequenceNode
        ? "Sequence drill-in shows states, transitions and outputs by phase without leaving the object authoring flow."
        : "Drill into the object on the same authoring flow: boundary ports stay on the edges, internal logic stays inside.";

  return (
    <div className="workspace workspace-machine">
      <div className="workspace-header">
        <div>
          <h2>Machine</h2>
        </div>
      </div>

      <div className="machine-toolbar machine-toolbar--compact">
        <div className="machine-toolbar__lead">
          <div className="machine-breadcrumbs" aria-label="Machine breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <button key={`${crumb.label}-${index}`} type="button" className="machine-breadcrumb" onClick={crumb.onClick}>
                {crumb.label}
              </button>
            ))}
          </div>
          <span className="machine-stage-chip" title={stageSummary}>
            {stageTitle}
          </span>
        </div>

        <div className="machine-toolbar__controls">
          {inObjectScope ? (
            <div className="machine-filter-switcher" aria-label="Object navigation">
              <button type="button" onClick={exitGraphScope}>
                Back to System
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {selectedObject && !inObjectScope ? <ObjectPortComposer object={selectedObject} /> : null}

      <div className="machine-stage">
        {!inObjectScope ? (
          <ObjectTopologyCanvas />
        ) : activeSequenceNode ? (
          <ObjectSequenceCanvas />
        ) : (
          <ObjectStructureCanvas />
        )}
      </div>
    </div>
  );
}
