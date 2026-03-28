#pragma once

void sensorInit();
void sensorSample();
void sensorStartAutoCalibration();
void sensorResetMinMax();
void sensorSetMode(uint8_t modeValue);
const char* signalQuality();
