import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { useMemo } from "react";
import { useStudioStore } from "../store/studioStore";
import { createMachinePositionUpdate, machineToFlowEdges, machineToFlowNodes } from "./machineGraphAdapter";
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
      onNodeClick={(_, node) => selectItem("state", node.id)}
      onEdgeClick={(_, edge) => selectItem("transition", edge.id)}
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
