#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <WiFi.h>
#include <Wire.h>
#include <WebServer.h>

#include "../config/config.h"
#include "../config/feature_flags.h"
#include "../config/config_loader.h"
#include "../templates/chip_template.h"
#include "../core/board_manager.h"
#include "../core/resource_manager.h"
#include "../runtime/alarm_manager.h"
#include "../runtime/sequence_manager.h"
#include "../runtime/signal_registry.h"
#include "../runtime/retained_value_store.h"
#include "../runtime/comms_registry.h"
#include "../runtime/system_source_registry.h"
#include "../modules/button.h"
#include "../modules/comparator.h"
#include "../modules/edge_detect.h"
#include "../modules/counter.h"
#include "../modules/totalizer.h"
#include "../modules/rate_estimator.h"
#include "../modules/window_aggregator.h"
#include "../modules/signal_extractor.h"
#include "../modules/freshness.h"
#include "../modules/hysteresis.h"
#include "../modules/interlock.h"
#include "../modules/latch.h"
#include "../modules/logic_gate.h"
#include "../modules/mode_authority.h"
#include "../modules/scale_map.h"
#include "../modules/selector.h"
#include "../modules/timer.h"
#include "../ui/ui.h"

WebServer server(80);
static String ipStr = "";

namespace {

void beginConfiguredI2cBus()
{
    int sda = gConfig.oled.sda;
    int scl = gConfig.oled.scl;

    for (int i = 0; i < gConfig.busCount; i++)
    {
        const BusConfig &bus = gConfig.buses[i];
        if (bus.enabled && bus.type == BusType::I2C)
        {
            sda = bus.sda;
            scl = bus.scl;
            break;
        }
    }

    Wire.begin(sda, scl);
}

}  // namespace

static JsonObject ensureObject(JsonDocument &doc, const char *key)
{
    return doc[key].is<JsonObject>() ? doc[key].as<JsonObject>() : doc[key].to<JsonObject>();
}

static JsonArray ensureArray(JsonDocument &doc, const char *key)
{
    return doc[key].is<JsonArray>() ? doc[key].as<JsonArray>() : doc[key].to<JsonArray>();
}

static JsonObject ensureObject(JsonObject parent, const char *key)
{
    return parent[key].is<JsonObject>() ? parent[key].as<JsonObject>() : parent[key].to<JsonObject>();
}

static JsonObject ensureObject(JsonObject parent, const String &key)
{
    return parent[key].is<JsonObject>() ? parent[key].as<JsonObject>() : parent[key].to<JsonObject>();
}

static JsonArray ensureArray(JsonObject parent, const char *key)
{
    return parent[key].is<JsonArray>() ? parent[key].as<JsonArray>() : parent[key].to<JsonArray>();
}

static JsonObject addObject(JsonArray parent)
{
    return parent.add<JsonObject>();
}

static bool loadConfigDocument(JsonDocument &doc)
{
    return loadConfigDocumentFromStorage(doc);
}

static bool loadTemplateLibraryDocument(JsonDocument &doc)
{
    return loadTemplateLibraryDocumentFromStorage(doc);
}

static bool loadEditorProjectsDocument(JsonDocument &doc)
{
    if (!LittleFS.begin()) return false;
    if (!LittleFS.exists("/editor_projects.json"))
    {
        doc.to<JsonObject>();
        return true;
    }
    File file = LittleFS.open("/editor_projects.json", "r");
    if (!file)
    {
        doc.to<JsonObject>();
        return false;
    }
    DeserializationError error = deserializeJson(doc, file);
    file.close();
    if (error)
    {
        doc.clear();
        doc.to<JsonObject>();
        return false;
    }
    if (!doc.is<JsonObject>())
    {
        doc.clear();
        doc.to<JsonObject>();
    }
    return true;
}

static bool saveEditorProjectsDocument(JsonDocument &doc)
{
    if (!LittleFS.begin()) return false;
    File file = LittleFS.open("/editor_projects.json", "w");
    if (!file) return false;
    serializeJsonPretty(doc, file);
    file.close();
    return true;
}

static String editorProjectKey(const String &presetId)
{
    String key = "pm_";
    for (size_t i = 0; i < presetId.length() && key.length() < 15; i++)
    {
        char c = presetId[i];
        bool ok = (c >= 'a' && c <= 'z') ||
                  (c >= 'A' && c <= 'Z') ||
                  (c >= '0' && c <= '9') ||
                  c == '_';
        if (ok)
        {
            key += char(tolower(c));
        }
    }
    return key;
}

static bool loadEditorProjectModelFromStorage(const String &presetId, JsonDocument &doc)
{
    doc.clear();

    Preferences prefs;
    if (prefs.begin("editorproj", true))
    {
        String stored = prefs.getString(editorProjectKey(presetId).c_str(), "");
        prefs.end();
        if (stored.length() > 0)
        {
            if (!deserializeJson(doc, stored) && doc["version"] == "project_model_v2")
            {
                return true;
            }
            doc.clear();
        }
    }

    JsonDocument legacyDoc;
    if (!loadEditorProjectsDocument(legacyDoc))
    {
        return false;
    }

    JsonObject projects = legacyDoc.as<JsonObject>();
    JsonVariant modelVariant = projects[presetId];
    if (modelVariant.isNull())
    {
        return false;
    }

    doc.set(modelVariant);
    return doc["version"] == "project_model_v2";
}

static bool saveEditorProjectModelToStorage(const String &presetId, JsonDocument &doc)
{
    if (doc["version"] != "project_model_v2")
    {
        return false;
    }

    String json;
    serializeJson(doc, json);

    Preferences prefs;
    if (!prefs.begin("editorproj", false))
    {
        return false;
    }
    size_t written = prefs.putString(editorProjectKey(presetId).c_str(), json);
    prefs.end();
    return written == json.length();
}

static bool saveConfigDocument(JsonDocument &doc)
{
    return saveConfigDocumentToStorage(doc);
}

static bool saveTemplateLibraryDocument(JsonDocument &doc)
{
    return saveTemplateLibraryDocumentToStorage(doc);
}

static bool applyRuntimeConfig()
{
    loadConfigFromFile();
    gRetainedValues.begin();
    String errorMessage;
    if (!validateActiveBoard(errorMessage))
    {
        Serial.println("BOARD ERROR: " + errorMessage);
        return false;
    }
    if (!gResources.configureFromConfig(errorMessage))
    {
        Serial.println("RESOURCE ERROR: " + errorMessage);
        return false;
    }
    gResources.initHardware();
    gResources.runInputDiagnostics();
    if (!gSignals.configureFromConfig(errorMessage))
    {
        Serial.println("SIGNAL ERROR: " + errorMessage);
        return false;
    }
    gSignals.updateFromRuntime();
    beginConfiguredI2cBus();
    if (!gComms.configureFromConfig(errorMessage))
    {
        Serial.println("COMMS ERROR: " + errorMessage);
        return false;
    }
    if (!gAlarms.configureFromConfig(errorMessage))
    {
        Serial.println("ALARM ERROR: " + errorMessage);
        return false;
    }
    if (!gSequences.configureFromConfig(errorMessage))
    {
        Serial.println("SEQUENCE ERROR: " + errorMessage);
        return false;
    }
    buttonConfigure();
    comparatorConfigure();
    counterConfigure();
    totalizerConfigure();
    rateEstimatorConfigure();
    windowAggregatorConfigure();
    signalExtractorConfigure();
    edgeDetectConfigure();
    freshnessConfigure();
    hysteresisConfigure();
    interlockConfigure();
    logicGateConfigure();
    modeAuthorityConfigure();
    scaleMapConfigure();
    timerConfigure();
    latchConfigure();
    selectorConfigure();
    uiConfigure();
    return true;
}

static void startAccessPoint()
{
    String apSsid = gConfig.wifi.apSsid.length() > 0 ? gConfig.wifi.apSsid : "ShipController";
    String apPassword = gConfig.wifi.apPassword.length() > 0 ? gConfig.wifi.apPassword : "12345678";

    WiFi.mode(WIFI_AP);
    WiFi.softAP(apSsid.c_str(), apPassword.c_str());
    ipStr = WiFi.softAPIP().toString();
    Serial.println("AP MODE");
    Serial.println("AP SSID: " + apSsid);
}

static void sendJsonDoc(JsonDocument &doc)
{
    String json;
    json.reserve(measureJson(doc) + 1);
    serializeJson(doc, json);
    server.send(200, "application/json", json);
}

static String contentTypeForPath(const String &path)
{
    if (path.endsWith(".html")) return "text/html";
    if (path.endsWith(".css")) return "text/css";
    if (path.endsWith(".js")) return "application/javascript";
    if (path.endsWith(".json")) return "application/json";
    if (path.endsWith(".svg")) return "image/svg+xml";
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".ico")) return "image/x-icon";
    if (path.endsWith(".txt")) return "text/plain";
    return "application/octet-stream";
}

static void applyStaticCacheHeaders(const String &path)
{
    const bool hasVersion = server.hasArg("v");
    const bool isShellDocument = path == "/" || path.endsWith("/index.html") || path == "/index.html";
    if (isShellDocument)
    {
        server.sendHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
        return;
    }
    if (hasVersion)
    {
        server.sendHeader("Cache-Control", "public, max-age=31536000, immutable");
        return;
    }
    server.sendHeader("Cache-Control", "public, max-age=300");
}

static bool tryServeStaticFile(String path)
{
    if (path.isEmpty()) return false;
    if (!path.startsWith("/")) path = "/" + path;

    if (!LittleFS.begin()) return false;
    if (!LittleFS.exists(path)) return false;

    File file = LittleFS.open(path, "r");
    if (!file) return false;

    applyStaticCacheHeaders(path);
    server.streamFile(file, contentTypeForPath(path));
    file.close();
    return true;
}

static void sendJsonError(int statusCode, const char *message)
{
    JsonDocument doc;
    doc["ok"] = false;
    doc["message"] = message;
    String json;
    json.reserve(measureJson(doc) + 1);
    serializeJson(doc, json);
    server.send(statusCode, "application/json", json);
}

static void handleGetEditorProjectModel()
{
    String presetId = server.arg("preset");
    if (presetId.isEmpty())
    {
        sendJsonError(400, "preset is required");
        return;
    }

    JsonDocument modelDoc;
    JsonDocument response;
    response["ok"] = true;
    response["preset"] = presetId;
    if (loadEditorProjectModelFromStorage(presetId, modelDoc))
    {
        response["model"] = modelDoc.as<JsonVariant>();
    }
    else
    {
        response["model"] = nullptr;
        response["message"] = "Editor project model not found in storage";
    }
    sendJsonDoc(response);
}

static void handleSaveEditorProjectModel()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String version = request["version"] | "";
    String presetId = request["metadata"]["preset_id"] | request["id"] | "";
    if (version != "project_model_v2" || presetId.isEmpty())
    {
        sendJsonError(400, "Expected project_model_v2 with metadata.preset_id");
        return;
    }

    if (!saveEditorProjectModelToStorage(presetId, request))
    {
        sendJsonError(500, "Failed to save editor project storage");
        return;
    }

    JsonDocument response;
    response["ok"] = true;
    response["preset"] = presetId;
    response["message"] = "Editor project model saved";
    sendJsonDoc(response);
}

static void collectSignalReferencesForValue(JsonDocument &configDoc, const String &valueToFind,
    const String &fieldLabel, JsonArray refs, const String &skipBlockId, JsonArray internalIds);

static void setGeneratedMetadata(JsonObject object, const String &ownerId, const String &role)
{
    if (ownerId.isEmpty())
    {
        object.remove("auto_generated");
        object.remove("generated_by");
        object.remove("generated_role");
        return;
    }

    object["auto_generated"] = true;
    object["generated_by"] = ownerId;
    object["generated_role"] = role;
}

static void copyGeneratedMetadata(JsonObject source, JsonObject target)
{
    if (source.isNull())
    {
        return;
    }

    if ((source["auto_generated"] | false))
    {
        target["auto_generated"] = true;
    }
    if (!source["generated_by"].isNull())
    {
        target["generated_by"] = source["generated_by"].as<const char*>();
    }
    if (!source["generated_role"].isNull())
    {
        target["generated_role"] = source["generated_role"].as<const char*>();
    }
}

static void fillBlockJsonFromConfig(JsonObject blockObject, const String &blockId, JsonObject source, bool runtimeLoaded)
{
    const String type = source["type"] | "unknown";
    const String mode = source["mode"] | "";

    const String inputA = source["input_a"] | source["trigger"] | source["primary"] |
        source["input"] | source["toggle_input"] | source["set_input"] |
        source["request_signal"] | source["source_a"] | "";
    const String inputB = source["input_b"] | source["enable"] | source["secondary"] |
        source["compare_signal"] | source["reset_input"] | source["permissive_signal"] |
        source["source_b"] | "";
    const String inputC = source["input_c"] | source["quality_input"] |
        source["quality_source"] | source["inhibit_signal"] | source["interlock_signal"] |
        source["service_signal"] | "";
    const String control = source["control"] | source["select"] | source["mode_select"] | "";
    const String output = source["output_a"] | source["output"] | "";

    blockObject["id"] = blockId;
    blockObject["type"] = type;
    blockObject["mode"] = mode;
    blockObject["input_a"] = inputA;
    blockObject["input_b"] = inputB;
    blockObject["input_c"] = inputC;
    blockObject["control"] = control;
    blockObject["output_a"] = output;
    blockObject["period_ms"] = source["period_ms"] | source["bucket_ms"] | 0;
    blockObject["duration_ms"] = source["duration_ms"] | source["sample_ms"] | source["window_ms"] | 0;
    blockObject["debounce_ms"] = source["debounce_ms"] | 50;
    blockObject["long_press_ms"] = source["long_press_ms"] | 800;
    blockObject["double_press_ms"] = source["double_press_ms"] | 350;
    blockObject["compare_value"] = source["compare_value"] | source["value_a"] | source["step"] |
        source["scale"] | source["threshold_on"] | 0.0f;
    blockObject["compare_value_b"] = source["compare_value_b"] | source["value_b"] |
        source["initial_value"] | source["smoothing_alpha"] | source["threshold_off"] | 0.0f;
    blockObject["value_a"] = source["value_a"] | source["compare_value"] | source["step"] |
        source["scale"] | source["threshold_on"] | 0.0f;
    blockObject["value_b"] = source["value_b"] | source["compare_value_b"] |
        source["initial_value"] | source["smoothing_alpha"] | source["threshold_off"] | 0.0f;
    blockObject["value_c"] = source["value_c"] | source["save_every_delta"] | 0.0f;
    blockObject["value_d"] = source["value_d"] | source["save_every_ms"] | 0.0f;
    blockObject["save_every_delta"] = source["save_every_delta"] | source["value_c"] | 0.0f;
    blockObject["save_every_ms"] = source["save_every_ms"] | source["value_d"] | 0.0f;
    blockObject["retrigger"] = source["retrigger"] | false;
    blockObject["retain"] = source["retain"] | false;
    blockObject["reset_priority"] = source["reset_priority"] | false;
    blockObject["start_immediately"] = source["start_immediately"] | false;
    blockObject["trigger"] = source["trigger"] | inputA;
    blockObject["enable"] = source["enable"] | inputB;
    blockObject["primary"] = source["primary"] | inputA;
    blockObject["secondary"] = source["secondary"] | inputB;
    blockObject["select"] = source["select"] | control;
    blockObject["input"] = source["input"] | inputA;
    blockObject["compare_signal"] = source["compare_signal"] | inputB;
    blockObject["step"] = source["step"] | source["value_a"] | source["compare_value"] | 0.0f;
    blockObject["initial_value"] = source["initial_value"] | source["value_b"] | source["compare_value_b"] | 0.0f;
    blockObject["request_signal"] = source["request_signal"] | inputA;
    blockObject["permissive_signal"] = source["permissive_signal"] | inputB;
    blockObject["inhibit_signal"] = source["inhibit_signal"] | source["interlock_signal"] | inputC;
    blockObject["service_signal"] = source["service_signal"] | inputC;
    blockObject["mode_select"] = source["mode_select"] | control;
    blockObject["toggle_input"] = source["toggle_input"] | inputA;
    blockObject["set_input"] = source["set_input"] | inputA;
    blockObject["reset_input"] = source["reset_input"] | inputB;
    blockObject["output"] = source["output"] | output;
    blockObject["source_a"] = source["source_a"] | inputA;
    blockObject["source_b"] = source["source_b"] | inputB;
    blockObject["quality_input"] = source["quality_input"] | source["quality_source"] | inputC;
    blockObject["quality_source"] = source["quality_source"] | source["quality_input"] | inputC;
    blockObject["threshold_on"] = source["threshold_on"] | source["value_a"] | source["compare_value"] | 0.0f;
    blockObject["threshold_off"] = source["threshold_off"] | source["value_b"] | source["compare_value_b"] | 0.0f;
    blockObject["scale"] = source["scale"] | source["value_a"] | source["compare_value"] | 0.0f;
    blockObject["smoothing_alpha"] = source["smoothing_alpha"] | source["value_b"] | source["compare_value_b"] | 0.0f;
    blockObject["sample_ms"] = source["sample_ms"] | source["duration_ms"] | 0;
    blockObject["bucket_ms"] = source["bucket_ms"] | source["period_ms"] | 0;
    blockObject["window_ms"] = source["window_ms"] | source["duration_ms"] | 0;
    blockObject["timeout_ms"] = source["timeout_ms"] | source["duration_ms"] | 0;
    blockObject["runtime_loaded"] = runtimeLoaded;
    blockObject["config_only"] = !runtimeLoaded;

    copyGeneratedMetadata(source, blockObject);
}

static String readChipTemplateIdForBoard(const BoardConfig *board)
{
    if (gConfig.system.active_chip_template.length() > 0)
    {
        return gConfig.system.active_chip_template;
    }

    if (board && !board->templateId.isEmpty())
    {
        for (int i = 0; i < gConfig.boardTemplateCount; i++)
        {
            if (gConfig.boardTemplates[i].id == board->templateId)
            {
                return gConfig.boardTemplates[i].chipTemplateId;
            }
        }
    }

    return "";
}

static void handleDetectChip()
{
    JsonDocument doc;
    doc["model"] = ESP.getChipModel();
    doc["revision"] = ESP.getChipRevision();
    sendJsonDoc(doc);
}

static void handleGetBoards()
{
    JsonDocument doc;
    doc["active"] = gConfig.system.active_board;
    JsonObject list = ensureObject(doc, "list");

    for (int i = 0; i < gConfig.boardCount; i++)
    {
        const BoardConfig &board = gConfig.boards[i];
        JsonObject boardObject = ensureObject(list, board.name);
        boardObject["chip"] = board.chip;
        boardObject["template"] = board.templateId;

        JsonObject resources = ensureObject(boardObject, "resources");
        for (int j = 0; j < board.resourceCount; j++)
        {
            const BoardResourceConfig &resource = board.resources[j];
            JsonObject resourceObject = ensureObject(resources, resource.id);
            resourceObject["gpio"] = resource.gpio;
            resourceObject["label"] = resource.label;
            JsonArray capabilities = ensureArray(resourceObject, "capabilities");
            for (int k = 0; k < resource.capabilityCount; k++)
            {
                capabilities.add(channelTypeToString(resource.capabilities[k]));
            }
        }
    }

    sendJsonDoc(doc);
}

static void handleGetHardware()
{
    JsonDocument doc;
    const BoardConfig *board = getActiveBoard();
    if (board)
    {
        doc["active_board"] = board->name;
        doc["chip"] = board->chip;
        doc["template"] = board->templateId;
    }

    JsonObject modules = ensureObject(doc, "modules");
    modules["oled"] = gConfig.oled.enabled && kFeatureOled;
    modules["lora"] = gConfig.lora.enabled && kFeatureLora;
    modules["sd"] = gConfig.sd.enabled;
    modules["led"] = gConfig.led.enabled;
    modules["battery"] = gConfig.battery.enabled;
    JsonObject features = ensureObject(doc, "features");
    features["lora"] = kFeatureLora;
    features["oled"] = kFeatureOled;
    features["comms"] = kFeatureComms;
    features["modbus"] = kFeatureModbus;
    JsonArray systemSources = ensureArray(doc, "system_sources");
    appendSystemSources(systemSources);

    JsonObject oled = ensureObject(doc, "oled");
    oled["show_ip_on_fallback"] = gConfig.oled.showIpOnFallback;

    HardwarePinInfo items[MAX_HARDWARE_PINS];
    int count = buildHardwarePinMap(items, MAX_HARDWARE_PINS);
    JsonArray pins = ensureArray(doc, "pins");

    for (int i = 0; i < count; i++)
    {
        JsonObject pinObject = addObject(pins);
        pinObject["gpio"] = items[i].gpio;
        pinObject["class"] = hardwarePinClassToString(items[i].pinClass);
        pinObject["available"] = items[i].availableForChannel;
        pinObject["internal_pullup"] = items[i].internalPullup;
        pinObject["input_only"] = items[i].isInputOnly;
        pinObject["strapping"] = items[i].isStrapping;
        pinObject["owner"] = items[i].owner;
        pinObject["reason"] = items[i].reason;
        pinObject["resource"] = items[i].resourceId;
        pinObject["channel"] = items[i].channelId;
    }

    sendJsonDoc(doc);
}

static void handleGetChannels()
{
    JsonDocument doc;
    JsonObject channels = ensureObject(doc, "channels");
    JsonDocument configDoc;
    bool haveConfig = loadConfigDocument(configDoc);
    JsonObject configChannels = haveConfig ? configDoc["channels"].as<JsonObject>() : JsonObject();
    for (int i = 0; i < gConfig.channelCount; i++)
    {
        const ChannelConfig &channel = gConfig.channels[i];
        JsonObject channelObject = ensureObject(channels, channel.id);
        const BoardConfig *board = getActiveBoard();
        const BoardResourceConfig *localResource = (board != nullptr) ? findBoardResource(*board, channel.resourceId) : nullptr;
        const ExternalResourceConfig *externalResource = findExternalResourceConfig(channel.resourceId);
        channelObject["resource"] = channel.resourceId;
        channelObject["source_kind"] = externalResource ? "external" : "local";
        channelObject["source_exists"] = localResource != nullptr || externalResource != nullptr;
        channelObject["source_label"] = externalResource
            ? (externalResource->label.length() > 0 ? externalResource->label : externalResource->id)
            : (localResource ? localResource->label : channel.resourceId);
        channelObject["type"] = channelTypeToString(channel.type);
        channelObject["inverted"] = channel.inverted;
        channelObject["pullup"] = channel.pullup;
        channelObject["initial"] = channel.initial;
        channelObject["profile"] = "raw";
        channelObject["units"] = "";
        channelObject["filter"] = "none";
        channelObject["raw_min"] = 0.0f;
        channelObject["raw_max"] = 4095.0f;
        channelObject["eng_min"] = 0.0f;
        channelObject["eng_max"] = 100.0f;
        channelObject["offset"] = 0.0f;
        channelObject["scale"] = 1.0f;
        channelObject["clamp_min"] = 0.0f;
        channelObject["clamp_max"] = 100.0f;
        channelObject["filter_alpha"] = 0.2f;
        channelObject["startup_value"] = 0.0f;
        channelObject["clamp_enabled"] = false;
        if (!configChannels.isNull())
        {
            JsonObject configChannel = configChannels[channel.id].as<JsonObject>();
            if (!configChannel.isNull())
            {
                channelObject["profile"] = configChannel["profile"] | "raw";
                channelObject["units"] = configChannel["units"] | "";
                channelObject["filter"] = configChannel["filter"] | "none";
                channelObject["raw_min"] = configChannel["raw_min"] | 0.0f;
                channelObject["raw_max"] = configChannel["raw_max"] | 4095.0f;
                channelObject["eng_min"] = configChannel["eng_min"] | 0.0f;
                channelObject["eng_max"] = configChannel["eng_max"] | 100.0f;
                channelObject["offset"] = configChannel["offset"] | 0.0f;
                channelObject["scale"] = configChannel["scale"] | 1.0f;
                channelObject["clamp_min"] = configChannel["clamp_min"] | 0.0f;
                channelObject["clamp_max"] = configChannel["clamp_max"] | 100.0f;
                channelObject["filter_alpha"] = configChannel["filter_alpha"] | 0.2f;
                channelObject["startup_value"] = configChannel["startup_value"] | 0.0f;
                channelObject["clamp_enabled"] = configChannel["clamp_enabled"] | false;
            }
            copyGeneratedMetadata(configChannel, channelObject);
        }
    }
    sendJsonDoc(doc);
}

static void handleGetSignals()
{
    gSignals.updateFromRuntime();

    JsonDocument doc;
    JsonObject signals = ensureObject(doc, "signals");

    for (int i = 0; i < gSignals.getCount(); i++)
    {
        const SignalRecord *record = gSignals.getAt(i);
        if (!record) continue;

        JsonObject signalObject = ensureObject(signals, record->definition.id);
        signalObject["label"] = record->definition.label;
        signalObject["class"] = signalClassToString(record->definition.signalClass);
        signalObject["direction"] = signalDirectionToString(record->definition.direction);
        signalObject["source"] = signalSourceTypeToString(record->definition.sourceType);
        signalObject["resource"] = record->definition.resourceId;
        signalObject["backing"] = record->definition.resourceBacked ? "resource" : "derived";
        signalObject["derived_type"] = record->definition.derivedType;
        signalObject["source_signal"] = record->definition.sourceSignalId;
        signalObject["substitute_signal"] = record->definition.substituteSignalId;
        signalObject["enable_signal"] = record->definition.enableSignalId;
        signalObject["channel_type"] = channelTypeToString(record->definition.channelType);
        signalObject["units"] = record->definition.units;
        signalObject["quality"] = signalQualityToString(record->state.quality);
        signalObject["mode"] = signalModeToString(record->state.mode);
        signalObject["value"] = record->state.engineeringValue;
        signalObject["raw"] = record->state.rawValue;
        signalObject["bool_value"] = record->state.boolValue;
        signalObject["timestamp_ms"] = record->state.timestampMs;
        signalObject["status"] = record->state.statusText;
        signalObject["manual_override"] = record->state.hasManualOverride;
        signalObject["substituted"] = record->state.hasSubstitution;
    }

    sendJsonDoc(doc);
}

static void handleGetBlocks()
{
    JsonDocument doc;
    JsonObject blocks = ensureObject(doc, "blocks");
    JsonDocument configDoc;
    bool haveConfig = loadConfigDocument(configDoc);
    JsonObject configBlocks = haveConfig ? configDoc["blocks"].as<JsonObject>() : JsonObject();

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        JsonObject blockObject = ensureObject(blocks, block.id);
        JsonObject runtimeBlock = blockObject;
        runtimeBlock["type"] = blockTypeToString(block.type);
        runtimeBlock["mode"] = block.mode;
        runtimeBlock["input_a"] = block.inputA;
        runtimeBlock["input_b"] = block.inputB;
        runtimeBlock["input_c"] = block.inputC;
        runtimeBlock["control"] = block.controlSignal;
        runtimeBlock["output_a"] = block.outputA;
        runtimeBlock["period_ms"] = block.periodMs;
        runtimeBlock["duration_ms"] = block.durationMs;
        runtimeBlock["debounce_ms"] = block.debounceMs;
        runtimeBlock["long_press_ms"] = block.longPressMs;
        runtimeBlock["double_press_ms"] = block.doublePressMs;
        runtimeBlock["compare_value"] = block.compareValueA;
        runtimeBlock["compare_value_b"] = block.compareValueB;
        runtimeBlock["value_a"] = block.compareValueA;
        runtimeBlock["value_b"] = block.compareValueB;
        runtimeBlock["value_c"] = block.extraValueC;
        runtimeBlock["value_d"] = block.extraValueD;
        runtimeBlock["save_every_delta"] = block.extraValueC;
        runtimeBlock["save_every_ms"] = block.extraValueD;
        runtimeBlock["retrigger"] = block.retrigger;
        runtimeBlock["retain"] = block.retain;
        runtimeBlock["reset_priority"] = block.resetPriority;
        runtimeBlock["start_immediately"] = block.startImmediately;
        runtimeBlock["trigger"] = block.inputA;
        runtimeBlock["enable"] = block.inputB;
        runtimeBlock["primary"] = block.inputA;
        runtimeBlock["secondary"] = block.inputB;
        runtimeBlock["select"] = block.controlSignal;
        runtimeBlock["input"] = block.inputA;
        runtimeBlock["compare_signal"] = block.inputB;
        runtimeBlock["step"] = block.compareValueA;
        runtimeBlock["initial_value"] = block.compareValueB;
        runtimeBlock["request_signal"] = block.inputA;
        runtimeBlock["permissive_signal"] = block.inputB;
        runtimeBlock["inhibit_signal"] = block.inputC;
        runtimeBlock["service_signal"] = block.inputC;
        runtimeBlock["mode_select"] = block.controlSignal;
        runtimeBlock["primary_mode_signal"] = block.inputA;
        runtimeBlock["secondary_mode_signal"] = block.inputB;
        runtimeBlock["logic_input_a"] = block.inputA;
        runtimeBlock["logic_input_b"] = block.inputB;
        runtimeBlock["toggle_input"] = block.inputA;
        runtimeBlock["set_input"] = block.inputA;
        runtimeBlock["reset_input"] = block.inputB;
        runtimeBlock["output"] = block.outputA;
        runtimeBlock["runtime_loaded"] = true;
        runtimeBlock["config_only"] = false;
        if (!configBlocks.isNull())
        {
            JsonObject configBlock = configBlocks[block.id].as<JsonObject>();
            copyGeneratedMetadata(configBlock, runtimeBlock);
        }
    }

    if (!configBlocks.isNull())
    {
        for (JsonPair kv : configBlocks)
        {
            const String blockId = kv.key().c_str();
            if (!blocks[blockId].isNull())
            {
                continue;
            }

            JsonObject configBlock = kv.value().as<JsonObject>();
            if (configBlock.isNull())
            {
                continue;
            }

            JsonObject blockObject = ensureObject(blocks, blockId);
            fillBlockJsonFromConfig(blockObject, blockId, configBlock, false);
        }
    }

    sendJsonDoc(doc);
}

static void handleGetDisplay()
{
    JsonDocument doc;
    doc["enabled"] = gConfig.display.enabled;
    doc["driver"] = gConfig.display.driver;
    doc["width"] = gConfig.display.width;
    doc["height"] = gConfig.display.height;
    doc["rotation"] = gConfig.display.rotation;
    doc["startup_screen"] = gConfig.display.startupScreenId;
    doc["default_language"] = gConfig.display.defaultLanguage;
    doc["screen_count"] = gConfig.display.screenCount;

    JsonObject screens = ensureObject(doc, "screens");

    for (int screenIndex = 0; screenIndex < gConfig.display.screenCount; screenIndex++)
    {
        const DisplayScreenConfig &screen = gConfig.display.screens[screenIndex];
        JsonObject screenObject = ensureObject(screens, screen.id);
        screenObject["label"] = screen.label;
        screenObject["group"] = screen.group;
        screenObject["visible_if"] = screen.visibleIfSignalId;
        screenObject["refresh_ms"] = screen.refreshMs;
        screenObject["auto_cycle_ms"] = screen.autoCycleMs;
        screenObject["widget_count"] = screen.widgetCount;

        JsonObject widgets = ensureObject(screenObject, "widgets");
        for (int widgetIndex = 0; widgetIndex < screen.widgetCount; widgetIndex++)
        {
            const DisplayWidgetConfig &widget = screen.widgets[widgetIndex];
            JsonObject widgetObject = ensureObject(widgets, widget.id);
            widgetObject["type"] = displayWidgetTypeToString(widget.type);
            widgetObject["x"] = widget.x;
            widgetObject["y"] = widget.y;
            widgetObject["w"] = widget.w;
            widgetObject["h"] = widget.h;
            widgetObject["label"] = widget.label;
            widgetObject["signal"] = widget.signalId;
            widgetObject["visible_if"] = widget.visibleIfSignalId;
            widgetObject["signal_exists"] = widget.signalId.isEmpty() ? false : (isSystemSourceId(widget.signalId) || (gSignals.findIndex(widget.signalId) >= 0));
            widgetObject["visible_if_exists"] = widget.visibleIfSignalId.isEmpty() ? true : (gSignals.findIndex(widget.visibleIfSignalId) >= 0);

            JsonObject formatObject = ensureObject(widgetObject, "format");
            formatObject["units"] = widget.format.units;
            formatObject["precision"] = widget.format.precision;
            formatObject["duration_style"] = widget.format.durationStyle;
            formatObject["true_text"] = widget.format.trueText;
            formatObject["false_text"] = widget.format.falseText;
            formatObject["prefix"] = widget.format.prefix;
            formatObject["suffix"] = widget.format.suffix;
            formatObject["empty_text"] = widget.format.emptyText;

            JsonObject styleObject = ensureObject(widgetObject, "style");
            styleObject["font"] = widget.style.font;
            styleObject["align"] = widget.style.align;
            styleObject["invert"] = widget.style.invert;
            styleObject["emphasis"] = widget.style.emphasis;
            styleObject["frame"] = widget.style.frame;
            styleObject["color_role"] = widget.style.colorRole;
        }
    }

    sendJsonDoc(doc);
}

static void handleGetAlarms()
{
    JsonDocument doc;
    doc["alarm_count"] = gAlarms.getCount();
    doc["active_count"] = gAlarms.getActiveCount();
    doc["pending_count"] = gAlarms.getPendingCount();
    doc["unacked_count"] = gAlarms.getUnackedCount();

    const AlarmDefinition *latestActiveDefinition = gAlarms.getLatestActiveDefinition();
    const AlarmRuntimeState *latestActiveState = gAlarms.getLatestActiveState();
    doc["latest_active_id"] = latestActiveDefinition ? latestActiveDefinition->id : "";
    doc["latest_active_label"] = latestActiveDefinition ? latestActiveDefinition->label : "";
    doc["latest_active_severity"] = latestActiveDefinition ? latestActiveDefinition->severity : "";
    doc["latest_active_status"] = latestActiveState ? latestActiveState->statusText : "";

    JsonObject alarms = ensureObject(doc, "alarms");
    for (int i = 0; i < gAlarms.getCount(); i++)
    {
        const AlarmDefinition *definition = gAlarms.getDefinitionAt(i);
        const AlarmRuntimeState *state = gAlarms.getStateAt(i);
        if (!definition || !state) continue;

        JsonObject alarmObject = ensureObject(alarms, definition->id);
        alarmObject["label"] = definition->label;
        alarmObject["source_signal"] = definition->sourceSignalId;
        alarmObject["enable_signal"] = definition->enableSignalId;
        alarmObject["severity"] = definition->severity;
        alarmObject["delay_ms"] = definition->delayMs;
        alarmObject["latched"] = definition->latched;
        alarmObject["ack_required"] = definition->ackRequired;
        alarmObject["source_exists"] = definition->sourceSignalId.isEmpty() ? false : (gSignals.findIndex(definition->sourceSignalId) >= 0);
        alarmObject["enable_exists"] = definition->enableSignalId.isEmpty() ? true : (gSignals.findIndex(definition->enableSignalId) >= 0);
        alarmObject["condition"] = state->condition;
        alarmObject["pending"] = state->pending;
        alarmObject["active"] = state->active;
        alarmObject["suppressed"] = state->suppressed;
        alarmObject["acknowledged"] = state->acknowledged;
        alarmObject["pending_since_ms"] = state->pendingSinceMs;
        alarmObject["active_since_ms"] = state->activeSinceMs;
        alarmObject["last_change_ms"] = state->lastChangeMs;
        alarmObject["status"] = state->statusText;
    }

    JsonArray events = ensureArray(doc, "recent_events");
    for (int i = 0; i < gAlarms.getRecentEventCount(); i++)
    {
        const AlarmEventRecord *eventRecord = gAlarms.getRecentEventAt(i);
        if (!eventRecord) continue;
        JsonObject eventObject = addObject(events);
        eventObject["timestamp_ms"] = eventRecord->timestampMs;
        eventObject["alarm_id"] = eventRecord->alarmId;
        eventObject["type"] = eventRecord->type;
        eventObject["severity"] = eventRecord->severity;
        eventObject["text"] = eventRecord->text;
    }

    sendJsonDoc(doc);
}

static void handleGetSequences()
{
    JsonDocument doc;
    doc["sequence_count"] = gSequences.getCount();
    doc["running_count"] = gSequences.getRunningCount();
    doc["fault_count"] = gSequences.getFaultCount();
    doc["done_count"] = gSequences.getDoneCount();

    JsonObject sequences = ensureObject(doc, "sequences");
    for (int i = 0; i < gSequences.getCount(); i++)
    {
        const SequenceDefinition *definition = gSequences.getDefinitionAt(i);
        const SequenceRuntimeState *runtime = gSequences.getStateAt(i);
        const SequenceStateDefinition *currentState = gSequences.getCurrentStateAt(i);
        const SequenceTransitionDefinition *pendingTransition = gSequences.getPendingTransitionAt(i);
        if (!definition || !runtime) continue;

        JsonObject sequenceObject = ensureObject(sequences, definition->id);
        sequenceObject["label"] = definition->label;
        sequenceObject["enable_signal"] = definition->enableSignalId;
        sequenceObject["start_signal"] = definition->startSignalId;
        sequenceObject["trip_signal"] = definition->tripSignalId;
        sequenceObject["reset_signal"] = definition->resetSignalId;
        sequenceObject["initial_state"] = definition->initialStateId;
        sequenceObject["fault_state"] = definition->faultStateId;
        sequenceObject["done_state"] = definition->doneStateId;
        sequenceObject["auto_start"] = definition->autoStart;
        sequenceObject["enabled"] = runtime->enabled;
        sequenceObject["running"] = runtime->running;
        sequenceObject["waiting"] = runtime->waiting;
        sequenceObject["done"] = runtime->done;
        sequenceObject["fault"] = runtime->faulted;
        sequenceObject["status"] = runtime->statusText;
        sequenceObject["waiting_reason"] = runtime->waitingReason;
        sequenceObject["detail"] = runtime->detailText;
        sequenceObject["fault_reason"] = runtime->faultReason;
        sequenceObject["current_state"] = currentState ? currentState->id : "";
        sequenceObject["current_state_label"] = currentState ? currentState->label : "";
        sequenceObject["current_state_index"] = runtime->currentStateIndex;
        sequenceObject["pending_transition"] = pendingTransition ? pendingTransition->id : "";
        sequenceObject["pending_transition_label"] = pendingTransition ? pendingTransition->label : "";
        sequenceObject["pending_transition_signal"] = pendingTransition ? pendingTransition->whenSignalId : "";
        sequenceObject["pending_transition_delay_ms"] = pendingTransition ? pendingTransition->delayMs : 0;
        sequenceObject["pending_transition_elapsed_ms"] = pendingTransition && runtime->pendingTransitionIndex >= 0 && runtime->pendingTransitionSinceMs > 0
            ? (millis() - runtime->pendingTransitionSinceMs)
            : 0;
        sequenceObject["state_since_ms"] = runtime->stateSinceMs;
        sequenceObject["last_change_ms"] = runtime->lastChangeMs;

        sequenceObject["enable_exists"] = definition->enableSignalId.isEmpty() ? true : (gSignals.findIndex(definition->enableSignalId) >= 0);
        sequenceObject["start_exists"] = definition->startSignalId.isEmpty() ? true : (gSignals.findIndex(definition->startSignalId) >= 0);
        sequenceObject["trip_exists"] = definition->tripSignalId.isEmpty() ? true : (gSignals.findIndex(definition->tripSignalId) >= 0);
        sequenceObject["reset_exists"] = definition->resetSignalId.isEmpty() ? true : (gSignals.findIndex(definition->resetSignalId) >= 0);

        JsonObject statesObject = ensureObject(sequenceObject, "states");
        for (int stateIndex = 0; stateIndex < definition->stateCount; stateIndex++)
        {
            const SequenceStateDefinition &state = definition->states[stateIndex];
            JsonObject stateObject = ensureObject(statesObject, state.id);
            stateObject["label"] = state.label;
            stateObject["permissive_signal"] = state.permissiveSignalId;
            stateObject["timeout_ms"] = state.timeoutMs;
            stateObject["timeout_to"] = state.timeoutToStateId;
            stateObject["active"] = runtime->currentStateIndex == stateIndex;
            stateObject["permissive_exists"] = state.permissiveSignalId.isEmpty() ? true : (gSignals.findIndex(state.permissiveSignalId) >= 0);

            JsonArray actionsOn = ensureArray(stateObject, "actions_on");
            for (int actionIndex = 0; actionIndex < state.actionsOnCount; actionIndex++)
            {
                actionsOn.add(state.actionsOn[actionIndex]);
            }

            JsonArray actionsOff = ensureArray(stateObject, "actions_off");
            for (int actionIndex = 0; actionIndex < state.actionsOffCount; actionIndex++)
            {
                actionsOff.add(state.actionsOff[actionIndex]);
            }

            JsonObject transitionsObject = ensureObject(stateObject, "transitions");
            for (int transitionIndex = 0; transitionIndex < state.transitionCount; transitionIndex++)
            {
                const SequenceTransitionDefinition &transition = state.transitions[transitionIndex];
                JsonObject transitionObject = ensureObject(transitionsObject, transition.id);
                transitionObject["label"] = transition.label;
                transitionObject["to"] = transition.toStateId;
                transitionObject["when_signal"] = transition.whenSignalId;
                transitionObject["delay_ms"] = transition.delayMs;
                transitionObject["invert"] = transition.invert;
                transitionObject["when_exists"] = transition.whenSignalId.isEmpty() ? false : (gSignals.findIndex(transition.whenSignalId) >= 0);
                transitionObject["active_delay"] = runtime->currentStateIndex == stateIndex && runtime->pendingTransitionIndex == transitionIndex;
                transitionObject["delay_elapsed_ms"] = transitionObject["active_delay"].as<bool>() && runtime->pendingTransitionSinceMs > 0
                    ? (millis() - runtime->pendingTransitionSinceMs)
                    : 0;
            }
        }
    }

    JsonArray events = ensureArray(doc, "recent_events");
    for (int i = 0; i < gSequences.getRecentEventCount(); i++)
    {
        const SequenceEventRecord *eventRecord = gSequences.getRecentEventAt(i);
        if (!eventRecord) continue;
        JsonObject eventObject = addObject(events);
        eventObject["timestamp_ms"] = eventRecord->timestampMs;
        eventObject["sequence_id"] = eventRecord->sequenceId;
        eventObject["type"] = eventRecord->type;
        eventObject["from_state"] = eventRecord->fromStateId;
        eventObject["to_state"] = eventRecord->toStateId;
        eventObject["text"] = eventRecord->text;
    }

    sendJsonDoc(doc);
}

static void handleGetBuses()
{
    JsonDocument doc;
    doc["count"] = gConfig.busCount;
    JsonObject buses = ensureObject(doc, "buses");

    for (int i = 0; i < gConfig.busCount; i++)
    {
        const BusConfig &bus = gConfig.buses[i];
        const BusRuntimeState *runtime = gComms.getBusStateAt(i);
        JsonObject busObject = ensureObject(buses, bus.id);
        busObject["label"] = bus.label;
        busObject["type"] = busTypeToString(bus.type);
        busObject["enabled"] = bus.enabled;
        busObject["sda"] = bus.sda;
        busObject["scl"] = bus.scl;
        busObject["speed"] = bus.speed;
        busObject["scan"] = bus.scan;
        busObject["tx"] = bus.tx;
        busObject["rx"] = bus.rx;
        busObject["baud"] = bus.baud;
        busObject["parity"] = bus.parity;
        busObject["stop_bits"] = bus.stopBits;
        busObject["de_pin"] = bus.dePin;
        busObject["initialized"] = runtime ? runtime->initialized : false;
        busObject["status"] = runtime ? runtime->status : "missing_runtime";
        busObject["last_error"] = runtime ? runtime->lastError : "";
    }

    sendJsonDoc(doc);
}

static void handleGetDevices()
{
    JsonDocument doc;
    doc["count"] = gConfig.deviceCount;
    JsonObject devices = ensureObject(doc, "devices");
    JsonDocument configDoc;
    bool haveConfig = loadConfigDocument(configDoc);
    JsonObject configDevices = haveConfig ? configDoc["devices"].as<JsonObject>() : JsonObject();

    for (int i = 0; i < gConfig.deviceCount; i++)
    {
        const DeviceConfig &device = gConfig.devices[i];
        const DeviceRuntimeState *runtime = gComms.getDeviceStateAt(i);
        JsonObject deviceObject = ensureObject(devices, device.id);
        deviceObject["label"] = device.label;
        deviceObject["driver"] = device.driver;
        deviceObject["bus_id"] = device.busId;
        deviceObject["enabled"] = device.enabled;
        deviceObject["address"] = device.address;
        deviceObject["poll_ms"] = device.pollMs;
        deviceObject["timeout_ms"] = device.timeoutMs;
        deviceObject["retry_count"] = device.retryCount;
        deviceObject["bus_exists"] = gComms.findBusIndex(device.busId) >= 0;
        deviceObject["online"] = runtime ? runtime->online : false;
        deviceObject["last_ok_ms"] = runtime ? runtime->lastOkMs : 0;
        deviceObject["last_poll_ms"] = runtime ? runtime->lastPollMs : 0;
        deviceObject["error_count"] = runtime ? runtime->errorCount : 0;
        deviceObject["status"] = runtime ? runtime->status : "missing_runtime";
        deviceObject["virtual_mode"] = "triangle";
        deviceObject["virtual_min_raw"] = 0;
        deviceObject["virtual_max_raw"] = 32767;
        deviceObject["virtual_manual_raw"] = 12000;
        deviceObject["virtual_period_ms"] = 4000;
        if (!configDevices.isNull())
        {
            JsonObject configDevice = configDevices[device.id].as<JsonObject>();
            if (!configDevice.isNull())
            {
                deviceObject["virtual_mode"] = configDevice["virtual_mode"] | "triangle";
                deviceObject["virtual_min_raw"] = configDevice["virtual_min_raw"] | 0;
                deviceObject["virtual_max_raw"] = configDevice["virtual_max_raw"] | 32767;
                deviceObject["virtual_manual_raw"] = configDevice["virtual_manual_raw"] | 12000;
                deviceObject["virtual_period_ms"] = configDevice["virtual_period_ms"] | 4000;
            }
        }
    }

    sendJsonDoc(doc);
}

static void handleGetExternalResources()
{
    JsonDocument doc;
    doc["count"] = gConfig.externalResourceCount;
    JsonObject resources = ensureObject(doc, "external_resources");

    for (int i = 0; i < gConfig.externalResourceCount; i++)
    {
        const ExternalResourceConfig &resource = gConfig.externalResources[i];
        const ExternalResourceRuntimeState *runtime = gComms.getExternalResourceStateAt(i);
        JsonObject resourceObject = ensureObject(resources, resource.id);
        resourceObject["label"] = resource.label;
        resourceObject["device_id"] = resource.deviceId;
        resourceObject["kind"] = resource.kind;
        resourceObject["capability"] = channelTypeToString(resource.capability);
        resourceObject["source_index"] = resource.sourceIndex;
        resourceObject["units"] = resource.units;
        resourceObject["device_exists"] = gComms.findDeviceIndex(resource.deviceId) >= 0;
        resourceObject["online"] = runtime ? runtime->online : false;
        resourceObject["quality"] = runtime ? runtime->quality : "fault";
        resourceObject["status"] = runtime ? runtime->status : "missing_runtime";
        resourceObject["timestamp_ms"] = runtime ? runtime->timestampMs : 0;
        resourceObject["raw_value"] = runtime ? runtime->analogRaw : 0;
    }

    sendJsonDoc(doc);
}

static void handleSaveBus()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String busId = request["bus_id"] | "";
    if (busId.isEmpty())
    {
        sendJsonError(400, "bus_id is required");
        return;
    }

    BusType busType = parseBusType(request["type"] | "");
    if (busType == BusType::Unknown)
    {
        sendJsonError(400, "Unsupported bus type");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject busesObject = ensureObject(configDoc, "buses");
    if (busesObject[busId].isNull() && busesObject.size() >= MAX_COMMS_BUSES)
    {
        sendJsonError(409, "Bus limit reached");
        return;
    }

    JsonObject busObject = ensureObject(busesObject, busId);
    busObject["label"] = request["label"] | busId;
    busObject["type"] = busTypeToString(busType);
    busObject["enabled"] = request["enabled"] | true;
    busObject.remove("sda");
    busObject.remove("scl");
    busObject.remove("speed");
    busObject.remove("scan");
    busObject.remove("tx");
    busObject.remove("rx");
    busObject.remove("baud");
    busObject.remove("parity");
    busObject.remove("stop_bits");
    busObject.remove("de_pin");

    if (busType == BusType::I2C)
    {
        busObject["sda"] = request["sda"] | 21;
        busObject["scl"] = request["scl"] | 22;
        busObject["speed"] = request["speed"] | 400000UL;
        busObject["scan"] = request["scan"] | true;
    }
    else
    {
        busObject["tx"] = request["tx"] | 17;
        busObject["rx"] = request["rx"] | 16;
        busObject["baud"] = request["baud"] | 9600UL;
        busObject["parity"] = request["parity"] | "none";
        busObject["stop_bits"] = request["stop_bits"] | 1;
        if (busType == BusType::RS485)
        {
            busObject["de_pin"] = request["de_pin"] | -1;
        }
    }

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Bus saved" : "Bus saved, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleDeleteBus()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String busId = request["bus_id"] | "";
    if (busId.isEmpty())
    {
        sendJsonError(400, "bus_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject busesObject = configDoc["buses"].as<JsonObject>();
    if (busesObject.isNull() || busesObject[busId].isNull())
    {
        sendJsonError(404, "Bus not found");
        return;
    }

    JsonObject devicesObject = configDoc["devices"].as<JsonObject>();
    if (!devicesObject.isNull())
    {
        for (JsonPair kv : devicesObject)
        {
            JsonObject deviceObject = kv.value().as<JsonObject>();
            if (String(deviceObject["bus_id"] | "") == busId)
            {
                sendJsonError(409, "Bus is used by one or more devices");
                return;
            }
        }
    }

    busesObject.remove(busId);

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Bus deleted" : "Bus deleted, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleSaveDevice()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String deviceId = request["device_id"] | "";
    if (deviceId.isEmpty())
    {
        sendJsonError(400, "device_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject devicesObject = ensureObject(configDoc, "devices");
    if (devicesObject[deviceId].isNull() && devicesObject.size() >= MAX_COMMS_DEVICES)
    {
        sendJsonError(409, "Device limit reached");
        return;
    }

    String busId = request["bus_id"] | "";
    JsonObject busesObject = configDoc["buses"].as<JsonObject>();
    if (busId.isEmpty() || busesObject.isNull() || busesObject[busId].isNull())
    {
        sendJsonError(400, "A valid bus_id is required");
        return;
    }

    JsonObject deviceObject = ensureObject(devicesObject, deviceId);
    deviceObject["label"] = request["label"] | deviceId;
    deviceObject["driver"] = request["driver"] | "generic";
    deviceObject["bus_id"] = busId;
    deviceObject["enabled"] = request["enabled"] | true;
    deviceObject["address"] = request["address"] | 0;
    deviceObject["poll_ms"] = request["poll_ms"] | 1000UL;
    deviceObject["timeout_ms"] = request["timeout_ms"] | 200UL;
    deviceObject["retry_count"] = request["retry_count"] | 1;
    deviceObject["virtual_mode"] = request["virtual_mode"] | "triangle";
    deviceObject["virtual_min_raw"] = request["virtual_min_raw"] | 0;
    deviceObject["virtual_max_raw"] = request["virtual_max_raw"] | 32767;
    deviceObject["virtual_manual_raw"] = request["virtual_manual_raw"] | 12000;
    deviceObject["virtual_period_ms"] = request["virtual_period_ms"] | 4000UL;

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Device saved" : "Device saved, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleSeedExternalResourcesForDevice()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String deviceId = request["device_id"] | "";
    String resourceTemplate = request["template"] | "";
    if (deviceId.isEmpty())
    {
        sendJsonError(400, "device_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject devicesObject = configDoc["devices"].as<JsonObject>();
    if (devicesObject.isNull() || devicesObject[deviceId].isNull())
    {
        sendJsonError(404, "Device not found");
        return;
    }

    JsonObject deviceObject = devicesObject[deviceId].as<JsonObject>();
    String driver = deviceObject["driver"] | "";
    driver.toLowerCase();
    resourceTemplate.toLowerCase();

    struct SeedTemplateSpec
    {
        const char *driver;
        const char *templateName;
        const char *labelPrefix;
        const char *messageName;
    };

    static const SeedTemplateSpec kSeedTemplates[] = {
        {"ads1115", "ads1115_channels", "ADS1115 CH", "ADS1115"},
        {"virtual_ai", "virtual_ai_channels", "Virtual AI CH", "virtual_ai"},
        {"mcp4728", "mcp4728_channels", "MCP4728 CH", "MCP4728"},
    };

    const SeedTemplateSpec *selectedTemplate = nullptr;
    for (const auto &candidate : kSeedTemplates)
    {
        if (driver == candidate.driver &&
            (resourceTemplate.isEmpty() || resourceTemplate == candidate.templateName))
        {
            selectedTemplate = &candidate;
            break;
        }
    }

    if (!selectedTemplate)
    {
        sendJsonError(400, "This helper currently supports configured device templates only");
        return;
    }

    JsonObject resourcesObject = ensureObject(configDoc, "external_resources");
    int createdCount = 0;
    int skippedCount = 0;

    for (int channelIndex = 0; channelIndex < 4; channelIndex++)
    {
        String resourceId = deviceId + ".ch" + String(channelIndex);
        JsonObject existing = resourcesObject[resourceId].as<JsonObject>();
        if (!existing.isNull())
        {
            skippedCount++;
            continue;
        }

        if (resourcesObject.size() >= MAX_EXTERNAL_RESOURCES)
        {
            sendJsonError(409, "External resource limit reached");
            return;
        }

        JsonObject resourceObject = ensureObject(resourcesObject, resourceId);
        resourceObject["label"] = String(selectedTemplate->labelPrefix) + String(channelIndex);
        resourceObject["device_id"] = deviceId;
        const bool isDacTemplate = String(selectedTemplate->driver) == "mcp4728";
        resourceObject["kind"] = isDacTemplate ? "analog_out" : "analog_in";
        resourceObject["capability"] = isDacTemplate ? "ao" : "ai";
        resourceObject["source_index"] = channelIndex;
        resourceObject["units"] = "";
        createdCount++;
    }

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["created"] = createdCount;
    response["skipped"] = skippedCount;
    if (createdCount > 0)
    {
        response["message"] = String(selectedTemplate->messageName) + " resources ready: created " + String(createdCount) + ", skipped " + String(skippedCount);
    }
    else
    {
        response["message"] = String(selectedTemplate->messageName) + " resources already existed";
    }
    sendJsonDoc(response);
}

static void handleSaveExternalResource()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String resourceId = request["resource_id"] | "";
    if (resourceId.isEmpty())
    {
        sendJsonError(400, "resource_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject resourcesObject = ensureObject(configDoc, "external_resources");
    if (resourcesObject[resourceId].isNull() && resourcesObject.size() >= MAX_EXTERNAL_RESOURCES)
    {
        sendJsonError(409, "External resource limit reached");
        return;
    }

    String deviceId = request["device_id"] | "";
    JsonObject devicesObject = configDoc["devices"].as<JsonObject>();
    if (deviceId.isEmpty() || devicesObject.isNull() || devicesObject[deviceId].isNull())
    {
        sendJsonError(400, "A valid device_id is required");
        return;
    }

    ChannelType capability = parseChannelType(request["capability"] | "");
    if (capability == ChannelType::Unknown)
    {
        sendJsonError(400, "A valid capability is required");
        return;
    }

    JsonObject resourceObject = ensureObject(resourcesObject, resourceId);
    resourceObject["label"] = request["label"] | resourceId;
    resourceObject["device_id"] = deviceId;
    resourceObject["kind"] = request["kind"] | "analog_in";
    resourceObject["capability"] = channelTypeToString(capability);
    resourceObject["source_index"] = request["source_index"] | 0;
    resourceObject["units"] = request["units"] | "";

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "External resource saved" : "External resource saved, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleWriteExternalResource()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String resourceId = request["resource_id"] | "";
    if (resourceId.isEmpty())
    {
        sendJsonError(400, "resource_id is required");
        return;
    }

    const ExternalResourceConfig *resource = findExternalResourceConfig(resourceId);
    if (resource == nullptr)
    {
        sendJsonError(404, "External resource not found");
        return;
    }

    bool ok = false;
    JsonDocument response;
    response["resource_id"] = resourceId;
    if (resource->capability == ChannelType::AO)
    {
        int rawValue = request["raw_value"] | 0;
        if (rawValue < 0)
        {
            rawValue = 0;
        }
        ok = gComms.writeExternalAnalogRaw(resourceId, rawValue);
        response["raw_value"] = rawValue;
        response["message"] = ok ? "External AO write applied" : "External AO write failed";
    }
    else if (resource->capability == ChannelType::DO)
    {
        bool digitalValue = request["digital_value"] | false;
        ok = gComms.writeExternalDigitalValue(resourceId, digitalValue);
        response["digital_value"] = digitalValue;
        response["message"] = ok ? "External DO write applied" : "External DO write failed";
    }
    else
    {
        sendJsonError(400, "Only AO and DO resources support direct write");
        return;
    }
    response["ok"] = ok;
    sendJsonDoc(response);
}

static void handleDeleteDevice()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String deviceId = request["device_id"] | "";
    if (deviceId.isEmpty())
    {
        sendJsonError(400, "device_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject devicesObject = configDoc["devices"].as<JsonObject>();
    if (devicesObject.isNull() || devicesObject[deviceId].isNull())
    {
        sendJsonError(404, "Device not found");
        return;
    }

    JsonObject resourcesObject = configDoc["external_resources"].as<JsonObject>();
    if (!resourcesObject.isNull())
    {
        for (JsonPair kv : resourcesObject)
        {
            JsonObject resourceObject = kv.value().as<JsonObject>();
            if (String(resourceObject["device_id"] | "") == deviceId)
            {
                sendJsonError(409, "Device is used by one or more external resources");
                return;
            }
        }
    }

    devicesObject.remove(deviceId);

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Device deleted" : "Device deleted, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleDeleteExternalResource()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String resourceId = request["resource_id"] | "";
    if (resourceId.isEmpty())
    {
        sendJsonError(400, "resource_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject resourcesObject = configDoc["external_resources"].as<JsonObject>();
    if (resourcesObject.isNull() || resourcesObject[resourceId].isNull())
    {
        sendJsonError(404, "External resource not found");
        return;
    }

    JsonObject channelsObject = configDoc["channels"].as<JsonObject>();
    if (!channelsObject.isNull())
    {
        for (JsonPair kv : channelsObject)
        {
            JsonObject channelObject = kv.value().as<JsonObject>();
            if (String(channelObject["resource"] | "") == resourceId)
            {
                sendJsonError(409, "External resource is used by one or more channels");
                return;
            }
        }
    }

    resourcesObject.remove(resourceId);

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "External resource deleted" : "External resource deleted, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleSaveDisplayScreen()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String screenId = request["screen_id"] | "";
    if (screenId.isEmpty())
    {
        sendJsonError(400, "screen_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject displayObject = ensureObject(configDoc, "display");
    JsonObject screensObject = ensureObject(displayObject, "screens");
    JsonObject screenObject = ensureObject(screensObject, screenId);

    screenObject["label"] = request["label"] | screenId;
    screenObject["group"] = request["group"] | "operator";
    screenObject["visible_if"] = request["visible_if"] | "";
    screenObject["refresh_ms"] = request["refresh_ms"] | 500;
    screenObject["auto_cycle_ms"] = request["auto_cycle_ms"] | 0;
    ensureObject(screenObject, "widgets");

    displayObject["enabled"] = request["display_enabled"] | true;
    if ((request["startup"] | false))
    {
        displayObject["startup_screen"] = screenId;
    }
    else if (String(displayObject["startup_screen"] | "").isEmpty())
    {
        displayObject["startup_screen"] = screenId;
    }

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Display screen saved" : "Screen saved, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleDeleteDisplayScreen()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String screenId = request["screen_id"] | "";
    if (screenId.isEmpty())
    {
        sendJsonError(400, "screen_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject displayObject = configDoc["display"].as<JsonObject>();
    JsonObject screensObject = displayObject["screens"].as<JsonObject>();
    if (displayObject.isNull() || screensObject.isNull() || screensObject[screenId].isNull())
    {
        sendJsonError(404, "Screen not found");
        return;
    }

    screensObject.remove(screenId);

    String startupScreen = displayObject["startup_screen"] | "";
    if (startupScreen == screenId)
    {
        for (JsonPair pair : screensObject)
        {
            displayObject["startup_screen"] = pair.key().c_str();
            startupScreen = pair.key().c_str();
            break;
        }
        if (startupScreen == screenId)
        {
            displayObject["startup_screen"] = "";
        }
    }

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Display screen deleted" : "Screen deleted, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleSaveDisplayWidget()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String screenId = request["screen_id"] | "";
    String widgetId = request["widget_id"] | "";
    if (screenId.isEmpty() || widgetId.isEmpty())
    {
        sendJsonError(400, "screen_id and widget_id are required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject displayObject = ensureObject(configDoc, "display");
    JsonObject screensObject = ensureObject(displayObject, "screens");
    JsonObject screenObject = screensObject[screenId].as<JsonObject>();
    if (screenObject.isNull())
    {
        sendJsonError(404, "Screen not found");
        return;
    }

    JsonObject widgetsObject = ensureObject(screenObject, "widgets");
    JsonObject widgetObject = ensureObject(widgetsObject, widgetId);
    JsonObject formatObject = ensureObject(widgetObject, "format");
    JsonObject styleObject = ensureObject(widgetObject, "style");

    widgetObject["type"] = request["type"] | "pair";
    widgetObject["label"] = request["label"] | widgetId;
    widgetObject["signal"] = request["signal"] | "";
    widgetObject["visible_if"] = request["visible_if"] | "";
    widgetObject["x"] = request["x"] | 0;
    widgetObject["y"] = request["y"] | 0;
    widgetObject["w"] = request["w"] | 0;
    widgetObject["h"] = request["h"] | 0;

    formatObject["units"] = request["units"] | "";
    formatObject["precision"] = request["precision"] | 1;
    formatObject["duration_style"] = request["duration_style"] | "";
    formatObject["true_text"] = request["true_text"] | "";
    formatObject["false_text"] = request["false_text"] | "";
    formatObject["prefix"] = request["prefix"] | "";
    formatObject["suffix"] = request["suffix"] | "";
    formatObject["empty_text"] = request["empty_text"] | "";

    styleObject["font"] = request["font"] | "small";
    styleObject["align"] = request["align"] | "left";
    styleObject["invert"] = request["invert"] | false;
    styleObject["emphasis"] = request["emphasis"] | false;
    styleObject["frame"] = request["frame"] | false;
    styleObject["color_role"] = request["color_role"] | "normal";

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Display widget saved" : "Widget saved, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleDeleteDisplayWidget()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String screenId = request["screen_id"] | "";
    String widgetId = request["widget_id"] | "";
    if (screenId.isEmpty() || widgetId.isEmpty())
    {
        sendJsonError(400, "screen_id and widget_id are required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject displayObject = configDoc["display"].as<JsonObject>();
    JsonObject screensObject = displayObject["screens"].as<JsonObject>();
    JsonObject screenObject = screensObject[screenId].as<JsonObject>();
    JsonObject widgetsObject = screenObject["widgets"].as<JsonObject>();
    if (displayObject.isNull() || screensObject.isNull() || screenObject.isNull() || widgetsObject.isNull() || widgetsObject[widgetId].isNull())
    {
        sendJsonError(404, "Widget not found");
        return;
    }

    widgetsObject.remove(widgetId);

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Display widget deleted" : "Widget deleted, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleGetStatus()
{
    JsonDocument doc;
    JsonObject channels = ensureObject(doc, "channels");
    for (int i = 0; i < gResources.getBindingCount(); i++)
    {
        const ResourceBinding *binding = gResources.getBindingAt(i);
        if (!binding) continue;

        JsonObject channelObject = ensureObject(channels, binding->channelId);
        channelObject["resource"] = binding->resourceId;
        channelObject["gpio"] = binding->gpio;
        channelObject["source_kind"] = binding->external ? "external" : "local";
        channelObject["external"] = binding->external;
        channelObject["type"] = channelTypeToString(binding->type);

        if (binding->type == ChannelType::AI)
            channelObject["value"] = gResources.readAnalog(binding->channelId);
        else
            channelObject["value"] = gResources.readDigital(binding->channelId);
    }
    sendJsonDoc(doc);
}

static void handleGetDiagnostics()
{
    gResources.runInputDiagnostics();
    gResources.runAnalogDiagnostics();
    JsonDocument doc;
    doc["note"] = "Digital diagnostics are probe-based. Analog diagnostics are live sample windows.";
    JsonObject channels = ensureObject(doc, "channels");

    for (int i = 0; i < gResources.getBindingCount(); i++)
    {
        const ResourceBinding *binding = gResources.getBindingAt(i);
        if (!binding) continue;

        JsonObject channelObject = ensureObject(channels, binding->channelId);
        channelObject["gpio"] = binding->gpio;
        channelObject["source_kind"] = binding->external ? "external" : "local";
        channelObject["external"] = binding->external;
        channelObject["type"] = channelTypeToString(binding->type);

        if (binding->external)
        {
            channelObject["classification"] = "external_resource";
        }
        else if (binding->type == ChannelType::DI)
        {
            channelObject["expected_internal_pullup"] = binding->inputProbe.expectedInternalPullup;
            channelObject["observed_pullup_effect"] = binding->inputProbe.observedPullupEffect;
            channelObject["without_pullup_high_count"] = binding->inputProbe.withoutPullupHighCount;
            channelObject["with_pullup_high_count"] = binding->inputProbe.withPullupHighCount;
            channelObject["classification"] = binding->inputProbe.classification;
        }
        else if (binding->type == ChannelType::AI)
        {
            channelObject["last_raw"] = binding->analogProbe.lastRaw;
            channelObject["min_raw"] = binding->analogProbe.minRaw;
            channelObject["max_raw"] = binding->analogProbe.maxRaw;
            channelObject["avg_raw"] = binding->analogProbe.averageRaw;
            channelObject["span_raw"] = binding->analogProbe.spanRaw;
            channelObject["classification"] = binding->analogProbe.classification;
        }
    }

    sendJsonDoc(doc);
}

static void handleGetInspector()
{
    gResources.runAnalogDiagnostics(8, 1);
    JsonDocument doc;
    doc["note"] = "Live inspector values refresh safely for DI and AI channels.";
    JsonObject channels = ensureObject(doc, "channels");

    for (int i = 0; i < gResources.getBindingCount(); i++)
    {
        const ResourceBinding *binding = gResources.getBindingAt(i);
        if (!binding) continue;

        JsonObject channelObject = ensureObject(channels, binding->channelId);
        channelObject["gpio"] = binding->gpio;
        channelObject["type"] = channelTypeToString(binding->type);
        channelObject["resource"] = binding->resourceId;
        channelObject["source_kind"] = binding->external ? "external" : "local";
        channelObject["external"] = binding->external;

        if (binding->external)
        {
            if (binding->type == ChannelType::AI || binding->type == ChannelType::AO)
            {
                channelObject["value"] = gResources.readAnalog(binding->channelId);
            }
            else
            {
                channelObject["value"] = gResources.readDigital(binding->channelId);
            }
            channelObject["classification"] = "external_resource";
        }
        else if (binding->type == ChannelType::AI)
        {
            channelObject["value"] = binding->analogProbe.lastRaw;
            channelObject["min"] = binding->analogProbe.minRaw;
            channelObject["max"] = binding->analogProbe.maxRaw;
            channelObject["avg"] = binding->analogProbe.averageRaw;
            channelObject["span"] = binding->analogProbe.spanRaw;
            channelObject["classification"] = binding->analogProbe.classification;
        }
        else
        {
            channelObject["value"] = gResources.readDigital(binding->channelId);
            if (binding->type == ChannelType::DI)
            {
                channelObject["classification"] = binding->inputProbe.classification;
            }
        }
    }

    sendJsonDoc(doc);
}

static void handleGetRuntime()
{
    JsonDocument doc;
    doc["ip"] = ipStr;
    doc["config_version"] = gConfig.configVersion;
    doc["config_version_supported"] = CURRENT_CONFIG_VERSION;
    doc["active_board"] = gConfig.system.active_board;
    JsonObject wifi = ensureObject(doc, "wifi");
    wifi["mode"] = gConfig.wifi.mode;
    wifi["ssid"] = gConfig.wifi.ssid;
    wifi["password"] = gConfig.wifi.password;
    wifi["ap_ssid"] = gConfig.wifi.apSsid;
    wifi["ap_password"] = gConfig.wifi.apPassword;
    wifi["startup_policy"] = gConfig.wifi.startupPolicy;

    JsonObject modules = ensureObject(doc, "modules");
    modules["oled"] = gConfig.oled.enabled && kFeatureOled;
    modules["lora"] = gConfig.lora.enabled && kFeatureLora;
    modules["sd"] = gConfig.sd.enabled;
    modules["led"] = gConfig.led.enabled;
    modules["battery"] = gConfig.battery.enabled;
    JsonObject features = ensureObject(doc, "features");
    features["lora"] = kFeatureLora;
    features["oled"] = kFeatureOled;
    features["comms"] = kFeatureComms;
    features["modbus"] = kFeatureModbus;

    JsonObject oled = ensureObject(doc, "oled");
    oled["show_ip_on_fallback"] = gConfig.oled.showIpOnFallback;

    JsonObject comms = ensureObject(doc, "comms");
    comms["bus_count"] = gConfig.busCount;
    comms["device_count"] = gConfig.deviceCount;
    comms["external_resource_count"] = gConfig.externalResourceCount;

    JsonObject detectedChip = ensureObject(doc, "detected_chip");
    detectedChip["model"] = ESP.getChipModel();
    detectedChip["revision"] = ESP.getChipRevision();

    const BoardConfig *board = getActiveBoard();
    if (board)
    {
        doc["board_template"] = board->templateId;
        doc["chip_template"] = readChipTemplateIdForBoard(board);
    }

    sendJsonDoc(doc);
}

static void handleGetTemplateLibrary()
{
    JsonDocument doc;

    JsonObject chipTemplates = ensureObject(doc, "chip_templates");
    for (int i = 0; i < gConfig.chipTemplateCount; i++)
    {
        const ChipTemplateConfig &chipTemplate = gConfig.chipTemplates[i];
        JsonObject templateObject = ensureObject(chipTemplates, chipTemplate.id);
        templateObject["label"] = chipTemplate.label;
        templateObject["pin_count"] = chipTemplate.pinCount;

        JsonObject pins = ensureObject(templateObject, "pins");
        for (int j = 0; j < chipTemplate.pinCount; j++)
        {
            const ChipTemplatePinConfig &pin = chipTemplate.pins[j];
            JsonObject pinObject = ensureObject(pins, String(pin.gpio));
            pinObject["internal_pullup"] = pin.internalPullup;
            pinObject["input_only"] = pin.inputOnly;
            pinObject["strapping"] = pin.strapping;
            pinObject["forbidden"] = pin.forbidden;
            pinObject["note"] = pin.note;

            JsonArray capabilities = ensureArray(pinObject, "capabilities");
            for (int k = 0; k < pin.capabilityCount; k++)
            {
                capabilities.add(channelTypeToString(pin.capabilities[k]));
            }
        }
    }

    JsonObject boardTemplates = ensureObject(doc, "board_templates");
    for (int i = 0; i < gConfig.boardTemplateCount; i++)
    {
        const BoardTemplateConfig &boardTemplate = gConfig.boardTemplates[i];
        JsonObject templateObject = ensureObject(boardTemplates, boardTemplate.id);
        templateObject["label"] = boardTemplate.label;
        templateObject["chip_template"] = boardTemplate.chipTemplateId;
        templateObject["rule_count"] = boardTemplate.ruleCount;

        JsonArray rules = ensureArray(templateObject, "rules");
        for (int j = 0; j < boardTemplate.ruleCount; j++)
        {
            const BoardTemplateRuleConfig &rule = boardTemplate.rules[j];
            JsonObject ruleObject = addObject(rules);
            ruleObject["id"] = rule.id;
            ruleObject["feature"] = rule.featureKey;
            ruleObject["class"] = pinPolicyClassToString(rule.pinClass);
            ruleObject["owner"] = rule.owner;
            ruleObject["reason"] = rule.reason;
            ruleObject["always_on"] = rule.alwaysOn;

            JsonArray pins = ensureArray(ruleObject, "pins");
            for (int k = 0; k < rule.pinCount; k++)
            {
                pins.add(rule.pins[k]);
            }
        }
    }

    doc["active_chip_template"] = gConfig.system.active_chip_template;
    doc["active_board_template"] = gConfig.system.active_board_template;
    sendJsonDoc(doc);
}

static void handleSaveTemplateLibrary()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String type = request["type"] | "";
    String templateId = request["template_id"] | "";
    JsonObject templateObject = request["template"].as<JsonObject>();
    if (templateId.isEmpty() || templateObject.isNull())
    {
        sendJsonError(400, "type, template_id and template are required");
        return;
    }

    JsonDocument libraryDoc;
    if (!loadTemplateLibraryDocument(libraryDoc))
    {
        sendJsonError(500, "Failed to load template library");
        return;
    }

    if (type == "chip")
    {
        JsonObject chipTemplates = libraryDoc["chip_templates"].is<JsonObject>()
            ? libraryDoc["chip_templates"].as<JsonObject>()
            : libraryDoc["chip_templates"].to<JsonObject>();

        JsonObject destination = chipTemplates[templateId].is<JsonObject>()
            ? chipTemplates[templateId].as<JsonObject>()
            : chipTemplates[templateId].to<JsonObject>();
        destination.clear();
        destination["label"] = templateObject["label"] | templateId;

        JsonObject requestPins = templateObject["pins"].as<JsonObject>();
        JsonObject pins = ensureObject(destination, "pins");
        if (!requestPins.isNull())
        {
            for (JsonPair pair : requestPins)
            {
                JsonObject sourcePin = pair.value().as<JsonObject>();
                JsonObject targetPin = pins[pair.key().c_str()].to<JsonObject>();
                targetPin["internal_pullup"] = sourcePin["internal_pullup"] | false;
                targetPin["input_only"] = sourcePin["input_only"] | false;
                targetPin["strapping"] = sourcePin["strapping"] | false;
                targetPin["forbidden"] = sourcePin["forbidden"] | false;
                targetPin["note"] = sourcePin["note"] | "";

                JsonArray capabilities = ensureArray(targetPin, "capabilities");
                JsonArray sourceCapabilities = sourcePin["capabilities"].as<JsonArray>();
                if (!sourceCapabilities.isNull())
                {
                    for (JsonVariant capability : sourceCapabilities)
                    {
                        capabilities.add(capability.as<String>());
                    }
                }
            }
        }
    }
    else if (type == "board")
    {
        JsonObject boardTemplates = libraryDoc["board_templates"].is<JsonObject>()
            ? libraryDoc["board_templates"].as<JsonObject>()
            : libraryDoc["board_templates"].to<JsonObject>();

        JsonObject destination = boardTemplates[templateId].is<JsonObject>()
            ? boardTemplates[templateId].as<JsonObject>()
            : boardTemplates[templateId].to<JsonObject>();
        destination.clear();
        destination["label"] = templateObject["label"] | templateId;
        destination["chip_template"] = templateObject["chip_template"] | "";

        JsonArray rules = ensureArray(destination, "rules");
        JsonArray sourceRules = templateObject["rules"].as<JsonArray>();
        if (!sourceRules.isNull())
        {
            for (JsonVariant ruleVariant : sourceRules)
            {
                JsonObject sourceRule = ruleVariant.as<JsonObject>();
                JsonObject targetRule = addObject(rules);
                targetRule["id"] = sourceRule["id"] | "";
                targetRule["feature"] = sourceRule["feature"] | "";
                targetRule["class"] = sourceRule["class"] | "warning";
                targetRule["owner"] = sourceRule["owner"] | "";
                targetRule["reason"] = sourceRule["reason"] | "";
                targetRule["always_on"] = sourceRule["always_on"] | false;

                JsonArray pins = ensureArray(targetRule, "pins");
                JsonArray sourcePins = sourceRule["pins"].as<JsonArray>();
                if (!sourcePins.isNull())
                {
                    for (JsonVariant pin : sourcePins)
                    {
                        pins.add(pin.as<int>());
                    }
                }
            }
        }
    }
    else
    {
        sendJsonError(400, "Unknown template type");
        return;
    }

    if (!saveTemplateLibraryDocument(libraryDoc))
    {
        sendJsonError(500, "Failed to save template library");
        return;
    }

    loadConfigFromFile();

    JsonDocument response;
    response["ok"] = true;
    response["message"] = "Template saved";
    sendJsonDoc(response);
}

static void handleDeleteTemplate()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String type = request["type"] | "";
    String templateId = request["template_id"] | "";
    if (type.isEmpty() || templateId.isEmpty())
    {
        sendJsonError(400, "type and template_id are required");
        return;
    }

    JsonDocument libraryDoc;
    if (!loadTemplateLibraryDocument(libraryDoc))
    {
        sendJsonError(500, "Failed to load template library");
        return;
    }

    if (type == "chip")
    {
        if (gConfig.system.active_chip_template == templateId)
        {
            sendJsonError(409, "Cannot delete active chip override template");
            return;
        }

        JsonObject boardTemplates = libraryDoc["board_templates"].as<JsonObject>();
        for (JsonPair pair : boardTemplates)
        {
            JsonObject boardTemplate = pair.value().as<JsonObject>();
            if (String(boardTemplate["chip_template"] | "") == templateId)
            {
                sendJsonError(409, "Chip template is still referenced by a board template");
                return;
            }
        }

        JsonObject chipTemplates = libraryDoc["chip_templates"].as<JsonObject>();
        if (chipTemplates.isNull() || chipTemplates[templateId].isNull())
        {
            sendJsonError(404, "Chip template not found");
            return;
        }
        chipTemplates.remove(templateId);
    }
    else if (type == "board")
    {
        if (gConfig.system.active_board_template == templateId)
        {
            sendJsonError(409, "Cannot delete active board template");
            return;
        }

        JsonDocument runtimeDoc;
        if (!loadConfigDocument(runtimeDoc))
        {
            sendJsonError(500, "Failed to load config");
            return;
        }

        JsonObject boards = runtimeDoc["boards"].as<JsonObject>();
        for (JsonPair pair : boards)
        {
            JsonObject board = pair.value().as<JsonObject>();
            if (String(board["template"] | "") == templateId)
            {
                sendJsonError(409, "Board template is still assigned to a board");
                return;
            }
        }

        JsonObject boardTemplates = libraryDoc["board_templates"].as<JsonObject>();
        if (boardTemplates.isNull() || boardTemplates[templateId].isNull())
        {
            sendJsonError(404, "Board template not found");
            return;
        }
        boardTemplates.remove(templateId);
    }
    else
    {
        sendJsonError(400, "Unknown template type");
        return;
    }

    if (!saveTemplateLibraryDocument(libraryDoc))
    {
        sendJsonError(500, "Failed to save template library");
        return;
    }

    loadConfigFromFile();

    JsonDocument response;
    response["ok"] = true;
    response["message"] = "Template deleted";
    sendJsonDoc(response);
}

static void handleDeleteChannelBinding()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String channelId = request["channel_id"] | "";
    if (channelId.isEmpty())
    {
        sendJsonError(400, "channel_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject channels = configDoc["channels"].as<JsonObject>();
    if (channels.isNull() || channels[channelId].isNull())
    {
        sendJsonError(404, "Channel not found");
        return;
    }

    JsonArray refs = ensureArray(request, "refs");
    collectSignalReferencesForValue(configDoc, channelId, "channel", refs, "", JsonArray());
    if (refs.size() > 0)
    {
        JsonDocument response;
        response["ok"] = false;
        JsonObject firstRef = refs[0].as<JsonObject>();
        response["message"] = "Channel is still used by " + String(firstRef["kind"] | "config") +
            " " + String(firstRef["id"] | "") + " as " + String(firstRef["field"] | "");
        response["references"] = refs;
        sendJsonDoc(response);
        return;
    }

    String resourceId = channels[channelId]["resource"] | "";
    const bool externalResource = findExternalResourceConfig(resourceId) != nullptr;
    channels.remove(channelId);

    bool resourceStillUsed = false;
    for (JsonPair pair : channels)
    {
        JsonObject channelObject = pair.value().as<JsonObject>();
        String candidateResourceId = channelObject["resource"] | "";
        if (candidateResourceId == resourceId)
        {
            resourceStillUsed = true;
            break;
        }
    }

    JsonObject boards = configDoc["boards"].as<JsonObject>();
    JsonObject boardObject = boards[gConfig.system.active_board].as<JsonObject>();
    if (!externalResource && !boardObject.isNull() && !resourceStillUsed)
    {
        JsonObject resources = boardObject["resources"].as<JsonObject>();
        if (!resources.isNull())
        {
            resources.remove(resourceId);
        }
    }

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Channel deleted" : "Channel deleted, but runtime apply reported an error";
    String json;
    serializeJson(response, json);
    server.send(applied ? 200 : 202, "application/json", json);
}

static void handleSaveAlarmDefinition()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String alarmId = request["alarm_id"] | "";
    if (alarmId.isEmpty())
    {
        sendJsonError(400, "alarm_id is required");
        return;
    }

    String sourceSignal = request["source_signal"] | "";
    if (sourceSignal.isEmpty())
    {
        sendJsonError(400, "source_signal is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject alarms = ensureObject(configDoc, "alarms");
    JsonObject alarmObject = ensureObject(alarms, alarmId);
    alarmObject["label"] = request["label"] | alarmId;
    alarmObject["source_signal"] = sourceSignal;
    String enableSignal = request["enable_signal"] | "";
    if (enableSignal.isEmpty()) alarmObject.remove("enable_signal");
    else alarmObject["enable_signal"] = enableSignal;
    alarmObject["severity"] = request["severity"] | "warning";
    alarmObject["delay_ms"] = request["delay_ms"] | 0UL;
    alarmObject["latched"] = request["latched"] | false;
    alarmObject["ack_required"] = request["ack_required"] | true;

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    const bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Alarm saved" : "Alarm saved, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleDeleteAlarmDefinition()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String alarmId = request["alarm_id"] | "";
    if (alarmId.isEmpty())
    {
        sendJsonError(400, "alarm_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject alarms = configDoc["alarms"].as<JsonObject>();
    if (alarms.isNull() || alarms[alarmId].isNull())
    {
        sendJsonError(404, "Alarm not found");
        return;
    }

    alarms.remove(alarmId);

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    const bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Alarm deleted" : "Alarm deleted, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleAcknowledgeAlarm()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    if (request["all"] | false)
    {
        gAlarms.acknowledgeAll();
        JsonDocument response;
        response["ok"] = true;
        response["message"] = "All alarms acknowledged";
        sendJsonDoc(response);
        return;
    }

    String alarmId = request["alarm_id"] | "";
    if (alarmId.isEmpty())
    {
        sendJsonError(400, "alarm_id is required");
        return;
    }

    if (!gAlarms.acknowledge(alarmId))
    {
        sendJsonError(404, "Alarm not found");
        return;
    }

    JsonDocument response;
    response["ok"] = true;
    response["message"] = "Alarm acknowledged";
    sendJsonDoc(response);
}

static void handleSaveSequenceDefinition()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String sequenceId = request["sequence_id"] | "";
    if (sequenceId.isEmpty())
    {
        sendJsonError(400, "sequence_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject sequences = ensureObject(configDoc, "sequences");
    JsonObject sequenceObject = ensureObject(sequences, sequenceId);
    sequenceObject["label"] = request["label"] | sequenceId;

    const String enableSignal = request["enable_signal"] | "";
    const String startSignal = request["start_signal"] | "";
    const String tripSignal = request["trip_signal"] | "";
    const String resetSignal = request["reset_signal"] | "";
    const String initialState = request["initial_state"] | "";
    const String faultState = request["fault_state"] | "";
    const String doneState = request["done_state"] | "";

    if (enableSignal.isEmpty()) sequenceObject.remove("enable_signal");
    else sequenceObject["enable_signal"] = enableSignal;
    if (startSignal.isEmpty()) sequenceObject.remove("start_signal");
    else sequenceObject["start_signal"] = startSignal;
    if (tripSignal.isEmpty()) sequenceObject.remove("trip_signal");
    else sequenceObject["trip_signal"] = tripSignal;
    if (resetSignal.isEmpty()) sequenceObject.remove("reset_signal");
    else sequenceObject["reset_signal"] = resetSignal;
    if (initialState.isEmpty()) sequenceObject.remove("initial_state");
    else sequenceObject["initial_state"] = initialState;
    if (faultState.isEmpty()) sequenceObject.remove("fault_state");
    else sequenceObject["fault_state"] = faultState;
    if (doneState.isEmpty()) sequenceObject.remove("done_state");
    else sequenceObject["done_state"] = doneState;
    sequenceObject["auto_start"] = request["auto_start"] | true;
    ensureObject(sequenceObject, "states");

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    const bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Sequence saved" : "Sequence saved, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleDeleteSequenceDefinition()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String sequenceId = request["sequence_id"] | "";
    if (sequenceId.isEmpty())
    {
        sendJsonError(400, "sequence_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject sequences = configDoc["sequences"].as<JsonObject>();
    if (sequences.isNull() || sequences[sequenceId].isNull())
    {
        sendJsonError(404, "Sequence not found");
        return;
    }

    sequences.remove(sequenceId);

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    const bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Sequence deleted" : "Sequence deleted, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleSaveSequenceState()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String sequenceId = request["sequence_id"] | "";
    String stateId = request["state_id"] | "";
    if (sequenceId.isEmpty() || stateId.isEmpty())
    {
        sendJsonError(400, "sequence_id and state_id are required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject sequences = configDoc["sequences"].as<JsonObject>();
    JsonObject sequenceObject = sequences[sequenceId].as<JsonObject>();
    if (sequenceObject.isNull())
    {
        sendJsonError(404, "Sequence not found");
        return;
    }

    JsonObject states = ensureObject(sequenceObject, "states");
    JsonObject stateObject = ensureObject(states, stateId);
    stateObject["label"] = request["label"] | stateId;
    const String permissiveSignal = request["permissive_signal"] | "";
    const String timeoutTo = request["timeout_to"] | "";
    if (permissiveSignal.isEmpty()) stateObject.remove("permissive_signal");
    else stateObject["permissive_signal"] = permissiveSignal;
    stateObject["timeout_ms"] = request["timeout_ms"] | 0UL;
    if (timeoutTo.isEmpty()) stateObject.remove("timeout_to");
    else stateObject["timeout_to"] = timeoutTo;

    JsonArray targetActionsOn = ensureArray(stateObject, "actions_on");
    targetActionsOn.clear();
    JsonArray sourceActionsOn = request["actions_on"].as<JsonArray>();
    if (!sourceActionsOn.isNull())
    {
        for (JsonVariant action : sourceActionsOn)
        {
            targetActionsOn.add(action.as<const char*>());
        }
    }

    JsonArray targetActionsOff = ensureArray(stateObject, "actions_off");
    targetActionsOff.clear();
    JsonArray sourceActionsOff = request["actions_off"].as<JsonArray>();
    if (!sourceActionsOff.isNull())
    {
        for (JsonVariant action : sourceActionsOff)
        {
            targetActionsOff.add(action.as<const char*>());
        }
    }

    ensureObject(stateObject, "transitions");

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    const bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Sequence state saved" : "State saved, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleDeleteSequenceState()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String sequenceId = request["sequence_id"] | "";
    String stateId = request["state_id"] | "";
    if (sequenceId.isEmpty() || stateId.isEmpty())
    {
        sendJsonError(400, "sequence_id and state_id are required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject sequences = configDoc["sequences"].as<JsonObject>();
    JsonObject sequenceObject = sequences[sequenceId].as<JsonObject>();
    JsonObject states = sequenceObject["states"].as<JsonObject>();
    if (sequenceObject.isNull() || states.isNull() || states[stateId].isNull())
    {
        sendJsonError(404, "Sequence state not found");
        return;
    }

    states.remove(stateId);

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    const bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Sequence state deleted" : "State deleted, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleSaveSequenceTransition()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String sequenceId = request["sequence_id"] | "";
    String stateId = request["state_id"] | "";
    String transitionId = request["transition_id"] | "";
    if (sequenceId.isEmpty() || stateId.isEmpty() || transitionId.isEmpty())
    {
        sendJsonError(400, "sequence_id, state_id and transition_id are required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject sequences = configDoc["sequences"].as<JsonObject>();
    JsonObject sequenceObject = sequences[sequenceId].as<JsonObject>();
    JsonObject states = sequenceObject["states"].as<JsonObject>();
    JsonObject stateObject = states[stateId].as<JsonObject>();
    if (sequenceObject.isNull() || states.isNull() || stateObject.isNull())
    {
        sendJsonError(404, "Sequence state not found");
        return;
    }

    JsonObject transitions = ensureObject(stateObject, "transitions");
    JsonObject transitionObject = ensureObject(transitions, transitionId);
    transitionObject["label"] = request["label"] | transitionId;
    transitionObject["to"] = request["to"] | "";
    transitionObject["when_signal"] = request["when_signal"] | "";
    transitionObject["delay_ms"] = request["delay_ms"] | 0UL;
    transitionObject["invert"] = request["invert"] | false;

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    const bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Sequence transition saved" : "Transition saved, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleDeleteSequenceTransition()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String sequenceId = request["sequence_id"] | "";
    String stateId = request["state_id"] | "";
    String transitionId = request["transition_id"] | "";
    if (sequenceId.isEmpty() || stateId.isEmpty() || transitionId.isEmpty())
    {
        sendJsonError(400, "sequence_id, state_id and transition_id are required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject sequences = configDoc["sequences"].as<JsonObject>();
    JsonObject sequenceObject = sequences[sequenceId].as<JsonObject>();
    JsonObject states = sequenceObject["states"].as<JsonObject>();
    JsonObject stateObject = states[stateId].as<JsonObject>();
    JsonObject transitions = stateObject["transitions"].as<JsonObject>();
    if (sequenceObject.isNull() || states.isNull() || stateObject.isNull() || transitions.isNull() || transitions[transitionId].isNull())
    {
        sendJsonError(404, "Sequence transition not found");
        return;
    }

    transitions.remove(transitionId);

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    const bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Sequence transition deleted" : "Transition deleted, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleResetSequence()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String sequenceId = request["sequence_id"] | "";
    if (sequenceId.isEmpty())
    {
        sendJsonError(400, "sequence_id is required");
        return;
    }

    if (!gSequences.resetSequence(sequenceId))
    {
        sendJsonError(404, "Sequence not found");
        return;
    }

    JsonDocument response;
    response["ok"] = true;
    response["message"] = "Sequence reset";
    sendJsonDoc(response);
}

static void handleSaveSignalDefinition()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Empty request body\"}");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Invalid JSON\"}");
        return;
    }

    String signalId = request["signal_id"] | "";
    String type = request["type"] | "substitute";
    if (signalId.isEmpty())
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"signal_id is required\"}");
        return;
    }

    if (type != "substitute")
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Only substitute signals are supported in the editor for now\"}");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        server.send(500, "application/json", "{\"ok\":false,\"message\":\"Failed to load config\"}");
        return;
    }

    JsonObject signals = configDoc["signals"].is<JsonObject>() ? configDoc["signals"].as<JsonObject>() : configDoc["signals"].to<JsonObject>();
    JsonObject signalObject = signals[signalId].is<JsonObject>() ? signals[signalId].as<JsonObject>() : signals[signalId].to<JsonObject>();

    signalObject["label"] = request["label"] | signalId;
    signalObject["type"] = type;
    signalObject["source"] = request["source"] | "";
    signalObject["substitute"] = request["substitute"] | "";
    signalObject["enable"] = request["enable"] | "";
    signalObject["units"] = request["units"] | "";

    if (!saveConfigDocument(configDoc))
    {
        server.send(500, "application/json", "{\"ok\":false,\"message\":\"Failed to save config\"}");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Signal saved" : "Signal saved, but runtime apply reported an error";
    String json;
    serializeJson(response, json);
    server.send(applied ? 200 : 202, "application/json", json);
}

static void handleDeleteSignalDefinition()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Empty request body\"}");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Invalid JSON\"}");
        return;
    }

    String signalId = request["signal_id"] | "";
    if (signalId.isEmpty())
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"signal_id is required\"}");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        server.send(500, "application/json", "{\"ok\":false,\"message\":\"Failed to load config\"}");
        return;
    }

    JsonObject signals = configDoc["signals"].as<JsonObject>();
    if (signals.isNull() || signals[signalId].isNull())
    {
        JsonDocument response;
        response["ok"] = false;
        const SignalRecord *record = gSignals.find(signalId);
        if (record)
        {
            response["message"] = "Only user-defined derived signals can be deleted. Runtime signals from channels and blocks are read-only.";
            String json;
            serializeJson(response, json);
            server.send(409, "application/json", json);
            return;
        }

        response["message"] = "Signal not found";
        String json;
        serializeJson(response, json);
        server.send(404, "application/json", json);
        return;
    }

    JsonArray refs = ensureArray(request, "refs");
    collectSignalReferencesForValue(configDoc, signalId, "signal", refs, "", JsonArray());
    if (refs.size() > 0)
    {
        JsonDocument response;
        response["ok"] = false;
        JsonObject firstRef = refs[0].as<JsonObject>();
        response["message"] = "Signal is still used by " + String(firstRef["kind"] | "config") +
            " " + String(firstRef["id"] | "") + " as " + String(firstRef["field"] | "");
        response["references"] = refs;
        String json;
        serializeJson(response, json);
        server.send(409, "application/json", json);
        return;
    }

    signals.remove(signalId);

    if (!saveConfigDocument(configDoc))
    {
        server.send(500, "application/json", "{\"ok\":false,\"message\":\"Failed to save config\"}");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Signal deleted" : "Signal deleted, but runtime apply reported an error";
    String json;
    serializeJson(response, json);
    server.send(applied ? 200 : 202, "application/json", json);
}

static void writeAnalogChannelMetadata(JsonObject channelObject, ChannelType channelType, JsonDocument &request)
{
    if (channelType != ChannelType::AI && channelType != ChannelType::AO)
    {
        channelObject.remove("profile");
        channelObject.remove("units");
        channelObject.remove("filter");
        channelObject.remove("raw_min");
        channelObject.remove("raw_max");
        channelObject.remove("eng_min");
        channelObject.remove("eng_max");
        channelObject.remove("offset");
        channelObject.remove("scale");
        channelObject.remove("clamp_min");
        channelObject.remove("clamp_max");
        channelObject.remove("filter_alpha");
        channelObject.remove("startup_value");
        channelObject.remove("clamp_enabled");
        return;
    }

    channelObject["profile"] = request["profile"] | "raw";
    channelObject["units"] = request["units"] | "";
    channelObject["filter"] = request["filter"] | "none";
    channelObject["raw_min"] = request["raw_min"] | 0.0f;
    channelObject["raw_max"] = request["raw_max"] | 4095.0f;
    channelObject["eng_min"] = request["eng_min"] | 0.0f;
    channelObject["eng_max"] = request["eng_max"] | 100.0f;
    channelObject["offset"] = request["offset"] | 0.0f;
    channelObject["scale"] = request["scale"] | 1.0f;
    channelObject["clamp_min"] = request["clamp_min"] | 0.0f;
    channelObject["clamp_max"] = request["clamp_max"] | 100.0f;
    channelObject["filter_alpha"] = request["filter_alpha"] | 0.2f;
    channelObject["clamp_enabled"] = request["clamp_enabled"] | false;
    if (channelType == ChannelType::AO)
    {
        channelObject["startup_value"] = request["startup_value"] | 0.0f;
    }
    else
    {
        channelObject.remove("startup_value");
    }
}

static bool ensureChannelBindingInConfig(JsonDocument &configDoc, const String &channelId, ChannelType channelType,
    int gpio, const String &externalResourceId, bool inverted, bool pullup, bool initial,
    String &resolvedResourceId, String &errorMessage,
    const String &generatedBy = "", const String &generatedRole = "")
{
    if (channelId.isEmpty() || channelType == ChannelType::Unknown)
    {
        errorMessage = "channel_id and type are required";
        return false;
    }
    JsonObject channels = configDoc["channels"].is<JsonObject>() ? configDoc["channels"].as<JsonObject>() : configDoc["channels"].to<JsonObject>();
    resolvedResourceId = "";

    if (!externalResourceId.isEmpty())
    {
        const ExternalResourceConfig *externalResource = findExternalResourceConfig(externalResourceId);
        if (!externalResource)
        {
            errorMessage = "Selected external resource was not found";
            return false;
        }

        if (!externalResourceSupportsType(*externalResource, channelType))
        {
            errorMessage = "External resource does not support this channel type";
            return false;
        }

        resolvedResourceId = externalResourceId;
    }
    else
    {
        if (gpio < 0)
        {
            errorMessage = "Select GPIO or external resource";
            return false;
        }

        HardwarePinInfo items[MAX_HARDWARE_PINS];
        int count = buildHardwarePinMap(items, MAX_HARDWARE_PINS);
        const HardwarePinInfo *selectedPin = nullptr;

        for (int i = 0; i < count; i++)
        {
            if (items[i].gpio == gpio)
            {
                selectedPin = &items[i];
                break;
            }
        }

        if (!selectedPin)
        {
            errorMessage = "GPIO is not available in current hardware map";
            return false;
        }

        if (selectedPin->pinClass == PinPolicyClass::Exclusive || selectedPin->pinClass == PinPolicyClass::Forbidden)
        {
            errorMessage = "Selected GPIO is not assignable in current configuration";
            return false;
        }

        JsonObject boards = configDoc["boards"].as<JsonObject>();
        JsonObject boardObject = boards[gConfig.system.active_board].as<JsonObject>();
        if (boardObject.isNull())
        {
            errorMessage = "Active board missing in config";
            return false;
        }

        JsonObject resources = boardObject["resources"].is<JsonObject>() ? boardObject["resources"].as<JsonObject>() : boardObject["resources"].to<JsonObject>();

        resolvedResourceId = selectedPin->resourceId;
        if (resolvedResourceId.isEmpty())
        {
            resolvedResourceId = "gpio" + String(gpio);
        }

        JsonObject resourceObject = resources[resolvedResourceId].is<JsonObject>() ? resources[resolvedResourceId].as<JsonObject>() : resources[resolvedResourceId].to<JsonObject>();
        resourceObject["gpio"] = gpio;
        resourceObject["label"] = resolvedResourceId;

        JsonArray capabilities = resourceObject["capabilities"].is<JsonArray>() ? resourceObject["capabilities"].as<JsonArray>() : resourceObject["capabilities"].to<JsonArray>();
        capabilities.clear();

        const ChipTemplateConfig *chipTemplateConfig = getActiveChipTemplateConfig();
        bool wroteCapabilities = false;
        if (chipTemplateConfig)
        {
            for (int i = 0; i < chipTemplateConfig->pinCount; i++)
            {
                if (chipTemplateConfig->pins[i].gpio != gpio) continue;
                for (int j = 0; j < chipTemplateConfig->pins[i].capabilityCount; j++)
                {
                    capabilities.add(channelTypeToString(chipTemplateConfig->pins[i].capabilities[j]));
                }
                wroteCapabilities = true;
                break;
            }
        }

        if (!wroteCapabilities)
        {
            const BoardConfig *activeBoard = getActiveBoard();
            const ChipTemplate *chipTemplate = activeBoard ? getChipTemplate(activeBoard->chip) : nullptr;
            const ChipPinTemplate *chipPin = chipTemplate ? findChipPinTemplate(*chipTemplate, gpio) : nullptr;
            if (chipPin)
            {
                for (int i = 0; i < chipPin->capabilityCount; i++)
                {
                    capabilities.add(channelTypeToString(chipPin->capabilities[i]));
                }
            }
        }
    }

    JsonObject channelObject = channels[channelId].is<JsonObject>() ? channels[channelId].as<JsonObject>() : channels[channelId].to<JsonObject>();
    channelObject["resource"] = resolvedResourceId;
    channelObject["type"] = channelTypeToString(channelType);
    channelObject["inverted"] = inverted;
    channelObject["pullup"] = pullup;
    channelObject["initial"] = initial;
    setGeneratedMetadata(channelObject, generatedBy, generatedRole);
    return true;
}

static bool ensureAutoButtonInput(JsonDocument &configDoc, const String &blockId, const String &slotPrefix,
    int gpio, bool inverted, bool pullup, const String &eventName, uint32_t debounceMs, uint32_t longPressMs,
    uint32_t doublePressMs, String &resultSignalId, String &errorMessage)
{
    if (gpio < 0)
    {
        errorMessage = "GPIO must be selected for auto input";
        return false;
    }

    String resourceId;
    const String channelId = blockId + "_" + slotPrefix + "_in";
    if (!ensureChannelBindingInConfig(configDoc, channelId, ChannelType::DI, gpio, "", inverted, pullup, false,
        resourceId, errorMessage, blockId, slotPrefix + "_channel"))
    {
        return false;
    }

    JsonObject blocks = configDoc["blocks"].is<JsonObject>() ? configDoc["blocks"].as<JsonObject>() : configDoc["blocks"].to<JsonObject>();
    const String buttonId = blockId + "_" + slotPrefix + "_button";
    JsonObject buttonObject = blocks[buttonId].is<JsonObject>() ? blocks[buttonId].as<JsonObject>() : blocks[buttonId].to<JsonObject>();
    buttonObject["type"] = "button";
    buttonObject["mode"] = "events";
    buttonObject["input"] = channelId;
    buttonObject["debounce_ms"] = debounceMs > 0 ? debounceMs : 50;
    buttonObject["long_press_ms"] = longPressMs > 0 ? longPressMs : 800;
    buttonObject["double_press_ms"] = doublePressMs > 0 ? doublePressMs : 350;
    setGeneratedMetadata(buttonObject, blockId, slotPrefix + "_button");

    String normalizedEvent = eventName;
    if (normalizedEvent.isEmpty())
    {
        normalizedEvent = "short_press";
    }

    resultSignalId = buttonId + "." + normalizedEvent;
    return true;
}

static void addReference(JsonArray refs, const String &kind, const String &id, const String &field)
{
    JsonObject ref = addObject(refs);
    ref["kind"] = kind;
    ref["id"] = id;
    ref["field"] = field;
}

static bool isInternalOwnerReference(const String &referenceId, JsonArray internalIds)
{
    for (JsonVariant item : internalIds)
    {
        if ((item.as<const char*>() ? String(item.as<const char*>()) : "") == referenceId)
        {
            return true;
        }
    }
    return false;
}

static void collectSignalReferencesForValue(JsonDocument &configDoc, const String &valueToFind,
    const String &fieldLabel, JsonArray refs, const String &skipBlockId, JsonArray internalIds)
{
    if (valueToFind.isEmpty()) return;
    (void)fieldLabel;

    JsonObject signals = configDoc["signals"].as<JsonObject>();
    for (JsonPair kv : signals)
    {
        JsonObject signal = kv.value().as<JsonObject>();
        const String signalId = kv.key().c_str();
        if (String(signal["source"] | "") == valueToFind) addReference(refs, "signal", signalId, "source");
        if (String(signal["substitute"] | "") == valueToFind) addReference(refs, "signal", signalId, "substitute");
        if (String(signal["enable"] | "") == valueToFind) addReference(refs, "signal", signalId, "enable");
    }

    JsonObject blocks = configDoc["blocks"].as<JsonObject>();
    for (JsonPair kv : blocks)
    {
        const String blockId = kv.key().c_str();
        if (blockId == skipBlockId) continue;
        if (isInternalOwnerReference(blockId, internalIds)) continue;

        JsonObject block = kv.value().as<JsonObject>();
        if (String(block["trigger"] | "") == valueToFind) addReference(refs, "block", blockId, "trigger");
        if (String(block["enable"] | "") == valueToFind) addReference(refs, "block", blockId, "enable");
        if (String(block["primary"] | "") == valueToFind) addReference(refs, "block", blockId, "primary");
        if (String(block["secondary"] | "") == valueToFind) addReference(refs, "block", blockId, "secondary");
        if (String(block["select"] | "") == valueToFind) addReference(refs, "block", blockId, "select");
        if (String(block["input"] | "") == valueToFind) addReference(refs, "block", blockId, "input");
        if (String(block["input_b"] | "") == valueToFind) addReference(refs, "block", blockId, "input_b");
        if (String(block["input_c"] | "") == valueToFind) addReference(refs, "block", blockId, "input_c");
        if (String(block["request_signal"] | "") == valueToFind) addReference(refs, "block", blockId, "request_signal");
        if (String(block["permissive_signal"] | "") == valueToFind) addReference(refs, "block", blockId, "permissive_signal");
        if (String(block["inhibit_signal"] | "") == valueToFind) addReference(refs, "block", blockId, "inhibit_signal");
        if (String(block["service_signal"] | "") == valueToFind) addReference(refs, "block", blockId, "service_signal");
        if (String(block["mode_select"] | "") == valueToFind) addReference(refs, "block", blockId, "mode_select");
        if (String(block["toggle_input"] | "") == valueToFind) addReference(refs, "block", blockId, "toggle_input");
        if (String(block["set_input"] | "") == valueToFind) addReference(refs, "block", blockId, "set_input");
        if (String(block["reset_input"] | "") == valueToFind) addReference(refs, "block", blockId, "reset_input");
        if (String(block["output"] | "") == valueToFind) addReference(refs, "block", blockId, "output");
    }

    JsonObject display = configDoc["display"].as<JsonObject>();
    JsonObject screens = display["screens"].as<JsonObject>();
    for (JsonPair kv : screens)
    {
        const String screenId = kv.key().c_str();
        JsonObject screen = kv.value().as<JsonObject>();

        if (String(screen["visible_if"] | "") == valueToFind)
        {
            addReference(refs, "display_screen", screenId, "visible_if");
        }

        JsonObject widgets = screen["widgets"].as<JsonObject>();
        for (JsonPair widgetKv : widgets)
        {
            const String widgetId = widgetKv.key().c_str();
            JsonObject widget = widgetKv.value().as<JsonObject>();
            const String displayWidgetRef = screenId + "|" + widgetId;

            if (String(widget["signal"] | "") == valueToFind)
            {
                addReference(refs, "display_widget", displayWidgetRef, "signal");
            }
            if (String(widget["visible_if"] | "") == valueToFind)
            {
                addReference(refs, "display_widget", displayWidgetRef, "visible_if");
            }
        }
    }

    JsonObject alarms = configDoc["alarms"].as<JsonObject>();
    for (JsonPair kv : alarms)
    {
        const String alarmId = kv.key().c_str();
        JsonObject alarm = kv.value().as<JsonObject>();
        if (String(alarm["source_signal"] | "") == valueToFind)
        {
            addReference(refs, "alarm", alarmId, "source_signal");
        }
        if (String(alarm["enable_signal"] | "") == valueToFind)
        {
            addReference(refs, "alarm", alarmId, "enable_signal");
        }
    }

    JsonObject sequences = configDoc["sequences"].as<JsonObject>();
    for (JsonPair kv : sequences)
    {
        const String sequenceId = kv.key().c_str();
        JsonObject sequence = kv.value().as<JsonObject>();
        if (String(sequence["enable_signal"] | "") == valueToFind)
        {
            addReference(refs, "sequence", sequenceId, "enable_signal");
        }
        if (String(sequence["start_signal"] | "") == valueToFind)
        {
            addReference(refs, "sequence", sequenceId, "start_signal");
        }
        if (String(sequence["trip_signal"] | "") == valueToFind)
        {
            addReference(refs, "sequence", sequenceId, "trip_signal");
        }
        if (String(sequence["reset_signal"] | "") == valueToFind)
        {
            addReference(refs, "sequence", sequenceId, "reset_signal");
        }

        JsonObject states = sequence["states"].as<JsonObject>();
        for (JsonPair stateKv : states)
        {
            const String stateId = stateKv.key().c_str();
            JsonObject state = stateKv.value().as<JsonObject>();
            const String sequenceStateRef = sequenceId + "|" + stateId;
            if (String(state["permissive_signal"] | "") == valueToFind)
            {
                addReference(refs, "sequence_state", sequenceStateRef, "permissive_signal");
            }

            JsonArray actionsOn = state["actions_on"].as<JsonArray>();
            for (JsonVariant action : actionsOn)
            {
                if ((action.as<const char*>() ? String(action.as<const char*>()) : "") == valueToFind)
                {
                    addReference(refs, "sequence_state", sequenceStateRef, "action_on");
                }
            }

            JsonArray actionsOff = state["actions_off"].as<JsonArray>();
            for (JsonVariant action : actionsOff)
            {
                if ((action.as<const char*>() ? String(action.as<const char*>()) : "") == valueToFind)
                {
                    addReference(refs, "sequence_state", sequenceStateRef, "action_off");
                }
            }

            JsonObject transitions = state["transitions"].as<JsonObject>();
            for (JsonPair transitionKv : transitions)
            {
                const String transitionId = transitionKv.key().c_str();
                JsonObject transition = transitionKv.value().as<JsonObject>();
                const String sequenceTransitionRef = sequenceId + "|" + stateId + "|" + transitionId;
                if (String(transition["when_signal"] | "") == valueToFind)
                {
                    addReference(refs, "sequence_transition", sequenceTransitionRef, "when_signal");
                }
            }
        }
    }
}

static void appendOwnedCandidates(JsonDocument &configDoc, const String &blockId, JsonArray internalIds, JsonArray candidates)
{
    JsonObject channels = configDoc["channels"].as<JsonObject>();
    JsonObject blocks = configDoc["blocks"].as<JsonObject>();

    for (JsonPair kv : channels)
    {
        JsonObject channel = kv.value().as<JsonObject>();
        if (!(channel["auto_generated"] | false)) continue;
        if (String(channel["generated_by"] | "") != blockId) continue;
        internalIds.add(String(kv.key().c_str()));
    }

    for (JsonPair kv : blocks)
    {
        JsonObject block = kv.value().as<JsonObject>();
        if (!(block["auto_generated"] | false)) continue;
        if (String(block["generated_by"] | "") != blockId) continue;
        internalIds.add(String(kv.key().c_str()));
    }

    for (JsonPair kv : channels)
    {
        const String candidateId = kv.key().c_str();
        JsonObject channel = kv.value().as<JsonObject>();
        if (!(channel["auto_generated"] | false)) continue;
        if (String(channel["generated_by"] | "") != blockId) continue;

        JsonObject item = addObject(candidates);
        item["kind"] = "channel";
        item["id"] = candidateId;
        item["role"] = channel["generated_role"] | "";
        JsonArray refs = ensureArray(item, "references");
        collectSignalReferencesForValue(configDoc, candidateId, "channel", refs, blockId, internalIds);
        item["recommended_delete"] = refs.size() == 0;
    }

    for (JsonPair kv : blocks)
    {
        const String candidateId = kv.key().c_str();
        JsonObject block = kv.value().as<JsonObject>();
        if (!(block["auto_generated"] | false)) continue;
        if (String(block["generated_by"] | "") != blockId) continue;

        JsonObject item = addObject(candidates);
        item["kind"] = "block";
        item["id"] = candidateId;
        item["role"] = block["generated_role"] | "";
        JsonArray refs = ensureArray(item, "references");

        if (String(block["type"] | "") == "button")
        {
            const char *events[] = {"pressed", "released", "short_press", "long_press", "double_press", "held"};
            for (const char *eventName : events)
            {
                collectSignalReferencesForValue(configDoc, candidateId + "." + String(eventName),
                    eventName, refs, blockId, internalIds);
            }
        }

        item["recommended_delete"] = refs.size() == 0;
    }
}

static void handleGetBlockDeleteReview()
{
    String blockId = server.arg("block_id");
    if (blockId.isEmpty())
    {
        sendJsonError(400, "block_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject blocks = configDoc["blocks"].as<JsonObject>();
    if (blocks.isNull() || blocks[blockId].isNull())
    {
        sendJsonError(404, "Block not found");
        return;
    }

    JsonDocument response;
    response["block_id"] = blockId;
    JsonArray internalIds = ensureArray(response, "internal_ids");
    JsonArray candidates = ensureArray(response, "candidates");
    appendOwnedCandidates(configDoc, blockId, internalIds, candidates);
    sendJsonDoc(response);
}

static void removeGeneratedHelpers(JsonDocument &configDoc, JsonArray channelsToDelete, JsonArray blocksToDelete)
{
    JsonObject channels = configDoc["channels"].as<JsonObject>();
    JsonObject blocks = configDoc["blocks"].as<JsonObject>();

    for (JsonVariant item : channelsToDelete)
    {
        const char *id = item.as<const char*>();
        if (id && !channels.isNull()) channels.remove(id);
    }

    for (JsonVariant item : blocksToDelete)
    {
        const char *id = item.as<const char*>();
        if (id && !blocks.isNull()) blocks.remove(id);
    }
}

static void handleSaveBlockDefinition()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String blockId = request["block_id"] | "";
    BlockType type = parseBlockType(request["type"] | "");
    if (blockId.isEmpty() || type == BlockType::Unknown)
    {
        sendJsonError(400, "block_id and known type are required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject blocks = configDoc["blocks"].is<JsonObject>() ? configDoc["blocks"].as<JsonObject>() : configDoc["blocks"].to<JsonObject>();
    JsonObject blockObject = blocks[blockId].is<JsonObject>() ? blocks[blockId].as<JsonObject>() : blocks[blockId].to<JsonObject>();
    blockObject["type"] = blockTypeToString(type);
    blockObject["mode"] = request["mode"] | "";
    blockObject.remove("input_c");
    blockObject.remove("request_signal");
    blockObject.remove("permissive_signal");
    blockObject.remove("inhibit_signal");
    blockObject.remove("interlock_signal");
    blockObject.remove("service_signal");
    blockObject.remove("mode_select");

    const uint32_t autoDebounceMs = request["auto_button_debounce_ms"] | 50;
    const uint32_t autoLongPressMs = request["auto_button_long_press_ms"] | 800;
    const uint32_t autoDoublePressMs = request["auto_button_double_press_ms"] | 350;

    if (type == BlockType::Timer)
    {
        String triggerSignalId = request["trigger"] | "";
        String autoError;
        if (request["auto_trigger_enabled"] | false)
        {
            if (!ensureAutoButtonInput(configDoc, blockId, "trigger",
                request["auto_trigger_gpio"] | -1,
                request["auto_trigger_inverted"] | false,
                request["auto_trigger_pullup"] | false,
                request["auto_trigger_event"] | "short_press",
                autoDebounceMs, autoLongPressMs, autoDoublePressMs,
                triggerSignalId, autoError))
            {
                sendJsonError(400, autoError.c_str());
                return;
            }
        }

        blockObject["trigger"] = triggerSignalId;
        blockObject["enable"] = request["enable"] | "";
        blockObject["output"] = request["output"] | "";
        blockObject["period_ms"] = request["period_ms"] | 0;
        blockObject["duration_ms"] = request["duration_ms"] | 5000;
        blockObject["retrigger"] = request["retrigger"] | false;
        blockObject["start_immediately"] = request["start_immediately"] | false;
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("select");
        blockObject.remove("input");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
    }
    else if (type == BlockType::Selector)
    {
        blockObject["primary"] = request["primary"] | "";
        blockObject["secondary"] = request["secondary"] | "";
        blockObject["select"] = request["select"] | "";
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("input");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
    }
    else if (type == BlockType::Button)
    {
        blockObject["input"] = request["input"] | "";
        blockObject["debounce_ms"] = request["debounce_ms"] | 50;
        blockObject["long_press_ms"] = request["long_press_ms"] | 800;
        blockObject["double_press_ms"] = request["double_press_ms"] | 350;
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("output");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("select");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
    }
    else if (type == BlockType::Latch)
    {
        String toggleSignalId = request["toggle_input"] | "";
        String setSignalId = request["set_input"] | "";
        String resetSignalId = request["reset_input"] | "";
        String autoError;

        if (request["auto_toggle_enabled"] | false)
        {
            if (!ensureAutoButtonInput(configDoc, blockId, "toggle",
                request["auto_toggle_gpio"] | -1,
                request["auto_toggle_inverted"] | false,
                request["auto_toggle_pullup"] | false,
                request["auto_toggle_event"] | "short_press",
                autoDebounceMs, autoLongPressMs, autoDoublePressMs,
                toggleSignalId, autoError))
            {
                sendJsonError(400, autoError.c_str());
                return;
            }
        }

        if (request["auto_set_enabled"] | false)
        {
            if (!ensureAutoButtonInput(configDoc, blockId, "set",
                request["auto_set_gpio"] | -1,
                request["auto_set_inverted"] | false,
                request["auto_set_pullup"] | false,
                request["auto_set_event"] | "short_press",
                autoDebounceMs, autoLongPressMs, autoDoublePressMs,
                setSignalId, autoError))
            {
                sendJsonError(400, autoError.c_str());
                return;
            }
        }

        if (request["auto_reset_enabled"] | false)
        {
            if (!ensureAutoButtonInput(configDoc, blockId, "reset",
                request["auto_reset_gpio"] | -1,
                request["auto_reset_inverted"] | false,
                request["auto_reset_pullup"] | false,
                request["auto_reset_event"] | "short_press",
                autoDebounceMs, autoLongPressMs, autoDoublePressMs,
                resetSignalId, autoError))
            {
                sendJsonError(400, autoError.c_str());
                return;
            }
        }

        blockObject["toggle_input"] = toggleSignalId;
        blockObject["set_input"] = setSignalId;
        blockObject["reset_input"] = resetSignalId;
        blockObject["output"] = request["output"] | "";
        blockObject["retain"] = request["retain"] | false;
        blockObject["reset_priority"] = request["reset_priority"] | true;
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("select");
        blockObject.remove("input");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
    }
    else if (type == BlockType::Comparator)
    {
        blockObject["input"] = request["input"] | "";
        blockObject["compare_signal"] = request["compare_signal"] | "";
        blockObject["compare_value"] = request["compare_value"] | 0.0f;
        blockObject["compare_value_b"] = request["compare_value_b"] | 0.0f;
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
    }
    else if (type == BlockType::Counter)
    {
        blockObject["input"] = request["input"] | "";
        blockObject["reset_input"] = request["reset_input"] | request["input_b"] | "";
        blockObject["step"] = request["step"] | request["value_a"] | request["compare_value"] | 1.0f;
        blockObject["initial_value"] = request["initial_value"] | request["value_b"] | request["compare_value_b"] | 0.0f;
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("service_signal");
        blockObject.remove("select");
        blockObject.remove("mode_select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("value_c");
        blockObject.remove("value_d");
        blockObject.remove("input_c");
    }
    else if (type == BlockType::Totalizer)
    {
        blockObject["input"] = request["input"] | "";
        blockObject["reset_input"] = request["reset_input"] | request["input_b"] | "";
        blockObject["scale"] = request["scale"] | request["value_a"] | request["compare_value"] | 1.0f;
        blockObject["initial_value"] = request["initial_value"] | request["value_b"] | request["compare_value_b"] | 0.0f;
        blockObject["save_every_delta"] = request["save_every_delta"] | request["value_c"] | 1.0f;
        blockObject["save_every_ms"] = request["save_every_ms"] | request["value_d"] | 60000.0f;
        blockObject["retain"] = request["retain"] | false;
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("service_signal");
        blockObject.remove("select");
        blockObject.remove("mode_select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_priority");
        blockObject.remove("input_c");
    }
    else if (type == BlockType::RateEstimator)
    {
        blockObject["input"] = request["input"] | "";
        blockObject["duration_ms"] = request["duration_ms"] | request["sample_ms"] | 1000;
        blockObject["scale"] = request["scale"] | request["value_a"] | request["compare_value"] | 1.0f;
        blockObject["smoothing_alpha"] = request["smoothing_alpha"] | request["value_b"] | request["compare_value_b"] | 1.0f;
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("service_signal");
        blockObject.remove("select");
        blockObject.remove("mode_select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("value_c");
        blockObject.remove("value_d");
        blockObject.remove("input_b");
        blockObject.remove("input_c");
    }
    else if (type == BlockType::WindowAggregator)
    {
        blockObject["input"] = request["input"] | "";
        blockObject["period_ms"] = request["period_ms"] | request["bucket_ms"] | 60000;
        blockObject["duration_ms"] = request["duration_ms"] | request["window_ms"] | 3600000;
        blockObject["scale"] = request["scale"] | request["value_a"] | request["compare_value"] | 1.0f;
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("service_signal");
        blockObject.remove("select");
        blockObject.remove("mode_select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("compare_signal");
        blockObject.remove("compare_value_b");
        blockObject.remove("value_b");
        blockObject.remove("value_c");
        blockObject.remove("value_d");
        blockObject.remove("input_b");
        blockObject.remove("input_c");
    }
    else if (type == BlockType::SignalExtractor)
    {
        blockObject["input"] = request["input"] | request["input_a"] | request["source_a"] | "";
        blockObject["input_b"] = request["input_b"] | request["source_b"] | "";
        blockObject["quality_input"] = request["quality_input"] | request["quality_source"] | request["input_c"] | "";
        blockObject["threshold_on"] = request["threshold_on"] | request["value_a"] | request["compare_value"] | 1.0f;
        blockObject["threshold_off"] = request["threshold_off"] | request["value_b"] | request["compare_value_b"] | 0.0f;
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("service_signal");
        blockObject.remove("select");
        blockObject.remove("mode_select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("compare_signal");
        blockObject.remove("compare_value");
        blockObject.remove("compare_value_b");
        blockObject.remove("value_a");
        blockObject.remove("value_b");
        blockObject.remove("value_c");
        blockObject.remove("value_d");
    }
    else if (type == BlockType::ScaleMap)
    {
        blockObject["input"] = request["input"] | "";
        blockObject["value_a"] = request["value_a"] | 1.0f;
        blockObject["value_b"] = request["value_b"] | 0.0f;
        blockObject["value_c"] = request["value_c"] | 0.0f;
        blockObject["value_d"] = request["value_d"] | 1.0f;
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("compare_signal");
        blockObject.remove("compare_value");
        blockObject.remove("compare_value_b");
    }
    else if (type == BlockType::LogicGate)
    {
        blockObject["input"] = request["input"] | "";
        String secondInput = request["input_b"] | request["compare_signal"] | "";
        if ((request["mode"] | "and") == "not")
        {
            secondInput = "";
        }
        blockObject["input_b"] = secondInput;
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("compare_signal");
        blockObject.remove("compare_value");
        blockObject.remove("compare_value_b");
        blockObject.remove("value_a");
        blockObject.remove("value_b");
        blockObject.remove("value_c");
        blockObject.remove("value_d");
    }
    else if (type == BlockType::EdgeDetect)
    {
        blockObject["input"] = request["input"] | "";
        blockObject["output"] = request["output"] | "";
        blockObject["duration_ms"] = request["duration_ms"] | 100;
        blockObject["retrigger"] = request["retrigger"] | false;
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("compare_signal");
        blockObject.remove("compare_value");
        blockObject.remove("compare_value_b");
        blockObject.remove("value_a");
        blockObject.remove("value_b");
        blockObject.remove("value_c");
        blockObject.remove("value_d");
        blockObject.remove("input_b");
    }
    else if (type == BlockType::Hysteresis)
    {
        blockObject["input"] = request["input"] | "";
        blockObject["output"] = request["output"] | "";
        blockObject["value_a"] = request["value_a"] | request["compare_value"] | 0.0f;
        blockObject["value_b"] = request["value_b"] | request["compare_value_b"] | 1.0f;
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("compare_signal");
        blockObject.remove("compare_value");
        blockObject.remove("compare_value_b");
        blockObject.remove("value_c");
        blockObject.remove("value_d");
        blockObject.remove("input_b");
    }
    else if (type == BlockType::Interlock)
    {
        blockObject["input"] = request["input"] | request["request_signal"] | "";
        blockObject["input_b"] = request["input_b"] | request["permissive_signal"] | "";
        blockObject["input_c"] = request["input_c"] | request["inhibit_signal"] | request["interlock_signal"] | "";
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("compare_signal");
        blockObject.remove("compare_value");
        blockObject.remove("compare_value_b");
        blockObject.remove("value_a");
        blockObject.remove("value_b");
        blockObject.remove("value_c");
        blockObject.remove("value_d");
    }
    else if (type == BlockType::ModeAuthority)
    {
        blockObject["primary"] = request["primary"] | request["input"] | "";
        blockObject["secondary"] = request["secondary"] | request["input_b"] | "";
        blockObject["service_signal"] = request["service_signal"] | request["input_c"] | "";
        blockObject["mode_select"] = request["mode_select"] | request["select"] | "";
        blockObject["output"] = request["output"] | "";
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("duration_ms");
        blockObject.remove("retrigger");
        blockObject.remove("start_immediately");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("compare_signal");
        blockObject.remove("compare_value");
        blockObject.remove("compare_value_b");
        blockObject.remove("value_a");
        blockObject.remove("value_b");
        blockObject.remove("value_c");
        blockObject.remove("value_d");
        blockObject.remove("input");
        blockObject.remove("input_b");
        blockObject.remove("input_c");
        blockObject.remove("request_signal");
        blockObject.remove("permissive_signal");
        blockObject.remove("inhibit_signal");
        blockObject.remove("interlock_signal");
    }
    else if (type == BlockType::Freshness)
    {
        blockObject["input"] = request["input"] | request["signal"] | "";
        blockObject["output"] = request["output"] | "";
        blockObject["duration_ms"] = request["duration_ms"] | request["timeout_ms"] | 5000;
        blockObject.remove("trigger");
        blockObject.remove("enable");
        blockObject.remove("period_ms");
        blockObject.remove("start_immediately");
        blockObject.remove("primary");
        blockObject.remove("secondary");
        blockObject.remove("service_signal");
        blockObject.remove("select");
        blockObject.remove("mode_select");
        blockObject.remove("debounce_ms");
        blockObject.remove("long_press_ms");
        blockObject.remove("double_press_ms");
        blockObject.remove("toggle_input");
        blockObject.remove("set_input");
        blockObject.remove("reset_input");
        blockObject.remove("retain");
        blockObject.remove("reset_priority");
        blockObject.remove("compare_signal");
        blockObject.remove("compare_value");
        blockObject.remove("compare_value_b");
        blockObject.remove("value_a");
        blockObject.remove("value_b");
        blockObject.remove("value_c");
        blockObject.remove("value_d");
        blockObject.remove("input_b");
        blockObject.remove("input_c");
    }

    setGeneratedMetadata(blockObject,
        String(request["generated_by"] | ""),
        String(request["generated_role"] | ""));

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Block saved" : "Block saved, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleDeleteBlockDefinition()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        sendJsonError(400, "Empty request body");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        sendJsonError(400, "Invalid JSON");
        return;
    }

    String blockId = request["block_id"] | "";
    if (blockId.isEmpty())
    {
        sendJsonError(400, "block_id is required");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to load config");
        return;
    }

    JsonObject blocks = configDoc["blocks"].as<JsonObject>();
    if (blocks.isNull() || blocks[blockId].isNull())
    {
        sendJsonError(404, "Block not found");
        return;
    }
    JsonObject blockObject = blocks[blockId].as<JsonObject>();
    const bool shouldRemoveRetainedTotalizer =
        String(blockObject["type"] | "") == "totalizer" &&
        (blockObject["retain"] | false);

    JsonArray deleteChannels;
    JsonArray deleteBlocks;
    if (request["delete_channels"].is<JsonArray>())
    {
        deleteChannels = request["delete_channels"].as<JsonArray>();
    }
    if (request["delete_blocks"].is<JsonArray>())
    {
        deleteBlocks = request["delete_blocks"].as<JsonArray>();
    }

    removeGeneratedHelpers(configDoc, deleteChannels, deleteBlocks);
    blocks.remove(blockId);

    if (shouldRemoveRetainedTotalizer)
    {
        gRetainedValues.remove("totalizer:" + blockId);
    }

    if (!saveConfigDocument(configDoc))
    {
        sendJsonError(500, "Failed to save config");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Block deleted" : "Block deleted, but runtime apply reported an error";
    sendJsonDoc(response);
}

static void handleSaveTemplateSelection()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Empty request body\"}");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Invalid JSON\"}");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        server.send(500, "application/json", "{\"ok\":false,\"message\":\"Failed to load config\"}");
        return;
    }

    JsonObject system = configDoc["system"].is<JsonObject>() ? configDoc["system"].as<JsonObject>() : configDoc["system"].to<JsonObject>();
    String activeBoard = request["active_board"] | gConfig.system.active_board;
    String activeBoardTemplate = request["active_board_template"] | gConfig.system.active_board_template;
    String activeChipTemplate = request["active_chip_template"] | "";

    system["active_board"] = activeBoard;
    system["active_board_template"] = activeBoardTemplate;
    system["active_chip_template"] = activeChipTemplate;

    JsonObject boards = configDoc["boards"].is<JsonObject>() ? configDoc["boards"].as<JsonObject>() : configDoc["boards"].to<JsonObject>();
    JsonObject boardObject = boards[activeBoard].as<JsonObject>();
    if (!boardObject.isNull() && !activeBoardTemplate.isEmpty())
    {
        boardObject["template"] = activeBoardTemplate;
    }

    if (!saveConfigDocument(configDoc))
    {
        server.send(500, "application/json", "{\"ok\":false,\"message\":\"Failed to save config\"}");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Templates assigned to active board" : "Templates assigned, but runtime apply reported an error";
    String json;
    serializeJson(response, json);
    server.send(applied ? 200 : 202, "application/json", json);
}

static void handleSaveSettings()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Empty request body\"}");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Invalid JSON\"}");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        server.send(500, "application/json", "{\"ok\":false,\"message\":\"Failed to load config\"}");
        return;
    }

    JsonObject wifi = configDoc["wifi"].is<JsonObject>() ? configDoc["wifi"].as<JsonObject>() : configDoc["wifi"].to<JsonObject>();
    JsonObject system = configDoc["system"].is<JsonObject>() ? configDoc["system"].as<JsonObject>() : configDoc["system"].to<JsonObject>();
    JsonObject oled = configDoc["oled"].is<JsonObject>() ? configDoc["oled"].as<JsonObject>() : configDoc["oled"].to<JsonObject>();
    JsonObject lora = configDoc["lora"].is<JsonObject>() ? configDoc["lora"].as<JsonObject>() : configDoc["lora"].to<JsonObject>();
    JsonObject sd = configDoc["sd"].is<JsonObject>() ? configDoc["sd"].as<JsonObject>() : configDoc["sd"].to<JsonObject>();
    JsonObject led = configDoc["led"].is<JsonObject>() ? configDoc["led"].as<JsonObject>() : configDoc["led"].to<JsonObject>();
    JsonObject battery = configDoc["battery"].is<JsonObject>() ? configDoc["battery"].as<JsonObject>() : configDoc["battery"].to<JsonObject>();

    if (request["wifi"].is<JsonObject>())
    {
        JsonObject reqWifi = request["wifi"].as<JsonObject>();
        wifi["mode"] = reqWifi["mode"] | gConfig.wifi.mode;
        wifi["ssid"] = reqWifi["ssid"] | gConfig.wifi.ssid;
        wifi["password"] = reqWifi["password"] | gConfig.wifi.password;
        wifi["ap_ssid"] = reqWifi["ap_ssid"] | gConfig.wifi.apSsid;
        wifi["ap_password"] = reqWifi["ap_password"] | gConfig.wifi.apPassword;
        wifi["startup_policy"] = reqWifi["startup_policy"] | gConfig.wifi.startupPolicy;
    }

    if (request["system"].is<JsonObject>())
    {
        JsonObject reqSystem = request["system"].as<JsonObject>();
        system["active_board"] = reqSystem["active_board"] | gConfig.system.active_board;
    }

    if (request["modules"].is<JsonObject>())
    {
        JsonObject modules = request["modules"].as<JsonObject>();
        oled["enabled"] = modules["oled"] | gConfig.oled.enabled;
        lora["enabled"] = modules["lora"] | gConfig.lora.enabled;
        sd["enabled"] = modules["sd"] | gConfig.sd.enabled;
        led["enabled"] = modules["led"] | gConfig.led.enabled;
        battery["enabled"] = modules["battery"] | gConfig.battery.enabled;
    }

    if (request["oled"].is<JsonObject>())
    {
        JsonObject reqOled = request["oled"].as<JsonObject>();
        oled["show_ip_on_fallback"] = reqOled["show_ip_on_fallback"] | gConfig.oled.showIpOnFallback;
    }

    if (!saveConfigDocument(configDoc))
    {
        server.send(500, "application/json", "{\"ok\":false,\"message\":\"Failed to save config\"}");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Settings saved. Reconnect if Wi-Fi mode changed." : "Settings saved, but runtime apply reported an error.";
    String json;
    serializeJson(response, json);
    server.send(applied ? 200 : 202, "application/json", json);
}

static void handleSaveChannelBinding()
{
    String body = server.arg("plain");
    if (body.isEmpty())
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Empty request body\"}");
        return;
    }

    JsonDocument request;
    if (deserializeJson(request, body))
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Invalid JSON\"}");
        return;
    }

    String channelId = request["channel_id"] | "";
    String typeString = request["type"] | "";
    int gpio = request["gpio"] | -1;
    String sourceMode = request["source_mode"] | "local";
    String externalResourceId = request["external_resource_id"] | "";

    if (channelId.isEmpty() || typeString.isEmpty())
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"channel_id and type are required\"}");
        return;
    }

    if (sourceMode == "external" && externalResourceId.isEmpty())
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"external_resource_id is required for external source\"}");
        return;
    }

    if (sourceMode != "external" && gpio < 0)
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"gpio is required for local source\"}");
        return;
    }

    ChannelType channelType = parseChannelType(typeString);
    if (channelType == ChannelType::Unknown)
    {
        server.send(400, "application/json", "{\"ok\":false,\"message\":\"Unknown channel type\"}");
        return;
    }

    JsonDocument configDoc;
    if (!loadConfigDocument(configDoc))
    {
        server.send(500, "application/json", "{\"ok\":false,\"message\":\"Failed to load config\"}");
        return;
    }
    String resourceId;
    String errorMessage;
    if (!ensureChannelBindingInConfig(configDoc, channelId, channelType, gpio, externalResourceId,
        request["inverted"] | false, request["pullup"] | false, request["initial"] | false,
        resourceId, errorMessage))
    {
        JsonDocument response;
        response["ok"] = false;
        response["message"] = errorMessage;
        String json;
        serializeJson(response, json);
        server.send(400, "application/json", json);
        return;
    }

    JsonObject channels = configDoc["channels"].as<JsonObject>();
    JsonObject channelObject = channels[channelId].as<JsonObject>();
    writeAnalogChannelMetadata(channelObject, channelType, request);

    if (!saveConfigDocument(configDoc))
    {
        server.send(500, "application/json", "{\"ok\":false,\"message\":\"Failed to save config\"}");
        return;
    }

    bool applied = applyRuntimeConfig();
    JsonDocument response;
    response["ok"] = applied;
    response["message"] = applied ? "Channel binding saved" : "Channel saved, but runtime apply reported an error";
    String json;
    serializeJson(response, json);
    server.send(applied ? 200 : 202, "application/json", json);
}

static void handleTemplate()
{
    const BoardConfig *board = getActiveBoard();
    String chip = board ? board->chip : ESP.getChipModel();
    const ChipTemplate *chipTemplate = getChipTemplate(chip);
    if (!chipTemplate)
    {
        server.send(404, "text/plain", "No template");
        return;
    }

    JsonDocument doc;
    doc["id"] = chipTemplate->id;
    doc["name"] = chipTemplate->name;
    JsonArray pins = ensureArray(doc, "pins");
    for (int i = 0; i < chipTemplate->pinCount; i++)
    {
        JsonObject pinObject = addObject(pins);
        int gpio = chipTemplate->pins[i].gpio;
        bool inputOnly = gpio == 34 || gpio == 35 || gpio == 36 || gpio == 39;
        bool strapping = gpio == 0 || gpio == 2 || gpio == 5 || gpio == 12 || gpio == 15;
        pinObject["gpio"] = chipTemplate->pins[i].gpio;
        pinObject["internal_pullup"] = chipTemplate->pins[i].internalPullup;
        pinObject["input_only"] = inputOnly;
        pinObject["strapping"] = strapping;
        pinObject["forbidden"] = false;
        pinObject["note"] = inputOnly ? "Input only" : (strapping ? "Strapping pin" : "");
        JsonArray capabilities = ensureArray(pinObject, "capabilities");
        for (int j = 0; j < chipTemplate->pins[i].capabilityCount; j++)
        {
            capabilities.add(channelTypeToString(chipTemplate->pins[i].capabilities[j]));
        }
    }
    sendJsonDoc(doc);
}

static void handleRoot()
{
    if (tryServeStaticFile("/index.html"))
    {
        return;
    }

    static const char html[] PROGMEM = R"rawliteral(
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ShipController</title>
  <style>
    :root{--bg:#eef1e8;--panel:#fffdf7;--ink:#1f2a24;--muted:#5d6e63;--line:#dde3d5;--accent:#c45d2c}
    *{box-sizing:border-box}
    body{margin:0;padding:24px;background:linear-gradient(180deg,#f5f6ef,#e8ece0);color:var(--ink);font-family:"Segoe UI",sans-serif}
    .card{max-width:760px;margin:0 auto;padding:24px;border:1px solid var(--line);border-radius:24px;background:rgba(255,253,247,.95);box-shadow:0 18px 50px rgba(45,61,52,.1)}
    h1{margin:0 0 10px;font-size:34px}
    p{margin:0 0 12px;color:var(--muted);line-height:1.5}
    code{padding:2px 6px;border-radius:8px;background:#fff;border:1px solid var(--line)}
    .note{margin-top:16px;padding:14px 16px;border-radius:16px;border:1px solid #f2d7c7;background:#fff4ec;color:#7d3d1d}
  </style>
</head>
<body>
  <div class="card">
    <h1>ShipController</h1>
    <p>The full Web UI is now served from <code>LittleFS</code>.</p>
    <p>This fallback page is shown because <code>/index.html</code> was not found in the filesystem.</p>
    <div class="note">
      Upload web assets with <code>pio run -t uploadfs</code>, then reload this page.
    </div>
  </div>
</body>
</html>
)rawliteral";
    server.send_P(200, "text/html", html);
}
static void handleStaticFallback()
{
    String uri = server.uri();
    if (uri == "/" || uri.isEmpty())
    {
        handleRoot();
        return;
    }

    if (tryServeStaticFile(uri))
    {
        return;
    }

    server.send(404, "text/plain", "Not found");
}

void webInit()
{
    server.on("/", handleRoot);
    server.on("/chip", HTTP_GET, handleDetectChip);
    server.on("/boards", HTTP_GET, handleGetBoards);
    server.on("/hardware", HTTP_GET, handleGetHardware);
    server.on("/channels", HTTP_GET, handleGetChannels);
    server.on("/signals", HTTP_GET, handleGetSignals);
    server.on("/blocks", HTTP_GET, handleGetBlocks);
    server.on("/display", HTTP_GET, handleGetDisplay);
    server.on("/alarms", HTTP_GET, handleGetAlarms);
    server.on("/sequences", HTTP_GET, handleGetSequences);
    server.on("/buses", HTTP_GET, handleGetBuses);
    server.on("/bus", HTTP_POST, handleSaveBus);
    server.on("/bus-delete", HTTP_POST, handleDeleteBus);
    server.on("/devices", HTTP_GET, handleGetDevices);
    server.on("/device", HTTP_POST, handleSaveDevice);
    server.on("/device-delete", HTTP_POST, handleDeleteDevice);
    server.on("/device-seed-external-resources", HTTP_POST, handleSeedExternalResourcesForDevice);
    server.on("/external-resources", HTTP_GET, handleGetExternalResources);
    server.on("/external-resource", HTTP_POST, handleSaveExternalResource);
    server.on("/external-resource-write", HTTP_POST, handleWriteExternalResource);
    server.on("/external-resource-delete", HTTP_POST, handleDeleteExternalResource);
    server.on("/display-screen", HTTP_POST, handleSaveDisplayScreen);
    server.on("/display-screen-delete", HTTP_POST, handleDeleteDisplayScreen);
    server.on("/display-widget", HTTP_POST, handleSaveDisplayWidget);
    server.on("/display-widget-delete", HTTP_POST, handleDeleteDisplayWidget);
    server.on("/block-delete-review", HTTP_GET, handleGetBlockDeleteReview);
    server.on("/alarm", HTTP_POST, handleSaveAlarmDefinition);
    server.on("/alarm-delete", HTTP_POST, handleDeleteAlarmDefinition);
    server.on("/alarm-ack", HTTP_POST, handleAcknowledgeAlarm);
    server.on("/sequence", HTTP_POST, handleSaveSequenceDefinition);
    server.on("/sequence-delete", HTTP_POST, handleDeleteSequenceDefinition);
    server.on("/sequence-state", HTTP_POST, handleSaveSequenceState);
    server.on("/sequence-state-delete", HTTP_POST, handleDeleteSequenceState);
    server.on("/sequence-transition", HTTP_POST, handleSaveSequenceTransition);
    server.on("/sequence-transition-delete", HTTP_POST, handleDeleteSequenceTransition);
    server.on("/sequence-reset", HTTP_POST, handleResetSequence);
    server.on("/signal-definition", HTTP_POST, handleSaveSignalDefinition);
    server.on("/signal-delete", HTTP_POST, handleDeleteSignalDefinition);
    server.on("/block-definition", HTTP_POST, handleSaveBlockDefinition);
    server.on("/block-delete", HTTP_POST, handleDeleteBlockDefinition);
    server.on("/status", HTTP_GET, handleGetStatus);
    server.on("/inspector", HTTP_GET, handleGetInspector);
    server.on("/diagnostics", HTTP_GET, handleGetDiagnostics);
    server.on("/runtime", HTTP_GET, handleGetRuntime);
    server.on("/template-library", HTTP_GET, handleGetTemplateLibrary);
    server.on("/template-library", HTTP_POST, handleSaveTemplateLibrary);
    server.on("/template-delete", HTTP_POST, handleDeleteTemplate);
    server.on("/editor-project-model", HTTP_GET, handleGetEditorProjectModel);
    server.on("/editor-project-model", HTTP_POST, handleSaveEditorProjectModel);
    server.on("/settings", HTTP_POST, handleSaveSettings);
    server.on("/template-selection", HTTP_POST, handleSaveTemplateSelection);
    server.on("/channel-binding", HTTP_POST, handleSaveChannelBinding);
    server.on("/channel-delete", HTTP_POST, handleDeleteChannelBinding);
    server.on("/template", HTTP_GET, handleTemplate);
    server.onNotFound(handleStaticFallback);

    Serial.println("WEB INIT");

    String policy = gConfig.wifi.startupPolicy;
    if (policy.length() == 0)
    {
        policy = (gConfig.wifi.mode == "ap") ? "ap_only" : "sta_fallback_ap";
    }

    if (policy == "ap_only")
    {
        startAccessPoint();
    }
    else
    {
        Serial.println("Connecting to WiFi...");
        Serial.println("STA SSID: " + gConfig.wifi.ssid);
        WiFi.persistent(false);
        WiFi.disconnect(true, true);
        delay(200);
        WiFi.mode(WIFI_STA);
        if (gConfig.wifi.password.length() > 0)
        {
            WiFi.begin(gConfig.wifi.ssid.c_str(), gConfig.wifi.password.c_str());
        }
        else
        {
            WiFi.begin(gConfig.wifi.ssid.c_str());
        }
        unsigned long start = millis();

        while (WiFi.status() != WL_CONNECTED && millis() - start < 15000)
        {
            delay(500);
            Serial.print(".");
        }

        if (WiFi.status() == WL_CONNECTED)
        {
            ipStr = WiFi.localIP().toString();
            Serial.println("\nCONNECTED!");
            Serial.println(ipStr);
        }
        else if (policy == "sta_fallback_ap")
        {
            Serial.println("\nFAILED -> AP MODE");
            startAccessPoint();
        }
        else
        {
            Serial.println("\nFAILED -> STA ONLY, AP NOT STARTED");
            ipStr = "0.0.0.0";
        }
    }

    server.begin();
    Serial.print("IP: ");
    Serial.println(ipStr);
}

void webUpdate()
{
    server.handleClient();
}

String getIP()
{
    return ipStr;
}
