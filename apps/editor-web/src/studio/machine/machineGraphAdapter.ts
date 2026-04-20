import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type {
  MachineDefinition,
  MachineSceneGroupDefinition,
  MachineRegionDefinition,
  MachineStateDefinition,
  MachineTransitionDefinition
} from "../model/demoProject";
import type { MachineFilterMode, SelectedItemType } from "../store/studioStore";

const STATE_WIDTH = 208;
const STATE_HEIGHT = 112;

export interface MachineSelectionContext {
  selectedItemType: SelectedItemType;
  selectedItemId: string | null;
  selectedRegionId: string | null;
  filterMode: MachineFilterMode;
}

export interface MachineNodeData extends Record<string, unknown> {
  entityType: "state";
  machineId: string;
  groupId?: string;
  sectionId: string;
  regionId?: string;
  label: string;
  kind: MachineStateDefinition["kind"];
  active: boolean;
  timeoutMs?: number;
  isFocused: boolean;
  isDimmed: boolean;
}

export interface MachineContainerNodeData extends Record<string, unknown> {
  entityType: "group" | "region";
  machineId: string;
  color: string;
  label: string;
  summary: string;
  memberCount: number;
  isFocused: boolean;
  isDimmed: boolean;
}

export interface MachineEdgeData extends Record<string, unknown> {
  machineId: string;
  groupId?: string;
  sectionId?: string;
  regionId?: string;
  event?: string;
  guard?: string;
  action?: string;
  delayMs?: number;
  isFocused: boolean;
  isDimmed: boolean;
}

export interface MachinePositionUpdate {
  stateId: string;
  position: { x: number; y: number };
}

function createTransitionLabel(machine: MachineDefinition, transition: MachineTransitionDefinition) {
  if (machine.behaviorKind === "sequence") {
    if (transition.event) {
      return transition.event;
    }

    if (transition.guard && transition.delayMs) {
      return `${transition.guard} · ${transition.delayMs}ms`;
    }

    if (transition.guard) {
      return transition.guard;
    }

    if (transition.delayMs) {
      return `${transition.delayMs}ms`;
    }

    return transition.action ?? "";
  }

  const parts = [
    transition.event ? `evt:${transition.event}` : "",
    transition.guard ? `guard:${transition.guard}` : "",
    transition.delayMs ? `delay:${transition.delayMs}ms` : "",
    transition.action ? `act:${transition.action}` : ""
  ].filter(Boolean);
  return parts.join(" | ");
}

function findGroupForState(machine: MachineDefinition, stateId: string) {
  return machine.sceneGroups?.find((group) => group.stateIds.includes(stateId)) ?? null;
}

function getBoundsForStates(machine: MachineDefinition, stateIds: string[], padding: { top: number; right: number; bottom: number; left: number }) {
  const states = machine.states.filter((state) => stateIds.includes(state.id));
  if (!states.length) {
    return {
      x: 0,
      y: 0,
      width: 320,
      height: 180
    };
  }

  const minX = Math.min(...states.map((state) => state.position.x));
  const minY = Math.min(...states.map((state) => state.position.y));
  const maxX = Math.max(...states.map((state) => state.position.x + STATE_WIDTH));
  const maxY = Math.max(...states.map((state) => state.position.y + STATE_HEIGHT));

  return {
    x: minX - padding.left,
    y: minY - padding.top,
    width: maxX - minX + padding.left + padding.right,
    height: maxY - minY + padding.top + padding.bottom
  };
}

function getSelectionStateIds(machine: MachineDefinition, selection: MachineSelectionContext) {
  if (!selection.selectedItemType || !selection.selectedItemId) {
    return null;
  }

  switch (selection.selectedItemType) {
    case "group":
      return new Set(machine.sceneGroups?.find((group) => group.id === selection.selectedItemId)?.stateIds ?? []);
    case "region":
      return new Set(machine.regions?.find((region) => region.id === selection.selectedItemId)?.stateIds ?? []);
    case "section":
      return new Set(
        machine.states.filter((state) => state.sectionId === selection.selectedItemId).map((state) => state.id)
      );
    case "state":
      return new Set([selection.selectedItemId]);
    case "transition": {
      const transition = machine.transitions.find((item) => item.id === selection.selectedItemId);
      return transition ? new Set([transition.source, transition.target]) : null;
    }
    default:
      return null;
  }
}

function getRegionFocusStateIds(machine: MachineDefinition, selection: MachineSelectionContext) {
  const explicitRegionId =
    selection.selectedItemType === "region"
      ? selection.selectedItemId
      : selection.selectedRegionId;

  if (!explicitRegionId) {
    return null;
  }

  return new Set(machine.regions?.find((region) => region.id === explicitRegionId)?.stateIds ?? []);
}

function getFocusedStateIds(machine: MachineDefinition, selection: MachineSelectionContext) {
  switch (selection.filterMode) {
    case "focus":
      return getSelectionStateIds(machine, selection);
    case "region": {
      const regionStateIds = getRegionFocusStateIds(machine, selection);
      return regionStateIds && regionStateIds.size ? regionStateIds : getSelectionStateIds(machine, selection);
    }
    case "all":
    default:
      return null;
  }
}

function entityMatchesSelection(
  entityType: "group" | "region" | "state" | "transition",
  entityId: string,
  selection: MachineSelectionContext
) {
  return selection.selectedItemType === entityType && selection.selectedItemId === entityId;
}

function sceneGroupToNode(
  machine: MachineDefinition,
  group: MachineSceneGroupDefinition,
  selection: MachineSelectionContext,
  focusedStateIds: Set<string> | null
): Node<MachineContainerNodeData> {
  const bounds = getBoundsForStates(machine, group.stateIds, { top: 72, right: 52, bottom: 56, left: 52 });
  const overlapsFocus = focusedStateIds ? group.stateIds.some((stateId) => focusedStateIds.has(stateId)) : false;
  const isFocused = entityMatchesSelection("group", group.id, selection) || overlapsFocus;
  const isDimmed = Boolean(focusedStateIds && !overlapsFocus);
  const width = Math.max(152, Math.min(210, Math.round(bounds.width * 0.34)));
  const height = isFocused ? 84 : 48;

  return {
    id: group.id,
    type: "machineGroup",
    position: {
      x: bounds.x + bounds.width - width - 12,
      y: bounds.y + 8
    },
    selectable: true,
    draggable: false,
    connectable: false,
    zIndex: 2,
    selected: entityMatchesSelection("group", group.id, selection),
    style: {
      width,
      height
    },
    data: {
      entityType: "group",
      machineId: machine.id,
      color: group.color,
      label: group.name,
      summary: group.summary,
      memberCount: group.stateIds.length,
      isFocused,
      isDimmed
    }
  };
}

function regionToNode(
  machine: MachineDefinition,
  region: MachineRegionDefinition,
  selection: MachineSelectionContext,
  focusedStateIds: Set<string> | null
): Node<MachineContainerNodeData> {
  const bounds = getBoundsForStates(machine, region.stateIds, { top: 30, right: 18, bottom: 22, left: 18 });
  const overlapsFocus = focusedStateIds ? region.stateIds.some((stateId) => focusedStateIds.has(stateId)) : false;
  const isFocused = entityMatchesSelection("region", region.id, selection) || overlapsFocus;
  const isDimmed = Boolean(focusedStateIds && !overlapsFocus);

  return {
    id: region.id,
    type: "machineRegion",
    position: { x: bounds.x, y: bounds.y },
    selectable: true,
    draggable: false,
    connectable: false,
    zIndex: 0,
    selected: entityMatchesSelection("region", region.id, selection),
    style: {
      width: bounds.width,
      height: bounds.height
    },
    data: {
      entityType: "region",
      machineId: machine.id,
      color: region.color,
      label: region.name,
      summary: region.summary,
      memberCount: region.stateIds.length,
      isFocused,
      isDimmed
    }
  };
}

export function machineToFlowNodes(
  machine: MachineDefinition,
  selection: MachineSelectionContext
): Array<Node<MachineNodeData | MachineContainerNodeData>> {
  const focusedStateIds = getFocusedStateIds(machine, selection);
  const showContainerNodes = machine.behaviorKind !== "sequence";
  const groupNodes = (machine.sceneGroups ?? []).map((group) =>
    sceneGroupToNode(machine, group, selection, focusedStateIds)
  );
  const regionNodes = (machine.regions ?? []).map((region) =>
    regionToNode(machine, region, selection, focusedStateIds)
  );
  const stateNodes: Node<MachineNodeData>[] = machine.states.map((state) => {
    const group = findGroupForState(machine, state.id);
    const isFocused = entityMatchesSelection("state", state.id, selection) || Boolean(focusedStateIds?.has(state.id));
    const isDimmed = Boolean(focusedStateIds && !focusedStateIds.has(state.id));

    return {
      id: state.id,
      type: "machineState",
      position: state.position,
      zIndex: 3,
      selected: entityMatchesSelection("state", state.id, selection),
      data: {
        entityType: "state",
        machineId: machine.id,
        groupId: group?.id,
        sectionId: state.sectionId,
        regionId: state.regionId,
        label: state.name,
        kind: state.kind,
        active: Boolean(state.active),
        timeoutMs: state.timeoutMs,
        isFocused,
        isDimmed
      }
    };
  });

  return showContainerNodes ? [...groupNodes, ...regionNodes, ...stateNodes] : stateNodes;
}

export function machineToFlowEdges(machine: MachineDefinition, selection: MachineSelectionContext): Edge<MachineEdgeData>[] {
  const focusedStateIds = getFocusedStateIds(machine, selection);
  return machine.transitions.map((transition) => ({
    id: transition.id,
    source: transition.source,
    target: transition.target,
    label: createTransitionLabel(machine, transition),
    labelShowBg: true,
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 999,
    labelBgStyle: {
      fill: "rgba(7, 15, 25, 0.82)",
      stroke: "rgba(192, 210, 230, 0.1)"
    },
    labelStyle: {
      fill: "#cfddef",
      fontSize: 11
    },
    data: {
      machineId: machine.id,
      groupId: findGroupForState(machine, transition.source)?.id ?? findGroupForState(machine, transition.target)?.id ?? undefined,
      sectionId: transition.sectionId,
      regionId:
        machine.states.find((state) => state.id === transition.source)?.regionId ??
        machine.states.find((state) => state.id === transition.target)?.regionId,
      event: transition.event,
      guard: transition.guard,
      action: transition.action,
      delayMs: transition.delayMs,
      isFocused:
        entityMatchesSelection("transition", transition.id, selection) ||
        Boolean(focusedStateIds?.has(transition.source) || focusedStateIds?.has(transition.target)),
      isDimmed:
        Boolean(
          focusedStateIds &&
            !focusedStateIds.has(transition.source) &&
            !focusedStateIds.has(transition.target)
        )
    },
    animated: transition.guard === "timeout" || transition.guard === "fault_detected",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      opacity:
        focusedStateIds &&
        !focusedStateIds.has(transition.source) &&
        !focusedStateIds.has(transition.target)
          ? 0.24
          : 1,
      strokeWidth: entityMatchesSelection("transition", transition.id, selection) ? 2.4 : 1.5
    }
  }));
}

export function getMachineFocusNodeIds(machine: MachineDefinition, selection: MachineSelectionContext) {
  const stateIds = Array.from(getFocusedStateIds(machine, selection) ?? []);
  if (!stateIds.length) {
    return [];
  }

  const nodeIds = new Set<string>(stateIds);

  if (selection.selectedItemType === "group" && selection.selectedItemId) {
    nodeIds.add(selection.selectedItemId);
  }

  if (selection.selectedItemType === "region" && selection.selectedItemId) {
    nodeIds.add(selection.selectedItemId);
  }

  if (selection.filterMode === "region" && selection.selectedRegionId) {
    nodeIds.add(selection.selectedRegionId);
  }

  return Array.from(nodeIds);
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
