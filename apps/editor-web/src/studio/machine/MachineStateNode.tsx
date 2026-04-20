import type { NodeProps } from "@xyflow/react";
import type { MachineNodeData } from "./machineGraphAdapter";

export function MachineStateNode({ data, selected }: NodeProps) {
  const nodeData = data as MachineNodeData;
  return (
    <div className={`machine-node kind-${nodeData.kind} ${nodeData.active ? "is-active" : ""} ${selected ? "is-selected" : ""}`}>
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
