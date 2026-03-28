#pragma once
#include <Arduino.h>
#include "config.h"

struct FuelPreset {
  char name[16];
  float rho15;
  float tempC;
};

struct Settings {
  float litersPerPulse = 0.03f;
  FuelPreset fuels[2] = {{"Heavy", 0.991f, 130.0f}, {"Diesel", 0.845f, 35.0f}};
  uint8_t activeFuel = FUEL_HEAVY;

  ThresholdMode mode = MODE_MANUAL;
  float threshold = 10.0f;
  float hysteresis = 8.0f;
  float filterK = 0.25f;
  bool pulseGuardEnabled = true;
  float guardFactor = 0.20f;
  uint32_t minPulseMs = 5;

  int8_t utcOffsetHours = 0;
  uint16_t dayStartMin = 0;
  DebugMode serialMode = DEBUG_BASIC;

  bool staEnabled = false;
  String staSsid = "";
  String staPass = "";
};

struct Telemetry {
  int rawA = 0;
  int rawB = 0;
  float diff = 0;
  float filtered = 0;
  float minDiff = 99999.0f;
  float maxDiff = -99999.0f;
  float amplitude = 0;
  bool pulseState = false;

  float slidingMin = 0;
  float slidingMax = 0;

  uint32_t pulseCount = 0;
  uint32_t dailyPulseCount = 0;
  uint32_t rejectedTotal = 0;
  uint32_t rejected24h = 0;
  uint32_t acceptedThisSecond = 0;
  uint32_t thresholdRejects = 0;
  uint32_t guardRejects = 0;
  uint32_t lastAcceptedPulseMs = 0;
  uint32_t lastAcceptedIntervalMs = 0;
  float avgAcceptedIntervalMs = 0;
  uint32_t pulseIntervals[10] = {0};
  uint8_t intervalIndex = 0;
  uint8_t intervalCount = 0;

  float totalLiters = 0;
  float dailyLiters = 0;
  float lMin = 0;
  float l24h = 0;
  float t24h = 0;
  float rhoT = 0;

  bool autoCalActive = false;
  uint32_t autoCalStartMs = 0;
  float autoMin = 99999.0f;
  float autoMax = -99999.0f;
  uint8_t oledScreen = 0;
  bool dirty = false;
};

struct LogRecord {
  uint32_t unixTs;
  float totalLiters;
  float dailyLiters;
  float lMin;
  float t24h;
  uint32_t pulseCount;
  float diff;
  float amplitude;
};

extern Settings gSettings;
extern Telemetry gTelem;
extern LogRecord gLogs[LOG_CAPACITY];
extern size_t gLogHead;
extern size_t gLogCount;
extern uint16_t gErrPerMinute[ERR_MINUTES];
extern uint16_t gErrMinuteIndex;

String formatLocalDateTime(uint32_t unixTs);
String getDisplayIp();
float computeRhoT(float rho15, float tempC);
