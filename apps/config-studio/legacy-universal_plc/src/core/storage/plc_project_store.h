#pragma once

namespace plc::storage {

extern const char *const kProjectSchemaVersion;
extern const char *const kControllerSchemaVersion;

class ProjectStore
{
public:
    bool validateSchemaVersion(const char *schemaVersion) const;
};

}  // namespace plc::storage
