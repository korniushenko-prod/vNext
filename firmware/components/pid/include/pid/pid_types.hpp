#pragma once

#include <cstdint>

namespace controller::pid {

using PidTimestampMs = std::uint64_t;
using PidUpdateCounter = std::uint64_t;

enum class PidMode {
  manual,
  auto_mode,
  hold,
};

enum class PidDirection {
  direct,
  reverse,
};

enum class DerivativeMode {
  on_measurement,
};

const char* to_string(PidMode mode);
const char* to_string(PidDirection direction);
const char* to_string(DerivativeMode mode);

}  // namespace controller::pid
