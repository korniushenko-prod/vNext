#include <Arduino.h>
#include <time.h>
#include "logger.h"
#include "app_state.h"
#include "config.h"

static uint16_t lastMinuteProcessed = 65535;

static uint16_t minuteOfDayLocal() {
  time_t t = time(nullptr) + gSettings.utcOffsetHours * 3600L;
  struct tm ti;
  gmtime_r(&t, &ti);
  return (uint16_t)(ti.tm_hour * 60 + ti.tm_min);
}

void loggerInit() {
  memset(gErrPerMinute, 0, sizeof(gErrPerMinute));
  gErrMinuteIndex = 0;
  gTelem.rejected24h = 0;
}

void loggerTickPerSecond() {
  uint16_t mod = minuteOfDayLocal();
  if (mod == lastMinuteProcessed) return;
  lastMinuteProcessed = mod;

  gTelem.rejected24h -= gErrPerMinute[gErrMinuteIndex];
  uint16_t val = (uint16_t)min<uint32_t>(gTelem.guardRejects + gTelem.thresholdRejects, 65535);
  gErrPerMinute[gErrMinuteIndex] = val;
  gTelem.rejected24h += val;
  gErrMinuteIndex = (gErrMinuteIndex + 1) % ERR_MINUTES;
  gTelem.guardRejects = 0;
  gTelem.thresholdRejects = 0;
}

void loggerAppend() {
  time_t now = time(nullptr);
  if (now < 100000) now = 1704067200 + millis() / 1000UL;
  LogRecord &r = gLogs[gLogHead];
  r.unixTs = (uint32_t)now;
  r.totalLiters = gTelem.totalLiters;
  r.dailyLiters = gTelem.dailyLiters;
  r.lMin = gTelem.lMin;
  r.t24h = gTelem.t24h;
  r.pulseCount = gTelem.pulseCount;
  r.diff = gTelem.filtered;
  r.amplitude = gTelem.amplitude;
  gLogHead = (gLogHead + 1) % LOG_CAPACITY;
  if (gLogCount < LOG_CAPACITY) gLogCount++;
}

String loggerCsv() {
  String out = "timestamp,total liters,daily liters,L/min,t/24h,pulseCount,diff,amplitude\n";
  size_t start = (gLogCount < LOG_CAPACITY) ? 0 : gLogHead;
  for (size_t i = 0; i < gLogCount; i++) {
    size_t idx = (start + i) % LOG_CAPACITY;
    const LogRecord &r = gLogs[idx];
    out += formatLocalDateTime(r.unixTs);
    out += "," + String(r.totalLiters, 3);
    out += "," + String(r.dailyLiters, 3);
    out += "," + String(r.lMin, 3);
    out += "," + String(r.t24h, 3);
    out += "," + String(r.pulseCount);
    out += "," + String(r.diff, 3);
    out += "," + String(r.amplitude, 3);
    out += "\n";
  }
  return out;
}
