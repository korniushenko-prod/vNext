// Generated from webui assets for embedded Stage 28 serving.
inline constexpr char kDashboardHtml[] = R"DASHBOARD_HTML(
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Program Dashboard</title>
    <link rel="stylesheet" href="./dashboard.css" />
  </head>
  <body>
    <main class="dashboard-shell">
      <header class="hero panel reveal">
        <div>
          <p class="eyebrow">Embedded Program Dashboard</p>
          <h1>Process program status</h1>
          <p class="hero-copy">
            Mechanics-first view of the active program, current step, blockers, outputs, alarms and recent control
            history.
          </p>
        </div>
        <div class="hero-meta">
          <div class="meta-chip">
            <span class="meta-label">Last refresh</span>
            <strong id="last-refresh">Waiting</strong>
          </div>
          <div class="meta-chip">
            <span class="meta-label">Transport code</span>
            <strong id="transport-code">DASHBOARD_DATA_UNAVAILABLE</strong>
          </div>
        </div>
      </header>

      <section id="error-banner" class="banner banner-error hidden reveal" aria-live="polite"></section>
      <section id="message-banner" class="banner banner-info hidden reveal" aria-live="polite"></section>

      <section class="summary-grid reveal">
        <article class="panel summary-card">
          <span class="summary-label">Active Program</span>
          <strong id="summary-program" class="summary-value">No active program</strong>
          <span id="summary-lifecycle" class="summary-subtle">idle</span>
        </article>
        <article class="panel summary-card">
          <span class="summary-label">Current Step</span>
          <strong id="summary-state" class="summary-value">Waiting</strong>
          <span id="summary-state-type" class="summary-subtle">generic</span>
        </article>
        <article class="panel summary-card">
          <span class="summary-label">Next</span>
          <strong id="summary-next" class="summary-value">Blocked</strong>
          <span id="summary-next-reason" class="summary-subtle">No transition data yet</span>
        </article>
        <article class="panel summary-card alarm-card">
          <span class="summary-label">Active Alarms</span>
          <strong id="summary-alarms" class="summary-value">0</strong>
          <span id="summary-alarm-severity" class="summary-subtle">none</span>
        </article>
      </section>

      <section class="content-grid">
        <article class="panel reveal">
          <div class="section-head">
            <div>
              <p class="eyebrow">Program</p>
              <h2>Current program</h2>
            </div>
            <span id="program-status-badge" class="status-pill">idle</span>
          </div>
          <dl class="key-value-grid">
            <div>
              <dt>Name</dt>
              <dd id="program-name">No active program</dd>
            </div>
            <div>
              <dt>Active state</dt>
              <dd id="program-state">Waiting</dd>
            </div>
            <div>
              <dt>State elapsed</dt>
              <dd id="program-elapsed">0.0 s</dd>
            </div>
            <div>
              <dt>Last reason</dt>
              <dd id="program-reason">No active program.</dd>
            </div>
            <div>
              <dt>Pending stop</dt>
              <dd id="program-stop-flag">No</dd>
            </div>
            <div>
              <dt>Pending trip</dt>
              <dd id="program-trip-flag">No</dd>
            </div>
            <div>
              <dt>Lockout</dt>
              <dd id="program-lockout">No</dd>
            </div>
          </dl>
        </article>

        <article class="panel reveal">
          <div class="section-head">
            <div>
              <p class="eyebrow">Control</p>
              <h2>Commands</h2>
            </div>
            <button id="refresh-button" class="ghost-button">Refresh</button>
          </div>
          <label class="field-group" for="program-select">
            <span>Program to start</span>
            <select id="program-select"></select>
          </label>
          <div class="command-grid">
            <button id="start-button" class="action-button">Start</button>
            <button id="stop-button" class="action-button">Normal Stop</button>
            <button id="trip-button" class="action-button danger-button">Trip</button>
            <button id="reset-button" class="action-button">Reset</button>
          </div>
          <div class="command-explanations">
            <p><strong>Start:</strong> <span id="start-reason">Ready.</span></p>
            <p><strong>Normal Stop:</strong> <span id="stop-reason">Ready.</span></p>
            <p><strong>Trip:</strong> <span id="trip-reason">Ready.</span></p>
            <p><strong>Reset:</strong> <span id="reset-reason">Ready.</span></p>
          </div>
        </article>

        <article class="panel reveal wide-panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Transitions</p>
              <h2>Transition blockers</h2>
            </div>
            <span id="transition-count" class="status-pill subtle-pill">0 candidates</span>
          </div>
          <section id="blocked-by" class="blocked-panel">
            <h3>Blocked by</h3>
            <div id="blocked-by-list" class="stack-list empty-state">No transition blockers.</div>
          </section>
          <div id="transition-list" class="stack-list"></div>
        </article>

        <article class="panel reveal">
          <div class="section-head">
            <div>
              <p class="eyebrow">Outputs</p>
              <h2>Active outputs</h2>
            </div>
          </div>
          <div id="outputs-list" class="stack-list empty-state">No actuator data.</div>
        </article>

        <article class="panel reveal">
          <div class="section-head">
            <div>
              <p class="eyebrow">Alarms</p>
              <h2>Active alarms</h2>
            </div>
          </div>
          <div id="alarms-summary" class="summary-strip"></div>
          <div id="alarms-list" class="stack-list empty-state">No active alarms.</div>
        </article>

        <article class="panel reveal wide-panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">History</p>
              <h2>Recent history</h2>
            </div>
          </div>
          <div id="history-list" class="history-list empty-state">No recent history.</div>
        </article>
      </section>
    </main>

    <script src="./dashboard.js"></script>
  </body>
</html>
)DASHBOARD_HTML";

inline constexpr char kDashboardCss[] = R"DASHBOARD_CSS(
:root {
  --bg: #0e1518;
  --bg-soft: #152126;
  --panel: rgba(24, 36, 40, 0.94);
  --panel-strong: rgba(33, 49, 55, 0.98);
  --line: rgba(159, 181, 173, 0.18);
  --text: #eef3e5;
  --muted: #a7b6ae;
  --accent: #f4b544;
  --accent-deep: #8d6220;
  --ok: #78d19a;
  --warn: #ffcf73;
  --danger: #ff756c;
  --danger-bg: rgba(130, 34, 30, 0.28);
  --safe: #86d6c3;
  --shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
  --radius: 22px;
  --radius-sm: 14px;
  --font-ui: "Bahnschrift", "Trebuchet MS", "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-ui);
  color: var(--text);
  background:
    radial-gradient(circle at top right, rgba(244, 181, 68, 0.18), transparent 28%),
    radial-gradient(circle at bottom left, rgba(102, 196, 179, 0.14), transparent 24%),
    linear-gradient(160deg, #081014 0%, #101a1f 48%, #061013 100%);
}

.dashboard-shell {
  width: min(1280px, calc(100% - 28px));
  margin: 0 auto;
  padding: 28px 0 42px;
}

.panel {
  background: linear-gradient(180deg, var(--panel-strong), var(--panel));
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 22px;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  overflow: hidden;
  position: relative;
}

.hero::after {
  content: "";
  position: absolute;
  inset: auto -8% -50% auto;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244, 181, 68, 0.18), transparent 70%);
  pointer-events: none;
}

.hero h1,
.section-head h2 {
  margin: 0;
  letter-spacing: 0.02em;
}

.hero h1 {
  font-size: clamp(1.9rem, 3.8vw, 3.1rem);
}

.hero-copy {
  max-width: 58ch;
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.55;
}

.hero-meta {
  display: grid;
  gap: 10px;
  min-width: 220px;
}

.meta-chip,
.summary-card,
.summary-strip,
.history-item,
.stack-item {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
}

.meta-chip {
  padding: 14px 16px;
}

.meta-label,
.summary-label,
dt,
.eyebrow {
  text-transform: uppercase;
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  color: var(--muted);
}

.eyebrow {
  margin: 0 0 8px;
}

.summary-grid,
.content-grid,
.command-grid,
.key-value-grid {
  display: grid;
  gap: 16px;
}

.summary-grid {
  margin-top: 18px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.summary-card {
  padding: 18px;
}

.summary-value {
  display: block;
  margin-top: 8px;
  font-size: clamp(1.25rem, 2.4vw, 2rem);
}

.summary-subtle,
dd,
.empty-state,
.command-explanations span {
  color: var(--muted);
}

.alarm-card {
  border-color: rgba(255, 117, 108, 0.28);
}

.content-grid {
  margin-top: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wide-panel {
  grid-column: 1 / -1;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.status-pill,
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(244, 181, 68, 0.13);
  border: 1px solid rgba(244, 181, 68, 0.24);
  color: var(--warn);
  font-size: 0.9rem;
}

.subtle-pill {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
  color: var(--muted);
}

.key-value-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

dt {
  margin-bottom: 6px;
}

dd {
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
}

.field-group {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

select,
button {
  font: inherit;
}

select {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  padding: 12px 14px;
}

.command-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.action-button,
.ghost-button {
  border: 0;
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: transform 160ms ease, opacity 160ms ease, background 160ms ease;
}

.action-button {
  background: linear-gradient(180deg, #ffca69, #d88d2e);
  color: #111;
  font-weight: 700;
}

.danger-button {
  background: linear-gradient(180deg, #ff8e81, #cc4139);
  color: #fff6f6;
}

.ghost-button {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

button:hover:enabled {
  transform: translateY(-1px);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.command-explanations {
  margin-top: 18px;
  display: grid;
  gap: 10px;
}

.command-explanations p {
  margin: 0;
  line-height: 1.45;
}

.stack-list,
.history-list {
  display: grid;
  gap: 12px;
}

.stack-item,
.history-item,
.summary-strip {
  padding: 14px 16px;
}

.stack-item h3,
.history-item h3,
.blocked-panel h3 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.stack-item p,
.history-item p,
.summary-strip p {
  margin: 6px 0 0;
  color: var(--muted);
  line-height: 1.45;
}

.stack-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.pill-ok {
  color: var(--ok);
  border-color: rgba(120, 209, 154, 0.24);
  background: rgba(120, 209, 154, 0.12);
}

.pill-danger {
  color: var(--danger);
  border-color: rgba(255, 117, 108, 0.24);
  background: rgba(255, 117, 108, 0.12);
}

.pill-safe {
  color: var(--safe);
  border-color: rgba(134, 214, 195, 0.24);
  background: rgba(134, 214, 195, 0.12);
}

.blocked-panel {
  margin-bottom: 14px;
  padding: 16px;
  border-radius: var(--radius-sm);
  background: var(--danger-bg);
  border: 1px solid rgba(255, 117, 108, 0.18);
}

.summary-strip {
  margin-bottom: 12px;
}

.summary-strip strong {
  display: block;
  margin-bottom: 4px;
}

.banner {
  margin-top: 18px;
  padding: 14px 18px;
  border-radius: 18px;
  border: 1px solid transparent;
}

.banner-error {
  background: rgba(130, 34, 30, 0.25);
  border-color: rgba(255, 117, 108, 0.24);
  color: #ffd3cf;
}

.banner-info {
  background: rgba(244, 181, 68, 0.14);
  border-color: rgba(244, 181, 68, 0.24);
  color: #fff1c9;
}

.hidden {
  display: none !important;
}

.empty-state {
  padding: 18px;
}

.reveal {
  animation: fade-up 420ms ease both;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 980px) {
  .summary-grid,
  .content-grid {
    grid-template-columns: 1fr 1fr;
  }

  .hero {
    flex-direction: column;
  }

  .hero-meta {
    width: 100%;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-shell {
    width: min(100% - 20px, 100%);
    padding-top: 20px;
  }

  .summary-grid,
  .content-grid,
  .command-grid,
  .key-value-grid,
  .hero-meta {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 18px;
  }
}
)DASHBOARD_CSS";

inline constexpr char kDashboardJs[] = R"DASHBOARD_JS(
(function () {
  const REFRESH_INTERVAL_MS = 1500;
  const ENDPOINTS = {
    data: "/api/dashboard/data",
    start: "/api/dashboard/start",
    stop: "/api/dashboard/stop",
    trip: "/api/dashboard/trip",
    reset: "/api/dashboard/reset",
  };

  const state = {
    selectedProgramId: "",
    dashboard: null,
  };

  const elements = {
    errorBanner: document.getElementById("error-banner"),
    messageBanner: document.getElementById("message-banner"),
    lastRefresh: document.getElementById("last-refresh"),
    transportCode: document.getElementById("transport-code"),
    summaryProgram: document.getElementById("summary-program"),
    summaryLifecycle: document.getElementById("summary-lifecycle"),
    summaryState: document.getElementById("summary-state"),
    summaryStateType: document.getElementById("summary-state-type"),
    summaryNext: document.getElementById("summary-next"),
    summaryNextReason: document.getElementById("summary-next-reason"),
    summaryAlarms: document.getElementById("summary-alarms"),
    summaryAlarmSeverity: document.getElementById("summary-alarm-severity"),
    programStatusBadge: document.getElementById("program-status-badge"),
    programName: document.getElementById("program-name"),
    programState: document.getElementById("program-state"),
    programElapsed: document.getElementById("program-elapsed"),
    programReason: document.getElementById("program-reason"),
    programStopFlag: document.getElementById("program-stop-flag"),
    programTripFlag: document.getElementById("program-trip-flag"),
    programLockout: document.getElementById("program-lockout"),
    programSelect: document.getElementById("program-select"),
    startButton: document.getElementById("start-button"),
    stopButton: document.getElementById("stop-button"),
    tripButton: document.getElementById("trip-button"),
    resetButton: document.getElementById("reset-button"),
    refreshButton: document.getElementById("refresh-button"),
    startReason: document.getElementById("start-reason"),
    stopReason: document.getElementById("stop-reason"),
    tripReason: document.getElementById("trip-reason"),
    resetReason: document.getElementById("reset-reason"),
    transitionCount: document.getElementById("transition-count"),
    blockedByList: document.getElementById("blocked-by-list"),
    transitionList: document.getElementById("transition-list"),
    outputsList: document.getElementById("outputs-list"),
    alarmsSummary: document.getElementById("alarms-summary"),
    alarmsList: document.getElementById("alarms-list"),
    historyList: document.getElementById("history-list"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatSeconds(ms) {
    return `${(Number(ms || 0) / 1000).toFixed(1)} s`;
  }

  function formatTimestamp(ms) {
    if (!ms && ms !== 0) {
      return "Waiting";
    }
    if (Number(ms) < 100000000000) {
      return `${ms} ms`;
    }
    const date = new Date(Number(ms));
    return Number.isNaN(date.getTime()) ? `${ms} ms` : date.toLocaleTimeString();
  }

  function commandContext(reason) {
    return {
      now_ms: Date.now(),
      source: "web_dashboard",
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

  function selectedProgram(dashboard) {
    return (dashboard.registered_programs || []).find((entry) => entry.id === state.selectedProgramId) || null;
  }

  function syncSelection(dashboard) {
    const programs = dashboard.registered_programs || [];
    const selectionStillExists = programs.some((entry) => entry.id === state.selectedProgramId);
    if (!selectionStillExists) {
      state.selectedProgramId = dashboard.selected_program_id || (programs[0] ? programs[0].id : "");
    }
    elements.programSelect.innerHTML = programs
      .map((entry) => {
        const activeTag = entry.is_active ? " (active)" : "";
        return `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}${activeTag}</option>`;
      })
      .join("");
    if (state.selectedProgramId) {
      elements.programSelect.value = state.selectedProgramId;
    }
  }

  function renderTransitions(dashboard) {
    const transitions = dashboard.transition_candidates || [];
    const blocked = dashboard.blocked_transitions || [];
    elements.transitionCount.textContent = `${transitions.length} candidate${transitions.length === 1 ? "" : "s"}`;

    if (!blocked.length) {
      elements.blockedByList.className = "stack-list empty-state";
      elements.blockedByList.innerHTML = "No blocking transition reasons right now.";
    } else {
      elements.blockedByList.className = "stack-list";
      elements.blockedByList.innerHTML = blocked
        .map(
          (entry) => `
            <article class="stack-item">
              <h3>${escapeHtml(entry.target_state_name || entry.target_state_id)}</h3>
              <p>${escapeHtml(entry.reason || "Blocked without reason text.")}</p>
              <div class="stack-meta">
                <span class="pill pill-danger">${entry.min_time_satisfied ? "Min time OK" : "Min time waiting"}</span>
                <span class="pill">${entry.eligible ? "Eligible" : "Not eligible"}</span>
              </div>
            </article>`
        )
        .join("");
    }

    if (!transitions.length) {
      elements.transitionList.className = "stack-list empty-state";
      elements.transitionList.innerHTML = "No transition candidates reported.";
      return;
    }

    elements.transitionList.className = "stack-list";
    elements.transitionList.innerHTML = transitions
      .map(
        (entry) => `
          <article class="stack-item">
            <h3>${escapeHtml(entry.target_state_name || entry.target_state_id)}</h3>
            <p>${escapeHtml(entry.reason || "No reason supplied.")}</p>
            <div class="stack-meta">
              <span class="pill ${entry.eligible ? "pill-ok" : "pill-danger"}">${entry.eligible ? "Eligible" : "Blocked"}</span>
              <span class="pill">${entry.min_time_satisfied ? "Min time satisfied" : "Waiting on min time"}</span>
              <span class="pill">${escapeHtml(entry.transition_id)}</span>
            </div>
          </article>`
      )
      .join("");
  }

  function renderOutputs(dashboard) {
    const actuators = dashboard.actuator_summaries || [];
    if (!actuators.length) {
      elements.outputsList.className = "stack-list empty-state";
      elements.outputsList.innerHTML = "No actuator data.";
      return;
    }

    elements.outputsList.className = "stack-list";
    elements.outputsList.innerHTML = actuators
      .map((entry) => {
        const emphasisPill =
          entry.emphasis === "safe_fallback"
            ? '<span class="pill pill-safe">Safe fallback</span>'
            : entry.emphasis === "sequence_owned"
              ? '<span class="pill pill-ok">Sequence owned</span>'
              : '<span class="pill">Observed</span>';
        return `
          <article class="stack-item">
            <h3>${escapeHtml(entry.id)}${entry.is_on ? " ON" : " OFF"}</h3>
            <p>${escapeHtml(entry.state_text)} | role: ${escapeHtml(entry.role)} | owner: ${escapeHtml(entry.owner || "unowned")}</p>
            <p>${escapeHtml(entry.reason || "No reason supplied.")}</p>
            <div class="stack-meta">
              ${emphasisPill}
              <span class="pill">${escapeHtml(entry.kind)}</span>
              <span class="pill">${escapeHtml(entry.priority)}</span>
            </div>
          </article>`;
      })
      .join("");
  }

  function renderAlarms(dashboard) {
    elements.alarmsSummary.innerHTML = `
      <strong>${dashboard.alarms_any_active ? "Alarm attention required" : "No active alarms"}</strong>
      <p>Count: ${dashboard.alarms_active_count || 0} | Highest severity: ${escapeHtml(
        dashboard.alarms_highest_severity || "none"
      )} | Trip: ${dashboard.alarms_trip_active ? "yes" : "no"} | Safety: ${dashboard.alarms_safety_active ? "yes" : "no"}</p>`;

    const alarms = dashboard.active_alarm_entries || [];
    if (!alarms.length) {
      elements.alarmsList.className = "stack-list empty-state";
      elements.alarmsList.innerHTML = "No active alarms.";
      return;
    }

    elements.alarmsList.className = "stack-list";
    elements.alarmsList.innerHTML = alarms
      .map(
        (entry) => `
          <article class="stack-item">
            <h3>${escapeHtml(entry.id)}</h3>
            <p>${entry.severity ? `Severity: ${escapeHtml(entry.severity)}` : "Severity detail unavailable."}</p>
          </article>`
      )
      .join("");
  }

  function renderHistory(dashboard) {
    const history = dashboard.recent_history || [];
    if (!history.length) {
      elements.historyList.className = "history-list empty-state";
      elements.historyList.innerHTML = "No recent history.";
      return;
    }

    elements.historyList.className = "history-list";
    elements.historyList.innerHTML = history
      .map(
        (entry) => `
          <article class="history-item">
            <h3>${escapeHtml(entry.event_type)} at ${escapeHtml(formatTimestamp(entry.timestamp_ms))}</h3>
            <p>From: ${escapeHtml(entry.from_state || "-")} | To: ${escapeHtml(entry.to_state || "-")} | Source: ${escapeHtml(
              entry.source || "unknown"
            )}</p>
            <p>${escapeHtml(entry.reason || "No reason supplied.")}</p>
          </article>`
      )
      .join("");
  }

  function renderDashboard(response) {
    const dashboard = response.dashboard || {};
    state.dashboard = dashboard;
    syncSelection(dashboard);

    const activeLabel = dashboard.active_program_name || "No active program";
    const currentState = dashboard.current_state_name || dashboard.current_state_id || "Waiting";
    const nextState = dashboard.next_transition_target_state_name || dashboard.next_transition_target_state_id || "Blocked";

    elements.lastRefresh.textContent = formatTimestamp(response.refresh_timestamp_ms);
    elements.transportCode.textContent = response.code || "DASHBOARD_DATA_UNAVAILABLE";
    elements.summaryProgram.textContent = activeLabel;
    elements.summaryLifecycle.textContent = dashboard.lifecycle || "idle";
    elements.summaryState.textContent = currentState;
    elements.summaryStateType.textContent = dashboard.current_state_type || "generic";
    elements.summaryNext.textContent = nextState;
    elements.summaryNextReason.textContent = dashboard.next_transition_reason || "No next transition available yet.";
    elements.summaryAlarms.textContent = String(dashboard.alarms_active_count || 0);
    elements.summaryAlarmSeverity.textContent = dashboard.alarms_highest_severity || "none";

    elements.programStatusBadge.textContent = dashboard.lifecycle || "idle";
    elements.programName.textContent = activeLabel;
    elements.programState.textContent = currentState;
    elements.programElapsed.textContent = formatSeconds(dashboard.state_elapsed_ms || 0);
    elements.programReason.textContent = dashboard.last_reason || "No active program.";
    elements.programStopFlag.textContent = dashboard.pending_normal_stop ? "Yes" : "No";
    elements.programTripFlag.textContent = dashboard.pending_trip ? "Yes" : "No";
    elements.programLockout.textContent = dashboard.lockout ? "Yes" : "No";

    const selected = selectedProgram(dashboard);
    const startEnabled = dashboard.active_program_id ? false : Boolean(selected ? selected.can_start : dashboard.can_start);
    elements.startButton.disabled = !startEnabled;
    elements.stopButton.disabled = !dashboard.can_stop;
    elements.tripButton.disabled = !dashboard.can_trip;
    elements.resetButton.disabled = !dashboard.can_reset;

    elements.startReason.textContent = startEnabled
      ? `Ready to start ${selected ? selected.name : "the selected program"}.`
      : (selected && selected.start_reason) || dashboard.start_reason || "Start is not allowed.";
    elements.stopReason.textContent = dashboard.can_stop ? "Ready." : dashboard.stop_reason || "Stop is not allowed.";
    elements.tripReason.textContent = dashboard.can_trip ? "Ready." : dashboard.trip_reason || "Trip is not allowed.";
    elements.resetReason.textContent = dashboard.can_reset ? "Ready." : dashboard.reset_reason || "Reset is not allowed.";

    renderTransitions(dashboard);
    renderOutputs(dashboard);
    renderAlarms(dashboard);
    renderHistory(dashboard);

    const warningText = (response.warnings || []).join(" ");
    setBanner(elements.errorBanner, response.success ? "" : response.message || "Dashboard data is unavailable.");
    setBanner(elements.messageBanner, response.success ? warningText || response.message || "" : "");
  }

  async function loadDashboard() {
    try {
      const response = await fetchJson(ENDPOINTS.data);
      renderDashboard(response);
    } catch (error) {
      setBanner(elements.errorBanner, error.message || "Failed to load dashboard data.");
    }
  }

  async function postCommand(endpoint, body) {
    try {
      const response = await fetchJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.updated_dashboard) {
        renderDashboard(response.updated_dashboard);
      } else {
        await loadDashboard();
      }

      setBanner(elements.messageBanner, response.message || "Command completed.");
      if (!response.accepted) {
        setBanner(elements.errorBanner, response.message || "Command was denied.");
      } else {
        setBanner(elements.errorBanner, "");
      }
    } catch (error) {
      setBanner(elements.errorBanner, error.message || "Command failed.");
    }
  }

  elements.programSelect.addEventListener("change", (event) => {
    state.selectedProgramId = event.target.value;
    if (state.dashboard) {
      renderDashboard({
        success: true,
        code: "DASHBOARD_OK",
        message: "",
        refresh_timestamp_ms: Date.now(),
        dashboard: state.dashboard,
        warnings: [],
      });
    }
  });

  elements.refreshButton.addEventListener("click", () => loadDashboard());
  elements.startButton.addEventListener("click", () =>
    postCommand(ENDPOINTS.start, {
      program_id: state.selectedProgramId,
      context: commandContext("dashboard start"),
    })
  );
  elements.stopButton.addEventListener("click", () =>
    postCommand(ENDPOINTS.stop, {
      context: commandContext("dashboard normal stop"),
    })
  );
  elements.tripButton.addEventListener("click", () =>
    postCommand(ENDPOINTS.trip, {
      context: commandContext("dashboard trip"),
    })
  );
  elements.resetButton.addEventListener("click", () =>
    postCommand(ENDPOINTS.reset, {
      context: commandContext("dashboard reset"),
    })
  );

  loadDashboard();
  window.setInterval(loadDashboard, REFRESH_INTERVAL_MS);
})();
)DASHBOARD_JS";

inline constexpr char kFlowHtml[] = R"FLOW_HTML(
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Flow Dashboard</title>
    <link rel="stylesheet" href="./flow.css" />
  </head>
  <body>
    <main class="flow-shell">
      <header class="hero panel reveal">
        <div>
          <p class="eyebrow">Embedded Flow Dashboard</p>
          <h1>Runtime flowmeter view</h1>
          <p class="hero-copy">
            Narrow mechanics-first page for current rate, totals, batch state, no-flow and high-flow attention,
            recent history and 24h-style trend buckets.
          </p>
        </div>
        <div class="hero-meta">
          <div class="meta-chip">
            <span class="meta-label">Last refresh</span>
            <strong id="last-refresh">Waiting</strong>
          </div>
          <div class="meta-chip">
            <span class="meta-label">Transport code</span>
            <strong id="transport-code">FLOW_UI_DATA_UNAVAILABLE</strong>
          </div>
        </div>
      </header>

      <section id="error-banner" class="banner banner-error hidden reveal" aria-live="polite"></section>
      <section id="message-banner" class="banner banner-info hidden reveal" aria-live="polite"></section>

      <section class="layout-grid">
        <aside class="panel reveal side-panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Flowmeters</p>
              <h2>Registered list</h2>
            </div>
            <button id="refresh-button" class="ghost-button">Refresh</button>
          </div>
          <div id="flow-list" class="list-stack empty-state">No flowmeters registered.</div>
        </aside>

        <section class="main-grid">
          <div class="summary-grid reveal">
            <article class="panel summary-card">
              <span class="summary-label">Selected flowmeter</span>
              <strong id="summary-name" class="summary-value">Waiting</strong>
              <span id="summary-unit" class="summary-subtle">unit</span>
            </article>
            <article class="panel summary-card rate-card">
              <span class="summary-label">Current rate</span>
              <strong id="summary-rate" class="summary-rate">0.00</strong>
              <span id="summary-rate-unit" class="summary-subtle">unit/min</span>
            </article>
            <article class="panel summary-card">
              <span class="summary-label">Lifetime total</span>
              <strong id="summary-lifetime" class="summary-value">0.00 unit</strong>
              <span id="summary-protected" class="summary-subtle">Protected total</span>
            </article>
            <article class="panel summary-card">
              <span class="summary-label">Batch total</span>
              <strong id="summary-batch" class="summary-value">0.00 unit</strong>
              <span id="summary-batch-target" class="summary-subtle">Descriptor default</span>
            </article>
          </div>

          <div class="content-grid">
            <article class="panel reveal">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Status</p>
                  <h2>Runtime summary</h2>
                </div>
              </div>
              <div id="status-badges" class="badge-row"></div>
              <dl class="key-value-grid">
                <div>
                  <dt>Trip total</dt>
                  <dd id="trip-total">0.00 unit</dd>
                </div>
                <div>
                  <dt>Raw pulse lifetime</dt>
                  <dd id="raw-pulses">0 pulses</dd>
                </div>
                <div>
                  <dt>Time-window rate</dt>
                  <dd id="time-window-rate">0.00 unit/min</dd>
                </div>
                <div>
                  <dt>Pulse-frequency rate</dt>
                  <dd id="pulse-frequency-rate">0.00 unit/min</dd>
                </div>
                <div>
                  <dt>Average-N rate</dt>
                  <dd id="avg-n-rate">0.00 unit/min</dd>
                </div>
                <div>
                  <dt>Last pulse age</dt>
                  <dd id="last-pulse-age">0 ms</dd>
                </div>
                <div class="wide-row">
                  <dt>Last reason</dt>
                  <dd id="last-reason">No runtime reason available yet.</dd>
                </div>
              </dl>
            </article>

            <article class="panel reveal">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Batch control</p>
                  <h2>Runtime controls</h2>
                </div>
              </div>
              <label class="field-group" for="batch-target-override">
                <span>Target override</span>
                <input id="batch-target-override" type="number" step="0.01" min="0" placeholder="Use descriptor default" />
              </label>
              <div class="command-grid">
                <button id="start-batch-button" class="action-button">Start Batch</button>
                <button id="stop-batch-button" class="action-button warn-button">Stop Batch</button>
                <button id="reset-batch-button" class="action-button">Reset Batch Total</button>
                <button id="reset-trip-button" class="action-button">Reset Trip Total</button>
              </div>
              <div class="command-explanations">
                <p><strong>Start:</strong> <span id="start-reason">Select a flowmeter.</span></p>
                <p><strong>Stop:</strong> <span id="stop-reason">Select a flowmeter.</span></p>
              </div>
            </article>

            <article class="panel reveal wide-panel">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Trend</p>
                  <h2>24h-style bucket view</h2>
                </div>
                <span id="trend-meta" class="status-pill subtle-pill">No trend data yet</span>
              </div>
              <div id="trend-empty" class="empty-state">No trend data yet.</div>
              <svg id="trend-chart" class="trend-chart hidden" viewBox="0 0 640 240" role="img" aria-label="Flow trend chart"></svg>
            </article>

            <article class="panel reveal wide-panel">
              <div class="section-head">
                <div>
                  <p class="eyebrow">History</p>
                  <h2>Recent history</h2>
                </div>
              </div>
              <div id="history-list" class="history-list empty-state">No history.</div>
            </article>

            <article class="panel reveal wide-panel">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Descriptor</p>
                  <h2>Read-only summary</h2>
                </div>
                <span class="status-pill subtle-pill">Setup editing postponed</span>
              </div>
              <p class="descriptor-note">
                Descriptor editing is intentionally postponed until a shared config-adapter layer and safe source catalog
                exist. This page is runtime-only in Stage 15.
              </p>
              <div id="descriptor-grid" class="descriptor-grid"></div>
            </article>
          </div>
        </section>
      </section>
    </main>

    <script src="./flow.js"></script>
  </body>
</html>
)FLOW_HTML";

inline constexpr char kFlowCss[] = R"FLOW_CSS(
:root {
  --bg: #0b1114;
  --bg-soft: #111b21;
  --panel: rgba(20, 31, 38, 0.94);
  --panel-strong: rgba(27, 43, 52, 0.98);
  --line: rgba(157, 183, 190, 0.14);
  --text: #eef5f6;
  --muted: #a9bcc2;
  --accent: #5bc0eb;
  --accent-deep: #154b62;
  --ok: #82d49c;
  --warn: #ffca72;
  --danger: #ff7b6e;
  --info: #9fdcff;
  --shadow: 0 28px 80px rgba(0, 0, 0, 0.34);
  --radius: 22px;
  --radius-sm: 14px;
  --font-ui: "Bahnschrift", "Trebuchet MS", "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-ui);
  color: var(--text);
  background:
    radial-gradient(circle at top left, rgba(91, 192, 235, 0.15), transparent 24%),
    radial-gradient(circle at bottom right, rgba(255, 202, 114, 0.12), transparent 28%),
    linear-gradient(165deg, #060d10 0%, #0c151a 48%, #091216 100%);
}

.flow-shell {
  width: min(1360px, calc(100% - 28px));
  margin: 0 auto;
  padding: 28px 0 40px;
}

.panel {
  background: linear-gradient(180deg, var(--panel-strong), var(--panel));
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 22px;
}

.hero,
.section-head,
.summary-grid,
.content-grid,
.command-grid,
.key-value-grid,
.layout-grid,
.main-grid,
.badge-row,
.descriptor-grid,
.list-stack,
.history-list {
  display: grid;
  gap: 16px;
}

.hero {
  grid-template-columns: minmax(0, 1fr) 240px;
  align-items: start;
}

.hero h1,
.section-head h2 {
  margin: 0;
}

.hero h1 {
  font-size: clamp(1.9rem, 4vw, 3rem);
}

.hero-copy,
.summary-subtle,
dd,
.descriptor-note,
.empty-state,
.flow-card p,
.history-item p,
.command-explanations span {
  color: var(--muted);
}

.hero-copy {
  max-width: 62ch;
  line-height: 1.55;
  margin: 10px 0 0;
}

.hero-meta {
  display: grid;
  gap: 10px;
}

.meta-chip,
.summary-card,
.flow-card,
.history-item,
.descriptor-item {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
}

.meta-chip {
  padding: 14px 16px;
}

.meta-label,
.summary-label,
dt,
.eyebrow {
  text-transform: uppercase;
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  color: var(--muted);
}

.eyebrow {
  margin: 0 0 8px;
}

.layout-grid {
  margin-top: 18px;
  grid-template-columns: 320px minmax(0, 1fr);
}

.main-grid {
  gap: 18px;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.summary-card {
  padding: 18px;
}

.summary-value,
.summary-rate {
  display: block;
  margin-top: 8px;
}

.summary-value {
  font-size: clamp(1.2rem, 2.3vw, 1.95rem);
}

.summary-rate {
  font-size: clamp(2rem, 4.2vw, 3.4rem);
  line-height: 1;
  color: var(--accent);
}

.rate-card {
  border-color: rgba(91, 192, 235, 0.24);
}

.content-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wide-panel {
  grid-column: 1 / -1;
}

.section-head {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  margin-bottom: 18px;
}

.status-pill,
.badge-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: var(--muted);
  font-size: 0.9rem;
}

.subtle-pill {
  color: var(--muted);
}

.badge-row {
  grid-template-columns: repeat(auto-fit, minmax(132px, max-content));
  margin-bottom: 18px;
}

.tone-ok {
  color: var(--ok);
  border-color: rgba(130, 212, 156, 0.24);
  background: rgba(130, 212, 156, 0.12);
}

.tone-warn {
  color: var(--warn);
  border-color: rgba(255, 202, 114, 0.24);
  background: rgba(255, 202, 114, 0.12);
}

.tone-danger {
  color: var(--danger);
  border-color: rgba(255, 123, 110, 0.24);
  background: rgba(255, 123, 110, 0.12);
}

.tone-info {
  color: var(--info);
  border-color: rgba(159, 220, 255, 0.24);
  background: rgba(159, 220, 255, 0.12);
}

.key-value-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wide-row {
  grid-column: 1 / -1;
}

dt {
  margin-bottom: 6px;
}

dd {
  margin: 0;
  line-height: 1.45;
}

.field-group {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

input,
button {
  font: inherit;
}

input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  padding: 12px 14px;
}

.command-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.action-button,
.ghost-button {
  border: 0;
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: transform 160ms ease, opacity 160ms ease, background 160ms ease;
}

.action-button {
  background: linear-gradient(180deg, #77d1f2, #2788aa);
  color: #081116;
  font-weight: 700;
}

.warn-button {
  background: linear-gradient(180deg, #ffd48c, #d9922c);
  color: #241200;
}

.ghost-button {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

button:hover:enabled {
  transform: translateY(-1px);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.command-explanations {
  margin-top: 18px;
  display: grid;
  gap: 10px;
}

.command-explanations p {
  margin: 0;
  line-height: 1.45;
}

.list-stack,
.history-list {
  gap: 12px;
}

.flow-card,
.history-item,
.descriptor-item {
  padding: 14px 16px;
}

.flow-card {
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
}

.flow-card:hover {
  transform: translateY(-1px);
}

.flow-card.selected {
  border-color: rgba(91, 192, 235, 0.34);
  background: rgba(91, 192, 235, 0.08);
}

.flow-card h3,
.history-item h3 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.flow-card p,
.history-item p {
  margin: 6px 0 0;
  line-height: 1.45;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.trend-chart {
  width: 100%;
  min-height: 240px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.descriptor-note {
  margin: 0 0 16px;
  line-height: 1.5;
}

.descriptor-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.descriptor-item strong {
  display: block;
  margin-bottom: 8px;
}

.banner {
  margin-top: 18px;
  padding: 14px 18px;
  border-radius: 18px;
  border: 1px solid transparent;
}

.banner-error {
  background: rgba(118, 29, 24, 0.28);
  border-color: rgba(255, 123, 110, 0.24);
  color: #ffd9d4;
}

.banner-info {
  background: rgba(91, 192, 235, 0.14);
  border-color: rgba(91, 192, 235, 0.24);
  color: #d9f4ff;
}

.hidden {
  display: none !important;
}

.empty-state {
  padding: 18px;
}

.reveal {
  animation: fade-up 420ms ease both;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1120px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid,
  .content-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .flow-shell {
    width: min(100% - 20px, 100%);
    padding-top: 20px;
  }

  .hero,
  .summary-grid,
  .content-grid,
  .key-value-grid,
  .command-grid,
  .descriptor-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 18px;
  }
}
)FLOW_CSS";

inline constexpr char kFlowJs[] = R"FLOW_JS(
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

  function normalizeStatus(response) {
    const payload = unwrapValue(response);
    return payload && payload.status ? payload.status : payload;
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

  function renderList(flows) {
    state.latestList = flows;
    chooseSelectedFlow(flows);

    if (!flows.length) {
      elements.flowList.className = "list-stack empty-state";
      elements.flowList.innerHTML = "No flowmeters registered.";
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
    renderList(flows);

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
)FLOW_JS";

inline constexpr char kRulesHtml[] = R"RULES_HTML(
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rules Status</title>
    <link rel="stylesheet" href="./rules.css" />
  </head>
  <body>
    <main class="rules-shell">
      <header class="hero panel reveal">
        <div>
          <p class="eyebrow">Embedded Rules Status</p>
          <h1>Read-only rule status</h1>
          <p class="hero-copy">
            Mechanics-first on-device view for checking rule status, summaries, validation issues and the latest
            evaluation trace without enabling rule editing on hardware.
          </p>
        </div>
        <div class="hero-meta">
          <div class="meta-chip">
            <span class="meta-label">Last refresh</span>
            <strong id="last-refresh">Waiting</strong>
          </div>
          <div class="meta-chip">
            <span class="meta-label">Transport code</span>
            <strong id="transport-code">RULES_UI_DATA_UNAVAILABLE</strong>
          </div>
        </div>
      </header>

      <section id="error-banner" class="banner banner-error hidden reveal" aria-live="polite"></section>
      <section id="message-banner" class="banner banner-info hidden reveal" aria-live="polite"></section>
      <section id="validation-banner" class="banner banner-warning hidden reveal" aria-live="polite"></section>

      <section class="command-bar panel reveal">
        <span class="status-pill subtle-pill">Stage 28 hardware page is read-only</span>
        <button id="refresh-button" class="ghost-button">Refresh</button>
      </section>

      <section class="layout-grid">
        <aside class="panel reveal list-panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Rules</p>
              <h2>Rule list</h2>
            </div>
            <span id="rule-count" class="status-pill subtle-pill">0 rules</span>
          </div>
          <div id="rule-list" class="card-list empty-state">No rules loaded.</div>
        </aside>

        <section class="detail-stack">
          <article class="panel reveal">
            <div class="section-head">
              <div>
                <p class="eyebrow">Status</p>
                <h2>Rule detail</h2>
              </div>
              <span id="detail-status" class="status-pill">inactive</span>
            </div>
            <div id="detail-summary" class="summary-strip empty-state">Select a rule to inspect its runtime status.</div>
          </article>

          <article class="panel reveal">
            <div class="section-head">
              <div>
                <p class="eyebrow">Metadata</p>
                <h2>Rule metadata</h2>
              </div>
            </div>
            <dl class="key-value-grid">
              <div>
                <dt>Rule ID</dt>
                <dd id="field-id">Waiting</dd>
              </div>
              <div>
                <dt>Rule name</dt>
                <dd id="field-name">Waiting</dd>
              </div>
              <div>
                <dt>Enabled</dt>
                <dd id="field-enabled">No</dd>
              </div>
              <div class="wide-row">
                <dt>Description</dt>
                <dd id="field-description">No description.</dd>
              </div>
            </dl>
          </article>

          <article class="panel reveal">
            <div class="section-head">
              <div>
                <p class="eyebrow">Summary</p>
                <h2>IF / THEN</h2>
              </div>
            </div>
            <div id="condition-builder" class="builder-stack empty-state">No rule summary yet.</div>
          </article>

          <article class="panel reveal">
            <div class="section-head">
              <div>
                <p class="eyebrow">Validation</p>
                <h2>Validation issues</h2>
              </div>
            </div>
            <div id="action-builder" class="builder-stack empty-state">No validation issues.</div>
          </article>

          <article class="panel reveal">
            <div class="section-head">
              <div>
                <p class="eyebrow">Trace</p>
                <h2>Current evaluation trace</h2>
              </div>
            </div>
            <div id="trace-list" class="trace-list empty-state">No current evaluation trace.</div>
          </article>
        </section>
      </section>
    </main>

    <script src="./rules.js"></script>
  </body>
</html>
)RULES_HTML";

inline constexpr char kRulesCss[] = R"RULES_CSS(
:root {
  --bg: #f2ede4;
  --bg-ink: #f8f4ec;
  --panel: rgba(251, 248, 241, 0.92);
  --panel-strong: rgba(255, 252, 247, 0.98);
  --line: rgba(74, 60, 44, 0.14);
  --line-strong: rgba(74, 60, 44, 0.22);
  --text: #241b13;
  --muted: #6d5e4f;
  --accent: #be5b2b;
  --accent-soft: rgba(190, 91, 43, 0.12);
  --ok: #2f7f56;
  --warn: #a66a00;
  --danger: #a53b2d;
  --danger-soft: rgba(165, 59, 45, 0.12);
  --shadow: 0 22px 50px rgba(56, 36, 20, 0.12);
  --radius: 22px;
  --radius-sm: 15px;
  --font-ui: "Aptos", "Segoe UI", "Trebuchet MS", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-ui);
  color: var(--text);
  background:
    radial-gradient(circle at top left, rgba(190, 91, 43, 0.14), transparent 28%),
    radial-gradient(circle at bottom right, rgba(47, 127, 86, 0.12), transparent 26%),
    linear-gradient(180deg, #f9f4ea 0%, #ede6da 52%, #efe8de 100%);
}

.rules-shell {
  width: min(1440px, calc(100% - 30px));
  margin: 0 auto;
  padding: 28px 0 42px;
}

.panel {
  background: linear-gradient(180deg, var(--panel-strong), var(--panel));
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 22px;
}

.hero,
.section-head,
.command-bar,
.stack-meta,
.field-inline {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero,
.section-head,
.command-bar {
  justify-content: space-between;
}

.hero {
  align-items: flex-start;
}

.hero h1,
.section-head h2,
.builder-card h3,
.trace-card h3,
.rule-card h3 {
  margin: 0;
}

.hero h1 {
  font-size: clamp(1.9rem, 3.5vw, 3.1rem);
}

.hero-copy,
.summary-subtle,
.empty-state,
.field-group span:last-child,
.trace-card p,
.builder-card p,
.rule-card p,
textarea,
input,
select {
  color: var(--muted);
}

.hero-copy {
  margin: 10px 0 0;
  max-width: 62ch;
  line-height: 1.55;
}

.hero-meta,
.layout-grid,
.detail-stack,
.form-grid,
.builder-stack,
.action-section,
.trace-list,
.card-list {
  display: grid;
  gap: 16px;
}

.hero-meta {
  min-width: 220px;
}

.meta-chip,
.rule-card,
.builder-card,
.trace-card,
.summary-strip,
.action-item {
  border-radius: var(--radius-sm);
  border: 1px solid rgba(74, 60, 44, 0.08);
  background: rgba(255, 255, 255, 0.55);
}

.meta-chip,
.summary-strip,
.trace-card,
.rule-card,
.builder-card,
.action-item {
  padding: 14px 16px;
}

.eyebrow,
.meta-label,
.field-group > span:first-child {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  color: var(--muted);
}

.banner {
  margin-top: 18px;
  border-radius: 18px;
  padding: 14px 18px;
  border: 1px solid transparent;
}

.banner-error {
  color: #6f2219;
  background: rgba(165, 59, 45, 0.12);
  border-color: rgba(165, 59, 45, 0.18);
}

.banner-info {
  color: #5c3a10;
  background: rgba(190, 91, 43, 0.1);
  border-color: rgba(190, 91, 43, 0.16);
}

.banner-warning {
  color: #6a4a00;
  background: rgba(214, 169, 56, 0.14);
  border-color: rgba(214, 169, 56, 0.2);
}

.hidden {
  display: none !important;
}

.command-bar {
  margin-top: 18px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.layout-grid {
  margin-top: 18px;
  grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
  align-items: start;
}

.list-panel {
  position: sticky;
  top: 16px;
}

.detail-stack {
  min-width: 0;
}

.status-pill,
.pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: rgba(255, 255, 255, 0.75);
  color: var(--accent);
  font-size: 0.92rem;
}

.subtle-pill {
  color: var(--muted);
}

.rule-card {
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
}

.rule-card:hover,
.rule-card.active-card {
  transform: translateY(-1px);
  border-color: rgba(190, 91, 43, 0.28);
  background: rgba(255, 248, 240, 0.95);
}

.rule-card p,
.builder-card p,
.trace-card p,
.summary-strip p {
  margin: 6px 0 0;
  line-height: 1.45;
}

.stack-meta {
  flex-wrap: wrap;
  margin-top: 10px;
}

.pill.status-active {
  color: var(--ok);
}

.pill.status-disabled {
  color: var(--muted);
}

.pill.status-error {
  color: var(--danger);
}

.pill.status-inactive {
  color: var(--warn);
}

.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-group {
  display: grid;
  gap: 8px;
}

.field-checkbox {
  align-content: end;
}

.field-checkbox input {
  width: auto;
}

.wide-field {
  grid-column: 1 / -1;
}

input,
select,
textarea,
button {
  font: inherit;
}

input,
select,
textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(74, 60, 44, 0.16);
  background: rgba(255, 255, 255, 0.86);
  padding: 12px 14px;
  color: var(--text);
}

textarea {
  resize: vertical;
}

.action-button,
.ghost-button,
.minor-button {
  border: 0;
  border-radius: 14px;
  padding: 12px 16px;
  cursor: pointer;
  transition: transform 150ms ease, opacity 150ms ease, background 150ms ease;
}

.action-button {
  background: linear-gradient(180deg, #d47441, #b35227);
  color: #fff8f2;
  font-weight: 700;
}

.ghost-button,
.minor-button {
  background: rgba(255, 255, 255, 0.7);
  color: var(--text);
  border: 1px solid rgba(74, 60, 44, 0.14);
}

.danger-ghost {
  color: var(--danger);
  border-color: rgba(165, 59, 45, 0.18);
}

button:hover:enabled {
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.builder-card {
  border-left: 5px solid rgba(190, 91, 43, 0.18);
}

.builder-card[data-depth="1"] {
  margin-left: 18px;
}

.builder-card[data-depth="2"] {
  margin-left: 36px;
}

.builder-card[data-depth="3"] {
  margin-left: 54px;
}

.builder-form,
.action-form {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.field-inline {
  flex-wrap: wrap;
  align-items: end;
}

.field-inline .field-group {
  flex: 1 1 180px;
}

.summary-strip strong {
  display: block;
  margin-bottom: 4px;
}

.trace-card {
  border-left: 5px solid rgba(47, 127, 86, 0.18);
}

.reveal {
  animation: fade-up 360ms ease both;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1080px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }

  .list-panel {
    position: static;
  }
}

@media (max-width: 760px) {
  .rules-shell {
    width: min(100% - 20px, 100%);
    padding-top: 20px;
  }

  .hero,
  .hero-meta,
  .form-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .hero {
    gap: 18px;
  }

  .wide-field {
    grid-column: auto;
  }

  .builder-card[data-depth="1"],
  .builder-card[data-depth="2"],
  .builder-card[data-depth="3"] {
    margin-left: 0;
  }
}
)RULES_CSS";

inline constexpr char kRulesJs[] = R"RULES_JS(
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
)RULES_JS";