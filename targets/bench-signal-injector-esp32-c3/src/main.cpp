#include <Arduino.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>

namespace {

constexpr const char* kApSsid = "BenchInjector-C3";
constexpr const char* kApPassword = "bench1234";
constexpr const char* kPrefsNamespace = "benchcfg";

constexpr uint8_t kCommandSensePin = 3;
constexpr uint8_t kRunFeedbackPin = 4;
constexpr uint8_t kFaultFeedbackPin = 5;
constexpr uint8_t kPulseOutputPin = 6;
constexpr uint8_t kPressurePwmPin = 7;
constexpr uint8_t kBuiltinLedPin = 8;

constexpr uint8_t kPressurePwmChannel = 0;
constexpr uint16_t kPressurePwmFrequencyHz = 2000;
constexpr uint8_t kPressurePwmResolutionBits = 12;
constexpr uint16_t kPressurePwmMaxDuty = (1u << kPressurePwmResolutionBits) - 1u;

struct BenchState {
  bool runFeedback = false;
  bool faultFeedback = false;
  bool pulseEnabled = false;
  uint8_t pressurePercent = 0;
  float pulseHz = 2.0f;
};

Preferences preferences;
WebServer server(80);
BenchState state;
bool pulseLevel = false;
unsigned long lastPulseToggleUs = 0;
unsigned long bootMs = 0;

String boolToString(bool value) {
  return value ? "true" : "false";
}

bool parseBooleanArg(const String& value) {
  return value == "1" || value == "true" || value == "on" || value == "yes";
}

float clampPulseHz(float hz) {
  if (hz < 0.1f) {
    return 0.1f;
  }

  if (hz > 500.0f) {
    return 500.0f;
  }

  return hz;
}

uint8_t clampPercent(int value) {
  if (value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return static_cast<uint8_t>(value);
}

String uptimeString() {
  unsigned long totalSeconds = (millis() - bootMs) / 1000UL;
  unsigned long hours = totalSeconds / 3600UL;
  unsigned long minutes = (totalSeconds % 3600UL) / 60UL;
  unsigned long seconds = totalSeconds % 60UL;
  char buffer[24];
  snprintf(buffer, sizeof(buffer), "%02lu:%02lu:%02lu", hours, minutes, seconds);
  return String(buffer);
}

void saveState() {
  preferences.putBool("run", state.runFeedback);
  preferences.putBool("fault", state.faultFeedback);
  preferences.putBool("pulse_en", state.pulseEnabled);
  preferences.putUChar("pressure", state.pressurePercent);
  preferences.putFloat("pulse_hz", state.pulseHz);
}

void loadState() {
  state.runFeedback = preferences.getBool("run", false);
  state.faultFeedback = preferences.getBool("fault", false);
  state.pulseEnabled = preferences.getBool("pulse_en", false);
  state.pressurePercent = preferences.getUChar("pressure", 0);
  state.pulseHz = clampPulseHz(preferences.getFloat("pulse_hz", 2.0f));
}

void applyPressureOutput() {
  const uint32_t duty = map(state.pressurePercent, 0, 100, 0, kPressurePwmMaxDuty);
  ledcWrite(kPressurePwmChannel, duty);
}

void applyDiscreteOutputs() {
  digitalWrite(kRunFeedbackPin, state.runFeedback ? HIGH : LOW);
  digitalWrite(kFaultFeedbackPin, state.faultFeedback ? HIGH : LOW);
  digitalWrite(kBuiltinLedPin, (state.runFeedback || state.faultFeedback || state.pulseEnabled) ? HIGH : LOW);
}

void applyOutputs() {
  applyDiscreteOutputs();
  applyPressureOutput();
}

void setPreset(const String& presetName) {
  if (presetName == "idle") {
    state.runFeedback = false;
    state.faultFeedback = false;
    state.pulseEnabled = false;
    state.pressurePercent = 0;
    state.pulseHz = 2.0f;
  } else if (presetName == "running") {
    state.runFeedback = true;
    state.faultFeedback = false;
    state.pulseEnabled = true;
    state.pressurePercent = 65;
    state.pulseHz = 12.0f;
  } else if (presetName == "faulted") {
    state.runFeedback = false;
    state.faultFeedback = true;
    state.pulseEnabled = false;
    state.pressurePercent = 8;
    state.pulseHz = 2.0f;
  } else if (presetName == "low_pressure") {
    state.runFeedback = true;
    state.faultFeedback = false;
    state.pulseEnabled = true;
    state.pressurePercent = 18;
    state.pulseHz = 10.0f;
  } else if (presetName == "pulse_only") {
    state.runFeedback = false;
    state.faultFeedback = false;
    state.pulseEnabled = true;
    state.pressurePercent = 0;
    state.pulseHz = 25.0f;
  }

  saveState();
  applyOutputs();
}

String buildStateJson() {
  String json;
  json.reserve(512);
  json += "{";
  json += "\"ssid\":\"";
  json += kApSsid;
  json += "\",";
  json += "\"ip\":\"";
  json += WiFi.softAPIP().toString();
  json += "\",";
  json += "\"uptime\":\"";
  json += uptimeString();
  json += "\",";
  json += "\"run_feedback\":";
  json += boolToString(state.runFeedback);
  json += ",";
  json += "\"fault_feedback\":";
  json += boolToString(state.faultFeedback);
  json += ",";
  json += "\"pulse_enabled\":";
  json += boolToString(state.pulseEnabled);
  json += ",";
  json += "\"pulse_hz\":";
  json += String(state.pulseHz, 1);
  json += ",";
  json += "\"pulse_level\":";
  json += boolToString(pulseLevel);
  json += ",";
  json += "\"pressure_percent\":";
  json += String(state.pressurePercent);
  json += ",";
  json += "\"command_sense\":";
  json += boolToString(digitalRead(kCommandSensePin) == HIGH);
  json += ",";
  json += "\"pins\":{";
  json += "\"command_sense\":";
  json += String(kCommandSensePin);
  json += ",";
  json += "\"run_feedback\":";
  json += String(kRunFeedbackPin);
  json += ",";
  json += "\"fault_feedback\":";
  json += String(kFaultFeedbackPin);
  json += ",";
  json += "\"pulse_output\":";
  json += String(kPulseOutputPin);
  json += ",";
  json += "\"pressure_pwm\":";
  json += String(kPressurePwmPin);
  json += "}";
  json += "}";
  return json;
}

String buildIndexHtml() {
  String html = R"HTML(
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bench Injector C3</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7f2;
      --panel: #ffffff;
      --ink: #1c2b22;
      --muted: #5d7065;
      --accent: #256f4f;
      --accent-2: #d6eadf;
      --warn: #8d4b12;
      --danger: #8e2f2f;
      --line: #d4ddd7;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #eef4ef 0%, var(--bg) 100%);
      color: var(--ink);
    }
    main {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }
    .hero {
      margin-bottom: 20px;
      padding: 20px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: linear-gradient(135deg, #ffffff 0%, #edf6f0 100%);
    }
    .hero h1 {
      margin: 0 0 8px;
      font-size: 1.8rem;
    }
    .hero p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--panel);
      padding: 18px;
      box-shadow: 0 8px 24px rgba(28, 43, 34, 0.06);
    }
    .card h2 {
      margin: 0 0 12px;
      font-size: 1.05rem;
    }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .status-item {
      padding: 10px 12px;
      border-radius: 12px;
      background: #f3f7f4;
      border: 1px solid #e0e9e3;
    }
    .status-item b {
      display: block;
      margin-bottom: 4px;
      font-size: 0.82rem;
      color: var(--muted);
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--accent-2);
      color: var(--accent);
      font-weight: 600;
    }
    .actions, .field-stack {
      display: grid;
      gap: 10px;
    }
    .actions {
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }
    button {
      border: 0;
      border-radius: 12px;
      padding: 11px 14px;
      font: inherit;
      cursor: pointer;
      background: #e8efea;
      color: var(--ink);
    }
    button.primary {
      background: var(--accent);
      color: #fff;
    }
    button.warn {
      background: #f3e0cc;
      color: var(--warn);
    }
    button.danger {
      background: #f4d9d9;
      color: var(--danger);
    }
    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 0.94rem;
    }
    input[type="number"], input[type="range"] {
      width: 100%;
    }
    .toggle-row {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 12px;
      background: #f5f8f6;
      border: 1px solid #e0e9e3;
    }
    .note {
      margin-top: 12px;
      padding: 12px;
      border-radius: 12px;
      background: #f8fbf9;
      border: 1px dashed #c8d8cf;
      color: var(--muted);
      line-height: 1.45;
    }
    code {
      font-family: Consolas, monospace;
      font-size: 0.9em;
    }
    @media (max-width: 640px) {
      .status-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="pill">PR-35A bench helper</div>
      <h1>ESP32-C3 Bench Signal Injector</h1>
      <p>
        This helper firmware generates bench-safe feedback and pressure stimuli for the
        frozen LilyGO pilot bundle. Use it as a signal injector, not as a second logic controller.
      </p>
    </section>

    <section class="grid">
      <article class="card">
        <h2>Bench State</h2>
        <div class="status-grid">
          <div class="status-item"><b>AP</b><span id="ssid">-</span></div>
          <div class="status-item"><b>IP</b><span id="ip">-</span></div>
          <div class="status-item"><b>Uptime</b><span id="uptime">-</span></div>
          <div class="status-item"><b>Command Sense</b><span id="commandSense">-</span></div>
          <div class="status-item"><b>Run Feedback</b><span id="runState">-</span></div>
          <div class="status-item"><b>Fault Feedback</b><span id="faultState">-</span></div>
          <div class="status-item"><b>Pulse Output</b><span id="pulseState">-</span></div>
          <div class="status-item"><b>Pressure PWM</b><span id="pressureState">-</span></div>
        </div>
      </article>

      <article class="card">
        <h2>Quick Presets</h2>
        <div class="actions">
          <button onclick="applyPreset('idle')">Idle</button>
          <button class="primary" onclick="applyPreset('running')">Running</button>
          <button class="warn" onclick="applyPreset('low_pressure')">Low Pressure</button>
          <button class="danger" onclick="applyPreset('faulted')">Faulted</button>
          <button onclick="applyPreset('pulse_only')">Pulse Only</button>
        </div>
        <div class="note">
          <b>Preset intent</b><br>
          <code>running</code> gives run feedback + pulse + mid pressure.<br>
          <code>faulted</code> forces a bounded fault lane.<br>
          <code>low_pressure</code> keeps run feedback on while dropping pressure.
        </div>
      </article>

      <article class="card">
        <h2>Discrete Feedback</h2>
        <div class="field-stack">
          <label class="toggle-row">
            <span>Run feedback GPIO4</span>
            <input id="runFeedback" type="checkbox">
          </label>
          <label class="toggle-row">
            <span>Fault feedback GPIO5</span>
            <input id="faultFeedback" type="checkbox">
          </label>
          <button class="primary" onclick="saveDiscrete()">Apply discrete outputs</button>
        </div>
      </article>

      <article class="card">
        <h2>Pulse Output</h2>
        <div class="field-stack">
          <label class="toggle-row">
            <span>Enable pulse output GPIO6</span>
            <input id="pulseEnabled" type="checkbox">
          </label>
          <label>
            Pulse frequency (Hz)
            <input id="pulseHz" type="number" min="0.1" max="500" step="0.1" value="2.0">
          </label>
          <button class="primary" onclick="savePulse()">Apply pulse settings</button>
        </div>
      </article>

      <article class="card">
        <h2>Pressure PWM</h2>
        <div class="field-stack">
          <label>
            Pressure percentage GPIO7
            <input id="pressurePercent" type="range" min="0" max="100" value="0" oninput="pressureValue.textContent = this.value + '%'">
          </label>
          <div class="pill" id="pressureValue">0%</div>
          <button class="primary" onclick="savePressure()">Apply pressure output</button>
        </div>
        <div class="note">
          Use GPIO7 through a simple RC filter if you want the LilyGO analog input to see a smooth voltage.
          A small first-pass bench filter like <code>1kΩ + 10uF</code> is enough for slow pressure visibility checks.
        </div>
      </article>

      <article class="card">
        <h2>Pin Map</h2>
        <div class="status-grid">
          <div class="status-item"><b>GPIO3</b><span>Optional command sense from LilyGO DO</span></div>
          <div class="status-item"><b>GPIO4</b><span>Run feedback out</span></div>
          <div class="status-item"><b>GPIO5</b><span>Fault feedback out</span></div>
          <div class="status-item"><b>GPIO6</b><span>Pulse output out</span></div>
          <div class="status-item"><b>GPIO7</b><span>Pressure PWM out</span></div>
          <div class="status-item"><b>GPIO8</b><span>Built-in LED activity mirror</span></div>
        </div>
        <div class="note">
          Keep a shared <code>GND</code> between the LilyGO target and this C3 injector.
          Do not wire USB pins <code>GPIO20/GPIO21</code>.
        </div>
      </article>
    </section>
  </main>

  <script>
    const runFeedback = document.getElementById('runFeedback');
    const faultFeedback = document.getElementById('faultFeedback');
    const pulseEnabled = document.getElementById('pulseEnabled');
    const pulseHz = document.getElementById('pulseHz');
    const pressurePercent = document.getElementById('pressurePercent');
    const pressureValue = document.getElementById('pressureValue');
    const formState = {
      discreteDirty: false,
      pulseDirty: false,
      pressureDirty: false
    };

    function markDiscreteDirty() {
      formState.discreteDirty = true;
    }

    function markPulseDirty() {
      formState.pulseDirty = true;
    }

    function markPressureDirty() {
      formState.pressureDirty = true;
    }

    async function postForm(url, payload) {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams(payload)
      });
      await refreshState();
    }

    async function refreshState() {
      const response = await fetch('/api/state');
      const state = await response.json();

      document.getElementById('ssid').textContent = state.ssid;
      document.getElementById('ip').textContent = state.ip;
      document.getElementById('uptime').textContent = state.uptime;
      document.getElementById('commandSense').textContent = state.command_sense ? 'HIGH' : 'LOW';
      document.getElementById('runState').textContent = state.run_feedback ? 'ON' : 'OFF';
      document.getElementById('faultState').textContent = state.fault_feedback ? 'ON' : 'OFF';
      document.getElementById('pulseState').textContent = state.pulse_enabled ? ('ON @ ' + state.pulse_hz + ' Hz') : 'OFF';
      document.getElementById('pressureState').textContent = state.pressure_percent + '%';

      if (!formState.discreteDirty) {
        runFeedback.checked = state.run_feedback;
        faultFeedback.checked = state.fault_feedback;
      }

      if (!formState.pulseDirty) {
        pulseEnabled.checked = state.pulse_enabled;
        pulseHz.value = state.pulse_hz;
      }

      if (!formState.pressureDirty) {
        pressurePercent.value = state.pressure_percent;
        pressureValue.textContent = state.pressure_percent + '%';
      }
    }

    async function saveDiscrete() {
      formState.discreteDirty = false;
      await postForm('/api/discrete', {
        run_feedback: runFeedback.checked ? '1' : '0',
        fault_feedback: faultFeedback.checked ? '1' : '0'
      });
    }

    async function savePulse() {
      formState.pulseDirty = false;
      await postForm('/api/pulse', {
        pulse_enabled: pulseEnabled.checked ? '1' : '0',
        pulse_hz: pulseHz.value
      });
    }

    async function savePressure() {
      formState.pressureDirty = false;
      await postForm('/api/pressure', {
        pressure_percent: pressurePercent.value
      });
    }

    async function applyPreset(name) {
      formState.discreteDirty = false;
      formState.pulseDirty = false;
      formState.pressureDirty = false;
      await postForm('/api/preset', { name });
    }

    runFeedback.addEventListener('change', markDiscreteDirty);
    faultFeedback.addEventListener('change', markDiscreteDirty);
    pulseEnabled.addEventListener('change', markPulseDirty);
    pulseHz.addEventListener('input', markPulseDirty);
    pressurePercent.addEventListener('input', markPressureDirty);

    refreshState();
    setInterval(refreshState, 2000);
  </script>
</body>
</html>
)HTML";
  return html;
}

void handleRoot() {
  server.send(200, "text/html; charset=utf-8", buildIndexHtml());
}

void handleState() {
  server.send(200, "application/json", buildStateJson());
}

void handleDiscrete() {
  if (server.hasArg("run_feedback")) {
    state.runFeedback = parseBooleanArg(server.arg("run_feedback"));
  }

  if (server.hasArg("fault_feedback")) {
    state.faultFeedback = parseBooleanArg(server.arg("fault_feedback"));
  }

  saveState();
  applyOutputs();
  server.send(200, "application/json", buildStateJson());
}

void handlePulse() {
  if (server.hasArg("pulse_enabled")) {
    state.pulseEnabled = parseBooleanArg(server.arg("pulse_enabled"));
  }

  if (server.hasArg("pulse_hz")) {
    state.pulseHz = clampPulseHz(server.arg("pulse_hz").toFloat());
  }

  saveState();
  server.send(200, "application/json", buildStateJson());
}

void handlePressure() {
  if (server.hasArg("pressure_percent")) {
    state.pressurePercent = clampPercent(server.arg("pressure_percent").toInt());
  }

  saveState();
  applyOutputs();
  server.send(200, "application/json", buildStateJson());
}

void handlePreset() {
  const String name = server.arg("name");
  setPreset(name);
  server.send(200, "application/json", buildStateJson());
}

void handleNotFound() {
  server.send(404, "text/plain", "Not found");
}

void updatePulseOutput() {
  if (!state.pulseEnabled) {
    pulseLevel = false;
    digitalWrite(kPulseOutputPin, LOW);
    return;
  }

  const unsigned long halfPeriodUs = static_cast<unsigned long>(500000.0f / state.pulseHz);
  const unsigned long nowUs = micros();
  if (nowUs - lastPulseToggleUs >= halfPeriodUs) {
    lastPulseToggleUs = nowUs;
    pulseLevel = !pulseLevel;
    digitalWrite(kPulseOutputPin, pulseLevel ? HIGH : LOW);
  }
}

void startAccessPoint() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(kApSsid, kApPassword);
}

void registerRoutes() {
  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/state", HTTP_GET, handleState);
  server.on("/api/discrete", HTTP_POST, handleDiscrete);
  server.on("/api/pulse", HTTP_POST, handlePulse);
  server.on("/api/pressure", HTTP_POST, handlePressure);
  server.on("/api/preset", HTTP_POST, handlePreset);
  server.onNotFound(handleNotFound);
}

}  // namespace

void setup() {
  bootMs = millis();

  Serial.begin(115200);
  delay(100);

  pinMode(kCommandSensePin, INPUT_PULLDOWN);
  pinMode(kRunFeedbackPin, OUTPUT);
  pinMode(kFaultFeedbackPin, OUTPUT);
  pinMode(kPulseOutputPin, OUTPUT);
  pinMode(kBuiltinLedPin, OUTPUT);

  ledcSetup(kPressurePwmChannel, kPressurePwmFrequencyHz, kPressurePwmResolutionBits);
  ledcAttachPin(kPressurePwmPin, kPressurePwmChannel);

  preferences.begin(kPrefsNamespace, false);
  loadState();

  digitalWrite(kPulseOutputPin, LOW);
  applyOutputs();

  startAccessPoint();
  registerRoutes();
  server.begin();

  Serial.println();
  Serial.println("Bench signal injector ready.");
  Serial.print("SSID: ");
  Serial.println(kApSsid);
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());
}

void loop() {
  server.handleClient();
  updatePulseOutput();
}
