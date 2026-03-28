#pragma once

#include <Arduino.h>

class DigitalOutputChannel {
public:
    void configure(int gpio, bool inverted, bool initialState);
    void init();
    void write(bool value);
    bool readState() const;

private:
    int gpio_ = -1;
    bool inverted_ = false;
    bool state_ = false;
};
