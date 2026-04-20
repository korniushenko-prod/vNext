import type { ObjectCompositionLinkDefinition, ObjectInterfacePortDefinition, PlcObjectDefinition } from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";

function groupPorts(object: PlcObjectDefinition) {
  return [
    { title: "Commands", ports: object.commands },
    { title: "Inputs", ports: object.inputs },
    { title: "Outputs", ports: object.outputs },
    { title: "Status", ports: object.status },
    { title: "Permissions", ports: object.permissions },
    { title: "Alarms", ports: object.alarms }
  ].filter((group) => group.ports.length > 0);
}

function PortList({ ports }: { ports: ObjectInterfacePortDefinition[] }) {
  return (
    <ul className="topology-port-list">
      {ports.map((port) => (
        <li key={port.id}>
          <strong>{port.name}</strong>
          <span>{port.summary}</span>
        </li>
      ))}
    </ul>
  );
}

function SideObjectCard({
  object,
  relationLabel,
  isSelected,
  onSelect
}: {
  object: PlcObjectDefinition;
  relationLabel: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`topology-side-card${isSelected ? " is-selected" : ""}`} onClick={onSelect}>
      <span className="topology-side-card__relation">{relationLabel}</span>
      <strong>{object.name}</strong>
      <span>{object.type}</span>
      <p>{object.summary}</p>
    </button>
  );
}

function LinkChip({
  link,
  source,
  target,
  isSelected,
  onSelect
}: {
  link: ObjectCompositionLinkDefinition;
  source: PlcObjectDefinition;
  target: PlcObjectDefinition;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`topology-link-chip${isSelected ? " is-selected" : ""}`} onClick={onSelect}>
      <span className={`topology-link-chip__kind kind-${link.kind}`}>{link.kind}</span>
      <strong>{link.label}</strong>
      <span>
        {source.name} {"->"} {target.name}
      </span>
      <p>{link.summary}</p>
    </button>
  );
}

export function ObjectTopologyCanvas() {
  const project = useStudioStore((state) => state.project);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const setMachineViewMode = useStudioStore((state) => state.setMachineViewMode);
  const selectItem = useStudioStore((state) => state.selectItem);

  const selectedObject = project.objects.find((item) => item.id === selectedObjectId) ?? project.objects[0];
  const incomingLinks = project.compositionLinks.filter((link) => link.targetObjectId === selectedObject.id);
  const outgoingLinks = project.compositionLinks.filter((link) => link.sourceObjectId === selectedObject.id);

  const incomingObjects = incomingLinks
    .map((link) => project.objects.find((item) => item.id === link.sourceObjectId))
    .filter((item): item is PlcObjectDefinition => Boolean(item));
  const outgoingObjects = outgoingLinks
    .map((link) => project.objects.find((item) => item.id === link.targetObjectId))
    .filter((item): item is PlcObjectDefinition => Boolean(item));

  const machine = selectedObject.behavior?.machineId
    ? project.machines.find((item) => item.id === selectedObject.behavior?.machineId) ?? null
    : null;

  return (
    <div className="machine-canvas topology-canvas">
      <div className="topology-layout">
        <section className="topology-column">
          <header>
            <span>Incoming Context</span>
            <strong>What this object depends on</strong>
          </header>
          <div className="topology-column__cards">
            {incomingObjects.map((object) => {
              const relation = incomingLinks.find((link) => link.sourceObjectId === object.id);
              return (
                <SideObjectCard
                  key={object.id}
                  object={object}
                  relationLabel={relation?.label ?? "related"}
                  isSelected={selectedObject.id === object.id}
                  onSelect={() => selectItem("object", object.id, { objectId: object.id })}
                />
              );
            })}
          </div>
        </section>

        <section className="topology-center-card">
          <div className="topology-center-card__header">
            <div>
              <span className="topology-eyebrow">Selected Object</span>
              <h3>{selectedObject.name}</h3>
              <p>{selectedObject.summary}</p>
            </div>
            <div className="topology-center-card__meta">
              <span>{selectedObject.type}</span>
              <span>{selectedObject.behaviorKind}</span>
            </div>
          </div>

          <div className="topology-interface-grid">
            {groupPorts(selectedObject).map((group) => (
              <section key={group.title} className="topology-port-group">
                <h4>{group.title}</h4>
                <PortList ports={group.ports} />
              </section>
            ))}
          </div>

          <div className="topology-center-card__footer">
            <div className="summary-card compact-card">
              <span>Behavior</span>
              <strong>{selectedObject.behavior?.summary ?? "No internal behavior view yet"}</strong>
            </div>
            <button
              type="button"
              className="topology-open-behavior"
              disabled={!machine}
              onClick={() => {
                if (!machine) {
                  return;
                }
                setMachineViewMode("object");
                selectItem("machine", machine.id, {
                  objectId: selectedObject.id,
                  machineId: machine.id
                });
              }}
            >
              {machine ? "Open Behavior View" : "Behavior view not defined"}
            </button>
          </div>
        </section>

        <section className="topology-column">
          <header>
            <span>Outgoing Context</span>
            <strong>What this object drives</strong>
          </header>
          <div className="topology-column__cards">
            {outgoingObjects.map((object) => {
              const relation = outgoingLinks.find((link) => link.targetObjectId === object.id);
              return (
                <SideObjectCard
                  key={object.id}
                  object={object}
                  relationLabel={relation?.label ?? "related"}
                  isSelected={selectedObject.id === object.id}
                  onSelect={() => selectItem("object", object.id, { objectId: object.id })}
                />
              );
            })}
          </div>
        </section>
      </div>

      <section className="topology-links-panel">
        <header>
          <span>Composition Links</span>
          <strong>Only public object contracts appear here</strong>
        </header>
        <div className="topology-link-grid">
          {[...incomingLinks, ...outgoingLinks].map((link) => {
            const source = project.objects.find((item) => item.id === link.sourceObjectId);
            const target = project.objects.find((item) => item.id === link.targetObjectId);
            if (!source || !target) {
              return null;
            }

            return (
              <LinkChip
                key={link.id}
                link={link}
                source={source}
                target={target}
                isSelected={selectedItemType === "object-link" && selectedItemId === link.id}
                onSelect={() =>
                  selectItem("object-link", link.id, {
                    objectId: selectedObject.id,
                    machineId: machine?.id ?? null
                  })
                }
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
