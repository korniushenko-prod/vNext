#pragma once

#include <Arduino.h>

class AnalogInputChannel {
public:
    void configure(int gpio, bool inverted);
    void init() const;
    int readRaw() const;

private:
    int gpio_ = -1;
    bool inverted_ = false;
};
