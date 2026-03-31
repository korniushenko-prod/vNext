import type { RuntimePack } from "@universal-plc/runtime-pack-schema";
import type { TargetAdapterDiagnostic } from "@universal-plc/target-adapter-contracts";
import { esp32CapabilityProfile } from "./profile.js";
import { sortedKeys } from "./sort.js";
import type {
  ResolvedHardwareSectionInput,
  RuntimePackWithHardwareResolution,
  ShipControllerEndpointRef,
  ShipControllerHardwareArtifact,
  ShipControllerHardwareDiagnosticArtifact,
  ShipControllerHardwareResourceArtifact
} from "./types.js";

export function getHardwareResolution(pack: RuntimePack): ResolvedHardwareSectionInput | null {
  const candidate = (pack as RuntimePackWithHardwareResolution).hardware_resolution;
  return isResolvedHardwareSection(candidate) ? candidate : null;
}

export function validateHardwareResolution(pack: RuntimePack): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const hardwareResolution = getHardwareResolution(pack);
  const support = esp32CapabilityProfile.hardware_preset_support;

  if (!hardwareResolution) {
    return diagnostics;
  }

  if (!support?.enabled) {
    diagnostics.push({
      code: "target.hardware.unsupported",
      severity: "error",
      message: "Resolved hardware preset metadata is not supported by the ESP32 target.",
      path: "$.hardware_resolution"
    });
    return diagnostics;
  }

  if (!support.supported_target_presets.includes(hardwareResolution.target_preset_ref)) {
    diagnostics.push({
      code: "target.hardware.preset.unsupported",
      severity: "error",
      message: `Hardware target preset \`${hardwareResolution.target_preset_ref}\` is not supported by the ESP32 target.`,
      path: "$.hardware_resolution.target_preset_ref"
    });
  }

  if (!support.supported_board_templates.includes(hardwareResolution.board_template_ref)) {
    diagnostics.push({
      code: "target.hardware.board.unsupported",
      severity: "error",
      message: `Hardware board template \`${hardwareResolution.board_template_ref}\` is not supported by the ESP32 target.`,
      path: "$.hardware_resolution.board_template_ref"
    });
  }

  if (!support.supported_chip_templates.includes(hardwareResolution.chip_template_ref)) {
    diagnostics.push({
      code: "target.hardware.chip.unsupported",
      severity: "error",
      message: `Hardware chip template \`${hardwareResolution.chip_template_ref}\` is not supported by the ESP32 target.`,
      path: "$.hardware_resolution.chip_template_ref"
    });
  }

  hardwareResolution.diagnostics.forEach((entry, index) => {
    diagnostics.push({
      code: entry.code,
      severity: entry.severity,
      message: entry.message,
      path: `$.hardware_resolution.diagnostics[${index}]`
    });
  });

  const resources = hardwareResolution.resources ?? {};
  for (const resourceId of sortedKeys(pack.resources ?? {})) {
    const resource = pack.resources[resourceId];
    const resolved = getResolvedHardwareRef(resource?.config);
    if (!resolved) {
      continue;
    }

    const targetResource = resources[resolved.resource_id];
    if (!targetResource) {
      diagnostics.push({
        code: "target.hardware.resource_ref.unresolved",
        severity: "error",
        message: `Resolved hardware resource \`${resolved.resource_id}\` cannot be found in hardware_resolution.resources.`,
        path: `$.resources.${resourceId}.config.resolved_hardware.resource_id`
      });
      continue;
    }

    if (resolved.resource_gpio !== targetResource.gpio) {
      diagnostics.push({
        code: "target.hardware.resource_gpio.mismatch",
        severity: "error",
        message: `Resolved hardware GPIO ${resolved.resource_gpio} does not match hardware_resolution.resources.${resolved.resource_id}.gpio (${targetResource.gpio}).`,
        path: `$.resources.${resourceId}.config.resolved_hardware.resource_gpio`
      });
    }
  }

  return diagnostics;
}

export function emitHardwareArtifact(pack: RuntimePack): ShipControllerHardwareArtifact | null {
  const hardwareResolution = getHardwareResolution(pack);
  if (!hardwareResolution) {
    return null;
  }

  return {
    target_preset_ref: hardwareResolution.target_preset_ref,
    chip_template_ref: hardwareResolution.chip_template_ref,
    chip_title: hardwareResolution.chip_title,
    board_template_ref: hardwareResolution.board_template_ref,
    board_title: hardwareResolution.board_title,
    active_rule_ids: [...hardwareResolution.active_rule_ids],
    reserved_pins: { ...hardwareResolution.reserved_pins },
    forbidden_pins: [...hardwareResolution.forbidden_pins],
    resources: sortedKeys(hardwareResolution.resources).map((resourceId) => {
      const resource = hardwareResolution.resources[resourceId];
      const portRefs = [...resource.port_refs]
        .filter((portRef): portRef is { instance_id: string; port_id: string } => typeof portRef.port_id === "string")
        .map((portRef) => ({
          instance_id: portRef.instance_id,
          port_id: portRef.port_id
        }) satisfies ShipControllerEndpointRef)
        .sort((left, right) => (
          `${left.instance_id}.${left.port_id}`.localeCompare(`${right.instance_id}.${right.port_id}`)
        ));

      return {
        id: resource.id,
        title: resource.title,
        gpio: resource.gpio,
        capabilities: [...resource.capabilities],
        note: resource.note,
        allowed_gpios: resource.allowed_gpios ? [...resource.allowed_gpios] : undefined,
        origin: resource.origin,
        binding_ids: [...resource.binding_ids].sort(),
        port_refs: portRefs
      } satisfies ShipControllerHardwareResourceArtifact;
    }),
    diagnostics: hardwareResolution.diagnostics.map((entry) => ({
      code: entry.code,
      severity: entry.severity,
      message: entry.message,
      binding_id: entry.binding_id,
      resource_id: entry.resource_id,
      gpio: entry.gpio
    }) satisfies ShipControllerHardwareDiagnosticArtifact)
  };
}

function getResolvedHardwareRef(value: unknown): { resource_id: string; resource_gpio: number } | null {
  if (!isRecord(value) || !isRecord(value.resolved_hardware)) {
    return null;
  }

  const resolved = value.resolved_hardware;
  if (typeof resolved.resource_id !== "string" || typeof resolved.resource_gpio !== "number") {
    return null;
  }

  return {
    resource_id: resolved.resource_id,
    resource_gpio: resolved.resource_gpio
  };
}

function isResolvedHardwareSection(value: unknown): value is ResolvedHardwareSectionInput {
  return (
    isRecord(value) &&
    typeof value.target_preset_ref === "string" &&
    typeof value.chip_template_ref === "string" &&
    typeof value.board_template_ref === "string" &&
    Array.isArray(value.active_rule_ids) &&
    isRecord(value.reserved_pins) &&
    Array.isArray(value.forbidden_pins) &&
    isRecord(value.resources) &&
    Array.isArray(value.diagnostics)
  );
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
