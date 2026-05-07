#pragma once

#include <cstdint>
#include <functional>
#include <optional>
#include <string>
#include <variant>

#include "pid/pid_service_types.hpp"
#include "signals/signal_value.hpp"
#include "sim/sim_result.hpp"

namespace controller::sim {

struct SimSignalWriteEvent {
  std::string signal_path;
  controller::signals::SignalValue value;
  bool valid{true};
  bool fault{false};
};

struct SimSignalFaultEvent {
  std::string signal_path;
  std::optional<controller::signals::SignalValue> value;
  bool valid{true};
  bool fault{true};
};

struct SimPulseCountEvent {
  std::string pulse_input_id;
  std::uint64_t delta{0U};
};

struct SimPulseFrequencyEvent {
  std::string pulse_input_id;
  double frequency_hz{0.0};
};

struct SimAlarmConditionEvent {
  std::string alarm_id;
  bool condition_active{false};
  std::string source{"sim"};
  std::string reason{"scheduled_alarm"};
};

struct SimSequenceCommandEvent {
  enum class Kind {
    set_enabled,
    start_program,
    request_normal_stop,
    request_trip_stop,
    reset_active_program,
  };

  Kind kind{Kind::start_program};
  std::string program_id;
  bool enabled{true};
  std::string source{"sim"};
  std::string reason{"scheduled_sequence_command"};
};

struct SimFlowCommandEvent {
  enum class Kind {
    start_batch,
    stop_batch,
    reset_batch_total,
    reset_trip_total,
  };

  Kind kind{Kind::start_batch};
  std::string flow_id;
  std::optional<double> target_override_units;
  std::string source{"sim"};
  std::string reason{"scheduled_flow_command"};
};

struct SimPidCommandEvent {
  enum class Kind {
    set_enabled,
    set_mode,
    set_setpoint,
    set_manual_output,
    reset_integral,
  };

  Kind kind{Kind::set_enabled};
  std::string pid_id;
  bool enabled{true};
  controller::pid::PidServiceMode mode{controller::pid::PidServiceMode::disabled};
  double value{0.0};
};

struct SimCustomEvent {
  std::string description;
  std::function<SimStatus(SimHarness&, SimTimestampMs)> callback;
};

using SimEvent = std::variant<
    SimSignalWriteEvent,
    SimSignalFaultEvent,
    SimPulseCountEvent,
    SimPulseFrequencyEvent,
    SimAlarmConditionEvent,
    SimSequenceCommandEvent,
    SimFlowCommandEvent,
    SimPidCommandEvent,
    SimCustomEvent>;

struct SimScheduledEvent {
  std::string id;
  SimTimestampMs at_ms{0U};
  SimEvent event;
  bool processed{false};
};

}  // namespace controller::sim
