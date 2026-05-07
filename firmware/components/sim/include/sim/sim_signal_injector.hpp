#pragma once

#include <cstddef>
#include <string>
#include <vector>

#include "signals/signal_value.hpp"
#include "sim/sim_events.hpp"

namespace controller::sim {

class SimSignalInjector {
 public:
  SimStatus add_event(const SimScheduledEvent& event);

  SimStatus schedule_signal_write(
      std::string id,
      SimTimestampMs at_ms,
      std::string signal_path,
      controller::signals::SignalValue value,
      bool valid = true,
      bool fault = false);
  SimStatus schedule_fault(
      std::string id,
      SimTimestampMs at_ms,
      std::string signal_path,
      bool fault,
      std::optional<controller::signals::SignalValue> value = std::nullopt,
      bool valid = true);
  SimStatus schedule_bool_interval(
      std::string id_prefix,
      SimTimestampMs start_ms,
      SimTimestampMs end_ms,
      std::string signal_path,
      bool active_value = true,
      bool inactive_value = false);
  SimStatus schedule_pulse_increment(
      std::string id,
      SimTimestampMs at_ms,
      std::string pulse_input_id,
      std::uint64_t delta);
  SimStatus schedule_pulse_frequency(
      std::string id,
      SimTimestampMs at_ms,
      std::string pulse_input_id,
      double frequency_hz);
  SimStatus schedule_alarm_condition(
      std::string id,
      SimTimestampMs at_ms,
      std::string alarm_id,
      bool condition_active,
      std::string source = "sim",
      std::string reason = "scheduled_alarm");

  SimStatus process_due_events(SimHarness& harness, SimTimestampMs now_ms, std::size_t& processed_count);

  const std::vector<SimScheduledEvent>& events() const {
    return events_;
  }

 private:
  static bool event_less(const SimScheduledEvent& lhs, const SimScheduledEvent& rhs);

  std::vector<SimScheduledEvent> events_;
};

}  // namespace controller::sim
