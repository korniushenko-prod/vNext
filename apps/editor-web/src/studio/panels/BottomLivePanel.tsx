import { useStudioStore } from "../store/studioStore";

export function BottomLivePanel() {
  const project = useStudioStore((state) => state.project);

  return (
    <section className="bottom-live-panel">
      <div className="bottom-live-panel__tabs">
        <span className="live-pill is-active">Live JSON</span>
        <span className="live-pill">Runtime Snapshot</span>
        <span className="live-pill">Diagnostics</span>
      </div>
      <pre className="live-json">{JSON.stringify(project, null, 2)}</pre>
    </section>
  );
}
