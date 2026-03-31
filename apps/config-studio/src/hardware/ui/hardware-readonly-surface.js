(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.HardwareReadonlySurface = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  function createReadonlyHardwareSurfaceViewModel({ fixture, selectedResourceId }) {
    const resources = Array.isArray(fixture?.resources) ? fixture.resources.map(normalizeResource) : [];
    const diagnostics = Array.isArray(fixture?.diagnostics) ? fixture.diagnostics.map(normalizeDiagnostic) : [];
    const effectiveSelectedResourceId = resources.some((entry) => entry.id === selectedResourceId)
      ? selectedResourceId
      : resources[0]?.id ?? "";
    const selectedResource = resources.find((entry) => entry.id === effectiveSelectedResourceId) ?? null;
    const reservedPins = normalizeReservedPins(fixture?.reserved_pins);
    const forbiddenPins = Array.isArray(fixture?.forbidden_pins) ? fixture.forbidden_pins.map((entry) => Number(entry)) : [];

    return {
      fixture_id: fixture?.id ?? "hardware-readonly-missing",
      title: fixture?.title ?? "Hardware Surface",
      description: fixture?.description ?? "",
      target_preset_ref: fixture?.target_preset_ref ?? "unknown_preset",
      chip_template_ref: fixture?.chip_template_ref ?? "unknown_chip",
      chip_title: fixture?.chip_title ?? "Unknown Chip",
      board_template_ref: fixture?.board_template_ref ?? "unknown_board",
      board_title: fixture?.board_title ?? "Unknown Board",
      active_rule_ids: Array.isArray(fixture?.active_rule_ids) ? fixture.active_rule_ids : [],
      reserved_pins: reservedPins,
      reserved_pin_entries: Object.entries(reservedPins).map(([id, gpio]) => ({ id, gpio })),
      forbidden_pins: forbiddenPins,
      resources,
      diagnostics,
      selected_resource_id: effectiveSelectedResourceId,
      selected_resource: selectedResource,
      boundary_notes: Array.isArray(fixture?.boundary_notes) ? fixture.boundary_notes : [],
      summary: {
        resource_count: resources.length,
        reserved_pin_count: Object.keys(reservedPins).length,
        forbidden_pin_count: forbiddenPins.length,
        diagnostic_count: diagnostics.length
      }
    };
  }

  function renderReadonlyHardwareResourceMarkup(resource) {
    return [
      `<div class="hardware-surface-card-head">`,
      `<strong>${escapeHtml(resource.title)}</strong>`,
      `<span>${escapeHtml(resource.id)} • GPIO ${escapeHtml(String(resource.gpio))}</span>`,
      `</div>`,
      `<div class="hardware-surface-badges">`,
      resource.capabilities.map((entry) => `<span class="hardware-capability-chip">${escapeHtml(entry)}</span>`).join(""),
      `</div>`,
      `<div class="hardware-surface-note">${escapeHtml(resource.allowed_gpios_label)}</div>`
    ].join("");
  }

  function renderReadonlyHardwareDetailsMarkup(surface) {
    const resource = surface.selected_resource;
    return [
      `<div class="hardware-surface-details-head">`,
      `<h3>${escapeHtml(surface.title)}</h3>`,
      `<p>${escapeHtml(surface.target_preset_ref)} • ${escapeHtml(surface.board_title)} • ${escapeHtml(surface.chip_title)}</p>`,
      `</div>`,
      `<div class="hardware-surface-details-grid">`,
      renderDetailsBlock("Target Summary", [
        ["Preset", surface.target_preset_ref],
        ["Board", `${surface.board_title} (${surface.board_template_ref})`],
        ["Chip", `${surface.chip_title} (${surface.chip_template_ref})`],
        ["Rules", surface.active_rule_ids.join(", ") || "none"]
      ]),
      renderDetailsBlock("Reserved Pins", surface.reserved_pin_entries.length
        ? surface.reserved_pin_entries.map((entry) => [entry.id, `GPIO ${entry.gpio}`])
        : [["Reserved", "none"]]
      ),
      renderDetailsBlock("Forbidden Pins", [
        ["Count", String(surface.summary.forbidden_pin_count)],
        ["Pins", surface.forbidden_pins.length ? surface.forbidden_pins.join(", ") : "none"]
      ]),
      resource
        ? renderDetailsBlock("Selected Resource", [
          ["Resource", resource.title],
          ["Resource ID", resource.id],
          ["GPIO", String(resource.gpio)],
          ["Capabilities", resource.capabilities.join(", ") || "none"],
          ["Allowed GPIOs", resource.allowed_gpios_label],
          ["Note", resource.note || "n/a"]
        ])
        : `<section class="hardware-surface-block"><h4>Selected Resource</h4><div class="subview-empty">No hardware resource is available in this fixture.</div></section>`,
      renderDetailsBlock("Diagnostics", surface.diagnostics.length
        ? surface.diagnostics.map((entry) => [entry.code, `${entry.severity.toUpperCase()} • ${entry.message}`])
        : [["Diagnostics", "No manifest diagnostics."]]
      ),
      renderDetailsBlock("Boundary Notes", surface.boundary_notes.length
        ? surface.boundary_notes.map((entry, index) => [`Note ${index + 1}`, entry])
        : [["Boundary", "No boundary notes are attached to this fixture."]]
      ),
      `</div>`
    ].join("");
  }

  function normalizeResource(resource) {
    const allowedGpios = Array.isArray(resource?.allowed_gpios)
      ? resource.allowed_gpios.map((entry) => Number(entry))
      : [];

    return {
      id: resource?.id ?? "unknown_resource",
      title: resource?.title ?? resource?.id ?? "Unknown Resource",
      gpio: Number(resource?.gpio ?? 0),
      capabilities: Array.isArray(resource?.capabilities) ? resource.capabilities : [],
      allowed_gpios: allowedGpios,
      allowed_gpios_label: allowedGpios.length ? allowedGpios.join(", ") : "preset default only",
      note: resource?.note ?? ""
    };
  }

  function normalizeDiagnostic(diagnostic) {
    return {
      code: diagnostic?.code ?? "hardware.ui.unknown",
      severity: diagnostic?.severity ?? "warning",
      message: diagnostic?.message ?? "Unknown hardware diagnostic."
    };
  }

  function normalizeReservedPins(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce((accumulator, key) => {
        accumulator[key] = Number(value[key]);
        return accumulator;
      }, {});
  }

  function renderDetailsBlock(title, rows) {
    return [
      `<section class="hardware-surface-block">`,
      `<h4>${escapeHtml(title)}</h4>`,
      `<div class="hardware-surface-kv-list">`,
      rows.map(([key, value]) => [
        `<div class="hardware-surface-kv-row">`,
        `<span>${escapeHtml(key)}</span>`,
        `<strong>${escapeHtml(value)}</strong>`,
        `</div>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  return {
    createReadonlyHardwareSurfaceViewModel,
    renderReadonlyHardwareResourceMarkup,
    renderReadonlyHardwareDetailsMarkup
  };
});
