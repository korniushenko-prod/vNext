#pragma once

#include <Arduino.h>

#include "../config/config_schema.h"
#include "signal_types.h"

struct DisplayBinding {
    String screenId;
    String widgetId;
    String signalId;
    int signalIndex;
};

struct DisplayWidgetState {
    String screenId;
    String widgetId;
    DisplayWidgetType type;
    bool visible;
    SignalQuality quality;
    float lastNumericValue;
    String lastTextValue;
    uint32_t lastRenderMs;
};

struct DisplayScreenState {
    String id;
    bool visible;
    uint32_t lastRenderMs;
};
