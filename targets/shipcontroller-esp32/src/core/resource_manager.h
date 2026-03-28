#pragma once

#include <Arduino.h>
#include "../config/config.h"
#include "../channels/digital_input.h"
#include "../channels/digital_output.h"
#include "../channels/analog_input.h"

struct InputProbeResult {
    bool valid;
    bool expectedInternalPullup;
    bool observedPullupEffect;
    int withoutPullupHighCount;
    int withPullupHighCount;
    String classification;
};

struct AnalogProbeResult {
    bool valid;
    int lastRaw;
    int minRaw;
    int maxRaw;
    int averageRaw;
    int spanRaw;
    String classification;
};

struct ResourceBinding {
    String channelId;
    String resourceId;
    bool external;
    int externalResourceIndex;
    int gpio;
    ChannelType type;
    bool inverted;
    bool initial;
    bool pullup;
    bool active;
    bool externalDigitalValue;
    uint16_t externalAnalogRaw;
    bool analogOutputCapable;
    uint16_t analogOutputRaw;
    DigitalInputChannel digitalInput;
    DigitalOutputChannel digitalOutput;
    AnalogInputChannel analogInput;
    InputProbeResult inputProbe;
    AnalogProbeResult analogProbe;
};

class ResourceManager {
public:
    void reset();
    bool configureFromConfig(String &errorMessage);
    void initHardware();
    void update();
    void runInputDiagnostics();
    void runAnalogDiagnostics(int samples = 16, int delayMs = 2);

    bool readDigital(const String &channelId) const;
    void writeDigital(const String &channelId, bool value);
    int readAnalog(const String &channelId) const;
    void writeAnalog(const String &channelId, int rawValue);
    bool hasChannel(const String &channelId) const;
    int getBindingCount() const;
    const ResourceBinding* getBindingAt(int index) const;
    bool probeDigitalInput(const String &channelId, InputProbeResult &result);
    bool probeAnalogInput(const String &channelId, AnalogProbeResult &result, int samples = 16, int delayMs = 2);

private:
    ResourceBinding bindings[MAX_CHANNELS];
    int bindingCount = 0;

    ResourceBinding* findBinding(const String &channelId);
    const ResourceBinding* findBinding(const String &channelId) const;
};

extern ResourceManager gResources;
