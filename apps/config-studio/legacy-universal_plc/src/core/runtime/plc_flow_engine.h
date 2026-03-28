#pragma once

#include <stddef.h>

namespace plc::runtime_detail {

class FlowEngine
{
public:
    void begin();
    void tick();

    size_t activeFlowCount() const;

private:
    size_t activeFlowCount_ = 0;
};

}  // namespace plc::runtime_detail
