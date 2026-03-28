#pragma once

#include <stddef.h>

namespace plc::library {

struct PermissiveGroupStatus
{
    bool permitOut = false;
    bool blocked = true;
    size_t falseCount = 0;
};

class PermissiveGroup
{
public:
    PermissiveGroupStatus evaluate(const bool *inputs, size_t count) const;
};

}  // namespace plc::library
