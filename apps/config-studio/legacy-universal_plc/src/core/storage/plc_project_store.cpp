#include "plc_project_store.h"

namespace plc::storage {

const char *const kProjectSchemaVersion = "1.0";
const char *const kControllerSchemaVersion = "1.0";

bool ProjectStore::validateSchemaVersion(const char *schemaVersion) const
{
    if (schemaVersion == nullptr)
    {
        return false;
    }

    return schemaVersion[0] == '1';
}

}  // namespace plc::storage
