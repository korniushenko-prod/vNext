#pragma once

#include <stddef.h>

namespace plc::compiler {

struct CompileReport
{
    bool ok = true;
    size_t objectCount = 0;
    size_t signalCount = 0;
    size_t linkCount = 0;
};

class Compiler
{
public:
    CompileReport compileBootstrapProject(size_t objectCount, size_t signalCount, size_t linkCount) const;
};

}  // namespace plc::compiler
