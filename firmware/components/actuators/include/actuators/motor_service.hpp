#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "actuators/motor_descriptor.hpp"
#include "actuators/motor_history.hpp"
#include "actuators/motor_result.hpp"
#include "actuators/motor_snapshot.hpp"
#include "actuators/motor_types.hpp"
#include "signals/signal_registry.hpp"

namespace controller::actuators {

class MotorService {
 public:
  MotorService(
      controller::signals::SignalRegistry& signal_registry,
      ActuatorManager& actuator_manager,
      std::size_t history_capacity = 128U);

  MotorValidationResult validate_descriptor(
      const MotorDescriptor& descriptor,
      std::optional<std::string> existing_motor_id = std::nullopt) const;

  MotorOperationResult register_motor(const MotorDescriptor& descriptor);
  bool has_motor(const std::string& id) const;
  MotorResult<MotorDescriptor> get_descriptor(const std::string& id) const;
  std::vector<MotorDescriptor> list_descriptors() const;

  MotorOperationResult command_motor(const std::string& id, const MotorCommand& command);
  MotorOperationResult stop_motor(
      const std::string& id,
      MotorTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  MotorOperationResult clear_command(const std::string& id, MotorTimestampMs now_ms);

  MotorOperationResult tick(MotorTimestampMs now_ms);

  MotorResult<MotorSnapshot> get_snapshot(const std::string& id) const;
  std::vector<MotorSnapshot> list_snapshots() const;

  MotorResult<std::vector<MotorHistoryEntry>> read_history(std::optional<std::string> id = std::nullopt) const;
  void clear_history();

 private:
  struct OptionalSignalRead {
    bool available{false};
    bool missing{false};
    bool value_bool{false};
    std::optional<double> value_number;
    MotorStatus status{};
  };

  struct MotorRecord {
    MotorDescriptor descriptor;
    bool requested_run{false};
    double requested_speed_percent{0.0};
    MotorDirection requested_direction{MotorDirection::forward};
    ActuatorPriority requested_priority{ActuatorPriority::manual};
    std::string requested_source;
    std::string requested_reason;
    bool effective_run{false};
    double effective_speed_percent{0.0};
    MotorDirection effective_direction{MotorDirection::forward};
    MotorRuntimeState runtime_state{MotorRuntimeState::stopped};
    bool runtime_fault{false};
    std::string fault_reason;
    std::optional<double> tach_value;
    std::uint64_t runtime_ms{0U};
    std::uint64_t start_count{0U};
    std::string last_reason{"registered"};
    MotorUpdateCounter update_counter{0U};
    std::optional<MotorTimestampMs> last_tick_ms;
    MotorTimestampMs phase_started_ms{0U};
    std::optional<PwmActuatorCommand> applied_pwm_command;
    std::optional<hal::RelayState> applied_enable_state;
    std::optional<hal::RelayState> applied_direction_state;
  };

  MotorRecord* find_record(const std::string& id);
  const MotorRecord* find_record(const std::string& id) const;

  MotorSnapshot build_snapshot(const MotorRecord& record) const;

  MotorOperationResult ensure_motor_signals_registered(const MotorDescriptor& descriptor);
  MotorOperationResult publish_motor_signals(const MotorRecord& record, MotorTimestampMs now_ms);

  OptionalSignalRead read_optional_bool_signal(const std::optional<std::string>& path, MotorTimestampMs now_ms) const;
  OptionalSignalRead read_optional_numeric_signal(const std::optional<std::string>& path, MotorTimestampMs now_ms) const;

  MotorOperationResult apply_direction_output(MotorRecord& record, MotorTimestampMs now_ms, bool& actuator_dirty);
  MotorOperationResult apply_run_outputs(MotorRecord& record, MotorTimestampMs now_ms, bool& actuator_dirty);
  MotorOperationResult clear_motion_outputs(MotorRecord& record, MotorTimestampMs now_ms, bool& actuator_dirty);
  MotorOperationResult clear_all_outputs(MotorRecord& record, MotorTimestampMs now_ms, bool& actuator_dirty);

  void update_runtime_ms(MotorRecord& record, MotorTimestampMs now_ms);
  void increment_update_counter(MotorRecord& record);
  void record_history(
      const std::string& motor_id,
      MotorHistoryEventType event_type,
      MotorTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      std::optional<double> value = std::nullopt);

  controller::signals::SignalRegistry& signal_registry_;
  ActuatorManager& actuator_manager_;
  MotorHistoryBuffer history_;
  std::vector<std::string> motor_order_;
  std::unordered_map<std::string, MotorRecord> motors_by_id_;
};

}  // namespace controller::actuators
