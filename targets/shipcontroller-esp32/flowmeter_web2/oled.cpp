#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>
#include "oled.h"
#include "config.h"
#include "app_state.h"

static Adafruit_SSD1306 display(OLED_W, OLED_H, &Wire, OLED_RST);
static uint32_t lastSwitch = 0;

static String localHM() {
  time_t t = time(nullptr) + gSettings.utcOffsetHours * 3600L;
  struct tm ti;
  gmtime_r(&t, &ti);
  char buf[6];
  snprintf(buf, sizeof(buf), "%02d:%02d", ti.tm_hour, ti.tm_min);
  return String(buf);
}

void oledInit() {
  Wire.begin(OLED_SDA, OLED_SCL);
  Wire.setClock(100000);
  display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR, false, false);
  display.clearDisplay();
  display.display();
}

void oledUpdate() {
  uint32_t now = millis();
  if (now - lastSwitch >= OLED_SWITCH_MS) {
    gTelem.oledScreen = (gTelem.oledScreen + 1) % 2;
    lastSwitch = now;
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.print((uint32_t)round(gTelem.totalLiters));

  display.setTextSize(1);
  if (gTelem.oledScreen == 0) {
    display.setCursor(0, 36);
    display.print(localHM());
    display.setCursor(64, 36);
    display.print(F("E24:"));
    display.print(gTelem.rejected24h);
    display.setCursor(0, 52);
    display.print(F("IP:"));
    display.print(getDisplayIp());
  } else {
    display.setCursor(0, 28);
    display.print(F("L/m : "));
    display.print(gTelem.lMin, 1);
    display.setCursor(0, 40);
    display.print(F("L/24:"));
    display.print((uint32_t)round(gTelem.l24h));
    display.setCursor(0, 52);
    display.print(F("t/24:"));
    display.print(gTelem.t24h, 2);
  }
  display.display();
}
