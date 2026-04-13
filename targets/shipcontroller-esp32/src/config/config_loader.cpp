#include <Arduino.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <Preferences.h>

#include "config.h"
#include "../ui/ui_config.h"

namespace {

constexpr const char *kRuntimeConfigNamespace = "runtimecfg";
constexpr const char *kRuntimeConfigKey = "config";

bool loadLegacyConfigDocument(JsonDocument &doc)
{
    if (!LittleFS.begin())
    {
        return false;
    }

    File file = LittleFS.open("/config.json", "r");
    if (!file)
    {
        return false;
    }

    DeserializationError error = deserializeJson(doc, file);
    file.close();
    return !error;
}

bool saveConfigDocumentToNvs(JsonDocument &doc)
{
    doc["config_version"] = CURRENT_CONFIG_VERSION;
    String json;
    serializeJson(doc, json);

    Preferences prefs;
    if (!prefs.begin(kRuntimeConfigNamespace, false))
    {
        return false;
    }

    size_t written = prefs.putString(kRuntimeConfigKey, json);
    prefs.end();
    return written == json.length();
}

} // namespace

static void logTruncationWarning(const __FlashStringHelper *section, int limit)
{
    Serial.print(F("CONFIG WARNING: "));
    Serial.print(section);
    Serial.print(F(" truncated at limit "));
    Serial.println(limit);
}

static void freeDisplayConfig()
{
    if (gConfig.display.screens == nullptr)
    {
        gConfig.display.screenCount = 0;
        return;
    }

    for (int screenIndex = 0; screenIndex < gConfig.display.screenCount; screenIndex++)
    {
        delete[] gConfig.display.screens[screenIndex].widgets;
        gConfig.display.screens[screenIndex].widgets = nullptr;
        gConfig.display.screens[screenIndex].widgetCount = 0;
    }

    delete[] gConfig.display.screens;
    gConfig.display.screens = nullptr;
    gConfig.display.screenCount = 0;
}

static void freeCommsConfig()
{
    delete[] gConfig.buses;
    gConfig.buses = nullptr;
    gConfig.busCount = 0;

    delete[] gConfig.devices;
    gConfig.devices = nullptr;
    gConfig.deviceCount = 0;

    delete[] gConfig.externalResources;
    gConfig.externalResources = nullptr;
    gConfig.externalResourceCount = 0;
}

static void loadBusesConfig(JsonObject busesObject)
{
    delete[] gConfig.buses;
    gConfig.buses = nullptr;
    gConfig.busCount = 0;

    int configuredCount = 0;
    for (JsonPair ignored : busesObject)
    {
        (void)ignored;
        configuredCount++;
    }

    if (configuredCount <= 0)
    {
        return;
    }

    if (configuredCount > MAX_COMMS_BUSES)
    {
        logTruncationWarning(F("comms buses"), MAX_COMMS_BUSES);
        configuredCount = MAX_COMMS_BUSES;
    }

    gConfig.buses = new BusConfig[configuredCount];
    if (gConfig.buses == nullptr)
    {
        gConfig.busCount = 0;
        return;
    }

    int index = 0;
    for (JsonPair kv : busesObject)
    {
        if (index >= configuredCount)
        {
            break;
        }

        BusConfig &bus = gConfig.buses[index++];
        JsonObject busObject = kv.value().as<JsonObject>();

        bus.id = kv.key().c_str();
        bus.label = busObject["label"] | bus.id;
        bus.type = parseBusType(busObject["type"] | "");
        bus.enabled = busObject["enabled"] | true;
        bus.sda = busObject["sda"] | 21;
        bus.scl = busObject["scl"] | 22;
        bus.speed = busObject["speed"] | 400000UL;
        bus.scan = busObject["scan"] | true;
        bus.tx = busObject["tx"] | 17;
        bus.rx = busObject["rx"] | 16;
        bus.baud = busObject["baud"] | 9600UL;
        bus.parity = busObject["parity"] | "none";
        bus.stopBits = busObject["stop_bits"] | 1;
        bus.dePin = busObject["de_pin"] | -1;

        if (bus.type == BusType::Unknown)
        {
            bus.type = BusType::I2C;
        }
    }

    gConfig.busCount = index;
}

static void loadDevicesConfig(JsonObject devicesObject)
{
    delete[] gConfig.devices;
    gConfig.devices = nullptr;
    gConfig.deviceCount = 0;

    int configuredCount = 0;
    for (JsonPair ignored : devicesObject)
    {
        (void)ignored;
        configuredCount++;
    }

    if (configuredCount <= 0)
    {
        return;
    }

    if (configuredCount > MAX_COMMS_DEVICES)
    {
        logTruncationWarning(F("comms devices"), MAX_COMMS_DEVICES);
        configuredCount = MAX_COMMS_DEVICES;
    }

    gConfig.devices = new DeviceConfig[configuredCount];
    if (gConfig.devices == nullptr)
    {
        gConfig.deviceCount = 0;
        return;
    }

    int index = 0;
    for (JsonPair kv : devicesObject)
    {
        if (index >= configuredCount)
        {
            break;
        }

        DeviceConfig &device = gConfig.devices[index++];
        JsonObject deviceObject = kv.value().as<JsonObject>();

        device.id = kv.key().c_str();
        device.label = deviceObject["label"] | device.id;
        device.driver = deviceObject["driver"] | "generic";
        device.busId = deviceObject["bus_id"] | "";
        device.enabled = deviceObject["enabled"] | true;
        device.address = deviceObject["address"] | 0;
        device.pollMs = deviceObject["poll_ms"] | 1000UL;
        device.timeoutMs = deviceObject["timeout_ms"] | 200UL;
        device.retryCount = deviceObject["retry_count"] | 1;
    }

    gConfig.deviceCount = index;
}

static void loadExternalResourcesConfig(JsonObject resourcesObject)
{
    delete[] gConfig.externalResources;
    gConfig.externalResources = nullptr;
    gConfig.externalResourceCount = 0;

    int configuredCount = 0;
    for (JsonPair ignored : resourcesObject)
    {
        (void)ignored;
        configuredCount++;
    }

    if (configuredCount <= 0)
    {
        return;
    }

    if (configuredCount > MAX_EXTERNAL_RESOURCES)
    {
        logTruncationWarning(F("external resources"), MAX_EXTERNAL_RESOURCES);
        configuredCount = MAX_EXTERNAL_RESOURCES;
    }

    gConfig.externalResources = new ExternalResourceConfig[configuredCount];
    if (gConfig.externalResources == nullptr)
    {
        gConfig.externalResourceCount = 0;
        return;
    }

    int index = 0;
    for (JsonPair kv : resourcesObject)
    {
        if (index >= configuredCount)
        {
            break;
        }

        ExternalResourceConfig &resource = gConfig.externalResources[index++];
        JsonObject resourceObject = kv.value().as<JsonObject>();

        resource.id = kv.key().c_str();
        resource.label = resourceObject["label"] | resource.id;
        resource.deviceId = resourceObject["device_id"] | "";
        resource.kind = resourceObject["kind"] | "analog_in";
        resource.capability = parseChannelType(resourceObject["capability"] | "");
        if (resource.capability == ChannelType::Unknown)
        {
            resource.capability = ChannelType::AI;
        }
        resource.sourceIndex = resourceObject["source_index"] | 0;
        resource.units = resourceObject["units"] | "";
    }

    gConfig.externalResourceCount = index;
}

static void loadBoardConfig(JsonObject boardsObject)
{
    gConfig.boardCount = 0;

    for (JsonPair kv : boardsObject)
    {
        if (gConfig.boardCount >= MAX_BOARDS)
        {
            logTruncationWarning(F("boards"), MAX_BOARDS);
            break;
        }

        BoardConfig &board = gConfig.boards[gConfig.boardCount];
        JsonObject boardObject = kv.value().as<JsonObject>();

        board.name = kv.key().c_str();
        board.chip = boardObject["chip"] | "";
        board.templateId = boardObject["template"] | "";
        board.resourceCount = 0;
        board.reservedCount = 0;

        if (boardObject["resources"].is<JsonObject>())
        {
            for (JsonPair resourcePair : boardObject["resources"].as<JsonObject>())
            {
                if (board.resourceCount >= MAX_RESOURCES)
                {
                    logTruncationWarning(F("board resources"), MAX_RESOURCES);
                    break;
                }

                BoardResourceConfig &resource = board.resources[board.resourceCount];
                JsonObject resourceObject = resourcePair.value().as<JsonObject>();

                resource.id = resourcePair.key().c_str();
                resource.label = resourceObject["label"] | "";
                if (resource.label.length() == 0)
                {
                    resource.label = resource.id;
                }
                resource.gpio = resourceObject["gpio"] | -1;
                resource.capabilityCount = 0;

                if (resourceObject["capabilities"].is<JsonArray>())
                {
                    for (JsonVariant capabilityValue : resourceObject["capabilities"].as<JsonArray>())
                    {
                        if (resource.capabilityCount >= MAX_RESOURCE_CAPABILITIES)
                        {
                            logTruncationWarning(F("resource capabilities"), MAX_RESOURCE_CAPABILITIES);
                            break;
                        }

                        ChannelType capability = parseChannelType(capabilityValue.as<const char*>());
                        if (capability == ChannelType::Unknown) continue;

                        resource.capabilities[resource.capabilityCount++] = capability;
                    }
                }

                board.resourceCount++;
            }
        }

        if (boardObject["reserved"].is<JsonObject>())
        {
            for (JsonPair reservedPair : boardObject["reserved"].as<JsonObject>())
            {
                if (board.reservedCount >= MAX_RESERVED_PINS)
                {
                    logTruncationWarning(F("reserved pins"), MAX_RESERVED_PINS);
                    break;
                }

                ReservedPinConfig &reserved = board.reserved[board.reservedCount++];
                reserved.name = reservedPair.key().c_str();
                reserved.gpio = reservedPair.value() | -1;
            }
        }

        gConfig.boardCount++;
    }
}

static void loadChipTemplates(JsonObject templatesObject)
{
    gConfig.chipTemplateCount = 0;

    for (JsonPair kv : templatesObject)
    {
        if (gConfig.chipTemplateCount >= MAX_CHIP_TEMPLATES)
        {
            logTruncationWarning(F("chip templates"), MAX_CHIP_TEMPLATES);
            break;
        }

        ChipTemplateConfig &chipTemplate = gConfig.chipTemplates[gConfig.chipTemplateCount];
        JsonObject chipTemplateObject = kv.value().as<JsonObject>();

        chipTemplate.id = kv.key().c_str();
        chipTemplate.label = chipTemplateObject["label"] | chipTemplate.id;
        chipTemplate.pinCount = 0;

        if (chipTemplateObject["pins"].is<JsonObject>())
        {
            for (JsonPair pinPair : chipTemplateObject["pins"].as<JsonObject>())
            {
                if (chipTemplate.pinCount >= MAX_HARDWARE_PINS)
                {
                    logTruncationWarning(F("chip template pins"), MAX_HARDWARE_PINS);
                    break;
                }

                ChipTemplatePinConfig &pin = chipTemplate.pins[chipTemplate.pinCount++];
                JsonObject pinObject = pinPair.value().as<JsonObject>();
                pin.gpio = String(pinPair.key().c_str()).toInt();
                pin.capabilityCount = 0;
                pin.internalPullup = pinObject["internal_pullup"] | false;
                pin.inputOnly = pinObject["input_only"] | false;
                pin.strapping = pinObject["strapping"] | false;
                pin.forbidden = pinObject["forbidden"] | false;
                pin.note = pinObject["note"] | "";

                if (pinObject["capabilities"].is<JsonArray>())
                {
                    for (JsonVariant capabilityValue : pinObject["capabilities"].as<JsonArray>())
                    {
                        if (pin.capabilityCount >= MAX_RESOURCE_CAPABILITIES)
                        {
                            logTruncationWarning(F("chip pin capabilities"), MAX_RESOURCE_CAPABILITIES);
                            break;
                        }
                        ChannelType capability = parseChannelType(capabilityValue.as<const char*>());
                        if (capability == ChannelType::Unknown) continue;
                        pin.capabilities[pin.capabilityCount++] = capability;
                    }
                }
            }
        }

        gConfig.chipTemplateCount++;
    }
}

static void loadBoardTemplates(JsonObject templatesObject)
{
    gConfig.boardTemplateCount = 0;

    for (JsonPair kv : templatesObject)
    {
        if (gConfig.boardTemplateCount >= MAX_BOARD_TEMPLATES)
        {
            logTruncationWarning(F("board templates"), MAX_BOARD_TEMPLATES);
            break;
        }

        BoardTemplateConfig &boardTemplate = gConfig.boardTemplates[gConfig.boardTemplateCount];
        JsonObject boardTemplateObject = kv.value().as<JsonObject>();

        boardTemplate.id = kv.key().c_str();
        boardTemplate.label = boardTemplateObject["label"] | boardTemplate.id;
        boardTemplate.chipTemplateId = boardTemplateObject["chip_template"] | "";
        boardTemplate.ruleCount = 0;

        if (boardTemplateObject["rules"].is<JsonArray>())
        {
            for (JsonObject ruleObject : boardTemplateObject["rules"].as<JsonArray>())
            {
                if (boardTemplate.ruleCount >= MAX_TEMPLATE_RULES)
                {
                    logTruncationWarning(F("board template rules"), MAX_TEMPLATE_RULES);
                    break;
                }

                BoardTemplateRuleConfig &rule = boardTemplate.rules[boardTemplate.ruleCount++];
                rule.id = ruleObject["id"] | "";
                rule.featureKey = ruleObject["feature"] | "";
                rule.pinClass = parsePinPolicyClass(ruleObject["class"] | "safe");
                rule.owner = ruleObject["owner"] | rule.id;
                rule.reason = ruleObject["reason"] | "";
                rule.alwaysOn = ruleObject["always_on"] | false;
                rule.pinCount = 0;

                if (ruleObject["pins"].is<JsonArray>())
                {
                    for (JsonVariant pinValue : ruleObject["pins"].as<JsonArray>())
                    {
                        if (rule.pinCount >= MAX_TEMPLATE_RULE_PINS)
                        {
                            logTruncationWarning(F("board rule pins"), MAX_TEMPLATE_RULE_PINS);
                            break;
                        }
                        rule.pins[rule.pinCount++] = pinValue | -1;
                    }
                }
            }
        }

        gConfig.boardTemplateCount++;
    }
}

static void loadChannelsConfig(JsonObject channelsObject)
{
    gConfig.channelCount = 0;

    for (JsonPair kv : channelsObject)
    {
        if (gConfig.channelCount >= MAX_CHANNELS)
        {
            logTruncationWarning(F("channels"), MAX_CHANNELS);
            break;
        }

        ChannelConfig &channel = gConfig.channels[gConfig.channelCount];
        JsonObject channelObject = kv.value().as<JsonObject>();

        channel.id = kv.key().c_str();
        channel.resourceId = channelObject["resource"] | "";
        channel.type = parseChannelType(channelObject["type"] | "");
        channel.inverted = channelObject["inverted"] | false;
        channel.initial = channelObject["initial"] | false;
        channel.pullup = channelObject["pullup"] | false;

        gConfig.channelCount++;
    }
}

static void loadSignalsConfig(JsonObject signalsObject)
{
    gConfig.signalCount = 0;

    for (JsonPair kv : signalsObject)
    {
        if (gConfig.signalCount >= MAX_SIGNAL_DEFINITIONS)
        {
            logTruncationWarning(F("signals"), MAX_SIGNAL_DEFINITIONS);
            break;
        }

        SignalConfig &signal = gConfig.signals[gConfig.signalCount++];
        JsonObject signalObject = kv.value().as<JsonObject>();

        signal.id = kv.key().c_str();
        signal.label = signalObject["label"] | signal.id;
        signal.type = signalObject["type"] | "substitute";
        signal.sourceSignalId = signalObject["source"] | "";
        signal.substituteSignalId = signalObject["substitute"] | "";
        signal.enableSignalId = signalObject["enable"] | "";
        signal.units = signalObject["units"] | "";
    }
}

static void loadBlocksConfig(JsonObject blocksObject)
{
    gConfig.blocks.blockCount = 0;
    int timerBlockCount = 0;

    for (JsonPair kv : blocksObject)
    {
        JsonObject blockObject = kv.value().as<JsonObject>();
        BlockType type = parseBlockType(blockObject["type"] | "");

        if (type == BlockType::Unknown)
        {
            continue;
        }

        if (gConfig.blocks.blockCount >= MAX_BLOCKS)
        {
            logTruncationWarning(F("blocks"), MAX_BLOCKS);
            continue;
        }

        if (type == BlockType::Timer && timerBlockCount >= MAX_TIMER_BLOCKS)
        {
            logTruncationWarning(F("timer blocks"), MAX_TIMER_BLOCKS);
            continue;
        }

        BlockConfig &block = gConfig.blocks.items[gConfig.blocks.blockCount++];
        block.id = kv.key().c_str();
        block.type = type;
        block.mode = blockObject["mode"] | "";
        block.inputA = "";
        block.inputB = "";
        block.inputC = "";
        block.controlSignal = "";
        block.outputA = "";
        block.periodMs = 0;
        block.durationMs = 0;
        block.debounceMs = 50;
        block.longPressMs = 800;
        block.doublePressMs = 350;
        block.compareValueA = 0.0f;
        block.compareValueB = 0.0f;
        block.extraValueC = 0.0f;
        block.extraValueD = 0.0f;
        block.retrigger = false;
        block.retain = false;
        block.resetPriority = true;
        block.startImmediately = false;
        if (type == BlockType::Timer)
        {
            block.inputA = blockObject["trigger"] | "";
            block.inputB = blockObject["enable"] | "";
            block.outputA = blockObject["output"] | "";
            block.periodMs = blockObject["period_ms"] | 0;
            block.durationMs = blockObject["duration_ms"] | 5000;
            block.retrigger = blockObject["retrigger"] | false;
            block.startImmediately = blockObject["start_immediately"] | false;
            if (block.mode.length() == 0)
            {
                block.mode = "pulse";
            }
        }
        else if (type == BlockType::Selector)
        {
            block.inputA = blockObject["primary"] | "";
            block.inputB = blockObject["secondary"] | "";
            block.controlSignal = blockObject["select"] | "";
            block.outputA = blockObject["output"] | "";
            block.mode = "selector";
        }
        else if (type == BlockType::Button)
        {
            block.inputA = blockObject["input"] | "";
            block.debounceMs = blockObject["debounce_ms"] | 50;
            block.longPressMs = blockObject["long_press_ms"] | 800;
            block.doublePressMs = blockObject["double_press_ms"] | 350;
            if (block.mode.length() == 0)
            {
                block.mode = "events";
            }
        }
        else if (type == BlockType::Latch)
        {
            block.inputA = blockObject["toggle_input"] | blockObject["set_input"] | "";
            block.inputB = blockObject["reset_input"] | "";
            block.outputA = blockObject["output"] | "";
            block.retain = blockObject["retain"] | false;
            block.resetPriority = blockObject["reset_priority"] | true;
            if (block.mode.length() == 0)
            {
                block.mode = blockObject["set_input"].isNull() ? "toggle" : "set_reset";
            }
        }
        else if (type == BlockType::Comparator)
        {
            block.inputA = blockObject["input"] | "";
            block.inputB = blockObject["compare_signal"] | "";
            block.outputA = blockObject["output"] | "";
            block.compareValueA = blockObject["compare_value"] | 0.0f;
            block.compareValueB = blockObject["compare_value_b"] | 0.0f;
            if (block.mode.length() == 0)
            {
                block.mode = "gt";
            }
        }
        else if (type == BlockType::ScaleMap)
        {
            block.inputA = blockObject["input"] | "";
            block.outputA = blockObject["output"] | "";
            block.compareValueA = blockObject["value_a"] | 1.0f;
            block.compareValueB = blockObject["value_b"] | 0.0f;
            block.extraValueC = blockObject["value_c"] | 0.0f;
            block.extraValueD = blockObject["value_d"] | 1.0f;
            if (block.mode.length() == 0)
            {
                block.mode = "scale";
            }
        }
        else if (type == BlockType::LogicGate)
        {
            block.inputA = blockObject["input"] | blockObject["input_a"] | "";
            block.inputB = blockObject["input_b"] | blockObject["compare_signal"] | "";
            block.outputA = blockObject["output"] | "";
            if (block.mode.length() == 0)
            {
                block.mode = "and";
            }
        }
        else if (type == BlockType::EdgeDetect)
        {
            block.inputA = blockObject["input"] | blockObject["input_a"] | "";
            block.outputA = blockObject["output"] | "";
            block.durationMs = blockObject["duration_ms"] | 100;
            block.retrigger = blockObject["retrigger"] | false;
            if (block.mode.length() == 0)
            {
                block.mode = "rising";
            }
        }
        else if (type == BlockType::Counter)
        {
            block.inputA = blockObject["input"] | blockObject["input_a"] | "";
            block.inputB = blockObject["reset_input"] | blockObject["input_b"] | "";
            block.outputA = blockObject["output"] | "";
            block.compareValueA = blockObject["step"] | blockObject["value_a"] | blockObject["compare_value"] | 1.0f;
            block.compareValueB = blockObject["initial_value"] | blockObject["value_b"] | blockObject["compare_value_b"] | 0.0f;
            if (block.mode.length() == 0)
            {
                block.mode = "rising";
            }
        }
        else if (type == BlockType::Totalizer)
        {
            block.inputA = blockObject["input"] | blockObject["input_a"] | "";
            block.inputB = blockObject["reset_input"] | blockObject["input_b"] | "";
            block.outputA = blockObject["output"] | "";
            block.compareValueA = blockObject["scale"] | blockObject["value_a"] | blockObject["compare_value"] | 1.0f;
            block.compareValueB = blockObject["initial_value"] | blockObject["value_b"] | blockObject["compare_value_b"] | 0.0f;
            block.extraValueC = blockObject["save_every_delta"] | blockObject["value_c"] | 1.0f;
            block.extraValueD = blockObject["save_every_ms"] | blockObject["value_d"] | 60000.0f;
            block.retain = blockObject["retain"] | false;
            if (block.mode.length() == 0)
            {
                block.mode = "delta";
            }
        }
        else if (type == BlockType::RateEstimator)
        {
            block.inputA = blockObject["input"] | blockObject["input_a"] | "";
            block.outputA = blockObject["output"] | "";
            block.durationMs = blockObject["duration_ms"] | blockObject["sample_ms"] | 1000;
            block.compareValueA = blockObject["scale"] | blockObject["value_a"] | blockObject["compare_value"] | 1.0f;
            block.compareValueB = blockObject["smoothing_alpha"] | blockObject["value_b"] | blockObject["compare_value_b"] | 1.0f;
            if (block.mode.length() == 0)
            {
                block.mode = "per_minute";
            }
        }
        else if (type == BlockType::WindowAggregator)
        {
            block.inputA = blockObject["input"] | blockObject["input_a"] | "";
            block.outputA = blockObject["output"] | "";
            block.periodMs = blockObject["period_ms"] | blockObject["bucket_ms"] | 60000;
            block.durationMs = blockObject["duration_ms"] | blockObject["window_ms"] | 3600000;
            block.compareValueA = blockObject["scale"] | blockObject["value_a"] | blockObject["compare_value"] | 1.0f;
            if (block.mode.length() == 0)
            {
                block.mode = "average";
            }
        }
        else if (type == BlockType::SignalExtractor)
        {
            block.inputA = blockObject["input"] | blockObject["input_a"] | blockObject["source_a"] | "";
            block.inputB = blockObject["input_b"] | blockObject["source_b"] | "";
            block.inputC = blockObject["quality_input"] | blockObject["quality_source"] | "";
            block.outputA = blockObject["output"] | "";
            block.compareValueA = blockObject["threshold_on"] | blockObject["value_a"] | blockObject["compare_value"] | 1.0f;
            block.compareValueB = blockObject["threshold_off"] | blockObject["value_b"] | blockObject["compare_value_b"] | 0.0f;
            if (block.mode.length() == 0)
            {
                block.mode = "digital_direct";
            }
        }
        else if (type == BlockType::Hysteresis)
        {
            block.inputA = blockObject["input"] | blockObject["input_a"] | "";
            block.outputA = blockObject["output"] | "";
            block.compareValueA = blockObject["value_a"] | blockObject["compare_value"] | 0.0f;
            block.compareValueB = blockObject["value_b"] | blockObject["compare_value_b"] | 1.0f;
            if (block.mode.length() == 0)
            {
                block.mode = "high";
            }
        }
        else if (type == BlockType::Interlock)
        {
            block.inputA = blockObject["input"] | blockObject["request_signal"] | "";
            block.inputB = blockObject["input_b"] | blockObject["permissive_signal"] | "";
            block.inputC = blockObject["input_c"] | blockObject["inhibit_signal"] | blockObject["interlock_signal"] | "";
            block.outputA = blockObject["output"] | "";
            if (block.mode.length() == 0)
            {
                block.mode = "interlock";
            }
        }
        else if (type == BlockType::ModeAuthority)
        {
            block.inputA = blockObject["primary"] | blockObject["input"] | "";
            block.inputB = blockObject["secondary"] | blockObject["input_b"] | "";
            block.inputC = blockObject["service_signal"] | blockObject["input_c"] | "";
            block.controlSignal = blockObject["mode_select"] | blockObject["select"] | "";
            block.outputA = blockObject["output"] | "";
            if (block.mode.length() == 0)
            {
                block.mode = "local_remote";
            }
        }
        else if (type == BlockType::Freshness)
        {
            block.inputA = blockObject["input"] | blockObject["signal"] | "";
            block.outputA = blockObject["output"] | "";
            block.durationMs = blockObject["duration_ms"] | blockObject["timeout_ms"] | 5000;
            if (block.mode.length() == 0)
            {
                block.mode = "fresh";
            }
        }

        if (type == BlockType::Timer)
        {
            timerBlockCount++;
        }
    }
}

static void loadDisplayConfig(JsonObject displayObject)
{
    freeDisplayConfig();

    gConfig.display.enabled = displayObject["enabled"] | gConfig.display.enabled;
    gConfig.display.driver = displayObject["driver"] | gConfig.display.driver;
    gConfig.display.width = displayObject["width"] | gConfig.display.width;
    gConfig.display.height = displayObject["height"] | gConfig.display.height;
    gConfig.display.rotation = displayObject["rotation"] | gConfig.display.rotation;
    gConfig.display.startupScreenId = displayObject["startup_screen"] | gConfig.display.startupScreenId;
    gConfig.display.defaultLanguage = displayObject["default_language"] | gConfig.display.defaultLanguage;
    gConfig.display.screenCount = 0;

    if (!displayObject["screens"].is<JsonObject>())
    {
        return;
    }

    JsonObject screensObject = displayObject["screens"].as<JsonObject>();
    int requestedScreenCount = 0;
    for (JsonPair ignored : screensObject)
    {
        (void)ignored;
        requestedScreenCount++;
    }

    if (requestedScreenCount <= 0)
    {
        return;
    }

    int allocatedScreenCount = requestedScreenCount;
    if (allocatedScreenCount > MAX_DISPLAY_SCREENS)
    {
        logTruncationWarning(F("display screens"), MAX_DISPLAY_SCREENS);
        allocatedScreenCount = MAX_DISPLAY_SCREENS;
    }

    gConfig.display.screens = new DisplayScreenConfig[allocatedScreenCount];
    if (gConfig.display.screens == nullptr)
    {
        Serial.println(F("CONFIG WARNING: display screens allocation failed"));
        return;
    }

    for (JsonPair screenPair : screensObject)
    {
        if (gConfig.display.screenCount >= allocatedScreenCount)
        {
            break;
        }

        DisplayScreenConfig &screen = gConfig.display.screens[gConfig.display.screenCount++];
        JsonObject screenObject = screenPair.value().as<JsonObject>();

        screen.id = screenPair.key().c_str();
        screen.label = screenObject["label"] | screen.id;
        screen.group = screenObject["group"] | "";
        screen.visibleIfSignalId = screenObject["visible_if"] | "";
        screen.refreshMs = screenObject["refresh_ms"] | 500;
        screen.autoCycleMs = screenObject["auto_cycle_ms"] | 0;
        screen.widgets = nullptr;
        screen.widgetCount = 0;

        if (!screenObject["widgets"].is<JsonObject>())
        {
            continue;
        }

        JsonObject widgetsObject = screenObject["widgets"].as<JsonObject>();
        int requestedWidgetCount = 0;
        for (JsonPair ignored : widgetsObject)
        {
            (void)ignored;
            requestedWidgetCount++;
        }

        if (requestedWidgetCount <= 0)
        {
            continue;
        }

        int allocatedWidgetCount = requestedWidgetCount;
        if (allocatedWidgetCount > MAX_DISPLAY_WIDGETS)
        {
            logTruncationWarning(F("display widgets"), MAX_DISPLAY_WIDGETS);
            allocatedWidgetCount = MAX_DISPLAY_WIDGETS;
        }

        screen.widgets = new DisplayWidgetConfig[allocatedWidgetCount];
        if (screen.widgets == nullptr)
        {
            Serial.print(F("CONFIG WARNING: display widgets allocation failed for screen "));
            Serial.println(screen.id);
            continue;
        }

        for (JsonPair widgetPair : widgetsObject)
        {
            if (screen.widgetCount >= allocatedWidgetCount)
            {
                break;
            }

            DisplayWidgetConfig &widget = screen.widgets[screen.widgetCount++];
            JsonObject widgetObject = widgetPair.value().as<JsonObject>();
            JsonObject formatObject = widgetObject["format"].is<JsonObject>()
                ? widgetObject["format"].as<JsonObject>()
                : JsonObject();
            JsonObject styleObject = widgetObject["style"].is<JsonObject>()
                ? widgetObject["style"].as<JsonObject>()
                : JsonObject();

            widget.id = widgetPair.key().c_str();
            widget.type = parseDisplayWidgetType(widgetObject["type"] | "");
            widget.x = widgetObject["x"] | 0;
            widget.y = widgetObject["y"] | 0;
            widget.w = widgetObject["w"] | 0;
            widget.h = widgetObject["h"] | 0;
            widget.label = widgetObject["label"] | widget.id;
            widget.signalId = widgetObject["signal"] | "";
            widget.visibleIfSignalId = widgetObject["visible_if"] | "";

            widget.format.units = formatObject["units"] | "";
            widget.format.precision = formatObject["precision"] | 1;
            widget.format.durationStyle = formatObject["duration_style"] | "";
            widget.format.trueText = formatObject["true_text"] | "ON";
            widget.format.falseText = formatObject["false_text"] | "OFF";
            widget.format.prefix = formatObject["prefix"] | "";
            widget.format.suffix = formatObject["suffix"] | "";
            widget.format.emptyText = formatObject["empty_text"] | "--";

            widget.style.font = styleObject["font"] | "small";
            widget.style.align = styleObject["align"] | "left";
            widget.style.invert = styleObject["invert"] | false;
            widget.style.emphasis = styleObject["emphasis"] | false;
            widget.style.frame = styleObject["frame"] | false;
            widget.style.colorRole = styleObject["color_role"] | "normal";
        }
    }
}

bool loadConfigDocumentFromStorage(JsonDocument &doc)
{
    doc.clear();

    Preferences prefs;
    if (prefs.begin(kRuntimeConfigNamespace, true))
    {
        String stored = prefs.getString(kRuntimeConfigKey, "");
        prefs.end();
        if (stored.length() > 0)
        {
            DeserializationError error = deserializeJson(doc, stored);
            if (!error)
            {
                return true;
            }
            doc.clear();
        }
    }

    if (!loadLegacyConfigDocument(doc))
    {
        return false;
    }

    // Keep boot tolerant when the device only has a legacy /config.json or no
    // stable runtimecfg namespace yet. Automatic NVS migration during the read
    // path caused first-boot crashes on the physical LilyGO bench, so the
    // runtime now loads the legacy document as-is and defers persistence to an
    // explicit save flow.
    return true;
}

bool saveConfigDocumentToStorage(JsonDocument &doc)
{
    return saveConfigDocumentToNvs(doc);
}

bool loadConfigFromFile()
{
    JsonDocument doc;
    if (!loadConfigDocumentFromStorage(doc))
    {
        Serial.println("NO CONFIG");
        return false;
    }

    gConfig.configVersion = doc["config_version"] | 1;
    if (gConfig.configVersion < CURRENT_CONFIG_VERSION)
    {
        Serial.print(F("CONFIG INFO: older config_version detected: "));
        Serial.print(gConfig.configVersion);
        Serial.print(F(" -> expected "));
        Serial.println(CURRENT_CONFIG_VERSION);
    }
    else if (gConfig.configVersion > CURRENT_CONFIG_VERSION)
    {
        Serial.print(F("CONFIG WARNING: newer config_version detected: "));
        Serial.print(gConfig.configVersion);
        Serial.print(F(" > supported "));
        Serial.println(CURRENT_CONFIG_VERSION);
    }

    gConfig.wifi.mode = doc["wifi"]["mode"] | "ap";
    gConfig.wifi.ssid = doc["wifi"]["ssid"] | "";
    gConfig.wifi.password = doc["wifi"]["password"] | "";
    gConfig.wifi.apSsid = doc["wifi"]["ap_ssid"] | gConfig.wifi.apSsid;
    gConfig.wifi.apPassword = doc["wifi"]["ap_password"] | gConfig.wifi.apPassword;
    gConfig.wifi.startupPolicy = doc["wifi"]["startup_policy"] | "";
    if (gConfig.wifi.startupPolicy.length() == 0)
    {
        gConfig.wifi.startupPolicy = (gConfig.wifi.mode == "ap") ? "ap_only" : "sta_fallback_ap";
    }
    gConfig.i2c.scan = doc["i2c"]["scan"] | gConfig.i2c.scan;

    gConfig.oled.enabled = doc["oled"]["enabled"] | gConfig.oled.enabled;
    gConfig.oled.showIpOnFallback = doc["oled"]["show_ip_on_fallback"] | gConfig.oled.showIpOnFallback;
    gConfig.oled.sda = doc["oled"]["sda"] | gConfig.oled.sda;
    gConfig.oled.scl = doc["oled"]["scl"] | gConfig.oled.scl;
    gConfig.oled.address = doc["oled"]["address"] | gConfig.oled.address;
    gConfig.oled.width = doc["oled"]["width"] | gConfig.oled.width;
    gConfig.oled.height = doc["oled"]["height"] | gConfig.oled.height;

    gConfig.lora.enabled = doc["lora"]["enabled"] | gConfig.lora.enabled;
    gConfig.lora.sck = doc["lora"]["sck"] | gConfig.lora.sck;
    gConfig.lora.miso = doc["lora"]["miso"] | gConfig.lora.miso;
    gConfig.lora.mosi = doc["lora"]["mosi"] | gConfig.lora.mosi;
    gConfig.lora.cs = doc["lora"]["cs"] | gConfig.lora.cs;
    gConfig.lora.rst = doc["lora"]["rst"] | gConfig.lora.rst;
    gConfig.lora.dio0 = doc["lora"]["dio0"] | gConfig.lora.dio0;
    gConfig.lora.dio1 = doc["lora"]["dio1"] | gConfig.lora.dio1;
    gConfig.lora.dio2 = doc["lora"]["dio2"] | gConfig.lora.dio2;

    gConfig.sd.enabled = doc["sd"]["enabled"] | gConfig.sd.enabled;
    gConfig.sd.cs = doc["sd"]["cs"] | gConfig.sd.cs;
    gConfig.sd.mosi = doc["sd"]["mosi"] | gConfig.sd.mosi;
    gConfig.sd.miso = doc["sd"]["miso"] | gConfig.sd.miso;
    gConfig.sd.sck = doc["sd"]["sck"] | gConfig.sd.sck;

    gConfig.led.enabled = doc["led"]["enabled"] | gConfig.led.enabled;
    gConfig.led.pin = doc["led"]["pin"] | gConfig.led.pin;

    gConfig.battery.enabled = doc["battery"]["enabled"] | gConfig.battery.enabled;
    gConfig.battery.adcPin = doc["battery"]["adc_pin"] | gConfig.battery.adcPin;

    if (doc["display"].is<JsonObject>())
    {
        loadDisplayConfig(doc["display"].as<JsonObject>());
    }
    else
    {
        freeDisplayConfig();
    }

    if (doc["buses"].is<JsonObject>())
    {
        loadBusesConfig(doc["buses"].as<JsonObject>());
    }
    else
    {
        delete[] gConfig.buses;
        gConfig.buses = nullptr;
        gConfig.busCount = 0;
    }

    if (doc["devices"].is<JsonObject>())
    {
        loadDevicesConfig(doc["devices"].as<JsonObject>());
    }
    else
    {
        delete[] gConfig.devices;
        gConfig.devices = nullptr;
        gConfig.deviceCount = 0;
    }

    if (doc["external_resources"].is<JsonObject>())
    {
        loadExternalResourcesConfig(doc["external_resources"].as<JsonObject>());
    }
    else
    {
        delete[] gConfig.externalResources;
        gConfig.externalResources = nullptr;
        gConfig.externalResourceCount = 0;
    }

    gConfig.system.active_board = doc["system"]["active_board"] | "default";
    gConfig.system.active_board_template = doc["system"]["active_board_template"] | "";
    gConfig.system.active_chip_template = doc["system"]["active_chip_template"] | "";

    if (doc["chip_templates"].is<JsonObject>())
    {
        loadChipTemplates(doc["chip_templates"].as<JsonObject>());
    }
    else
    {
        gConfig.chipTemplateCount = 0;
    }

    if (doc["board_templates"].is<JsonObject>())
    {
        loadBoardTemplates(doc["board_templates"].as<JsonObject>());
    }
    else
    {
        gConfig.boardTemplateCount = 0;
    }

    if (doc["boards"].is<JsonObject>())
    {
        loadBoardConfig(doc["boards"].as<JsonObject>());
    }
    else
    {
        gConfig.boardCount = 0;
    }

    if (gConfig.system.active_board_template.length() > 0)
    {
        for (int i = 0; i < gConfig.boardCount; i++)
        {
            if (gConfig.boards[i].name == gConfig.system.active_board)
            {
                gConfig.boards[i].templateId = gConfig.system.active_board_template;
            }
        }
    }

    if (doc["channels"].is<JsonObject>())
    {
        loadChannelsConfig(doc["channels"].as<JsonObject>());
    }
    else
    {
        gConfig.channelCount = 0;
    }

    if (doc["signals"].is<JsonObject>())
    {
        loadSignalsConfig(doc["signals"].as<JsonObject>());
    }
    else
    {
        gConfig.signalCount = 0;
    }

    if (doc["blocks"].is<JsonObject>())
    {
        loadBlocksConfig(doc["blocks"].as<JsonObject>());
    }
    else
    {
        gConfig.blocks.blockCount = 0;
    }

    if (doc["timer"].is<JsonObject>() && gConfig.blocks.blockCount == 0)
    {
        BlockConfig &block = gConfig.blocks.items[gConfig.blocks.blockCount++];
        block.id = "timer_legacy";
        block.type = BlockType::Timer;
        block.mode = "pulse";
        block.inputA = "input1";
        block.inputB = "";
        block.inputC = "";
        block.controlSignal = "";
        block.outputA = "relay1";
        block.periodMs = 0;
        block.durationMs = doc["timer"]["duration"] | 5000;
        block.debounceMs = 50;
        block.longPressMs = 800;
        block.doublePressMs = 350;
        block.retrigger = false;
        block.retain = false;
        block.resetPriority = true;
        block.startImmediately = false;
    }

    loadUIConfig(doc);

    Serial.println("CONFIG LOADED");
    return true;
}
