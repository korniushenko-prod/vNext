#pragma once

#include <Arduino.h>

#include "../config/config_schema.h"

constexpr int MAX_RETAINED_VALUES = MAX_BLOCKS + 16;

struct RetainedValueEntry {
    String key;
    float value;
    bool used;
};

class RetainedValueStore {
public:
    void reset();
    bool begin();
    bool getFloat(const String &key, float &value) const;
    bool saveFloat(const String &key, float value);
    bool remove(const String &key);

private:
    RetainedValueEntry entries[MAX_RETAINED_VALUES];
    int entryCount = 0;
    uint32_t activeSequence = 0;
    uint8_t activeSlot = 0;
    bool initialized = false;

    static const char* slotPath(uint8_t slotIndex);
    static uint32_t computeChecksum(const String &payload, uint32_t sequence);
    bool loadSlot(uint8_t slotIndex, uint32_t &sequence, RetainedValueEntry *targetEntries, int &targetCount) const;
    bool writeSlot(uint8_t slotIndex, uint32_t sequence) const;
    int findEntryIndex(const String &key) const;
    int ensureEntry(const String &key);
};

extern RetainedValueStore gRetainedValues;
