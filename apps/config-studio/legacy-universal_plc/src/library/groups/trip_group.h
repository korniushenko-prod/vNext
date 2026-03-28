#pragma once

#include <stddef.h>

namespace plc::library {

struct TripGroupStatus
{
    bool tripOut = false;
    bool tripPresent = false;
    size_t activeTripCount = 0;
};

class TripGroup
{
public:
    TripGroupStatus evaluate(const bool *inputs, size_t count) const;
};

}  // namespace plc::library
