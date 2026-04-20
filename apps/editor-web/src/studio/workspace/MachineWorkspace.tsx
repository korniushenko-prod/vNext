import { MachineCanvas } from "../machine/MachineCanvas";

export function MachineWorkspace() {
  return (
    <div className="workspace workspace-machine">
      <div className="workspace-header">
        <div>
          <h2>Machine</h2>
          <p className="muted-copy">Primary workspace for machine behavior, state transitions and orchestration.</p>
        </div>
      </div>
      <MachineCanvas />
    </div>
  );
}
