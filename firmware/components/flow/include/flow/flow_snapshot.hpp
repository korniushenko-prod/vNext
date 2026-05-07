#pragma once

#include <cstdint>
#include <optional>
#include <string>

#include "flow/flow_types.hpp"

namespace controller::flow {

struct FlowSnapshot {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string pulse_input_id;
  std::string unit;
  bool initialized{false};
  bool pulse_source_seen{false};
  std::uint64_t raw_pulse_lifetime{0U};
  double lifetime_total_units{0.0};
  double trip_total_units{0.0};
  double batch_total_units{0.0};
  bool batch_active{false};
  std::optional<double> batch_target_units;
  bool batch_done{false};
  double current_rate_units_per_min{0.0};
  double time_window_rate_units_per_min{0.0};
  double pulse_frequency_rate_units_per_min{0.0};
  double avg_n_rate_units_per_min{0.0};
  bool no_flow{false};
  bool high_flow{false};
  FlowTimestampMs last_pulse_age_ms{0U};
  FlowUpdateCounter update_counter{0U};
  std::optional<std::string> last_reason;
};

}  // namespace controller::flow
