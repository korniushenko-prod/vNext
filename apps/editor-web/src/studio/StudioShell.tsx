import { useEffect, useRef } from "react";
import { parseProjectDocument } from "./model/projectLoader";
import type { WorkspaceId } from "./model/demoProject";
import { BottomLivePanel } from "./panels/BottomLivePanel";
import { InspectorPanel } from "./panels/InspectorPanel";
import { LeftProjectPanel } from "./panels/LeftProjectPanel";
import { ObjectEditorOverlay } from "./machine/ObjectEditorOverlay";
import { ObjectFullEditorModal } from "./machine/ObjectFullEditorModal";
import { useStudioStore } from "./store/studioStore";
import { BindWorkspace } from "./workspace/BindWorkspace";
import { LogicWorkspace } from "./workspace/LogicWorkspace";
import { MachineWorkspace } from "./workspace/MachineWorkspace";
import { ObserveWorkspace } from "./workspace/ObserveWorkspace";

const WORKSPACES: Array<{ id: WorkspaceId; label: string }> = [
  { id: "machine", label: "Machine" },
  { id: "bind", label: "Bind" },
  { id: "logic", label: "Logic" },
  { id: "observe", label: "Observe" }
];

const WORKSPACE_SUMMARY: Record<WorkspaceId, { title: string; description: string }> = {
  machine: {
    title: "Machine Design",
    description: "Build the machine from reusable objects, templates and internal logic."
  },
  bind: {
    title: "Commissioning Bind",
    description: "Choose preset hardware and bind real I/O safely and quickly."
  },
  logic: {
    title: "Signal Logic",
    description: "Define neutral comparators, timers, selectors and interpretation blocks."
  },
  observe: {
    title: "Runtime Observe",
    description: "Verify network, outputs, display and diagnostics from one runtime truth surface."
  }
};

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
  const projectSource = useStudioStore((state) => state.projectSource);
  const projectLoadState = useStudioStore((state) => state.projectLoadState);
  const projectLoadError = useStudioStore((state) => state.projectLoadError);
  const loadProject = useStudioStore((state) => state.loadProject);
  const importProject = useStudioStore((state) => state.importProject);
  const createBlankProject = useStudioStore((state) => state.createBlankProject);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceSummary = WORKSPACE_SUMMARY[activeWorkspace];

  function saveProject() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.id || "untitled_project"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function openProjectPicker() {
    fileInputRef.current?.click();
  }

  async function handleProjectFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const contents = await file.text();
      const document = JSON.parse(contents) as unknown;
      const nextProject = parseProjectDocument(document);
      importProject(nextProject, file.name);
    } catch (error) {
      window.alert(error instanceof Error ? `Open Project failed: ${error.message}` : "Open Project failed.");
    } finally {
      event.target.value = "";
    }
  }

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

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

        <div className="studio-topbar__main">
          <div className="studio-topbar__workspace">
            <div className="studio-topbar__workspace-copy">
              <strong>{workspaceSummary.title}</strong>
              <span>{workspaceSummary.description}</span>
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
          </div>

          <div className="studio-status">
            <span className="status-chip">
              {projectLoadState === "loading"
                ? "Loading project.json"
                : projectSource === "remote"
                  ? "project.json loaded"
                  : projectSource === "local"
                    ? "Local file opened"
                    : projectSource === "authoring"
                      ? "Working copy"
                      : "Bundled fallback"}
            </span>
            <span className={`status-chip health-${project.runtimeSnapshot.health}`}>Runtime {project.runtimeSnapshot.health}</span>
            {projectLoadError ? <span className="status-chip">Loader fallback: {projectLoadError}</span> : null}
          </div>
        </div>

        <div className="studio-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleProjectFileChange}
            hidden
          />
          <button type="button" className="topbar-button" onClick={createBlankProject}>
            New
          </button>
          <button type="button" className="topbar-button" onClick={openProjectPicker}>
            Open
          </button>
          <button type="button" className="topbar-button" onClick={saveProject}>
            Save
          </button>
          <button type="button" className="topbar-button topbar-button--primary">
            Validate
          </button>
          <button type="button" className="topbar-button topbar-button--primary">
            Apply
          </button>
        </div>
      </header>

      <main className="studio-main">
        <LeftProjectPanel />
        <section className="studio-center">{renderWorkspace(activeWorkspace)}</section>
        <InspectorPanel />
      </main>

      <ObjectEditorOverlay />
      <ObjectFullEditorModal />
      {activeWorkspace === "observe" ? <BottomLivePanel /> : null}
    </div>
  );
}
