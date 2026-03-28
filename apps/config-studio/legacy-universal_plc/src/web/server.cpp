#include "server.h"

#include <Arduino.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>

#include "../core/runtime/plc_runtime.h"
#include "../core/storage/project_settings_store.h"

namespace plc::web {

namespace {

WebServer server(80);
storage::ProjectSettingsStore settingsStore;
storage::ProjectSettingsData settings = {};
String ipAddress = "0.0.0.0";
bool fsReady = false;

bool parseBoolArg(const String &value)
{
    return value == "1" || value == "true" || value == "on";
}

void copyArgIfPresent(const char *name, char *target, size_t targetSize)
{
    if (!server.hasArg(name))
    {
        return;
    }

    const String value = server.arg(name);
    value.toCharArray(target, targetSize);
    target[targetSize - 1] = '\0';
}

String jsonEscape(const char *value)
{
    String out;
    if (value == nullptr)
    {
        return out;
    }

    for (const char *p = value; *p != '\0'; ++p)
    {
        switch (*p)
        {
        case '\\':
            out += "\\\\";
            break;
        case '"':
            out += "\\\"";
            break;
        case '\n':
            out += "\\n";
            break;
        case '\r':
            break;
        default:
            out += *p;
            break;
        }
    }

    return out;
}

String settingsJson()
{
    String json = "{";
    json += "\"project_id\":\"" + jsonEscape(settings.projectId) + "\",";
    json += "\"project_name\":\"" + jsonEscape(settings.projectName) + "\",";
    json += "\"project_description\":\"" + jsonEscape(settings.projectDescription) + "\",";
    json += "\"timezone\":\"" + jsonEscape(settings.timezone) + "\",";
    json += "\"ap_ssid\":\"" + jsonEscape(settings.apSsid) + "\",";
    json += "\"ap_password\":\"" + jsonEscape(settings.apPassword) + "\",";
    json += "\"tick_ms\":" + String(settings.tickMs) + ",";
    json += String("\"simulation_enabled\":") + (settings.simulationEnabled ? "true" : "false") + ",";
    json += String("\"debug_enabled\":") + (settings.debugEnabled ? "true" : "false");
    json += "}";
    return json;
}

String systemJson()
{
    const RuntimeSnapshot &snapshot = plc::runtime().snapshot();
    String json = "{";
    json += "\"ip_address\":\"" + jsonEscape(ipAddress.c_str()) + "\",";
    json += "\"cycle_count\":" + String(snapshot.cycleCount) + ",";
    json += "\"registered_signals\":" + String(snapshot.registeredSignals) + ",";
    json += "\"active_alarms\":" + String(snapshot.activeAlarms) + ",";
    json += "\"runtime_healthy\":";
    json += snapshot.healthy ? "true" : "false";
    json += "}";
    return json;
}

const char *contentTypeForPath(const String &path)
{
    if (path.endsWith(".html")) return "text/html";
    if (path.endsWith(".css")) return "text/css";
    if (path.endsWith(".js")) return "application/javascript";
    if (path.endsWith(".json")) return "application/json";
    if (path.endsWith(".svg")) return "image/svg+xml";
    return "text/plain";
}

bool tryServeFile(String path)
{
    if (!fsReady)
    {
        return false;
    }

    if (path.isEmpty())
    {
        return false;
    }

    if (!path.startsWith("/"))
    {
        path = "/" + path;
    }

    if (!LittleFS.exists(path))
    {
        return false;
    }

    File file = LittleFS.open(path, "r");
    if (!file)
    {
        return false;
    }

    server.streamFile(file, contentTypeForPath(path));
    file.close();
    return true;
}

void startAccessPoint()
{
    WiFi.mode(WIFI_AP);
    WiFi.softAPdisconnect(true);

    const bool withPassword = strlen(settings.apPassword) >= 8;
    if (withPassword)
    {
        WiFi.softAP(settings.apSsid, settings.apPassword);
    }
    else
    {
        WiFi.softAP(settings.apSsid);
    }

    ipAddress = WiFi.softAPIP().toString();
    Serial.println("WEB AP READY");
    Serial.println("SSID: " + String(settings.apSsid));
    Serial.println("IP: " + ipAddress);
}

void handleGetSettings()
{
    server.send(200, "application/json", settingsJson());
}

void handleGetSystem()
{
    server.send(200, "application/json", systemJson());
}

void handleSaveSettings()
{
    copyArgIfPresent("project_id", settings.projectId, sizeof(settings.projectId));
    copyArgIfPresent("project_name", settings.projectName, sizeof(settings.projectName));
    copyArgIfPresent("project_description", settings.projectDescription, sizeof(settings.projectDescription));
    copyArgIfPresent("timezone", settings.timezone, sizeof(settings.timezone));
    copyArgIfPresent("ap_ssid", settings.apSsid, sizeof(settings.apSsid));
    copyArgIfPresent("ap_password", settings.apPassword, sizeof(settings.apPassword));

    if (server.hasArg("tick_ms"))
    {
        settings.tickMs = static_cast<uint32_t>(server.arg("tick_ms").toInt());
        if (settings.tickMs == 0)
        {
            settings.tickMs = 100;
        }
    }

    if (server.hasArg("simulation_enabled"))
    {
        settings.simulationEnabled = parseBoolArg(server.arg("simulation_enabled"));
    }

    if (server.hasArg("debug_enabled"))
    {
        settings.debugEnabled = parseBoolArg(server.arg("debug_enabled"));
    }

    if (strlen(settings.apSsid) == 0)
    {
        strcpy(settings.apSsid, "universal-plc-setup");
    }

    if (strlen(settings.apPassword) > 0 && strlen(settings.apPassword) < 8)
    {
        server.send(400, "application/json",
            "{\"ok\":false,\"message\":\"AP password must be empty or at least 8 characters.\"}");
        return;
    }

    if (!settingsStore.save(settings))
    {
        server.send(500, "application/json",
            "{\"ok\":false,\"message\":\"Failed to save settings to persistent storage.\"}");
        return;
    }

    startAccessPoint();
    server.send(200, "application/json",
        "{\"ok\":true,\"message\":\"Settings saved. If AP identity changed, reconnect to the new SSID.\"}");
}

void handleRoot()
{
    if (tryServeFile("/index.html"))
    {
        return;
    }

    static const char html[] PROGMEM = R"rawliteral(
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>universal_plc</title></head>
<body><h1>universal_plc</h1><p>Upload LittleFS assets with <code>pio run -t uploadfs</code>.</p></body>
</html>
)rawliteral";
    server.send_P(200, "text/html", html);
}

void handleNotFound()
{
    if (tryServeFile(server.uri()))
    {
        return;
    }

    server.send(404, "text/plain", "Not found");
}

}  // namespace

void begin()
{
    settingsStore.load(settings);
    fsReady = LittleFS.begin();
    startAccessPoint();

    server.on("/", HTTP_GET, handleRoot);
    server.on("/api/settings", HTTP_GET, handleGetSettings);
    server.on("/api/settings", HTTP_POST, handleSaveSettings);
    server.on("/api/system", HTTP_GET, handleGetSystem);
    server.onNotFound(handleNotFound);
    server.begin();
}

void update()
{
    server.handleClient();
}

}  // namespace plc::web
