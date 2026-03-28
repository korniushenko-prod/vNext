#include <Arduino.h>
#include "../config/feature_flags.h"
#include "ui.h"
#include "display.h"
#include "../config/config.h"
#include "../drivers/oled_driver.h"
#include "../core/data_registry.h"
#include "ui_config.h"
#include "../web/web.h"

static const int LINE_HEIGHT = 12;
extern Adafruit_SSD1306 *display;

void uiInit()
{
    Serial.println("UI INIT");
#if FEATURE_OLED
    displayUiInit();
#endif
}

void uiConfigure()
{
#if FEATURE_OLED
    displayUiConfigure();
#endif
}

void uiUpdate()
{
#if !FEATURE_OLED
    return;
#else
    if (displayUiRender())
    {
        return;
    }

    static unsigned long last = 0;
    if (millis() - last < 1000) return;
    last = millis();

    if (!display) return;

    display->clearDisplay();
    display->setTextSize(1);
    display->setTextColor(SSD1306_WHITE);

    int y = 0;

    if (gConfig.oled.showIpOnFallback)
    {
        display->setCursor(0, y);
        display->print("IP:");
        display->print(getIP());
        y += LINE_HEIGHT;
    }

    // 🔥 ДИНАМИЧЕСКИЙ UI
    if (gUIConfig.screenCount == 0) return;

    UIScreen &screen = gUIConfig.screens[0];

    for (int i = 0; i < screen.itemCount; i++)
    {
        float val = gData.getValue(screen.items[i].source);

        display->setCursor(0, y);
        display->print(screen.items[i].label);
        display->print(":");
        display->print(val);

        y += LINE_HEIGHT;
    }

    display->display();
#endif
}
