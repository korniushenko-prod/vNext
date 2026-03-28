#pragma once

#include <stdint.h>

namespace plc::storage {

struct ProjectSettingsData
{
    char projectId[32];
    char projectName[64];
    char projectDescription[128];
    char timezone[24];
    char apSsid[32];
    char apPassword[32];
    uint32_t tickMs;
    bool simulationEnabled;
    bool debugEnabled;
};

class ProjectSettingsStore
{
public:
    ProjectSettingsData defaults() const;
    bool load(ProjectSettingsData &data) const;
    bool save(const ProjectSettingsData &data) const;
};

}  // namespace plc::storage
