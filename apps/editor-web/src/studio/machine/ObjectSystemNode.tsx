import type { NodeProps } from "@xyflow/react";
import { ObjectNodeShell, type ObjectNodePortView } from "./ObjectNodeShell";

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
  incomingPorts: ObjectNodePortView[];
  outgoingPorts: ObjectNodePortView[];
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
    <ObjectNodeShell
      label={nodeData.label}
      typeLabel={nodeData.typeLabel}
      behaviorLabel={nodeData.behaviorKind}
      summary={nodeData.summary}
      incomingPorts={nodeData.incomingPorts}
      outgoingPorts={nodeData.outgoingPorts}
      selected={selected}
      tone={nodeData.tone}
      stats={[
        `${nodeData.portCount} ports`,
        `${nodeData.childCount} internal`,
        `${nodeData.incomingCount} in / ${nodeData.outgoingCount} out`
      ]}
      actions={
        nodeData.showActions ? (
          <div onClick={(event) => event.stopPropagation()}>
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
        ) : null
      }
    />
  );
}
