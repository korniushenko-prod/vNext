import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { useMemo } from "react";
import { useStudioStore } from "../store/studioStore";
import { createMachinePositionUpdate, machineToFlowEdges, machineToFlowNodes, type MachineEdgeData, type MachineNodeData } from "./machineGraphAdapter";
import { MachineStateNode } from "./MachineStateNode";

const nodeTypes = {
  machineState: MachineStateNode
};

function MachineCanvasInner() {
  const machine = useStudioStore((state) => state.project.machines[0]);
  const selectItem = useStudioStore((state) => state.selectItem);
  const updateMachineNodePosition = useStudioStore((state) => state.updateMachineNodePosition);

  const nodes = useMemo(() => machineToFlowNodes(machine), [machine]);
  const edges = useMemo(() => machineToFlowEdges(machine), [machine]);

  return (
    <ReactFlow
      fitView
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => {
        const data = node.data as MachineNodeData;
        selectItem("state", node.id, { machineId: data.machineId, sectionId: data.sectionId });
      }}
      onEdgeClick={(_, edge) => {
        const data = edge.data as MachineEdgeData | undefined;
        selectItem("transition", edge.id, { machineId: data?.machineId ?? machine.id, sectionId: data?.sectionId ?? null });
      }}
      onPaneClick={() => selectItem(null, null)}
      onNodeDragStop={(_, node) => {
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
