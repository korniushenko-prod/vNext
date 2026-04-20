import { buildSignalTrace } from "../model/signalTrace";
import { useStudioStore } from "../store/studioStore";

export function BottomLivePanel() {
  const project = useStudioStore((state) => state.project);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const trace = selectedItemType === "signal" && selectedItemId ? buildSignalTrace(project, selectedItemId) : null;

  return (
    <section className="bottom-live-panel">
      <div className="bottom-live-panel__tabs">
        <span className="live-pill is-active">Live JSON</span>
        <span className="live-pill">Runtime Snapshot</span>
        <span className="live-pill">Diagnostics</span>
      </div>
      {trace?.signal ? (
        <div className="workspace-context">
          <div>
            <strong>Signal Flow Trace</strong>
            <p>
              {[...trace.upstream.map((item) => item.id), trace.signal.id].join(" -> ")}
            </p>
          </div>
          <div>
            <strong>Bindings</strong>
            <p>{trace.bindings.map((binding) => binding.physicalSource).join(", ") || "—"}</p>
          </div>
        </div>
      ) : null}
      <pre className="live-json">{JSON.stringify(project, null, 2)}</pre>
    </section>
  );
}
