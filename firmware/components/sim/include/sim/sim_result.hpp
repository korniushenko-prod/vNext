#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <utility>

#include "sim/sim_types.hpp"

namespace controller::sim {

enum class SimErrorCode {
  ok,
  sim_invalid_configuration,
  sim_scenario_failed,
  sim_event_error,
  sim_assertion_failed,
  sim_plant_error,
  sim_service_error,
  sim_not_found,
  sim_duplicate_id,
  sim_invalid_argument,
};

struct SimStatus {
  SimErrorCode code{SimErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == SimErrorCode::ok;
  }

  static SimStatus success() {
    return {};
  }

  static SimStatus error(SimErrorCode code_value, std::string detail) {
    return SimStatus{code_value, std::move(detail)};
  }
};

template <typename T>
struct SimResult {
  SimStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct SimScenarioRunReport {
  std::string scenario_name;
  SimStatus status{};
  SimTimestampMs started_at_ms{0U};
  SimTimestampMs ended_at_ms{0U};
  SimDurationMs total_requested_ms{0U};
  SimDurationMs step_ms{0U};
  std::size_t steps_executed{0U};
  std::size_t events_processed{0U};
  std::size_t assertions_processed{0U};
  bool completed{false};
  bool stopped_early{false};
  std::string reason;
};

const char* to_string(SimErrorCode code);

}  // namespace controller::sim
