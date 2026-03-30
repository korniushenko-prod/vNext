(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PackageOverviewReadonly = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  function createReadonlyPackageOverviewViewModel({ fixture, selectedMemberId }) {
    const packageSupervision = normalizePackageSupervision(fixture?.package_supervision);
    const packageCoordination = normalizePackageCoordination(fixture?.package_coordination);
    const packageModePhase = normalizePackageModePhase(fixture?.package_mode_phase);
    const packagePermissiveInterlock = normalizePackagePermissiveInterlock(fixture?.package_permissive_interlock);
    const packageProtectionRecovery = normalizePackageProtectionRecovery(fixture?.package_protection_recovery);
    const packageOverrideHandover = normalizePackageOverrideHandover(fixture?.package_override_handover);
    const packageArbitration = normalizePackageArbitration(fixture?.package_arbitration);
    const childSummaryByMemberId = new Map(
      packageSupervision.child_summary_cards.map((entry) => [entry.member_id, entry])
    );
    const members = Array.isArray(fixture?.members) ? fixture.members.map(enrichMember) : [];
    const enrichedMembers = members.map((entry) => {
      const childSummary = childSummaryByMemberId.get(entry.id);
      return {
        ...entry,
        child_state: childSummary?.state || "not_configured",
        child_state_label: formatStateLabel(childSummary?.state || "not_configured"),
        child_state_summary: childSummary?.summary || "No package supervision child summary."
      };
    });
    const effectiveObjects = Array.isArray(fixture?.effective_objects)
      ? fixture.effective_objects.map((entry) => ({
        ...entry,
        package_neutral_label: entry.package_neutral ? "package-neutral" : "specialized"
      }))
      : [];
    const effectiveSelectedId = enrichedMembers.some((entry) => entry.id === selectedMemberId)
      ? selectedMemberId
      : enrichedMembers[0]?.id ?? "";
    const selectedMember = enrichedMembers.find((entry) => entry.id === effectiveSelectedId) ?? null;
    const activePackageSurfaceKind = packageOverrideHandover.enabled
      ? "override_handover"
      : packageArbitration.enabled
      ? "arbitration"
      : packageProtectionRecovery.enabled
      ? "protection_recovery"
      : packagePermissiveInterlock.enabled
      ? "permissive_interlock"
      : packageModePhase.enabled
      ? "mode_phase"
      : packageCoordination.enabled
        ? "coordination"
        : "supervision";
    const activePackageSurface = packageOverrideHandover.enabled
      ? packageOverrideHandover
      : packageArbitration.enabled
      ? packageArbitration
      : packageProtectionRecovery.enabled
      ? packageProtectionRecovery
      : packagePermissiveInterlock.enabled
      ? packagePermissiveInterlock
      : packageModePhase.enabled
      ? packageModePhase
      : packageCoordination.enabled
        ? packageCoordination
        : packageSupervision;

    return {
      fixture_id: fixture?.id ?? "package-overview-missing",
      title: fixture?.title ?? "Package Overview",
      subtitle: fixture?.description ?? "",
      package_instance_id: fixture?.package_instance_id ?? "unknown_package_instance",
      package_definition: {
        package_id: fixture?.package_definition?.package_id ?? "unknown.package",
        title: fixture?.package_definition?.title ?? "Unknown Package",
        origin: fixture?.package_definition?.origin ?? "unknown",
        preset_count: Number(fixture?.package_definition?.preset_count ?? 0),
        template_count: Number(fixture?.package_definition?.template_count ?? 0),
        presets: Array.isArray(fixture?.package_definition?.presets) ? fixture.package_definition.presets : [],
        templates: Array.isArray(fixture?.package_definition?.templates) ? fixture.package_definition.templates : [],
        boundary_notes: Array.isArray(fixture?.package_definition?.boundary_notes) ? fixture.package_definition.boundary_notes : []
      },
      members: enrichedMembers,
      selected_member_id: effectiveSelectedId,
      selected_member: selectedMember,
      effective_objects: effectiveObjects,
      package_supervision: packageSupervision,
      package_coordination: packageCoordination,
      package_mode_phase: packageModePhase,
      package_permissive_interlock: packagePermissiveInterlock,
      package_protection_recovery: packageProtectionRecovery,
      package_override_handover: packageOverrideHandover,
      package_arbitration: packageArbitration,
      active_package_surface_kind: activePackageSurfaceKind,
      active_package_surface: activePackageSurface,
      empty: members.length === 0
    };
  }

  function enrichMember(member) {
    const relatedSurfaces = Array.isArray(member?.related_surfaces) ? member.related_surfaces : [];
    return {
      ...member,
      template_label: member?.template_ref || "none",
      preset_label: member?.preset_ref || "none",
      related_surfaces: relatedSurfaces,
      related_surface_summary: relatedSurfaces.length
        ? relatedSurfaces.map((entry) => `${entry.section}: ${entry.title}`).join(" | ")
        : "No linked object surface."
    };
  }

  function renderReadonlyPackageMemberMarkup(member) {
    return [
      `<div class="package-overview-card-head">`,
      `<strong>${escapeHtml(member.title)}</strong>`,
      `<span>${escapeHtml(member.type_title)} • ${escapeHtml(member.role)}</span>`,
      `</div>`,
      `<div class="package-overview-card-copy">${escapeHtml(member.effective_object_id)}</div>`,
      `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(member.child_state))}">${escapeHtml(member.child_state_label)}</span></div>`,
      `<div class="package-overview-note">${escapeHtml(member.related_surface_summary)}</div>`
    ].join("");
  }

  function renderReadonlyPackageDetailsMarkup(surface) {
    const member = surface?.selected_member;
    const packageSurface = surface?.active_package_surface || normalizePackageSupervision();
    const overrideActive = surface?.active_package_surface_kind === "override_handover";
    const arbitrationActive = surface?.active_package_surface_kind === "arbitration";
    const protectionActive = surface?.active_package_surface_kind === "protection_recovery";
    const interlockActive = surface?.active_package_surface_kind === "permissive_interlock";
    const modePhaseActive = surface?.active_package_surface_kind === "mode_phase";
    const coordinationActive = surface?.active_package_surface_kind === "coordination";

    return [
      `<div class="package-overview-details-head">`,
      `<h3>${escapeHtml(surface.package_definition.title)}</h3>`,
      `<p>${escapeHtml(surface.package_instance_id)} • ${escapeHtml(surface.package_definition.package_id)}</p>`,
      `</div>`,
      `<div class="package-overview-details-grid">`,
      renderDetailsBlock("Package Summary", [
        ["Package ID", surface.package_definition.package_id],
        ["Package Instance", surface.package_instance_id],
        ["Origin", surface.package_definition.origin],
        ["Members", String(surface.members.length)]
      ]),
      renderPackageSurfaceStateBlock(
        overrideActive
          ? "Package Override / Handover"
          : arbitrationActive
          ? "Package Arbitration"
          : protectionActive
          ? "Package Protection / Recovery"
          : interlockActive
          ? "Package Permissive / Interlock"
          : modePhaseActive
            ? "Package Mode / Phase"
            : coordinationActive
              ? "Package Coordination"
              : "Package Supervision",
        packageSurface
      ),
      renderDetailsBlock("Templates / Presets", [
        ["Template Count", String(surface.package_definition.template_count)],
        ["Preset Count", String(surface.package_definition.preset_count)],
        ["Templates", surface.package_definition.templates.join(", ") || "none"],
        ["Presets", surface.package_definition.presets.join(", ") || "none"]
      ]),
      member
        ? renderDetailsBlock("Selected Member", [
          ["Member ID", member.id],
          ["Type", member.type_title],
          ["Role", member.role],
          ["Template", member.template_label],
          ["Preset", member.preset_label],
          ["Effective Object", member.effective_object_id]
        ])
        : `<section class="package-overview-block"><h4>Selected Member</h4><div class="subview-empty">No package members in this fixture yet.</div></section>`,
      renderDetailsBlock("Boundary Notes", [
        ...(member ? [["Member Boundary", member.boundary_note]] : [["Member Boundary", "No member boundary is available for this degraded fixture."]]),
        ...surface.package_definition.boundary_notes.map((note, index) => [`Package Note ${index + 1}`, note])
      ]),
      member
        ? renderDetailsBlock("Linked Object Surfaces", member.related_surfaces.length
          ? member.related_surfaces.map((entry) => [entry.section, `${entry.title} (${entry.fixture_id})`])
          : [["Linked Surface", "No linked object surface."]]
        )
        : `<section class="package-overview-block"><h4>Linked Object Surfaces</h4><div class="subview-empty">No linked object surface.</div></section>`,
      overrideActive || arbitrationActive
        ? renderPackageArbitrationOwnershipBlock(packageSurface)
        : protectionActive
        ? renderPackageProtectionSummaryBlock(packageSurface)
        : interlockActive
        ? renderPackageGateSummaryBlock(packageSurface)
        : modePhaseActive
          ? renderModePhaseActiveBlock(packageSurface)
          : renderPackageSummaryOutputsBlock(packageSurface),
      overrideActive || arbitrationActive
        ? renderPackageArbitrationCommandSummaryBlock(packageSurface)
        : protectionActive
        ? renderPackageProtectionReasonBlock(packageSurface)
        : interlockActive
          ? renderPackageGateEntriesBlock(packageSurface)
          : modePhaseActive
            ? renderModePhaseSummaryBlock(packageSurface)
            : renderAggregateRollupsBlock(packageSurface),
      overrideActive || arbitrationActive
        ? renderPackageArbitrationOwnershipLanesBlock(packageSurface)
        : protectionActive
        ? renderPackageProtectionRecoveryRequestsBlock(packageSurface)
        : interlockActive
        ? renderPackageGateReasonBlock(packageSurface)
        : modePhaseActive
          ? renderModePhaseGroupsBlock(packageSurface)
          : renderTraceGroupsBlock(packageSurface, coordinationActive ? "Coordination Traces" : "Package Traces"),
      overrideActive || arbitrationActive
        ? renderPackageArbitrationCommandLanesBlock(packageSurface)
        : protectionActive
        ? renderPackageSummaryOutputsBlock(packageSurface)
        : interlockActive
        ? renderPackageTransitionGuardsBlock(packageSurface)
        : modePhaseActive
          ? renderModePhaseExecutionBlock(packageSurface)
          : renderOperationProxiesBlock(packageSurface),
      overrideActive || arbitrationActive
        ? renderPackageSummaryOutputsBlock(packageSurface)
        : protectionActive
        ? renderAggregateRollupsBlock(packageSurface)
        : interlockActive
        ? renderPackageSummaryOutputsBlock(packageSurface)
        : modePhaseActive
          ? renderModePhaseLinksBlock(packageSurface)
          : "",
      overrideActive || arbitrationActive
        ? renderAggregateRollupsBlock(packageSurface)
        : protectionActive
        ? renderTraceGroupsBlock(packageSurface, "Protection Traces")
        : interlockActive
        ? renderAggregateRollupsBlock(packageSurface)
        : modePhaseActive
          ? renderTraceGroupsBlock(packageSurface, "Mode / Phase Traces")
          : coordinationActive
            ? ""
            : renderChildSummaryCardsBlock(surface.package_supervision),
      overrideActive || arbitrationActive
        ? renderTraceGroupsBlock(packageSurface, overrideActive ? "Package Override / Handover Traces" : "Package Arbitration Traces")
        : protectionActive
        ? renderPackageProtectionDiagnosticsBlock(packageSurface)
        : interlockActive
          ? renderTraceGroupsBlock(packageSurface, "Package Gate Traces")
          : "",
      renderEffectiveObjectsBlock(surface.effective_objects),
      `</div>`
    ].join("");
  }

  function renderPackageSurfaceStateBlock(title, packageSurface) {
    return [
      `<section class="package-overview-block">`,
      `<h4>${escapeHtml(title)}</h4>`,
      `<div class="package-overview-badges">`,
      `<span class="package-state-badge is-${escapeHtml(stateClass(packageSurface.snapshot_state))}">${escapeHtml(packageSurface.snapshot_state_label)}</span>`,
      `</div>`,
      `<div class="package-overview-note">${escapeHtml(packageSurface.snapshot_note)}</div>`,
      `</section>`
    ].join("");
  }

  function renderPackageArbitrationOwnershipBlock(packageSurface) {
    const ownershipSummary = packageSurface.ownership_summary;
    if (!ownershipSummary) {
      return `<section class="package-overview-block"><h4>Ownership Summary</h4><div class="subview-empty">No package ownership summary is available.</div></section>`;
    }

    return renderDetailsBlock("Ownership Summary", [
      ["State", ownershipSummary.state_label],
      ["Active Lanes", ownershipSummary.active_lane_ids.join(", ") || "none"],
      ["Current Holder", ownershipSummary.current_holder_id || "n/a"],
      ["Current Lane", ownershipSummary.current_lane_label || "n/a"],
      ["Requested Holder", ownershipSummary.requested_holder_id || "n/a"],
      ["Last Handover Reason", ownershipSummary.last_handover_reason || "n/a"],
      ["Lane Count", String(packageSurface.ownership_lanes.length)],
      ["Summary", ownershipSummary.summary || "No ownership summary."]
    ]);
  }

  function renderPackageArbitrationCommandSummaryBlock(packageSurface) {
    const commandSummary = packageSurface.command_summary;
    if (!commandSummary) {
      return `<section class="package-overview-block"><h4>Command Summary</h4><div class="subview-empty">No package command summary is available.</div></section>`;
    }

    return renderDetailsBlock("Command Summary", [
      ["State", commandSummary.state_label],
      ["Active Owner Lanes", commandSummary.active_owner_lane_ids.join(", ") || "none"],
      ["Accepted", String(commandSummary.accepted_lane_ids.length)],
      ["Blocked", String(commandSummary.blocked_lane_ids.length)],
      ["Denied", String(commandSummary.denied_lane_ids.length)],
      ["Superseded", String(commandSummary.superseded_lane_ids.length)]
    ]);
  }

  function renderPackageArbitrationOwnershipLanesBlock(packageSurface) {
    if (!packageSurface.ownership_lanes.length) {
      return `<section class="package-overview-block"><h4>Ownership Lanes</h4><div class="subview-empty">No ownership lanes are available.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Ownership Lanes</h4>`,
      `<div class="package-overview-state-list">`,
      packageSurface.ownership_lanes.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.lane_label)} • ${escapeHtml(entry.id)}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.state))}">${escapeHtml(entry.state_label)}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `<div class="package-overview-card-copy">${escapeHtml(entry.source_summary)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderPackageArbitrationCommandLanesBlock(packageSurface) {
    if (!packageSurface.command_lanes.length) {
      return `<section class="package-overview-block"><h4>Command Lanes</h4><div class="subview-empty">No command lanes are available.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Command Lanes</h4>`,
      `<div class="package-overview-state-list">`,
      packageSurface.command_lanes.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.request_kind_label)} • ${escapeHtml(entry.ownership_lane_label)}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.state))}">${escapeHtml(entry.state_label)}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `<div class="package-overview-card-copy">${escapeHtml(entry.request_preview)}</div>`,
        `<div class="package-overview-note">${escapeHtml(entry.reason_label)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderPackageProtectionSummaryBlock(packageSurface) {
    const protectionSummary = packageSurface.protection_summary;
    if (!protectionSummary) {
      return `<section class="package-overview-block"><h4>Protection Summary</h4><div class="subview-empty">No package protection summary is available.</div></section>`;
    }

    return renderDetailsBlock("Protection Summary", [
      ["Protection State", protectionSummary.state_label],
      ["Ready", protectionSummary.ready ? "true" : "false"],
      ["Trips", String(protectionSummary.trip_reason_ids.length)],
      ["Inhibits", String(protectionSummary.inhibit_reason_ids.length)],
      ["Recovery Requests", String(protectionSummary.recovery_request_ids.length)],
      ["Diagnostic Summaries", String(protectionSummary.diagnostic_summary_ids.length)]
    ]);
  }

  function renderPackageProtectionReasonBlock(packageSurface) {
    const entries = [...packageSurface.trips, ...packageSurface.inhibits];
    if (!entries.length) {
      return `<section class="package-overview-block"><h4>Trips / Inhibits</h4><div class="subview-empty">No trips or inhibits are available.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Trips / Inhibits</h4>`,
      `<div class="package-overview-state-list">`,
      entries.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.section)} • ${escapeHtml(entry.id)}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.state))}">${escapeHtml(entry.state_label)}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `<div class="package-overview-card-copy">${escapeHtml(entry.reason_label)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderPackageProtectionRecoveryRequestsBlock(packageSurface) {
    if (!packageSurface.recovery_requests.length) {
      return `<section class="package-overview-block"><h4>Recovery Requests</h4><div class="subview-empty">No package recovery requests are available.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Recovery Requests</h4>`,
      `<div class="package-overview-state-list">`,
      packageSurface.recovery_requests.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.kind_label)} • ${escapeHtml(entry.target_operation_id)}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.availability_state))}">${escapeHtml(entry.availability_state_label)}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `<div class="package-overview-card-copy">${escapeHtml(entry.target_owner_label)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderPackageProtectionDiagnosticsBlock(packageSurface) {
    if (!packageSurface.diagnostic_summaries.length) {
      return `<section class="package-overview-block"><h4>Protection Diagnostics</h4><div class="subview-empty">No package protection diagnostic summaries are active.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Protection Diagnostics</h4>`,
      `<div class="package-overview-state-list">`,
      packageSurface.diagnostic_summaries.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.id)}</span>`,
        `</div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `<div class="package-overview-card-copy">${escapeHtml(entry.reasons_label)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderPackageGateSummaryBlock(packageSurface) {
    const gateSummary = packageSurface.gate_summary;
    if (!gateSummary) {
      return `<section class="package-overview-block"><h4>Gate Summary</h4><div class="subview-empty">No package gate summary is available.</div></section>`;
    }

    return renderDetailsBlock("Gate Summary", [
      ["Gate State", gateSummary.state_label],
      ["Ready", gateSummary.ready ? "true" : "false"],
      ["Blocked Reasons", String(gateSummary.blocked_reason_ids.length)],
      ["Held Reasons", String(gateSummary.held_reason_ids.length)],
      ["Faulted Reasons", String(gateSummary.faulted_reason_ids.length)],
      ["Transition Guards", String(gateSummary.transition_guard_ids.length)]
    ]);
  }

  function renderPackageGateEntriesBlock(packageSurface) {
    if (!packageSurface.gate_entries.length) {
      return `<section class="package-overview-block"><h4>Gate Entries</h4><div class="subview-empty">No package gate entries are available.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Gate Entries</h4>`,
      `<div class="package-overview-state-list">`,
      packageSurface.gate_entries.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.section)} • ${escapeHtml(entry.id)}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.state))}">${escapeHtml(entry.state_label)}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `<div class="package-overview-card-copy">${escapeHtml(entry.reason_label)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderPackageGateReasonBlock(packageSurface) {
    if (!packageSurface.reason_cards.length) {
      return `<section class="package-overview-block"><h4>Reason List</h4><div class="subview-empty">No blocked, held, or faulted reasons are active.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Reason List</h4>`,
      `<div class="package-overview-state-list">`,
      packageSurface.reason_cards.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.id)}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.state))}">${escapeHtml(entry.state_label)}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `<div class="package-overview-card-copy">${escapeHtml(entry.reason_label)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderPackageTransitionGuardsBlock(packageSurface) {
    if (!packageSurface.transition_guards.length) {
      return `<section class="package-overview-block"><h4>Transition Guards</h4><div class="subview-empty">No package transition guards are defined.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Transition Guards</h4>`,
      `<div class="package-overview-state-list">`,
      packageSurface.transition_guards.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.target_label)}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.state))}">${escapeHtml(entry.state_label)}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `<div class="package-overview-card-copy">${escapeHtml(entry.blocked_by_label)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderPackageSummaryOutputsBlock(packageSurface) {
    if (!packageSurface.summary_outputs.length) {
      return `<section class="package-overview-block"><h4>Summary Outputs</h4><div class="subview-empty">No package summary snapshot is available.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Summary Outputs</h4>`,
      `<div class="package-overview-state-list">`,
      packageSurface.summary_outputs.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.id)}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.semantic_state))}">${escapeHtml(entry.semantic_state_label)}</span></div>`,
        `<div class="package-overview-card-copy">${escapeHtml(entry.value)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderAggregateRollupsBlock(packageSurface) {
    const cards = [
      ...packageSurface.aggregate_monitors.map((entry) => ({
        ...entry,
        section: "Monitor Rollup"
      })),
      ...(packageSurface.aggregate_alarms || []).map((entry) => ({
        ...entry,
        section: "Alarm Rollup"
      }))
    ];

    if (!cards.length) {
      return `<section class="package-overview-block"><h4>Rollups</h4><div class="subview-empty">No aggregate rollups are available.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Rollups</h4>`,
      `<div class="package-overview-state-list">`,
      cards.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.section)} • ${escapeHtml(entry.severity || "none")}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.state))}">${escapeHtml(formatStateLabel(entry.state))}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderTraceGroupsBlock(packageSurface, title) {
    if (!packageSurface.trace_groups.length) {
      return `<section class="package-overview-block"><h4>${escapeHtml(title)}</h4><div class="subview-empty">No package trace groups are defined.</div></section>`;
    }

    return renderDetailsBlock(
      title,
      packageSurface.trace_groups.map((entry) => [
        entry.title,
        `${entry.signal_count} signals • ${entry.summary}`
      ])
    );
  }

  function renderOperationProxiesBlock(packageSurface) {
    if (!packageSurface.operation_proxies.length) {
      return `<section class="package-overview-block"><h4>Operation Proxies</h4><div class="subview-empty">No package proxy operations are available.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Operation Proxies</h4>`,
      `<div class="package-overview-state-list">`,
      packageSurface.operation_proxies.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.child_operation_kind || entry.kind || "proxy")}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.state))}">${escapeHtml(entry.state_label)}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderModePhaseActiveBlock(packageModePhase) {
    return renderDetailsBlock("Active Mode / Phase", [
      ["Active Mode", packageModePhase.active_mode.title],
      ["Active Phase", packageModePhase.active_phase.title],
      ["Mode Ref", packageModePhase.active_mode.id],
      ["Phase Ref", packageModePhase.active_phase.id]
    ]);
  }

  function renderModePhaseSummaryBlock(packageModePhase) {
    return [
      renderDetailsBlock("Mode Summary", packageModePhase.mode_summary_entries.length
        ? packageModePhase.mode_summary_entries.map((entry) => [
          entry.title,
          `${entry.semantic_state_label} • ${entry.summary}`
        ])
        : [["Mode Summary", "No package mode summary is available."]]),
      renderDetailsBlock("Phase Summary", packageModePhase.phase_summary_entries.length
        ? packageModePhase.phase_summary_entries.map((entry) => [
          entry.title,
          `${entry.semantic_state_label} • ${entry.summary}`
        ])
        : [["Phase Summary", "No package phase summary is available."]])
    ].join("");
  }

  function renderModePhaseGroupsBlock(packageModePhase) {
    return [
      renderDetailsBlock("Mode Groups", packageModePhase.mode_groups.length
        ? packageModePhase.mode_groups.map((entry) => [
          entry.title,
          `${entry.member_count} refs • ${entry.summary}`
        ])
        : [["Mode Groups", "No package mode groups are defined."]]),
      renderDetailsBlock("Phase Groups", packageModePhase.phase_groups.length
        ? packageModePhase.phase_groups.map((entry) => [
          entry.title,
          `${entry.member_count} refs • ${entry.summary}`
        ])
        : [["Phase Groups", "No package phase groups are defined."]])
    ].join("");
  }

  function renderModePhaseExecutionBlock(packageModePhase) {
    const activeTransitionRows = packageModePhase.active_transition
      ? [
        ["Intent", packageModePhase.active_transition.intent_label],
        ["Target", packageModePhase.active_transition.target_label],
        ["Lifecycle", packageModePhase.active_transition.lifecycle_state_label],
        ["Guard", packageModePhase.active_transition.guard_state_label],
        ["Summary", packageModePhase.active_transition.summary]
      ]
      : [["Active Transition", "No synthetic transition lifecycle is active."]];

    const transitionCards = packageModePhase.transition_actions.length
      ? [
        `<section class="package-overview-block">`,
        `<h4>Allowed Transition Actions</h4>`,
        `<div class="package-overview-state-list">`,
        packageModePhase.transition_actions.map((entry) => [
          `<article class="package-overview-state-card">`,
          `<div class="package-overview-card-head">`,
          `<strong>${escapeHtml(entry.title)}</strong>`,
          `<span>${escapeHtml(entry.intent_label)} • ${escapeHtml(entry.target_label)}</span>`,
          `</div>`,
          `<div class="package-overview-badges">`,
          `<span class="package-state-badge is-${escapeHtml(stateClass(entry.lifecycle_state))}">${escapeHtml(entry.lifecycle_state_label)}</span>`,
          `<span class="package-state-badge is-${escapeHtml(stateClass(entry.guard_state))}">${escapeHtml(entry.guard_state_label)}</span>`,
          `</div>`,
          `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
          `<div class="package-overview-card-copy">${escapeHtml(entry.request_preview)}</div>`,
          `</article>`
        ].join("")).join(""),
        `</div>`,
        `</section>`
      ].join("")
      : `<section class="package-overview-block"><h4>Allowed Transition Actions</h4><div class="subview-empty">No bounded package transition actions are exposed in this fixture.</div></section>`;

    return [
      renderDetailsBlock("Active Transition Lane", activeTransitionRows),
      transitionCards
    ].join("");
  }

  function renderModePhaseLinksBlock(packageModePhase) {
    const rows = [];
    rows.push(["Supervision Link", packageModePhase.package_supervision_id || "none"]);
    rows.push(["Coordination Link", packageModePhase.package_coordination_id || "none"]);
    return renderDetailsBlock("Package Links", rows);
  }

  function renderChildSummaryCardsBlock(packageSupervision) {
    if (!packageSupervision.child_summary_cards.length) {
      return `<section class="package-overview-block"><h4>Child Summary</h4><div class="subview-empty">No child package summaries are available.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Child Summary</h4>`,
      `<div class="package-overview-state-list">`,
      packageSupervision.child_summary_cards.map((entry) => [
        `<article class="package-overview-state-card">`,
        `<div class="package-overview-card-head">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.member_id)}</span>`,
        `</div>`,
        `<div class="package-overview-badges"><span class="package-state-badge is-${escapeHtml(stateClass(entry.state))}">${escapeHtml(entry.state_label)}</span></div>`,
        `<div class="package-overview-note">${escapeHtml(entry.summary)}</div>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderEffectiveObjectsBlock(entries) {
    if (!entries.length) {
      return `<section class="package-overview-block"><h4>Effective Objects</h4><div class="subview-empty">No effective objects.</div></section>`;
    }

    return [
      `<section class="package-overview-block">`,
      `<h4>Effective Objects</h4>`,
      `<div class="package-overview-effective-list">`,
      entries.map((entry) => [
        `<article class="package-overview-effective-card">`,
        `<strong>${escapeHtml(entry.title)}</strong>`,
        `<span>${escapeHtml(entry.id)}</span>`,
        `<span>${escapeHtml(entry.type_title)} • ${escapeHtml(entry.package_neutral_label)}</span>`,
        `<span>${escapeHtml(entry.execution_boundary)}</span>`,
        `</article>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderDetailsBlock(title, rows) {
    return [
      `<section class="package-overview-block">`,
      `<h4>${escapeHtml(title)}</h4>`,
      rows.length
        ? `<div class="package-overview-rows">${rows.map(renderRowMarkup).join("")}</div>`
        : `<div class="subview-empty">No data.</div>`,
      `</section>`
    ].join("");
  }

  function renderRowMarkup([label, value]) {
    return `<div class="package-overview-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value ?? ""))}</strong></div>`;
  }

  function normalizePackageSupervision(packageSupervision) {
    const snapshotState = packageSupervision?.snapshot_state || "healthy";
    return {
      enabled: Array.isArray(packageSupervision?.summary_outputs)
        || Array.isArray(packageSupervision?.aggregate_monitors)
        || Array.isArray(packageSupervision?.aggregate_alarms)
        || Array.isArray(packageSupervision?.trace_groups)
        || Array.isArray(packageSupervision?.operation_proxies)
        || Array.isArray(packageSupervision?.child_summary_cards),
      snapshot_state: snapshotState,
      snapshot_state_label: formatStateLabel(snapshotState),
      snapshot_note: snapshotState === "no_snapshot"
        ? "No target snapshot is available for package supervision yet."
        : snapshotState === "unsupported_by_target"
          ? "Current target surface does not expose package supervision snapshots."
          : "Package supervision is rendered from frozen contracts and synthetic service-layer state only.",
      summary_outputs: normalizeStateEntries(packageSupervision?.summary_outputs, {
        semantic_state: "informational",
        value: "n/a"
      }),
      aggregate_monitors: normalizeStateEntries(packageSupervision?.aggregate_monitors, {
        state: "healthy",
        severity: "info",
        summary: "No aggregate monitor summary."
      }),
      aggregate_alarms: normalizeStateEntries(packageSupervision?.aggregate_alarms, {
        state: "healthy",
        severity: "info",
        summary: "No aggregate alarm summary."
      }),
      trace_groups: Array.isArray(packageSupervision?.trace_groups)
        ? packageSupervision.trace_groups.map((entry) => ({
          ...entry,
          signal_count: Number(entry.signal_count ?? 0),
          summary: entry.summary || "No trace summary."
        }))
        : [],
      operation_proxies: normalizeStateEntries(packageSupervision?.operation_proxies, {
        state: "available",
        summary: "No proxy operation summary."
      }),
      child_summary_cards: normalizeStateEntries(packageSupervision?.child_summary_cards, {
        state: "healthy",
        summary: "No child summary."
      })
    };
  }

  function normalizePackageCoordination(packageCoordination) {
    const snapshotState = packageCoordination?.snapshot_state || "standby";
    return {
      enabled: Array.isArray(packageCoordination?.summary_outputs)
        || Array.isArray(packageCoordination?.aggregate_monitors)
        || Array.isArray(packageCoordination?.trace_groups)
        || Array.isArray(packageCoordination?.operation_proxies),
      snapshot_state: snapshotState,
      snapshot_state_label: formatStateLabel(snapshotState),
      snapshot_note: snapshotState === "no_snapshot"
        ? "No target snapshot is available for package coordination yet."
        : snapshotState === "unsupported_by_target"
          ? "Current target surface does not expose package coordination snapshots."
          : "Package coordination is rendered from frozen package contracts and child execution lanes only.",
      summary_outputs: normalizeStateEntries(packageCoordination?.summary_outputs, {
        semantic_state: "informational",
        value: "n/a"
      }),
      aggregate_monitors: normalizeStateEntries(packageCoordination?.aggregate_monitors, {
        state: "standby",
        severity: "info",
        summary: "No coordination monitor summary."
      }),
      aggregate_alarms: [],
      trace_groups: Array.isArray(packageCoordination?.trace_groups)
        ? packageCoordination.trace_groups.map((entry) => ({
          ...entry,
          signal_count: Number(entry.signal_count ?? 0),
          summary: entry.summary || "No trace summary."
        }))
        : [],
      operation_proxies: normalizeStateEntries(packageCoordination?.operation_proxies, {
        state: "available",
        summary: "No coordination proxy summary."
      }),
      child_summary_cards: []
    };
  }

  function normalizePackageModePhase(packageModePhase) {
    const snapshotState = packageModePhase?.snapshot_state || "mode_phase_available";
    const modeSummaryEntries = normalizeStateEntries(packageModePhase?.mode_summary_entries, {
      semantic_state: "informational",
      summary: "No mode summary."
    });
    const phaseSummaryEntries = normalizeStateEntries(packageModePhase?.phase_summary_entries, {
      semantic_state: "informational",
      summary: "No phase summary."
    });

    return {
      enabled: Array.isArray(packageModePhase?.mode_summary_entries)
        || Array.isArray(packageModePhase?.phase_summary_entries)
        || Array.isArray(packageModePhase?.mode_groups)
        || Array.isArray(packageModePhase?.phase_groups)
        || Array.isArray(packageModePhase?.transition_actions),
      snapshot_state: snapshotState,
      snapshot_state_label: formatStateLabel(snapshotState),
      snapshot_note: snapshotState === "no_snapshot"
        ? "No target snapshot is available for package mode / phase yet."
        : snapshotState === "unsupported_by_target"
          ? "Current target surface does not expose package mode / phase snapshots."
          : Array.isArray(packageModePhase?.transition_actions) && packageModePhase.transition_actions.length
            ? "Package mode / phase execution stays bounded, generic, and synthetic at the UI/service layer."
            : "Package mode / phase is rendered from frozen metadata-only package orchestration contracts.",
      active_mode: {
        id: packageModePhase?.active_mode?.id || "none",
        title: packageModePhase?.active_mode?.title || "None"
      },
      active_phase: {
        id: packageModePhase?.active_phase?.id || "none",
        title: packageModePhase?.active_phase?.title || "None"
      },
      mode_summary_entries: modeSummaryEntries,
      phase_summary_entries: phaseSummaryEntries,
      mode_groups: Array.isArray(packageModePhase?.mode_groups)
        ? packageModePhase.mode_groups.map((entry) => ({
          ...entry,
          member_count: Number(entry.member_count ?? 0),
          summary: entry.summary || "No mode group summary."
        }))
        : [],
      phase_groups: Array.isArray(packageModePhase?.phase_groups)
        ? packageModePhase.phase_groups.map((entry) => ({
          ...entry,
          member_count: Number(entry.member_count ?? 0),
          summary: entry.summary || "No phase group summary."
        }))
        : [],
      trace_groups: Array.isArray(packageModePhase?.trace_groups)
        ? packageModePhase.trace_groups.map((entry) => ({
          ...entry,
          signal_count: Number(entry.signal_count ?? 0),
          summary: entry.summary || "No trace summary."
        }))
        : [],
      active_transition: packageModePhase?.active_transition
        ? {
          ...packageModePhase.active_transition,
          intent_label: formatStateLabel(packageModePhase.active_transition.intent),
          lifecycle_state: packageModePhase.active_transition.lifecycle_state || "pending",
          lifecycle_state_label: formatStateLabel(packageModePhase.active_transition.lifecycle_state || "pending"),
          guard_state: packageModePhase.active_transition.guard_state || "clear",
          guard_state_label: formatStateLabel(packageModePhase.active_transition.guard_state || "clear"),
          target_label: packageModePhase.active_transition.target_label || "No target",
          summary: packageModePhase.active_transition.summary || "No active transition summary."
        }
        : null,
      transition_actions: Array.isArray(packageModePhase?.transition_actions)
        ? packageModePhase.transition_actions.map((entry) => ({
          ...entry,
          intent_label: formatStateLabel(entry.intent),
          lifecycle_state: entry.lifecycle_state || "pending",
          lifecycle_state_label: formatStateLabel(entry.lifecycle_state || "pending"),
          guard_state: entry.guard_state || "clear",
          guard_state_label: formatStateLabel(entry.guard_state || "clear"),
          target_label: entry.target_label || "No target",
          request_preview: entry.request_preview || "No request preview.",
          summary: entry.summary || "No transition summary."
        }))
        : [],
      package_supervision_id: packageModePhase?.package_supervision_id || "",
      package_coordination_id: packageModePhase?.package_coordination_id || "",
      summary_outputs: [],
      aggregate_monitors: [],
      aggregate_alarms: [],
      operation_proxies: [],
      child_summary_cards: []
    };
  }

  function normalizePackagePermissiveInterlock(packagePermissiveInterlock) {
    const snapshotState = packagePermissiveInterlock?.snapshot_state || "ready";
    const permissives = Array.isArray(packagePermissiveInterlock?.permissives)
      ? packagePermissiveInterlock.permissives.map((entry) => ({
        ...entry,
        section: "Permissive",
        state: entry.state || "ready",
        state_label: formatStateLabel(entry.state || "ready"),
        summary: entry.summary || "No permissive summary.",
        reason_label: entry.reason_code || "no_reason"
      }))
      : [];
    const interlocks = Array.isArray(packagePermissiveInterlock?.interlocks)
      ? packagePermissiveInterlock.interlocks.map((entry) => ({
        ...entry,
        section: "Interlock",
        state: entry.state || "ready",
        state_label: formatStateLabel(entry.state || "ready"),
        summary: entry.summary || "No interlock summary.",
        reason_label: entry.reason_code || "no_reason"
      }))
      : [];
    const transitionGuards = Array.isArray(packagePermissiveInterlock?.transition_guards)
      ? packagePermissiveInterlock.transition_guards.map((entry) => ({
        ...entry,
        state: entry.state || "clear",
        state_label: formatStateLabel(entry.state || "clear"),
        summary: entry.summary || "No transition guard summary.",
        blocked_by_label: Array.isArray(entry.blocked_by_ids) && entry.blocked_by_ids.length
          ? entry.blocked_by_ids.join(", ")
          : "clear",
        target_label: entry.target_label || "No linked transition"
      }))
      : [];

    return {
      enabled: Boolean(packagePermissiveInterlock),
      snapshot_state: snapshotState,
      snapshot_state_label: formatStateLabel(snapshotState),
      snapshot_note: snapshotState === "no_snapshot"
        ? "No target snapshot is available for package permissive / interlock yet."
        : snapshotState === "unsupported_by_target"
          ? "Current target surface does not expose package permissive / interlock snapshots."
          : "Package permissive / interlock remains a generic, read-only gating surface over child members only.",
      gate_summary: packagePermissiveInterlock?.gate_summary
        ? {
          ...packagePermissiveInterlock.gate_summary,
          state: packagePermissiveInterlock.gate_summary.state || snapshotState,
          state_label: formatStateLabel(packagePermissiveInterlock.gate_summary.state || snapshotState),
          ready: Boolean(packagePermissiveInterlock.gate_summary.ready),
          blocked_reason_ids: Array.isArray(packagePermissiveInterlock.gate_summary.blocked_reason_ids)
            ? packagePermissiveInterlock.gate_summary.blocked_reason_ids
            : [],
          held_reason_ids: Array.isArray(packagePermissiveInterlock.gate_summary.held_reason_ids)
            ? packagePermissiveInterlock.gate_summary.held_reason_ids
            : [],
          faulted_reason_ids: Array.isArray(packagePermissiveInterlock.gate_summary.faulted_reason_ids)
            ? packagePermissiveInterlock.gate_summary.faulted_reason_ids
            : [],
          transition_guard_ids: Array.isArray(packagePermissiveInterlock.gate_summary.transition_guard_ids)
            ? packagePermissiveInterlock.gate_summary.transition_guard_ids
            : []
        }
        : null,
      gate_entries: [...permissives, ...interlocks],
      reason_cards: [...permissives, ...interlocks].filter((entry) => entry.state !== "ready"),
      transition_guards: transitionGuards,
      summary_outputs: normalizeStateEntries(packagePermissiveInterlock?.summary_outputs, {
        semantic_state: "informational",
        value: "n/a"
      }),
      aggregate_monitors: normalizeStateEntries(packagePermissiveInterlock?.aggregate_monitors, {
        state: "ready",
        severity: "info",
        summary: "No package gate monitor summary."
      }),
      aggregate_alarms: [],
      trace_groups: Array.isArray(packagePermissiveInterlock?.trace_groups)
        ? packagePermissiveInterlock.trace_groups.map((entry) => ({
          ...entry,
          signal_count: Number(entry.signal_count ?? 0),
          summary: entry.summary || "No trace summary."
        }))
        : [],
      operation_proxies: [],
      child_summary_cards: []
    };
  }

  function normalizePackageOverrideHandover(packageOverrideHandover) {
    const snapshotState = packageOverrideHandover?.snapshot_state || "accepted";
    const authorityHolders = Array.isArray(packageOverrideHandover?.authority_holders)
      ? packageOverrideHandover.authority_holders.map((entry) => ({
        ...entry,
        state: packageOverrideHandover?.handover_summary?.current_holder_id === entry.id ? "active" : "standby",
        state_label: formatStateLabel(packageOverrideHandover?.handover_summary?.current_holder_id === entry.id ? "active" : "standby"),
        lane_label: formatStateLabel(entry.lane || "unknown"),
        source_summary: Array.isArray(entry.source_ports) && entry.source_ports.length
          ? entry.source_ports.map((source) => `${source.instance_id}.${source.port_id}`).join(", ")
          : "No holder source ports.",
        summary: entry.summary || "No authority holder summary."
      }))
      : [];
    const handoverRequests = Array.isArray(packageOverrideHandover?.handover_requests)
      ? packageOverrideHandover.handover_requests.map((entry) => ({
        ...entry,
        title: entry.title || formatHandoverRequestTitle(entry),
        arbitration_result: entry.state || "unsupported",
        ownership_lane: entry.requested_lane || "unknown",
        state: entry.state || "unsupported",
        state_label: formatStateLabel(entry.state || "unsupported"),
        request_kind_label: formatStateLabel(entry.request_kind || "unknown"),
        ownership_lane_label: formatStateLabel(entry.requested_lane || "unknown"),
        request_preview: entry.request_preview || "No handover request preview.",
        reason_label: entry.blocked_reason || entry.denied_reason || "No handover denial reason.",
        summary: entry.summary || "No handover request summary."
      }))
      : [];

    return {
      enabled: Boolean(packageOverrideHandover),
      snapshot_state: snapshotState,
      snapshot_state_label: formatStateLabel(snapshotState),
      snapshot_note: snapshotState === "no_snapshot"
        ? "No target snapshot is available for package override / handover yet."
        : snapshotState === "unsupported_by_target"
          ? "Current target surface does not expose package override / handover snapshots."
          : "Package override / handover remains a generic, package-neutral holder and request visibility layer.",
      ownership_summary: packageOverrideHandover?.handover_summary
        ? {
          ...packageOverrideHandover.handover_summary,
          active_lane_ids: packageOverrideHandover.handover_summary.current_holder_id
            ? [packageOverrideHandover.handover_summary.current_holder_id]
            : [],
          current_lane_label: formatStateLabel(packageOverrideHandover.handover_summary.current_lane || "unknown"),
          state_label: formatStateLabel(snapshotState),
          summary: packageOverrideHandover.handover_summary.summary || "No override / handover summary."
        }
        : null,
      command_summary: packageOverrideHandover?.handover_summary
        ? {
          id: packageOverrideHandover.handover_summary.id,
          title: packageOverrideHandover.handover_summary.title,
          active_owner_lane_ids: packageOverrideHandover.handover_summary.current_holder_id
            ? [packageOverrideHandover.handover_summary.current_holder_id]
            : [],
          accepted_lane_ids: Array.isArray(packageOverrideHandover.handover_summary.accepted_request_ids)
            ? packageOverrideHandover.handover_summary.accepted_request_ids
            : [],
          blocked_lane_ids: Array.isArray(packageOverrideHandover.handover_summary.blocked_request_ids)
            ? packageOverrideHandover.handover_summary.blocked_request_ids
            : [],
          denied_lane_ids: Array.isArray(packageOverrideHandover.handover_summary.denied_request_ids)
            ? packageOverrideHandover.handover_summary.denied_request_ids
            : [],
          superseded_lane_ids: [],
          state_label: formatStateLabel(snapshotState),
          summary: packageOverrideHandover.handover_summary.summary || "No handover request summary."
        }
        : null,
      ownership_lanes: authorityHolders,
      command_lanes: handoverRequests,
      summary_outputs: normalizeStateEntries(packageOverrideHandover?.summary_outputs, {
        semantic_state: "informational",
        value: "n/a"
      }),
      aggregate_monitors: normalizeStateEntries(packageOverrideHandover?.aggregate_monitors, {
        state: "accepted",
        severity: "info",
        summary: "No package override / handover monitor summary."
      }),
      aggregate_alarms: [],
      trace_groups: Array.isArray(packageOverrideHandover?.trace_groups)
        ? packageOverrideHandover.trace_groups.map((entry) => ({
          ...entry,
          signal_count: Number(entry.signal_count ?? 0),
          summary: entry.summary || "No trace summary."
        }))
        : [],
      operation_proxies: [],
      child_summary_cards: []
    };
  }

  function normalizePackageArbitration(packageArbitration) {
    const snapshotState = packageArbitration?.snapshot_state || "accepted";
    const ownershipLanes = Array.isArray(packageArbitration?.ownership_lanes)
      ? packageArbitration.ownership_lanes.map((entry) => ({
        ...entry,
        state: Array.isArray(packageArbitration?.ownership_summary?.active_lane_ids) && packageArbitration.ownership_summary.active_lane_ids.includes(entry.id)
          ? "active"
          : "standby",
        state_label: formatStateLabel(
          Array.isArray(packageArbitration?.ownership_summary?.active_lane_ids) && packageArbitration.ownership_summary.active_lane_ids.includes(entry.id)
            ? "active"
            : "standby"
        ),
        lane_label: formatStateLabel(entry.lane || "unknown"),
        source_summary: Array.isArray(entry.source_ports) && entry.source_ports.length
          ? entry.source_ports.map((source) => `${source.instance_id}.${source.port_id}`).join(", ")
          : "No ownership source ports.",
        summary: entry.summary || "No ownership lane summary."
      }))
      : [];
    const commandLanes = Array.isArray(packageArbitration?.command_lanes)
      ? packageArbitration.command_lanes.map((entry) => ({
        ...entry,
        state: entry.arbitration_result || "unsupported",
        state_label: formatStateLabel(entry.arbitration_result || "unsupported"),
        request_kind_label: formatStateLabel(entry.request_kind || "unknown"),
        ownership_lane_label: formatStateLabel(entry.ownership_lane || "unknown"),
        request_preview: entry.request_preview || "No request preview.",
        reason_label: entry.blocked_reason || entry.denied_reason || entry.superseded_by_lane_id || "No arbitration reason.",
        summary: entry.summary || "No command lane summary."
      }))
      : [];

    return {
      enabled: Boolean(packageArbitration),
      snapshot_state: snapshotState,
      snapshot_state_label: formatStateLabel(snapshotState),
      snapshot_note: snapshotState === "no_snapshot"
        ? "No target snapshot is available for package arbitration yet."
        : snapshotState === "unsupported_by_target"
          ? "Current target surface does not expose package arbitration snapshots."
          : "Package arbitration remains a generic, package-neutral command ownership summary over child members only.",
      ownership_summary: packageArbitration?.ownership_summary
        ? {
          ...packageArbitration.ownership_summary,
          active_lane_ids: Array.isArray(packageArbitration.ownership_summary.active_lane_ids)
            ? packageArbitration.ownership_summary.active_lane_ids
            : [],
          state_label: formatStateLabel(snapshotState),
          summary: packageArbitration.ownership_summary.summary || "No ownership summary."
        }
        : null,
      command_summary: packageArbitration?.command_summary
        ? {
          ...packageArbitration.command_summary,
          active_owner_lane_ids: Array.isArray(packageArbitration.command_summary.active_owner_lane_ids)
            ? packageArbitration.command_summary.active_owner_lane_ids
            : [],
          accepted_lane_ids: Array.isArray(packageArbitration.command_summary.accepted_lane_ids)
            ? packageArbitration.command_summary.accepted_lane_ids
            : [],
          blocked_lane_ids: Array.isArray(packageArbitration.command_summary.blocked_lane_ids)
            ? packageArbitration.command_summary.blocked_lane_ids
            : [],
          denied_lane_ids: Array.isArray(packageArbitration.command_summary.denied_lane_ids)
            ? packageArbitration.command_summary.denied_lane_ids
            : [],
          superseded_lane_ids: Array.isArray(packageArbitration.command_summary.superseded_lane_ids)
            ? packageArbitration.command_summary.superseded_lane_ids
            : [],
          state_label: formatStateLabel(snapshotState),
          summary: packageArbitration.command_summary.summary || "No command summary."
        }
        : null,
      ownership_lanes: ownershipLanes,
      command_lanes: commandLanes,
      summary_outputs: normalizeStateEntries(packageArbitration?.summary_outputs, {
        semantic_state: "informational",
        value: "n/a"
      }),
      aggregate_monitors: normalizeStateEntries(packageArbitration?.aggregate_monitors, {
        state: "accepted",
        severity: "info",
        summary: "No package arbitration monitor summary."
      }),
      aggregate_alarms: [],
      trace_groups: Array.isArray(packageArbitration?.trace_groups)
        ? packageArbitration.trace_groups.map((entry) => ({
          ...entry,
          signal_count: Number(entry.signal_count ?? 0),
          summary: entry.summary || "No trace summary."
        }))
        : [],
      operation_proxies: [],
      child_summary_cards: []
    };
  }

  function normalizePackageProtectionRecovery(packageProtectionRecovery) {
    const snapshotState = packageProtectionRecovery?.snapshot_state || "ready";
    const trips = Array.isArray(packageProtectionRecovery?.trips)
      ? packageProtectionRecovery.trips.map((entry) => ({
        ...entry,
        section: "Trip",
        state: entry.state || "ready",
        state_label: formatStateLabel(entry.state || "ready"),
        summary: entry.summary || "No trip summary.",
        reason_label: entry.reason_code || "no_reason"
      }))
      : [];
    const inhibits = Array.isArray(packageProtectionRecovery?.inhibits)
      ? packageProtectionRecovery.inhibits.map((entry) => ({
        ...entry,
        section: "Inhibit",
        state: entry.state || "ready",
        state_label: formatStateLabel(entry.state || "ready"),
        summary: entry.summary || "No inhibit summary.",
        reason_label: entry.reason_code || "no_reason"
      }))
      : [];

    return {
      enabled: Boolean(packageProtectionRecovery),
      snapshot_state: snapshotState,
      snapshot_state_label: formatStateLabel(snapshotState),
      snapshot_note: snapshotState === "no_snapshot"
        ? "No target snapshot is available for package protection / recovery yet."
        : snapshotState === "unsupported_by_target"
          ? "Current target surface does not expose package protection / recovery snapshots."
          : "Package protection / recovery remains a generic, non-safety, read-only summary over child-owned protection sources and recovery requests.",
      protection_summary: packageProtectionRecovery?.protection_summary
        ? {
          ...packageProtectionRecovery.protection_summary,
          state: packageProtectionRecovery.protection_summary.state || snapshotState,
          state_label: formatStateLabel(packageProtectionRecovery.protection_summary.state || snapshotState),
          ready: Boolean(packageProtectionRecovery.protection_summary.ready),
          trip_reason_ids: Array.isArray(packageProtectionRecovery.protection_summary.trip_reason_ids)
            ? packageProtectionRecovery.protection_summary.trip_reason_ids
            : [],
          inhibit_reason_ids: Array.isArray(packageProtectionRecovery.protection_summary.inhibit_reason_ids)
            ? packageProtectionRecovery.protection_summary.inhibit_reason_ids
            : [],
          recovery_request_ids: Array.isArray(packageProtectionRecovery.protection_summary.recovery_request_ids)
            ? packageProtectionRecovery.protection_summary.recovery_request_ids
            : [],
          diagnostic_summary_ids: Array.isArray(packageProtectionRecovery.protection_summary.diagnostic_summary_ids)
            ? packageProtectionRecovery.protection_summary.diagnostic_summary_ids
            : []
        }
        : null,
      trips,
      inhibits,
      diagnostic_summaries: Array.isArray(packageProtectionRecovery?.diagnostic_summaries)
        ? packageProtectionRecovery.diagnostic_summaries.map((entry) => ({
          ...entry,
          trip_ids: Array.isArray(entry.trip_ids) ? entry.trip_ids : [],
          inhibit_ids: Array.isArray(entry.inhibit_ids) ? entry.inhibit_ids : [],
          reasons_label: [
            Array.isArray(entry.trip_ids) && entry.trip_ids.length ? `Trips: ${entry.trip_ids.join(", ")}` : "",
            Array.isArray(entry.inhibit_ids) && entry.inhibit_ids.length ? `Inhibits: ${entry.inhibit_ids.join(", ")}` : ""
          ].filter(Boolean).join(" | ") || "No linked protection reasons."
        }))
        : [],
      recovery_requests: Array.isArray(packageProtectionRecovery?.recovery_requests)
        ? packageProtectionRecovery.recovery_requests.map((entry) => ({
          ...entry,
          availability_state: entry.availability_state || "unavailable",
          availability_state_label: formatStateLabel(entry.availability_state || "unavailable"),
          kind_label: formatStateLabel(entry.kind || "reset"),
          target_owner_label: entry.target_owner_instance_id || "No target owner",
          summary: entry.summary || "No recovery request summary."
        }))
        : [],
      summary_outputs: normalizeStateEntries(packageProtectionRecovery?.summary_outputs, {
        semantic_state: "informational",
        value: "n/a"
      }),
      aggregate_monitors: normalizeStateEntries(packageProtectionRecovery?.aggregate_monitors, {
        state: "ready",
        severity: "info",
        summary: "No protection monitor summary."
      }),
      aggregate_alarms: [],
      trace_groups: Array.isArray(packageProtectionRecovery?.trace_groups)
        ? packageProtectionRecovery.trace_groups.map((entry) => ({
          ...entry,
          signal_count: Number(entry.signal_count ?? 0),
          summary: entry.summary || "No trace summary."
        }))
        : [],
      operation_proxies: [],
      child_summary_cards: []
    };
  }

  function normalizeStateEntries(entries, defaults) {
    return Array.isArray(entries)
      ? entries.map((entry) => ({
        ...defaults,
        ...entry,
        state_label: formatStateLabel(entry?.state || defaults.state),
        semantic_state_label: formatStateLabel(entry?.semantic_state || defaults.semantic_state)
      }))
      : [];
  }

  function formatHandoverRequestTitle(entry) {
    const kind = String(entry?.request_kind || "request").replace(/^request_/, "");
    const lane = String(entry?.requested_lane || "unknown");
    return `${formatStateLabel(kind)} ${formatStateLabel(lane)}`;
  }

  function formatStateLabel(state) {
    return String(state || "unknown")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function stateClass(state) {
    return String(state || "unknown").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return {
    createReadonlyPackageOverviewViewModel,
    renderReadonlyPackageMemberMarkup,
    renderReadonlyPackageDetailsMarkup
  };
});
