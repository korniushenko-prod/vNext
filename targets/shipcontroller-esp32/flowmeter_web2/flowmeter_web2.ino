#include <Arduino.h>
#include <esp_task_wdt.h>
#include "config.h"
#include "app_state.h"
#include "storage.h"
#include "sensor.h"
#include "flow.h"
#include "logger.h"
#include "wifi_manager.h"
#include "web.h"
#include "oled.h"

static uint32_t lastSampleMs = 0;
static uint32_t lastCalcMs = 0;
static uint32_t lastOledMs = 0;
static uint32_t lastSaveMs = 0;
static uint32_t lastLogMs = 0;
static uint32_t lastDebugMs = 0;
static uint32_t lastSavedPulseCount = 0;

static void debugOutput() {
  if (gSettings.serialMode == DEBUG_OFF) return;
  if (millis() - lastDebugMs < 1000UL) return;
  lastDebugMs = millis();

  if (gSettings.serialMode == DEBUG_BASIC) {
    Serial.print(F("P=")); Serial.print(gTelem.pulseCount);
    Serial.print(F(" L/m=")); Serial.print(gTelem.lMin, 2);
    Serial.print(F(" diff=")); Serial.println(gTelem.filtered, 2);
    return;
  }

  Serial.print(F("A=")); Serial.print(gTelem.rawA);
  Serial.print(F(" B=")); Serial.print(gTelem.rawB);
  Serial.print(F(" diff=")); Serial.print(gTelem.diff, 2);
  Serial.print(F(" filt=")); Serial.print(gTelem.filtered, 2);
  Serial.print(F(" min=")); Serial.print(gTelem.minDiff, 2);
  Serial.print(F(" max=")); Serial.print(gTelem.maxDiff, 2);
  Serial.print(F(" amp=")); Serial.print(gTelem.amplitude, 2);
  Serial.print(F(" thr=")); Serial.print(gSettings.threshold, 2);
  Serial.print(F(" hys=")); Serial.print(gSettings.hysteresis, 2);
  Serial.print(F(" p=")); Serial.print(gTelem.pulseCount);
  Serial.print(F(" avgInt=")); Serial.print(gTelem.avgAcceptedIntervalMs, 1);
  Serial.print(F(" q=")); Serial.println(signalQuality());
}

void setup() {
  Serial.begin(115200);
  delay(100);

  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = 8000,
    .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
    .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);

  storageInit();
  loadAllSettings();
  loadTotalCounter();
  wifiInit();
  sensorInit();
  loggerInit();
  oledInit();
  webInit();

  lastSavedPulseCount = gTelem.pulseCount;
}

void loop() {
  esp_task_wdt_reset();
  webLoop();
  wifiTick();

  uint32_t now = millis();

  if (now - lastSampleMs >= SENSOR_SAMPLE_MS) {
    lastSampleMs = now;
    sensorSample();
  }

  if (now - lastCalcMs >= FLOW_CALC_MS) {
    lastCalcMs = now;
    flowUpdate();
    loggerTickPerSecond();
    debugOutput();
  }

  if (now - lastOledMs >= OLED_UPDATE_MS) {
    lastOledMs = now;
    oledUpdate();
  }

  if (now - lastLogMs >= LOG_MS) {
    lastLogMs = now;
    loggerAppend();
  }

  if ((gTelem.pulseCount - lastSavedPulseCount) >= 50 || (now - lastSaveMs >= 30000))
  {
    saveTotalCounter();

    lastSavedPulseCount = gTelem.pulseCount;
    lastSaveMs = now;
  }
}
