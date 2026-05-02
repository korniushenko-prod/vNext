import type { SequenceStateDefinition } from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";

function stringifyOutputValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  if (typeof value === "string") {
    return value;
  }

  return "set";
}

function renderStateOutputs(state: SequenceStateDefinition) {
  const outputs = state.outputs ? Object.entries(state.outputs) : [];
  if (!outputs.length) {
    return <span className="sequence-state-card__empty">No explicit outputs</span>;
  }

  return outputs.map(([key, value]) => (
    <div key={`${state.id}-${key}`} className="sequence-state-card__output">
      <span>{key}</span>
      <strong>{stringifyOutputValue(value)}</strong>
    </div>
  ));
}

export function ObjectSequenceCanvas() {
  const project = useStudioStore((state) => state.project);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const sequenceScopeNodeId = useStudioStore((state) => state.sequenceScopeNodeId);
  const exitSequenceScope = useStudioStore((state) => state.exitSequenceScope);
  const selectItem = useStudioStore((state) => state.selectItem);

  const object = project.objects.find((item) => item.id === selectedObjectId) ?? null;
  const node =
    object && sequenceScopeNodeId ? object.structure?.nodes.find((item) => item.id === sequenceScopeNodeId) ?? null : null;

  if (!object || !node || !node.sequence) {
    return (
      <div className="machine-canvas sequence-canvas">
        <section className="panel-card empty-authoring-state">
          <h3>No sequence selected</h3>
          <p className="muted-copy">Choose a sequence node inside the object canvas to inspect states and transitions.</p>
        </section>
      </div>
    );
  }

  const sequence = node.sequence;
  const transitionsBySource = new Map(sequence.transitions.map((transition) => [transition.fromStateId, transition]));

  return (
    <div className="machine-canvas sequence-canvas">
      <div className="sequence-canvas__header">
        <div className="sequence-canvas__hint">
          <strong>{node.title}</strong>
          <span>{node.summary || "Sequence states, timeouts and exported outputs for this object."}</span>
        </div>

        <button
          type="button"
          className="inspector-link"
          onClick={() => {
            exitSequenceScope();
            selectItem("subobject", node.id, {
              objectId: object.id,
              machineId: object.behavior?.machineId ?? null
            });
          }}
        >
          Back to Object
        </button>
      </div>

      <div className="sequence-shell">
        <div className="sequence-shell__boundary sequence-shell__boundary--left">
          <strong>Inputs</strong>
          {node.inputs.map((port) => (
            <div key={port.id} className="sequence-boundary-port sequence-boundary-port--input">
              <span>{port.name}</span>
            </div>
          ))}
        </div>

        <div className="sequence-shell__center">
          <div className="sequence-shell__track">
            {sequence.states.map((state, index) => {
              const transition = transitionsBySource.get(state.id);
              const isStart = state.id === sequence.startStateId;
              return (
                <div key={state.id} className="sequence-track-segment">
                  <article className={`sequence-state-card${isStart ? " is-start" : ""}`}>
                    <header className="sequence-state-card__header">
                      <strong>{state.name}</strong>
                      {isStart ? <span>start</span> : null}
                    </header>
                    <div className="sequence-state-card__timeout">{state.timeoutRef ?? "timeout"}</div>
                    <div className="sequence-state-card__outputs">{renderStateOutputs(state)}</div>
                  </article>

                  {transition && index < sequence.states.length - 1 ? (
                    <div className="sequence-transition-link">
                      <span>{transition.trigger}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="sequence-shell__boundary sequence-shell__boundary--right">
          <strong>Outputs</strong>
          {node.outputs.map((port) => (
            <div key={port.id} className="sequence-boundary-port sequence-boundary-port--output">
              <span>{port.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
