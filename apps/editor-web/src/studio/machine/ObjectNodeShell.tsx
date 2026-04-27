import { Handle, Position } from "@xyflow/react";

export interface ObjectNodePortView {
  id: string;
  name: string;
  family: "commands" | "inputs" | "outputs" | "status" | "permissions" | "faults";
  detail?: string;
  connectable?: boolean;
}

interface ObjectNodeShellProps {
  label: string;
  typeLabel: string;
  behaviorLabel: string;
  summary?: string;
  incomingPorts: ObjectNodePortView[];
  outgoingPorts: ObjectNodePortView[];
  selected?: boolean;
  nested?: boolean;
  tone?: "control" | "sequence" | "monitoring";
  stats?: Array<string>;
  actions?: React.ReactNode;
}

export function ObjectNodeShell({
  label,
  typeLabel,
  behaviorLabel,
  summary,
  incomingPorts,
  outgoingPorts,
  selected,
  nested,
  tone = "control",
  stats = [],
  actions
}: ObjectNodeShellProps) {
  return (
    <div className={`system-object-node tone-${tone}${nested ? " system-object-node--nested" : ""}${selected ? " is-selected" : ""}`}>
      <div className="system-object-node__header">
        <span className="system-object-node__type">{typeLabel}</span>
        <span className="system-object-node__behavior">{behaviorLabel}</span>
      </div>

      <div className="system-object-node__body">
        <strong>{label}</strong>
        {summary ? <p>{summary}</p> : null}
      </div>

      {stats.length ? (
        <div className="system-object-node__stats">
          {stats.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>
      ) : null}

      <div className={`system-object-node__ports${nested ? " system-object-node__ports--nested" : ""}`}>
        <div className="system-object-node__port-column system-object-node__port-column--incoming">
          <span className="system-object-node__port-title">In</span>
          <div className="system-object-node__port-list">
            {incomingPorts.length ? (
              incomingPorts.map((port) => (
                <div key={port.id} className="system-object-node__port-row system-object-node__port-row--incoming">
                  <div className={`system-object-node__port system-object-node__port--${port.family}`}>
                    {port.connectable === false ? null : (
                      <Handle
                        id={nested ? port.id : `target:${port.id}`}
                        type="target"
                        position={Position.Left}
                        className="system-object-node__handle system-object-node__handle--inline"
                      />
                    )}
                    <span className="system-object-node__port-name">{port.name}</span>
                    {port.detail ? <span className="system-object-node__port-detail">{port.detail}</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <span className="system-object-node__port-empty">No ports</span>
            )}
          </div>
        </div>

        <div className="system-object-node__port-column system-object-node__port-column--outgoing">
          <span className="system-object-node__port-title">Out</span>
          <div className="system-object-node__port-list">
            {outgoingPorts.length ? (
              outgoingPorts.map((port) => (
                <div key={port.id} className="system-object-node__port-row system-object-node__port-row--outgoing">
                  <div className={`system-object-node__port system-object-node__port--${port.family}`}>
                    <span className="system-object-node__port-name">{port.name}</span>
                    {port.detail ? <span className="system-object-node__port-detail">{port.detail}</span> : null}
                    {port.connectable === false ? null : (
                      <Handle
                        id={nested ? port.id : `source:${port.id}`}
                        type="source"
                        position={Position.Right}
                        className="system-object-node__handle system-object-node__handle--inline"
                      />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <span className="system-object-node__port-empty">No ports</span>
            )}
          </div>
        </div>
      </div>

      {actions ? <div className="system-object-node__actions">{actions}</div> : null}
    </div>
  );
}
