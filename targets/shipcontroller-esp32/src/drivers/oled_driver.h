#pragma once
#include <Arduino.h>
#include "../config/feature_flags.h"

#if FEATURE_OLED
#include <Adafruit_SSD1306.h>
#else
class Adafruit_SSD1306;
#endif

extern Adafruit_SSD1306 *display;

void oledInit();
void oledPrint(String line1, String line2);
