#pragma once

#include <cstdint>
#include <string>

#include "config/config_types.hpp"
#include "storage/storage_types.hpp"

namespace controller::storage {

std::uint32_t crc32(const ByteBuffer& bytes);
std::string crc32_fingerprint(std::uint32_t value);

ByteBuffer build_config_snapshot(const config::DeviceConfig& config);
StorageResult<config::DeviceConfig> parse_config_snapshot(const ByteBuffer& bytes);

}  // namespace controller::storage
