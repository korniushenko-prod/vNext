#include "digital_output.h"

void DigitalOutputChannel::configure(int gpio, bool inverted, bool initialState)
{
    gpio_ = gpio;
    inverted_ = inverted;
    state_ = initialState;
}

void DigitalOutputChannel::init()
{
    if (gpio_ < 0) return;

    pinMode(gpio_, OUTPUT);
    write(state_);
}

void DigitalOutputChannel::write(bool value)
{
    if (gpio_ < 0) return;

    state_ = value;
    bool outputValue = inverted_ ? !value : value;
    digitalWrite(gpio_, outputValue ? HIGH : LOW);
}

bool DigitalOutputChannel::readState() const
{
    return state_;
}
