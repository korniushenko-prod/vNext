#pragma once

#include <ArduinoJson.h>

bool loadConfigFromFile();
bool loadConfigDocumentFromStorage(JsonDocument &doc);
bool saveConfigDocumentToStorage(JsonDocument &doc);
bool loadTemplateLibraryDocumentFromStorage(JsonDocument &doc);
bool saveTemplateLibraryDocumentToStorage(JsonDocument &doc);
