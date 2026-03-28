#include "retained_value_store.h"

#include <ArduinoJson.h>
#include <LittleFS.h>

RetainedValueStore gRetainedValues;

namespace {

constexpr const char *kRetainedSlotA = "/retained_values_a.json";
constexpr const char *kRetainedSlotB = "/retained_values_b.json";

}  // namespace

const char* RetainedValueStore::slotPath(uint8_t slotIndex)
{
    return slotIndex == 0 ? kRetainedSlotA : kRetainedSlotB;
}

uint32_t RetainedValueStore::computeChecksum(const String &payload, uint32_t sequence)
{
    uint32_t hash = 2166136261UL;

    auto mixByte = [&hash](uint8_t byte) {
        hash ^= byte;
        hash *= 16777619UL;
    };

    for (size_t i = 0; i < payload.length(); i++)
    {
        mixByte(static_cast<uint8_t>(payload[i]));
    }

    for (int shift = 0; shift < 32; shift += 8)
    {
        mixByte(static_cast<uint8_t>((sequence >> shift) & 0xFF));
    }

    return hash;
}

void RetainedValueStore::reset()
{
    entryCount = 0;
    activeSequence = 0;
    activeSlot = 0;
    initialized = false;

    for (int i = 0; i < MAX_RETAINED_VALUES; i++)
    {
        entries[i].key = "";
        entries[i].value = 0.0f;
        entries[i].used = false;
    }
}

bool RetainedValueStore::loadSlot(uint8_t slotIndex, uint32_t &sequence, RetainedValueEntry *targetEntries, int &targetCount) const
{
    sequence = 0;
    targetCount = 0;

    if (!LittleFS.begin())
    {
        return false;
    }

    if (!LittleFS.exists(slotPath(slotIndex)))
    {
        return false;
    }

    File file = LittleFS.open(slotPath(slotIndex), "r");
    if (!file)
    {
        return false;
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();
    if (error)
    {
        return false;
    }

    sequence = doc["seq"] | 0UL;
    const uint32_t storedChecksum = doc["checksum"] | 0UL;
    JsonObject values = doc["values"].as<JsonObject>();
    if (values.isNull())
    {
        return false;
    }

    String payload;
    serializeJson(values, payload);
    const uint32_t computedChecksum = computeChecksum(payload, sequence);
    if (computedChecksum != storedChecksum)
    {
        return false;
    }

    for (JsonPair kv : values)
    {
        if (targetCount >= MAX_RETAINED_VALUES)
        {
            break;
        }

        targetEntries[targetCount].key = kv.key().c_str();
        targetEntries[targetCount].value = kv.value() | 0.0f;
        targetEntries[targetCount].used = true;
        targetCount++;
    }

    return true;
}

bool RetainedValueStore::begin()
{
    RetainedValueEntry slotEntriesA[MAX_RETAINED_VALUES];
    RetainedValueEntry slotEntriesB[MAX_RETAINED_VALUES];
    for (int i = 0; i < MAX_RETAINED_VALUES; i++)
    {
        slotEntriesA[i].used = false;
        slotEntriesB[i].used = false;
    }

    uint32_t seqA = 0;
    uint32_t seqB = 0;
    int countA = 0;
    int countB = 0;
    const bool validA = loadSlot(0, seqA, slotEntriesA, countA);
    const bool validB = loadSlot(1, seqB, slotEntriesB, countB);

    reset();

    if (!validA && !validB)
    {
        initialized = true;
        return true;
    }

    const bool useB = validB && (!validA || seqB >= seqA);
    RetainedValueEntry *source = useB ? slotEntriesB : slotEntriesA;
    const int sourceCount = useB ? countB : countA;

    for (int i = 0; i < sourceCount; i++)
    {
        entries[i] = source[i];
    }

    entryCount = sourceCount;
    activeSequence = useB ? seqB : seqA;
    activeSlot = useB ? 1 : 0;
    initialized = true;
    return true;
}

int RetainedValueStore::findEntryIndex(const String &key) const
{
    for (int i = 0; i < entryCount; i++)
    {
        if (entries[i].used && entries[i].key == key)
        {
            return i;
        }
    }

    return -1;
}

int RetainedValueStore::ensureEntry(const String &key)
{
    const int existingIndex = findEntryIndex(key);
    if (existingIndex >= 0)
    {
        return existingIndex;
    }

    if (entryCount >= MAX_RETAINED_VALUES)
    {
        return -1;
    }

    entries[entryCount].key = key;
    entries[entryCount].value = 0.0f;
    entries[entryCount].used = true;
    entryCount++;
    return entryCount - 1;
}

bool RetainedValueStore::writeSlot(uint8_t slotIndex, uint32_t sequence) const
{
    if (!LittleFS.begin())
    {
        return false;
    }

    JsonDocument valuesDoc;
    JsonObject values = valuesDoc.to<JsonObject>();
    for (int i = 0; i < entryCount; i++)
    {
        if (!entries[i].used || entries[i].key.isEmpty())
        {
            continue;
        }
        values[entries[i].key] = entries[i].value;
    }

    String payload;
    serializeJson(values, payload);
    const uint32_t checksum = computeChecksum(payload, sequence);

    JsonDocument doc;
    doc["seq"] = sequence;
    doc["checksum"] = checksum;
    JsonObject docValues = doc["values"].to<JsonObject>();
    for (JsonPair kv : values)
    {
        docValues[kv.key()] = kv.value();
    }

    File file = LittleFS.open(slotPath(slotIndex), "w");
    if (!file)
    {
        return false;
    }

    const size_t written = serializeJson(doc, file);
    file.flush();
    file.close();
    return written > 0;
}

bool RetainedValueStore::getFloat(const String &key, float &value) const
{
    const int index = findEntryIndex(key);
    if (index < 0)
    {
        return false;
    }

    value = entries[index].value;
    return true;
}

bool RetainedValueStore::saveFloat(const String &key, float value)
{
    if (!initialized && !begin())
    {
        return false;
    }

    const int index = ensureEntry(key);
    if (index < 0)
    {
        return false;
    }

    entries[index].value = value;

    const uint8_t targetSlot = activeSlot == 0 ? 1 : 0;
    const uint32_t nextSequence = activeSequence + 1;
    if (!writeSlot(targetSlot, nextSequence))
    {
        return false;
    }

    activeSlot = targetSlot;
    activeSequence = nextSequence;
    return true;
}

bool RetainedValueStore::remove(const String &key)
{
    const int index = findEntryIndex(key);
    if (index < 0)
    {
        return true;
    }

    for (int i = index; i < entryCount - 1; i++)
    {
        entries[i] = entries[i + 1];
    }

    if (entryCount > 0)
    {
        entryCount--;
    }

    if (!initialized && !begin())
    {
        return false;
    }

    const uint8_t targetSlot = activeSlot == 0 ? 1 : 0;
    const uint32_t nextSequence = activeSequence + 1;
    if (!writeSlot(targetSlot, nextSequence))
    {
        return false;
    }

    activeSlot = targetSlot;
    activeSequence = nextSequence;
    return true;
}
