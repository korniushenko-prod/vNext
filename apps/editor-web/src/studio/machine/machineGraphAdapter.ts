import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { MachineDefinition, MachineStateDefinition, MachineTransitionDefinition } from "../model/demoProject";

export interface MachineNodeData extends Record<string, unknown> {
  machineId: string;
  label: string;
  kind: MachineStateDefinition["kind"];
  active: boolean;
  timeoutMs?: number;
}

export interface MachineEdgeData extends Record<string, unknown> {
  event?: string;
  guard?: string;
  action?: string;
  delayMs?: number;
}

export interface MachinePositionUpdate {
  stateId: string;
  position: { x: number; y: number };
}

function createTransitionLabel(transition: MachineTransitionDefinition) {
  const parts = [transition.event, transition.guard].filter(Boolean);
  return parts.join(" / ");
}

export function machineToFlowNodes(machine: MachineDefinition): Node<MachineNodeData>[] {
  return machine.states.map((state) => ({
    id: state.id,
    type: "machineState",
    position: state.position,
    data: {
      machineId: machine.id,
      label: state.name,
      kind: state.kind,
      active: Boolean(state.active),
      timeoutMs: state.timeoutMs
    }
  }));
}

export function machineToFlowEdges(machine: MachineDefinition): Edge<MachineEdgeData>[] {
  return machine.transitions.map((transition) => ({
    id: transition.id,
    source: transition.source,
    target: transition.target,
    label: createTransitionLabel(transition),
    data: {
      event: transition.event,
      guard: transition.guard,
      action: transition.action,
      delayMs: transition.delayMs
    },
    animated: transition.guard === "timeout" || transition.guard === "fault_detected",
    markerEnd: { type: MarkerType.ArrowClosed }
  }));
}

export function createMachinePositionUpdate(
  nodeId: string,
  position: { x: number; y: number }
): MachinePositionUpdate {
  return {
    stateId: nodeId,
    position
  };
}
