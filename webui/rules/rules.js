(function () {
  const ENDPOINTS = {
    list: "/api/rules/list",
    detail: (id) => `/api/rules/${encodeURIComponent(id)}`,
  };

  const els = {
    lastRefresh: document.getElementById("last-refresh"),
    transportCode: document.getElementById("transport-code"),
    errorBanner: document.getElementById("error-banner"),
    messageBanner: document.getElementById("message-banner"),
    validationBanner: document.getElementById("validation-banner"),
    ruleCount: document.getElementById("rule-count"),
    ruleList: document.getElementById("rule-list"),
    detailStatus: document.getElementById("detail-status"),
    detailSummary: document.getElementById("detail-summary"),
    fieldId: document.getElementById("field-id"),
    fieldName: document.getElementById("field-name"),
    fieldEnabled: document.getElementById("field-enabled"),
    fieldDescription: document.getElementById("field-description"),
    conditionBuilder: document.getElementById("condition-builder"),
    actionBuilder: document.getElementById("action-builder"),
    traceList: document.getElementById("trace-list"),
    refreshButton: document.getElementById("refresh-button"),
  };

  const state = {
    list: { cards: [] },
    detail: null,
    selectedId: "",
  };

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatTime(ms) {
    if (ms === undefined || ms === null || ms === "") {
      return "Waiting";
    }
    if (Number(ms) < 100000000000) {
      return `${ms} ms`;
    }
    const date = new Date(Number(ms));
    return Number.isNaN(date.getTime()) ? `${ms} ms` : date.toLocaleTimeString();
  }

  function setBanner(target, message) {
    target.textContent = message || "";
    target.classList.toggle("hidden", !message);
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload && payload.message ? payload.message : `HTTP ${response.status}`);
    }
    return payload;
  }

  function renderList() {
    const cards = state.list.cards || [];
    els.ruleCount.textContent = `${cards.length} rule${cards.length === 1 ? "" : "s"}`;
    els.ruleList.className = cards.length ? "card-list" : "card-list empty-state";
    els.ruleList.innerHTML = cards.length
      ? cards
          .map(
            (card) => `
              <article class="rule-card ${card.id === state.selectedId ? "active-card" : ""}" data-rule-id="${esc(card.id)}">
                <div class="section-head">
                  <h3>${esc(card.name || card.id)}</h3>
                  <span class="pill status-${esc(card.status || "inactive")}">${esc(card.status || "inactive")}</span>
                </div>
                <p>${esc(card.if_summary || "No IF summary.")}</p>
                <p>${esc(card.then_summary || "No THEN summary.")}</p>
                <div class="stack-meta">
                  <span class="pill">${card.enabled ? "enabled" : "disabled"}</span>
                  <span class="pill">count ${esc(card.activation_count || 0)}</span>
                </div>
              </article>`
          )
          .join("")
      : "No rules loaded.";

    els.ruleList.querySelectorAll("[data-rule-id]").forEach((node) => {
      node.addEventListener("click", () => {
        const id = node.getAttribute("data-rule-id") || "";
        loadDetail(id).catch((error) => setBanner(els.errorBanner, error.message || "Failed to load rule detail."));
      });
    });
  }

  function renderMetadata() {
    const detail = state.detail || {};
    const metadata = detail.metadata || {};
    const runtime = detail.current_status || {};

    els.fieldId.textContent = metadata.id || "Waiting";
    els.fieldName.textContent = metadata.name || "Waiting";
    els.fieldEnabled.textContent = metadata.enabled ? "Yes" : "No";
    els.fieldDescription.textContent = metadata.description || "No description.";
    els.detailStatus.textContent = runtime.status || "inactive";
    els.detailStatus.className = `status-pill status-${runtime.status || "inactive"}`;

    els.detailSummary.innerHTML = state.detail
      ? `<strong>${esc(metadata.name || metadata.id)}</strong><p>Status: ${esc(runtime.status || "inactive")} | Reason: ${esc(
          runtime.last_reason || "No reason yet."
        )}</p><p>IF: ${esc(detail.if_summary || "No IF summary.")}</p><p>THEN: ${esc(detail.then_summary || "No THEN summary.")}</p>`
      : "Select a rule to inspect its runtime status.";
  }

  function renderSummary() {
    if (!state.detail) {
      els.conditionBuilder.className = "builder-stack empty-state";
      els.conditionBuilder.innerHTML = "No rule summary yet.";
      return;
    }

    const elseSummary = state.detail.else_summary
      ? `<article class="builder-card"><h3>ELSE</h3><p>${esc(state.detail.else_summary)}</p></article>`
      : "";

    els.conditionBuilder.className = "builder-stack";
    els.conditionBuilder.innerHTML = `
      <article class="builder-card">
        <h3>IF</h3>
        <p>${esc(state.detail.if_summary || "No IF summary.")}</p>
      </article>
      <article class="builder-card">
        <h3>THEN</h3>
        <p>${esc(state.detail.then_summary || "No THEN summary.")}</p>
      </article>
      ${elseSummary}`;
  }

  function renderValidation() {
    const issues = state.detail?.validation_issues || [];
    setBanner(
      els.validationBanner,
      issues.length ? issues.map((issue) => `${issue.path || "rule"}: ${issue.code || "validation"}: ${issue.message || ""}`).join(" | ") : ""
    );

    if (!issues.length) {
      els.actionBuilder.className = "builder-stack empty-state";
      els.actionBuilder.innerHTML = "No validation issues.";
      return;
    }

    els.actionBuilder.className = "builder-stack";
    els.actionBuilder.innerHTML = issues
      .map(
        (issue) => `
          <article class="action-item">
            <h3>${esc(issue.code || "validation")}</h3>
            <p>${esc(issue.path || "rule")}</p>
            <p>${esc(issue.message || "Validation issue reported.")}</p>
          </article>`
      )
      .join("");
  }

  function renderTrace() {
    const traceLines = state.detail?.trace_lines || [];
    if (!traceLines.length) {
      els.traceList.className = "trace-list empty-state";
      els.traceList.innerHTML = "No current evaluation trace.";
      return;
    }

    els.traceList.className = "trace-list";
    els.traceList.innerHTML = traceLines
      .map(
        (line) => `
          <article class="trace-card">
            <h3>${esc(line.node_id)} <span class="pill">${esc(line.node_kind)}</span></h3>
            <p>Raw: ${line.raw_result ? "true" : "false"} | Effective: ${line.effective_result ? "true" : "false"} | Error: ${esc(
              line.error_code || "OK"
            )}</p>
            <p>Reason: ${esc(line.reason || "No reason supplied.")}</p>
            <p>Signal: ${esc(line.signal_path || "-")} | Value: ${esc(line.value_summary || "-")}</p>
          </article>`
      )
      .join("");
  }

  function render() {
    renderList();
    renderMetadata();
    renderSummary();
    renderValidation();
    renderTrace();
  }

  async function loadList() {
    const payload = await fetchJson(ENDPOINTS.list);
    state.list = payload.value || { cards: [] };
    els.transportCode.textContent = payload.code || "RULES_UI_OK";
    els.lastRefresh.textContent = formatTime(payload.refresh_timestamp_ms);
    setBanner(els.messageBanner, payload.message || "");
    setBanner(els.errorBanner, payload.success === false ? payload.message || "Rules list unavailable." : "");
  }

  async function loadDetail(id) {
    const payload = await fetchJson(ENDPOINTS.detail(id));
    state.detail = payload.value || null;
    state.selectedId = state.detail?.metadata?.id || id;
    els.transportCode.textContent = payload.code || "RULES_UI_OK";
    els.lastRefresh.textContent = formatTime(payload.refresh_timestamp_ms);
    setBanner(els.messageBanner, payload.message || "");
    setBanner(els.errorBanner, payload.success === false ? payload.message || "Rule detail unavailable." : "");
    render();
  }

  async function refresh() {
    await loadList();
    if (!state.selectedId && state.list.cards?.length) {
      state.selectedId = state.list.cards[0].id;
    }
    if (state.selectedId) {
      await loadDetail(state.selectedId);
    } else {
      state.detail = null;
      render();
    }
  }

  els.refreshButton.addEventListener("click", () => {
    refresh().catch((error) => setBanner(els.errorBanner, error.message || "Failed to refresh rules page."));
  });

  refresh().catch((error) => setBanner(els.errorBanner, error.message || "Failed to load rules page."));
})();
