#pragma once
#include <Arduino.h>
#include <ArduinoJson.h>

#define MAX_ITEMS 6
#define MAX_SCREENS 3

struct UIItem {
    String label;
    String source;
};

struct UIScreen {
    UIItem items[MAX_ITEMS];
    int itemCount;
};

struct UIConfig {
    UIScreen screens[MAX_SCREENS];
    int screenCount;
};

extern UIConfig gUIConfig;

void loadUIConfig(JsonDocument &doc);