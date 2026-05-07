(function () {
  const REFRESH_INTERVAL_MS = 1500;
  const ENDPOINTS = {
    list: "/api/flow/list",
    status: (id) => `/api/flow/${encodeURIComponent(id)}/status`,
    trend: (id) => `/api/flow/${encodeURIComponent(id)}/trend`,
    history: (id) => `/api/flow/${encodeURIComponent(id)}/history`,
    startBatch: (id) => `/api/flow/${encodeURIComponent(id)}/batch/start`,
    stopBatch: (id) => `/api/flow/${encodeURIComponent(id)}/batch/stop`,
    resetBatch: (id) => `/api/flow/${encodeURIComponent(id)}/batch/reset`,
    resetTrip: (id) => `/api/flow/${encodeURIComponent(id)}/trip-total/reset`,
  };

  const state = {
    selectedFlowId: "",
    latestList: [],
    latestStatus: null,
  };

  const elements = {
    errorBanner: document.getElementById("error-banner"),
    messageBanner: document.getElementById("message-banner"),
    lastRefresh: document.getElementById("last-refresh"),
    transportCode: document.getElementById("transport-code"),
    flowList: document.getElementById("flow-list"),
    refreshButton: document.getElementById("refresh-button"),
    summaryName: document.getElementById("summary-name"),
    summaryUnit: document.getElementById("summary-unit"),
    summaryRate: document.getElementById("summary-rate"),
    summaryRateUnit: document.getElementById("summary-rate-unit"),
    summaryLifetime: document.getElementById("summary-lifetime"),
    summaryProtected: document.getElementById("summary-protected"),
    summaryBatch: document.getElementById("summary-batch"),
    summaryBatchTarget: document.getElementById("summary-batch-target"),
    statusBadges: document.getElementById("status-badges"),
    runtimeState: document.getElementById("runtime-state"),
    runtimeStateDetail: document.getElementById("runtime-state-detail"),
    tripTotal: document.getElementById("trip-total"),
    rawPulses: document.getElementById("raw-pulses"),
    timeWindowRate: document.getElementById("time-window-rate"),
    pulseFrequencyRate: document.getElementById("pulse-frequency-rate"),
    avgNRate: document.getElementById("avg-n-rate"),
    lastPulseAge: document.getElementById("last-pulse-age"),
    lastReason: document.getElementById("last-reason"),
    batchTargetOverride: document.getElementById("batch-target-override"),
    startBatchButton: document.getElementById("start-batch-button"),
    stopBatchButton: document.getElementById("stop-batch-button"),
    resetBatchButton: document.getElementById("reset-batch-button"),
    resetTripButton: document.getElementById("reset-trip-button"),
    startReason: document.getElementById("start-reason"),
    stopReason: document.getElementById("stop-reason"),
    trendMeta: document.getElementById("trend-meta"),
    trendEmpty: document.getElementById("trend-empty"),
    trendChart: document.getElementById("trend-chart"),
    historyList: document.getElementById("history-list"),
    descriptorGrid: document.getElementById("descriptor-grid"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatNumber(value, digits = 2) {
    return Number(value || 0).toFixed(digits);
  }

  function formatRate(value, unit) {
    return `${formatNumber(value)} ${unit}/min`;
  }

  function formatTotal(value, unit) {
    return `${formatNumber(value)} ${unit}`;
  }

  function formatMs(value) {
    return `${Number(value || 0)} ms`;
  }

  function formatTimestamp(value) {
    if (value === null || value === undefined || value === "") {
      return "Waiting";
    }
    if (Number(value) < 100000000000) {
      return `${value} ms`;
    }
    const date = new Date(Number(value));
    return Number.isNaN(date.getTime()) ? `${value} ms` : date.toLocaleTimeString();
  }

  function commandContext(reason) {
    return {
      now_ms: Date.now(),
      source: "web_flow",
      reason,
      actor: "mechanic",
    };
  }

  function setBanner(target, message) {
    if (message) {
      target.textContent = message;
      target.classList.remove("hidden");
    } else {
      target.textContent = "";
      target.classList.add("hidden");
    }
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}`);
      }
      throw new Error("Response was not valid JSON.");
    }
    if (!response.ok) {
      throw new Error(payload && payload.message ? payload.message : `Request failed with HTTP ${response.status}`);
    }
    return payload;
  }

  function createHttpTransport() {
    return {
      loadList() {
        return fetchJson(ENDPOINTS.list);
      },
      loadStatus(flowId) {
        return fetchJson(ENDPOINTS.status(flowId));
      },
      loadTrend(flowId) {
        return fetchJson(ENDPOINTS.trend(flowId));
      },
      loadHistory(flowId) {
        return fetchJson(ENDPOINTS.history(flowId));
      },
      startBatch(flowId, payload) {
        return fetchJson(ENDPOINTS.startBatch(flowId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
      stopBatch(flowId, payload) {
        return fetchJson(ENDPOINTS.stopBatch(flowId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
      resetBatch(flowId, payload) {
        return fetchJson(ENDPOINTS.resetBatch(flowId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
      resetTrip(flowId, payload) {
        return fetchJson(ENDPOINTS.resetTrip(flowId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
    };
  }

  const transport = window.FlowUiTransport || createHttpTransport();

  function unwrapValue(response) {
    return response && Object.prototype.hasOwnProperty.call(response, "value") ? response.value : response;
  }

  function normalizeList(response) {
    const payload = unwrapValue(response);
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.items)) {
      return payload.items.map((item) => ({
        id: item.id,
        name: item.name,
        enabled: item.enabled !== false,
        unit: item.unit || "",
        current_rate_text: item.current_rate_text,
        lifetime_total_text: item.lifetime_total_text,
        badges: item.badges || [],
      }));
    }
    return [];
  }

  function listEmptyMessage(response) {
    const payload = unwrapValue(response);
    if (payload && typeof payload.empty_state_message === "string" && payload.empty_state_message) {
      return payload.empty_state_message;
    }
    return response?.message || "No flowmeters registered.";
  }

  function normalizeStatus(response) {
    const payload = unwrapValue(response);
    if (payload && payload.status) {
      return {
        ...payload.status,
        runtime_state_label: payload.runtime_state_label,
        runtime_state_tone: payload.runtime_state_tone,
        runtime_state_detail: payload.runtime_state_detail,
      };
    }
    return payload;
  }

  function normalizeTrend(response) {
    const payload = unwrapValue(response);
    return payload && payload.trend ? payload.trend : payload;
  }

  function normalizeHistory(response) {
    const payload = unwrapValue(response);
    return Array.isArray(payload) ? payload : payload && Array.isArray(payload.history) ? payload.history : [];
  }

  function setTransportMeta(code, timestamp) {
    elements.transportCode.textContent = code || "FLOW_UI_DATA_UNAVAILABLE";
    elements.lastRefresh.textContent = formatTimestamp(timestamp);
  }

  function chooseSelectedFlow(flows) {
    if (!flows.length) {
      state.selectedFlowId = "";
      return;
    }
    const exists = flows.some((entry) => entry.id === state.selectedFlowId);
    if (!exists) {
      state.selectedFlowId = flows[0].id;
    }
  }

  function renderList(flows, emptyMessage) {
    state.latestList = flows;
    chooseSelectedFlow(flows);

    if (!flows.length) {
      elements.flowList.className = "list-stack empty-state";
      elements.flowList.textContent = emptyMessage || "No flowmeters registered.";
      return;
    }

    elements.flowList.className = "list-stack";
    elements.flowList.innerHTML = flows
      .map((flow) => {
        const selected = flow.id === state.selectedFlowId;
        const currentRateText = flow.current_rate_text || formatRate(flow.current_rate, flow.unit || "unit");
        const lifetimeText = flow.lifetime_total_text || formatTotal(flow.lifetime_total, flow.unit || "unit");
        const badgeHtml = (flow.badges || [])
          .map((badge) => `<span class="badge-pill tone-${escapeHtml(badge.tone || "muted")}">${escapeHtml(badge.label)}</span>`)
          .join("");
        return `
          <article class="flow-card ${selected ? "selected" : ""}" data-flow-id="${escapeHtml(flow.id)}">
            <h3>${escapeHtml(flow.name || flow.id)}</h3>
            <p>Current rate: ${escapeHtml(currentRateText)}</p>
            <p>Lifetime total: ${escapeHtml(lifetimeText)}</p>
            <div class="card-meta">${badgeHtml}</div>
          </article>`;
      })
      .join("");

    elements.flowList.querySelectorAll("[data-flow-id]").forEach((node) => {
      node.addEventListener("click", () => {
        state.selectedFlowId = node.getAttribute("data-flow-id") || "";
        renderList(state.latestList);
        loadSelectedFlow(true);
      });
    });
  }

  function renderStatusBadges(status) {
    const badges = [
      { label: "Protected lifetime", active: !!status.descriptor_summary?.protected_lifetime_totals, tone: "info" },
      { label: "Batch active", active: !!status.batch_active, tone: "ok" },
      { label: "Batch done", active: !!status.batch_done, tone: "warn" },
      { label: "No flow", active: !!status.no_flow, tone: "danger" },
      { label: "High flow", active: !!status.high_flow, tone: "warn" },
      { label: status.enabled === false ? "Disabled" : "Enabled", active: true, tone: status.enabled === false ? "danger" : "ok" },
    ];
    elements.statusBadges.innerHTML = badges
      .map((badge) => `<span class="badge-pill tone-${badge.tone}">${escapeHtml(badge.label)}</span>`)
      .join("");
  }

  function renderStatus(status) {
    if (!status) {
      elements.summaryName.textContent = "No flowmeter selected";
      elements.summaryUnit.textContent = "unit";
      elements.summaryRate.textContent = "0.00";
      elements.summaryRateUnit.textContent = "unit/min";
      elements.summaryLifetime.textContent = "0.00 unit";
      elements.summaryProtected.textContent = "Protected total";
      elements.summaryBatch.textContent = "0.00 unit";
      elements.summaryBatchTarget.textContent = "Descriptor default";
      elements.statusBadges.innerHTML = "";
      elements.runtimeState.className = "status-pill subtle-pill";
      elements.runtimeState.textContent = "No flowmeter selected";
      elements.runtimeStateDetail.textContent = "Select a registered flowmeter or bind the pulse fixture to expose one.";
      elements.tripTotal.textContent = "0.00 unit";
      elements.rawPulses.textContent = "0 pulses";
      elements.timeWindowRate.textContent = "0.00 unit/min";
      elements.pulseFrequencyRate.textContent = "0.00 unit/min";
      elements.avgNRate.textContent = "0.00 unit/min";
      elements.lastPulseAge.textContent = "0 ms";
      elements.lastReason.textContent = "No runtime reason available yet.";
      elements.descriptorGrid.innerHTML = "";
      elements.startBatchButton.disabled = true;
      elements.stopBatchButton.disabled = true;
      elements.resetBatchButton.disabled = true;
      elements.resetTripButton.disabled = true;
      elements.startReason.textContent = "Select a flowmeter.";
      elements.stopReason.textContent = "Select a flowmeter.";
      return;
    }

    state.latestStatus = status;
    const unit = status.unit || "unit";
    const descriptor = status.descriptor_summary || {};

    elements.summaryName.textContent = status.name || status.id || "Unknown flowmeter";
    elements.summaryUnit.textContent = unit;
    elements.summaryRate.textContent = formatNumber(status.current_rate);
    elements.summaryRateUnit.textContent = `${unit}/min`;
    elements.summaryLifetime.textContent = formatTotal(status.lifetime_total, unit);
    elements.summaryProtected.textContent = descriptor.protected_lifetime_totals ? "Protected lifetime total" : "Lifetime total";
    elements.summaryBatch.textContent = formatTotal(status.batch_total, unit);
    elements.summaryBatchTarget.textContent = status.batch_target ? formatTotal(status.batch_target, unit) : "Descriptor default";

    renderStatusBadges(status);
    const runtimeTone = status.runtime_state_tone || "muted";
    elements.runtimeState.className = `status-pill tone-${runtimeTone}`;
    elements.runtimeState.textContent = status.runtime_state_label || "Runtime state unavailable";
    elements.runtimeStateDetail.textContent =
      status.runtime_state_detail || "No additional runtime detail is available yet.";
    elements.tripTotal.textContent = formatTotal(status.trip_total, unit);
    elements.rawPulses.textContent = `${status.raw_pulse_lifetime || "0"} pulses`;
    elements.timeWindowRate.textContent = formatRate(status.rate_time_window, unit);
    elements.pulseFrequencyRate.textContent = formatRate(status.rate_pulse_frequency, unit);
    elements.avgNRate.textContent = formatRate(status.rate_avg_n, unit);
    elements.lastPulseAge.textContent = formatMs(status.last_pulse_age_ms);
    elements.lastReason.textContent = status.last_reason || "No runtime reason available yet.";

    elements.startBatchButton.disabled = !(status.enabled !== false && !status.batch_active);
    elements.stopBatchButton.disabled = !status.batch_active;
    elements.resetBatchButton.disabled = !status.initialized;
    elements.resetTripButton.disabled = !status.initialized;
    elements.startReason.textContent = status.batch_active
      ? "Batch is already active."
      : "Start with the descriptor default target or enter an override.";
    elements.stopReason.textContent = status.batch_active
      ? "Stop the active batch without clearing its total."
      : "Batch is not active.";

    const rows = [
      ["Pulse input", descriptor.pulse_input_id || "unknown", ""],
      ["K-factor", descriptor.k_factor_pulses_per_unit ?? "n/a", "pulses per unit"],
      ["Primary rate mode", descriptor.primary_rate_mode || "unknown", ""],
      ["Time window", formatMs(descriptor.time_window_ms || 0), ""],
      ["Average last N pulses", descriptor.avg_last_n_pulses ?? "0", ""],
      ["No-flow timeout", descriptor.no_flow_timeout_ms ? formatMs(descriptor.no_flow_timeout_ms) : "disabled", ""],
      ["High-flow threshold", descriptor.high_flow_threshold ?? "not configured", `${unit}/min`],
      ["Trend enabled", descriptor.trend_enabled ? "Yes" : "No", ""],
      ["Trend bucket", formatMs(descriptor.trend_bucket_ms || 0), ""],
      ["Trend buckets", descriptor.trend_bucket_count ?? "0", ""],
      ["Protected lifetime totals", descriptor.protected_lifetime_totals ? "Yes" : "No", "Read-only in Stage 15"],
    ];

    elements.descriptorGrid.innerHTML = rows
      .map(
        ([label, value, note]) => `
          <article class="descriptor-item">
            <strong>${escapeHtml(label)}</strong>
            <div>${escapeHtml(String(value))}</div>
            <p>${escapeHtml(note)}</p>
          </article>`
      )
      .join("");
  }

  function renderTrend(trend) {
    const points = trend && Array.isArray(trend.points) ? trend.points : [];
    if (!points.length) {
      elements.trendChart.classList.add("hidden");
      elements.trendEmpty.classList.remove("hidden");
      elements.trendEmpty.textContent = "No trend data yet.";
      elements.trendMeta.textContent = "No trend data yet";
      return;
    }

    elements.trendChart.classList.remove("hidden");
    elements.trendEmpty.classList.add("hidden");
    elements.trendMeta.textContent = `${points.length} buckets | ${trend.ordering || "oldest_to_newest"} | ${formatMs(
      trend.bucket_ms || 0
    )}`;

    const width = 640;
    const height = 240;
    const padding = 28;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxVolume = Math.max(...points.map((point) => Number(point.volume_delta_units || 0)), 1);
    const maxRate = Math.max(...points.map((point) => Number(point.representative_rate_units_per_min || 0)), 1);
    const barWidth = Math.max(18, chartWidth / points.length - 10);

    const bars = [];
    const polyline = [];
    const labels = [];

    points.forEach((point, index) => {
      const x = padding + index * (chartWidth / Math.max(points.length, 1)) + 4;
      const barHeight = (Number(point.volume_delta_units || 0) / maxVolume) * (chartHeight - 18);
      const y = height - padding - barHeight;
      const rateY = height - padding - (Number(point.representative_rate_units_per_min || 0) / maxRate) * (chartHeight - 18);

      bars.push(
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(
          1
        )}" rx="8" fill="rgba(91,192,235,0.52)"></rect>`
      );
      polyline.push(`${(x + barWidth / 2).toFixed(1)},${rateY.toFixed(1)}`);
      labels.push(
        `<text x="${(x + barWidth / 2).toFixed(1)}" y="${height - 8}" fill="#a9bcc2" font-size="10" text-anchor="middle">${escapeHtml(
          String(point.bucket_start_ms)
        )}</text>`
      );
    });

    elements.trendChart.innerHTML = `
      <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="rgba(255,255,255,0.02)"></rect>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.12)"></line>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.12)"></line>
      ${bars.join("")}
      <polyline fill="none" stroke="#ffd184" stroke-width="3" points="${polyline.join(" ")}"></polyline>
      ${labels.join("")}
      <text x="${padding}" y="18" fill="#eef5f6" font-size="12">Volume delta bars</text>
      <text x="${width - padding}" y="18" fill="#ffd184" font-size="12" text-anchor="end">Representative rate line</text>
    `;
  }

  function renderHistory(history) {
    if (!history.length) {
      elements.historyList.className = "history-list empty-state";
      elements.historyList.innerHTML = "No history.";
      return;
    }

    elements.historyList.className = "history-list";
    elements.historyList.innerHTML = history
      .map(
        (entry) => `
          <article class="history-item">
            <h3>${escapeHtml(entry.event_type || "event")} at ${escapeHtml(formatTimestamp(entry.timestamp_ms))}</h3>
            <p>Source: ${escapeHtml(entry.source || "unknown")} | Sequence: ${escapeHtml(entry.sequence_number || "-")}</p>
            <p>${escapeHtml(entry.reason || "No reason supplied.")}</p>
          </article>`
      )
      .join("");
  }

  async function loadListAndStatus() {
    const listResponse = await transport.loadList();
    setTransportMeta(listResponse.code, listResponse.refresh_timestamp_ms);
    const flows = normalizeList(listResponse);
    renderList(flows, listEmptyMessage(listResponse));

    if (!flows.length) {
      renderStatus(null);
      renderTrend({ points: [] });
      renderHistory([]);
      setBanner(elements.errorBanner, listResponse.message || "No flowmeters registered.");
      return;
    }

    const statusResponse = await transport.loadStatus(state.selectedFlowId);
    setTransportMeta(statusResponse.code, statusResponse.refresh_timestamp_ms);
    renderStatus(normalizeStatus(statusResponse));
    setBanner(elements.errorBanner, statusResponse.success === false ? statusResponse.message : "");
    setBanner(elements.messageBanner, statusResponse.message || listResponse.message || "");
  }

  async function loadSelectedFlow(forceHistoryAndTrend) {
    if (!state.selectedFlowId) {
      renderTrend({ points: [] });
      renderHistory([]);
      return;
    }

    const statusResponse = await transport.loadStatus(state.selectedFlowId);
    setTransportMeta(statusResponse.code, statusResponse.refresh_timestamp_ms);
    renderStatus(normalizeStatus(statusResponse));

    if (!forceHistoryAndTrend) {
      return;
    }

    const [trendResponse, historyResponse] = await Promise.all([
      transport.loadTrend(state.selectedFlowId),
      transport.loadHistory(state.selectedFlowId),
    ]);
    renderTrend(normalizeTrend(trendResponse));
    renderHistory(normalizeHistory(historyResponse));
    setBanner(elements.errorBanner, "");
    setBanner(elements.messageBanner, statusResponse.message || "");
  }

  async function refreshAll() {
    try {
      await loadListAndStatus();
      await loadSelectedFlow(true);
    } catch (error) {
      setBanner(elements.errorBanner, error.message || "Failed to refresh flow dashboard.");
    }
  }

  async function postCommand(request) {
    if (!state.selectedFlowId) {
      setBanner(elements.errorBanner, "Select a flowmeter first.");
      return;
    }

    try {
      const response = await request();
      setTransportMeta(response.code, response.refresh_timestamp_ms || Date.now());
      setBanner(elements.messageBanner, response.message || "Command completed.");
      setBanner(elements.errorBanner, response.accepted === false ? response.message || "Command denied." : "");
      await refreshAll();
    } catch (error) {
      setBanner(elements.errorBanner, error.message || "Command failed.");
    }
  }

  elements.refreshButton.addEventListener("click", () => refreshAll());
  elements.startBatchButton.addEventListener("click", () =>
    postCommand(() =>
      transport.startBatch(state.selectedFlowId, {
        target_override: elements.batchTargetOverride.value ? Number(elements.batchTargetOverride.value) : null,
        context: commandContext("flow batch start"),
      })
    )
  );
  elements.stopBatchButton.addEventListener("click", () =>
    postCommand(() =>
      transport.stopBatch(state.selectedFlowId, {
        context: commandContext("flow batch stop"),
      })
    )
  );
  elements.resetBatchButton.addEventListener("click", () =>
    postCommand(() =>
      transport.resetBatch(state.selectedFlowId, {
        context: commandContext("flow batch total reset"),
      })
    )
  );
  elements.resetTripButton.addEventListener("click", () =>
    postCommand(() =>
      transport.resetTrip(state.selectedFlowId, {
        context: commandContext("flow trip total reset"),
      })
    )
  );

  refreshAll();
  window.setInterval(() => {
    loadListAndStatus().catch((error) => setBanner(elements.errorBanner, error.message || "Auto-refresh failed."));
  }, REFRESH_INTERVAL_MS);
})();
