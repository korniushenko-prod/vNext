(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.HardwareManifestEditor = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  function ensureHardwareProjectModel(projectModel, catalog) {
    const nextProject = projectModel && typeof projectModel === "object" ? projectModel : {};
    nextProject.hardware = nextProject.hardware && typeof nextProject.hardware === "object" ? nextProject.hardware : {};
    nextProject.hardware.modules = Array.isArray(nextProject.hardware.modules) ? nextProject.hardware.modules : [];
    nextProject.hardware.bindings = isRecord(nextProject.hardware.bindings) ? nextProject.hardware.bindings : {};
    nextProject.hardware.catalog = clone(catalog || nextProject.hardware.catalog || {});

    if (!isRecord(nextProject.hardware.manifest)) {
      const defaultPresetRef = Object.keys(nextProject.hardware.catalog?.presets || {})[0] || "";
      nextProject.hardware.manifest = {
        target_preset_ref: defaultPresetRef,
        resource_bindings: {}
      };
    }

    nextProject.hardware.manifest.target_preset_ref = String(nextProject.hardware.manifest.target_preset_ref || Object.keys(nextProject.hardware.catalog?.presets || {})[0] || "");
    nextProject.hardware.manifest.resource_bindings = isRecord(nextProject.hardware.manifest.resource_bindings)
      ? nextProject.hardware.manifest.resource_bindings
      : {};

    hydratePresetDefaults(nextProject, nextProject.hardware.catalog);
    return nextProject;
  }

  function createEditableHardwareManifestViewModel({ projectModel, catalog, selectedResourceId }) {
    const project = ensureHardwareProjectModel(clone(projectModel || {}), catalog);
    const manifest = project.hardware.manifest;
    const effectiveCatalog = project.hardware.catalog || {};
    const presetOptions = Object.values(effectiveCatalog.presets || {})
      .map((entry) => ({
        value: entry.id,
        label: entry.title || entry.id
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
    const preset = effectiveCatalog.presets?.[manifest.target_preset_ref] || null;
    const board = preset ? effectiveCatalog.boards?.[preset.board_template_ref] || null : null;
    const chip = preset ? effectiveCatalog.chips?.[preset.chip_template_ref] || null : null;
    const diagnostics = validateHardwareManifest(project, effectiveCatalog).diagnostics;
    const resources = preset
      ? Object.values(preset.resources || {})
          .map((resource) => {
            const binding = manifest.resource_bindings?.[resource.id] || {};
            const effectiveGpio = Number(binding.gpio ?? resource.gpio);
            const resourceDiagnostics = diagnostics.filter((entry) => entry.resource_id === resource.id);
            return {
              id: resource.id,
              title: resource.title || resource.id,
              gpio: effectiveGpio,
              default_gpio: Number(resource.gpio),
              allowed_gpios: Array.isArray(resource.allowed_gpios) ? resource.allowed_gpios.map((entry) => Number(entry)) : [],
              allowed_gpios_label: Array.isArray(resource.allowed_gpios) && resource.allowed_gpios.length
                ? resource.allowed_gpios.join(", ")
                : "preset default only",
              capabilities: Array.isArray(resource.capabilities) ? resource.capabilities : [],
              note: resource.note || "",
              diagnostics: resourceDiagnostics,
              status: resourceDiagnostics.some((entry) => entry.severity === "error")
                ? "conflict"
                : resourceDiagnostics.length
                ? "warning"
                : "ready"
            };
          })
          .sort((left, right) => left.title.localeCompare(right.title))
      : [];
    const effectiveSelectedResourceId = resources.some((entry) => entry.id === selectedResourceId)
      ? selectedResourceId
      : resources[0]?.id ?? "";

    return {
      project,
      catalog: effectiveCatalog,
      selected_target_preset_ref: manifest.target_preset_ref,
      target_preset_options: presetOptions,
      chip_title: chip?.title || "Unknown Chip",
      chip_template_ref: chip?.id || "unknown_chip",
      board_title: board?.title || "Unknown Board",
      board_template_ref: board?.id || "unknown_board",
      resources,
      diagnostics,
      selected_resource_id: effectiveSelectedResourceId,
      selected_resource: resources.find((entry) => entry.id === effectiveSelectedResourceId) || null,
      can_save: diagnostics.every((entry) => entry.severity !== "error"),
      summary: {
        resource_count: resources.length,
        diagnostic_count: diagnostics.length,
        conflict_count: diagnostics.filter((entry) => entry.severity === "error").length
      }
    };
  }

  function setHardwareTargetPreset(projectModel, catalog, targetPresetRef) {
    const project = ensureHardwareProjectModel(projectModel, catalog);
    project.hardware.manifest.target_preset_ref = String(targetPresetRef || "");
    project.hardware.manifest.resource_bindings = {};
    hydratePresetDefaults(project, project.hardware.catalog);
    return createEditableHardwareManifestViewModel({
      projectModel: project,
      catalog: project.hardware.catalog
    });
  }

  function setHardwareResourceBindingGpio(projectModel, catalog, resourceId, gpio) {
    const project = ensureHardwareProjectModel(projectModel, catalog);
    const manifest = project.hardware.manifest;
    const effectiveCatalog = project.hardware.catalog;
    const preset = effectiveCatalog.presets?.[manifest.target_preset_ref];
    const resource = preset?.resources?.[resourceId];
    const numericGpio = Number(gpio);

    if (!resource || !Number.isFinite(numericGpio)) {
      return {
        ok: false,
        diagnostics: [
          {
            code: "hardware.ui.resource.unresolved",
            severity: "error",
            message: `Hardware resource \`${resourceId}\` is not available in the selected target preset.`,
            resource_id: resourceId
          }
        ],
        viewModel: createEditableHardwareManifestViewModel({
          projectModel: project,
          catalog: effectiveCatalog,
          selectedResourceId: resourceId
        })
      };
    }

    const probeProject = clone(project);
    probeProject.hardware.manifest.resource_bindings = isRecord(probeProject.hardware.manifest.resource_bindings)
      ? probeProject.hardware.manifest.resource_bindings
      : {};
    probeProject.hardware.manifest.resource_bindings[resourceId] = { gpio: numericGpio };
    const validation = validateHardwareManifest(probeProject, effectiveCatalog);
    const blockingDiagnostics = validation.diagnostics.filter((entry) => entry.resource_id === resourceId && entry.severity === "error");

    if (blockingDiagnostics.length) {
      return {
        ok: false,
        diagnostics: blockingDiagnostics,
        viewModel: createEditableHardwareManifestViewModel({
          projectModel: project,
          catalog: effectiveCatalog,
          selectedResourceId: resourceId
        })
      };
    }

    project.hardware.manifest.resource_bindings[resourceId] = { gpio: numericGpio };
    return {
      ok: true,
      diagnostics: validation.diagnostics,
      viewModel: createEditableHardwareManifestViewModel({
        projectModel: project,
        catalog: effectiveCatalog,
        selectedResourceId: resourceId
      })
    };
  }

  function saveHardwareManifest(projectModel, catalog) {
    const project = ensureHardwareProjectModel(projectModel, catalog);
    const validation = validateHardwareManifest(project, project.hardware.catalog);
    return {
      ok: validation.diagnostics.every((entry) => entry.severity !== "error"),
      diagnostics: validation.diagnostics,
      project
    };
  }

  function validateHardwareManifest(projectModel, catalog) {
    const project = ensureHardwareProjectModel(projectModel, catalog);
    const diagnostics = [];
    const manifest = project.hardware.manifest;
    const effectiveCatalog = project.hardware.catalog;
    const preset = effectiveCatalog.presets?.[manifest.target_preset_ref];
    const board = preset ? effectiveCatalog.boards?.[preset.board_template_ref] || null : null;
    const chip = preset ? effectiveCatalog.chips?.[preset.chip_template_ref] || null : null;

    if (!preset) {
      diagnostics.push({
        code: "hardware.ui.preset.unresolved",
        severity: "error",
        message: `Target preset \`${manifest.target_preset_ref}\` is not present in the hardware catalog.`
      });
      return { diagnostics };
    }

    if (!board || !chip) {
      diagnostics.push({
        code: "hardware.ui.catalog.incomplete",
        severity: "error",
        message: "Hardware catalog is incomplete for the selected target preset."
      });
      return { diagnostics };
    }

    const resourceBindings = manifest.resource_bindings || {};
    const claimedRulePins = collectClaimedRulePins(preset, board);
    const forbiddenPins = collectForbiddenPins(chip, preset, board, claimedRulePins);
    const usedGpios = new Map();

    Object.keys(preset.resources || {}).forEach((resourceId) => {
      const resource = preset.resources[resourceId];
      const binding = resourceBindings[resourceId] || {};
      const gpio = Number(binding.gpio ?? resource.gpio);

      if (!Number.isFinite(gpio)) {
        diagnostics.push({
          code: "hardware.ui.gpio.invalid",
          severity: "error",
          message: `Hardware resource \`${resourceId}\` does not have a valid GPIO override.`,
          resource_id: resourceId
        });
        return;
      }

      if (forbiddenPins.has(gpio)) {
        diagnostics.push({
          code: "hardware.ui.pin.forbidden",
          severity: "error",
          message: `GPIO ${gpio} is forbidden for hardware resource \`${resourceId}\` under the selected target preset.`,
          resource_id: resourceId,
          gpio
        });
      }

      const reservedOwner = findReservedOwner(preset.reserved_pins, gpio);
      if (reservedOwner) {
        diagnostics.push({
          code: "hardware.ui.pin.reserved_conflict",
          severity: "error",
          message: `GPIO ${gpio} collides with reserved target pin \`${reservedOwner}\`.`,
          resource_id: resourceId,
          gpio
        });
      }

      const allowedGpios = Array.isArray(resource.allowed_gpios) ? resource.allowed_gpios.map((entry) => Number(entry)) : [];
      if (allowedGpios.length && !allowedGpios.includes(gpio)) {
        diagnostics.push({
          code: "hardware.ui.resource_gpio.not_allowed",
          severity: "error",
          message: `GPIO ${gpio} is outside the allowed GPIO set for hardware resource \`${resourceId}\`.`,
          resource_id: resourceId,
          gpio
        });
      }

      const existing = usedGpios.get(gpio);
      if (existing) {
        diagnostics.push({
          code: "hardware.ui.gpio.conflict",
          severity: "error",
          message: `GPIO ${gpio} is already claimed by hardware resource \`${existing}\`.`,
          resource_id: resourceId,
          gpio
        });
      } else {
        usedGpios.set(gpio, resourceId);
      }
    });

    return { diagnostics };
  }

  function hydratePresetDefaults(project, catalog) {
    const manifest = project.hardware.manifest;
    const preset = catalog?.presets?.[manifest.target_preset_ref];
    if (!preset) {
      return;
    }

    manifest.resource_bindings = isRecord(manifest.resource_bindings) ? manifest.resource_bindings : {};
    Object.keys(preset.resources || {}).forEach((resourceId) => {
      if (!isRecord(manifest.resource_bindings[resourceId])) {
        manifest.resource_bindings[resourceId] = { gpio: preset.resources[resourceId].gpio };
        return;
      }

      if (!Number.isFinite(Number(manifest.resource_bindings[resourceId].gpio))) {
        manifest.resource_bindings[resourceId].gpio = preset.resources[resourceId].gpio;
      }
    });
  }

  function collectClaimedRulePins(preset, board) {
    const claimed = new Set();
    const presetResources = Object.values(preset.resources || {});

    Object.values(board.rules || {}).forEach((rule) => {
      const pins = Array.isArray(rule?.pins) ? rule.pins.map((entry) => Number(entry)) : [];
      const isClaimedByResource = pins.some((pin) => presetResources.some((resource) => Number(resource.gpio) === pin));
      if (isClaimedByResource) {
        pins.forEach((pin) => claimed.add(pin));
      }
    });

    return claimed;
  }

  function collectForbiddenPins(chip, preset, board, claimedRulePins) {
    const forbidden = new Set();

    Object.entries(chip.pins || {}).forEach(([gpio, pin]) => {
      if (pin?.forbidden) {
        forbidden.add(Number(gpio));
      }
    });

    const reservedPins = Object.values(preset.reserved_pins || {}).map((entry) => Number(entry));
    reservedPins.forEach((entry) => forbidden.add(entry));

    (preset.active_rule_ids || []).forEach((ruleId) => {
      const rule = board?.rules?.[ruleId];
      if (!rule || !Array.isArray(rule.pins)) {
        return;
      }

      if (rule.class === "warning" || rule.class === "shared") {
        return;
      }

      rule.pins.forEach((entry) => {
        const gpio = Number(entry);
        if (!claimedRulePins.has(gpio)) {
          forbidden.add(gpio);
        }
      });
    });

    return forbidden;
  }

  function findReservedOwner(reservedPins, gpio) {
    if (!isRecord(reservedPins)) {
      return "";
    }

    return Object.keys(reservedPins).find((key) => Number(reservedPins[key]) === gpio) || "";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  return {
    ensureHardwareProjectModel,
    createEditableHardwareManifestViewModel,
    setHardwareTargetPreset,
    setHardwareResourceBindingGpio,
    saveHardwareManifest,
    validateHardwareManifest
  };
});
