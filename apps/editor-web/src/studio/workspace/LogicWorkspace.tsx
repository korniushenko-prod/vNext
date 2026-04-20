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
  const rawSignals = filteredSignals.filter((signal) => signal.layer === "raw");
  const conditionedSignals = filteredSignals.filter((signal) => signal.layer === "conditioned");
  const semanticSignals = filteredSignals.filter((signal) => signal.layer === "semantic");
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
            {semanticSignals.map((signal) => (
              <li
                key={signal.id}
                className={logicContext ? "is-focused" : ""}
                onClick={() => selectItem("signal", signal.id)}
              >
                <strong>{signal.name}</strong>
                <span>{signal.layer} / {signal.type}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-card">
          <h3>Signal Layers</h3>
          <ul className="plain-list">
            <li>
              <strong>Raw</strong>
              <span>{rawSignals.length} direct physical points</span>
            </li>
            <li>
              <strong>Conditioned</strong>
              <span>{conditionedSignals.length} debounced / scaled values</span>
            </li>
            <li>
              <strong>Semantic</strong>
              <span>{semanticSignals.length} object-facing engineering signals</span>
            </li>
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
            Semantic signals now sit between raw bindings and object-facing logic. Next step is full trace through blocks and object contracts.
          </p>
        </section>
      </div>
    </div>
  );
}
