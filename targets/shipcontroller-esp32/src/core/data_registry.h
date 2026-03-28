#pragma once
#include <Arduino.h>
#include "../config/config_schema.h"

constexpr int MAX_DATA_ITEMS = MAX_TIMER_BLOCKS + 16;

struct DataItem {
    String key;
    float *value;
};

class DataRegistry {
public:
    void registerValue(const String &key, float *value);
    float getValue(const String &key);

private:
    DataItem items[MAX_DATA_ITEMS];
    int count = 0;
};

extern DataRegistry gData;
