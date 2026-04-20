import type { WorkspaceId } from "./model/demoProject";
import { BottomLivePanel } from "./panels/BottomLivePanel";
import { InspectorPanel } from "./panels/InspectorPanel";
import { LeftProjectPanel } from "./panels/LeftProjectPanel";
import { useStudioStore } from "./store/studioStore";
import { BindWorkspace } from "./workspace/BindWorkspace";
import { LogicWorkspace } from "./workspace/LogicWorkspace";
import { MachineWorkspace } from "./workspace/MachineWorkspace";
import { ObserveWorkspace } from "./workspace/ObserveWorkspace";

const WORKSPACES: Array<{ id: WorkspaceId; label: string }> = [
  { id: "bind", label: "Bind" },
  { id: "logic", label: "Logic" },
  { id: "machine", label: "Machine" },
  { id: "observe", label: "Observe" }
];

function renderWorkspace(workspace: WorkspaceId) {
  switch (workspace) {
    case "bind":
      return <BindWorkspace />;
    case "logic":
      return <LogicWorkspace />;
    case "observe":
      return <ObserveWorkspace />;
    case "machine":
    default:
      return <MachineWorkspace />;
  }
}

export function StudioShell() {
  const activeWorkspace = useStudioStore((state) => state.activeWorkspace);
  const setActiveWorkspace = useStudioStore((state) => state.setActiveWorkspace);
  const project = useStudioStore((state) => state.project);

  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <div className="studio-brand">
          <div className="studio-brand__mark">UP</div>
          <div>
            <h1>Universal PLC Studio</h1>
            <p>{project.name}</p>
          </div>
        </div>

        <nav className="workspace-switcher" aria-label="Workspace switcher">
          {WORKSPACES.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              className={workspace.id === activeWorkspace ? "is-active" : ""}
              onClick={() => setActiveWorkspace(workspace.id)}
            >
              {workspace.label}
            </button>
          ))}
        </nav>

        <div className="studio-status">
          <span className="status-chip">Graph-first shell</span>
          <span className={`status-chip health-${project.runtimeSnapshot.health}`}>Runtime {project.runtimeSnapshot.health}</span>
        </div>
      </header>

      <main className="studio-main">
        <LeftProjectPanel />
        <section className="studio-center">{renderWorkspace(activeWorkspace)}</section>
        <InspectorPanel />
      </main>

      <BottomLivePanel />
    </div>
  );
}
