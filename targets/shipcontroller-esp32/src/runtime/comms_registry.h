#pragma once

#include <Arduino.h>

#include "../config/config.h"

struct BusRuntimeState {
    bool initialized;
    String status;
    String lastError;
};

struct DeviceRuntimeState {
    bool online;
    uint32_t lastOkMs;
    uint32_t lastPollMs;
    int errorCount;
    String status;
};

struct ExternalResourceRuntimeState {
    bool online;
    String quality;
    String status;
    uint32_t timestampMs;
    int analogRaw;
    bool digitalValue;
};

struct VirtualAiDeviceSettings {
    String mode;
    int minRaw;
    int maxRaw;
    int manualRaw;
    uint32_t periodMs;
};

class CommsRegistry {
public:
    CommsRegistry();

    void reset();
    bool configureFromConfig(String &errorMessage);
    void update();

    int getBusCount() const;
    int getDeviceCount() const;
    int getExternalResourceCount() const;
    const BusRuntimeState *getBusStateAt(int index) const;
    const DeviceRuntimeState *getDeviceStateAt(int index) const;
    const ExternalResourceRuntimeState *getExternalResourceStateAt(int index) const;
    int findBusIndex(const String &busId) const;
    int findDeviceIndex(const String &deviceId) const;
    int findExternalResourceIndex(const String &resourceId) const;
    const ExternalResourceRuntimeState *findExternalResourceState(const String &resourceId) const;
    int readExternalAnalogRaw(const String &resourceId, int fallback = 0) const;
    bool readExternalDigitalValue(const String &resourceId, bool fallback = false) const;
    bool writeExternalAnalogRaw(const String &resourceId, int rawValue);
    bool writeExternalDigitalValue(const String &resourceId, bool value);

private:
    BusRuntimeState *busStates;
    uint8_t busCount;
    DeviceRuntimeState *deviceStates;
    uint8_t deviceCount;
    VirtualAiDeviceSettings *virtualAiSettings;
    ExternalResourceRuntimeState *externalResourceStates;
    uint8_t externalResourceCount;
};

extern CommsRegistry gComms;

const ExternalResourceConfig* findExternalResourceConfig(const String &resourceId);
bool externalResourceSupportsType(const ExternalResourceConfig &resource, ChannelType type);
