(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../contracts/operation-ui-guards"),
      require("../contracts/operation-ui-mappers")
    );
    return;
  }

  root.OperationReadonlySurface = factory(root.OperationUiGuards, root.OperationUiMappers);
})(typeof globalThis !== "undefined" ? globalThis : this, function factory(guards, mappers) {
  const { normalizeOperationsSupport } = guards;
  const { mapOperationDetails, mapOperationListItems } = mappers;

  function createReadonlyOperationSurfaceViewModel({ fixture, selectedOperationId }) {
    const runtimePack = fixture?.runtimePack ?? {};
    const runtimeSnapshot = fixture?.runtimeSnapshot ?? { operation_snapshots: {} };
    const operationsSupport = normalizeOperationsSupport(fixture?.operationsSupport);
    const metadataOnlyOperationIds = Array.isArray(fixture?.metadata_only_operation_ids)
      ? fixture.metadata_only_operation_ids
      : [];
    const operations = mapOperationListItems({
      runtimePack,
      runtimeSnapshot,
      operationsSupport
    }).map((item) => enrichListItem({
      item,
      runtimeSnapshot,
      operationsSupport,
      metadataOnlyOperationIds
    }));

    const effectiveSelectedId = operations.some((item) => item.id === selectedOperationId)
      ? selectedOperationId
      : operations[0]?.id ?? "";
    const details = effectiveSelectedId
      ? enrichDetails({
        details: mapOperationDetails({
          runtimePack,
          operationId: effectiveSelectedId,
          runtimeSnapshot,
          operationsSupport
        }),
        runtimePack,
        runtimeSnapshot,
        operationsSupport,
        metadataOnlyOperationIds
      })
      : null;

    return {
      fixture_id: fixture?.id ?? "operations-readonly-missing",
      title: fixture?.title ?? "Operations Overview",
      subtitle: fixture?.description ?? "",
      subject_label: fixture?.subject_label ?? "Unknown subject",
      operations_support: summarizeSupport(operationsSupport),
      operations,
      selected_operation_id: effectiveSelectedId,
      selected_operation: details,
      empty: operations.length === 0
    };
  }

  function renderReadonlyOperationCardMarkup(item) {
    return [
      `<div class="operation-readonly-card-head">`,
      `<strong>${escapeHtml(item.title)}</strong>`,
      `<span>${escapeHtml(item.kind)} • ${escapeHtml(item.owner_instance_id)}</span>`,
      `</div>`,
      `<div class="operation-readonly-badges">${item.badges.map(renderBadgeMarkup).join("")}</div>`,
      `<div class="operation-readonly-card-copy">${escapeHtml(item.summary_line)}</div>`,
      item.degraded_note
        ? `<div class="operation-readonly-note">${escapeHtml(item.degraded_note)}</div>`
        : ""
    ].join("");
  }

  function renderReadonlyOperationDetailsMarkup(surface) {
    const details = surface?.selected_operation;
    if (!details) {
      return `<div class="subview-empty">No operations in this example yet.</div>`;
    }

    return [
      `<div class="operation-readonly-details-head">`,
      `<h3>${escapeHtml(details.title)}</h3>`,
      `<p>${escapeHtml(surface.subject_label)}</p>`,
      `</div>`,
      `<div class="operation-readonly-badges">${details.badges.map(renderBadgeMarkup).join("")}</div>`,
      `<div class="operation-readonly-details-grid">`,
      renderDetailsBlock("Operation Status", [
        ["Operation ID", details.id],
        ["Owner", details.owner_instance_id],
        ["Lifecycle", details.lifecycle_state],
        ["Snapshot", details.snapshot_summary.label]
      ]),
      renderDetailsBlock("Confirmation", [
        ["Policy", details.confirmation.policy],
        ["Supported", yesNo(details.confirmation.supported)],
        ["Metadata only", yesNo(details.metadata_only)]
      ]),
      renderDetailsBlock("Execution Baseline", [
        ["Lane", details.execution_summary.lane],
        ["Runnable", yesNo(details.execution_summary.runnable)],
        ["Target Enabled", yesNo(details.execution_summary.target_enabled)],
        ["Runtime Enabled", yesNo(details.execution_summary.runtime_enabled)],
        ["Confirmation Token", details.execution_summary.confirmation_token_validation]
      ]),
      renderDetailsBlock("Result Summary", buildResultRows(details)),
      details.autotune_summary?.visible
        ? renderDetailsBlock("PID Autotune", buildAutotuneRows(details))
        : "",
      renderDetailsBlock("Diagnostics / Unsupported", buildDiagnosticRows(details)),
      renderDetailsBlock("Runtime Contract", [
        ["Availability", details.runtime_contract_summary.availability_mode],
        ["Required States", details.runtime_contract_summary.required_states.join(", ") || "none"],
        ["Progress", details.runtime_contract_summary.progress_mode],
        ["Result", details.runtime_contract_summary.result_mode]
      ]),
      renderDetailsBlock("Target Support", [
        ["Operations Enabled", yesNo(details.target_support.enabled)],
        ["Invoke", yesNo(details.target_support.invoke)],
        ["Cancel", yesNo(details.target_support.cancel)],
        ["Progress", yesNo(details.target_support.progress)]
      ]),
      `</div>`
    ].join("");
  }

  function enrichListItem({ item, runtimeSnapshot, operationsSupport, metadataOnlyOperationIds }) {
    const snapshot = runtimeSnapshot?.operation_snapshots?.[item.id];
    const diagnostics = buildDiagnostics(item, snapshot, operationsSupport);
    const serviceState = mapServiceState(item, operationsSupport, snapshot);
    const metadataOnly = item.metadata_only || metadataOnlyOperationIds.includes(item.id);

    return {
      ...item,
      metadata_only: metadataOnly,
      snapshot_present: Boolean(snapshot),
      service_state: serviceState,
      diagnostics,
      badges: buildBadges({ ...item, metadata_only: metadataOnly }, snapshot, operationsSupport, diagnostics, serviceState),
      degraded_note: diagnostics[0]?.label ?? "",
      summary_line: buildSummaryLine(item, snapshot, operationsSupport)
    };
  }

  function enrichDetails({ details, runtimePack, runtimeSnapshot, operationsSupport, metadataOnlyOperationIds }) {
    if (!details) {
      return null;
    }

    const snapshot = runtimeSnapshot?.operation_snapshots?.[details.id];
    const diagnostics = buildDiagnostics(details, snapshot, operationsSupport);
    const serviceState = mapServiceState(details, operationsSupport, snapshot);
    const metadataOnly = details.metadata_only || metadataOnlyOperationIds.includes(details.id);

    return {
      ...details,
      metadata_only: metadataOnly,
      service_state: serviceState,
      badges: buildBadges({ ...details, metadata_only: metadataOnly }, snapshot, operationsSupport, diagnostics, serviceState),
      diagnostics,
      target_support: summarizeSupport(operationsSupport),
      execution_summary: {
        lane: details.execution?.lane || (
          metadataOnly
            ? (details.execution?.baseline_kind ? "unsupported_execution" : "metadata_only")
            : "baseline_runnable"
        ),
        runnable: details.execution?.runnable === true,
        target_enabled: details.execution?.target_enabled === true,
        runtime_enabled: details.execution?.runtime_enabled === true,
        confirmation_token_validation: details.execution?.confirmation_token_validation ?? "none"
      },
      runtime_contract_summary: {
        availability_mode: details.availability.mode,
        required_states: details.availability.required_states,
        progress_mode: details.progress.mode,
        result_mode: details.result_summary.mode,
        runtime_spine: runtimePack?.operation_runtime_contract ?? null
      },
      snapshot_summary: {
        present: Boolean(snapshot),
        state: snapshot?.state ?? null,
        label: snapshot ? snapshot.state : operationsSupport.enabled ? "no_snapshot" : "unsupported_by_target",
        message: snapshot?.message ?? null,
        progress: snapshot?.progress,
        has_result: Boolean(snapshot?.result),
        progress_payload: snapshot?.progress_payload ?? null,
        recommendation_state: snapshot?.recommendation_state ?? "none"
      },
      autotune_summary: buildAutotuneSummary(details, snapshot)
    };
  }

  function buildAutotuneSummary(details, snapshot) {
    if (details.kind !== "autotune" && details.kind !== "pid_autotune") {
      return { visible: false };
    }

    const progressFields = Array.isArray(details.progress?.fields)
      ? details.progress.fields
      : [];
    const recommendationFields = Array.isArray(details.result_summary?.fields)
      ? details.result_summary.fields.filter((field) => field.id !== "completed")
      : [];
    const recommendationLifecycle = details.result_summary?.recommendation_lifecycle;

    return {
      visible: true,
      lane: details.execution?.lane ?? "metadata_only",
      progress_fields: progressFields,
      recommendation_fields: recommendationFields,
      recommendation_state: details.result_summary?.recommendation_state ?? "none",
      apply_policy: recommendationLifecycle?.apply_confirmation_policy ?? "none",
      reject_policy: recommendationLifecycle?.reject_confirmation_policy ?? "none",
      summary_text: recommendationFields.find((field) => field.id === "summary")?.value ?? snapshot?.message ?? "No recommendation summary yet."
    };
  }

  function buildAutotuneRows(details) {
    const summary = details.autotune_summary;
    const rows = [
      ["Lane", summary.lane],
      ["Recommendation State", summary.recommendation_state],
      ["Apply Policy", summary.apply_policy],
      ["Reject Policy", summary.reject_policy],
      ["Summary", summary.summary_text]
    ];

    summary.progress_fields.forEach((field) => {
      rows.push([`Progress: ${field.title}`, field.value === undefined ? "not_available" : String(field.value)]);
    });

    summary.recommendation_fields.forEach((field) => {
      if (field.id !== "summary") {
        rows.push([`Recommendation: ${field.title}`, field.value === undefined ? "not_available" : String(field.value)]);
      }
    });

    return rows;
  }

  function buildSummaryLine(item, snapshot, operationsSupport) {
    if (!operationsSupport.enabled) {
      return "Target reports operations as unsupported. Read-only metadata stays visible.";
    }

    if (item.execution?.runnable !== true) {
      return item.execution?.baseline_kind
        ? "Execution baseline does not allow this operation kind on the current target/runtime path."
        : "Operation stays in the metadata-only lane on this baseline.";
    }

    if (item.execution?.specialized_kind === "pid_autotune") {
      if (!snapshot) {
        return "PID autotune is runnable on this target, but no live snapshot is available yet.";
      }

      if (snapshot.recommendation_state === "available") {
        return "Recommendation available: review progress payload and choose apply or reject.";
      }

      if (snapshot.progress_payload?.phase) {
        return `Autotune phase: ${snapshot.progress_payload.phase}`;
      }
    }

    if (!snapshot) {
      return item.lifecycle_state === "blocked"
        ? "Guarded metadata is present, but no live snapshot is available yet."
        : "Contract metadata is present, but no live snapshot is available yet.";
    }

    if (snapshot.message) {
      return snapshot.message;
    }

    if (item.progress.visible && typeof item.progress.percent === "number") {
      return `Progress: ${item.progress.percent}%`;
    }

    return "Snapshot present.";
  }

  function buildBadges(item, snapshot, operationsSupport, diagnostics, serviceState) {
    const badges = [
      { tone: serviceTone(serviceState), label: lifecycleLabel(serviceState) }
    ];

    if (item.confirmation.required) {
      badges.push({ tone: "warn", label: "Confirmation required" });
    }

    if (item.metadata_only) {
      badges.push({ tone: "muted", label: "Metadata only" });
    }

    if (item.execution?.runnable === true) {
      badges.push({
        tone: "ok",
        label: item.execution?.specialized_kind === "pid_autotune" ? "PID autotune" : "Execution baseline"
      });
    }

    if (snapshot?.recommendation_state === "available") {
      badges.push({ tone: "warn", label: "Recommendation available" });
    }

    if (!snapshot && operationsSupport.enabled) {
      badges.push({ tone: "muted", label: "No snapshot" });
    }

    diagnostics.forEach((diagnostic) => {
      if (!badges.some((entry) => entry.label === diagnostic.label)) {
        badges.push({
          tone: diagnostic.tone,
          label: diagnostic.label
        });
      }
    });

    return badges;
  }

  function buildDiagnostics(item, snapshot, operationsSupport) {
    const diagnostics = [];

    if (!operationsSupport.enabled) {
      diagnostics.push({
        code: "unsupported_by_target",
        label: "Unsupported by target",
        tone: "danger"
      });
    } else if (!snapshot) {
      diagnostics.push({
        code: "no_snapshot",
        label: "No snapshot",
        tone: "muted"
      });
    }

    if (item.progress.fallback) {
      diagnostics.push({
        code: "unsupported_progress_mode",
        label: "Unsupported progress mode fallback",
        tone: "warn"
      });
    }

    if (item.execution?.runnable !== true && item.metadata_only) {
      diagnostics.push({
        code: item.execution?.baseline_kind ? "unsupported_execution" : "metadata_only",
        label: item.execution?.baseline_kind ? "Execution unsupported for this operation" : "Metadata-only operation",
        tone: "muted"
      });
    }

    if (item.lifecycle_state === "stale") {
      diagnostics.push({
        code: "unknown_state",
        label: "Unknown state mapped to stale",
        tone: "warn"
      });
    }

    if (item.confirmation.required && !item.confirmation.supported) {
      diagnostics.push({
        code: "missing_confirmation_support",
        label: "Confirmation metadata unsupported by target",
        tone: "warn"
      });
    }

    if (hasResultPayloadMismatch(item, snapshot)) {
      diagnostics.push({
        code: "result_payload_mismatch",
        label: "Result payload mismatch",
        tone: "warn"
      });
    }

    return diagnostics;
  }

  function hasResultPayloadMismatch(item, snapshot) {
    if (!snapshot || !item?.result_summary?.fields?.length) {
      return false;
    }

    const shouldValidate = item.lifecycle_state === "completed" ||
      item.lifecycle_state === "rejected" ||
      snapshot.recommendation_state === "available" ||
      snapshot.recommendation_state === "pending_apply" ||
      snapshot.recommendation_state === "applied" ||
      snapshot.recommendation_state === "rejected";

    if (!shouldValidate) {
      return false;
    }

    return item.result_summary.fields.some((field) => field.value === undefined);
  }

  function summarizeSupport(operationsSupport) {
    return {
      enabled: operationsSupport.enabled,
      invoke: operationsSupport.invoke,
      cancel: operationsSupport.cancel,
      progress: operationsSupport.progress,
      result_payload: operationsSupport.result_payload,
      confirmation: operationsSupport.confirmation,
      execution_baseline_kinds: [...(operationsSupport.execution_baseline_kinds ?? [])],
      confirmation_token_validation: operationsSupport.confirmation_token_validation ?? "none"
    };
  }

  function mapServiceState(item, operationsSupport, snapshot) {
    if (!operationsSupport.enabled) {
      return "unsupported_by_target";
    }

    if (item.execution?.runnable !== true) {
      return item.execution?.baseline_kind ? "unsupported_execution" : "metadata_only";
    }

    if (!snapshot) {
      return item.lifecycle_state === "blocked" ? "blocked" : "no_snapshot";
    }

    if (item.lifecycle_state === "requested") {
      return "pending_invoke";
    }

    return item.lifecycle_state;
  }

  function buildResultRows(details) {
    if (!details.result_summary.fields.length) {
      return [["Result", "No result payload contract"]];
    }

    return details.result_summary.fields.map((field) => ([
      field.title,
      field.value === undefined ? "not_available" : String(field.value)
    ]));
  }

  function buildDiagnosticRows(details) {
    if (!details.diagnostics.length) {
      return [["Diagnostics", "None"]];
    }

    return details.diagnostics.map((entry) => [entry.code, entry.label]);
  }

  function renderDetailsBlock(title, rows) {
    return [
      `<section class="operation-readonly-block">`,
      `<h4>${escapeHtml(title)}</h4>`,
      rows.length
        ? `<div class="operation-readonly-rows">${rows.map(renderRowMarkup).join("")}</div>`
        : `<div class="subview-empty">No data.</div>`,
      `</section>`
    ].join("");
  }

  function renderRowMarkup([label, value]) {
    return `<div class="operation-readonly-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value ?? ""))}</strong></div>`;
  }

  function renderBadgeMarkup(badge) {
    return `<span class="operation-readonly-badge is-${escapeHtml(badge.tone)}">${escapeHtml(badge.label)}</span>`;
  }

    function lifecycleLabel(state) {
      switch (state) {
        case "pending":
        case "pending_invoke":
          return "Pending";
      case "metadata_only":
        return "Metadata Only";
      case "unsupported_execution":
        return "Unsupported Execution";
      case "confirmation_required":
        return "Confirmation";
        case "running":
          return "Running";
        case "completed":
          return "Completed";
        case "rejected":
          return "Rejected";
        case "failed":
          return "Failed";
        case "cancelled":
          return "Cancelled";
      case "blocked":
        return "Blocked";
      case "unsupported_by_target":
        return "Unsupported";
      case "no_snapshot":
        return "No Snapshot";
      case "stale":
        return "Stale";
      default:
        return "Available";
    }
  }

    function serviceTone(state) {
      switch (state) {
        case "pending":
        case "pending_invoke":
          return "warn";
        case "completed":
        case "running":
        case "available":
          return state;
        case "rejected":
          return "warn";
        case "failed":
        case "cancelled":
        case "unsupported_by_target":
        case "unsupported_execution":
        return "danger";
      case "blocked":
      case "confirmation_required":
      case "no_snapshot":
      case "stale":
      case "metadata_only":
      default:
        return "muted";
    }
  }

  function yesNo(value) {
    return value ? "yes" : "no";
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
    createReadonlyOperationSurfaceViewModel,
    renderReadonlyOperationCardMarkup,
    renderReadonlyOperationDetailsMarkup
  };
});
