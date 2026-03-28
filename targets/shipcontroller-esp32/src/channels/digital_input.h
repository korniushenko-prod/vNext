#pragma once

#include <Arduino.h>

class DigitalInputChannel {
public:
    void configure(int gpio, bool inverted, bool pullup);
    void init() const;
    bool read() const;

private:
    int gpio_ = -1;
    bool inverted_ = false;
    bool pullup_ = false;
};
