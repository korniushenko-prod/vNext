import { useEffect, useMemo, useState } from "react";
import type { BehaviorKind, DataType, ObjectContractFamily } from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";

const behaviorKindOptions: Array<{ value: BehaviorKind; label: string }> = [
  { value: "control", label: "Control" },
  { value: "sequence", label: "Sequence" },
  { value: "monitoring", label: "Monitoring" }
];

const contractFamilyOptions: Array<{ value: ObjectContractFamily; label: string }> = [
  { value: "commands", label: "Commands" },
  { value: "inputs", label: "Inputs" },
  { value: "outputs", label: "Outputs" },
  { value: "status", label: "Status" },
  { value: "permissions", label: "Permissions" },
  { value: "faults", label: "Faults" }
];

const dataTypeOptions: Array<{ value: DataType; label: string }> = [
  { value: "bool", label: "Bool" },
  { value: "number", label: "Number" },
  { value: "string", label: "String" },
  { value: "enum", label: "Enum" }
];

export function ObjectFullEditorModal() {
  const project = useStudioStore((state) => state.project);
  const fullObjectEditorObjectId = useStudioStore((state) => state.fullObjectEditorObjectId);
  const closeFullObjectEditor = useStudioStore((state) => state.closeFullObjectEditor);
  const updateObjectMeta = useStudioStore((state) => state.updateObjectMeta);
  const addObjectPort = useStudioStore((state) => state.addObjectPort);
  const updateObjectPort = useStudioStore((state) => state.updateObjectPort);
  const deleteObjectPort = useStudioStore((state) => state.deleteObjectPort);
  const [activeTab, setActiveTab] = useState<"general" | "contract">("general");
  const [activeContractFamily, setActiveContractFamily] = useState<ObjectContractFamily>("inputs");

  const object = project.objects.find((item) => item.id === fullObjectEditorObjectId) ?? null;
  const candidateParents = useMemo(
    () => project.objects.filter((item) => item.id !== fullObjectEditorObjectId),
    [project.objects, fullObjectEditorObjectId]
  );

  useEffect(() => {
    if (fullObjectEditorObjectId) {
      setActiveTab("general");
      setActiveContractFamily("inputs");
    }
  }, [fullObjectEditorObjectId]);

  if (!object) {
    return null;
  }

  const families: Array<{ key: ObjectContractFamily; ports: typeof object.commands }> = [
    { key: "commands", ports: object.commands },
    { key: "inputs", ports: object.inputs },
    { key: "outputs", ports: object.outputs },
    { key: "status", ports: object.status },
    { key: "permissions", ports: object.permissions },
    { key: "faults", ports: object.faults }
  ];
  const activeFamily = families.find((family) => family.key === activeContractFamily) ?? families[0];

  return (
    <div className="overlay-shell" role="dialog" aria-modal="true" aria-label={`Full editor for ${object.name}`}>
      <div className="overlay-backdrop" onClick={closeFullObjectEditor} />
      <section className="object-editor-overlay object-editor-overlay--modal">
        <header className="object-editor-overlay__header">
          <div>
            <span className="topology-eyebrow">Full Editor</span>
            <h3>{object.name}</h3>
            <p>{object.summary}</p>
          </div>
          <button type="button" className="overlay-close-button" onClick={closeFullObjectEditor}>
            Close
          </button>
        </header>

        <div className="object-editor-overlay__tabs">
          <button
            type="button"
            className={activeTab === "general" ? "is-active" : ""}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          <button
            type="button"
            className={activeTab === "contract" ? "is-active" : ""}
            onClick={() => setActiveTab("contract")}
          >
            Contract
          </button>
        </div>

        {activeTab === "general" ? (
          <form
            key={`general-${object.id}`}
            className="object-editor-overlay__body"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const parentValue = String(formData.get("parentObjectId") ?? "");
              updateObjectMeta(object.id, {
                name: String(formData.get("name") ?? object.name),
                type: String(formData.get("type") ?? object.type),
                behaviorKind: String(formData.get("behaviorKind") ?? object.behaviorKind) as BehaviorKind,
                summary: String(formData.get("summary") ?? object.summary),
                parentObjectId: parentValue ? parentValue : null
              });
              closeFullObjectEditor();
            }}
          >
            <label className="overlay-field">
              <span>Name</span>
              <input name="name" defaultValue={object.name} />
            </label>
            <label className="overlay-field">
              <span>Type</span>
              <input name="type" defaultValue={object.type} />
            </label>
            <label className="overlay-field">
              <span>Behavior</span>
              <select name="behaviorKind" defaultValue={object.behaviorKind}>
                {behaviorKindOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="overlay-field">
              <span>Parent</span>
              <select name="parentObjectId" defaultValue={object.parentObjectId ?? ""}>
                <option value="">System level</option>
                {candidateParents.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="overlay-field overlay-field--wide">
              <span>Summary</span>
              <textarea name="summary" defaultValue={object.summary} rows={4} />
            </label>
            <div className="overlay-actions">
              <button type="submit" className="inspector-link">
                Save Object
              </button>
            </div>
          </form>
        ) : (
          <div className="object-editor-overlay__body object-editor-overlay__body--contract">
            <form
              key={`create-${object.id}-${activeContractFamily}`}
              className="overlay-port-create"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                addObjectPort(object.id, activeContractFamily, {
                  name: String(formData.get("name") ?? ""),
                  dataType: String(formData.get("dataType") ?? "bool") as DataType,
                  summary: String(formData.get("summary") ?? "")
                });
                event.currentTarget.reset();
              }}
            >
              <div className="overlay-port-family-tabs" role="tablist" aria-label="Contract families">
                {contractFamilyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={activeContractFamily === option.value ? "is-active" : ""}
                    onClick={() => setActiveContractFamily(option.value)}
                  >
                    {option.label}
                    <span>{families.find((family) => family.key === option.value)?.ports.length ?? 0}</span>
                  </button>
                ))}
              </div>

              <div className="overlay-port-create__row">
                <label className="overlay-inline-field">
                  <span>Name</span>
                  <input name="name" placeholder="fuelReady" />
                </label>
                <label className="overlay-inline-field overlay-inline-field--type">
                  <span>Type</span>
                  <select name="dataType" defaultValue="bool">
                    {dataTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="overlay-inline-field overlay-inline-field--summary">
                  <span>Summary</span>
                  <input name="summary" placeholder="What this port means to other objects." />
                </label>
                <button type="submit" className="inspector-link">
                  Add Port
                </button>
              </div>
            </form>

            <section className="overlay-port-group overlay-port-group--active overlay-port-group--scroll">
              <header>
                <strong>{contractFamilyOptions.find((option) => option.value === activeFamily.key)?.label ?? activeFamily.key}</strong>
                <span>{activeFamily.ports.length}</span>
              </header>
              {activeFamily.ports.length ? (
                <ul className="overlay-port-list overlay-port-list--compact">
                  {activeFamily.ports.map((port) => (
                    <li key={port.id}>
                      <form
                        className="overlay-port-row-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);
                          updateObjectPort(object.id, activeFamily.key, port.id, {
                            name: String(formData.get("name") ?? port.name),
                            dataType: String(formData.get("dataType") ?? port.dataType) as DataType,
                            summary: String(formData.get("summary") ?? port.summary)
                          });
                        }}
                      >
                        <div className="overlay-port-row__main">
                          <input name="name" defaultValue={port.name} aria-label={`${port.name} name`} />
                          <select name="dataType" defaultValue={port.dataType} aria-label={`${port.name} type`}>
                            {dataTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            name="summary"
                            defaultValue={port.summary}
                            placeholder="What this port means to other objects."
                            aria-label={`${port.name} summary`}
                          />
                        </div>
                        <div className="overlay-port-row__actions">
                          <button type="submit" className="inspector-link">
                            Save
                          </button>
                          <button
                            type="button"
                            className="overlay-port-delete"
                            onClick={() => deleteObjectPort(object.id, activeFamily.key, port.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-copy">No ports yet.</p>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
