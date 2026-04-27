import { useState } from "react";
import type { DataType, ObjectContractFamily, PlcObjectDefinition } from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";

const dataTypeOptions: Array<{ value: DataType; label: string }> = [
  { value: "bool", label: "Bool" },
  { value: "number", label: "Number" },
  { value: "string", label: "String" },
  { value: "enum", label: "Enum" }
];

const boundaryPortFamilies: ObjectContractFamily[] = [
  "commands",
  "inputs",
  "outputs",
  "status",
  "permissions",
  "faults"
];

function familyLabel(family: ObjectContractFamily) {
  switch (family) {
    case "commands":
      return "Commands";
    case "inputs":
      return "Inputs";
    case "outputs":
      return "Outputs";
    case "status":
      return "Status";
    case "permissions":
      return "Permissions";
    case "faults":
      return "Faults";
  }
}

function familyActionLabel(family: ObjectContractFamily) {
  switch (family) {
    case "commands":
      return "Add Command";
    case "inputs":
      return "Add Input";
    case "outputs":
      return "Add Output";
    case "status":
      return "Add Status";
    case "permissions":
      return "Add Permission";
    case "faults":
      return "Add Fault";
  }
}

function familyPlaceholder(family: ObjectContractFamily) {
  switch (family) {
    case "commands":
      return "prepareFuel";
    case "inputs":
      return "headerPressure";
    case "outputs":
      return "fuelReady";
    case "status":
      return "groupState";
    case "permissions":
      return "runAllowed";
    case "faults":
      return "fuelGroupFault";
  }
}

export function ObjectPortComposer({ object }: { object: PlcObjectDefinition }) {
  const addObjectPort = useStudioStore((state) => state.addObjectPort);
  const [activePortFamily, setActivePortFamily] = useState<ObjectContractFamily>("inputs");
  const [portDraft, setPortDraft] = useState({
    name: "",
    dataType: "bool" as DataType,
    summary: ""
  });

  return (
    <form
      className="object-port-composer"
      onSubmit={(event) => {
        event.preventDefault();
        addObjectPort(object.id, activePortFamily, {
          name: portDraft.name,
          dataType: portDraft.dataType,
          summary: portDraft.summary
        });
        setPortDraft({
          name: "",
          dataType: "bool",
          summary: ""
        });
      }}
    >
      <div className="object-port-composer__header">
        <div className="object-port-composer__lead">
          <strong>Boundary Ports</strong>
        </div>

        <div className="structure-port-composer__families" role="tablist" aria-label="Boundary port family">
          {boundaryPortFamilies.map((family) => (
            <button
              key={family}
              type="button"
              className={`structure-port-family-chip${activePortFamily === family ? " is-active" : ""}`}
              onClick={() => setActivePortFamily(family)}
            >
              {familyLabel(family)}
            </button>
          ))}
        </div>
      </div>

      <div className="structure-port-composer__fields">
        <label className="inspector-form__field">
          <span>Name</span>
          <input
            value={portDraft.name}
            onChange={(event) => setPortDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder={familyPlaceholder(activePortFamily)}
          />
        </label>
        <label className="inspector-form__field">
          <span>Type</span>
          <select
            value={portDraft.dataType}
            onChange={(event) =>
              setPortDraft((current) => ({ ...current, dataType: event.target.value as DataType }))
            }
          >
            {dataTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inspector-form__field">
          <span>Summary</span>
          <input
            value={portDraft.summary}
            onChange={(event) => setPortDraft((current) => ({ ...current, summary: event.target.value }))}
            placeholder="Engineering meaning of this port."
          />
        </label>
        <button type="submit" className="inspector-link" disabled={!portDraft.name.trim()}>
          {familyActionLabel(activePortFamily)}
        </button>
      </div>
    </form>
  );
}
