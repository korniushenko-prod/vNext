#include "alarm_manager.h"

#include <ArduinoJson.h>

#include "../config/config_loader.h"
#include "signal_registry.h"

namespace {

bool loadAlarmConfigDocument(JsonDocument &doc)
{
    return loadConfigDocumentFromStorage(doc);
}

String defaultAlarmStatus(bool active, bool pending, bool suppressed)
{
    if (suppressed) return "suppressed";
    if (active) return "active";
    if (pending) return "pending";
    return "idle";
}

} // namespace

AlarmManager gAlarms;

AlarmManager::AlarmManager()
    : definitions(nullptr), states(nullptr), definitionCount(0), recentEvents(nullptr), recentEventCapacity(0), recentEventCount(0), recentEventStart(0)
{
}

void AlarmManager::reset()
{
    if (definitions != nullptr)
    {
        delete[] definitions;
        definitions = nullptr;
    }
    if (states != nullptr)
    {
        delete[] states;
        states = nullptr;
    }
    if (recentEvents != nullptr)
    {
        delete[] recentEvents;
        recentEvents = nullptr;
    }
    definitionCount = 0;
    recentEventCapacity = 0;
    recentEventCount = 0;
    recentEventStart = 0;
}

bool AlarmManager::configureFromConfig(String &errorMessage)
{
    reset();

    JsonDocument doc;
    if (!loadAlarmConfigDocument(doc))
    {
        return true;
    }

    JsonObject alarmsObject = doc["alarms"].as<JsonObject>();
    if (alarmsObject.isNull())
    {
        return true;
    }

    definitionCount = alarmsObject.size();
    if (definitionCount <= 0)
    {
        definitionCount = 0;
        return true;
    }

    definitions = new AlarmDefinition[definitionCount];
    states = new AlarmRuntimeState[definitionCount];
    recentEventCapacity = 16;
    recentEvents = new AlarmEventRecord[recentEventCapacity];
    if (definitions == nullptr || states == nullptr || recentEvents == nullptr)
    {
        errorMessage = "Failed to allocate alarm runtime";
        reset();
        return false;
    }

    int index = 0;
    for (JsonPair pair : alarmsObject)
    {
        JsonObject alarmObject = pair.value().as<JsonObject>();
        AlarmDefinition &definition = definitions[index];
        AlarmRuntimeState &state = states[index];

        definition.id = pair.key().c_str();
        definition.label = alarmObject["label"] | definition.id;
        definition.sourceSignalId = alarmObject["source_signal"] | "";
        definition.enableSignalId = alarmObject["enable_signal"] | "";
        definition.severity = alarmObject["severity"] | "warning";
        definition.delayMs = alarmObject["delay_ms"] | 0UL;
        definition.latched = alarmObject["latched"] | false;
        definition.ackRequired = alarmObject["ack_required"] | true;

        state.condition = false;
        state.pending = false;
        state.active = false;
        state.suppressed = false;
        state.acknowledged = !definition.ackRequired;
        state.pendingSinceMs = 0;
        state.activeSinceMs = 0;
        state.lastChangeMs = 0;
        state.statusText = "idle";
        index++;
    }

    return true;
}

void AlarmManager::pushEvent(const AlarmDefinition &definition, const String &type, const String &text)
{
    if (recentEvents == nullptr || recentEventCapacity <= 0)
    {
        return;
    }

    const int targetIndex = (recentEventStart + recentEventCount) % recentEventCapacity;
    AlarmEventRecord &eventRecord = recentEvents[targetIndex];
    eventRecord.timestampMs = millis();
    eventRecord.alarmId = definition.id;
    eventRecord.type = type;
    eventRecord.severity = definition.severity;
    eventRecord.text = text;

    if (recentEventCount < recentEventCapacity)
    {
        recentEventCount++;
    }
    else
    {
        recentEventStart = (recentEventStart + 1) % recentEventCapacity;
    }
}

void AlarmManager::update()
{
    const uint32_t now = millis();

    for (int i = 0; i < definitionCount; i++)
    {
        const AlarmDefinition &definition = definitions[i];
        AlarmRuntimeState &state = states[i];

        const bool enabled = definition.enableSignalId.isEmpty()
            ? true
            : gSignals.readBinary(definition.enableSignalId, false);
        const bool condition = enabled && gSignals.readBinary(definition.sourceSignalId, false);

        state.suppressed = !enabled;
        state.condition = condition;

        if (!enabled)
        {
            if (!definition.latched)
            {
                state.pending = false;
                state.active = false;
                state.pendingSinceMs = 0;
                state.activeSinceMs = 0;
            }
            state.statusText = defaultAlarmStatus(state.active, state.pending, true);
            continue;
        }

        if (condition)
        {
            if (!state.active)
            {
                if (!state.pending)
                {
                    state.pending = true;
                    state.pendingSinceMs = now;
                    state.statusText = "pending";
                }
                const bool delayDone = definition.delayMs == 0 || (now - state.pendingSinceMs) >= definition.delayMs;
                if (delayDone)
                {
                    const bool firstActivation = !state.active;
                    state.pending = false;
                    state.active = true;
                    state.acknowledged = !definition.ackRequired;
                    state.activeSinceMs = now;
                    state.lastChangeMs = now;
                    state.statusText = "active";
                    if (firstActivation)
                    {
                        pushEvent(definition, "active", definition.label + " active");
                    }
                }
            }
            else
            {
                state.statusText = "active";
            }
            continue;
        }

        state.pending = false;
        state.pendingSinceMs = 0;

        if (state.active)
        {
            const bool canClear = !definition.latched || !definition.ackRequired || state.acknowledged;
            if (canClear)
            {
                state.active = false;
                state.activeSinceMs = 0;
                state.lastChangeMs = now;
                state.statusText = "idle";
                if (definition.ackRequired)
                {
                    state.acknowledged = false;
                }
                pushEvent(definition, "clear", definition.label + " cleared");
            }
            else
            {
                state.statusText = "latched";
            }
        }
        else
        {
            state.statusText = "idle";
        }
    }
}

int AlarmManager::getCount() const
{
    return definitionCount;
}

int AlarmManager::getActiveCount() const
{
    int activeCount = 0;
    for (int i = 0; i < definitionCount; i++)
    {
        if (states[i].active)
        {
            activeCount++;
        }
    }
    return activeCount;
}

int AlarmManager::getPendingCount() const
{
    int pendingCount = 0;
    for (int i = 0; i < definitionCount; i++)
    {
        if (states[i].pending)
        {
            pendingCount++;
        }
    }
    return pendingCount;
}

int AlarmManager::getUnackedCount() const
{
    int unackedCount = 0;
    for (int i = 0; i < definitionCount; i++)
    {
        if (definitions[i].ackRequired && states[i].active && !states[i].acknowledged)
        {
            unackedCount++;
        }
    }
    return unackedCount;
}

const AlarmDefinition *AlarmManager::getDefinitionAt(int index) const
{
    if (index < 0 || index >= definitionCount) return nullptr;
    return &definitions[index];
}

const AlarmRuntimeState *AlarmManager::getStateAt(int index) const
{
    if (index < 0 || index >= definitionCount) return nullptr;
    return &states[index];
}

const AlarmDefinition *AlarmManager::getLatestActiveDefinition() const
{
    int latestIndex = -1;
    uint32_t latestSinceMs = 0;

    for (int i = 0; i < definitionCount; i++)
    {
        if (!states[i].active)
        {
            continue;
        }

        if (latestIndex < 0 || states[i].activeSinceMs >= latestSinceMs)
        {
            latestIndex = i;
            latestSinceMs = states[i].activeSinceMs;
        }
    }

    return latestIndex >= 0 ? &definitions[latestIndex] : nullptr;
}

const AlarmRuntimeState *AlarmManager::getLatestActiveState() const
{
    int latestIndex = -1;
    uint32_t latestSinceMs = 0;

    for (int i = 0; i < definitionCount; i++)
    {
        if (!states[i].active)
        {
            continue;
        }

        if (latestIndex < 0 || states[i].activeSinceMs >= latestSinceMs)
        {
            latestIndex = i;
            latestSinceMs = states[i].activeSinceMs;
        }
    }

    return latestIndex >= 0 ? &states[latestIndex] : nullptr;
}

int AlarmManager::getRecentEventCount() const
{
    return recentEventCount;
}

const AlarmEventRecord *AlarmManager::getRecentEventAt(int index) const
{
    if (index < 0 || index >= recentEventCount) return nullptr;
    const int realIndex = (recentEventStart + index) % recentEventCapacity;
    return &recentEvents[realIndex];
}

bool AlarmManager::acknowledge(const String &alarmId)
{
    for (int i = 0; i < definitionCount; i++)
    {
        if (definitions[i].id != alarmId) continue;
        states[i].acknowledged = true;
        states[i].lastChangeMs = millis();
        states[i].statusText = states[i].active ? "acknowledged" : "idle";
        pushEvent(definitions[i], "ack", definitions[i].label + " acknowledged");
        if (!states[i].condition && definitions[i].latched)
        {
            states[i].active = false;
            states[i].activeSinceMs = 0;
            states[i].statusText = "idle";
            pushEvent(definitions[i], "clear", definitions[i].label + " cleared");
        }
        return true;
    }
    return false;
}

void AlarmManager::acknowledgeAll()
{
    for (int i = 0; i < definitionCount; i++)
    {
        if (states[i].active || definitions[i].latched)
        {
            acknowledge(definitions[i].id);
        }
    }
}
