#include "plc_compiler.h"

namespace plc::compiler {

CompileReport Compiler::compileBootstrapProject(size_t objectCount, size_t signalCount, size_t linkCount) const
{
    CompileReport report;
    report.objectCount = objectCount;
    report.signalCount = signalCount;
    report.linkCount = linkCount;
    report.ok = true;
    return report;
}

}  // namespace plc::compiler
