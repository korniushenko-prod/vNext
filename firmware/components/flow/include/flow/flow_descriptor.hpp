#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>

#include "flow/flow_types.hpp"

namespace controller::flow {

struct FlowDescriptor {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string pulse_input_id;
  std::string unit{"unit"};
  double k_factor_pulses_per_unit{1.0};
  FlowRateMode primary_rate_mode{FlowRateMode::time_window};
  FlowTimestampMs time_window_ms{1000U};
  std::size_t avg_last_n_pulses{4U};
  std::optional<FlowTimestampMs> no_flow_timeout_ms{30000U};
  std::optional<double> high_flow_threshold;
  std::optional<double> batch_target_default;
  std::optional<std::uint64_t> save_every_pulses;
  std::optional<FlowTimestampMs> save_every_ms;
  bool trend_enabled{true};
  FlowTimestampMs trend_bucket_ms{60000U};
  std::size_t trend_bucket_count{1440U};
  bool protected_lifetime_totals{true};
};

}  // namespace controller::flow
