#include "ui_config.h"

UIConfig gUIConfig;

void loadUIConfig(JsonDocument &doc)
{
    gUIConfig.screenCount = 0;

    if (!doc["screens"].is<JsonArray>()) return;

    JsonArray screens = doc["screens"];

    for (JsonObject s : screens)
    {
        if (gUIConfig.screenCount >= MAX_SCREENS) break;

        UIScreen &screen = gUIConfig.screens[gUIConfig.screenCount];
        screen.itemCount = 0;

        for (JsonObject item : s["items"].as<JsonArray>())
        {
            if (screen.itemCount >= MAX_ITEMS) break;

            screen.items[screen.itemCount].label = (const char*)item["label"];
            screen.items[screen.itemCount].source = (const char*)item["source"];

            screen.itemCount++;
        }

        gUIConfig.screenCount++;
    }
}