#pragma once

#include "../config/config_schema.h"

struct ChipPinTemplate {
    int gpio;
    bool internalPullup;
    ChannelType capabilities[MAX_RESOURCE_CAPABILITIES];
    int capabilityCount;
};

struct ChipTemplate {
    String id;
    String name;
    ChipPinTemplate pins[MAX_PINS];
    int pinCount;
};

const ChipTemplate* getChipTemplate(const String &chipId);
const ChipPinTemplate* findChipPinTemplate(const ChipTemplate &chipTemplate, int gpio);
