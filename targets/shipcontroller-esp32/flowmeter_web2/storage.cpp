#include <Arduino.h>
#include <Preferences.h>
#include "storage.h"
#include "app_state.h"

static Preferences prefs;

void storageInit() { prefs.begin("flow_hall", false); }

void loadAllSettings() {
  gSettings.litersPerPulse = prefs.getFloat("lpp", gSettings.litersPerPulse);
  gSettings.fuels[FUEL_HEAVY].rho15 = prefs.getFloat("hf_rho", gSettings.fuels[FUEL_HEAVY].rho15);
  gSettings.fuels[FUEL_HEAVY].tempC = prefs.getFloat("hf_tmp", gSettings.fuels[FUEL_HEAVY].tempC);
  gSettings.fuels[FUEL_DIESEL].rho15 = prefs.getFloat("ds_rho", gSettings.fuels[FUEL_DIESEL].rho15);
  gSettings.fuels[FUEL_DIESEL].tempC = prefs.getFloat("ds_tmp", gSettings.fuels[FUEL_DIESEL].tempC);
  gSettings.activeFuel = prefs.getUChar("fuel_id", gSettings.activeFuel);
  gSettings.mode = (ThresholdMode)prefs.getUChar("mode", gSettings.mode);
  gSettings.threshold = prefs.getFloat("thr", gSettings.threshold);
  gSettings.hysteresis = prefs.getFloat("hys", gSettings.hysteresis);
  gSettings.filterK = prefs.getFloat("fk", gSettings.filterK);
  gSettings.pulseGuardEnabled = prefs.getBool("pg_en", gSettings.pulseGuardEnabled);
  gSettings.guardFactor = prefs.getFloat("pg_fac", gSettings.guardFactor);
  gSettings.minPulseMs = prefs.getUInt("pg_min", gSettings.minPulseMs);
  gSettings.utcOffsetHours = prefs.getChar("utc", gSettings.utcOffsetHours);
  gSettings.dayStartMin = prefs.getUShort("dayst", gSettings.dayStartMin);
  gSettings.serialMode = (DebugMode)prefs.getUChar("ser", gSettings.serialMode);
  gSettings.staEnabled = prefs.getBool("sta_en", gSettings.staEnabled);
  gSettings.staSsid = prefs.getString("sta_ssid", gSettings.staSsid);
  gSettings.staPass = prefs.getString("sta_pass", gSettings.staPass);
  gTelem.pulseCount = prefs.getUInt("pulses", 0);
  gTelem.dailyPulseCount = prefs.getUInt("dayp", 0);
  gTelem.rejectedTotal = prefs.getUInt("rej", 0);
}

void saveCounters() {
  prefs.putUInt("pulses", gTelem.pulseCount);
  prefs.putUInt("dayp", gTelem.dailyPulseCount);
  prefs.putUInt("rej", gTelem.rejectedTotal);
}

void saveAllSettings() {
  prefs.putFloat("lpp", gSettings.litersPerPulse);
  prefs.putFloat("hf_rho", gSettings.fuels[FUEL_HEAVY].rho15);
  prefs.putFloat("hf_tmp", gSettings.fuels[FUEL_HEAVY].tempC);
  prefs.putFloat("ds_rho", gSettings.fuels[FUEL_DIESEL].rho15);
  prefs.putFloat("ds_tmp", gSettings.fuels[FUEL_DIESEL].tempC);
  prefs.putUChar("fuel_id", gSettings.activeFuel);
  prefs.putUChar("mode", gSettings.mode);
  prefs.putFloat("thr", gSettings.threshold);
  prefs.putFloat("hys", gSettings.hysteresis);
  prefs.putFloat("fk", gSettings.filterK);
  prefs.putBool("pg_en", gSettings.pulseGuardEnabled);
  prefs.putFloat("pg_fac", gSettings.guardFactor);
  prefs.putUInt("pg_min", gSettings.minPulseMs);
  prefs.putChar("utc", gSettings.utcOffsetHours);
  prefs.putUShort("dayst", gSettings.dayStartMin);
  prefs.putUChar("ser", gSettings.serialMode);
  prefs.putBool("sta_en", gSettings.staEnabled);
  prefs.putString("sta_ssid", gSettings.staSsid);
  prefs.putString("sta_pass", gSettings.staPass);
  saveCounters();
  gTelem.dirty = false;
}

void saveIfDirty() {
  if (gTelem.dirty) saveAllSettings();
  else saveCounters();
}

void factoryResetSettings() { prefs.clear(); }

void saveTotalCounter()
{
  Preferences prefs;
  prefs.begin("flow", false);

  prefs.putFloat("totalL", gTelem.totalLiters);

  prefs.end();
}

void loadTotalCounter()
{
  Preferences prefs;
  prefs.begin("flow", true);

  gTelem.totalLiters = prefs.getFloat("totalL", 0.0f);

  prefs.end();
}


