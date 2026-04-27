import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node
} from "@xyflow/react";
import { useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import type { ObjectContractFamily, PlcObjectDefinition } from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";
import { ObjectSystemNode, type ObjectSystemNodeData } from "./ObjectSystemNode";

const nodeTypes = {
  systemObject: ObjectSystemNode
};

const SYSTEM_NODE_WIDTH = 248;
const SYSTEM_NODE_HEIGHT = 248;

function getHandleId(direction: "source" | "target", portId: string) {
  return `${direction}:${portId}`;
}

function countContractPorts(object: PlcObjectDefinition) {
  return object.commands.length + object.inputs.length + object.outputs.length + object.status.length + object.permissions.length + object.faults.length;
}

function getObjectTone(object: PlcObjectDefinition): "control" | "sequence" | "monitoring" {
  switch (object.behaviorKind) {
    case "sequence":
      return "sequence";
    case "monitoring":
      return "monitoring";
    default:
      return "control";
  }
}

function getContractPortsForFamily(object: PlcObjectDefinition, family: ObjectContractFamily) {
  return object[family].map((port) => ({
    id: port.id,
    name: port.name,
    family,
    connectable: true
  }));
}

function getOutgoingPorts(object: PlcObjectDefinition) {
  const statusPorts =
    object.status.length <= 1
      ? getContractPortsForFamily(object, "status")
      : [
          {
            id: `status-group:${object.id}`,
            name: "status",
            family: "status" as const,
            detail: object.status.map((port) => port.name).join(", "),
            connectable: false
          }
        ];

  return [
    ...getContractPortsForFamily(object, "outputs"),
    ...statusPorts,
    ...getContractPortsForFamily(object, "permissions"),
    ...getContractPortsForFamily(object, "faults")
  ];
}

function createNodePosition(index: number) {
  const columns = 3;
  const column = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: 60 + column * 320,
    y: 80 + row * 220
  };
}

function computeBounds(nodes: Array<Node<ObjectSystemNodeData>>) {
  if (!nodes.length) {
    return null;
  }

  const left = Math.min(...nodes.map((node) => node.position.x));
  const top = Math.min(...nodes.map((node) => node.position.y));
  const right = Math.max(...nodes.map((node) => node.position.x + SYSTEM_NODE_WIDTH));
  const bottom = Math.max(...nodes.map((node) => node.position.y + SYSTEM_NODE_HEIGHT));

  return { left, top, right, bottom };
}

function boundsFitViewport(
  bounds: { left: number; top: number; right: number; bottom: number },
  viewport: { x: number; y: number; zoom: number },
  width: number,
  height: number
) {
  const padding = 40;
  const visibleLeft = -viewport.x / viewport.zoom;
  const visibleTop = -viewport.y / viewport.zoom;
  const visibleRight = (width - viewport.x) / viewport.zoom;
  const visibleBottom = (height - viewport.y) / viewport.zoom;

  return (
    bounds.left >= visibleLeft + padding &&
    bounds.top >= visibleTop + padding &&
    bounds.right <= visibleRight - padding &&
    bounds.bottom <= visibleBottom - padding
  );
}

function ObjectTopologyCanvasInner() {
  const reactFlow = useReactFlow();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const project = useStudioStore((state) => state.project);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const setMachineViewMode = useStudioStore((state) => state.setMachineViewMode);
  const setObjectViewLens = useStudioStore((state) => state.setObjectViewLens);
  const selectItem = useStudioStore((state) => state.selectItem);
  const openObjectEditor = useStudioStore((state) => state.openObjectEditor);
  const addCompositionLink = useStudioStore((state) => state.addCompositionLink);
  const updateObjectTopologyPosition = useStudioStore((state) => state.updateObjectTopologyPosition);

  const topLevelObjects = useMemo(() => project.objects.filter((item) => !item.parentObjectId), [project.objects]);

  const nodes = useMemo<Array<Node<ObjectSystemNodeData>>>(() => {
    return topLevelObjects.map((object, index) => {
      const machine = object.behavior?.machineId
        ? project.machines.find((item) => item.id === object.behavior?.machineId) ?? null
        : null;
      const canOpenInternalView = true;
      const childCount = project.objects.filter((item) => item.parentObjectId === object.id).length;
      const incomingCount = project.compositionLinks.filter((link) => link.targetObjectId === object.id).length;
      const outgoingCount = project.compositionLinks.filter((link) => link.sourceObjectId === object.id).length;
      const isSelected = selectedObjectId === object.id && selectedItemType === "object";
      const incomingPorts = [
        ...getContractPortsForFamily(object, "commands"),
        ...getContractPortsForFamily(object, "inputs")
      ];
      const outgoingPorts = getOutgoingPorts(object);

      return {
        id: object.id,
        type: "systemObject",
        position: object.topologyPosition ?? createNodePosition(index),
        selected: isSelected,
        style: {
          width: SYSTEM_NODE_WIDTH,
          height: SYSTEM_NODE_HEIGHT
        },
        data: {
          label: object.name,
          typeLabel: object.type,
          behaviorKind: object.behaviorKind,
          summary: object.summary,
          portCount: countContractPorts(object),
          childCount,
          incomingCount,
          outgoingCount,
          incomingPorts,
          outgoingPorts,
          tone: getObjectTone(object),
          showActions: isSelected,
          canOpenInternalView,
          onEdit: (anchorPoint) => openObjectEditor(object.id, anchorPoint),
          onOpenInternalView: () => {
            if (!canOpenInternalView) {
              return;
            }
            setObjectViewLens("structure");
            setMachineViewMode("object");
            selectItem(machine ? "machine" : "object", machine?.id ?? object.id, {
              objectId: object.id,
              machineId: machine?.id ?? null
            });
          }
        },
        draggable: true
      };
    });
  }, [
    openObjectEditor,
    project.compositionLinks,
    project.machines,
    project.objects,
    selectItem,
    selectedItemType,
    selectedObjectId,
    setMachineViewMode,
    setObjectViewLens,
    topLevelObjects
  ]);

  function openInternalViewForObject(objectId: string) {
    const object = topLevelObjects.find((item) => item.id === objectId);
    if (!object) {
      return;
    }

    const machine = object.behavior?.machineId
      ? project.machines.find((item) => item.id === object.behavior?.machineId) ?? null
      : null;

    setObjectViewLens("structure");
    setMachineViewMode("object");
    selectItem(machine ? "machine" : "object", machine?.id ?? object.id, {
      objectId: object.id,
      machineId: machine?.id ?? null
    });
  }

  const edges = useMemo<Array<Edge>>(() => {
    const topLevelIds = new Set(topLevelObjects.map((item) => item.id));
    return project.compositionLinks
      .filter((link) => topLevelIds.has(link.sourceObjectId) && topLevelIds.has(link.targetObjectId))
      .map((link) => ({
        id: link.id,
        source: link.sourceObjectId,
        target: link.targetObjectId,
        sourceHandle: link.sourcePortId ? getHandleId("source", link.sourcePortId) : undefined,
        targetHandle: link.targetPortId ? getHandleId("target", link.targetPortId) : undefined,
        label: link.label,
        labelShowBg: true,
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 999,
        labelStyle: {
          fill: "#cfddef",
          fontSize: 11
        },
        animated: link.kind === "fault",
        type: "smoothstep",
        pathOptions: { borderRadius: 18, offset: 28 },
        style: {
          stroke:
            link.kind === "fault"
              ? "rgba(255, 120, 142, 0.9)"
              : link.kind === "permission"
                ? "rgba(102, 217, 199, 0.9)"
                : link.kind === "status"
                  ? "rgba(246, 211, 127, 0.9)"
                  : "rgba(132, 189, 236, 0.9)",
          strokeWidth: selectedItemType === "object-link" && selectedItemId === link.id ? 2.4 : 1.8
        },
        labelBgStyle: {
          fill: "rgba(7, 15, 25, 0.9)",
          stroke:
            link.kind === "fault"
              ? "rgba(255, 120, 142, 0.28)"
              : link.kind === "permission"
                ? "rgba(102, 217, 199, 0.24)"
                : link.kind === "status"
                  ? "rgba(246, 211, 127, 0.24)"
                  : "rgba(192, 210, 230, 0.1)"
        }
      }));
  }, [project.compositionLinks, selectedItemId, selectedItemType, topLevelObjects]);

  useEffect(() => {
    if (!nodes.length || !canvasRef.current) {
      return;
    }

    if (nodes.length === 1) {
      return;
    }

    const targetNodes =
      selectedObjectId && nodes.some((node) => node.id === selectedObjectId)
        ? nodes.filter((node) => node.id === selectedObjectId)
        : nodes;
    const bounds = computeBounds(targetNodes);
    if (!bounds) {
      return;
    }

    const viewport = reactFlow.getViewport();
    if (boundsFitViewport(bounds, viewport, canvasRef.current.clientWidth, canvasRef.current.clientHeight)) {
      return;
    }

    const timer = window.setTimeout(() => {
      reactFlow.fitView({
        nodes: targetNodes.map((node) => ({ id: node.id })),
        duration: 280,
        padding: 0.24,
        includeHiddenNodes: true
      });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [nodes, reactFlow, selectedObjectId]);

  if (!topLevelObjects.length) {
    return (
      <section className="panel-card empty-authoring-state topology-starter-card">
        <h3>Create the first system object</h3>
        <p className="muted-copy">
          Add a large engineering object first. The top canvas should show boiler groups such as FuelGroup, Burner,
          Water Level or Protection.
        </p>
      </section>
    );
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      return;
    }

    const sourcePortId = connection.sourceHandle.replace(/^source:/, "");
    const targetPortId = connection.targetHandle.replace(/^target:/, "");

    addCompositionLink({
      sourceObjectId: connection.source,
      sourcePortId,
      targetObjectId: connection.target,
      targetPortId
    });
  }

  const handleNodeDragStop = useMemo(
    () => (_: ReactMouseEvent, node: Node<ObjectSystemNodeData>) => {
      updateObjectTopologyPosition(node.id, node.position);
    },
    [updateObjectTopologyPosition]
  );

  return (
    <div className="machine-canvas topology-flow-canvas" ref={canvasRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          selectItem("object", node.id, {
            objectId: node.id
          });
        }}
        onEdgeClick={(_, edge) => {
          selectItem("object-link", edge.id);
        }}
        onNodeDoubleClick={(_, node) => {
          openInternalViewForObject(node.id);
        }}
        onPaneClick={() => selectItem(null, null)}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        nodesDraggable
        nodesConnectable
        elementsSelectable
      >
        <Controls />
        <Background gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}

export function ObjectTopologyCanvas() {
  return (
    <ReactFlowProvider>
      <ObjectTopologyCanvasInner />
    </ReactFlowProvider>
  );
}
