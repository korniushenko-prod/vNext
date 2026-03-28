#pragma once
#include <Arduino.h>
#include "../config/config_schema.h"


struct PinItem {
    String name;
    int pin;
    String mode;
    bool state;
};

class PinManager {
public:
    void add(String name, int pin, String mode);
    void init();

    bool read(String name);
    void write(String name, bool state);

private:
    PinItem pins[MAX_PINS];
    int count = 0;

    PinItem* find(String name);
};

extern PinManager gPins;
