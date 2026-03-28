#include "trip_group.h"

namespace plc::library {

TripGroupStatus TripGroup::evaluate(const bool *inputs, size_t count) const
{
    TripGroupStatus status;

    for (size_t i = 0; i < count; i++)
    {
        if (inputs[i])
        {
            status.activeTripCount++;
            status.tripOut = true;
            status.tripPresent = true;
        }
    }

    return status;
}

}  // namespace plc::library
