import { useStudioStore } from "../store/studioStore";

export function LogicWorkspace() {
  const signals = useStudioStore((state) => state.project.signals);
  const blocks = useStudioStore((state) => state.project.blocks);
  const selectItem = useStudioStore((state) => state.selectItem);

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h2>Logic</h2>
          <p className="muted-copy">Signal and block engineering layer. v1 stays intentionally shallow and secondary to Machine.</p>
        </div>
      </div>

      <div className="logic-grid">
        <section className="panel-card">
          <h3>Signals</h3>
          <ul className="plain-list">
            {signals.map((signal) => (
              <li key={signal.id} onClick={() => selectItem("signal", signal.id)}>
                <strong>{signal.name}</strong>
                <span>{signal.type} / {signal.direction}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-card">
          <h3>Blocks</h3>
          <ul className="plain-list">
            {blocks.map((block) => (
              <li key={block.id} onClick={() => selectItem("block", block.id)}>
                <strong>{block.name}</strong>
                <span>{block.type}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-card logic-placeholder">
          <h3>Connections</h3>
          <p className="muted-copy">
            Future typed relation view for signals and blocks. Kept as skeleton in v1 so Machine remains the primary authoring surface.
          </p>
        </section>
      </div>
    </div>
  );
}
