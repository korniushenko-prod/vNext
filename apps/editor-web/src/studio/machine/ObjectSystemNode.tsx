import { Handle, Position, type NodeProps } from "@xyflow/react";

interface SystemPortView {
  id: string;
  name: string;
  family: "commands" | "inputs" | "outputs" | "status" | "permissions" | "faults";
  detail?: string;
  connectable?: boolean;
}

export interface ObjectSystemNodeData extends Record<string, unknown> {
  label: string;
  typeLabel: string;
  behaviorKind: string;
  summary: string;
  portCount: number;
  childCount: number;
  incomingCount: number;
  outgoingCount: number;
  tone: "control" | "sequence" | "monitoring";
  showActions: boolean;
  canOpenInternalView: boolean;
  incomingPorts: SystemPortView[];
  outgoingPorts: SystemPortView[];
  onEdit: (anchorPoint: { left: number; top: number }) => void;
  onOpenInternalView: () => void;
}

export function ObjectSystemNode({ data, selected }: NodeProps) {
  const nodeData = data as ObjectSystemNodeData;

  function createAnchorPoint(target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    return {
      left: rect.right + 14,
      top: rect.top - 8
    };
  }

  return (
    <div className={`system-object-node tone-${nodeData.tone}${selected ? " is-selected" : ""}`}>
      <div className="system-object-node__header">
        <span className="system-object-node__type">{nodeData.typeLabel}</span>
        <span className="system-object-node__behavior">{nodeData.behaviorKind}</span>
      </div>

      <div className="system-object-node__body">
        <strong>{nodeData.label}</strong>
        <p>{nodeData.summary}</p>
      </div>

      <div className="system-object-node__stats">
        <span>{nodeData.portCount} ports</span>
        <span>{nodeData.childCount} internal</span>
        <span>
          {nodeData.incomingCount} in / {nodeData.outgoingCount} out
        </span>
      </div>

      <div className="system-object-node__ports">
        <div className="system-object-node__port-column system-object-node__port-column--incoming">
          <span className="system-object-node__port-title">In</span>
          <div className="system-object-node__port-list">
            {nodeData.incomingPorts.length ? (
              nodeData.incomingPorts.map((port) => (
                <div key={port.id} className={`system-object-node__port-row system-object-node__port-row--incoming`}>
                  <div className={`system-object-node__port system-object-node__port--${port.family}`}>
                    {port.connectable === false ? null : (
                      <Handle
                        id={`target:${port.id}`}
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
            {nodeData.outgoingPorts.length ? (
              nodeData.outgoingPorts.map((port) => (
                <div key={port.id} className={`system-object-node__port-row system-object-node__port-row--outgoing`}>
                  <div className={`system-object-node__port system-object-node__port--${port.family}`}>
                    <span className="system-object-node__port-name">{port.name}</span>
                    {port.detail ? <span className="system-object-node__port-detail">{port.detail}</span> : null}
                    {port.connectable === false ? null : (
                      <Handle
                        id={`source:${port.id}`}
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

      {nodeData.showActions ? (
        <div className="system-object-node__actions" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="system-object-node__action"
            onClick={(event) => nodeData.onEdit(createAnchorPoint(event.currentTarget))}
          >
            Edit Object
          </button>
          <button
            type="button"
            className="system-object-node__action"
            disabled={!nodeData.canOpenInternalView}
            onClick={nodeData.onOpenInternalView}
          >
            {nodeData.canOpenInternalView ? "Open" : "No internal view yet"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
