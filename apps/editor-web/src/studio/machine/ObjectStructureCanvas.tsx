import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  ObjectInterfacePortDefinition,
  ObjectStructureNodeDefinition,
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
      { title: "Alarms", kind: "alarm" as const, ports: object.alarms }
    ].filter((group) => group.ports.length > 0)
  };
}

function StructureBoundaryPort({
  port,
  portKind,
  side
}: {
  port: ObjectInterfacePortDefinition;
  portKind: string;
  side: "left" | "right";
}) {
  return (
    <div className={`structure-port-card is-${side}`} data-endpoint-id={endpointKeyForBoundary(portKind, port.id)}>
      {side === "right" ? null : <span className="structure-port-handle is-source" />}
      <div className="structure-port-card__text">
        <strong>{port.name}</strong>
        <span>{port.summary}</span>
      </div>
      {side === "right" ? <span className="structure-port-handle is-target" /> : null}
    </div>
  );
}

function StructureNodeCard({
  node,
  isSelected,
  onSelect
}: {
  node: ObjectStructureNodeDefinition;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`structure-node-card${isSelected ? " is-selected" : ""}`}
      style={{ left: node.position.x, top: node.position.y }}
      onClick={onSelect}
    >
      <div className="structure-node-card__header">
        <div>
          <strong>{node.title}</strong>
          <span>{node.kind}</span>
        </div>
      </div>
      <p>{node.summary}</p>

      <div className="structure-node-card__ports">
        <div className="structure-node-port-col">
          {node.inputs.map((port) => (
            <div key={port.id} className="structure-node-port is-input" data-endpoint-id={endpointKeyForNode(node.id, port.id)}>
              <span className="structure-port-handle is-target" />
              <span>{port.name}</span>
            </div>
          ))}
        </div>
        <div className="structure-node-port-col">
          {node.outputs.map((port) => (
            <div key={port.id} className="structure-node-port is-output" data-endpoint-id={endpointKeyForNode(node.id, port.id)}>
              <span>{port.name}</span>
              <span className="structure-port-handle is-source" />
            </div>
          ))}
        </div>
      </div>
    </button>
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
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const delta = Math.max(80, Math.abs(x2 - x1) * 0.35);

    next.push({
      id: route.id,
      label: route.label,
      d: `M ${x1} ${y1} C ${x1 + delta} ${y1}, ${x2 - delta} ${y2}, ${x2} ${y2}`,
      labelX: midX,
      labelY: midY - 8
    });
  });

  return next;
}

export function ObjectStructureCanvas() {
  const project = useStudioStore((state) => state.project);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectItem = useStudioStore((state) => state.selectItem);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry[]>([]);

  const object = project.objects.find((item) => item.id === selectedObjectId) ?? project.objects[0];
  const structure = object.structure ?? null;
  const boundary = useMemo(() => groupBoundaryPorts(object), [object]);

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
  }, [structure, selectedItemId, selectedItemType]);

  if (!structure) {
    return (
      <div className="machine-canvas topology-canvas">
        <section className="panel-card">
          <h3>No structure view</h3>
          <p className="muted-copy">Selected object does not yet expose a structure lens.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="machine-canvas structure-canvas" ref={rootRef}>
      <div className="structure-canvas__header">
        <div>
          <span className="topology-eyebrow">Structure Lens</span>
          <h3>{object.name}</h3>
          <p>{structure.summary}</p>
        </div>
      </div>

      <div className="structure-shell">
        <div className="structure-boundary-rails">
          <div className="structure-boundary-rail">
            {boundary.left.map((group) => (
              <section key={group.title} className="structure-boundary-group">
                <h4>{group.title}</h4>
                {group.ports.map((port) => (
                  <StructureBoundaryPort key={port.id} port={port} portKind={group.kind} side="left" />
                ))}
              </section>
            ))}
          </div>

          <div className="structure-center-pane">
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

            <div className="structure-node-layer">
              {structure.nodes.map((node) => (
                <StructureNodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedItemType === "subobject" && selectedItemId === node.id}
                  onSelect={() =>
                    selectItem("subobject", node.id, {
                      objectId: object.id,
                      machineId: object.behavior?.machineId ?? null
                    })
                  }
                />
              ))}
            </div>
          </div>

          <div className="structure-boundary-rail">
            {boundary.right.map((group) => (
              <section key={group.title} className="structure-boundary-group">
                <h4>{group.title}</h4>
                {group.ports.map((port) => (
                  <StructureBoundaryPort key={port.id} port={port} portKind={group.kind} side="right" />
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
