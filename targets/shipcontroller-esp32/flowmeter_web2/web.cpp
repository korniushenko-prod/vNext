#include <Arduino.h>
#include <WebServer.h>
#include <WiFi.h>
#include <sys/time.h>
#include "web.h"
#include "app_state.h"
#include "sensor.h"
#include "flow.h"
#include "storage.h"
#include "logger.h"

static WebServer server(80);

static String htmlEscape(const String &s) {
  String out;
  for (size_t i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '&') out += "&amp;";
    else if (c == '<') out += "&lt;";
    else if (c == '>') out += "&gt;";
    else if (c == '"') out += "&quot;";
    else out += c;
  }
  return out;
}

static String nav() {
  return "<div class='nav'><a href='/'>Dashboard</a><a href='/sensor'>Sensor</a><a href='/calibration'>Calibration</a><a href='/fuel'>Fuel</a><a href='/logs'>Logs</a><a href='/wifi'>WiFi</a><a href='/service'>Service</a></div>";
}

static String shell(const String &title, const String &body, const String &extra = "") {
  String s;
  s.reserve(body.length() + extra.length() + 5000);

  s += "<!doctype html><html lang='ru'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>";
  s += "<title>" + title + "</title>";
  s += "<style>"
       "body{margin:0;font-family:Arial,sans-serif;background:#0b1220;color:#e8eef9}"
       ".wrap{max-width:1100px;margin:0 auto;padding:16px}"
       ".nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}"
       ".nav a{text-decoration:none;color:#dce7ff;background:#16213e;padding:10px 12px;border-radius:12px;border:1px solid #294377}"
       ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}"
       ".row{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}"
       ".card{background:linear-gradient(180deg,#111a30,#0d1528);border:1px solid #28406e;border-radius:18px;padding:16px}"
       ".kpi{font-size:34px;font-weight:700;line-height:1.1;margin-top:6px}"
       ".muted{color:#90a5c7;font-size:13px}"
       ".small{font-size:12px;color:#90a5c7}"
       "h1,h2,h3{margin:0 0 10px 0}"
       "table{width:100%;border-collapse:collapse}"
       "td,th{padding:8px;border-bottom:1px solid #22365f;text-align:left;font-size:14px}"
       "input,select,button{width:100%;box-sizing:border-box;padding:10px 12px;margin-top:8px;border-radius:12px;border:1px solid #2a4476;background:#0d1730;color:#e6edf7;font-size:15px}"
       "button{background:#2457d6;font-weight:700;cursor:pointer}"
       "button.alt{background:#163052}"
       "button.warn{background:#9b3b12}"
       "button.good{background:#137d56}"
       ".pill{display:inline-block;padding:4px 8px;border-radius:999px;background:#14335f;border:1px solid #265391;font-size:12px}"
       "</style>";
  s += "</head><body><div class='wrap'>";
  s += nav();
  s += body;
  s += "</div>";
  s += extra;          // <-- теперь скрипты идут после HTML
  s += "</body></html>";
  return s;
}

static String kpi(const String &t, const String &v, const String &sub = "") {
  return "<div class='card'><div class='muted'>" + t + "</div><div class='kpi'>" + v + "</div><div class='small'>" + sub + "</div></div>";
}

static void setUnixTime(uint32_t ts) {
  struct timeval tv;
  tv.tv_sec = ts;
  tv.tv_usec = 0;
  settimeofday(&tv, nullptr);
}

static String apiStatusJson() {
  String j = "{";
  j += "\"time\":\"" + formatLocalDateTime((uint32_t)time(nullptr)) + "\",";
  j += "\"total\":" + String(gTelem.totalLiters, 3) + ",";
  j += "\"daily\":" + String(gTelem.dailyLiters, 3) + ",";
  j += "\"lmin\":" + String(gTelem.lMin, 3) + ",";
  j += "\"l24\":" + String(gTelem.l24h, 3) + ",";
  j += "\"t24\":" + String(gTelem.t24h, 3) + ",";
  j += "\"pulses\":" + String(gTelem.pulseCount) + ",";
  j += "\"rejected24\":" + String(gTelem.rejected24h) + ",";
  j += "\"A\":" + String(gTelem.rawA) + ",";
  j += "\"B\":" + String(gTelem.rawB) + ",";
  j += "\"diff\":" + String(gTelem.diff, 3) + ",";
  j += "\"filtered\":" + String(gTelem.filtered, 3) + ",";
  j += "\"minDiff\":" + String(gTelem.minDiff, 3) + ",";
  j += "\"maxDiff\":" + String(gTelem.maxDiff, 3) + ",";
  j += "\"amplitude\":" + String(gTelem.amplitude, 3) + ",";
  j += "\"threshold\":" + String(gSettings.threshold, 3) + ",";
  j += "\"hysteresis\":" + String(gSettings.hysteresis, 3) + ",";
  j += "\"filterK\":" + String(gSettings.filterK, 3) + ",";
  j += "\"mode\":" + String((int)gSettings.mode) + ",";
  j += "\"quality\":\"" + String(signalQuality()) + "\",";
  j += "\"ip\":\"" + getDisplayIp() + "\",";
  j += "\"avgInterval\":" + String(gTelem.avgAcceptedIntervalMs, 1);
  j += "}";
  return j;
}

static void pageDashboard() {
  String body;
  body += "<h1>Расходомер топлива</h1><div class='small'>Hall A/B · IIR · AP+STA</div><br><div class='grid'>";

  body += "<div class='card'><div class='muted'>Total</div><div class='kpi' id='k_total'>" + String(gTelem.totalLiters, 1) + " L</div><div class='small'>Общий флоуметр</div></div>";
  body += "<div class='card'><div class='muted'>L/min</div><div class='kpi' id='k_lmin'>" + String(gTelem.lMin, 1) + "</div><div class='small'>Текущий расход</div></div>";
  body += "<div class='card'><div class='muted'>t/24h</div><div class='kpi' id='k_t24'>" + String(gTelem.t24h, 2) + "</div><div class='small'>Массовый расход за 24 часа</div></div>";
  body += "<div class='card'><div class='muted'>Daily</div><div class='kpi' id='k_daily'>" + String(gTelem.dailyLiters, 1) + " L</div><div class='small'>Суточный счётчик</div></div>";
  body += "<div class='card'><div class='muted'>IP</div><div class='kpi' id='k_ip'>" + getDisplayIp() + "</div><div class='small'>" + String(WiFi.status() == WL_CONNECTED ? "STA connected" : "AP priority") + "</div></div>";
  body += "<div class='card'><div class='muted'>Signal</div><div class='kpi' id='k_amp'>" + String(gTelem.amplitude, 1) + "</div><div class='small' id='k_quality'>" + String(signalQuality()) + "</div></div>";

  body += "</div><br><div class='row'><div class='card'><h2>Быстрые действия</h2><form action='/time_sync' method='post'><input type='hidden' name='ts' id='tsSync'><button class='good' type='submit'>Синхронизировать время с телефона</button></form><form action='/daily_reset' method='post'><button class='alt' type='submit'>Сбросить Daily</button></form></div>";

  body += "<div class='card'><h2>Live status</h2><table>";
  body += "<tr><td>Time</td><td id='st_time'>" + formatLocalDateTime((uint32_t)time(nullptr)) + "</td></tr>";
  body += "<tr><td>Pulses</td><td id='st_pulses'>" + String(gTelem.pulseCount) + "</td></tr>";
  body += "<tr><td>Errors 24h</td><td id='st_err'>" + String(gTelem.rejected24h) + "</td></tr>";
  body += "<tr><td>diff</td><td id='st_diff'>" + String(gTelem.filtered, 2) + "</td></tr>";
  body += "</table></div></div>";

  String extra =
    "<script>"
    "async function upd(){"
      "let r=await fetch('/api/status');"
      "let d=await r.json();"

      "document.getElementById('st_time').innerText=d.time;"
      "document.getElementById('st_pulses').innerText=d.pulses;"
      "document.getElementById('st_err').innerText=d.rejected24;"
      "document.getElementById('st_diff').innerText=Number(d.filtered).toFixed(2);"

      "document.getElementById('k_total').innerText=Number(d.total).toFixed(1)+' L';"
      "document.getElementById('k_lmin').innerText=Number(d.lmin).toFixed(1);"
      "document.getElementById('k_t24').innerText=Number(d.t24).toFixed(2);"
      "document.getElementById('k_daily').innerText=Number(d.daily).toFixed(1)+' L';"
      "document.getElementById('k_ip').innerText=d.ip;"
      "document.getElementById('k_amp').innerText=Number(d.amplitude).toFixed(1);"
      "document.getElementById('k_quality').innerText=d.quality;"
    "}"
    "setInterval(upd,1000);"
    "window.addEventListener('load',()=>{document.getElementById('tsSync').value=Math.floor(Date.now()/1000);upd();});"
    "</script>";

  server.send(200, "text/html; charset=utf-8", shell("Dashboard", body, extra));
}

static void pageSensor() {
  String body;

  body += "<h1>Настройка и калибровка датчика</h1>";

  body += "<div class='row'>";

  body += "<div class='card'>";
  body += "<h2>Живой график сигнала</h2>";
  body += "<canvas id='chart' width='900' height='260' style='width:100%;max-width:900px;height:260px;border:1px solid #28406e;border-radius:12px;background:#0b1220'></canvas>";
  body += "<div class='small'>Жёлтый = diff, голубой = filtered, красный = threshold</div>";
  body += "<div class='small' id='sensor_status'>Ожидание данных...</div>";
  body += "</div>";

  body += "<div class='card'>";
  body += "<h2>Живые значения</h2>";
  body += "<table>";
  body += "<tr><td>A</td><td id='lv_a'>0</td></tr>";
  body += "<tr><td>B</td><td id='lv_b'>0</td></tr>";
  body += "<tr><td>diff</td><td id='lv_diff'>0</td></tr>";
  body += "<tr><td>filtered</td><td id='lv_filtered'>0</td></tr>";
  body += "<tr><td>minDiff</td><td id='lv_min'>0</td></tr>";
  body += "<tr><td>maxDiff</td><td id='lv_max'>0</td></tr>";
  body += "<tr><td>amplitude</td><td id='lv_amp'>0</td></tr>";
  body += "<tr><td>threshold</td><td id='lv_thr'>0</td></tr>";
  body += "<tr><td>hysteresis</td><td id='lv_hys'>0</td></tr>";
  body += "<tr><td>quality</td><td id='lv_quality'>-</td></tr>";
  body += "<tr><td>pulses</td><td id='lv_pulses'>0</td></tr>";
  body += "<tr><td>avg interval</td><td id='lv_avg'>0</td></tr>";
  body += "</table>";
  body += "</div>";

  body += "</div>";

  body += "<div class='row'>";

  body += "<div class='card'>";
  body += "<h2>Настройки датчика</h2>";
  body += "<form action='/sensor_save' method='post'>";

  body += "<label>Режим</label><select name='mode'>";
  body += String("<option value='0'") + (gSettings.mode == MODE_MANUAL ? " selected" : "") + ">Manual</option>";
  body += String("<option value='1'") + (gSettings.mode == MODE_AUTO_ONCE ? " selected" : "") + ">Auto once</option>";
  body += String("<option value='2'") + (gSettings.mode == MODE_SLIDING_10S ? " selected" : "") + ">Sliding 10s</option>";
  body += "</select>";

  body += "<label>Threshold</label>";
  body += "<input name='threshold' type='number' step='any' value='" + String(gSettings.threshold, 2) + "'>";

  body += "<label>Hysteresis</label>";
  body += "<input name='hysteresis' type='number' step='any' value='" + String(gSettings.hysteresis, 2) + "'>";

  body += "<label>Filter K</label>";
  body += "<input name='filterK' type='number' min='0.05' max='0.8' step='any' value='" + String(gSettings.filterK, 2) + "'>";

  body += "<label>Pulse guard factor</label>";
  body += "<input name='guardFactor' type='number' min='0.05' max='0.8' step='any' value='" + String(gSettings.guardFactor, 2) + "'>";

  body += "<label>Hard min pulse, ms</label>";
  body += "<input name='minPulseMs' type='number' min='0' max='1000' step='any' value='" + String(gSettings.minPulseMs) + "'>";

  body += "<label>Pulse guard enabled</label><select name='pg'>";
  body += String("<option value='1'") + (gSettings.pulseGuardEnabled ? " selected" : "") + ">Yes</option>";
  body += String("<option value='0'") + (!gSettings.pulseGuardEnabled ? " selected" : "") + ">No</option>";
  body += "</select>";

  body += "<button type='submit'>Сохранить настройки</button>";
  body += "</form>";

  body += "<form action='/sensor_autocal' method='post'>";
  body += "<button class='good' type='submit'>Автокалибровка 5 секунд</button>";
  body += "</form>";

  body += "<form action='/sensor_reset_minmax' method='post'>";
  body += "<button class='alt' type='submit'>Сбросить min/max</button>";
  body += "</form>";

  body += "</div>";

  body += "<div class='card'>";
  body += "<h2>Как настроить датчик</h2>";
  body += "<b>1. Смотрите на amplitude.</b><br>";
  body += "Если amplitude меньше 20 — сигнал слабый. Нужно подвинуть датчик ближе к магниту или проверить магнит.<br><br>";

  body += "<b>2. Хороший сигнал.</b><br>";
  body += "Если amplitude больше 40 — уже можно стабильно считать. Если больше 80 — сигнал очень хороший.<br><br>";

  body += "<b>3. Threshold.</b><br>";
  body += "Threshold должен быть примерно посередине между minDiff и maxDiff. Например, если min=-100 и max=80, threshold хорошо поставить около -10.<br><br>";

  body += "<b>4. Hysteresis.</b><br>";
  body += "Обычно 10-20% от amplitude. Если появляются лишние импульсы — увеличьте hysteresis.<br><br>";

  body += "<b>5. Filter K.</b><br>";
  body += "Рекомендуемое значение 0.20-0.30. Меньше — сигнал плавнее, больше — быстрее реакция.<br><br>";

  body += "<b>6. Pulse guard.</b><br>";
  body += "Если появляются ложные импульсы, увеличьте guard factor. Обычно 0.15-0.25 достаточно.<br><br>";

  body += "<b>7. Автокалибровка.</b><br>";
  body += "Нажмите кнопку автокалибровки и прокрутите механизм 2-3 оборота. Система сама найдёт minDiff, maxDiff и выставит рабочий threshold.<br><br>";

  body += "<b>8. Что должно быть на графике.</b><br>";
  body += "Жёлтая и голубая линии должны ходить волной вверх и вниз. Красная линия threshold должна пересекаться сигналом уверенно, а не касаться его возле шума.";
  body += "</div>";

  body += "</div>";

  String extra = R"rawliteral(
<script>
window.addEventListener('DOMContentLoaded', () => {
  const MAX_POINTS = 300;
  const diffData = [];
  const filteredData = [];
  const thrData = [];

  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('sensor_status');

  function n(v) {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, w, h);

    const all = diffData.concat(filteredData, thrData);
    let minV = Infinity;
    let maxV = -Infinity;

    for (let i = 0; i < all.length; i++) {
      if (all[i] < minV) minV = all[i];
      if (all[i] > maxV) maxV = all[i];
    }

    if (!Number.isFinite(minV) || !Number.isFinite(maxV)) {
      minV = -100;
      maxV = 100;
    }

    if (Math.abs(maxV - minV) < 1) {
      maxV += 1;
      minV -= 1;
    }

    const pad = 20;
    const scaleY = (h - pad * 2) / (maxV - minV);

    function yOf(v) {
      return h - pad - (v - minV) * scaleY;
    }

    ctx.strokeStyle = '#22365f';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    function drawLine(arr, color) {
      if (arr.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      for (let i = 0; i < arr.length; i++) {
        const x = i * (w / MAX_POINTS);
        const y = yOf(arr[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    drawLine(diffData, '#ffd54a');
    drawLine(filteredData, '#58c6ff');
    drawLine(thrData, '#ff5a5a');

    ctx.fillStyle = '#8da2c6';
    ctx.font = '12px Arial';
    ctx.fillText('max: ' + maxV.toFixed(1), 8, 14);
    ctx.fillText('min: ' + minV.toFixed(1), 8, h - 6);
  }

  async function update() {
    try {
      const r = await fetch('/api/status', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();

      const A = n(d.A);
      const B = n(d.B);
      const diff = n(d.diff);
      const filtered = n(d.filtered);
      const minDiff = n(d.minDiff);
      const maxDiff = n(d.maxDiff);
      const amp = n(d.amplitude);
      const thr = n(d.threshold);
      const hys = n(d.hysteresis);
      const pulses = n(d.pulses);
      const avg = n(d.avgInterval);

      setText('lv_a', A);
      setText('lv_b', B);
      setText('lv_diff', diff.toFixed(2));
      setText('lv_filtered', filtered.toFixed(2));
      setText('lv_min', minDiff.toFixed(2));
      setText('lv_max', maxDiff.toFixed(2));
      setText('lv_amp', amp.toFixed(2));
      setText('lv_thr', thr.toFixed(2));
      setText('lv_hys', hys.toFixed(2));
      setText('lv_quality', d.quality || '-');
      setText('lv_pulses', pulses);
      setText('lv_avg', avg.toFixed(1) + ' ms');

      diffData.push(diff);
      filteredData.push(filtered);
      thrData.push(thr);

      if (diffData.length > MAX_POINTS) {
        diffData.shift();
        filteredData.shift();
        thrData.shift();
      }

      draw();
      statusEl.innerText = 'Live update OK';
    } catch (e) {
      statusEl.innerText = 'Update error: ' + e.message;
    }
  }

  setInterval(update, 100);
  update();
});
</script>
)rawliteral";

  server.send(200, "text/html; charset=utf-8", shell("Sensor", body, extra));
}

static void pageCalibration() {
  String body = "<h1>Calibration</h1><div class='row'><div class='card'><h2>Flowmeter calibration</h2><form action='/cal_save' method='post'><label>Liters per pulse</label><input name='lpp' type='number' step='0.000001' value='" + String(gSettings.litersPerPulse, 6) + "'><button type='submit'>Сохранить</button></form><form action='/cal_known' method='post'><label>Known liters</label><input name='knownL' type='number' step='0.001'><label>Pulses</label><input name='pulses' type='number' step='1'><button class='good' type='submit'>Рассчитать по известному объёму</button></form></div><div class='card'><h2>Current values</h2><table><tr><td>Liters/pulse</td><td>" + String(gSettings.litersPerPulse, 6) + "</td></tr><tr><td>Total liters</td><td>" + String(gTelem.totalLiters, 3) + "</td></tr><tr><td>Pulses</td><td>" + String(gTelem.pulseCount) + "</td></tr></table></div></div>";
  server.send(200, "text/html; charset=utf-8", shell("Calibration", body));
}

static void pageFuel() {
  String body = "<h1>Fuel</h1><div class='row'><div class='card'><h2>Presets</h2><form action='/fuel_save' method='post'><label>Active fuel</label><select name='activeFuel'>";
  body += String("<option value='0'") + (gSettings.activeFuel == FUEL_HEAVY ? " selected" : "") + ">Heavy fuel</option>";
  body += String("<option value='1'") + (gSettings.activeFuel == FUEL_DIESEL ? " selected" : "") + ">Diesel</option>";
  body += "</select><label>Heavy density @15C</label><input name='hf_rho' type='number' step='0.0001' value='" + String(gSettings.fuels[FUEL_HEAVY].rho15, 4) + "'><label>Heavy temp C</label><input name='hf_tmp' type='number' step='0.1' value='" + String(gSettings.fuels[FUEL_HEAVY].tempC, 1) + "'><label>Diesel density @15C</label><input name='ds_rho' type='number' step='0.0001' value='" + String(gSettings.fuels[FUEL_DIESEL].rho15, 4) + "'><label>Diesel temp C</label><input name='ds_tmp' type='number' step='0.1' value='" + String(gSettings.fuels[FUEL_DIESEL].tempC, 1) + "'><button type='submit'>Сохранить</button></form></div><div class='card'><h2>Calculated</h2><table><tr><td>Active</td><td>" + String(gSettings.fuels[gSettings.activeFuel].name) + "</td></tr><tr><td>rho15</td><td>" + String(gSettings.fuels[gSettings.activeFuel].rho15, 4) + "</td></tr><tr><td>Temp</td><td>" + String(gSettings.fuels[gSettings.activeFuel].tempC, 1) + "</td></tr><tr><td>rhoT</td><td>" + String(gTelem.rhoT, 4) + "</td></tr><tr><td>t/24h</td><td>" + String(gTelem.t24h, 2) + "</td></tr></table></div></div>";
  server.send(200, "text/html; charset=utf-8", shell("Fuel", body));
}

static void pageLogs() {
  String body = "<h1>Logs & Time</h1><div class='row'><div class='card'><h2>Time</h2><form action='/time_save' method='post'><label>UTC offset hours</label><input name='utc' type='number' min='-12' max='14' value='" + String(gSettings.utcOffsetHours) + "'><label>Start of day HH:MM</label><input name='dayStart' type='text' value='" + String(gSettings.dayStartMin / 60 < 10 ? "0" : "") + String(gSettings.dayStartMin / 60) + ":" + String(gSettings.dayStartMin % 60 < 10 ? "0" : "") + String(gSettings.dayStartMin % 60) + "'><button type='submit'>Сохранить</button></form><form action='/time_sync' method='post'><input type='hidden' name='ts' id='tsNow'><button class='good' type='submit'>Sync from phone</button></form></div><div class='card'><h2>In-memory log</h2><a class='pill' href='/logs.csv'>Download CSV</a><br><br><table><tr><th>Time</th><th>Total</th><th>L/min</th><th>t/24h</th></tr>";
  size_t start = (gLogCount < LOG_CAPACITY) ? 0 : gLogHead;
  for (size_t i = 0; i < gLogCount && i < 20; i++) {
    size_t idx = (start + gLogCount - 1 - i + LOG_CAPACITY) % LOG_CAPACITY;
    const LogRecord &r = gLogs[idx];
    body += "<tr><td>" + formatLocalDateTime(r.unixTs) + "</td><td>" + String(r.totalLiters, 1) + "</td><td>" + String(r.lMin, 1) + "</td><td>" + String(r.t24h, 2) + "</td></tr>";
  }
  body += "</table></div></div>";
  String extra = "<script>window.addEventListener('load',()=>{document.getElementById('tsNow').value=Math.floor(Date.now()/1000);});</script>";
  server.send(200, "text/html; charset=utf-8", shell("Logs", body, extra));
}

static void pageWifi() {
  String body = "<h1>WiFi</h1><div class='row'><div class='card'><h2>AP + STA</h2><form action='/wifi_save' method='post'><label>STA enabled</label><select name='sta_en'>";
  body += String("<option value='1'") + (gSettings.staEnabled ? " selected" : "") + ">Yes</option>";
  body += String("<option value='0'") + (!gSettings.staEnabled ? " selected" : "") + ">No</option>";
  body += "</select><label>STA SSID</label><input name='sta_ssid' type='text' value='" + htmlEscape(gSettings.staSsid) + "'><label>STA Password</label><input name='sta_pass' type='text' value='" + htmlEscape(gSettings.staPass) + "'><button type='submit'>Сохранить и переподключить</button></form></div><div class='card'><h2>Status</h2><table><tr><td>AP SSID</td><td>FlowMeter</td></tr><tr><td>AP IP</td><td>" + WiFi.softAPIP().toString() + "</td></tr><tr><td>STA status</td><td>" + String(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED") + "</td></tr><tr><td>STA IP</td><td>" + WiFi.localIP().toString() + "</td></tr></table></div></div>";
  server.send(200, "text/html; charset=utf-8", shell("WiFi", body));
}

static void pageService() {
  String body = "<h1>Service</h1><div class='row'><div class='card'><h2>Serial debug</h2><form action='/service_save' method='post'><label>Serial mode</label><select name='serialMode'>";
  body += String("<option value='0'") + (gSettings.serialMode == DEBUG_OFF ? " selected" : "") + ">OFF</option>";
  body += String("<option value='1'") + (gSettings.serialMode == DEBUG_BASIC ? " selected" : "") + ">Basic</option>";
  body += String("<option value='2'") + (gSettings.serialMode == DEBUG_VERBOSE ? " selected" : "") + ">Verbose</option>";
  body += "</select><button type='submit'>Сохранить</button></form><form action='/save_now' method='post'><button class='good' type='submit'>Save now</button></form><form action='/reboot' method='post'><button class='alt' type='submit'>Reboot</button></form><form action='/reset_total' method='post' onsubmit='return confirm(\"Reset total?\")'><button class='warn' type='submit'>Reset total</button></form><form action='/factory_reset' method='post' onsubmit='return confirm(\"Factory reset?\")'><button class='warn' type='submit'>Factory reset</button></form></div><div class='card'><h2>Info</h2><table><tr><td>Heap</td><td>" + String(ESP.getFreeHeap()) + "</td></tr><tr><td>Sketch</td><td>" + String(ESP.getSketchSize()) + "</td></tr><tr><td>IP</td><td>" + getDisplayIp() + "</td></tr></table></div></div>";
  server.send(200, "text/html; charset=utf-8", shell("Service", body));
}

static void redirect(const char *path) {
  server.sendHeader("Location", path);
  server.send(303);
}

void webInit() {
  server.on("/", pageDashboard);
  server.on("/sensor", pageSensor);
  server.on("/calibration", pageCalibration);
  server.on("/fuel", pageFuel);
  server.on("/logs", pageLogs);
  server.on("/wifi", pageWifi);
  server.on("/service", pageService);
  server.on("/api/status", [](){ server.send(200, "application/json", apiStatusJson()); });
  server.on("/logs.csv", [](){ server.send(200, "text/csv", loggerCsv()); });

  server.on("/time_sync", HTTP_POST, [](){ if (server.hasArg("ts")) setUnixTime((uint32_t)server.arg("ts").toInt()); redirect("/logs"); });
  server.on("/time_save", HTTP_POST, [](){ if (server.hasArg("utc")) gSettings.utcOffsetHours = (int8_t)server.arg("utc").toInt(); if (server.hasArg("dayStart")) { String s = server.arg("dayStart"); int sep = s.indexOf(':'); if (sep > 0) { int hh = s.substring(0, sep).toInt(); int mm = s.substring(sep + 1).toInt(); if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) gSettings.dayStartMin = hh * 60 + mm; } } gTelem.dirty = true; saveAllSettings(); redirect("/logs"); });
  server.on("/sensor_save", HTTP_POST, [](){ gSettings.mode = (ThresholdMode)server.arg("mode").toInt(); gSettings.threshold = server.arg("threshold").toFloat(); gSettings.hysteresis = server.arg("hysteresis").toFloat(); gSettings.filterK = server.arg("filterK").toFloat(); gSettings.guardFactor = server.arg("guardFactor").toFloat(); gSettings.minPulseMs = (uint32_t)server.arg("minPulseMs").toInt(); gSettings.pulseGuardEnabled = server.arg("pg") == "1"; gTelem.dirty = true; saveAllSettings(); redirect("/sensor"); });
  server.on("/sensor_autocal", HTTP_POST, [](){ sensorStartAutoCalibration(); redirect("/sensor"); });
  server.on("/sensor_reset_minmax", HTTP_POST, [](){ sensorResetMinMax(); redirect("/sensor"); });
  server.on("/cal_save", HTTP_POST, [](){ gSettings.litersPerPulse = server.arg("lpp").toFloat(); gTelem.dirty = true; saveAllSettings(); redirect("/calibration"); });
  server.on("/cal_known", HTTP_POST, [](){ float knownL = server.arg("knownL").toFloat(); float pulses = server.arg("pulses").toFloat(); if (knownL > 0 && pulses > 0) gSettings.litersPerPulse = knownL / pulses; gTelem.dirty = true; saveAllSettings(); redirect("/calibration"); });
  server.on("/fuel_save", HTTP_POST, [](){ gSettings.activeFuel = (uint8_t)server.arg("activeFuel").toInt(); gSettings.fuels[FUEL_HEAVY].rho15 = server.arg("hf_rho").toFloat(); gSettings.fuels[FUEL_HEAVY].tempC = server.arg("hf_tmp").toFloat(); gSettings.fuels[FUEL_DIESEL].rho15 = server.arg("ds_rho").toFloat(); gSettings.fuels[FUEL_DIESEL].tempC = server.arg("ds_tmp").toFloat(); gTelem.dirty = true; saveAllSettings(); redirect("/fuel"); });
  server.on("/wifi_save", HTTP_POST, [](){ gSettings.staEnabled = server.arg("sta_en") == "1"; gSettings.staSsid = server.arg("sta_ssid"); gSettings.staPass = server.arg("sta_pass"); gTelem.dirty = true; saveAllSettings(); redirect("/wifi"); });
  server.on("/service_save", HTTP_POST, [](){ gSettings.serialMode = (DebugMode)server.arg("serialMode").toInt(); gTelem.dirty = true; saveAllSettings(); redirect("/service"); });
  server.on("/daily_reset", HTTP_POST, [](){ flowResetDaily(); saveCounters(); redirect("/"); });
  server.on("/save_now", HTTP_POST, [](){ saveAllSettings(); redirect("/service"); });
  server.on("/reboot", HTTP_POST, [](){ server.send(200, "text/plain", "Rebooting..."); delay(250); ESP.restart(); });
  server.on("/reset_total", HTTP_POST, [](){ gTelem.pulseCount = 0; gTelem.dailyPulseCount = 0; gTelem.rejectedTotal = 0; saveCounters(); redirect("/service"); gTelem.totalLiters = 0;saveTotalCounter();});
  server.on("/factory_reset", HTTP_POST, [](){ factoryResetSettings(); server.send(200, "text/plain", "Factory reset complete. Rebooting..."); delay(300); ESP.restart(); });

  server.begin();
}

void webLoop() { server.handleClient(); }
