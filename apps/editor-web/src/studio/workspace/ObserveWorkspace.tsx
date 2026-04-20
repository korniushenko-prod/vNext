import { useStudioStore } from "../store/studioStore";

export function ObserveWorkspace() {
  const snapshot = useStudioStore((state) => state.project.runtimeSnapshot);
  const signals = useStudioStore((state) => state.project.signals);

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h2>Observe</h2>
          <p className="muted-copy">Runtime truth: active state, diagnostics, live values and health summary.</p>
        </div>
      </div>

      <div className="observe-grid">
        <section className="summary-card">
          <span>Machine State</span>
          <strong>{snapshot.activeStateId}</strong>
        </section>
        <section className="summary-card">
          <span>Runtime Health</span>
          <strong>{snapshot.health.toUpperCase()}</strong>
        </section>
        <section className="summary-card">
          <span>Active Diagnostics</span>
          <strong>{snapshot.diagnostics.length}</strong>
        </section>
        <section className="summary-card">
          <span>Last Event</span>
          <strong>{snapshot.lastEvent || "—"}</strong>
        </section>
      </div>

      <div className="logic-grid">
        <section className="panel-card">
          <h3>Signal Values</h3>
          <ul className="plain-list">
            {signals.map((signal) => (
              <li key={signal.id}>
                <strong>{signal.id}</strong>
                <span>{String(signal.value)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-card" style={{ gridColumn: "span 2" }}>
          <h3>Diagnostics</h3>
          <div className="card-table">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Object</th>
                  <th>Cause</th>
                  <th>Hint</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.diagnostics.map((item) => (
                  <tr key={item.id}>
                    <td>{item.severity}</td>
                    <td>{item.objectId}</td>
                    <td>{item.cause}</td>
                    <td>{item.hint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
