#include <Arduino.h>
#include <WiFi.h>
#include "wifi_manager.h"
#include "app_state.h"

static const char* AP_SSID = "FlowMeter";
static const char* AP_PASS = "12345678";
static uint32_t lastStaAttempt = 0;

void wifiInit() {
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASS);
  if (gSettings.staEnabled && gSettings.staSsid.length()) {
    WiFi.begin(gSettings.staSsid.c_str(), gSettings.staPass.c_str());
    lastStaAttempt = millis();
  }
}

void wifiTick() {
  if (gSettings.staEnabled && gSettings.staSsid.length() && WiFi.status() != WL_CONNECTED) {
    if (millis() - lastStaAttempt > 15000UL) {
      WiFi.disconnect();
      WiFi.begin(gSettings.staSsid.c_str(), gSettings.staPass.c_str());
      lastStaAttempt = millis();
    }
  }
}
