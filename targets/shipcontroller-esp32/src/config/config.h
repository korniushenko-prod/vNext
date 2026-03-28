#pragma once
#include "config_schema.h"

constexpr uint16_t CURRENT_CONFIG_VERSION = 2;

extern SystemConfig gConfig;

void loadDefaultConfig();
bool loadConfigFromFile();
