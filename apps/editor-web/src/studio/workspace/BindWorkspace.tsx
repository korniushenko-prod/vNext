import { useStudioStore } from "../store/studioStore";

function findNextSignal(signals: ReturnType<typeof useStudioStore.getState>["project"]["signals"], signalId: string) {
  return signals.find((signal) => signal.derivedFromSignalIds?.includes(signalId)) ?? null;
}

export function BindWorkspace() {
  const signals = useStudioStore((state) => state.project.signals);
  const bindings = useStudioStore((state) => state.project.bindings);
  const bindContext = useStudioStore((state) => state.bindContext);
  const focusBindContext = useStudioStore((state) => state.focusBindContext);
  const selectItem = useStudioStore((state) => state.selectItem);
  const addBinding = useStudioStore((state) => state.addBinding);
  const filteredBindings = bindContext
    ? bindings.filter((binding) => bindContext.bindingIds.includes(binding.id))
    : bindings;

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h2>Bind</h2>
          <p className="muted-copy">Quick physical/logical I/O setup. Fast, visible, and intentionally not the main logic editor.</p>
        </div>
        <div className="inspector-actions">
          <button
            type="button"
            className="inspector-link"
            onClick={() =>
              addBinding({
                direction: "output",
                type: "bool",
                bindingKind: "digital_out",
                physicalSource: "GPIO25",
                resourceId: "led_builtin",
                gpio: 25,
                initialState: false,
                inverted: false
              })
            }
          >
            Add DO Binding
          </button>
        </div>
      </div>

      {bindContext ? (
        <div className="workspace-context">
          <div>
            <strong>Filtered from Machine</strong>
            <p>{bindContext.title}</p>
          </div>
          <button type="button" className="inspector-link" onClick={() => focusBindContext(null)}>
            Clear filter
          </button>
        </div>
      ) : null}

      <div className="card-table">
        {filteredBindings.length === 0 ? (
          <div className="empty-state">
            <strong>No bindings yet</strong>
            <p>Create object contracts and signals first. Physical binding can come after semantic meaning exists.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Binding Kind</th>
                <th>Raw</th>
                <th>Conditioned</th>
                <th>Semantic</th>
                <th>Direction</th>
                <th>Resource</th>
                <th>GPIO</th>
                <th>Physical Source</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBindings.map((binding) => {
                const rawSignal = signals.find((signal) => signal.id === binding.signalId) ?? null;
                const conditionedSignal = rawSignal ? findNextSignal(signals, rawSignal.id) : null;
                const semanticSignal = conditionedSignal ? findNextSignal(signals, conditionedSignal.id) : null;

                return (
                  <tr key={binding.id} className={bindContext ? "is-contextual" : ""} onClick={() => selectItem("binding", binding.id)}>
                    <td>{binding.bindingKind ?? "—"}</td>
                    <td>{rawSignal?.name ?? binding.signalId}</td>
                    <td>{conditionedSignal?.name ?? "—"}</td>
                    <td>{semanticSignal?.name ?? "—"}</td>
                    <td>{binding.direction}</td>
                    <td>{binding.resourceId ?? "—"}</td>
                    <td>{binding.gpio ?? "—"}</td>
                    <td>{binding.physicalSource}</td>
                    <td>{binding.type}</td>
                    <td>{String(binding.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
