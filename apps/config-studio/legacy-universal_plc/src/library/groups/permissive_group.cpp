#include "permissive_group.h"

namespace plc::library {

PermissiveGroupStatus PermissiveGroup::evaluate(const bool *inputs, size_t count) const
{
    PermissiveGroupStatus status;
    status.permitOut = (count > 0);

    for (size_t i = 0; i < count; i++)
    {
        if (!inputs[i])
        {
            status.falseCount++;
            status.permitOut = false;
        }
    }

    status.blocked = !status.permitOut;
    return status;
}

}  // namespace plc::library
