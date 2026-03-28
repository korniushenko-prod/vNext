#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

struct SystemSourceDefinition {
    const char *id;
    const char *labelRu;
    const char *labelEn;
};

int getSystemSourceCount();
const SystemSourceDefinition *getSystemSourceDefinitionAt(int index);
bool isSystemSourceId(const String &sourceId);
String readSystemSourceValue(const String &sourceId);
void appendSystemSources(JsonArray target);
