#pragma once

#include <stddef.h>

namespace plc::hal {

class Hal
{
public:
    void begin();
    void tick();

    size_t registeredBindings() const;

private:
    size_t registeredBindings_ = 0;
};

}  // namespace plc::hal
