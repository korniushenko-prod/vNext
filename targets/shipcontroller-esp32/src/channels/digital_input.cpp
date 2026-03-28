#include "digital_input.h"

void DigitalInputChannel::configure(int gpio, bool inverted, bool pullup)
{
    gpio_ = gpio;
    inverted_ = inverted;
    pullup_ = pullup;
}

void DigitalInputChannel::init() const
{
    if (gpio_ < 0) return;
    pinMode(gpio_, pullup_ ? INPUT_PULLUP : INPUT);
}

bool DigitalInputChannel::read() const
{
    if (gpio_ < 0) return false;

    bool value = digitalRead(gpio_) == HIGH;
    return inverted_ ? !value : value;
}
