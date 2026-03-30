(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PackageCommissioningSurface = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  function createPackageCommissioningViewModel({ fixture }) {
    const summaryCards = normalizeEntries(fixture?.summary_cards, {
      value: "n/a",
      semantic_state: "informational"
    });
    const configuration = {
      template_ref: fixture?.configuration?.template_ref || "none",
      preset_ref: fixture?.configuration?.preset_ref || "none",
      parameter_groups: Array.isArray(fixture?.configuration?.parameter_groups) ? fixture.configuration.parameter_groups : [],
      bindings: normalizeEntries(fixture?.configuration?.bindings, {
        state: "missing",
        target: "unbound"
      }),
      apply_button: {
        label: fixture?.configuration?.apply_button?.label || "Apply",
        state: fixture?.configuration?.apply_button?.state || "ready"
      },
      apply_result: {
        state: fixture?.configuration?.apply_result?.state || "unknown",
        summary: fixture?.configuration?.apply_result?.summary || "No apply result.",
        request_id: fixture?.configuration?.apply_result?.request_id || "n/a",
        checksum_sha256: fixture?.configuration?.apply_result?.checksum_sha256 || "n/a",
        config_version: fixture?.configuration?.apply_result?.config_version || "n/a"
      },
      readback_status: {
        state: fixture?.configuration?.readback_status?.state || "no_snapshot",
        target_state: fixture?.configuration?.readback_status?.target_state || "unknown",
        collected_at: fixture?.configuration?.readback_status?.collected_at || "n/a",
        summary: fixture?.configuration?.readback_status?.summary || "No readback summary."
      }
    };
    const commissioning = {
      live_signals: normalizeEntries(fixture?.commissioning?.live_signals, {
        value: "n/a",
        semantic_state: "informational"
      }),
      operation_cards: normalizeEntries(fixture?.commissioning?.operation_cards, {
        state: "unknown",
        summary: "No operation summary.",
        confirmation_policy: "none"
      }),
      ownership_override: {
        current_lane: fixture?.commissioning?.ownership_override?.current_lane || "unknown",
        requested_lane: fixture?.commissioning?.ownership_override?.requested_lane || "none",
        summary: fixture?.commissioning?.ownership_override?.summary || "No ownership summary."
      },
      permissive_interlock: {
        state: fixture?.commissioning?.permissive_interlock?.state || "unknown",
        summary: fixture?.commissioning?.permissive_interlock?.summary || "No permissive/interlock summary."
      },
      protection_recovery: {
        state: fixture?.commissioning?.protection_recovery?.state || "unknown",
        summary: fixture?.commissioning?.protection_recovery?.summary || "No protection/recovery summary."
      }
    };

    return {
      fixture_id: fixture?.id ?? "package-commissioning-missing",
      title: fixture?.title ?? "Package Commissioning",
      subtitle: fixture?.description ?? "",
      package_instance_id: fixture?.package_instance_id ?? "unknown_package",
      package_definition: fixture?.package_definition ?? {
        package_id: "unknown.package",
        title: "Unknown Package",
        target_profile: "unknown"
      },
      summary_cards: summaryCards,
      configuration,
      commissioning,
      diagnostics: normalizeEntries(fixture?.diagnostics, {
        severity: "info",
        code: "diag.none",
        summary: "No diagnostics."
      })
    };
  }

  function renderPackageCommissioningMarkup(surface) {
    return [
      `<div class="package-overview-details-head">`,
      `<h3>${escapeHtml(surface.package_definition.title)}</h3>`,
      `<p>${escapeHtml(surface.package_instance_id)} • ${escapeHtml(surface.package_definition.target_profile)}</p>`,
      `</div>`,
      renderSummaryCards(surface.summary_cards),
      `<div class="package-overview-details-grid">`,
      renderRowsBlock("Package Summary", [
        ["Package ID", surface.package_definition.package_id],
        ["Package Instance", surface.package_instance_id],
        ["Target Profile", surface.package_definition.target_profile],
        ["Apply Button", `${surface.configuration.apply_button.label} (${surface.configuration.apply_button.state})`]
      ]),
      renderRowsBlock("Configuration / Apply", [
        ["Template", surface.configuration.template_ref],
        ["Preset", surface.configuration.preset_ref],
        ["Apply State", surface.configuration.apply_result.state],
        ["Apply Summary", surface.configuration.apply_result.summary],
        ["Checksum", surface.configuration.apply_result.checksum_sha256],
        ["Config Version", surface.configuration.apply_result.config_version],
        ["Readback", surface.configuration.readback_status.state],
        ["Readback Summary", surface.configuration.readback_status.summary]
      ]),
      renderEntryGroupBlock("Parameter Groups", surface.configuration.parameter_groups, "No parameter groups."),
      renderStateListBlock("Binding Summary", surface.configuration.bindings, "No bindings."),
      renderStateListBlock("Live Signals", surface.commissioning.live_signals, "No live signals."),
      renderStateListBlock("Operation Cards", surface.commissioning.operation_cards, "No commissioning operations."),
      renderRowsBlock("Ownership / Override", [
        ["Current Lane", surface.commissioning.ownership_override.current_lane],
        ["Requested Lane", surface.commissioning.ownership_override.requested_lane],
        ["Summary", surface.commissioning.ownership_override.summary]
      ]),
      renderRowsBlock("Permissive / Interlock", [
        ["State", surface.commissioning.permissive_interlock.state],
        ["Summary", surface.commissioning.permissive_interlock.summary]
      ]),
      renderRowsBlock("Protection / Recovery", [
        ["State", surface.commissioning.protection_recovery.state],
        ["Summary", surface.commissioning.protection_recovery.summary]
      ]),
      renderStateListBlock("Diagnostics", surface.diagnostics, "No diagnostics."),
      `</div>`
    ].join("");
  }

  function renderSummaryCards(entries) {
    return [
      `<div class="package-overview-summary">`,
      ...entries.map((entry) => [
        `<div class="package-overview-block">`,
        `<h4>${escapeHtml(entry.title)}</h4>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.semantic_state || entry.state || "informational"))}">${escapeHtml(formatStateLabel(entry.semantic_state || entry.state || "informational"))}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.value)}</div>`,
        `</div>`
      ].join("")),
      `</div>`
    ].join("");
  }

  function renderRowsBlock(title, rows) {
    return [
      `<section class="package-overview-block">`,
      `<h4>${escapeHtml(title)}</h4>`,
      `<div class="package-overview-rows">`,
      ...rows.map(([label, value]) => `<div class="package-overview-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(String(value))}</span></div>`),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderEntryGroupBlock(title, groups, emptyText) {
    if (!groups.length) {
      return `<section class="package-overview-block"><h4>${escapeHtml(title)}</h4><div class="subview-empty">${escapeHtml(emptyText)}</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>${escapeHtml(title)}</h4>`,
      ...groups.map((group) => [
        `<div class="package-overview-state-card">`,
        `<strong>${escapeHtml(group.title || group.id)}</strong>`,
        `<div class="package-overview-rows">`,
        ...(Array.isArray(group.entries) ? group.entries.map((entry) => `<div class="package-overview-row"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(`${entry.value} • ${entry.source}`)}</span></div>`) : []),
        `</div>`,
        `</div>`
      ].join("")),
      `</section>`
    ].join("");
  }

  function renderStateListBlock(title, entries, emptyText) {
    if (!entries.length) {
      return `<section class="package-overview-block"><h4>${escapeHtml(title)}</h4><div class="subview-empty">${escapeHtml(emptyText)}</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>${escapeHtml(title)}</h4>`,
      `<div class="package-overview-state-list">`,
      ...entries.map((entry) => [
        `<div class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title || entry.id)}</strong>`,
        `<span>${escapeHtml(entry.code || entry.binding_kind || entry.confirmation_policy || entry.state || entry.semantic_state || "")}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.state || entry.semantic_state || entry.severity || "informational"))}">${escapeHtml(formatStateLabel(entry.state || entry.semantic_state || entry.severity || "informational"))}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary || entry.target || entry.value || "")}</div>`,
        `</div>`
      ].join("")),
      `</div>`,
      `</section>`
    ].join("");
  }

  function normalizeEntries(entries, defaults) {
    return Array.isArray(entries)
      ? entries.map((entry) => ({ ...defaults, ...entry }))
      : [];
  }

  function formatStateLabel(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function stateClass(value) {
    return String(value || "informational").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return {
    createPackageCommissioningViewModel,
    renderPackageCommissioningMarkup
  };
});
