#include <Arduino.h>
#include <math.h>
#include "sensor.h"
#include "flow.h"
#include "config.h"
#include "app_state.h"

static float slidingBuf[SLIDING_SAMPLES];
static size_t slidingIndex = 0;
static bool slidingFilled = false;

static void updateSlidingWindow(float v) {
  slidingBuf[slidingIndex] = v;
  slidingIndex = (slidingIndex + 1) % SLIDING_SAMPLES;
  if (slidingIndex == 0) slidingFilled = true;

  size_t count = slidingFilled ? SLIDING_SAMPLES : slidingIndex;
  if (count == 0) count = 1;

  float mn = 99999.0f;
  float mx = -99999.0f;

  for (size_t i = 0; i < count; i++) {
    float x = slidingBuf[i];
    if (x < mn) mn = x;
    if (x > mx) mx = x;
  }

  gTelem.slidingMin = mn;
  gTelem.slidingMax = mx;
}

void sensorInit() {
  pinMode(PIN_HALL_A, INPUT);
  pinMode(PIN_HALL_B, INPUT);

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_HALL_A, ADC_11db);
  analogSetPinAttenuation(PIN_HALL_B, ADC_11db);
}

void sensorResetMinMax() {
  gTelem.minDiff = 99999.0f;
  gTelem.maxDiff = -99999.0f;
  gTelem.slidingMin = 0;
  gTelem.slidingMax = 0;

  slidingIndex = 0;
  slidingFilled = false;
}

void sensorStartAutoCalibration() {
  gTelem.autoCalActive = true;
  gTelem.autoCalStartMs = millis();
  gTelem.autoMin = 99999.0f;
  gTelem.autoMax = -99999.0f;
}

void sensorSetMode(uint8_t modeValue) {
  if (modeValue > MODE_SLIDING_10S) modeValue = MODE_MANUAL;
  gSettings.mode = (ThresholdMode)modeValue;
  gTelem.dirty = true;
}

const char* signalQuality() {
  if (gTelem.amplitude < 20) return "BAD";
  if (gTelem.amplitude < 50) return "WEAK";
  if (gTelem.amplitude < 120) return "OK";
  return "STRONG";
}

void sensorSample() {
  gTelem.rawA = analogRead(PIN_HALL_A);
  gTelem.rawB = analogRead(PIN_HALL_B);

  gTelem.diff = (float)(gTelem.rawA - gTelem.rawB);
  gTelem.filtered = gTelem.filtered + gSettings.filterK * (gTelem.diff - gTelem.filtered);

  if (gTelem.filtered < gTelem.minDiff) gTelem.minDiff = gTelem.filtered;
  if (gTelem.filtered > gTelem.maxDiff) gTelem.maxDiff = gTelem.filtered;
  gTelem.amplitude = gTelem.maxDiff - gTelem.minDiff;

  updateSlidingWindow(gTelem.filtered);

  if (gTelem.autoCalActive) {
    if (gTelem.filtered < gTelem.autoMin) gTelem.autoMin = gTelem.filtered;
    if (gTelem.filtered > gTelem.autoMax) gTelem.autoMax = gTelem.filtered;

    if (millis() - gTelem.autoCalStartMs >= AUTO_CAL_MS) {
      float amp = gTelem.autoMax - gTelem.autoMin;
      gSettings.threshold = (gTelem.autoMax + gTelem.autoMin) * 0.5f;
      gSettings.hysteresis = max(5.0f, amp / 6.0f);
      gTelem.autoCalActive = false;
      gTelem.dirty = true;
    }
  }

  if (gSettings.mode == MODE_SLIDING_10S) {
    float amp = gTelem.slidingMax - gTelem.slidingMin;
    gSettings.threshold = (gTelem.slidingMax + gTelem.slidingMin) * 0.5f;
    gSettings.hysteresis = max(5.0f, amp / 6.0f);
  }

  const uint32_t nowMs = millis();

  const bool crossing =
      (!gTelem.pulseState) &&
      (gTelem.filtered > (gSettings.threshold + gSettings.hysteresis));

  if (crossing) {
    const uint32_t interval =
        (gTelem.lastAcceptedPulseMs == 0) ? 1000000UL
                                          : (nowMs - gTelem.lastAcceptedPulseMs);

    bool reject = false;

    if (gSettings.pulseGuardEnabled) {
      const uint32_t adaptiveMin =
          (gTelem.avgAcceptedIntervalMs > 1.0f)
              ? (uint32_t)(gTelem.avgAcceptedIntervalMs * gSettings.guardFactor)
              : 0;

      const uint32_t guardMin = max(gSettings.minPulseMs, adaptiveMin);

      if (interval < guardMin) {
        reject = true;
        gTelem.guardRejects++;
      }
    }

    if (reject) {
      gTelem.rejectedTotal++;
    } else {
      flowOnAcceptedPulse();
      gTelem.acceptedThisSecond++;
    }

    gTelem.pulseState = true;
  }

  if (gTelem.pulseState &&
      gTelem.filtered < (gSettings.threshold - gSettings.hysteresis)) {
    gTelem.pulseState = false;
  }
}