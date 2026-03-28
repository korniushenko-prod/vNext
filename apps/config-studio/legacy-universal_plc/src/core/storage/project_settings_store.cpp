#include "project_settings_store.h"

#include <Preferences.h>

namespace plc::storage {

namespace {

void copyString(char *target, size_t targetSize, const String &value)
{
    if (targetSize == 0)
    {
        return;
    }

    value.toCharArray(target, targetSize);
    target[targetSize - 1] = '\0';
}

ProjectSettingsData makeDefaults()
{
    ProjectSettingsData data = {};
    copyString(data.projectId, sizeof(data.projectId), "demo_boiler");
    copyString(data.projectName, sizeof(data.projectName), "Demo Boiler");
    copyString(data.projectDescription, sizeof(data.projectDescription),
        "Reference validation project for universal_plc");
    copyString(data.timezone, sizeof(data.timezone), "UTC");
    copyString(data.apSsid, sizeof(data.apSsid), "universal-plc-setup");
    copyString(data.apPassword, sizeof(data.apPassword), "12345678");
    data.tickMs = 100;
    data.simulationEnabled = true;
    data.debugEnabled = true;
    return data;
}

}  // namespace

ProjectSettingsData ProjectSettingsStore::defaults() const
{
    return makeDefaults();
}

bool ProjectSettingsStore::load(ProjectSettingsData &data) const
{
    data = makeDefaults();

    Preferences prefs;
    if (!prefs.begin("uplc_cfg", true))
    {
        return false;
    }

    copyString(data.projectId, sizeof(data.projectId), prefs.getString("project_id", data.projectId));
    copyString(data.projectName, sizeof(data.projectName), prefs.getString("project_name", data.projectName));
    copyString(data.projectDescription, sizeof(data.projectDescription),
        prefs.getString("project_desc", data.projectDescription));
    copyString(data.timezone, sizeof(data.timezone), prefs.getString("timezone", data.timezone));
    copyString(data.apSsid, sizeof(data.apSsid), prefs.getString("ap_ssid", data.apSsid));
    copyString(data.apPassword, sizeof(data.apPassword), prefs.getString("ap_pass", data.apPassword));
    data.tickMs = prefs.getUInt("tick_ms", data.tickMs);
    data.simulationEnabled = prefs.getBool("sim_en", data.simulationEnabled);
    data.debugEnabled = prefs.getBool("dbg_en", data.debugEnabled);
    prefs.end();
    return true;
}

bool ProjectSettingsStore::save(const ProjectSettingsData &data) const
{
    Preferences prefs;
    if (!prefs.begin("uplc_cfg", false))
    {
        return false;
    }

    const bool ok =
        prefs.putString("project_id", data.projectId) > 0 &&
        prefs.putString("project_name", data.projectName) > 0 &&
        prefs.putString("project_desc", data.projectDescription) > 0 &&
        prefs.putString("timezone", data.timezone) > 0 &&
        prefs.putString("ap_ssid", data.apSsid) > 0 &&
        prefs.putString("ap_pass", data.apPassword) > 0;

    prefs.putUInt("tick_ms", data.tickMs);
    prefs.putBool("sim_en", data.simulationEnabled);
    prefs.putBool("dbg_en", data.debugEnabled);
    prefs.end();
    return ok;
}

}  // namespace plc::storage
