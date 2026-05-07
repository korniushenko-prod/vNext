#pragma once

#include <string>
#include <string_view>

#include "signals/signal_types.hpp"

namespace controller::signals {

struct SignalDescriptor {
  std::string path;
  std::string name;
  std::string description;
  SignalType type{SignalType::boolean};
  std::string unit;
  std::string source_module;
  SignalAccessMode access_mode{SignalAccessMode::read_only};
  SignalTimestampMs max_age_ms{0U};
  bool enabled{true};
  bool visible{true};
};

bool is_valid_signal_path(std::string_view path);
SignalOperationResult validate_signal_descriptor(const SignalDescriptor& descriptor);

}  // namespace controller::signals
