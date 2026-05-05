#pragma once

#include <cstdint>
#include <string>

namespace controller::storage {

enum class TotalizerValueType { raw_pulse_u64, volume_double };

struct ProtectedTotalizerRecord {
  std::string key;
  TotalizerValueType value_type{TotalizerValueType::raw_pulse_u64};
  bool protected_value{true};
  std::uint64_t pulse_value{0U};
  double volume_value{0.0};
  std::uint64_t revision{0U};
};

ProtectedTotalizerRecord make_raw_pulse_totalizer(std::string key, std::uint64_t value, bool protected_value = true);
ProtectedTotalizerRecord make_volume_totalizer(std::string key, double value, bool protected_value = true);

}  // namespace controller::storage
