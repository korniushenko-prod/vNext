import { useStudioStore } from "../store/studioStore";
import { MachineCanvas } from "../machine/MachineCanvas";

export function MachineWorkspace() {
  const machine = useStudioStore((state) => {
    const selectedMachine = state.project.machines.find((item) => item.id === state.selectedMachineId);
    return selectedMachine ?? state.project.machines[0];
  });
  const selectedGroupId = useStudioStore((state) => state.selectedGroupId);
  const selectedSectionId = useStudioStore((state) => state.selectedSectionId);
  const selectedRegionId = useStudioStore((state) => state.selectedRegionId);
  const selectedMachineId = useStudioStore((state) => state.selectedMachineId);
  const selectItem = useStudioStore((state) => state.selectItem);

  return (
    <div className="workspace workspace-machine">
      <div className="workspace-header">
        <div>
          <h2>Machine</h2>
          <p className="muted-copy">Primary workspace for machine behavior, state transitions and orchestration.</p>
        </div>
      </div>

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
