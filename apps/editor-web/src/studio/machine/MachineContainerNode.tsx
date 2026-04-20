import type { NodeProps } from "@xyflow/react";
import type { MachineContainerNodeData } from "./machineGraphAdapter";

export function MachineContainerNode({ data, selected }: NodeProps) {
  const nodeData = data as MachineContainerNodeData;
  const showSummary = selected;

  return (
    <div
      className={`machine-container-node machine-container-node--${nodeData.entityType} ${
        nodeData.isFocused ? "is-focused" : ""
      } ${nodeData.isDimmed ? "is-dimmed" : ""} ${selected ? "is-selected" : ""}`}
      style={{ ["--machine-container-accent" as string]: nodeData.color }}
    >
      <div className="machine-container-node__header">
        <span className="machine-container-node__label">{nodeData.label}</span>
        <span className="machine-container-node__badge">
          {nodeData.entityType} · {nodeData.memberCount} states
        </span>
      </div>
      {showSummary ? <p className="machine-container-node__summary">{nodeData.summary}</p> : null}
    </div>
  );
}
