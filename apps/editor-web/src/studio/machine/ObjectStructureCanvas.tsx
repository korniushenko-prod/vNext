import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeProps
} from "@xyflow/react";
import { useEffect, useMemo } from "react";
import type {
  ObjectInterfacePortDefinition,
  ObjectPortKind,
  ObjectStructureNodeDefinition,
  ObjectStructureRouteEndpointDefinition,
  PlcObjectDefinition
} from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";
import { ObjectNodeShell, type ObjectNodePortView } from "./ObjectNodeShell";

const STRUCTURE_SCENE_WIDTH = 1180;
const STRUCTURE_BOUNDARY_NODE_WIDTH = 164;
const STRUCTURE_BOUNDARY_LEFT_X = 18;
const STRUCTURE_BOUNDARY_RIGHT_X = STRUCTURE_SCENE_WIDTH - STRUCTURE_BOUNDARY_NODE_WIDTH - 18;
const STRUCTURE_BOUNDARY_TOP = 88;
const STRUCTURE_BOUNDARY_SPACING = 54;
const STRUCTURE_NODE_WIDTH = 176;
const STRUCTURE_NODE_HEADER_HEIGHT = 38;
const STRUCTURE_NODE_ROW_HEIGHT = 24;
const STRUCTURE_NODE_PADDING_BOTTOM = 10;

interface StructureBoundaryNodeData extends Record<string, unknown> {
  entityType: "boundary";
  side: "left" | "right";
  portKind: ObjectPortKind;
  port: ObjectInterfacePortDefinition;
}

interface StructureInternalNodeData extends Record<string, unknown> {
  entityType: "internal";
  node: ObjectStructureNodeDefinition;
}

type StructureFlowNodeData = StructureBoundaryNodeData | StructureInternalNodeData;

const nodeTypes = {
  structureBoundary: StructureBoundaryNode,
  structureInternal: StructureInternalNode
};

function flowNodeIdForBoundary(portKind: ObjectPortKind, portId: string) {
  return `boundary:${portKind}:${portId}`;
}

function flowNodeIdForInternal(nodeId: string) {
  return `node:${nodeId}`;
}

function parseBoundaryNodeId(nodeId: string): { portKind: ObjectPortKind; portId: string } | null {
  const match = /^boundary:(command|input|output|status|permission|fault):(.+)$/.exec(nodeId);
  if (!match) {
    return null;
  }

  return {
    portKind: match[1] as ObjectPortKind,
    portId: match[2]
  };
}

function parseInternalNodeId(nodeId: string) {
  return nodeId.startsWith("node:") ? nodeId.replace(/^node:/, "") : null;
}

function flowNodeIdForEndpoint(endpoint: ObjectStructureRouteEndpointDefinition) {
  return endpoint.kind === "boundary"
    ? flowNodeIdForBoundary(endpoint.portKind ?? "input", endpoint.portId)
    : flowNodeIdForInternal(endpoint.nodeId ?? "");
}

function endpointFromFlowNode(nodeId: string, handleId: string): ObjectStructureRouteEndpointDefinition | null {
  const boundary = parseBoundaryNodeId(nodeId);
  if (boundary) {
    return {
      kind: "boundary",
      portKind: boundary.portKind,
      portId: boundary.portId
    };
  }

  const internalNodeId = parseInternalNodeId(nodeId);
  if (!internalNodeId) {
    return null;
  }

  return {
    kind: "node",
    nodeId: internalNodeId,
    portId: handleId
  };
}

function getStructureNodeHeight(node: ObjectStructureNodeDefinition) {
  const rowCount = Math.max(node.inputs.length, node.outputs.length, 1);
  return STRUCTURE_NODE_HEADER_HEIGHT + rowCount * STRUCTURE_NODE_ROW_HEIGHT + STRUCTURE_NODE_PADDING_BOTTOM;
}

function groupBoundaryPorts(object: PlcObjectDefinition) {
  return {
    left: [
      { kind: "command" as const, ports: object.commands },
      { kind: "input" as const, ports: object.inputs },
      { kind: "permission" as const, ports: object.permissions }
    ].flatMap((group) => group.ports.map((port) => ({ ...group, port }))),
    right: [
      { kind: "output" as const, ports: object.outputs },
      { kind: "status" as const, ports: object.status },
      { kind: "fault" as const, ports: object.faults }
    ].flatMap((group) => group.ports.map((port) => ({ ...group, port })))
  };
}

function countBoundaryPorts(object: PlcObjectDefinition) {
  return (
    object.commands.length +
    object.inputs.length +
    object.outputs.length +
    object.status.length +
    object.permissions.length +
    object.faults.length
  );
}

function getStructureSceneHeight(
  boundary: ReturnType<typeof groupBoundaryPorts>,
  structure: NonNullable<PlcObjectDefinition["structure"]>
) {
  const leftHeight = STRUCTURE_BOUNDARY_TOP + Math.max(0, boundary.left.length - 1) * STRUCTURE_BOUNDARY_SPACING + 40;
  const rightHeight = STRUCTURE_BOUNDARY_TOP + Math.max(0, boundary.right.length - 1) * STRUCTURE_BOUNDARY_SPACING + 40;
  const nodeHeight = structure.nodes.length
    ? Math.max(...structure.nodes.map((node) => node.position.y + getStructureNodeHeight(node))) + 40
    : 520;

  return Math.max(520, leftHeight, rightHeight, nodeHeight);
}

function StructureBoundaryNode(props: NodeProps) {
  const data = props.data as StructureBoundaryNodeData;
  return (
    <div className={`structure-boundary-node side-${data.side}`} title={data.port.summary || data.port.name}>
      {data.side === "left" ? <div className="structure-boundary-node__label">{data.port.name}</div> : null}

      <div className={`structure-boundary-node__body side-${data.side}`}>
        {data.side === "right" ? (
          <Handle
            id={data.port.id}
            type="target"
            position={Position.Left}
            className="structure-flow-handle structure-flow-handle--target"
          />
        ) : null}
        <div className="structure-boundary-node__slot" />
        {data.side === "left" ? (
          <Handle
            id={data.port.id}
            type="source"
            position={Position.Right}
            className="structure-flow-handle structure-flow-handle--source"
          />
        ) : null}
      </div>

      {data.side === "right" ? <div className="structure-boundary-node__label is-right">{data.port.name}</div> : null}
    </div>
  );
}

function StructureInternalNode(props: NodeProps) {
  const data = props.data as StructureInternalNodeData;
  const node = data.node;
  const selected = props.selected;
  const rowCount = Math.max(node.inputs.length, node.outputs.length, 1);
  const nodeHeight = getStructureNodeHeight(node);
  const isObjectNode = node.kind === "Object";

  if (isObjectNode) {
    return (
      <ObjectNodeShell
        label={node.title}
        typeLabel={node.kind}
        behaviorLabel="nested"
        incomingPorts={node.inputs.map<ObjectNodePortView>((port) => ({
          id: port.id,
          name: port.name,
          family: "inputs"
        }))}
        outgoingPorts={node.outputs.map<ObjectNodePortView>((port) => ({
          id: port.id,
          name: port.name,
          family: "outputs"
        }))}
        selected={selected}
        nested
      />
    );
  }

  return (
    <div className={`structure-node-card structure-node-card--flow${selected ? " is-selected" : ""}`} style={{ height: nodeHeight }}>
      <div className="structure-node-card__header">
        <div>
          <strong>{node.title}</strong>
          <span>{node.kind}</span>
        </div>
      </div>

      <div className="structure-node-card__ports" style={{ minHeight: rowCount * STRUCTURE_NODE_ROW_HEIGHT }}>
        <div className="structure-node-port-col">
          {node.inputs.map((port: ObjectInterfacePortDefinition, index: number) => (
            <div key={port.id} className="structure-node-port is-input">
              <Handle
                id={port.id}
                type="target"
                position={Position.Left}
                className="structure-flow-handle structure-flow-handle--target"
                style={{ top: STRUCTURE_NODE_HEADER_HEIGHT + 12 + index * STRUCTURE_NODE_ROW_HEIGHT }}
              />
              <span>{port.name}</span>
            </div>
          ))}
        </div>
        <div className="structure-node-port-col">
          {node.outputs.map((port: ObjectInterfacePortDefinition, index: number) => (
            <div key={port.id} className="structure-node-port is-output">
              <span>{port.name}</span>
              <Handle
                id={port.id}
                type="source"
                position={Position.Right}
                className="structure-flow-handle structure-flow-handle--source"
                style={{ top: STRUCTURE_NODE_HEADER_HEIGHT + 12 + index * STRUCTURE_NODE_ROW_HEIGHT }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ObjectStructureCanvasInner() {
  const project = useStudioStore((state) => state.project);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectItem = useStudioStore((state) => state.selectItem);
  const ensureObjectStructure = useStudioStore((state) => state.ensureObjectStructure);
  const addStructureRoute = useStudioStore((state) => state.addStructureRoute);
  const updateStructureNodePosition = useStudioStore((state) => state.updateStructureNodePosition);

  const object = project.objects.find((item) => item.id === selectedObjectId) ?? project.objects[0] ?? null;
  if (!object) {
    return (
      <section className="panel-card empty-authoring-state">
        <h3>No object selected</h3>
        <p className="muted-copy">Create an object first, then define its ports, internal parts and local routes here.</p>
      </section>
    );
  }

  const structure = object.structure ?? null;
  const boundary = groupBoundaryPorts(object);
  const safeStructure =
    structure ??
    ({
      summary: "",
      nodes: [],
      routes: []
    } as NonNullable<PlcObjectDefinition["structure"]>);

  useEffect(() => {
    if (!object.structure) {
      ensureObjectStructure(object.id, `Internal view for ${object.name}.`);
    }
  }, [ensureObjectStructure, object]);

  const sceneHeight = getStructureSceneHeight(boundary, safeStructure);
  const nodeLookup = new Map(safeStructure.nodes.map((node) => [node.id, node]));
  const boundaryLookup = new Map(
    [...boundary.left, ...boundary.right].map((entry) => [flowNodeIdForBoundary(entry.kind, entry.port.id), entry])
  );

  const nodes = useMemo<Array<Node<StructureFlowNodeData>>>(() => {
    const boundaryNodes = [
      ...boundary.left.map((entry, index) => ({
        id: flowNodeIdForBoundary(entry.kind, entry.port.id),
        type: "structureBoundary",
        position: {
          x: STRUCTURE_BOUNDARY_LEFT_X,
          y: STRUCTURE_BOUNDARY_TOP + index * STRUCTURE_BOUNDARY_SPACING
        },
        draggable: false,
        selectable: false,
        connectable: true,
        style: {
          width: STRUCTURE_BOUNDARY_NODE_WIDTH,
          height: 28
        },
        data: {
          entityType: "boundary" as const,
          side: "left" as const,
          portKind: entry.kind,
          port: entry.port
        }
      })),
      ...boundary.right.map((entry, index) => ({
        id: flowNodeIdForBoundary(entry.kind, entry.port.id),
        type: "structureBoundary",
        position: {
          x: STRUCTURE_BOUNDARY_RIGHT_X,
          y: STRUCTURE_BOUNDARY_TOP + index * STRUCTURE_BOUNDARY_SPACING
        },
        draggable: false,
        selectable: false,
        connectable: true,
        style: {
          width: STRUCTURE_BOUNDARY_NODE_WIDTH,
          height: 28
        },
        data: {
          entityType: "boundary" as const,
          side: "right" as const,
          portKind: entry.kind,
          port: entry.port
        }
      }))
    ] as Array<Node<StructureBoundaryNodeData>>;

    const internalNodes = safeStructure.nodes.map((node) => ({
      id: flowNodeIdForInternal(node.id),
      type: "structureInternal",
      position: node.position,
      selected: selectedItemType === "subobject" && selectedItemId === node.id,
      draggable: true,
      selectable: true,
      connectable: true,
      style: {
        width: STRUCTURE_NODE_WIDTH,
        height: getStructureNodeHeight(node)
      },
      data: {
        entityType: "internal" as const,
        node
      }
    })) as Array<Node<StructureInternalNodeData>>;

    return [...boundaryNodes, ...internalNodes];
  }, [boundary.left, boundary.right, safeStructure.nodes, selectedItemId, selectedItemType]);

  const edges = useMemo<Array<Edge>>(
    () =>
      safeStructure.routes.map((route) => ({
        id: route.id,
        source: flowNodeIdForEndpoint(route.from),
        target: flowNodeIdForEndpoint(route.to),
        sourceHandle: route.from.portId,
        targetHandle: route.to.portId,
        label: route.label,
        labelShowBg: true,
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 999,
        labelStyle: {
          fill: "#cfddef",
          fontSize: 11
        },
        type: "smoothstep",
        pathOptions: { borderRadius: 18, offset: 24 },
        style: {
          stroke: "rgba(132, 189, 236, 0.9)",
          strokeWidth: 1.8
        },
        labelBgStyle: {
          fill: "rgba(7, 15, 25, 0.9)",
          stroke: "rgba(192, 210, 230, 0.1)"
        }
      })),
    [safeStructure.routes]
  );

  function getEndpointLabel(nodeId: string, handleId: string) {
    const boundaryEntry = boundaryLookup.get(nodeId);
    if (boundaryEntry) {
      return boundaryEntry.port.name;
    }

    const internalNodeId = parseInternalNodeId(nodeId);
    if (!internalNodeId) {
      return handleId;
    }

    const internalNode = nodeLookup.get(internalNodeId);
    if (!internalNode) {
      return handleId;
    }

    const port =
      internalNode.inputs.find((item) => item.id === handleId) ??
      internalNode.outputs.find((item) => item.id === handleId);

    return `${internalNode.title}.${port?.name ?? handleId}`;
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      return;
    }

    const from = endpointFromFlowNode(connection.source, connection.sourceHandle);
    const to = endpointFromFlowNode(connection.target, connection.targetHandle);
    if (!from || !to) {
      return;
    }

    addStructureRoute(object.id, {
      label: `${getEndpointLabel(connection.source, connection.sourceHandle)} -> ${getEndpointLabel(connection.target, connection.targetHandle)}`,
      from,
      to
    });
  }

  if (!structure) {
    return (
      <div className="machine-canvas structure-canvas">
        <section className="panel-card structure-empty-state">
          <h3>Opening {object.name}</h3>
          <p className="muted-copy">
            Preparing the object canvas so you can add nested objects, logic blocks and connections directly inside it.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="machine-canvas structure-canvas">
      <div className="structure-canvas__header">
        <div className="structure-canvas__hint">
          <strong>Use the same graph tools here</strong>
          <span>Drag blocks, drag from pin to pin to connect, and go back to the system canvas when the object boundary is enough.</span>
        </div>
      </div>

      <div className="structure-inline-canvas">
        <div className="structure-canvas-object-chip">
          <span className="system-object-node__type">{object.type}</span>
          <strong>{object.name}</strong>
          <span>{countBoundaryPorts(object)} ports</span>
          <span>{safeStructure.nodes.length} internal</span>
        </div>

        <div className="structure-object-canvas structure-object-canvas--schematic">
          <div className="structure-flow-shell" style={{ height: sceneHeight }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onPaneClick={() => selectItem("object", object.id, { objectId: object.id, machineId: object.behavior?.machineId ?? null })}
              onNodeClick={(_, node) => {
                const data = node.data as StructureFlowNodeData;
                if (data.entityType !== "internal") {
                  return;
                }

                selectItem("subobject", data.node.id, {
                  objectId: object.id,
                  machineId: object.behavior?.machineId ?? null
                });
              }}
              onConnect={handleConnect}
              onNodeDragStop={(_, node) => {
                const internalNodeId = parseInternalNodeId(node.id);
                if (!internalNodeId) {
                  return;
                }
                updateStructureNodePosition(object.id, internalNodeId, node.position);
              }}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              fitView={false}
              nodesDraggable
              nodesConnectable
              elementsSelectable
              proOptions={{ hideAttribution: true }}
            >
              <Controls />
              <Background gap={20} size={1} />
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ObjectStructureCanvas() {
  return (
    <ReactFlowProvider>
      <ObjectStructureCanvasInner />
    </ReactFlowProvider>
  );
}
