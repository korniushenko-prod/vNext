#include "signal_registry.h"

#include <ArduinoJson.h>

#include "../config/config_loader.h"
#include "../core/resource_manager.h"
#include "comms_registry.h"

SignalRegistry gSignals;

bool SignalRegistry::ensureSignalStorage()
{
    if (signals)
    {
        return true;
    }

    signals = new SignalRecord[MAX_SIGNALS];
    return signals != nullptr;
}

static bool loadRuntimeConfigDocument(JsonDocument &doc)
{
    return loadConfigDocumentFromStorage(doc);
}

static bool hasAnalogMetadata(JsonObject channelObject)
{
    if (channelObject.isNull())
    {
        return false;
    }

    return !channelObject["profile"].isNull() ||
        !channelObject["units"].isNull() ||
        !channelObject["raw_min"].isNull() ||
        !channelObject["raw_max"].isNull() ||
        !channelObject["eng_min"].isNull() ||
        !channelObject["eng_max"].isNull() ||
        !channelObject["offset"].isNull() ||
        !channelObject["scale"].isNull() ||
        !channelObject["clamp_min"].isNull() ||
        !channelObject["clamp_max"].isNull() ||
        !channelObject["filter"].isNull() ||
        !channelObject["filter_alpha"].isNull() ||
        !channelObject["clamp_enabled"].isNull();
}

static float mapRawToEngineering(float raw, const AnalogSignalRuntimeConfig &cfg)
{
    float engineeringValue = raw;
    const float rawSpan = cfg.rawMax - cfg.rawMin;
    if (rawSpan != 0.0f)
    {
        const float normalized = (raw - cfg.rawMin) / rawSpan;
        engineeringValue = cfg.engMin + normalized * (cfg.engMax - cfg.engMin);
    }
    engineeringValue = engineeringValue * cfg.scale + cfg.offset;
    return engineeringValue;
}

const char* signalClassToString(SignalClass value)
{
    switch (value)
    {
        case SignalClass::Binary: return "binary";
        case SignalClass::Analog: return "analog";
        case SignalClass::Counter: return "counter";
        case SignalClass::Enum: return "enum";
        case SignalClass::Text: return "text";
        default: return "binary";
    }
}

const char* signalDirectionToString(SignalDirection value)
{
    switch (value)
    {
        case SignalDirection::Input: return "input";
        case SignalDirection::Output: return "output";
        case SignalDirection::Internal: return "internal";
        case SignalDirection::Command: return "command";
        case SignalDirection::Status: return "status";
        default: return "internal";
    }
}

const char* signalSourceTypeToString(SignalSourceType value)
{
    switch (value)
    {
        case SignalSourceType::LocalDI: return "local_di";
        case SignalSourceType::LocalDOFeedback: return "local_do_feedback";
        case SignalSourceType::LocalAI: return "local_ai";
        case SignalSourceType::LocalAOFeedback: return "local_ao_feedback";
        case SignalSourceType::Counter: return "counter";
        case SignalSourceType::Frequency: return "frequency";
        case SignalSourceType::ModbusRegister: return "modbus_register";
        case SignalSourceType::SerialParser: return "serial_parser";
        case SignalSourceType::CanValue: return "can_value";
        case SignalSourceType::ExternalADC: return "external_adc";
        case SignalSourceType::ExternalDAC: return "external_dac";
        case SignalSourceType::Virtual: return "virtual";
        case SignalSourceType::Manual: return "manual";
        case SignalSourceType::Substituted: return "substituted";
        case SignalSourceType::BlockOutput: return "block_output";
        default: return "virtual";
    }
}

const char* signalQualityToString(SignalQuality value)
{
    switch (value)
    {
        case SignalQuality::Uninitialized: return "uninitialized";
        case SignalQuality::Good: return "good";
        case SignalQuality::Stale: return "stale";
        case SignalQuality::Substituted: return "substituted";
        case SignalQuality::Fault: return "fault";
        case SignalQuality::OutOfRange: return "out_of_range";
        default: return "uninitialized";
    }
}

const char* signalModeToString(SignalMode value)
{
    switch (value)
    {
        case SignalMode::Auto: return "auto";
        case SignalMode::Manual: return "manual";
        case SignalMode::Local: return "local";
        case SignalMode::Remote: return "remote";
        case SignalMode::Service: return "service";
        default: return "auto";
    }
}

static SignalClass signalClassFromChannelType(ChannelType type)
{
    switch (type)
    {
        case ChannelType::AI:
            return SignalClass::Analog;
        case ChannelType::DI:
        case ChannelType::DO:
            return SignalClass::Binary;
        case ChannelType::Counter:
            return SignalClass::Counter;
        default:
            return SignalClass::Analog;
    }
}

static SignalDirection signalDirectionFromChannelType(ChannelType type)
{
    switch (type)
    {
        case ChannelType::DI:
        case ChannelType::AI:
        case ChannelType::Counter:
            return SignalDirection::Input;
        case ChannelType::DO:
        case ChannelType::AO:
        case ChannelType::PWM:
            return SignalDirection::Output;
        default:
            return SignalDirection::Internal;
    }
}

static SignalSourceType signalSourceTypeFromChannelType(ChannelType type)
{
    switch (type)
    {
        case ChannelType::DI:
            return SignalSourceType::LocalDI;
        case ChannelType::DO:
            return SignalSourceType::LocalDOFeedback;
        case ChannelType::AI:
            return SignalSourceType::LocalAI;
        case ChannelType::AO:
            return SignalSourceType::LocalAOFeedback;
        case ChannelType::Counter:
            return SignalSourceType::Counter;
        default:
            return SignalSourceType::Virtual;
    }
}

void SignalRegistry::reset()
{
    if (!ensureSignalStorage())
    {
        signalCount = 0;
        analogConfigCount = 0;
        return;
    }

    if (analogConfigs)
    {
        delete[] analogConfigs;
        analogConfigs = nullptr;
    }
    signalCount = 0;
    analogConfigCount = 0;
}

void SignalRegistry::initializeRecordState(SignalRecord &record, const String &statusText)
{
    record.state.rawValue = 0;
    record.state.engineeringValue = 0;
    record.state.boolValue = false;
    record.state.quality = SignalQuality::Uninitialized;
    record.state.mode = SignalMode::Auto;
    record.state.hasManualOverride = false;
    record.state.hasSubstitution = false;
    record.state.stale = false;
    record.state.timestampMs = 0;
    record.state.statusText = statusText;
}

SignalRecord* SignalRegistry::addSignal(const ChannelConfig &channel)
{
    if (!ensureSignalStorage())
    {
        return nullptr;
    }

    if (signalCount >= MAX_SIGNALS)
    {
        return nullptr;
    }

    SignalRecord &record = signals[signalCount++];
    record.definition.id = channel.id;
    record.definition.label = channel.id;
    record.definition.signalClass = signalClassFromChannelType(channel.type);
    record.definition.direction = signalDirectionFromChannelType(channel.type);
    record.definition.sourceType = signalSourceTypeFromChannelType(channel.type);
    record.definition.derivedType = "resource";
    record.definition.sourceSignalId = "";
    record.definition.substituteSignalId = "";
    record.definition.enableSignalId = "";
    record.definition.units = (channel.type == ChannelType::AI) ? "raw" : "";
    record.definition.resourceId = channel.resourceId;
    record.definition.channelType = channel.type;
    record.definition.visibleInUi = true;
    record.definition.resourceBacked = true;

    initializeRecordState(record, "configured");
    return &record;
}

SignalRecord* SignalRegistry::addSignal(const SignalConfig &signal)
{
    if (!ensureSignalStorage())
    {
        return nullptr;
    }

    if (signalCount >= MAX_SIGNALS)
    {
        return nullptr;
    }

    const SignalRecord *sourceRecord = find(signal.sourceSignalId);

    SignalRecord &record = signals[signalCount++];
    record.definition.id = signal.id;
    record.definition.label = signal.label.length() > 0 ? signal.label : signal.id;
    record.definition.signalClass = sourceRecord ? sourceRecord->definition.signalClass : SignalClass::Analog;
    record.definition.direction = sourceRecord ? sourceRecord->definition.direction : SignalDirection::Internal;
    record.definition.sourceType = SignalSourceType::Substituted;
    record.definition.derivedType = signal.type;
    record.definition.sourceSignalId = signal.sourceSignalId;
    record.definition.substituteSignalId = signal.substituteSignalId;
    record.definition.enableSignalId = signal.enableSignalId;
    record.definition.units = signal.units;
    record.definition.resourceId = "";
    record.definition.channelType = ChannelType::Unknown;
    record.definition.visibleInUi = true;
    record.definition.resourceBacked = false;

    initializeRecordState(record, "configured");
    return &record;
}

SignalRecord* SignalRegistry::addDerivedSignal(const String &signalId, const String &label, SignalClass signalClass,
    SignalDirection direction, SignalSourceType sourceType, const String &units)
{
    if (!ensureSignalStorage())
    {
        return nullptr;
    }

    if (signalCount >= MAX_SIGNALS)
    {
        return nullptr;
    }

    SignalRecord &record = signals[signalCount++];
    record.definition.id = signalId;
    record.definition.label = label.length() > 0 ? label : signalId;
    record.definition.signalClass = signalClass;
    record.definition.direction = direction;
    record.definition.sourceType = sourceType;
    record.definition.derivedType = "derived";
    record.definition.sourceSignalId = "";
    record.definition.substituteSignalId = "";
    record.definition.enableSignalId = "";
    record.definition.units = units;
    record.definition.resourceId = "";
    record.definition.channelType = ChannelType::Unknown;
    record.definition.visibleInUi = true;
    record.definition.resourceBacked = false;

    initializeRecordState(record, "derived");
    return &record;
}

SignalRecord* SignalRegistry::findMutable(const String &signalId)
{
    if (!signals)
    {
        return nullptr;
    }

    for (int i = 0; i < signalCount; i++)
    {
        if (signals[i].definition.id == signalId)
        {
            return &signals[i];
        }
    }

    return nullptr;
}

SignalRecord* SignalRegistry::getMutableAt(int index)
{
    if (!signals)
    {
        return nullptr;
    }

    if (index < 0 || index >= signalCount)
    {
        return nullptr;
    }

    return &signals[index];
}

AnalogSignalRuntimeConfig* SignalRegistry::findAnalogConfig(int signalIndex)
{
    for (int i = 0; i < analogConfigCount; i++)
    {
        if (analogConfigs[i].signalIndex == signalIndex)
        {
            return &analogConfigs[i];
        }
    }

    return nullptr;
}

bool SignalRegistry::configureFromConfig(String &errorMessage)
{
    SignalRecord *preservedDerivedSignals = new SignalRecord[MAX_SIGNALS];
    if (!preservedDerivedSignals)
    {
        errorMessage = "Failed to allocate signal preservation buffer";
        return false;
    }

    JsonDocument configDoc;
    bool haveConfigDoc = loadRuntimeConfigDocument(configDoc);
    JsonObject configChannels = haveConfigDoc ? configDoc["channels"].as<JsonObject>() : JsonObject();
    int analogCapacity = 0;
    for (int i = 0; i < gConfig.channelCount; i++)
    {
        if (gConfig.channels[i].type == ChannelType::AI || gConfig.channels[i].type == ChannelType::AO)
        {
            analogCapacity++;
        }
    }

    AnalogSignalRuntimeConfig *newAnalogConfigs = nullptr;
    if (analogCapacity > 0)
    {
        newAnalogConfigs = new AnalogSignalRuntimeConfig[analogCapacity];
        if (!newAnalogConfigs)
        {
            delete[] preservedDerivedSignals;
            errorMessage = "Failed to allocate analog runtime config buffer";
            return false;
        }
    }

    int derivedCount = 0;

    for (int i = 0; i < signalCount; i++)
    {
        if (!signals[i].definition.resourceBacked && derivedCount < MAX_SIGNALS)
        {
            preservedDerivedSignals[derivedCount++] = signals[i];
        }
    }

    reset();
    analogConfigs = newAnalogConfigs;

    for (int i = 0; i < derivedCount; i++)
    {
        signals[signalCount++] = preservedDerivedSignals[i];
    }

    for (int i = 0; i < gConfig.channelCount; i++)
    {
        SignalRecord *record = addSignal(gConfig.channels[i]);
        if (!record)
        {
            delete[] preservedDerivedSignals;
            errorMessage = "Too many signals for registry";
            return false;
        }

        if (gConfig.channels[i].type == ChannelType::AI || gConfig.channels[i].type == ChannelType::AO)
        {
            JsonObject configChannel = configChannels.isNull() ? JsonObject() : configChannels[gConfig.channels[i].id].as<JsonObject>();
            if (!configChannel.isNull() && hasAnalogMetadata(configChannel) && analogConfigCount < MAX_CHANNELS)
            {
                AnalogSignalRuntimeConfig &cfg = analogConfigs[analogConfigCount++];
                cfg.signalIndex = signalCount - 1;
                cfg.configured = true;
                cfg.emaEnabled = String(configChannel["filter"] | "none") == "ema";
                cfg.clampEnabled = configChannel["clamp_enabled"] | false;
                cfg.initialized = false;
                cfg.rawMin = configChannel["raw_min"] | 0.0f;
                cfg.rawMax = configChannel["raw_max"] | 4095.0f;
                cfg.engMin = configChannel["eng_min"] | 0.0f;
                cfg.engMax = configChannel["eng_max"] | 100.0f;
                cfg.offset = configChannel["offset"] | 0.0f;
                cfg.scale = configChannel["scale"] | 1.0f;
                cfg.clampMin = configChannel["clamp_min"] | 0.0f;
                cfg.clampMax = configChannel["clamp_max"] | 100.0f;
                cfg.filterAlpha = configChannel["filter_alpha"] | 0.2f;
                cfg.filteredValue = 0.0f;
                record->definition.units = String(configChannel["units"] | "");
                if (record->definition.units.isEmpty())
                {
                    record->definition.units = (gConfig.channels[i].type == ChannelType::AO) ? "ao" : "raw";
                }
            }
            else
            {
                record->definition.units = (gConfig.channels[i].type == ChannelType::AO) ? "ao" : "raw";
            }
        }
    }

    for (int i = 0; i < gConfig.signalCount; i++)
    {
        if (!addSignal(gConfig.signals[i]))
        {
            delete[] preservedDerivedSignals;
            errorMessage = "Too many signals for registry";
            return false;
        }
    }

    delete[] preservedDerivedSignals;
    errorMessage = "";
    return true;
}

bool SignalRegistry::registerDerivedSignal(const String &signalId, const String &label, SignalClass signalClass,
    SignalDirection direction, SignalSourceType sourceType, const String &units)
{
    SignalRecord *existing = findMutable(signalId);
    if (existing)
    {
        existing->definition.label = label.length() > 0 ? label : signalId;
        existing->definition.signalClass = signalClass;
        existing->definition.direction = direction;
        existing->definition.sourceType = sourceType;
        existing->definition.units = units;
        existing->definition.resourceBacked = false;
        return true;
    }

    return addDerivedSignal(signalId, label, signalClass, direction, sourceType, units) != nullptr;
}

bool SignalRegistry::publishAnalog(const String &signalId, float rawValue, float engineeringValue,
    SignalQuality quality, const String &statusText)
{
    SignalRecord *record = findMutable(signalId);
    if (!record)
    {
        return false;
    }

    record->state.rawValue = rawValue;
    record->state.engineeringValue = engineeringValue;
    record->state.boolValue = engineeringValue > 0.5f;
    record->state.quality = quality;
    record->state.stale = (quality == SignalQuality::Stale);
    record->state.timestampMs = millis();
    record->state.statusText = statusText;
    return true;
}

bool SignalRegistry::publishAnalogAt(int index, float rawValue, float engineeringValue,
    SignalQuality quality, const String &statusText)
{
    SignalRecord *record = getMutableAt(index);
    if (!record)
    {
        return false;
    }

    record->state.rawValue = rawValue;
    record->state.engineeringValue = engineeringValue;
    record->state.boolValue = engineeringValue > 0.5f;
    record->state.quality = quality;
    record->state.stale = (quality == SignalQuality::Stale);
    record->state.timestampMs = millis();
    record->state.statusText = statusText;
    return true;
}

bool SignalRegistry::publishBinary(const String &signalId, bool value,
    SignalQuality quality, const String &statusText)
{
    SignalRecord *record = findMutable(signalId);
    if (!record)
    {
        return false;
    }

    record->state.boolValue = value;
    record->state.rawValue = value ? 1.0f : 0.0f;
    record->state.engineeringValue = record->state.rawValue;
    record->state.quality = quality;
    record->state.stale = (quality == SignalQuality::Stale);
    record->state.timestampMs = millis();
    record->state.statusText = statusText;
    return true;
}

bool SignalRegistry::publishBinaryAt(int index, bool value,
    SignalQuality quality, const String &statusText)
{
    SignalRecord *record = getMutableAt(index);
    if (!record)
    {
        return false;
    }

    record->state.boolValue = value;
    record->state.rawValue = value ? 1.0f : 0.0f;
    record->state.engineeringValue = record->state.rawValue;
    record->state.quality = quality;
    record->state.stale = (quality == SignalQuality::Stale);
    record->state.timestampMs = millis();
    record->state.statusText = statusText;
    return true;
}

bool SignalRegistry::unregisterSignal(const String &signalId)
{
    for (int i = 0; i < signalCount; i++)
    {
        if (signals[i].definition.id != signalId)
        {
            continue;
        }

        if (signals[i].definition.resourceBacked)
        {
            return false;
        }

        for (int j = i; j < signalCount - 1; j++)
        {
            signals[j] = signals[j + 1];
        }

        signalCount--;
        return true;
    }

    return false;
}

void SignalRegistry::updateFromRuntime()
{
    const uint32_t now = millis();

    for (int i = 0; i < signalCount; i++)
    {
        SignalRecord &record = signals[i];
        SignalQuality quality = SignalQuality::Good;
        String statusText = "ok";

        if (!record.definition.resourceBacked)
        {
            continue;
        }

        if (!gResources.hasChannel(record.definition.id))
        {
            record.state.quality = SignalQuality::Fault;
            record.state.statusText = "runtime channel missing";
            record.state.stale = true;
            continue;
        }

        const ExternalResourceConfig *externalResource = findExternalResourceConfig(record.definition.resourceId);
        const ExternalResourceRuntimeState *externalState = externalResource
            ? gComms.findExternalResourceState(record.definition.resourceId)
            : nullptr;

        if (externalState)
        {
            if (externalState->quality == "fault" || externalState->status == "missing_device")
            {
                quality = SignalQuality::Fault;
            }
            else if (externalState->quality == "stale")
            {
                quality = SignalQuality::Stale;
            }

            if (externalState->status.length() > 0)
            {
                statusText = externalState->status;
            }
        }

        switch (record.definition.channelType)
        {
            case ChannelType::AI:
            {
                record.state.rawValue = static_cast<float>(gResources.readAnalog(record.definition.id));
                record.state.engineeringValue = record.state.rawValue;
                AnalogSignalRuntimeConfig *cfg = findAnalogConfig(i);
                if (cfg && cfg->configured)
                {
                    const float raw = record.state.rawValue;
                    record.state.engineeringValue = mapRawToEngineering(raw, *cfg);

                    if (cfg->emaEnabled)
                    {
                        float alpha = cfg->filterAlpha;
                        if (alpha < 0.0f) alpha = 0.0f;
                        if (alpha > 1.0f) alpha = 1.0f;
                        if (!cfg->initialized)
                        {
                            cfg->filteredValue = record.state.engineeringValue;
                            cfg->initialized = true;
                        }
                        else
                        {
                            cfg->filteredValue = cfg->filteredValue + alpha * (record.state.engineeringValue - cfg->filteredValue);
                        }
                        record.state.engineeringValue = cfg->filteredValue;
                    }

                    const float minRaw = cfg->rawMin < cfg->rawMax ? cfg->rawMin : cfg->rawMax;
                    const float maxRaw = cfg->rawMin < cfg->rawMax ? cfg->rawMax : cfg->rawMin;
                    if (raw < minRaw || raw > maxRaw)
                    {
                        if (quality != SignalQuality::Fault && quality != SignalQuality::Stale)
                        {
                            quality = SignalQuality::OutOfRange;
                        }
                        statusText = "raw out of range";
                    }

                    if (cfg->clampEnabled)
                    {
                        bool clamped = false;
                        if (record.state.engineeringValue < cfg->clampMin)
                        {
                            record.state.engineeringValue = cfg->clampMin;
                            clamped = true;
                        }
                        if (record.state.engineeringValue > cfg->clampMax)
                        {
                            record.state.engineeringValue = cfg->clampMax;
                            clamped = true;
                        }
                        if (clamped)
                        {
                            statusText = (quality == SignalQuality::OutOfRange) ? "out of range, clamped" : "clamped";
                        }
                    }
                }
                record.state.boolValue = record.state.engineeringValue > 0.5f;
                break;
            }

            case ChannelType::AO:
            {
                record.state.rawValue = static_cast<float>(gResources.readAnalog(record.definition.id));
                record.state.engineeringValue = record.state.rawValue;
                AnalogSignalRuntimeConfig *cfg = findAnalogConfig(i);
                if (cfg && cfg->configured)
                {
                    record.state.engineeringValue = mapRawToEngineering(record.state.rawValue, *cfg);
                    if (record.definition.units.isEmpty())
                    {
                        record.definition.units = "ao";
                    }
                }
                record.state.boolValue = record.state.engineeringValue > 0.5f;
                if (!externalState)
                {
                    statusText = "ao feedback";
                }
                break;
            }

            case ChannelType::DI:
            case ChannelType::DO:
            default:
                record.state.boolValue = gResources.readDigital(record.definition.id);
                record.state.rawValue = record.state.boolValue ? 1.0f : 0.0f;
                record.state.engineeringValue = record.state.rawValue;
                break;
        }

        record.state.quality = quality;
        record.state.stale = (quality == SignalQuality::Stale);
        record.state.timestampMs = now;
        record.state.statusText = statusText;
    }

    updateDerivedSignals();
}

bool SignalRegistry::readBinary(const String &signalId, bool defaultValue) const
{
    const SignalRecord *record = find(signalId);
    if (!record)
    {
        return defaultValue;
    }

    return record->state.boolValue;
}

bool SignalRegistry::readBinaryAt(int index, bool defaultValue) const
{
    const SignalRecord *record = getAt(index);
    if (!record)
    {
        return defaultValue;
    }

    return record->state.boolValue;
}

float SignalRegistry::readAnalog(const String &signalId, float defaultValue) const
{
    const SignalRecord *record = find(signalId);
    if (!record)
    {
        return defaultValue;
    }

    return record->state.engineeringValue;
}

float SignalRegistry::readAnalogAt(int index, float defaultValue) const
{
    const SignalRecord *record = getAt(index);
    if (!record)
    {
        return defaultValue;
    }

    return record->state.engineeringValue;
}

void SignalRegistry::updateDerivedSignals()
{
    for (int i = 0; i < signalCount; i++)
    {
        SignalRecord &record = signals[i];
        if (record.definition.resourceBacked)
        {
            continue;
        }

        if (record.definition.derivedType == "substitute")
        {
            const SignalRecord *source = find(record.definition.sourceSignalId);
            const SignalRecord *substitute = find(record.definition.substituteSignalId);
            bool enabled = readBinary(record.definition.enableSignalId, false);

            if (!source)
            {
                record.state.quality = SignalQuality::Fault;
                record.state.statusText = "missing source";
                record.state.stale = true;
                continue;
            }

            const SignalRecord *selected = (enabled && substitute) ? substitute : source;
            record.state.rawValue = selected->state.rawValue;
            record.state.engineeringValue = selected->state.engineeringValue;
            record.state.boolValue = selected->state.boolValue;
            record.state.timestampMs = millis();
            record.state.stale = false;
            record.state.hasSubstitution = enabled && substitute;
            record.state.quality = selected->state.quality;
            if (enabled && substitute)
            {
                record.state.statusText = "substituted";
            }
            else if (enabled && !substitute)
            {
                record.state.statusText = "substitute requested but missing";
                record.state.quality = SignalQuality::Fault;
                record.state.stale = true;
            }
            else
            {
                record.state.statusText = "source";
            }
            continue;
        }

        if (record.definition.derivedType == "derived")
        {
            continue;
        }

        record.state.quality = SignalQuality::Fault;
        record.state.statusText = "unknown derived type";
        record.state.stale = true;
    }
}

int SignalRegistry::getCount() const
{
    return signalCount;
}

int SignalRegistry::findIndex(const String &signalId) const
{
    if (!signals)
    {
        return -1;
    }

    for (int i = 0; i < signalCount; i++)
    {
        if (signals[i].definition.id == signalId)
        {
            return i;
        }
    }

    return -1;
}

const SignalRecord* SignalRegistry::getAt(int index) const
{
    if (!signals)
    {
        return nullptr;
    }

    if (index < 0 || index >= signalCount)
    {
        return nullptr;
    }

    return &signals[index];
}

const SignalRecord* SignalRegistry::find(const String &signalId) const
{
    if (!signals)
    {
        return nullptr;
    }

    for (int i = 0; i < signalCount; i++)
    {
        if (signals[i].definition.id == signalId)
        {
            return &signals[i];
        }
    }

    return nullptr;
}
