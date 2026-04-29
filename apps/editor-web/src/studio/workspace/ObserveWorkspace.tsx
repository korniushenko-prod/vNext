import { useMemo, useState } from "react";
import { exportProjectToShipcontrollerConfig } from "../model/shipcontrollerExport";
import { useStudioStore } from "../store/studioStore";

function formatWidgetSignals(signalKeys: string[]) {
  return signalKeys.length ? signalKeys.join(", ") : "—";
}

export function ObserveWorkspace() {
  const project = useStudioStore((state) => state.project);
  const snapshot = useStudioStore((state) => state.project.runtimeSnapshot);
  const signals = useStudioStore((state) => state.project.signals);
  const bindings = useStudioStore((state) => state.project.bindings);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const semanticSignals = signals.filter((signal) => signal.layer === "semantic");
  const runtimeExport = useMemo(() => exportProjectToShipcontrollerConfig(project), [project]);
  const blinkObjects = project.objects.filter((object) => object.type === "BlinkRelayPrimitive");
  const outputBindings = bindings.filter((binding) => binding.direction === "output");
  const inputBindings = bindings.filter((binding) => binding.direction === "input");
  const firstDisplayScreen = project.deployment.displayScreens[0] ?? null;
  const oledWidgetSignals = firstDisplayScreen?.widgets.map((widget) => widget.signalKey) ?? [];

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h2>Observe</h2>
          <p className="muted-copy">
            Verify what the controller is expected to do now: network, outputs, display and diagnostics before deeper debugging.
          </p>
        </div>
        <div className="inspector-actions">
          <button type="button" className="inspector-link" onClick={() => setShowAdvanced((current) => !current)}>
            {showAdvanced ? "Hide Advanced" : "Advanced Runtime"}
          </button>
        </div>
      </div>

      <div className="observe-grid observe-grid--compact">
        <section className="summary-card">
          <span>Runtime Health</span>
          <strong>{snapshot.health.toUpperCase()}</strong>
        </section>
        <section className="summary-card">
          <span>Active State</span>
          <strong>{snapshot.activeStateId || "—"}</strong>
        </section>
        <section className="summary-card">
          <span>Wi-Fi</span>
          <strong>{`${project.deployment.wifi.mode.toUpperCase()} / ${project.deployment.wifi.startupPolicy}`}</strong>
        </section>
        <section className="summary-card">
          <span>OLED</span>
          <strong>{project.deployment.oled.enabled ? "Enabled" : "Disabled"}</strong>
        </section>
      </div>

      <div className="bind-layout bind-layout--compact">
        <section className="panel-card bind-main-panel">
          <div className="workspace-header">
            <div>
              <h3>Commissioning Status</h3>
              <p className="muted-copy">First answers for the engineer: what device this is, how many bindings exist, and whether the first primitive is configured.</p>
            </div>
          </div>

          <div className="observe-status-grid">
            <div className="bind-card">
              <strong>Controller</strong>
              <div className="inspector-grid">
                <div>
                  <dt>Target</dt>
                  <dd>{project.deployment.controller.target}</dd>
                </div>
                <div>
                  <dt>Board</dt>
                  <dd>{project.deployment.controller.activeBoardTemplate}</dd>
                </div>
                <div>
                  <dt>Chip</dt>
                  <dd>{project.deployment.controller.activeChipTemplate}</dd>
                </div>
                <div>
                  <dt>Board Instance</dt>
                  <dd>{project.deployment.controller.activeBoard}</dd>
                </div>
              </div>
            </div>

            <div className="bind-card">
              <strong>Bindings</strong>
              <div className="inspector-grid">
                <div>
                  <dt>Outputs</dt>
                  <dd>{String(outputBindings.length)}</dd>
                </div>
                <div>
                  <dt>Inputs</dt>
                  <dd>{String(inputBindings.length)}</dd>
                </div>
                <div>
                  <dt>Unbound</dt>
                  <dd>{String(bindings.filter((binding) => binding.gpio === undefined).length)}</dd>
                </div>
                <div>
                  <dt>Diagnostics</dt>
                  <dd>{String(snapshot.diagnostics.length)}</dd>
                </div>
              </div>
            </div>

            <div className="bind-card">
              <strong>Blink Primitive</strong>
              {blinkObjects.length === 0 ? (
                <p className="muted-copy">No blink primitive in this project yet.</p>
              ) : (
                <div className="inspector-grid">
                  <div>
                    <dt>Objects</dt>
                    <dd>{String(blinkObjects.length)}</dd>
                  </div>
                  <div>
                    <dt>ON</dt>
                    <dd>{`${String(blinkObjects[0]?.nativeConfig?.onDurationS ?? 0)} s`}</dd>
                  </div>
                  <div>
                    <dt>OFF</dt>
                    <dd>{`${String(blinkObjects[0]?.nativeConfig?.offDurationS ?? 0)} s`}</dd>
                  </div>
                  <div>
                    <dt>Output Binding</dt>
                    <dd>{String(blinkObjects[0]?.nativeConfig?.outputBindingId ?? "—")}</dd>
                  </div>
                </div>
              )}
            </div>

            <div className="bind-card">
              <strong>OLED Screen</strong>
              {firstDisplayScreen ? (
                <div className="inspector-grid">
                  <div>
                    <dt>Screen</dt>
                    <dd>{firstDisplayScreen.label}</dd>
                  </div>
                  <div>
                    <dt>Refresh</dt>
                    <dd>{`${firstDisplayScreen.refreshMs} ms`}</dd>
                  </div>
                  <div>
                    <dt>Widgets</dt>
                    <dd>{String(firstDisplayScreen.widgets.length)}</dd>
                  </div>
                  <div>
                    <dt>Signals</dt>
                    <dd>{formatWidgetSignals(oledWidgetSignals)}</dd>
                  </div>
                </div>
              ) : (
                <p className="muted-copy">No OLED screen configured yet.</p>
              )}
            </div>
          </div>

          <div className="workspace-header">
            <div>
              <h3>Outputs and Live Meaning</h3>
              <p className="muted-copy">This list is for quick verification before going to deeper traces or JSON.</p>
            </div>
          </div>

          <div className="card-table">
            {bindings.length === 0 ? (
              <div className="empty-state">
                <strong>No bindings to observe</strong>
                <p>Create bindings first, then this screen becomes the runtime verification surface.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Binding</th>
                    <th>GPIO</th>
                    <th>Direction</th>
                    <th>Type</th>
                    <th>Physical</th>
                    <th>Signal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bindings.map((binding) => {
                    const signal = signals.find((candidate) => candidate.id === binding.signalId) ?? null;
                    return (
                      <tr key={binding.id}>
                        <td>{binding.id}</td>
                        <td>{binding.gpio !== undefined ? `GPIO${binding.gpio}` : "Unbound"}</td>
                        <td>{binding.direction}</td>
                        <td>{binding.type}</td>
                        <td>{binding.physicalSource || "—"}</td>
                        <td>{signal?.name ?? binding.signalId ?? "—"}</td>
                        <td>{binding.gpio !== undefined ? "Configured" : "Missing GPIO"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="panel-card bind-side-panel">
          <div className="workspace-header">
            <div>
              <h3>Observe Notes</h3>
              <p className="muted-copy">Keep this screen operational. Deep trace and raw structures stay secondary.</p>
            </div>
          </div>

          <div className="bind-card">
            <strong>Network</strong>
            <div className="inspector-grid">
              <div>
                <dt>Mode</dt>
                <dd>{project.deployment.wifi.mode}</dd>
              </div>
              <div>
                <dt>SSID</dt>
                <dd>{project.deployment.wifi.ssid || "—"}</dd>
              </div>
              <div>
                <dt>AP SSID</dt>
                <dd>{project.deployment.wifi.apSsid || "—"}</dd>
              </div>
              <div>
                <dt>Fallback</dt>
                <dd>{project.deployment.wifi.startupPolicy}</dd>
              </div>
            </div>
          </div>

          <div className="bind-card">
            <strong>Semantic Signals</strong>
            {semanticSignals.length === 0 ? (
              <p className="muted-copy">No semantic signals published yet.</p>
            ) : (
              <ul className="plain-list bind-issue-list">
                {semanticSignals.slice(0, 6).map((signal) => (
                  <li key={signal.id} className="bind-issue">
                    <strong>{signal.name}</strong>
                    <span>{String(signal.value ?? "—")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bind-card">
            <strong>Diagnostics</strong>
            {snapshot.diagnostics.length === 0 ? (
              <p className="muted-copy">No diagnostics are active in this project snapshot.</p>
            ) : (
              <ul className="plain-list bind-issue-list">
                {snapshot.diagnostics.map((item) => (
                  <li key={item.id} className={`bind-issue bind-issue--${item.severity === "fault" ? "fault" : "warning"}`}>
                    <strong>{item.objectId}</strong>
                    <span>{item.cause}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {showAdvanced ? (
        <section className="panel-card">
          <div className="workspace-header">
            <div>
              <h3>Advanced Runtime Preview</h3>
              <p className="muted-copy">Authoring-side export preview for deeper validation and materialization checks.</p>
            </div>
          </div>
          <pre className="code-block">{JSON.stringify(runtimeExport, null, 2)}</pre>
        </section>
      ) : null}
    </div>
  );
}
