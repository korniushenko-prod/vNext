import { useMemo, useState } from "react";
import type { IoBindingDefinition } from "../model/demoProject";
import {
  buildBoardPinRuntimeState,
  findSuggestedGpio,
  getBoardTemplateOptions,
  getChipTemplateOptions,
  getControllerTargetOptions,
  isBindingCompatibleWithPin,
  summarizeBoardIssues,
  type BoardPinRuntimeState
} from "../model/hardwareCatalog";
import { useStudioStore } from "../store/studioStore";

function findNextSignal(
  signals: ReturnType<typeof useStudioStore.getState>["project"]["signals"],
  signalId: string
) {
  return signals.find((signal) => signal.derivedFromSignalIds?.includes(signalId)) ?? null;
}

function getBindingDisplayName(binding: IoBindingDefinition) {
  return binding.signalId || binding.id;
}

function getBindingStatus(binding: IoBindingDefinition, pin: BoardPinRuntimeState | null) {
  if (binding.gpio === undefined || binding.gpio === null) {
    return "Unbound";
  }
  if (!pin) {
    return "Invalid GPIO";
  }
  if (!isBindingCompatibleWithPin(binding, pin)) {
    return "Invalid";
  }
  return "Bound";
}

function describeAvailability(pin: BoardPinRuntimeState) {
  switch (pin.availability) {
    case "assigned":
      return "assigned";
    case "shared":
      return "shared";
    case "warning":
      return "warning";
    case "exclusive":
      return "reserved";
    case "forbidden":
      return "forbidden";
    case "conflict":
      return "conflict";
    case "free":
    default:
      return "free";
  }
}

function makeBindingPreset(bindingKind: NonNullable<IoBindingDefinition["bindingKind"]>) {
  return {
    direction: bindingKind.includes("_in") ? ("input" as const) : ("output" as const),
    type: bindingKind.includes("analog") ? ("analog" as const) : ("bool" as const),
    bindingKind
  };
}

export function BindWorkspace() {
  const project = useStudioStore((state) => state.project);
  const signals = useStudioStore((state) => state.project.signals);
  const bindings = useStudioStore((state) => state.project.bindings);
  const bindContext = useStudioStore((state) => state.bindContext);
  const focusBindContext = useStudioStore((state) => state.focusBindContext);
  const selectedItemId = useStudioStore((state) => state.selectedItemId);
  const selectedItemType = useStudioStore((state) => state.selectedItemType);
  const selectItem = useStudioStore((state) => state.selectItem);
  const addBinding = useStudioStore((state) => state.addBinding);
  const updateBinding = useStudioStore((state) => state.updateBinding);
  const deleteBinding = useStudioStore((state) => state.deleteBinding);
  const updateProjectDeployment = useStudioStore((state) => state.updateProjectDeployment);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPinGpio, setSelectedPinGpio] = useState<number | null>(null);

  const filteredBindings = bindContext
    ? bindings.filter((binding) => bindContext.bindingIds.includes(binding.id))
    : bindings;

  const controllerTargets = useMemo(() => getControllerTargetOptions(), []);
  const boardTemplates = useMemo(() => getBoardTemplateOptions(), []);
  const chipTemplates = useMemo(() => getChipTemplateOptions(), []);

  const boardRuntime = useMemo(
    () => buildBoardPinRuntimeState(project.deployment, filteredBindings),
    [filteredBindings, project.deployment]
  );
  const boardIssues = useMemo(
    () => summarizeBoardIssues(filteredBindings, boardRuntime.pins),
    [filteredBindings, boardRuntime.pins]
  );

  const activeTarget = controllerTargets.find((target) => target.id === project.deployment.controller.target) ?? null;
  const availableBoardTemplates = activeTarget
    ? boardTemplates.filter((template) => activeTarget.boardTemplateIds.includes(template.id))
    : boardTemplates;

  const selectedBinding =
    (selectedItemType === "binding"
      ? filteredBindings.find((binding) => binding.id === selectedItemId) ?? null
      : null) ?? filteredBindings[0] ?? null;

  const selectedPin =
    boardRuntime.pins.find((pin) => pin.gpio === selectedPinGpio) ??
    (selectedBinding?.gpio !== undefined
      ? boardRuntime.pins.find((pin) => pin.gpio === selectedBinding.gpio) ?? null
      : null);

  function updateControllerField(
    field: "target" | "activeBoard" | "activeBoardTemplate" | "activeChipTemplate",
    value: string
  ) {
    const nextDeployment = structuredClone(project.deployment);
    nextDeployment.controller[field] = value;

    if (field === "target") {
      const nextTarget = controllerTargets.find((target) => target.id === value) ?? null;
      const nextBoardTemplate = nextTarget
        ? boardTemplates.find((template) => nextTarget.boardTemplateIds.includes(template.id)) ?? null
        : null;
      if (nextBoardTemplate) {
        nextDeployment.controller.activeBoardTemplate = nextBoardTemplate.id;
        nextDeployment.controller.activeChipTemplate = nextBoardTemplate.chipTemplateId;
      }
    }

    if (field === "activeBoardTemplate") {
      const nextBoardTemplate = boardTemplates.find((template) => template.id === value) ?? null;
      if (nextBoardTemplate) {
        nextDeployment.controller.activeChipTemplate = nextBoardTemplate.chipTemplateId;
      }
    }

    updateProjectDeployment(nextDeployment);
  }

  function toggleModuleFlag(section: "oled" | "led") {
    updateProjectDeployment({
      ...project.deployment,
      [section]: {
        ...project.deployment[section],
        enabled: !project.deployment[section].enabled
      }
    });
  }

  function addQuickBinding(bindingKind: NonNullable<IoBindingDefinition["bindingKind"]>) {
    const preset = makeBindingPreset(bindingKind);
    const suggestedGpio = findSuggestedGpio(
      {
        id: "",
        signalId: "",
        physicalSource: "",
        direction: preset.direction,
        type: preset.type,
        bindingKind,
        inverted: false,
        initialState: false
      },
      boardRuntime.pins
    );

    addBinding({
      direction: preset.direction,
      type: preset.type,
      bindingKind,
      gpio: suggestedGpio,
      resourceId: suggestedGpio !== undefined ? `gpio_${suggestedGpio}` : "",
      physicalSource: suggestedGpio !== undefined ? `GPIO${suggestedGpio}` : "",
      initialState: false,
      inverted: false
    });
    if (suggestedGpio !== undefined) {
      setSelectedPinGpio(suggestedGpio);
    }
  }

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h2>Bind</h2>
          <p className="muted-copy">
            Choose a ready board preset first. Then bind signals to real pins with as few steps as possible.
          </p>
        </div>
        <div className="inspector-actions">
          <button type="button" className="inspector-link" onClick={() => addQuickBinding("digital_out")}>
            New DO
          </button>
          <button type="button" className="inspector-link" onClick={() => addQuickBinding("digital_in")}>
            New DI
          </button>
          <button type="button" className="inspector-link" onClick={() => addQuickBinding("analog_in")}>
            New AI
          </button>
        </div>
      </div>

      {bindContext ? (
        <div className="workspace-context">
          <div>
            <strong>Filtered from Machine</strong>
            <p>{bindContext.title}</p>
          </div>
          <button type="button" className="inspector-link" onClick={() => focusBindContext(null)}>
            Clear filter
          </button>
        </div>
      ) : null}

      <section className="panel-card bind-preset-strip">
        <div className="bind-preset-strip__grid">
          <label className="bind-inline-field">
            <span>Controller</span>
            <select
              value={project.deployment.controller.target}
              onChange={(event) => updateControllerField("target", event.target.value)}
            >
              {controllerTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>

          <label className="bind-inline-field">
            <span>Board Preset</span>
            <select
              value={project.deployment.controller.activeBoardTemplate}
              onChange={(event) => updateControllerField("activeBoardTemplate", event.target.value)}
            >
              {availableBoardTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>

          <label className="bind-inline-field">
            <span>Chip</span>
            <select
              value={project.deployment.controller.activeChipTemplate}
              onChange={(event) => updateControllerField("activeChipTemplate", event.target.value)}
            >
              {chipTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>

          <label className="bind-inline-field">
            <span>Board Instance</span>
            <input
              value={project.deployment.controller.activeBoard}
              onChange={(event) => updateControllerField("activeBoard", event.target.value)}
            />
          </label>
        </div>

        <div className="bind-preset-strip__actions">
          <button type="button" className="inspector-link" onClick={() => setShowAdvanced((current) => !current)}>
            {showAdvanced ? "Hide Advanced" : "Advanced Hardware"}
          </button>
          <span className="machine-stage-chip">{boardIssues.length ? `${boardIssues.length} issues` : "Ready to bind"}</span>
        </div>
      </section>

      {showAdvanced ? (
        <section className="panel-card bind-advanced-strip">
          <div className="bind-advanced-strip__grid">
            <div className="bind-advanced-box">
              <strong>Reserved Modules</strong>
              <div className="bind-advanced-toggles">
                <label className="bind-toggle">
                  <span>OLED bus</span>
                  <input type="checkbox" checked={project.deployment.oled.enabled} onChange={() => toggleModuleFlag("oled")} />
                </label>
                <label className="bind-toggle">
                  <span>Status LED</span>
                  <input type="checkbox" checked={project.deployment.led.enabled} onChange={() => toggleModuleFlag("led")} />
                </label>
              </div>
            </div>

            <div className="bind-advanced-box">
              <strong>Warnings</strong>
              {boardIssues.length === 0 ? (
                <p className="muted-copy">No structural bind issues right now.</p>
              ) : (
                <ul className="plain-list bind-issue-list">
                  {boardIssues.slice(0, 4).map((issue, index) => (
                    <li key={`${issue.message}-${index}`} className={`bind-issue bind-issue--${issue.severity}`}>
                      <strong>{issue.severity === "fault" ? "Fault" : "Warning"}</strong>
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <div className="bind-layout bind-layout--compact">
        <section className="panel-card bind-main-panel">
          <div className="workspace-header">
            <div>
              <h3>I/O Bindings</h3>
              <p className="muted-copy">This is the main working list. Assign GPIO, inspect status, then move to Observe.</p>
            </div>
          </div>

          <div className="card-table">
            {filteredBindings.length === 0 ? (
              <div className="empty-state">
                <strong>No bindings yet</strong>
                <p>Create the first DI, DO or AI binding from the buttons above.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Signal</th>
                    <th>Kind</th>
                    <th>GPIO</th>
                    <th>Direction</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBindings.map((binding) => {
                    const rawSignal = signals.find((signal) => signal.id === binding.signalId) ?? null;
                    const conditionedSignal = rawSignal ? findNextSignal(signals, rawSignal.id) : null;
                    const semanticSignal = conditionedSignal ? findNextSignal(signals, conditionedSignal.id) : null;
                    const pin = binding.gpio !== undefined
                      ? boardRuntime.pins.find((candidate) => candidate.gpio === binding.gpio) ?? null
                      : null;
                    const suggestedGpio = findSuggestedGpio(binding, boardRuntime.pins);
                    const isSelected = selectedBinding?.id === binding.id;

                    return (
                      <tr
                        key={binding.id}
                        className={`${bindContext ? "is-contextual " : ""}${isSelected ? "is-selected-row" : ""}`.trim()}
                        onClick={() => {
                          selectItem("binding", binding.id);
                          if (binding.gpio !== undefined) {
                            setSelectedPinGpio(binding.gpio);
                          }
                        }}
                      >
                        <td>
                          <div className="bind-binding-title">
                            <strong>{getBindingDisplayName(binding)}</strong>
                            <span>{semanticSignal?.name ?? rawSignal?.name ?? binding.id}</span>
                          </div>
                        </td>
                        <td>
                          <select
                            value={binding.bindingKind ?? "digital_out"}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              const nextKind = event.target.value as IoBindingDefinition["bindingKind"];
                              updateBinding(binding.id, {
                                bindingKind: nextKind,
                                direction: nextKind?.includes("_in") ? "input" : "output",
                                type: nextKind?.includes("analog") ? "analog" : "bool"
                              });
                            }}
                          >
                            <option value="digital_out">DO</option>
                            <option value="digital_in">DI</option>
                            <option value="analog_in">AI</option>
                            <option value="analog_out">AO</option>
                            <option value="counter">Counter</option>
                            <option value="pwm">PWM</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={binding.gpio !== undefined ? String(binding.gpio) : ""}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              const gpio = event.target.value ? Number(event.target.value) : undefined;
                              updateBinding(binding.id, {
                                gpio,
                                resourceId: gpio !== undefined ? `gpio_${gpio}` : "",
                                physicalSource: gpio !== undefined ? `GPIO${gpio}` : ""
                              });
                              if (gpio !== undefined) {
                                setSelectedPinGpio(gpio);
                              }
                            }}
                          >
                            <option value="">Unbound</option>
                            {boardRuntime.pins.map((candidate) => (
                              <option
                                key={candidate.gpio}
                                value={candidate.gpio}
                                disabled={!isBindingCompatibleWithPin(binding, candidate)}
                              >
                                {`GPIO${candidate.gpio} — ${describeAvailability(candidate)}`}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{binding.direction}</td>
                        <td>
                          <span className={`bind-flag-status bind-flag-status--${pin?.availability ?? "free"}`}>
                            {getBindingStatus(binding, pin)}
                          </span>
                        </td>
                        <td>
                          <div className="bind-row-actions">
                            <button
                              type="button"
                              className="inspector-link"
                              onClick={(event) => {
                                event.stopPropagation();
                                selectItem("binding", binding.id);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="inspector-link"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (suggestedGpio === undefined) {
                                  return;
                                }
                                updateBinding(binding.id, {
                                  gpio: suggestedGpio,
                                  resourceId: `gpio_${suggestedGpio}`,
                                  physicalSource: `GPIO${suggestedGpio}`
                                });
                                setSelectedPinGpio(suggestedGpio);
                              }}
                              disabled={suggestedGpio === undefined}
                            >
                              Suggest
                            </button>
                            <button
                              type="button"
                              className="bind-delete-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteBinding(binding.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="panel-card bind-side-panel">
          <div className="workspace-header">
            <div>
              <h3>Pin List</h3>
              <p className="muted-copy">Use this list for fast orientation. Deep board editing can stay advanced.</p>
            </div>
          </div>

          <div className="card-table">
            <table>
              <thead>
                <tr>
                  <th>GPIO</th>
                  <th>Caps</th>
                  <th>Owner</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {boardRuntime.pins.map((pin) => (
                  <tr
                    key={pin.gpio}
                    className={selectedPin?.gpio === pin.gpio ? "is-selected-row" : ""}
                    onClick={() => setSelectedPinGpio(pin.gpio)}
                  >
                    <td>
                      <strong>{`GPIO${pin.gpio}`}</strong>
                    </td>
                    <td>{pin.capabilities.join("/") || "—"}</td>
                    <td>{pin.rules.map((rule) => rule.owner).join(", ") || "free"}</td>
                    <td>{pin.assignments.map((assignment) => assignment.label).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedPin ? (
            <div className="bind-pin-details">
              <h4>{`GPIO${selectedPin.gpio}`}</h4>
              <div className="inspector-grid">
                <div>
                  <dt>Status</dt>
                  <dd>{describeAvailability(selectedPin)}</dd>
                </div>
                <div>
                  <dt>Capabilities</dt>
                  <dd>{selectedPin.capabilities.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt>Assignments</dt>
                  <dd>{selectedPin.assignments.map((assignment) => assignment.label).join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt>Note</dt>
                  <dd>{selectedPin.summary}</dd>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
