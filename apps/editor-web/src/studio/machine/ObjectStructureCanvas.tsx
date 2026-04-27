import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type {
  ObjectInterfacePortDefinition,
  ObjectPortKind,
  ObjectStructureNodeDefinition,
  ObjectStructureRouteEndpointDefinition,
  ObjectStructureRouteDefinition,
  PlcObjectDefinition
} from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";

interface RouteGeometry {
  id: string;
  label: string;
  d: string;
  labelX: number;
  labelY: number;
}

interface PendingEndpoint {
  endpoint: ObjectStructureRouteEndpointDefinition;
  key: string;
  label: string;
}

interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  nodeWidth: number;
  nodeHeight: number;
}

function endpointKeyForBoundary(portKind: string, portId: string) {
  return `boundary:${portKind}:${portId}`;
}

function endpointKeyForNode(nodeId: string, portId: string) {
  return `node:${nodeId}:${portId}`;
}

function endpointKey(routeEndpoint: ObjectStructureRouteDefinition["from"]) {
  return routeEndpoint.kind === "boundary"
    ? endpointKeyForBoundary(routeEndpoint.portKind || "input", routeEndpoint.portId)
    : endpointKeyForNode(routeEndpoint.nodeId || "", routeEndpoint.portId);
}

function endpointLabelForBoundary(port: ObjectInterfacePortDefinition) {
  return port.name;
}

function endpointLabelForNode(node: ObjectStructureNodeDefinition, portName: string) {
  return `${node.title}.${portName}`;
}

function groupBoundaryPorts(object: PlcObjectDefinition) {
  return {
    left: [
      { title: "Commands", kind: "command" as const, ports: object.commands },
      { title: "Inputs", kind: "input" as const, ports: object.inputs },
      { title: "Permissions", kind: "permission" as const, ports: object.permissions }
    ].filter((group) => group.ports.length > 0),
    right: [
      { title: "Outputs", kind: "output" as const, ports: object.outputs },
      { title: "Status", kind: "status" as const, ports: object.status },
      { title: "Faults", kind: "fault" as const, ports: object.faults }
    ].filter((group) => group.ports.length > 0)
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


function StructureBoundaryPort({
  port,
  portKind,
  side,
  isPending,
  onPick
}: {
  port: ObjectInterfacePortDefinition;
  portKind: ObjectPortKind;
  side: "left" | "right";
  isPending: boolean;
  onPick: (endpoint: ObjectStructureRouteEndpointDefinition, label: string) => void;
}) {
  return (
    <div className={`structure-boundary-port-row is-${side}`}>
      {side === "left" ? (
        <div className="structure-boundary-port-label" title={port.summary || port.name}>
          <strong>{port.name}</strong>
        </div>
      ) : null}

      <button
        type="button"
        className={`structure-port-card is-${side}${isPending ? " is-pending" : ""}`}
        data-endpoint-id={endpointKeyForBoundary(portKind, port.id)}
        title={port.summary || port.name}
        onClick={() =>
          onPick(
            {
              kind: "boundary",
              portKind,
              portId: port.id
            },
            endpointLabelForBoundary(port)
          )
        }
      >
        {side === "right" ? null : <span className="structure-port-handle is-source" />}
        <div className="structure-port-card__slot" />
        {side === "right" ? <span className="structure-port-handle is-target" /> : null}
      </button>

      {side === "right" ? (
        <div className="structure-boundary-port-label is-right" title={port.summary || port.name}>
          <strong>{port.name}</strong>
        </div>
      ) : null}
    </div>
  );
}

function StructureNodeCard({
  node,
  isSelected,
  onSelect,
  pendingEndpointKey,
  onPickEndpoint,
  onStartDrag
}: {
  node: ObjectStructureNodeDefinition;
  isSelected: boolean;
  onSelect: () => void;
  pendingEndpointKey: string | null;
  onPickEndpoint: (endpoint: ObjectStructureRouteEndpointDefinition, label: string) => void;
  onStartDrag: (event: ReactPointerEvent<HTMLDivElement>, node: ObjectStructureNodeDefinition) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`structure-node-card${isSelected ? " is-selected" : ""}`}
      style={{ left: node.position.x, top: node.position.y }}
      title={node.summary}
      onClick={onSelect}
      onPointerDown={(event) => onStartDrag(event, node)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="structure-node-card__header">
        <div>
          <strong>{node.title}</strong>
          <span>{node.kind}</span>
        </div>
      </div>

      <div className="structure-node-card__ports">
        <div className="structure-node-port-col">
          {node.inputs.map((port) => (
            <button
              key={port.id}
              type="button"
              className={`structure-node-port is-input${pendingEndpointKey === endpointKeyForNode(node.id, port.id) ? " is-pending" : ""}`}
              data-endpoint-id={endpointKeyForNode(node.id, port.id)}
              onClick={(event) => {
                event.stopPropagation();
                onPickEndpoint(
                  {
                    kind: "node",
                    nodeId: node.id,
                    portId: port.id
                  },
                  endpointLabelForNode(node, port.name)
                );
              }}
            >
              <span className="structure-port-handle is-target" />
              <span>{port.name}</span>
            </button>
          ))}
        </div>
        <div className="structure-node-port-col">
          {node.outputs.map((port) => (
            <button
              key={port.id}
              type="button"
              className={`structure-node-port is-output${pendingEndpointKey === endpointKeyForNode(node.id, port.id) ? " is-pending" : ""}`}
              data-endpoint-id={endpointKeyForNode(node.id, port.id)}
              onClick={(event) => {
                event.stopPropagation();
                onPickEndpoint(
                  {
                    kind: "node",
                    nodeId: node.id,
                    portId: port.id
                  },
                  endpointLabelForNode(node, port.name)
                );
              }}
            >
              <span>{port.name}</span>
              <span className="structure-port-handle is-source" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function resolveRouteGeometry(root: HTMLDivElement, routes: ObjectStructureRouteDefinition[]) {
  const next: RouteGeometry[] = [];

  routes.forEach((route) => {
    const source = root.querySelector<HTMLElement>(`[data-endpoint-id="${endpointKey(route.from)}"]`);
    const target = root.querySelector<HTMLElement>(`[data-endpoint-id="${endpointKey(route.to)}"]`);
    if (!source || !target) {
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const x1 = sourceRect.left - rootRect.left + sourceRect.width / 2;
    const y1 = sourceRect.top - rootRect.top + sourceRect.height / 2;
    const x2 = targetRect.left - rootRect.left + targetRect.width / 2;
    const y2 = targetRect.top - rootRect.top + targetRect.height / 2;
    const delta = Math.max(36, Math.abs(x2 - x1) * 0.28);
    const a = x2 >= x1 ? x1 + delta : x1 - delta;
    const b = x2 >= x1 ? x2 - delta : x2 + delta;
    const midX = (a + b) / 2;
    const midY = (y1 + y2) / 2;

    next.push({
      id: route.id,
      label: route.label,
      d: `M ${x1} ${y1} L ${a} ${y1} L ${b} ${y2} L ${x2} ${y2}`,
      labelX: midX,
      labelY: midY - 8
    });
  });

  return next;
}

function getStructureCanvasHeight(nodes: ObjectStructureNodeDefinition[], positions: Record<string, { x: number; y: number }>) {
  if (!nodes.length) {
    return 440;
  }

  const maxY = Math.max(...nodes.map((node) => (positions[node.id]?.y ?? node.position.y) + 210));
  return Math.max(440, maxY + 48);
}

export function ObjectStructureCanvas() {
  const project = useStudioStore((state) => state.project);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectItem = useStudioStore((state) => state.selectItem);
  const ensureObjectStructure = useStudioStore((state) => state.ensureObjectStructure);
  const addStructureRoute = useStudioStore((state) => state.addStructureRoute);
  const updateStructureNodePosition = useStudioStore((state) => state.updateStructureNodePosition);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry[]>([]);
  const [pendingEndpoint, setPendingEndpoint] = useState<PendingEndpoint | null>(null);
  const [livePositions, setLivePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);

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
  const boundary = useMemo(() => groupBoundaryPorts(object), [object]);

  useEffect(() => {
    if (!object.structure) {
      ensureObjectStructure(object.id, `Internal view for ${object.name}.`);
    }
  }, [ensureObjectStructure, object]);

  useEffect(() => {
    if (!structure) {
      setLivePositions({});
      return;
    }

    setLivePositions(
      structure.nodes.reduce<Record<string, { x: number; y: number }>>((acc, node) => {
        acc[node.id] = node.position;
        return acc;
      }, {})
    );
  }, [structure]);

  useLayoutEffect(() => {
    if (!rootRef.current || !structure) {
      setRouteGeometry([]);
      return;
    }

    const update = () => {
      if (!rootRef.current) {
        return;
      }
      setRouteGeometry(resolveRouteGeometry(rootRef.current, structure.routes));
    };

    update();
    const timer = window.setTimeout(update, 60);
    window.addEventListener("resize", update);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", update);
    };
  }, [livePositions, selectedItemId, selectedItemType, structure]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const activeDrag = dragState;

    function handlePointerMove(event: PointerEvent) {
      const root = rootRef.current;
      if (!root) {
        return;
      }

      const nextX = activeDrag.originX + (event.clientX - activeDrag.startX);
      const nextY = activeDrag.originY + (event.clientY - activeDrag.startY);
      const maxX = Math.max(16, root.clientWidth - activeDrag.nodeWidth - 16);
      const maxY = Math.max(16, root.clientHeight - activeDrag.nodeHeight - 16);

      setLivePositions((current) => ({
        ...current,
        [activeDrag.nodeId]: {
          x: Math.min(Math.max(16, nextX), maxX),
          y: Math.min(Math.max(16, nextY), maxY)
        }
      }));
    }

    function handlePointerUp() {
      const finalPosition = livePositions[activeDrag.nodeId];
      if (finalPosition) {
        updateStructureNodePosition(object.id, activeDrag.nodeId, finalPosition);
      }
      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, livePositions, object.id, updateStructureNodePosition]);

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

  const currentStructure = structure;
  const structureHeight = getStructureCanvasHeight(currentStructure.nodes, livePositions);

  function handleStartDrag(event: ReactPointerEvent<HTMLDivElement>, node: ObjectStructureNodeDefinition) {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    const target = event.currentTarget.getBoundingClientRect();
    const position = livePositions[node.id] ?? node.position;
    setDragState({
      nodeId: node.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      nodeWidth: target.width,
      nodeHeight: target.height
    });
  }

  function handlePickEndpoint(endpoint: ObjectStructureRouteEndpointDefinition, label: string) {
    const key = endpoint.kind === "boundary"
      ? endpointKeyForBoundary(endpoint.portKind || "input", endpoint.portId)
      : endpointKeyForNode(endpoint.nodeId || "", endpoint.portId);

    if (!pendingEndpoint) {
      setPendingEndpoint({ endpoint, key, label });
      return;
    }

    if (pendingEndpoint.key === key) {
      setPendingEndpoint(null);
      return;
    }

    addStructureRoute(object.id, {
      label: `${pendingEndpoint.label} -> ${label}`,
      from: pendingEndpoint.endpoint,
      to: endpoint
    });
    setPendingEndpoint(null);
  }

  return (
    <div className="machine-canvas structure-canvas">
      <div className="structure-canvas__header">
        <div className="structure-canvas__hint">
          <strong>Use Library on the left</strong>
          <span>
            Place blocks into the canvas, then click one pin and another pin to create a connection
            {pendingEndpoint ? ` (${pendingEndpoint.label} selected)` : "."}
          </span>
        </div>
      </div>

      <div className="structure-inline-canvas">
        <div className="structure-canvas-object-chip">
          <span className="system-object-node__type">{object.type}</span>
          <strong>{object.name}</strong>
          <span>{countBoundaryPorts(object)} ports</span>
          <span>{currentStructure.nodes.length} internal</span>
        </div>

        <div className="structure-object-canvas structure-object-canvas--schematic" style={{ minHeight: structureHeight }} ref={rootRef}>
          <svg className="structure-routes" aria-hidden="true">
            {routeGeometry.map((route) => (
              <g key={route.id}>
                <path d={route.d} className="structure-route-path" />
                <text x={route.labelX} y={route.labelY} className="structure-route-label">
                  {route.label}
                </text>
              </g>
            ))}
          </svg>

          <div className="structure-boundary-side structure-boundary-side--left">
            {boundary.left.map((group) => (
              <section key={group.title} className="structure-boundary-group structure-boundary-group--flat">
                {group.ports.map((port) => (
                  <StructureBoundaryPort
                    key={port.id}
                    port={port}
                    portKind={group.kind}
                    side="left"
                    isPending={pendingEndpoint?.key === endpointKeyForBoundary(group.kind, port.id)}
                    onPick={handlePickEndpoint}
                  />
                ))}
              </section>
            ))}
          </div>

          <div className="structure-node-layer structure-node-layer--schematic">
            {structure.nodes.length ? (
                  structure.nodes.map((node) => (
                    <StructureNodeCard
                      key={node.id}
                      node={{
                        ...node,
                        position: livePositions[node.id] ?? node.position
                      }}
                      isSelected={selectedItemType === "subobject" && selectedItemId === node.id}
                      pendingEndpointKey={pendingEndpoint?.key ?? null}
                      onPickEndpoint={handlePickEndpoint}
                      onStartDrag={handleStartDrag}
                      onSelect={() =>
                        selectItem("subobject", node.id, {
                          objectId: object.id,
                      machineId: object.behavior?.machineId ?? null
                    })
                  }
                />
              ))
            ) : (
              <div className="structure-center-empty">
                <strong>No internal parts yet</strong>
                <span>Add nested objects or logic blocks directly inside this object.</span>
              </div>
            )}
          </div>

          <div className="structure-boundary-side structure-boundary-side--right">
            {boundary.right.map((group) => (
              <section key={group.title} className="structure-boundary-group structure-boundary-group--flat">
                {group.ports.map((port) => (
                  <StructureBoundaryPort
                    key={port.id}
                    port={port}
                    portKind={group.kind}
                    side="right"
                    isPending={pendingEndpoint?.key === endpointKeyForBoundary(group.kind, port.id)}
                    onPick={handlePickEndpoint}
                  />
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
