#pragma once

#include <Arduino.h>

#include "../config/config.h"
#include "signal_types.h"

constexpr int MAX_SIGNALS = MAX_CHANNELS + MAX_SIGNAL_DEFINITIONS + (MAX_TIMER_BLOCKS * 5) + MAX_BLOCKS + 16;

struct SignalDefinition {
    String id;
    String label;
    SignalClass signalClass;
    SignalDirection direction;
    SignalSourceType sourceType;
    String derivedType;
    String sourceSignalId;
    String substituteSignalId;
    String enableSignalId;
    String units;
    String resourceId;
    ChannelType channelType;
    bool visibleInUi;
    bool resourceBacked;
};

struct SignalState {
    float rawValue;
    float engineeringValue;
    bool boolValue;
    SignalQuality quality;
    SignalMode mode;
    bool hasManualOverride;
    bool hasSubstitution;
    bool stale;
    uint32_t timestampMs;
    String statusText;
};

struct SignalRecord {
    SignalDefinition definition;
    SignalState state;
};

struct AnalogSignalRuntimeConfig {
    int signalIndex;
    bool configured;
    bool emaEnabled;
    bool clampEnabled;
    bool initialized;
    float rawMin;
    float rawMax;
    float engMin;
    float engMax;
    float offset;
    float scale;
    float clampMin;
    float clampMax;
    float filterAlpha;
    float filteredValue;
};

class SignalRegistry {
public:
    void reset();
    bool configureFromConfig(String &errorMessage);
    void updateFromRuntime();
    bool registerDerivedSignal(const String &signalId, const String &label, SignalClass signalClass,
        SignalDirection direction, SignalSourceType sourceType, const String &units = "");
    bool publishAnalog(const String &signalId, float rawValue, float engineeringValue,
        SignalQuality quality = SignalQuality::Good, const String &statusText = "ok");
    bool publishBinary(const String &signalId, bool value,
        SignalQuality quality = SignalQuality::Good, const String &statusText = "ok");
    bool readBinary(const String &signalId, bool defaultValue = false) const;
    float readAnalog(const String &signalId, float defaultValue = 0.0f) const;
    int findIndex(const String &signalId) const;
    bool readBinaryAt(int index, bool defaultValue = false) const;
    float readAnalogAt(int index, float defaultValue = 0.0f) const;
    bool publishAnalogAt(int index, float rawValue, float engineeringValue,
        SignalQuality quality = SignalQuality::Good, const String &statusText = "ok");
    bool publishBinaryAt(int index, bool value,
        SignalQuality quality = SignalQuality::Good, const String &statusText = "ok");
    bool unregisterSignal(const String &signalId);

    int getCount() const;
    const SignalRecord* getAt(int index) const;
    const SignalRecord* find(const String &signalId) const;

private:
    SignalRecord *signals = nullptr;
    int signalCount = 0;
    AnalogSignalRuntimeConfig *analogConfigs = nullptr;
    int analogConfigCount = 0;

    bool ensureSignalStorage();
    SignalRecord* addSignal(const ChannelConfig &channel);
    SignalRecord* addSignal(const SignalConfig &signal);
    SignalRecord* addDerivedSignal(const String &signalId, const String &label, SignalClass signalClass,
        SignalDirection direction, SignalSourceType sourceType, const String &units);
    SignalRecord* findMutable(const String &signalId);
    SignalRecord* getMutableAt(int index);
    AnalogSignalRuntimeConfig* findAnalogConfig(int signalIndex);
    void initializeRecordState(SignalRecord &record, const String &statusText);
    void updateDerivedSignals();
};

extern SignalRegistry gSignals;
