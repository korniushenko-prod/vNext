#include "oled_driver.h"
#if FEATURE_OLED
#include <Wire.h>
#include <Adafruit_GFX.h>
#endif
#include "../config/config.h"

Adafruit_SSD1306 *display = nullptr;

void oledInit()
{
#if FEATURE_OLED
    if (!gConfig.oled.enabled)
    {
        Serial.println("OLED disabled");
        return;
    }

    Serial.println("OLED INIT");

    Wire.begin(gConfig.oled.sda, gConfig.oled.scl);
    Wire.setClock(100000);

    display = new Adafruit_SSD1306(
        gConfig.oled.width,
        gConfig.oled.height,
        &Wire,
        -1
    );

    if (!display->begin(SSD1306_SWITCHCAPVCC, gConfig.oled.address))
    {
        Serial.println("OLED FAIL");
        return;
    }

    Serial.println("OLED OK");

    display->clearDisplay();
    display->setTextSize(1);
    display->setTextColor(SSD1306_WHITE);
    display->setCursor(0, 0);
    display->println("OLED OK");
    display->display();
#else
    Serial.println("OLED build feature disabled");
#endif
}

void oledPrint(String l1, String l2)
{
#if FEATURE_OLED
    if (!display) return;

    display->clearDisplay();
    display->setTextSize(1);
    display->setTextColor(SSD1306_WHITE);

    display->setCursor(0,0);
    display->println(l1);

    display->setCursor(0,16);
    display->println(l2);

    display->display();
#else
    (void)l1;
    (void)l2;
#endif
}
