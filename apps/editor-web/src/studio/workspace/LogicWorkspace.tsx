import { useStudioStore } from "../store/studioStore";

export function LogicWorkspace() {
  const signals = useStudioStore((state) => state.project.signals);
  const blocks = useStudioStore((state) => state.project.blocks);
  const logicContext = useStudioStore((state) => state.logicContext);
  const focusLogicContext = useStudioStore((state) => state.focusLogicContext);
  const selectItem = useStudioStore((state) => state.selectItem);
  const filteredSignals = logicContext
    ? signals.filter((signal) => logicContext.signalIds.includes(signal.id))
    : signals;
  const filteredBlocks = logicContext
    ? blocks.filter((block) => logicContext.blockIds.includes(block.id))
    : blocks;

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h2>Logic</h2>
          <p className="muted-copy">Signal and block engineering layer. v1 stays intentionally shallow and secondary to Machine.</p>
        </div>
      </div>

      {logicContext ? (
        <div className="workspace-context">
          <div>
            <strong>Filtered from Machine</strong>
            <p>{logicContext.title}</p>
          </div>
          <button type="button" className="inspector-link" onClick={() => focusLogicContext(null)}>
            Clear filter
          </button>
        </div>
      ) : null}

      <div className="logic-grid">
        <section className="panel-card">
          <h3>Signals</h3>
          <ul className="plain-list">
            {filteredSignals.map((signal) => (
              <li
                key={signal.id}
                className={logicContext ? "is-focused" : ""}
                onClick={() => selectItem("signal", signal.id)}
              >
                <strong>{signal.name}</strong>
                <span>{signal.type} / {signal.direction}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-card">
          <h3>Blocks</h3>
          <ul className="plain-list">
            {filteredBlocks.map((block) => (
              <li
                key={block.id}
                className={logicContext ? "is-focused" : ""}
                onClick={() => selectItem("block", block.id)}
              >
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
