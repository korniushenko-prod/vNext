import { useMemo, useState } from "react";
import type { IoBindingDefinition } from "../model/demoProject";
import {
  buildBoardPinRuntimeState,
  findSuggestedGpio,
  getBoardTemplateById,
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

function createBindingLabel(binding: IoBindingDefinition) {
  return binding.signalId || binding.id;
}

function inferBindingKindLabel(binding: IoBindingDefinition) {
  return binding.bindingKind ?? "digital_out";
}

function renderBoardSummaryLabel(pin: BoardPinRuntimeState) {
  switch (pin.availability) {
    case "assigned":
      return "Assigned";
    case "shared":
      return "Shared";
    case "warning":
      return "Warning";
    case "exclusive":
      return "Reserved";
    case "forbidden":
      return "Forbidden";
    case "conflict":
      return "Conflict";
    case "free":
    default:
      return "Free";
  }
}

export function BindWorkspace() {
  const project = useStudioStore((state) => state.project);
  const signals = useStudioStore((state) => state.project.signals);
  const bindings = useStudioStore((state) => state.project.bindings);
  const bindContext = useStudioStore((state) => state.bindContext);
  const focusBindContext = useStudioStore((state) => state.focusBindContext);
  const selectItem = useStudioStore((state) => state.selectItem);
  const addBinding = useStudioStore((state) => state.addBinding);
  const updateBinding = useStudioStore((state) => state.updateBinding);
  const updateProjectDeployment = useStudioStore((state) => state.updateProjectDeployment);

  const filteredBindings = bindContext
    ? bindings.filter((binding) => bindContext.bindingIds.includes(binding.id))
    : bindings;

  const controllerTargets = useMemo(() => getControllerTargetOptions(), []);
  const boardTemplates = useMemo(() => getBoardTemplateOptions(), []);
  const chipTemplates = useMemo(() => getChipTemplateOptions(), []);
  const [selectedPinGpio, setSelectedPinGpio] = useState<number | null>(null);

  const boardRuntime = useMemo(
    () => buildBoardPinRuntimeState(project.deployment, filteredBindings),
    [filteredBindings, project.deployment]
  );
  const selectedPin =
    boardRuntime.pins.find((pin) => pin.gpio === selectedPinGpio) ??
    boardRuntime.pins.find((pin) => pin.assignments.length > 0) ??
    boardRuntime.pins[0] ??
    null;
  const boardIssues = useMemo(
    () => summarizeBoardIssues(filteredBindings, boardRuntime.pins),
    [filteredBindings, boardRuntime.pins]
  );

  const activeTarget = controllerTargets.find((target) => target.id === project.deployment.controller.target) ?? null;
  const activeBoardTemplate = getBoardTemplateById(project.deployment.controller.activeBoardTemplate);
  const availableBoardTemplates = activeTarget
    ? boardTemplates.filter((template) => activeTarget.boardTemplateIds.includes(template.id))
    : boardTemplates;
  const activeChipTemplate =
    chipTemplates.find((template) => template.id === project.deployment.controller.activeChipTemplate) ??
    (activeBoardTemplate
      ? chipTemplates.find((template) => template.id === activeBoardTemplate.chipTemplateId) ?? null
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

  function toggleDeviceFlag(flag: "enabled", section: "oled" | "led") {
    updateProjectDeployment({
      ...project.deployment,
      [section]: {
        ...project.deployment[section],
        [flag]: !project.deployment[section][flag]
      }
    });
  }

  function addQuickBinding(bindingKind: NonNullable<IoBindingDefinition["bindingKind"]>) {
    const tempBinding: IoBindingDefinition = {
      id: "",
      signalId: "",
      physicalSource: "",
      direction: bindingKind.includes("_in") ? "input" : "output",
      type: bindingKind.includes("analog") ? "analog" : "bool",
      bindingKind,
      inverted: false,
      initialState: false
    };
    const suggestedGpio = findSuggestedGpio(tempBinding, boardRuntime.pins);
    addBinding({
      direction: tempBinding.direction,
      type: tempBinding.type,
      bindingKind,
      resourceId: suggestedGpio !== undefined ? `gpio_${suggestedGpio}` : "",
      gpio: suggestedGpio,
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
            Commissioning workspace for controller, board, chip and real I/O. Keep the first interaction short and safe.
          </p>
        </div>
        <div className="inspector-actions">
          <button type="button" className="inspector-link" onClick={() => addQuickBinding("digital_out")}>
            Add DO
          </button>
          <button type="button" className="inspector-link" onClick={() => addQuickBinding("digital_in")}>
            Add DI
          </button>
          <button type="button" className="inspector-link" onClick={() => addQuickBinding("analog_in")}>
            Add AI
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

      <div className="observe-grid bind-summary-grid">
        <section className="summary-card">
          <span>Controller</span>
          <strong>{activeTarget?.label ?? project.deployment.controller.target}</strong>
        </section>
        <section className="summary-card">
          <span>Board Template</span>
          <strong>{activeBoardTemplate?.label ?? project.deployment.controller.activeBoardTemplate}</strong>
        </section>
        <section className="summary-card">
          <span>Chip Template</span>
          <strong>{activeChipTemplate?.label ?? project.deployment.controller.activeChipTemplate}</strong>
        </section>
        <section className="summary-card">
          <span>Issues</span>
          <strong>{boardIssues.length}</strong>
        </section>
      </div>

      <div className="bind-layout">
        <section className="panel-card bind-stack">
          <div className="bind-card">
            <h3>Device</h3>
            <div className="bind-form-grid">
              <label className="bind-field">
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
              <label className="bind-field">
                <span>Board Instance</span>
                <input
                  value={project.deployment.controller.activeBoard}
                  onChange={(event) => updateControllerField("activeBoard", event.target.value)}
                />
              </label>
              <label className="bind-field">
                <span>Board Template</span>
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
              <label className="bind-field">
                <span>Chip Template</span>
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
            </div>
          </div>

          <div className="bind-card">
            <h3>Reserved Modules</h3>
            <div className="bind-toggle-grid">
              <label className="bind-toggle">
                <span>OLED bus</span>
                <input
                  type="checkbox"
                  checked={project.deployment.oled.enabled}
                  onChange={() => toggleDeviceFlag("enabled", "oled")}
                />
              </label>
              <label className="bind-toggle">
                <span>Status LED</span>
                <input
                  type="checkbox"
                  checked={project.deployment.led.enabled}
                  onChange={() => toggleDeviceFlag("enabled", "led")}
                />
              </label>
            </div>
            <p className="muted-copy">
              This is the commissioning shortcut for reservations that directly change pin availability on the active board.
            </p>
          </div>

          <div className="bind-card">
            <h3>Warnings</h3>
            {boardIssues.length === 0 ? (
              <div className="empty-state">
                <strong>No immediate bind issues</strong>
                <p>GPIO assignments look structurally valid for the selected board and chip.</p>
              </div>
            ) : (
              <ul className="plain-list bind-issue-list">
                {boardIssues.map((issue, index) => (
                  <li key={`${issue.message}-${index}`} className={`bind-issue bind-issue--${issue.severity}`}>
                    <strong>{issue.severity === "fault" ? "Fault" : "Warning"}</strong>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel-card bind-board-map">
          <div className="workspace-header">
            <div>
              <h3>Board Map</h3>
              <p className="muted-copy">Pick a pin first, then assign or adjust bindings in the quick bind list.</p>
            </div>
          </div>

          <div className="bind-legend">
            {["free", "assigned", "shared", "warning", "exclusive", "forbidden", "conflict"].map((tone) => (
              <span key={tone} className={`bind-legend__item bind-pin--${tone}`}>
                {tone}
              </span>
            ))}
          </div>

          <div className="bind-board-grid">
            {boardRuntime.pins.map((pin) => (
              <button
                key={pin.gpio}
                type="button"
                className={`bind-pin bind-pin--${pin.availability}${selectedPin?.gpio === pin.gpio ? " is-selected" : ""}`}
                onClick={() => setSelectedPinGpio(pin.gpio)}
                title={pin.summary}
              >
                <strong>GPIO{pin.gpio}</strong>
                <span>{renderBoardSummaryLabel(pin)}</span>
                <small>{pin.assignments[0]?.label ?? pin.note ?? pin.capabilities.join("/")}</small>
              </button>
            ))}
          </div>

          {selectedPin ? (
            <div className="bind-pin-details">
              <h4>GPIO{selectedPin.gpio}</h4>
              <div className="inspector-grid">
                <div>
                  <dt>Availability</dt>
                  <dd>{renderBoardSummaryLabel(selectedPin)}</dd>
                </div>
                <div>
                  <dt>Capabilities</dt>
                  <dd>{selectedPin.capabilities.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt>Rules</dt>
                  <dd>{selectedPin.rules.map((rule) => rule.feature).join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt>Summary</dt>
                  <dd>{selectedPin.summary}</dd>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <section className="panel-card bind-quick-bind">
        <div className="workspace-header">
          <div>
            <h3>Quick Bind</h3>
            <p className="muted-copy">Logical signal meaning is already decided elsewhere. Here we just bind it to safe real hardware.</p>
          </div>
        </div>

        <div className="card-table">
          {filteredBindings.length === 0 ? (
            <div className="empty-state">
              <strong>No bindings yet</strong>
              <p>Add a first DI, DO or AI binding above. This screen is the first commissioning step, not the logic editor.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Binding</th>
                  <th>Kind</th>
                  <th>GPIO</th>
                  <th>Resource</th>
                  <th>Direction</th>
                  <th>Type</th>
                  <th>Raw</th>
                  <th>Semantic</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {filteredBindings.map((binding) => {
                  const rawSignal = signals.find((signal) => signal.id === binding.signalId) ?? null;
                  const conditionedSignal = rawSignal ? findNextSignal(signals, rawSignal.id) : null;
                  const semanticSignal = conditionedSignal ? findNextSignal(signals, conditionedSignal.id) : null;
                  const assignedPin = boardRuntime.pins.find((pin) => pin.gpio === binding.gpio) ?? null;

                  return (
                    <tr
                      key={binding.id}
                      className={bindContext ? "is-contextual" : ""}
                      onClick={() => {
                        selectItem("binding", binding.id);
                        if (binding.gpio !== undefined) {
                          setSelectedPinGpio(binding.gpio);
                        }
                      }}
                    >
                      <td>
                        <div className="bind-binding-title">
                          <strong>{createBindingLabel(binding)}</strong>
                          <span>{binding.id}</span>
                        </div>
                      </td>
                      <td>
                        <select
                          value={inferBindingKindLabel(binding)}
                          onChange={(event) =>
                            updateBinding(binding.id, {
                              bindingKind: event.target.value as IoBindingDefinition["bindingKind"],
                              direction: event.target.value.includes("_in") ? "input" : "output",
                              type: event.target.value.includes("analog") ? "analog" : "bool"
                            })
                          }
                          onClick={(event) => event.stopPropagation()}
                        >
                          <option value="digital_out">digital_out</option>
                          <option value="digital_in">digital_in</option>
                          <option value="analog_in">analog_in</option>
                          <option value="analog_out">analog_out</option>
                          <option value="counter">counter</option>
                          <option value="pwm">pwm</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={binding.gpio !== undefined ? String(binding.gpio) : ""}
                          onChange={(event) => {
                            const gpioValue = event.target.value ? Number(event.target.value) : undefined;
                            updateBinding(binding.id, {
                              gpio: gpioValue,
                              physicalSource: gpioValue !== undefined ? `GPIO${gpioValue}` : "",
                              resourceId: gpioValue !== undefined ? `gpio_${gpioValue}` : binding.resourceId
                            });
                            if (gpioValue !== undefined) {
                              setSelectedPinGpio(gpioValue);
                            }
                          }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <option value="">Unbound</option>
                          {boardRuntime.pins.map((pin) => {
                            const allowed = isBindingCompatibleWithPin(binding, pin);
                            return (
                              <option key={pin.gpio} value={pin.gpio} disabled={!allowed}>
                                {`GPIO${pin.gpio} — ${renderBoardSummaryLabel(pin)}`}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td>
                        <input
                          value={binding.resourceId ?? ""}
                          onChange={(event) => updateBinding(binding.id, { resourceId: event.target.value })}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>
                      <td>{binding.direction}</td>
                      <td>{binding.type}</td>
                      <td>{rawSignal?.name ?? binding.signalId ?? "—"}</td>
                      <td>{semanticSignal?.name ?? "—"}</td>
                      <td>
                        <div className="bind-flags">
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(binding.inverted)}
                              onChange={(event) => updateBinding(binding.id, { inverted: event.target.checked })}
                              onClick={(event) => event.stopPropagation()}
                            />
                            inv
                          </label>
                          {binding.direction === "output" ? (
                            <label>
                              <input
                                type="checkbox"
                                checked={Boolean(binding.initialState)}
                                onChange={(event) => updateBinding(binding.id, { initialState: event.target.checked })}
                                onClick={(event) => event.stopPropagation()}
                              />
                              init high
                            </label>
                          ) : null}
                          <span className={`bind-flag-status bind-flag-status--${assignedPin?.availability ?? "free"}`}>
                            {assignedPin ? renderBoardSummaryLabel(assignedPin) : "Unbound"}
                          </span>
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
    </div>
  );
}
