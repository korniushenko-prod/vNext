#include "resource_manager.h"

#include <ArduinoJson.h>

#include "../config/config_loader.h"
#include "board_manager.h"
#include "../templates/chip_template.h"
#include "../runtime/comms_registry.h"

ResourceManager gResources;

static bool loadResourceConfigDocument(JsonDocument &doc)
{
    return loadConfigDocumentFromStorage(doc);
}

static int computeAnalogOutputStartupRaw(JsonObject channelObject)
{
    const float rawMin = channelObject["raw_min"] | 0.0f;
    const float rawMax = channelObject["raw_max"] | 255.0f;
    const float engMin = channelObject["eng_min"] | 0.0f;
    const float engMax = channelObject["eng_max"] | 100.0f;
    const float offset = channelObject["offset"] | 0.0f;
    float scale = channelObject["scale"] | 1.0f;
    float startup = channelObject["startup_value"] | 0.0f;
    const bool clampEnabled = channelObject["clamp_enabled"] | false;
    const float clampMin = channelObject["clamp_min"] | engMin;
    const float clampMax = channelObject["clamp_max"] | engMax;

    if (clampEnabled)
    {
        if (startup < clampMin) startup = clampMin;
        if (startup > clampMax) startup = clampMax;
    }

    if (scale == 0.0f) scale = 1.0f;
    const float preScaled = (startup - offset) / scale;
    const float engSpan = engMax - engMin;
    float normalized = 0.0f;
    if (engSpan != 0.0f)
    {
        normalized = (preScaled - engMin) / engSpan;
    }

    float raw = rawMin + normalized * (rawMax - rawMin);
    if (rawMin < rawMax)
    {
        if (raw < rawMin) raw = rawMin;
        if (raw > rawMax) raw = rawMax;
    }
    else
    {
        if (raw < rawMax) raw = rawMax;
        if (raw > rawMin) raw = rawMin;
    }

    if (raw < 0.0f) raw = 0.0f;
    if (raw > 255.0f) raw = 255.0f;
    return static_cast<int>(raw + 0.5f);
}

static bool analogOutputHardwareCapable(int gpio)
{
    return gpio == 25 || gpio == 26;
}

static void applyAnalogOutput(const ResourceBinding &binding)
{
    if (!binding.analogOutputCapable)
    {
        return;
    }

    int outputValue = static_cast<int>(binding.analogOutputRaw);
    if (binding.inverted)
    {
        outputValue = 255 - outputValue;
    }
    if (outputValue < 0) outputValue = 0;
    if (outputValue > 255) outputValue = 255;
    dacWrite(binding.gpio, outputValue);
}

static int sampleHighCount(int gpio, int samples, int delayMs)
{
    int highCount = 0;

    for (int i = 0; i < samples; i++)
    {
        if (digitalRead(gpio) == HIGH)
        {
            highCount++;
        }
        delay(delayMs);
    }

    return highCount;
}

static String classifyProbe(int withoutPullupHighCount, int withPullupHighCount)
{
    if (withoutPullupHighCount <= 2 && withPullupHighCount >= 14)
    {
        return "pullup_effective_open_or_floating";
    }

    if (withoutPullupHighCount >= 14 && withPullupHighCount >= 14)
    {
        return "held_high_or_external_pullup";
    }

    if (withoutPullupHighCount <= 2 && withPullupHighCount <= 2)
    {
        return "held_low_or_pullup_not_effective";
    }

    if (withPullupHighCount - withoutPullupHighCount >= 8)
    {
        return "pullup_effective_but_input_is_noisy";
    }

    return "inconclusive_or_noisy";
}

static String classifyAnalogProbe(int minRaw, int maxRaw, int averageRaw)
{
    int span = maxRaw - minRaw;
    if (maxRaw <= 8) return "held_near_zero";
    if (minRaw >= 4087) return "held_near_full_scale";
    if (span <= 4) return "stable";
    if (span <= 24) return "slow_or_small_variation";
    if (span <= 120) return "active_signal";
    if (averageRaw > 3500 || averageRaw < 500) return "wide_span_near_rail";
    return "floating_or_noisy";
}

static const ChipTemplatePinConfig* findActiveChipTemplateConfigPin(int gpio)
{
    const ChipTemplateConfig *chipTemplate = getActiveChipTemplateConfig();
    if (!chipTemplate)
    {
        return nullptr;
    }

    for (int i = 0; i < chipTemplate->pinCount; i++)
    {
        if (chipTemplate->pins[i].gpio == gpio)
        {
            return &chipTemplate->pins[i];
        }
    }

    return nullptr;
}

void ResourceManager::reset()
{
    bindingCount = 0;
}

ResourceBinding* ResourceManager::findBinding(const String &channelId)
{
    for (int i = 0; i < bindingCount; i++)
    {
        if (bindings[i].channelId == channelId)
        {
            return &bindings[i];
        }
    }

    return nullptr;
}

const ResourceBinding* ResourceManager::findBinding(const String &channelId) const
{
    for (int i = 0; i < bindingCount; i++)
    {
        if (bindings[i].channelId == channelId)
        {
            return &bindings[i];
        }
    }

    return nullptr;
}

bool ResourceManager::configureFromConfig(String &errorMessage)
{
    reset();
    JsonDocument configDoc;
    bool haveConfigDoc = loadResourceConfigDocument(configDoc);
    JsonObject configChannels = haveConfigDoc ? configDoc["channels"].as<JsonObject>() : JsonObject();

    const BoardConfig *board = getActiveBoard();
    if (!board)
    {
        errorMessage = "Cannot configure resources: active board missing";
        return false;
    }

    for (int i = 0; i < gConfig.channelCount; i++)
    {
        if (bindingCount >= MAX_CHANNELS)
        {
            errorMessage = "Too many channel bindings";
            return false;
        }

        const ChannelConfig &channel = gConfig.channels[i];
        const BoardResourceConfig *resource = findBoardResource(*board, channel.resourceId);
        const ExternalResourceConfig *externalResource = findExternalResourceConfig(channel.resourceId);

        if (channel.type == ChannelType::Unknown)
        {
            errorMessage = "Channel " + channel.id + " has unknown type";
            return false;
        }

        if (!resource && !externalResource)
        {
            errorMessage = "Channel " + channel.id + " references missing resource " + channel.resourceId;
            return false;
        }

        if (resource && !resourceSupportsType(*resource, channel.type))
        {
            errorMessage = "Channel " + channel.id + " type " + String(channelTypeToString(channel.type)) +
                " is not supported by resource " + resource->id;
            return false;
        }

        if (externalResource && !externalResourceSupportsType(*externalResource, channel.type))
        {
            errorMessage = "Channel " + channel.id + " type " + String(channelTypeToString(channel.type)) +
                " is not supported by external resource " + externalResource->id;
            return false;
        }

        for (int j = 0; j < bindingCount; j++)
        {
            if (bindings[j].resourceId == channel.resourceId)
            {
                errorMessage = "Resource " + channel.resourceId + " is already bound to channel " + bindings[j].channelId;
                return false;
            }
        }

        ResourceBinding &binding = bindings[bindingCount++];
        binding.channelId = channel.id;
        binding.resourceId = channel.resourceId;
        binding.external = externalResource != nullptr;
        binding.externalResourceIndex = binding.external ? gComms.findExternalResourceIndex(channel.resourceId) : -1;
        binding.gpio = resource ? resource->gpio : -1;
        binding.type = channel.type;
        binding.inverted = channel.inverted;
        binding.initial = channel.initial;
        binding.pullup = channel.pullup;
        binding.active = true;
        binding.externalDigitalValue = channel.initial;
        binding.externalAnalogRaw = 0;
        binding.analogOutputCapable = false;
        binding.analogOutputRaw = 0;
        binding.inputProbe.valid = false;
        binding.inputProbe.expectedInternalPullup = false;
        binding.inputProbe.observedPullupEffect = false;
        binding.inputProbe.withoutPullupHighCount = 0;
        binding.inputProbe.withPullupHighCount = 0;
        binding.inputProbe.classification = "not_tested";
        binding.analogProbe.valid = false;
        binding.analogProbe.lastRaw = 0;
        binding.analogProbe.minRaw = 0;
        binding.analogProbe.maxRaw = 0;
        binding.analogProbe.averageRaw = 0;
        binding.analogProbe.spanRaw = 0;
        binding.analogProbe.classification = "not_tested";

        switch (binding.type)
        {
            case ChannelType::DI:
                if (!binding.external)
                {
                    binding.digitalInput.configure(binding.gpio, binding.inverted, binding.pullup);
                }
                break;

            case ChannelType::DO:
                if (!binding.external)
                {
                    binding.digitalOutput.configure(binding.gpio, binding.inverted, binding.initial);
                }
                break;

            case ChannelType::AI:
                if (!binding.external)
                {
                    binding.analogInput.configure(binding.gpio, binding.inverted);
                }
                break;

            case ChannelType::AO:
            {
                JsonObject configChannel = configChannels.isNull() ? JsonObject() : configChannels[channel.id].as<JsonObject>();
                const uint16_t startupRaw = static_cast<uint16_t>(computeAnalogOutputStartupRaw(configChannel));
                if (binding.external)
                {
                    binding.externalAnalogRaw = startupRaw;
                }
                else
                {
                    binding.analogOutputRaw = startupRaw;
                    binding.analogOutputCapable = analogOutputHardwareCapable(binding.gpio);
                }
                break;
            }

            default:
                break;
        }
    }

    errorMessage = "";
    return true;
}

void ResourceManager::initHardware()
{
    for (int i = 0; i < bindingCount; i++)
    {
        ResourceBinding &binding = bindings[i];

        switch (binding.type)
        {
            case ChannelType::DI:
                if (!binding.external)
                {
                    binding.digitalInput.init();
                }
                break;

            case ChannelType::DO:
                if (!binding.external)
                {
                    binding.digitalOutput.init();
                }
                break;

            case ChannelType::AI:
                if (!binding.external)
                {
                    binding.analogInput.init();
                }
                break;

            case ChannelType::AO:
                if (!binding.external)
                {
                    applyAnalogOutput(binding);
                }
                else
                {
                    writeAnalog(binding.channelId, static_cast<int>(binding.externalAnalogRaw));
                }
                break;

            default:
                break;
        }
    }
}

void ResourceManager::update()
{
    runAnalogDiagnostics(4, 0);
}

void ResourceManager::runInputDiagnostics()
{
    for (int i = 0; i < bindingCount; i++)
    {
        if (bindings[i].type != ChannelType::DI || bindings[i].external) continue;

        InputProbeResult result;
        if (probeDigitalInput(bindings[i].channelId, result))
        {
            bindings[i].inputProbe = result;
        }
    }
}

void ResourceManager::runAnalogDiagnostics(int samples, int delayMs)
{
    for (int i = 0; i < bindingCount; i++)
    {
        if (bindings[i].type != ChannelType::AI || bindings[i].external) continue;

        AnalogProbeResult result;
        if (probeAnalogInput(bindings[i].channelId, result, samples, delayMs))
        {
            bindings[i].analogProbe = result;
        }
    }
}

bool ResourceManager::readDigital(const String &channelId) const
{
    const ResourceBinding *binding = findBinding(channelId);
    if (!binding) return false;

    switch (binding->type)
    {
        case ChannelType::DI:
            return binding->external ? gComms.readExternalDigitalValue(binding->resourceId, binding->externalDigitalValue) : binding->digitalInput.read();

        case ChannelType::DO:
            return binding->external ? binding->externalDigitalValue : binding->digitalOutput.readState();

        default:
            return false;
    }
}

void ResourceManager::writeDigital(const String &channelId, bool value)
{
    ResourceBinding *binding = findBinding(channelId);
    if (!binding) return;

    if (binding->type == ChannelType::DO)
    {
        if (binding->external)
        {
            binding->externalDigitalValue = value;
            gComms.writeExternalDigitalValue(binding->resourceId, value);
        }
        else
        {
            binding->digitalOutput.write(value);
        }
    }
}

int ResourceManager::readAnalog(const String &channelId) const
{
    const ResourceBinding *binding = findBinding(channelId);
    if (!binding) return 0;

    if (binding->type == ChannelType::AI)
    {
        return binding->external ? gComms.readExternalAnalogRaw(binding->resourceId, static_cast<int>(binding->externalAnalogRaw)) : binding->analogInput.readRaw();
    }

    if (binding->type == ChannelType::AO)
    {
        return binding->external
            ? static_cast<int>(binding->externalAnalogRaw)
            : static_cast<int>(binding->analogOutputRaw);
    }

    return 0;
}

void ResourceManager::writeAnalog(const String &channelId, int rawValue)
{
    ResourceBinding *binding = findBinding(channelId);
    if (!binding || binding->type != ChannelType::AO)
    {
        return;
    }

    if (binding->external)
    {
        binding->externalAnalogRaw = static_cast<uint16_t>(rawValue < 0 ? 0 : rawValue);
        gComms.writeExternalAnalogRaw(binding->resourceId, rawValue);
        return;
    }

    if (rawValue < 0) rawValue = 0;
    if (rawValue > 255) rawValue = 255;
    binding->analogOutputRaw = static_cast<uint16_t>(rawValue);
    applyAnalogOutput(*binding);
}

bool ResourceManager::hasChannel(const String &channelId) const
{
    return findBinding(channelId) != nullptr;
}

int ResourceManager::getBindingCount() const
{
    return bindingCount;
}

const ResourceBinding* ResourceManager::getBindingAt(int index) const
{
    if (index < 0 || index >= bindingCount) return nullptr;
    return &bindings[index];
}

bool ResourceManager::probeDigitalInput(const String &channelId, InputProbeResult &result)
{
    ResourceBinding *binding = findBinding(channelId);
    if (!binding || binding->type != ChannelType::DI)
    {
        return false;
    }

    if (binding->external)
    {
        result.valid = false;
        result.expectedInternalPullup = false;
        result.observedPullupEffect = false;
        result.withoutPullupHighCount = 0;
        result.withPullupHighCount = 0;
        result.classification = "external_resource";
        binding->inputProbe = result;
        return false;
    }

    const ChipTemplatePinConfig *activeChipPin = findActiveChipTemplateConfigPin(binding->gpio);
    const BoardConfig *board = getActiveBoard();
    const ChipTemplate *builtinChipTemplate = board ? getChipTemplate(board->chip) : nullptr;
    const ChipPinTemplate *builtinChipPin = builtinChipTemplate ? findChipPinTemplate(*builtinChipTemplate, binding->gpio) : nullptr;

    pinMode(binding->gpio, INPUT);
    delay(2);
    result.withoutPullupHighCount = sampleHighCount(binding->gpio, 16, 1);

    pinMode(binding->gpio, INPUT_PULLUP);
    delay(2);
    result.withPullupHighCount = sampleHighCount(binding->gpio, 16, 1);

    binding->digitalInput.init();

    result.valid = true;
    result.expectedInternalPullup = activeChipPin ? activeChipPin->internalPullup : (builtinChipPin ? builtinChipPin->internalPullup : false);
    result.observedPullupEffect = (result.withPullupHighCount - result.withoutPullupHighCount) >= 8;
    result.classification = classifyProbe(result.withoutPullupHighCount, result.withPullupHighCount);

    binding->inputProbe = result;
    return true;
}

bool ResourceManager::probeAnalogInput(const String &channelId, AnalogProbeResult &result, int samples, int delayMs)
{
    const ResourceBinding *binding = findBinding(channelId);
    if (!binding || binding->type != ChannelType::AI)
    {
        return false;
    }

    if (binding->external)
    {
        result.valid = false;
        result.lastRaw = gComms.readExternalAnalogRaw(binding->resourceId, static_cast<int>(binding->externalAnalogRaw));
        result.minRaw = result.lastRaw;
        result.maxRaw = result.lastRaw;
        result.averageRaw = result.lastRaw;
        result.spanRaw = 0;
        result.classification = "external_resource";
        return false;
    }

    if (samples <= 0) samples = 1;

    int minValue = 4095;
    int maxValue = 0;
    int sum = 0;
    int lastValue = 0;

    for (int i = 0; i < samples; i++)
    {
        lastValue = binding->analogInput.readRaw();
        if (lastValue < minValue) minValue = lastValue;
        if (lastValue > maxValue) maxValue = lastValue;
        sum += lastValue;
        if (delayMs > 0) delay(delayMs);
    }

    result.valid = true;
    result.lastRaw = lastValue;
    result.minRaw = minValue;
    result.maxRaw = maxValue;
    result.averageRaw = sum / samples;
    result.spanRaw = maxValue - minValue;
    result.classification = classifyAnalogProbe(minValue, maxValue, result.averageRaw);
    return true;
}
