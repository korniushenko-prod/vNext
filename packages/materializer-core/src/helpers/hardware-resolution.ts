import type { ProjectModel } from "@universal-plc/project-schema";
import type { RuntimeResourceBinding } from "@universal-plc/runtime-pack-schema";
import { error } from "../diagnostics.js";
import type {
  MaterializerDiagnostic,
  ResolvedHardwareDiagnostic,
  ResolvedHardwareResource,
  ResolvedHardwareSection,
  RuntimePackWithHardwareResolution
} from "../types.js";

type HardwareBindingLike = {
  id: string;
  binding_kind: RuntimeResourceBinding["binding_kind"];
  instance_id: string;
  port_id?: string;
  config?: Record<string, unknown>;
};

export function materializeHardwareBindings(
  project: ProjectModel,
  runtimePack: RuntimePackWithHardwareResolution,
  diagnostics: MaterializerDiagnostic[]
): void {
  for (const [bindingId, bindingValue] of Object.entries(project.hardware?.bindings ?? {})) {
    if (!isHardwareBindingLike(bindingValue)) {
      continue;
    }

    runtimePack.resources[bindingId] = {
      id: bindingValue.id,
      binding_kind: bindingValue.binding_kind,
      instance_id: bindingValue.instance_id,
      ...(bindingValue.port_id !== undefined ? { port_id: bindingValue.port_id } : {}),
      config: isRecord(bindingValue.config) ? { ...bindingValue.config } : {}
    } satisfies RuntimeResourceBinding;
  }

  const hardwareResolution = resolveHardwareManifest(project, runtimePack, diagnostics);
  if (hardwareResolution) {
    runtimePack.hardware_resolution = hardwareResolution;
  }
}

function resolveHardwareManifest(
  project: ProjectModel,
  runtimePack: RuntimePackWithHardwareResolution,
  diagnostics: MaterializerDiagnostic[]
): ResolvedHardwareSection | null {
  const hardware = isRecord(project.hardware) ? project.hardware : null;
  const catalog = hardware && isRecord(hardware.catalog) ? hardware.catalog : null;
  const manifest = hardware && isRecord(hardware.manifest) ? hardware.manifest : null;

  if (!catalog || !manifest || typeof manifest.target_preset_ref !== "string") {
    return null;
  }

  const chips = isRecord(catalog.chips) ? catalog.chips : null;
  const boards = isRecord(catalog.boards) ? catalog.boards : null;
  const presets = isRecord(catalog.presets) ? catalog.presets : null;
  if (!chips || !boards || !presets) {
    return null;
  }

  const preset = presets[manifest.target_preset_ref];
  if (!isRecord(preset)) {
    return null;
  }

  const chipTemplateRef = typeof preset.chip_template_ref === "string" ? preset.chip_template_ref : null;
  const boardTemplateRef = typeof preset.board_template_ref === "string" ? preset.board_template_ref : null;
  const chip = chipTemplateRef ? chips[chipTemplateRef] : null;
  const board = boardTemplateRef ? boards[boardTemplateRef] : null;
  if (!chipTemplateRef || !boardTemplateRef || !isRecord(chip) || !isRecord(board)) {
    return null;
  }

  const activeRuleIds = collectActiveRuleIds(board, preset);
  const forbiddenPins = Array.from(collectForbiddenPins(chip, board, activeRuleIds)).sort((left, right) => left - right);
  const reservedPins = materializeReservedPins(preset);
  const resources = materializeResolvedResources(preset, manifest);
  const sectionDiagnostics: ResolvedHardwareDiagnostic[] = [];

  for (const [bindingId, resourceBinding] of Object.entries(runtimePack.resources)) {
    const config = isRecord(resourceBinding.config) ? resourceBinding.config : null;
    const gpio = config && typeof config.pin === "number" ? config.pin : null;
    if (gpio === null) {
      continue;
    }

    const reservedPinId = findReservedPinId(reservedPins, gpio);
    if (reservedPinId) {
      const entry = {
        code: "hardware_resolution.pin.reserved_conflict",
        severity: "error",
        binding_id: bindingId,
        gpio,
        message: `Hardware binding \`${bindingId}\` collides with reserved pin \`${reservedPinId}\` on GPIO ${gpio}.`
      } satisfies ResolvedHardwareDiagnostic;
      sectionDiagnostics.push(entry);
      diagnostics.push(error(
        "materialize_hardware",
        entry.code,
        `$.hardware.bindings.${bindingId}.config.pin`,
        entry.message
      ));
      continue;
    }

    if (forbiddenPins.includes(gpio)) {
      const entry = {
        code: "hardware_resolution.pin.forbidden",
        severity: "error",
        binding_id: bindingId,
        gpio,
        message: `Hardware binding \`${bindingId}\` uses forbidden GPIO ${gpio} for preset \`${manifest.target_preset_ref}\`.`
      } satisfies ResolvedHardwareDiagnostic;
      sectionDiagnostics.push(entry);
      diagnostics.push(error(
        "materialize_hardware",
        entry.code,
        `$.hardware.bindings.${bindingId}.config.pin`,
        entry.message
      ));
      continue;
    }

    const matchedResource = Object.values(resources).find((entry) => entry.gpio === gpio);
    if (!matchedResource) {
      const entry = {
        code: "hardware_resolution.resource_mapping.unresolved",
        severity: "error",
        binding_id: bindingId,
        gpio,
        message: `Hardware binding \`${bindingId}\` on GPIO ${gpio} cannot be mapped to any resolved preset resource.`
      } satisfies ResolvedHardwareDiagnostic;
      sectionDiagnostics.push(entry);
      diagnostics.push(error(
        "materialize_hardware",
        entry.code,
        `$.hardware.bindings.${bindingId}.config.pin`,
        entry.message
      ));
      continue;
    }

    matchedResource.binding_ids.push(bindingId);
    matchedResource.port_refs.push({
      instance_id: resourceBinding.instance_id,
      ...(resourceBinding.port_id !== undefined ? { port_id: resourceBinding.port_id } : {})
    });

    resourceBinding.config = {
      ...(config ?? {}),
      resolved_hardware: {
        target_preset_ref: manifest.target_preset_ref,
        chip_template_ref: chipTemplateRef,
        board_template_ref: boardTemplateRef,
        resource_id: matchedResource.id,
        resource_gpio: matchedResource.gpio,
        resource_title: matchedResource.title
      }
    };
  }

  return {
    target_preset_ref: manifest.target_preset_ref,
    chip_template_ref: chipTemplateRef,
    chip_title: typeof chip.title === "string" ? chip.title : undefined,
    board_template_ref: boardTemplateRef,
    board_title: typeof board.title === "string" ? board.title : undefined,
    active_rule_ids: activeRuleIds,
    reserved_pins: reservedPins,
    forbidden_pins: forbiddenPins,
    resources,
    diagnostics: sectionDiagnostics
  };
}

function materializeResolvedResources(
  preset: Record<string, unknown>,
  manifest: Record<string, unknown>
): Record<string, ResolvedHardwareResource> {
  const resources = isRecord(preset.resources) ? preset.resources : {};
  const overrides = isRecord(manifest.resource_bindings) ? manifest.resource_bindings : {};
  const result: Record<string, ResolvedHardwareResource> = {};

  for (const [resourceId, resource] of Object.entries(resources)) {
    if (!isRecord(resource) || typeof resource.gpio !== "number" || !Array.isArray(resource.capabilities)) {
      continue;
    }

    const override = overrides[resourceId];
    const overrideGpio = isRecord(override) && typeof override.gpio === "number" ? override.gpio : null;
    result[resourceId] = {
      id: resourceId,
      ...(typeof resource.title === "string" ? { title: resource.title } : {}),
      gpio: overrideGpio ?? resource.gpio,
      capabilities: resource.capabilities.filter((entry): entry is string => typeof entry === "string"),
      ...(typeof resource.note === "string" ? { note: resource.note } : {}),
      ...(Array.isArray(resource.allowed_gpios)
        ? { allowed_gpios: resource.allowed_gpios.filter((entry): entry is number => typeof entry === "number") }
        : {}),
      origin: overrideGpio !== null ? "manifest_override" : "preset_default",
      binding_ids: [],
      port_refs: []
    };
  }

  return result;
}

function materializeReservedPins(preset: Record<string, unknown>): Record<string, number> {
  const reservedPins = isRecord(preset.reserved_pins) ? preset.reserved_pins : null;
  if (!reservedPins) {
    return {};
  }

  const result: Record<string, number> = {};
  for (const [reservedId, pin] of Object.entries(reservedPins)) {
    if (typeof pin === "number") {
      result[reservedId] = pin;
    }
  }
  return result;
}

function collectActiveRuleIds(board: Record<string, unknown>, preset: Record<string, unknown>): string[] {
  const rules = isRecord(board.rules) ? board.rules : {};
  const activeRuleIds = new Set<string>();

  for (const [ruleId, rule] of Object.entries(rules)) {
    if (isRecord(rule) && rule.always_on === true) {
      activeRuleIds.add(ruleId);
    }
  }

  if (Array.isArray(preset.active_rule_ids)) {
    for (const ruleId of preset.active_rule_ids) {
      if (typeof ruleId === "string") {
        activeRuleIds.add(ruleId);
      }
    }
  }

  return Array.from(activeRuleIds).sort();
}

function collectForbiddenPins(
  chip: Record<string, unknown>,
  board: Record<string, unknown>,
  activeRuleIds: string[]
): Set<number> {
  const result = new Set<number>();

  const chipPins = isRecord(chip.pins) ? chip.pins : {};
  for (const [pinId, pin] of Object.entries(chipPins)) {
    if (isRecord(pin) && pin.forbidden === true) {
      const numericPin = Number(pinId);
      if (!Number.isNaN(numericPin)) {
        result.add(numericPin);
      }
    }
  }

  const rules = isRecord(board.rules) ? board.rules : {};
  for (const ruleId of activeRuleIds) {
    const rule = rules[ruleId];
    if (!isRecord(rule) || (rule.class !== "forbidden" && rule.class !== "exclusive") || !Array.isArray(rule.pins)) {
      continue;
    }

    for (const pin of rule.pins) {
      if (typeof pin === "number") {
        result.add(pin);
      }
    }
  }

  return result;
}

function findReservedPinId(reservedPins: Record<string, number>, gpio: number): string | null {
  for (const [reservedId, reservedPin] of Object.entries(reservedPins)) {
    if (reservedPin === gpio) {
      return reservedId;
    }
  }

  return null;
}

function isHardwareBindingLike(value: unknown): value is HardwareBindingLike {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.binding_kind === "string" &&
    typeof value.instance_id === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
