#pragma once

#include <Arduino.h>

struct AlarmDefinition {
    String id;
    String label;
    String sourceSignalId;
    String enableSignalId;
    String severity;
    uint32_t delayMs;
    bool latched;
    bool ackRequired;
};

struct AlarmRuntimeState {
    bool condition;
    bool pending;
    bool active;
    bool suppressed;
    bool acknowledged;
    uint32_t pendingSinceMs;
    uint32_t activeSinceMs;
    uint32_t lastChangeMs;
    String statusText;
};

struct AlarmEventRecord {
    uint32_t timestampMs;
    String alarmId;
    String type;
    String severity;
    String text;
};

class AlarmManager {
public:
    AlarmManager();

    void reset();
    bool configureFromConfig(String &errorMessage);
    void update();

    int getCount() const;
    int getActiveCount() const;
    int getPendingCount() const;
    int getUnackedCount() const;
    const AlarmDefinition *getDefinitionAt(int index) const;
    const AlarmRuntimeState *getStateAt(int index) const;
    const AlarmDefinition *getLatestActiveDefinition() const;
    const AlarmRuntimeState *getLatestActiveState() const;

    int getRecentEventCount() const;
    const AlarmEventRecord *getRecentEventAt(int index) const;

    bool acknowledge(const String &alarmId);
    void acknowledgeAll();

private:
    void pushEvent(const AlarmDefinition &definition, const String &type, const String &text);

    AlarmDefinition *definitions;
    AlarmRuntimeState *states;
    int definitionCount;

    AlarmEventRecord *recentEvents;
    int recentEventCapacity;
    int recentEventCount;
    int recentEventStart;
};

extern AlarmManager gAlarms;
