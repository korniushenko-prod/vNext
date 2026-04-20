import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MachineNodeData } from "./machineGraphAdapter";

export function MachineStateNode({ data, selected }: NodeProps) {
  const nodeData = data as MachineNodeData;
  return (
    <div
      className={`machine-node kind-${nodeData.kind} ${nodeData.active ? "is-active" : ""} ${
        nodeData.isFocused ? "is-focused" : ""
      } ${nodeData.isDimmed ? "is-dimmed" : ""} ${selected ? "is-selected" : ""}`}
    >
      <Handle className="machine-node__handle machine-node__handle--left" type="target" position={Position.Left} id="left" />
      <Handle className="machine-node__handle machine-node__handle--right" type="source" position={Position.Right} id="right" />
      <Handle className="machine-node__handle machine-node__handle--top" type="source" position={Position.Top} id="top" />
      <Handle className="machine-node__handle machine-node__handle--top" type="target" position={Position.Top} id="top-in" />
      <Handle className="machine-node__handle machine-node__handle--bottom" type="source" position={Position.Bottom} id="bottom" />
      <Handle className="machine-node__handle machine-node__handle--bottom" type="target" position={Position.Bottom} id="bottom-in" />
      <div className="machine-node__header">
        <span className="machine-node__title">{nodeData.label}</span>
        <span className="machine-node__kind">{nodeData.kind}</span>
      </div>
      <div className="machine-node__body">
        <div className="machine-node__row">
          <span>Status</span>
          <strong>{nodeData.active ? "Active" : "Inactive"}</strong>
        </div>
        <div className="machine-node__row">
          <span>Timeout</span>
          <strong>{nodeData.timeoutMs ? `${nodeData.timeoutMs} ms` : "—"}</strong>
        </div>
      </div>
    </div>
  );
}
