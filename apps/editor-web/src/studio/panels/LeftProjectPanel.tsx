import { useStudioStore } from "../store/studioStore";

function TreeButton({
  label,
  meta,
  selected,
  onClick
}: {
  label: string;
  meta?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`tree-item${selected ? " is-selected" : ""}`} onClick={onClick}>
      <span className="tree-item__label">{label}</span>
      {meta ? <span className="tree-item__meta">{meta}</span> : null}
    </button>
  );
}

function TreeLabel({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="tree-item tree-item--label">
      <span className="tree-item__label">{label}</span>
      {meta ? <span className="tree-item__meta">{meta}</span> : null}
    </div>
  );
}

export function LeftProjectPanel() {
  const project = useStudioStore((state) => state.project);
  const activeWorkspace = useStudioStore((state) => state.activeWorkspace);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const setActiveWorkspace = useStudioStore((state) => state.setActiveWorkspace);
  const setMachineViewMode = useStudioStore((state) => state.setMachineViewMode);
  const setObjectViewLens = useStudioStore((state) => state.setObjectViewLens);
  const selectItem = useStudioStore((state) => state.selectItem);

  const selectedObject = project.objects.find((item) => item.id === selectedObjectId) ?? project.objects[0];

  return (
    <aside className="studio-panel studio-panel--left">
      <section className="panel-card tree-panel">
        <div className="tree-panel__header">
          <h3>Project Tree</h3>
          <span>{project.name}</span>
        </div>

        <div className="tree-root">
          <div className="tree-group">
            <TreeLabel label={project.name} meta="project" />
          </div>

          <div className="tree-group">
            <TreeLabel label="System Objects" meta={`${project.objects.length}`} />
            <div className="tree-children">
              {project.objects.map((object) => {
                const objectMachine = object.behavior?.machineId
                  ? project.machines.find((item) => item.id === object.behavior?.machineId) ?? null
                  : null;
                const isActiveObject = object.id === selectedObject.id;

                return (
                  <div key={object.id} className="tree-branch">
                    <TreeButton
                      label={object.name}
                      meta={`${object.type} / ${object.behaviorKind}`}
                      selected={selectedItemType === "object" && selectedItemId === object.id}
                      onClick={() => {
                        setActiveWorkspace("machine");
                        setMachineViewMode("topology");
                        selectItem("object", object.id, {
                          objectId: object.id,
                          machineId: objectMachine?.id ?? null
                        });
                      }}
                    />

                    {activeWorkspace === "machine" && isActiveObject ? (
                      <div className="tree-children">
                        <TreeLabel
                          label="Contract"
                          meta={`${object.commands.length + object.inputs.length + object.outputs.length + object.status.length + object.permissions.length + object.alarms.length} ports`}
                        />
                        <div className="tree-children">
                          {[...object.commands, ...object.inputs, ...object.outputs, ...object.status, ...object.permissions, ...object.alarms].map((port) => (
                            <TreeLabel key={port.id} label={port.name} meta={port.kind} />
                          ))}
                        </div>

                        {object.structure ? (
                          <>
                            <TreeLabel label="Internal Parts" meta={`${object.structure.nodes.length}`} />
                            <div className="tree-children">
                              {object.structure.nodes.map((node) => (
                                <TreeButton
                                  key={node.id}
                                  label={node.title}
                                  meta={node.kind}
                                  selected={selectedItemType === "subobject" && selectedItemId === node.id}
                                  onClick={() => {
                                    setMachineViewMode("object");
                                    setObjectViewLens("structure");
                                    selectItem("subobject", node.id, {
                                      objectId: object.id,
                                      machineId: objectMachine?.id ?? null
                                    });
                                  }}
                                />
                              ))}
                            </div>

                            <TreeLabel label="Internal Links" meta={`${object.structure.routes.length}`} />
                            <div className="tree-children">
                              {object.structure.routes.map((route) => (
                                <TreeLabel key={route.id} label={route.label} meta={route.id} />
                              ))}
                            </div>
                          </>
                        ) : null}

                        {objectMachine ? (
                          <>
                            <TreeLabel label="Behavior" meta={objectMachine.name} />
                            <div className="tree-children">
                              <TreeButton
                                label="Sequence"
                                meta={`${objectMachine.states.length} states`}
                                selected={selectedItemType === "machine" && selectedItemId === objectMachine.id}
                                onClick={() => {
                                  setMachineViewMode("object");
                                  setObjectViewLens("behavior");
                                  selectItem("machine", objectMachine.id, {
                                    objectId: object.id,
                                    machineId: objectMachine.id
                                  });
                                }}
                              />
                              {objectMachine.sections.map((section) => (
                                <div key={section.id} className="tree-branch">
                                  <TreeButton
                                    label={section.name}
                                    meta="section"
                                    selected={selectedItemType === "section" && selectedItemId === section.id}
                                    onClick={() => {
                                      setMachineViewMode("object");
                                      setObjectViewLens("behavior");
                                      selectItem("section", section.id, {
                                        objectId: object.id,
                                        machineId: objectMachine.id,
                                        sectionId: section.id
                                      });
                                    }}
                                  />
                                  <div className="tree-children">
                                    {objectMachine.states
                                      .filter((state) => state.sectionId === section.id)
                                      .map((state) => (
                                        <TreeButton
                                          key={state.id}
                                          label={state.name}
                                          meta={state.kind}
                                          selected={selectedItemType === "state" && selectedItemId === state.id}
                                          onClick={() => {
                                            setMachineViewMode("object");
                                            setObjectViewLens("behavior");
                                            selectItem("state", state.id, {
                                              objectId: object.id,
                                              machineId: objectMachine.id,
                                              sectionId: state.sectionId,
                                              regionId: state.regionId
                                            });
                                          }}
                                        />
                                      ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : object.behaviorKind !== "sequence" ? (
                          <>
                            <TreeLabel label="Behavior" meta={object.behaviorKind} />
                            <div className="tree-children">
                              <TreeButton
                                label="Open behavior view"
                                meta={`${object.behaviorKind} lens`}
                                selected={selectedItemType === "object" && selectedItemId === object.id}
                                onClick={() => {
                                  setMachineViewMode("object");
                                  setObjectViewLens("behavior");
                                  selectItem("object", object.id, {
                                    objectId: object.id,
                                    machineId: null
                                  });
                                }}
                              />
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="tree-group">
            <TreeLabel label="Signals" meta={`${project.signals.length}`} />
            <div className="tree-children">
              {project.signals
                .filter((signal) => signal.layer === "semantic")
                .slice(0, 12)
                .map((signal) => (
                  <TreeButton
                    key={signal.id}
                    label={signal.name}
                    meta={signal.layer}
                    selected={selectedItemType === "signal" && selectedItemId === signal.id}
                    onClick={() => {
                      setActiveWorkspace("logic");
                      selectItem("signal", signal.id);
                    }}
                  />
                ))}
            </div>
          </div>

          <div className="tree-group">
            <TreeLabel label="Blocks" meta={`${project.blocks.length}`} />
            <div className="tree-children">
              {project.blocks.slice(0, 12).map((block) => (
                <TreeButton
                  key={block.id}
                  label={block.name}
                  meta={block.type}
                  selected={selectedItemType === "block" && selectedItemId === block.id}
                  onClick={() => {
                    setActiveWorkspace("logic");
                    selectItem("block", block.id);
                  }}
                />
              ))}
            </div>
          </div>

          <div className="tree-group">
            <TreeLabel label="Bindings" meta={`${project.bindings.length}`} />
            <div className="tree-children">
              {project.bindings.slice(0, 12).map((binding) => (
                <TreeButton
                  key={binding.id}
                  label={binding.physicalSource}
                  meta={binding.signalId}
                  selected={selectedItemType === "binding" && selectedItemId === binding.id}
                  onClick={() => {
                    setActiveWorkspace("bind");
                    selectItem("binding", binding.id);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
