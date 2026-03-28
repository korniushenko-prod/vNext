#pragma once

#include <stddef.h>

namespace plc::runtime_detail {

class StateEngine
{
public:
    void begin();
    void tick();

    size_t activeMachineCount() const;

private:
    size_t activeMachineCount_ = 0;
};

}  // namespace plc::runtime_detail
