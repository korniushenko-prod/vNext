import { useStudioStore } from "../store/studioStore";
import { MachineCanvas } from "../machine/MachineCanvas";

export function MachineWorkspace() {
  const machine = useStudioStore((state) => {
    const selectedMachine = state.project.machines.find((item) => item.id === state.selectedMachineId);
    return selectedMachine ?? state.project.machines[0];
  });
  const selectedGroupId = useStudioStore((state) => state.selectedGroupId);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedSectionId = useStudioStore((state) => state.selectedSectionId);
  const selectedRegionId = useStudioStore((state) => state.selectedRegionId);
  const selectedMachineId = useStudioStore((state) => state.selectedMachineId);
  const machineFilterMode = useStudioStore((state) => state.machineFilterMode);
  const setMachineFilterMode = useStudioStore((state) => state.setMachineFilterMode);
  const selectItem = useStudioStore((state) => state.selectItem);

  const selectedState = selectedItemType === "state" ? machine.states.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedTransition =
    selectedItemType === "transition" ? machine.transitions.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedGroup =
    machine.sceneGroups?.find((item) => item.id === (selectedItemType === "group" ? selectedItemId : selectedGroupId)) ?? null;
  const selectedSection =
    machine.sections.find(
      (item) =>
        item.id ===
        (selectedItemType === "section"
          ? selectedItemId
          : selectedState?.sectionId ?? selectedTransition?.sectionId ?? selectedSectionId)
    ) ?? null;
  const selectedRegion =
    machine.regions?.find(
      (item) =>
        item.id ===
        (selectedItemType === "region"
          ? selectedItemId
          : selectedState?.regionId ??
            machine.states.find((state) => state.id === selectedTransition?.source)?.regionId ??
            selectedRegionId)
    ) ?? null;

  const breadcrumbs = [
    {
      label: machine.name,
      onClick: () => selectItem("machine", machine.id, { machineId: machine.id })
    },
    selectedSection
      ? {
          label: selectedSection.name,
          onClick: () => selectItem("section", selectedSection.id, { machineId: machine.id, sectionId: selectedSection.id })
        }
      : null,
    selectedRegion
      ? {
          label: selectedRegion.name,
          onClick: () => selectItem("region", selectedRegion.id, { machineId: machine.id, regionId: selectedRegion.id })
        }
      : null,
    selectedGroup
      ? {
          label: selectedGroup.name,
          onClick: () => selectItem("group", selectedGroup.id, { machineId: machine.id, groupId: selectedGroup.id })
        }
      : null,
    selectedState
      ? {
          label: selectedState.name,
          onClick: () =>
            selectItem("state", selectedState.id, {
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
              machineId: machine.id,
              groupId: selectedGroup?.id ?? null,
              sectionId: selectedTransition.sectionId,
              regionId: selectedRegion?.id ?? null
            })
        }
      : null
  ].filter(Boolean) as Array<{ label: string; onClick: () => void }>;

  const behaviorSummary = machine.behaviorSummary
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
            {machine.behaviorKind === "sequence"
              ? "Sequence view: show only how the machine moves through start, run, stop, fault and recovery."
              : "Primary workspace for machine behavior, state transitions and orchestration."}
          </p>
        </div>
      </div>

      <div className="machine-toolbar">
        <div className="machine-breadcrumbs" aria-label="Machine breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <button key={`${crumb.label}-${index}`} type="button" className="machine-breadcrumb" onClick={crumb.onClick}>
              {crumb.label}
            </button>
          ))}
        </div>

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

      {behaviorSummary ? (
        <div className="behavior-summary-grid">
          <div className="summary-card behavior-card">
            <span>Behavior Lens</span>
            <strong>Sequence</strong>
            <p>Canvas shows the behavioral path, not all project data.</p>
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
          <h3>Scene Groups</h3>
          <ul className="plain-list">
            {(machine.sceneGroups || []).map((group) => (
              <li
                key={group.id}
                className={group.id === selectedGroupId ? "is-focused" : ""}
                onClick={() => selectItem("group", group.id, { machineId: machine.id, groupId: group.id })}
              >
                <strong>{group.name}</strong>
                <span>{group.summary}</span>
              </li>
            ))}
          </ul>

          <div className="machine-browser__meta">
            <div className="summary-card compact-card">
              <span>Active Machine</span>
              <strong>{selectedMachineId || machine.id}</strong>
            </div>
            <div className="summary-card compact-card">
              <span>Groups</span>
              <strong>{machine.sceneGroups?.length || 0}</strong>
            </div>
            <div className="summary-card compact-card">
              <span>Regions</span>
              <strong>{machine.regions?.length || 0}</strong>
            </div>
          </div>

          <div className="panel-card machine-browser__section">
            <h3>Sections</h3>
            <ul className="plain-list">
              {machine.sections.map((section) => (
                <li
                  key={section.id}
                  className={section.id === selectedSectionId ? "is-focused" : ""}
                  onClick={() => selectItem("section", section.id, { machineId: machine.id, sectionId: section.id })}
                >
                  <strong>{section.name}</strong>
                  <span>{section.summary}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel-card machine-region-card">
            <h3>State Regions</h3>
            <ul className="plain-list">
              {(machine.regions || []).map((region) => (
                <li
                  key={region.id}
                  className={region.id === selectedRegionId ? "is-focused" : ""}
                  onClick={() => selectItem("region", region.id, { machineId: machine.id, regionId: region.id })}
                >
                  <strong>{region.name}</strong>
                  <span>{region.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <MachineCanvas />
      </div>
    </div>
  );
}
