#include "plc_hal.h"

namespace plc::hal {

void Hal::begin()
{
    registeredBindings_ = 0;
}

void Hal::tick()
{
}

size_t Hal::registeredBindings() const
{
    return registeredBindings_;
}

}  // namespace plc::hal
