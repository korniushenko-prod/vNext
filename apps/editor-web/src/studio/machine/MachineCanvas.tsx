import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useEffect, useMemo } from "react";
import { useStudioStore } from "../store/studioStore";
import {
  createMachinePositionUpdate,
  getMachineFocusNodeIds,
  machineToFlowEdges,
  machineToFlowNodes,
  type MachineContainerNodeData,
  type MachineEdgeData,
  type MachineNodeData
} from "./machineGraphAdapter";
import { MachineContainerNode } from "./MachineContainerNode";
import { MachineStateNode } from "./MachineStateNode";

const nodeTypes = {
  machineState: MachineStateNode,
  machineGroup: MachineContainerNode,
  machineRegion: MachineContainerNode
};

function MachineCanvasInner() {
  const reactFlow = useReactFlow();
  const machine = useStudioStore((state) => {
    const selectedMachine = state.project.machines.find((item) => item.id === state.selectedMachineId);
    return selectedMachine ?? state.project.machines[0];
  });
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedRegionId = useStudioStore((state) => state.selectedRegionId);
  const machineFilterMode = useStudioStore((state) => state.machineFilterMode);
  const selectItem = useStudioStore((state) => state.selectItem);
  const updateMachineNodePosition = useStudioStore((state) => state.updateMachineNodePosition);

  const selection = useMemo(
    () => ({
      selectedItemType,
      selectedItemId,
      selectedRegionId,
      filterMode: machineFilterMode
    }),
    [machineFilterMode, selectedItemId, selectedItemType, selectedRegionId]
  );
  const nodes = useMemo(() => machineToFlowNodes(machine, selection), [machine, selection]);
  const edges = useMemo(() => machineToFlowEdges(machine, selection), [machine, selection]);

  useEffect(() => {
    const focusNodeIds = getMachineFocusNodeIds(machine, selection);
    if (!focusNodeIds.length) {
      return;
    }

    const fitNodes = focusNodeIds.map((id) => ({ id }));
    const timer = window.setTimeout(() => {
      reactFlow.fitView({
        nodes: fitNodes,
        duration: 280,
        padding: 0.24,
        includeHiddenNodes: true
      });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [machine, reactFlow, selection]);

  return (
    <ReactFlow
      fitView
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => {
        const stateData = node.data as MachineNodeData;
        const containerData = node.data as MachineContainerNodeData;

        if (containerData.entityType === "group") {
          selectItem("group", node.id, { machineId: containerData.machineId, groupId: node.id });
          return;
        }

        if (containerData.entityType === "region") {
          selectItem("region", node.id, { machineId: containerData.machineId, regionId: node.id });
          return;
        }

        selectItem("state", node.id, {
          machineId: stateData.machineId,
          groupId: stateData.groupId,
          sectionId: stateData.sectionId,
          regionId: stateData.regionId
        });
      }}
      onEdgeClick={(_, edge) => {
        const data = edge.data as MachineEdgeData | undefined;
        selectItem("transition", edge.id, {
          machineId: data?.machineId ?? machine.id,
          groupId: data?.groupId ?? null,
          sectionId: data?.sectionId ?? null,
          regionId: data?.regionId ?? null
        });
      }}
      onPaneClick={() => selectItem(null, null)}
      onNodeDragStop={(_, node) => {
        const data = node.data as MachineNodeData | MachineContainerNodeData;
        if (data.entityType !== "state") {
          return;
        }
        const update = createMachinePositionUpdate(node.id, node.position);
        updateMachineNodePosition(machine.id, update.stateId, update.position);
      }}
    >
      <MiniMap zoomable pannable />
      <Controls />
      <Background gap={20} size={1} />
    </ReactFlow>
  );
}

export function MachineCanvas() {
  return (
    <div className="machine-canvas">
      <ReactFlowProvider>
        <MachineCanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
