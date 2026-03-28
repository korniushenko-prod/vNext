#pragma once
#include <Arduino.h>

struct PinCapability {
    int pin;
    bool input;
    bool output;
    bool adc;
    bool pwm;
    bool interrupt;
};

struct BoardTemplate {
    String name;
    PinCapability pins[40];
    int count;
};

BoardTemplate* getTemplate(String chip);