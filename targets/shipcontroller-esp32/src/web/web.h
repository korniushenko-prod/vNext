#include <Arduino.h>
#pragma once

String getIP();
String getNetworkMode();
String getNetworkSsid();

void webInit();
void webUpdate();
