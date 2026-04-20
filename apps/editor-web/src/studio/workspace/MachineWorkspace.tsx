import { useStudioStore } from "../store/studioStore";
import { MachineCanvas } from "../machine/MachineCanvas";

export function MachineWorkspace() {
  const machine = useStudioStore((state) => state.project.machines[0]);
  const selectedSectionId = useStudioStore((state) => state.selectedSectionId);
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
          <h3>Machine Sections</h3>
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

          <div className="machine-browser__meta">
            <div className="summary-card compact-card">
              <span>Active Machine</span>
              <strong>{selectedMachineId || machine.id}</strong>
            </div>
            <div className="summary-card compact-card">
              <span>Sections</span>
              <strong>{machine.sections.length}</strong>
            </div>
            <div className="summary-card compact-card">
              <span>Regions</span>
              <strong>{machine.regions?.length || 0}</strong>
            </div>
          </div>

          <div className="panel-card machine-region-card">
            <h3>State Regions</h3>
            <ul className="plain-list">
              {(machine.regions || []).map((region) => (
                <li key={region.id} onClick={() => selectItem("region", region.id, { machineId: machine.id })}>
                  <strong>{region.name}</strong>
                  <span>{region.type} region placeholder</span>
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
