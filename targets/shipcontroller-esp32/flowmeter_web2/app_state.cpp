#include <Arduino.h>
#include <WiFi.h>
#include <math.h>
#include <time.h>
#include "app_state.h"

Settings gSettings;
Telemetry gTelem;
LogRecord gLogs[LOG_CAPACITY] = {};
size_t gLogHead = 0;
size_t gLogCount = 0;
uint16_t gErrPerMinute[ERR_MINUTES] = {};
uint16_t gErrMinuteIndex = 0;

float computeRhoT(float rho15, float tempC) {
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

String formatLocalDateTime(uint32_t unixTs) {
  time_t t = (time_t)unixTs + gSettings.utcOffsetHours * 3600L;
  struct tm ti;
  gmtime_r(&t, &ti);
  char buf[24];
  snprintf(buf, sizeof(buf), "%04d-%02d-%02d %02d:%02d:%02d",
           ti.tm_year + 1900, ti.tm_mon + 1, ti.tm_mday,
           ti.tm_hour, ti.tm_min, ti.tm_sec);
  return String(buf);
}

String getDisplayIp() {
  IPAddress sta = WiFi.localIP();
  if (WiFi.status() == WL_CONNECTED && sta != INADDR_NONE) return sta.toString();
  return WiFi.softAPIP().toString();
}
