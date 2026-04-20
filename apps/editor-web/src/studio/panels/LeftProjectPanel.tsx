import { useMemo } from "react";
import { useStudioStore } from "../store/studioStore";

export function LeftProjectPanel() {
  const project = useStudioStore((state) => state.project);
  const activeWorkspace = useStudioStore((state) => state.activeWorkspace);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedMachineId = useStudioStore((state) => state.selectedMachineId);
  const selectedGroupId = useStudioStore((state) => state.selectedGroupId);
  const selectedSectionId = useStudioStore((state) => state.selectedSectionId);
  const selectedRegionId = useStudioStore((state) => state.selectedRegionId);
  const selectItem = useStudioStore((state) => state.selectItem);

  const machine = project.machines[0];
  const treeLines = useMemo(
    () => [
      project.name,
      `  Machines/${machine.name}`,
      ...machine.states.map((state) => `    State/${state.name}`),
      `  Signals/${project.signals.length}`,
      `  Blocks/${project.blocks.length}`,
      `  IO/${project.bindings.length}`
    ],
    [machine, project]
  );

  const activeMachine = project.machines.find((item) => item.id === selectedMachineId) ?? machine;

  return (
    <aside className="studio-panel studio-panel--left">
      <section className="panel-card">
        <h3>Project</h3>
        <pre className="project-tree">{treeLines.join("\n")}</pre>
      </section>

      <section className="panel-card">
        <h3>Palette</h3>
        <div className="palette-list">
          <button type="button" className="palette-item">States</button>
          <button type="button" className="palette-item">Transitions</button>
          <button type="button" className="palette-item">Signals</button>
          <button type="button" className="palette-item">Blocks</button>
          <button type="button" className="palette-item">Bindings</button>
        </div>
      </section>

      <section className="panel-card">
        <h3>Quick Sections</h3>
        <ul className="plain-list">
          <li><strong>Machines</strong><span>Scenes, states, transitions</span></li>
          <li><strong>Signals</strong><span>Named data and events</span></li>
          <li><strong>Blocks</strong><span>Reusable logic units</span></li>
          <li><strong>IO</strong><span>Bindings to physical sources</span></li>
        </ul>
      </section>

      {activeWorkspace === "machine" ? (
        <section className="panel-card">
          <h3>Machine Browser</h3>
          <ul className="plain-list">
            <li
              className={selectedItemType === "machine" ? "is-focused" : ""}
              onClick={() => selectItem("machine", activeMachine.id, { machineId: activeMachine.id })}
            >
              <strong>{activeMachine.name}</strong>
              <span>{activeMachine.behaviorKind} / {activeMachine.states.length} states</span>
            </li>
            {(activeMachine.sceneGroups || []).map((group) => (
              <li
                key={group.id}
                className={group.id === selectedGroupId ? "is-focused" : ""}
                onClick={() => selectItem("group", group.id, { machineId: activeMachine.id, groupId: group.id })}
              >
                <strong>{group.name}</strong>
                <span>{group.summary}</span>
              </li>
            ))}
            {activeMachine.sections.map((section) => (
              <li
                key={section.id}
                className={section.id === selectedSectionId ? "is-focused" : ""}
                onClick={() => selectItem("section", section.id, { machineId: activeMachine.id, sectionId: section.id })}
              >
                <strong>{section.name}</strong>
                <span>{section.summary}</span>
              </li>
            ))}
            {(activeMachine.regions || []).map((region) => (
              <li
                key={region.id}
                className={region.id === selectedRegionId ? "is-focused" : ""}
                onClick={() => selectItem("region", region.id, { machineId: activeMachine.id, regionId: region.id })}
              >
                <strong>{region.name}</strong>
                <span>{region.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
