#include "analog_input.h"

void AnalogInputChannel::configure(int gpio, bool inverted)
{
    gpio_ = gpio;
    inverted_ = inverted;
}

void AnalogInputChannel::init() const
{
    if (gpio_ < 0) return;
    pinMode(gpio_, INPUT);
}

int AnalogInputChannel::readRaw() const
{
    if (gpio_ < 0) return 0;

    int value = analogRead(gpio_);
    return inverted_ ? (4095 - value) : value;
}
