#pragma once

#include <stddef.h>

namespace plc::runtime_detail {

class AlarmEngine
{
public:
    void begin();
    void tick();

    size_t activeCount() const;

private:
    size_t activeCount_ = 0;
};

}  // namespace plc::runtime_detail
