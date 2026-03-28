#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <LittleFS.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>
#include <sys/time.h>
#include <math.h>

// ============================================================
// LilyGO T3 v1.6.1 Flowmeter firmware
// Reed switch on GPIO25
// OLED SSD1306 128x64
// Wi‑Fi AP web UI
// ============================================================

// -------------------- Pins --------------------
static const int REED_PIN = 25;
static const int OLED_SDA = 21;
static const int OLED_SCL = 22;
static const int OLED_RST = -1;
static const uint8_t OLED_ADDR = 0x3C;

// -------------------- OLED --------------------
static const int SCREEN_WIDTH = 128;
static const int SCREEN_HEIGHT = 64;
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RST);

// -------------------- Wi‑Fi --------------------
const char* AP_SSID = "FlowMeter";
const char* AP_PASS = "12345678";
WebServer server(80);
Preferences prefs;

// -------------------- Config --------------------
struct Config {
  float litersPerPulse = 0.03f;       // default based on your note
  float rho15 = 0.9000f;
  float tempC = 40.0f;
  int8_t utcOffsetHours = 0;
  uint32_t debounceUs = 8000;
  uint32_t avgWindowSec = 600;        // 10 min
  uint16_t dayStartMin = 0;           // 00:00
  uint16_t sum1Min = 0;               // 00:00
  uint16_t sum2Min = 720;             // 12:00
  bool loggingEnabled = true;
  bool autoSyncOnPageOpen = true;
  uint8_t oledRotateSec = 4;
};
Config cfg;

// -------------------- Fuel presets --------------------
struct FuelPreset {
  bool used;
  char name[20];
  float rho15;
};
static const int MAX_PRESETS = 10;
FuelPreset presets[MAX_PRESETS];

// -------------------- Pulse counters --------------------
volatile uint32_t pulseCount = 0;
volatile uint32_t rejectedTotal = 0;
volatile uint32_t lastPulseUs = 0;
volatile uint32_t lastPulseIntervalUs = 0;
volatile uint16_t acceptedInSecondISR = 0;

// IMPORTANT:
// Total is derived from pulseCount so it never drifts away from pulses.
// Daily is stored as pulse count too.
uint32_t dailyPulseCount = 0;
uint32_t lastSavedPulseCount = 0;
uint32_t lastSavedDailyPulseCount = 0;
uint32_t lastSavedRejectedTotal = 0;

// Errors rolling 24h: one bucket per minute
uint16_t errPerMinute[1440];
uint16_t errMinuteIndex = 0;
uint16_t errCurrentMinute = 0;
uint32_t err24h = 0;

// Flow windows: one bucket per second
static const int FLOW_RING_SEC = 3600;
uint16_t pulsePerSec[FLOW_RING_SEC];
uint32_t secondIndex = 0;
uint32_t currentEpochSecond = 0;
uint32_t instant10sPulses = 0;
uint32_t avgWindowPulses = 0;

// Runtime
uint32_t lastOledMs = 0;
uint32_t lastScreenMs = 0;
uint8_t oledScreen = 0;
uint32_t lastSaveMs = 0;
uint16_t lastProcessedMinuteOfDay = 65535;
uint16_t lastSummaryMinute = 65535;
uint32_t bootMs = 0;

// -------------------- Helpers --------------------
String htmlEscape(const String& s) {
  String out;
  out.reserve(s.length() + 8);
  for (size_t i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '&') out += F("&amp;");
    else if (c == '<') out += F("&lt;");
    else if (c == '>') out += F("&gt;");
    else if (c == '"') out += F("&quot;");
    else if (c == '\'') out += F("&#39;");
    else out += c;
  }
  return out;
}

uint32_t getPulseCountSafe() {
  noInterrupts();
  uint32_t v = pulseCount;
  interrupts();
  return v;
}

uint32_t getRejectedTotalSafe() {
  noInterrupts();
  uint32_t v = rejectedTotal;
  interrupts();
  return v;
}

uint32_t getLastPulseIntervalUsSafe() {
  noInterrupts();
  uint32_t v = lastPulseIntervalUs;
  interrupts();
  return v;
}

float pulsesToLiters(uint32_t p) {
  return ((float)p) * cfg.litersPerPulse;
}

float totalLiters() {
  return pulsesToLiters(getPulseCountSafe());
}

float dailyLiters() {
  return pulsesToLiters(dailyPulseCount);
}

String hmFromMinutes(uint16_t m) {
  char buf[6];
  snprintf(buf, sizeof(buf), "%02u:%02u", m / 60, m % 60);
  return String(buf);
}

uint16_t parseHM(const String& s, uint16_t fallback) {
  int sep = s.indexOf(':');
  if (sep < 0) return fallback;
  int hh = s.substring(0, sep).toInt();
  int mm = s.substring(sep + 1).toInt();
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return fallback;
  return (uint16_t)(hh * 60 + mm);
}

String uptimeString() {
  uint32_t sec = (millis() - bootMs) / 1000UL;
  uint32_t d = sec / 86400UL; sec %= 86400UL;
  uint32_t h = sec / 3600UL; sec %= 3600UL;
  uint32_t m = sec / 60UL; sec %= 60UL;
  char buf[32];
  snprintf(buf, sizeof(buf), "%lu d %02lu:%02lu:%02lu", (unsigned long)d, (unsigned long)h, (unsigned long)m, (unsigned long)sec);
  return String(buf);
}

float densityAtTemp(float rho15, float tempC) {
  if (rho15 <= 0.0f) return 0.0f;
  if (fabs(tempC - 15.0f) < 0.0001f) return rho15;

  double rho1000 = round((rho15 / 2.0) * 1000.0) * 2.0;
  double dT = tempC - 15.0;
  double r = rho15;

  if (rho15 >= 0.839) {
    double a = 186.9696 / (rho1000 * rho1000) + (0.4862 / rho1000);
    a = round(a * 100000000.0) / 100000000.0;
    r = -0.0011 + rho15 * exp((-a) * dT * (1.0 + 0.8 * a * dT));
  } else if (rho15 >= 0.788) {
    double a = 594.5418 / pow(rho15 * 1000.0, 2.0);
    r = -0.0011 + exp((-dT) * a * (1.0 + 0.8 * dT * a));
  } else if (rho15 >= 0.7705) {
    double a = -0.00336312 + 2680.3206 / pow(rho15 * 1000.0, 2.0);
    r = -0.0011 + exp((-a) * dT * (1.0 + 0.8 * dT * a));
  } else if (rho15 >= 0.653) {
    double a = (346.4228 + 438.8 * rho15) / pow(rho15 * 1000.0, 2.0);
    r = -0.0011 + exp((-dT) * a * (1.0 + 0.8 * dT * a));
  }

  r = round(r * 10000.0) / 10000.0;
  if (r < 0.0) r = 0.0;
  return (float)r;
}

float rhoT() {
  return densityAtTemp(cfg.rho15, cfg.tempC);
}

time_t getUtcNow() {
  time_t now = time(nullptr);
  if (now < 100000) {
    return 1704067200 + millis() / 1000UL; // fallback base time
  }
  return now;
}

time_t getLocalNow() {
  return getUtcNow() + (cfg.utcOffsetHours * 3600L);
}

String fmtDateTime(time_t t) {
  struct tm ti;
  gmtime_r(&t, &ti);
  char buf[24];
  snprintf(buf, sizeof(buf), "%04d-%02d-%02d %02d:%02d:%02d",
           ti.tm_year + 1900, ti.tm_mon + 1, ti.tm_mday,
           ti.tm_hour, ti.tm_min, ti.tm_sec);
  return String(buf);
}

String fmtHM(time_t t) {
  struct tm ti;
  gmtime_r(&t, &ti);
  char buf[6];
  snprintf(buf, sizeof(buf), "%02d:%02d", ti.tm_hour, ti.tm_min);
  return String(buf);
}

uint16_t minuteOfDay(time_t t) {
  struct tm ti;
  gmtime_r(&t, &ti);
  return (uint16_t)(ti.tm_hour * 60 + ti.tm_min);
}

void setUnixTime(uint32_t ts) {
  struct timeval tv;
  tv.tv_sec = ts;
  tv.tv_usec = 0;
  settimeofday(&tv, nullptr);
}

// -------------------- ISR --------------------
void IRAM_ATTR reedISR() {
  uint32_t nowUs = micros();
  uint32_t delta = nowUs - lastPulseUs;
  lastPulseIntervalUs = delta;

  if (lastPulseUs != 0 && delta < cfg.debounceUs) {
    rejectedTotal++;
    errCurrentMinute++;
    return;
  }

  lastPulseUs = nowUs;
  pulseCount++;
  dailyPulseCount++;
  acceptedInSecondISR++;
}

// -------------------- Persistence --------------------
void saveConfig() {
  prefs.putFloat("lpp", cfg.litersPerPulse);
  prefs.putFloat("rho15", cfg.rho15);
  prefs.putFloat("tempC", cfg.tempC);
  prefs.putChar("utcOff", cfg.utcOffsetHours);
  prefs.putUInt("debUs", cfg.debounceUs);
  prefs.putUInt("avgSec", cfg.avgWindowSec);
  prefs.putUShort("daySt", cfg.dayStartMin);
  prefs.putUShort("sum1", cfg.sum1Min);
  prefs.putUShort("sum2", cfg.sum2Min);
  prefs.putBool("logEn", cfg.loggingEnabled);
  prefs.putBool("autoSy", cfg.autoSyncOnPageOpen);
  prefs.putUChar("oledRt", cfg.oledRotateSec);
}

void loadConfig() {
  cfg.litersPerPulse = prefs.getFloat("lpp", cfg.litersPerPulse);
  cfg.rho15 = prefs.getFloat("rho15", cfg.rho15);
  cfg.tempC = prefs.getFloat("tempC", cfg.tempC);
  cfg.utcOffsetHours = prefs.getChar("utcOff", cfg.utcOffsetHours);
  cfg.debounceUs = prefs.getUInt("debUs", cfg.debounceUs);
  cfg.avgWindowSec = prefs.getUInt("avgSec", cfg.avgWindowSec);
  cfg.dayStartMin = prefs.getUShort("daySt", cfg.dayStartMin);
  cfg.sum1Min = prefs.getUShort("sum1", cfg.sum1Min);
  cfg.sum2Min = prefs.getUShort("sum2", cfg.sum2Min);
  cfg.loggingEnabled = prefs.getBool("logEn", cfg.loggingEnabled);
  cfg.autoSyncOnPageOpen = prefs.getBool("autoSy", cfg.autoSyncOnPageOpen);
  cfg.oledRotateSec = prefs.getUChar("oledRt", cfg.oledRotateSec);

  if (cfg.debounceUs < 1000) cfg.debounceUs = 1000;
  if (cfg.debounceUs > 50000) cfg.debounceUs = 50000;
  if (cfg.avgWindowSec < 60) cfg.avgWindowSec = 60;
  if (cfg.avgWindowSec > FLOW_RING_SEC) cfg.avgWindowSec = FLOW_RING_SEC;
  if (cfg.oledRotateSec < 2) cfg.oledRotateSec = 2;
  if (cfg.oledRotateSec > 20) cfg.oledRotateSec = 20;
  if (cfg.utcOffsetHours < -12) cfg.utcOffsetHours = -12;
  if (cfg.utcOffsetHours > 14) cfg.utcOffsetHours = 14;
}

void saveCounters() {
  uint32_t p = getPulseCountSafe();
  uint32_t r = getRejectedTotalSafe();
  prefs.putUInt("pulses", p);
  prefs.putUInt("dayPul", dailyPulseCount);
  prefs.putUInt("rejTot", r);
  lastSavedPulseCount = p;
  lastSavedDailyPulseCount = dailyPulseCount;
  lastSavedRejectedTotal = r;
}

void loadCounters() {
  noInterrupts();
  pulseCount = prefs.getUInt("pulses", 0);
  rejectedTotal = prefs.getUInt("rejTot", 0);
  interrupts();
  dailyPulseCount = prefs.getUInt("dayPul", 0);
  lastSavedPulseCount = pulseCount;
  lastSavedDailyPulseCount = dailyPulseCount;
  lastSavedRejectedTotal = rejectedTotal;
}

void savePresets() {
  for (int i = 0; i < MAX_PRESETS; i++) {
    String base = "pr" + String(i);
    prefs.putBool((base + "u").c_str(), presets[i].used);
    prefs.putBytes((base + "n").c_str(), presets[i].name, sizeof(presets[i].name));
    prefs.putFloat((base + "r").c_str(), presets[i].rho15);
  }
}

void loadPresets() {
  for (int i = 0; i < MAX_PRESETS; i++) {
    memset(presets[i].name, 0, sizeof(presets[i].name));
    String base = "pr" + String(i);
    presets[i].used = prefs.getBool((base + "u").c_str(), false);
    prefs.getBytes((base + "n").c_str(), presets[i].name, sizeof(presets[i].name));
    presets[i].rho15 = prefs.getFloat((base + "r").c_str(), 0.9000f);
  }

  bool any = false;
  for (int i = 0; i < MAX_PRESETS; i++) {
    if (presets[i].used) any = true;
  }
  if (!any) {
    presets[0].used = true; strncpy(presets[0].name, "HFO", sizeof(presets[0].name) - 1); presets[0].rho15 = 0.9910f;
    presets[1].used = true; strncpy(presets[1].name, "MGO", sizeof(presets[1].name) - 1); presets[1].rho15 = 0.8450f;
    savePresets();
  }
}

// -------------------- Logs --------------------
void ensureLogFiles() {
  if (!LittleFS.exists("/log6.csv")) {
    File f = LittleFS.open("/log6.csv", "w");
    f.println("datetime,total_liters,daily_liters,pulses,err24h,err6m,lmin,l24h,t24h,avg_lmin,avg_l24h,avg_t24h,rho15,tempC,rhoT,utc_offset");
    f.close();
  }
  if (!LittleFS.exists("/summary12.csv")) {
    File f = LittleFS.open("/summary12.csv", "w");
    f.println("datetime,total_liters,daily_liters,avg_lh,avg_l24h,avg_t24h,rho15,tempC,rhoT,utc_offset");
    f.close();
  }
  if (!LittleFS.exists("/events.csv")) {
    File f = LittleFS.open("/events.csv", "w");
    f.println("datetime,event,details");
    f.close();
  }
}

void appendEvent(const String& ev, const String& details) {
  File f = LittleFS.open("/events.csv", "a");
  if (!f) return;
  f.printf("%s,%s,%s", fmtDateTime(getLocalNow()).c_str(), ev.c_str(), details.c_str());
  f.close();
}

float instantLMin() {
  return pulsesToLiters(instant10sPulses) * 6.0f;
}

float instantL24h() {
  return instantLMin() * 60.0f * 24.0f;
}

float instantT24h() {
  return (instantL24h() / 1000.0f) * rhoT();
}

float avgLMin() {
  return pulsesToLiters(avgWindowPulses) * (60.0f / (float)cfg.avgWindowSec);
}

float avgL24h() {
  return avgLMin() * 60.0f * 24.0f;
}

float avgT24h() {
  return (avgL24h() / 1000.0f) * rhoT();
}

void append6mLog(uint32_t err6m) {
  File f = LittleFS.open("/log6.csv", "a");
  if (!f) return;
  f.printf("%s,%.3f,%.3f,%lu,%lu,%lu,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.4f,%.1f,%.4f,%d",
           fmtDateTime(getLocalNow()).c_str(),
           totalLiters(),
           dailyLiters(),
           (unsigned long)getPulseCountSafe(),
           (unsigned long)err24h,
           (unsigned long)err6m,
           instantLMin(),
           instantL24h(),
           instantT24h(),
           avgLMin(),
           avgL24h(),
           avgT24h(),
           cfg.rho15,
           cfg.tempC,
           rhoT(),
           cfg.utcOffsetHours);
  f.close();
}

void append12hSummary() {
  File f = LittleFS.open("/summary12.csv", "a");
  if (!f) return;
  f.printf("%s,%.3f,%.3f,%.3f,%.3f,%.3f,%.4f,%.1f,%.4f,%d",
           fmtDateTime(getLocalNow()).c_str(),
           totalLiters(),
           dailyLiters(),
           avgLMin() * 60.0f,
           avgL24h(),
           avgT24h(),
           cfg.rho15,
           cfg.tempC,
           rhoT(),
           cfg.utcOffsetHours);
  f.close();
}

// -------------------- Runtime processing --------------------
void rotateSecondBuckets(uint32_t nowEpoch) {
  if (currentEpochSecond == 0) currentEpochSecond = nowEpoch;

  while (currentEpochSecond < nowEpoch) {
    noInterrupts();
    uint16_t add = acceptedInSecondISR;
    acceptedInSecondISR = 0;
    interrupts();

    currentEpochSecond++;
    secondIndex = (secondIndex + 1) % FLOW_RING_SEC;
    pulsePerSec[secondIndex] = add;
  }
}

void rebuildFlowWindows() {
  instant10sPulses = 0;
  avgWindowPulses = 0;

  for (uint32_t i = 0; i < 10; i++) {
    int idx = (int)(secondIndex + FLOW_RING_SEC - i) % FLOW_RING_SEC;
    instant10sPulses += pulsePerSec[idx];
  }

  uint32_t win = cfg.avgWindowSec;
  if (win > FLOW_RING_SEC) win = FLOW_RING_SEC;
  for (uint32_t i = 0; i < win; i++) {
    int idx = (int)(secondIndex + FLOW_RING_SEC - i) % FLOW_RING_SEC;
    avgWindowPulses += pulsePerSec[idx];
  }
}

void processMinuteTasks() {
  time_t localNow = getLocalNow();
  uint16_t mod = minuteOfDay(localNow);
  if (mod == lastProcessedMinuteOfDay) return;
  lastProcessedMinuteOfDay = mod;

  // Roll error history
  err24h -= errPerMinute[errMinuteIndex];
  errPerMinute[errMinuteIndex] = errCurrentMinute;
  err24h += errPerMinute[errMinuteIndex];
  errCurrentMinute = 0;
  errMinuteIndex = (errMinuteIndex + 1) % 1440;

  // Daily reset
  if (mod == cfg.dayStartMin) {
    dailyPulseCount = 0;
    appendEvent("daily_reset", "Daily counter reset");
    saveCounters();
  }

  // 12h summaries
  if ((mod == cfg.sum1Min || mod == cfg.sum2Min) && mod != lastSummaryMinute) {
    append12hSummary();
    appendEvent("summary12", "12 hour summary written");
    lastSummaryMinute = mod;
  }

  // 6-min logs
  if (cfg.loggingEnabled && (mod % 6 == 0)) {
    static uint32_t prevErr24ForLog = 0;
    uint32_t err6m = (err24h >= prevErr24ForLog) ? (err24h - prevErr24ForLog) : err24h;
    prevErr24ForLog = err24h;
    append6mLog(err6m);
  }
}

// -------------------- OLED --------------------
void drawTotalTop() {
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print((uint32_t)round(totalLiters()));
}

void drawScreen1() {
  drawTotalTop();
  display.setTextSize(1);
  display.setCursor(0, 36);
  display.print(fmtHM(getLocalNow()));
  display.setCursor(64, 36);
  display.print(F("E24:"));
  display.print(err24h);
  display.setCursor(0, 52);
  display.print(F("P:"));
  display.print(getPulseCountSafe());
}

void drawScreen2() {
  drawTotalTop();
  display.setTextSize(1);
  display.setCursor(0, 28);
  display.print(F("L/m : "));
  display.print(instantLMin(), 1);
  display.setCursor(0, 40);
  display.print(F("L/24:"));
  display.print((uint32_t)round(instantL24h()));
  display.setCursor(0, 52);
  display.print(F("t/24:"));
  display.print(instantT24h(), 2);
}

void updateOLED() {
  display.clearDisplay();
  if (oledScreen == 0) drawScreen1();
  else drawScreen2();
  display.display();
}

// -------------------- Web --------------------
String kpiCard(const String& title, const String& value, const String& sub) {
  String s;
  s.reserve(300);
  s += F("<div class='card'><div class='muted'>");
  s += title;
  s += F("</div><div class='kpi'>");
  s += value;
  s += F("</div><div class='small'>");
  s += sub;
  s += F("</div></div>");
  return s;
}

String pageShell(const String& title, const String& body, const String& extraHead = "") {
  String html;
  html.reserve(body.length() + 5000);
  html += F("<!doctype html><html lang='ru'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>");
  html += F("<title>"); html += title; html += F("</title>");
  html += F("<style>"
            "body{margin:0;font-family:Arial,sans-serif;background:#0b1220;color:#e6edf7;}"
            ".wrap{max-width:980px;margin:0 auto;padding:18px;}"
            ".nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;}"
            ".nav a{color:#dbe8ff;text-decoration:none;background:#14213d;padding:10px 12px;border-radius:12px;border:1px solid #263a66;}"
            ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;}"
            ".row{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;}"
            ".card{background:linear-gradient(180deg,#111b31,#0e172b);border:1px solid #263a66;border-radius:18px;padding:16px;}"
            ".kpi{font-size:32px;font-weight:700;line-height:1.1;margin-top:6px;}"
            ".muted{color:#90a5c7;font-size:13px;}"
            ".small{font-size:12px;color:#8da2c6;}"
            "h1,h2,h3{margin:0 0 10px 0;}"
            "table{width:100%;border-collapse:collapse;}td,th{padding:8px;border-bottom:1px solid #22365f;text-align:left;font-size:14px;}"
            "input,select,button{width:100%;box-sizing:border-box;padding:11px 12px;margin-top:8px;border-radius:12px;border:1px solid #2a4476;background:#0d1730;color:#e6edf7;font-size:15px;}"
            "button{background:#2457d6;font-weight:700;cursor:pointer;}"
            "button.alt{background:#163052;} button.warn{background:#9b3b12;} button.good{background:#137d56;}"
            ".pill{display:inline-block;padding:5px 10px;border-radius:999px;background:#14335f;border:1px solid #265391;font-size:12px;color:#dbe8ff;text-decoration:none;}"
            "</style>");
  html += extraHead;
  html += F("</head><body><div class='wrap'><div class='nav'>"
            "<a href='/'>Dashboard</a><a href='/fuel'>Топливо</a><a href='/calibration'>Калибровка</a><a href='/sensor'>Датчик</a><a href='/logs'>Логи / Время</a><a href='/admin'>Сервис</a>"
            "</div>");
  html += body;
  html += F("</div></body></html>");
  return html;
}

String dashboardPage() {
  String body;
  body += F("<h1>Расходомер топлива</h1><div class='small'>LilyGO T3 · GPIO25 · локальная страница</div><br><div class='grid'>");
  body += kpiCard("Total", String(totalLiters(), 1) + " L", "Общий накопленный объём");
  body += kpiCard("Daily", String(dailyLiters(), 1) + " L", "Суточный счётчик");
  body += kpiCard("Pulses", String(getPulseCountSafe()), "Валидные импульсы");
  body += kpiCard("Errors 24h", String(err24h), "Отброшенные импульсы за 24 часа");
  body += kpiCard("L/min", String(instantLMin(), 1), "Мгновенный расход");
  body += kpiCard("L/24h", String(instantL24h(), 0), "Пересчёт из мгновенного расхода");
  body += kpiCard("t/24h", String(instantT24h(), 2), "Массовый расход");
  body += kpiCard("Avg L/min", String(avgLMin(), 2), "Окно " + String(cfg.avgWindowSec) + " сек");
  body += kpiCard("Avg t/24h", String(avgT24h(), 2), "Усреднённый расход");
  body += kpiCard("Время", fmtDateTime(getLocalNow()), "UTC offset: " + String(cfg.utcOffsetHours));
  body += kpiCard("rho15", String(cfg.rho15, 4) + " t/m³", "Плотность при 15°C");
  body += kpiCard("Temp / rhoT", String(cfg.tempC, 1) + "°C / " + String(rhoT(), 4), "Текущая плотность");
  body += F("</div><br><div class='row'>");

  body += F("<div class='card'><h2>Быстрые действия</h2>");
  body += F("<form action='/sync_time' method='post'><input type='hidden' name='ts' id='tsFast'><button class='good' type='submit'>Синхронизировать время с телефона</button></form>");
  body += F("<form action='/reset_daily' method='post' onsubmit='return confirm(\"Сбросить daily?\")'><button class='alt' type='submit'>Сбросить Daily</button></form>");
  body += F("<form action='/toggle_logging' method='post'><button type='submit'>");
  body += (cfg.loggingEnabled ? F("Остановить логирование") : F("Запустить логирование"));
  body += F("</button></form></div>");

  body += F("<div class='card'><h2>Статус</h2><table>");
  body += F("<tr><td>Логирование</td><td>"); body += (cfg.loggingEnabled ? F("Включено") : F("Выключено")); body += F("</td></tr>");
  body += F("<tr><td>Debounce</td><td>"); body += String(cfg.debounceUs); body += F(" µs</td></tr>");
  body += F("<tr><td>Last pulse interval</td><td>"); body += String(getLastPulseIntervalUsSafe()); body += F(" µs</td></tr>");
  body += F("<tr><td>Wi‑Fi</td><td>"); body += AP_SSID; body += F(" / "); body += WiFi.softAPIP().toString(); body += F("</td></tr>");
  body += F("<tr><td>Heap</td><td>"); body += String(ESP.getFreeHeap()); body += F(" bytes</td></tr>");
  body += F("</table></div></div>");

  String extra;
  extra += F("<script>window.addEventListener('load',()=>{const e=document.getElementById('tsFast'); if(e) e.value=Math.floor(Date.now()/1000);});</script>");
  if (cfg.autoSyncOnPageOpen) {
    extra += F("<script>fetch('/api/sync?ts='+Math.floor(Date.now()/1000)).catch(()=>{});</script>");
  }
  return pageShell("Dashboard", body, extra);
}

String fuelPage() {
  String body;
  body += F("<h1>Топливо и плотность</h1><div class='row'>");
  body += F("<div class='card'><h2>Текущие значения</h2><form action='/save_fuel' method='post'>"
            "<label>Density @ 15°C, t/m³</label>");
  body += "<input name='rho15' type='number' step='0.0001' min='0.65' max='1.10' value='" + String(cfg.rho15, 4) + "'>";
  body += F("<label>Temperature, °C</label>");
  body += "<input name='tempC' type='number' step='0.1' min='-20' max='200' value='" + String(cfg.tempC, 1) + "'>";
  body += F("<button type='submit'>Сохранить текущие значения</button></form><br><span class='pill'>rhoT = ");
  body += String(rhoT(), 4);
  body += F(" t/m³</span></div>");

  body += F("<div class='card'><h2>Пресеты топлива</h2>");
  for (int i = 0; i < MAX_PRESETS; i++) {
    if (!presets[i].used) continue;
    body += F("<div style='padding:12px;border:1px solid #263a66;border-radius:14px;margin-bottom:10px;'>");
    body += F("<div style='font-weight:700'>"); body += htmlEscape(String(presets[i].name)); body += F("</div>");
    body += F("<div class='small'>rho15 = "); body += String(presets[i].rho15, 4); body += F(" t/m³</div>");
    body += F("<div class='row' style='margin-top:8px;'>");
    body += F("<form action='/preset_load' method='post'><input type='hidden' name='idx' value='"); body += String(i); body += F("'><button class='good' type='submit'>Load</button></form>");
    body += F("<form action='/preset_delete' method='post' onsubmit='return confirm(\"Удалить пресет?\")'><input type='hidden' name='idx' value='"); body += String(i); body += F("'><button class='warn' type='submit'>Delete</button></form>");
    body += F("</div><form action='/preset_save' method='post'>");
    body += F("<input type='hidden' name='idx' value='"); body += String(i); body += F("'>");
    body += F("<input name='name' type='text' value='"); body += htmlEscape(String(presets[i].name)); body += F("' placeholder='Название'>");
    body += F("<input name='rho15' type='number' step='0.0001' min='0.65' max='1.10' value='"); body += String(presets[i].rho15, 4); body += F("'>");
    body += F("<button class='alt' type='submit'>Обновить</button></form></div>");
  }
  body += F("<h3>Добавить новый пресет</h3><form action='/preset_add' method='post'>"
            "<input name='name' type='text' placeholder='Например LSFO'>"
            "<input name='rho15' type='number' step='0.0001' min='0.65' max='1.10' value='0.9000'>"
            "<button type='submit'>Добавить</button></form></div></div>");
  return pageShell("Fuel", body);
}

String calibrationPage() {
  String body;
  body += F("<h1>Калибровка</h1><div class='row'>");
  body += F("<div class='card'><h2>Ручная калибровка</h2><form action='/save_cal' method='post'>"
            "<label>Liters per pulse</label>");
  body += "<input name='lpp' type='number' step='0.000001' min='0.000001' value='" + String(cfg.litersPerPulse, 6) + "'>";
  body += F("<button type='submit'>Сохранить коэффициент</button></form></div>");

  body += F("<div class='card'><h2>Калибровка по известному объёму</h2><form action='/calibrate_known' method='post'>"
            "<label>Фактический объём, литры</label><input name='knownL' type='number' step='0.001' min='0.001'>"
            "<label>Количество импульсов</label><input name='pulses' type='number' step='1' min='1'>"
            "<button class='good' type='submit'>Рассчитать и сохранить</button></form></div></div><br>");

  body += F("<div class='card'><h2>Текущее состояние</h2><table>");
  body += F("<tr><td>Коэффициент</td><td>"); body += String(cfg.litersPerPulse, 6); body += F(" L/pulse</td></tr>");
  body += F("<tr><td>Валидные импульсы</td><td>"); body += String(getPulseCountSafe()); body += F("</td></tr>");
  body += F("<tr><td>Total</td><td>"); body += String(totalLiters(), 3); body += F(" L</td></tr>");
  body += F("</table></div>");
  return pageShell("Calibration", body);
}

String sensorPage() {
  String body;
  body += F("<h1>Датчик</h1><div class='row'>");
  body += F("<div class='card'><h2>Настройки</h2><form action='/save_sensor' method='post'>"
            "<label>Debounce, микросекунды</label>");
  body += "<input name='debounceUs' type='number' step='100' min='1000' max='50000' value='" + String(cfg.debounceUs) + "'>";
  body += F("<button type='submit'>Сохранить</button></form></div>");

  body += F("<div class='card'><h2>Диагностика</h2><table>");
  body += F("<tr><td>Valid pulses</td><td>"); body += String(getPulseCountSafe()); body += F("</td></tr>");
  body += F("<tr><td>Rejected total</td><td>"); body += String(getRejectedTotalSafe()); body += F("</td></tr>");
  body += F("<tr><td>Rejected 24h</td><td>"); body += String(err24h); body += F("</td></tr>");
  body += F("<tr><td>Last pulse interval</td><td>"); body += String(getLastPulseIntervalUsSafe()); body += F(" us</td></tr>");
  body += F("<tr><td>Pin</td><td>GPIO25</td></tr>");
  body += F("</table></div></div>");
  return pageShell("Sensor", body);
}

String logsPage() {
  String body;
  body += F("<h1>Логи и время</h1><div class='row'>");
  body += F("<div class='card'><h2>Время</h2><form action='/sync_time' method='post'><input type='hidden' name='ts' id='tsSync'><button class='good' type='submit'>Синхронизировать с телефона</button></form>");
  body += F("<form action='/set_time_manual' method='post'>"
            "<label>Unix time</label><input name='ts' type='number' step='1' min='1'>"
            "<label>UTC offset, hours</label>");
  body += "<input name='utcOffset' type='number' step='1' min='-12' max='14' value='" + String(cfg.utcOffsetHours) + "'>";
  body += F("<label>Start of day (HH:MM)</label>");
  body += "<input name='dayStart' type='text' value='" + hmFromMinutes(cfg.dayStartMin) + "'>";
  body += F("<label>Summary 1 (HH:MM)</label>");
  body += "<input name='sum1' type='text' value='" + hmFromMinutes(cfg.sum1Min) + "'>";
  body += F("<label>Summary 2 (HH:MM)</label>");
  body += "<input name='sum2' type='text' value='" + hmFromMinutes(cfg.sum2Min) + "'>";
  body += F("<button type='submit'>Сохранить</button></form></div>");

  body += F("<div class='card'><h2>Логирование</h2><form action='/save_logging' method='post'>"
            "<label>Среднее окно, сек</label>");
  body += "<input name='avgWindowSec' type='number' step='1' min='60' max='3600' value='" + String(cfg.avgWindowSec) + "'>";
  body += F("<label>Автосинхронизация при открытии</label><select name='autoSync'>");
  body += (cfg.autoSyncOnPageOpen ? F("<option value='1' selected>Да</option><option value='0'>Нет</option>") : F("<option value='1'>Да</option><option value='0' selected>Нет</option>"));
  body += F("</select><label>Логирование</label><select name='loggingEnabled'>");
  body += (cfg.loggingEnabled ? F("<option value='1' selected>Включено</option><option value='0'>Выключено</option>") : F("<option value='1'>Включено</option><option value='0' selected>Выключено</option>"));
  body += F("</select><label>Переключение OLED, сек</label>");
  body += "<input name='oledRotateSec' type='number' min='2' max='20' value='" + String(cfg.oledRotateSec) + "'>";
  body += F("<button type='submit'>Сохранить</button></form></div></div><br><div class='row'>");

  body += F("<div class='card'><h2>Экспорт</h2><a class='pill' href='/download?file=log6'>Скачать log6.csv</a><br><br><a class='pill' href='/download?file=summary12'>Скачать summary12.csv</a><br><br><a class='pill' href='/download?file=events'>Скачать events.csv</a></div>");
  body += F("<div class='card'><h2>Очистка логов</h2><form action='/clear_logs' method='post' onsubmit='return confirm(\"Очистить все CSV логи?\")'><button class='warn' type='submit'>Очистить логи</button></form></div></div>");

  String extra = F("<script>window.addEventListener('load',()=>{const e=document.getElementById('tsSync'); if(e) e.value=Math.floor(Date.now()/1000);});</script>");
  return pageShell("Logs", body, extra);
}

String adminPage() {
  String body;
  body += F("<h1>Сервис</h1><div class='row'>");
  body += F("<div class='card'><h2>Информация</h2><table>");
  body += F("<tr><td>Uptime</td><td>"); body += uptimeString(); body += F("</td></tr>");
  body += F("<tr><td>Free heap</td><td>"); body += String(ESP.getFreeHeap()); body += F(" bytes</td></tr>");
  body += F("<tr><td>Sketch size</td><td>"); body += String(ESP.getSketchSize()); body += F(" bytes</td></tr>");
  body += F("<tr><td>LittleFS used</td><td>"); body += String(LittleFS.usedBytes()); body += F(" / "); body += String(LittleFS.totalBytes()); body += F("</td></tr>");
  body += F("<tr><td>AP IP</td><td>"); body += WiFi.softAPIP().toString(); body += F("</td></tr>");
  body += F("</table></div>");

  body += F("<div class='card'><h2>Действия</h2>");
  body += F("<form action='/rebuild_total' method='post'><button class='good' type='submit'>Пересчитать Total из pulses</button></form>");
  body += F("<form action='/reset_total' method='post' onsubmit='return confirm(\"Сбросить Total и pulses?\")'><button class='warn' type='submit'>Сбросить Total</button></form>");
  body += F("<form action='/reboot' method='post'><button class='alt' type='submit'>Перезагрузить</button></form>");
  body += F("<form action='/factory_reset' method='post' onsubmit='return confirm(\"Полный сброс настроек?\")'><button class='warn' type='submit'>Factory reset</button></form>");
  body += F("</div></div>");
  return pageShell("Admin", body);
}

String apiStatusJson() {
  String j = "{";
  j += "\"time\":\"" + fmtDateTime(getLocalNow()) + "\",";
  j += "\"total_l\":" + String(totalLiters(), 3) + ",";
  j += "\"daily_l\":" + String(dailyLiters(), 3) + ",";
  j += "\"pulses\":" + String(getPulseCountSafe()) + ",";
  j += "\"err24h\":" + String(err24h) + ",";
  j += "\"lmin\":" + String(instantLMin(), 3) + ",";
  j += "\"l24h\":" + String(instantL24h(), 3) + ",";
  j += "\"t24h\":" + String(instantT24h(), 4) + ",";
  j += "\"avgLmin\":" + String(avgLMin(), 3) + ",";
  j += "\"avgT24h\":" + String(avgT24h(), 4) + ",";
  j += "\"rho15\":" + String(cfg.rho15, 4) + ",";
  j += "\"tempC\":" + String(cfg.tempC, 1) + ",";
  j += "\"rhoT\":" + String(rhoT(), 4) + ",";
  j += "\"utcOffset\":" + String(cfg.utcOffsetHours) + ",";
  j += "\"lastPulseUs\":" + String(getLastPulseIntervalUsSafe());
  j += "}";
  return j;
}

void redirectTo(const char* path) {
  server.sendHeader("Location", path);
  server.send(303);
}

void setupRoutes() {
  server.on("/", HTTP_GET, [](){ server.send(200, "text/html; charset=utf-8", dashboardPage()); });
  server.on("/fuel", HTTP_GET, [](){ server.send(200, "text/html; charset=utf-8", fuelPage()); });
  server.on("/calibration", HTTP_GET, [](){ server.send(200, "text/html; charset=utf-8", calibrationPage()); });
  server.on("/sensor", HTTP_GET, [](){ server.send(200, "text/html; charset=utf-8", sensorPage()); });
  server.on("/logs", HTTP_GET, [](){ server.send(200, "text/html; charset=utf-8", logsPage()); });
  server.on("/admin", HTTP_GET, [](){ server.send(200, "text/html; charset=utf-8", adminPage()); });
  server.on("/api/status", HTTP_GET, [](){ server.send(200, "application/json", apiStatusJson()); });
  server.on("/api/sync", HTTP_GET, [](){ if (server.hasArg("ts")) setUnixTime((uint32_t)server.arg("ts").toInt()); server.send(200, "application/json", "{\"ok\":true}"); });

  server.on("/sync_time", HTTP_POST, [](){ if (server.hasArg("ts")) setUnixTime((uint32_t)server.arg("ts").toInt()); appendEvent("time_sync", "Time synced from phone"); redirectTo("/logs"); });
  server.on("/set_time_manual", HTTP_POST, [](){
    if (server.hasArg("ts") && server.arg("ts").length() > 0) setUnixTime((uint32_t)server.arg("ts").toInt());
    if (server.hasArg("utcOffset")) cfg.utcOffsetHours = (int8_t)server.arg("utcOffset").toInt();
    if (cfg.utcOffsetHours < -12) cfg.utcOffsetHours = -12;
    if (cfg.utcOffsetHours > 14) cfg.utcOffsetHours = 14;
    if (server.hasArg("dayStart")) cfg.dayStartMin = parseHM(server.arg("dayStart"), cfg.dayStartMin);
    if (server.hasArg("sum1")) cfg.sum1Min = parseHM(server.arg("sum1"), cfg.sum1Min);
    if (server.hasArg("sum2")) cfg.sum2Min = parseHM(server.arg("sum2"), cfg.sum2Min);
    saveConfig(); appendEvent("time_settings", "Schedule updated"); redirectTo("/logs");
  });

  server.on("/save_fuel", HTTP_POST, [](){
    cfg.rho15 = server.arg("rho15").toFloat();
    cfg.tempC = server.arg("tempC").toFloat();
    saveConfig(); appendEvent("fuel_save", "Fuel values saved"); redirectTo("/fuel");
  });

  server.on("/preset_add", HTTP_POST, [](){
    for (int i = 0; i < MAX_PRESETS; i++) {
      if (!presets[i].used) {
        presets[i].used = true;
        String n = server.arg("name");
        memset(presets[i].name, 0, sizeof(presets[i].name));
        n.toCharArray(presets[i].name, sizeof(presets[i].name));
        presets[i].rho15 = server.arg("rho15").toFloat();
        savePresets(); appendEvent("preset_add", String(presets[i].name));
        break;
      }
    }
    redirectTo("/fuel");
  });

  server.on("/preset_save", HTTP_POST, [](){
    int idx = server.arg("idx").toInt();
    if (idx >= 0 && idx < MAX_PRESETS) {
      presets[idx].used = true;
      String n = server.arg("name");
      memset(presets[idx].name, 0, sizeof(presets[idx].name));
      n.toCharArray(presets[idx].name, sizeof(presets[idx].name));
      presets[idx].rho15 = server.arg("rho15").toFloat();
      savePresets(); appendEvent("preset_update", String(presets[idx].name));
    }
    redirectTo("/fuel");
  });

  server.on("/preset_load", HTTP_POST, [](){
    int idx = server.arg("idx").toInt();
    if (idx >= 0 && idx < MAX_PRESETS && presets[idx].used) {
      cfg.rho15 = presets[idx].rho15;
      saveConfig(); appendEvent("preset_load", String(presets[idx].name));
    }
    redirectTo("/fuel");
  });

  server.on("/preset_delete", HTTP_POST, [](){
    int idx = server.arg("idx").toInt();
    if (idx >= 0 && idx < MAX_PRESETS) {
      appendEvent("preset_delete", String(presets[idx].name));
      presets[idx].used = false;
      memset(presets[idx].name, 0, sizeof(presets[idx].name));
      presets[idx].rho15 = 0.9000f;
      savePresets();
    }
    redirectTo("/fuel");
  });

  server.on("/save_cal", HTTP_POST, [](){
    cfg.litersPerPulse = server.arg("lpp").toFloat();
    saveConfig(); appendEvent("calibration", "Manual calibration saved"); redirectTo("/calibration");
  });

  server.on("/calibrate_known", HTTP_POST, [](){
    float knownL = server.arg("knownL").toFloat();
    float pulses = server.arg("pulses").toFloat();
    if (knownL > 0.0f && pulses > 0.0f) {
      cfg.litersPerPulse = knownL / pulses;
      saveConfig(); appendEvent("calibration", "Known-volume calibration applied");
    }
    redirectTo("/calibration");
  });

  server.on("/save_sensor", HTTP_POST, [](){
    cfg.debounceUs = (uint32_t)server.arg("debounceUs").toInt();
    if (cfg.debounceUs < 1000) cfg.debounceUs = 1000;
    if (cfg.debounceUs > 50000) cfg.debounceUs = 50000;
    saveConfig(); appendEvent("sensor", "Debounce updated"); redirectTo("/sensor");
  });

  server.on("/save_logging", HTTP_POST, [](){
    cfg.avgWindowSec = (uint32_t)server.arg("avgWindowSec").toInt();
    if (cfg.avgWindowSec < 60) cfg.avgWindowSec = 60;
    if (cfg.avgWindowSec > FLOW_RING_SEC) cfg.avgWindowSec = FLOW_RING_SEC;
    cfg.autoSyncOnPageOpen = server.arg("autoSync") == "1";
    cfg.loggingEnabled = server.arg("loggingEnabled") == "1";
    cfg.oledRotateSec = (uint8_t)server.arg("oledRotateSec").toInt();
    if (cfg.oledRotateSec < 2) cfg.oledRotateSec = 2;
    if (cfg.oledRotateSec > 20) cfg.oledRotateSec = 20;
    saveConfig(); appendEvent("logging", "Logging settings updated"); redirectTo("/logs");
  });

  server.on("/toggle_logging", HTTP_POST, [](){
    cfg.loggingEnabled = !cfg.loggingEnabled;
    saveConfig(); appendEvent("logging", cfg.loggingEnabled ? "enabled" : "disabled"); redirectTo("/");
  });

  server.on("/reset_daily", HTTP_POST, [](){
    dailyPulseCount = 0;
    saveCounters(); appendEvent("reset_daily", "Daily counter reset"); redirectTo("/");
  });

  server.on("/rebuild_total", HTTP_POST, [](){
    // Total is already built from pulses, but this action saves the current counters immediately.
    saveCounters();
    appendEvent("rebuild_total", "Total confirmed from pulses");
    redirectTo("/admin");
  });

  server.on("/reset_total", HTTP_POST, [](){
    memset(pulsePerSec, 0, sizeof(pulsePerSec));
    noInterrupts();
    pulseCount = 0;
    rejectedTotal = 0;
    acceptedInSecondISR = 0;
    lastPulseUs = 0;
    lastPulseIntervalUs = 0;
    interrupts();
    dailyPulseCount = 0;
    memset(errPerMinute, 0, sizeof(errPerMinute));
    errCurrentMinute = 0;
    err24h = 0;
    saveCounters();
    appendEvent("reset_total", "Total reset");
    redirectTo("/admin");
  });

  server.on("/clear_logs", HTTP_POST, [](){
    LittleFS.remove("/log6.csv");
    LittleFS.remove("/summary12.csv");
    LittleFS.remove("/events.csv");
    ensureLogFiles();
    appendEvent("clear_logs", "Logs cleared");
    redirectTo("/logs");
  });

  server.on("/reboot", HTTP_POST, [](){
    server.send(200, "text/plain", "Rebooting...");
    delay(300);
    ESP.restart();
  });

  server.on("/factory_reset", HTTP_POST, [](){
    prefs.clear();
    LittleFS.format();
    server.send(200, "text/plain", "Factory reset done. Rebooting...");
    delay(500);
    ESP.restart();
  });

  server.on("/download", HTTP_GET, [](){
    String file = server.arg("file");
    String path;
    if (file == "log6") path = "/log6.csv";
    else if (file == "summary12") path = "/summary12.csv";
    else if (file == "events") path = "/events.csv";
    else { server.send(404, "text/plain", "Unknown file"); return; }

    File f = LittleFS.open(path, "r");
    if (!f) { server.send(404, "text/plain", "File not found"); return; }
    server.streamFile(f, "text/csv");
    f.close();
  });
}

// -------------------- Setup / Loop --------------------
void setup() {
  bootMs = millis();
  Serial.begin(115200);
  delay(200);
  Serial.println("Booting flowmeter firmware...");

  prefs.begin("flow", false);
  loadConfig();
  loadCounters();
  loadPresets();

  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS mount failed");
  }
  ensureLogFiles();

  Wire.begin(OLED_SDA, OLED_SCL);
  Wire.setClock(100000);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR, false, false)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Flowmeter boot...");
    display.display();
  }

  pinMode(REED_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(REED_PIN), reedISR, FALLING);

  WiFi.mode(WIFI_AP);
  bool ok = WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("WiFi AP: ");
  Serial.println(ok ? "OK" : "FAIL");
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());

  setupRoutes();
  server.begin();
  appendEvent("boot", "Device started");
  updateOLED();
}

void loop() {
  server.handleClient();

  time_t utcNow = getUtcNow();
  rotateSecondBuckets((uint32_t)utcNow);
  rebuildFlowWindows();
  processMinuteTasks();

  if (millis() - lastOledMs >= 1000UL) {
    updateOLED();
    lastOledMs = millis();
  }

  if (millis() - lastScreenMs >= (uint32_t)cfg.oledRotateSec * 1000UL) {
    oledScreen = (oledScreen + 1) % 2;
    lastScreenMs = millis();
  }

  // Save immediately every 25 pulses, plus each 30 seconds.
  uint32_t pNow = getPulseCountSafe();
  if ((pNow - lastSavedPulseCount) >= 25 || (millis() - lastSaveMs >= 30000UL)) {
    saveCounters();
    lastSaveMs = millis();
  }
}
