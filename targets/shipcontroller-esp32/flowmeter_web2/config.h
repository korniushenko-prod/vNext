#pragma once
#include <Arduino.h>

#define PIN_HALL_A 34
#define PIN_HALL_B 35
#define OLED_SDA 21
#define OLED_SCL 22
#define OLED_ADDR 0x3C
#define OLED_W 128
#define OLED_H 64
#define OLED_RST -1

constexpr uint32_t SENSOR_SAMPLE_MS = 20;
constexpr uint32_t FLOW_CALC_MS = 1000;
constexpr uint32_t OLED_UPDATE_MS = 1000;
constexpr uint32_t OLED_SWITCH_MS = 4000;
constexpr uint32_t SAVE_MS = 30000;
constexpr uint32_t LOG_MS = 360000;
constexpr uint32_t AUTO_CAL_MS = 5000;
constexpr uint32_t LIVE_JSON_MS = 1000;

constexpr size_t SLIDING_SECONDS = 10;
constexpr size_t SAMPLES_PER_SECOND = 1000 / SENSOR_SAMPLE_MS;
constexpr size_t SLIDING_SAMPLES = SLIDING_SECONDS * SAMPLES_PER_SECOND;

constexpr size_t LOG_CAPACITY = 240;
constexpr size_t ERR_MINUTES = 1440;

enum ThresholdMode : uint8_t {
  MODE_MANUAL = 0,
  MODE_AUTO_ONCE = 1,
  MODE_SLIDING_10S = 2
};

enum DebugMode : uint8_t {
  DEBUG_OFF,
  DEBUG_BASIC,
  DEBUG_VERBOSE
};

enum FuelPresetId : uint8_t {
  FUEL_HEAVY = 0,
  FUEL_DIESEL = 1
};
