import { useStudioStore } from "../store/studioStore";

export function BindWorkspace() {
  const bindings = useStudioStore((state) => state.project.bindings);
  const bindContext = useStudioStore((state) => state.bindContext);
  const focusBindContext = useStudioStore((state) => state.focusBindContext);
  const selectItem = useStudioStore((state) => state.selectItem);
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
        <table>
          <thead>
            <tr>
              <th>Logical Signal</th>
              <th>Direction</th>
              <th>Physical Source</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredBindings.map((binding) => (
              <tr key={binding.id} className={bindContext ? "is-contextual" : ""} onClick={() => selectItem("binding", binding.id)}>
                <td>{binding.signalId}</td>
                <td>{binding.direction}</td>
                <td>{binding.physicalSource}</td>
                <td>{binding.type}</td>
                <td>{String(binding.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
