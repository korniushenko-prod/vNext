import type { ObjectInterfacePortDefinition, PlcObjectDefinition, SignalDefinition, UniversalPlcDemoProject } from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";

function findPortSignal(
  project: UniversalPlcDemoProject,
  objectId: string,
  port: ObjectInterfacePortDefinition
): SignalDefinition | null {
  return (
    project.signals.find(
      (signal) =>
        signal.producerRef?.objectId === objectId &&
        signal.producerRef.portKind === port.kind &&
        signal.producerRef.portName === port.name
    ) ??
    project.signals.find((signal) =>
      signal.consumerRefs?.some(
        (consumer) =>
          consumer.objectId === objectId &&
          consumer.portKind === port.kind &&
          consumer.portName === port.name
      )
    ) ??
    null
  );
}

function ControlPortCard({
  port,
  signal
}: {
  port: ObjectInterfacePortDefinition;
  signal: SignalDefinition | null;
}) {
  return (
    <div className="control-port-card">
      <div className="control-port-card__header">
        <strong>{port.name}</strong>
        <span>{port.kind}</span>
      </div>
      <p>{port.summary}</p>
      <div className="control-port-card__meta">
        <span>{signal?.id ?? "No mapped signal"}</span>
        <strong>{signal ? String(signal.value) : "—"}</strong>
      </div>
    </div>
  );
}

function renderPortGroup(
  title: string,
  object: PlcObjectDefinition,
  ports: ObjectInterfacePortDefinition[],
  project: UniversalPlcDemoProject
) {
  if (!ports.length) {
    return null;
  }

  return (
    <section className="control-panel-card">
      <header>
        <span>{title}</span>
        <strong>{ports.length}</strong>
      </header>
      <div className="control-port-grid">
        {ports.map((port) => (
          <ControlPortCard key={port.id} port={port} signal={findPortSignal(project, object.id, port)} />
        ))}
      </div>
    </section>
  );
}

export function ObjectControlCanvas() {
  const project = useStudioStore((state) => state.project);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedObject = project.objects.find((object) => object.id === selectedObjectId) ?? project.objects[0] ?? null;

  if (!selectedObject) {
    return (
      <section className="panel-card empty-authoring-state">
        <h3>No object selected</h3>
        <p className="muted-copy">Create a control or monitoring object first, then we can explain its internal meaning here.</p>
      </section>
    );
  }

  return (
    <div className="machine-canvas control-canvas">
      <div className="control-canvas__header">
        <div>
          <span className="topology-eyebrow">Control Lens</span>
          <h3>{selectedObject.name}</h3>
          <p>{selectedObject.summary}</p>
        </div>
        <div className="control-canvas__chips">
          <span className="topology-link-chip__kind kind-status">{selectedObject.behaviorKind}</span>
          <span className="topology-link-chip__kind kind-permission">control-first</span>
        </div>
      </div>

      <div className="control-summary-grid">
        <section className="summary-card behavior-card">
          <span>Mode / Status</span>
          <strong>{selectedObject.status[0]?.name ?? "No status port"}</strong>
          <p>Control objects expose operating mode and readiness as stable engineering meanings.</p>
        </section>
        <section className="summary-card behavior-card">
          <span>Permissions</span>
          <strong>{selectedObject.permissions.length}</strong>
          <p>What must be true before the object reports ready or allows the next step.</p>
        </section>
        <section className="summary-card behavior-card">
          <span>Outputs</span>
          <strong>{selectedObject.outputs.length}</strong>
          <p>Commands or readiness signals this object exports to the rest of the system.</p>
        </section>
        <section className="summary-card behavior-card">
          <span>Faults</span>
          <strong>{selectedObject.faults.length}</strong>
          <p>Exported fault conditions that explain why the object is not ready or safe to continue.</p>
        </section>
      </div>

      <div className="control-layout-grid">
        {renderPortGroup("Commands & Inputs", selectedObject, [...selectedObject.commands, ...selectedObject.inputs], project)}
        {renderPortGroup("Mode & Permissions", selectedObject, [...selectedObject.status, ...selectedObject.permissions], project)}
        {renderPortGroup("Outputs & Faults", selectedObject, [...selectedObject.outputs, ...selectedObject.faults], project)}
      </div>

      {selectedObject.structure ? (
        <section className="control-panel-card">
          <header>
            <span>Internal Units</span>
            <strong>{selectedObject.structure.nodes.length}</strong>
          </header>
          <div className="control-internal-grid">
            {selectedObject.structure.nodes.map((node) => (
              <div key={node.id} className="control-internal-card">
                <strong>{node.title}</strong>
                <span>{node.kind}</span>
                <p>{node.summary}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
