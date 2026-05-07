#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "actuators/stepper_descriptor.hpp"
#include "actuators/stepper_history.hpp"
#include "actuators/stepper_result.hpp"
#include "actuators/stepper_snapshot.hpp"
#include "actuators/stepper_types.hpp"
#include "hal/stepper_hal.hpp"
#include "signals/signal_registry.hpp"

namespace controller::actuators {

class StepperService {
 public:
  StepperService(
      controller::hal::StepperHal& stepper_hal,
      controller::signals::SignalRegistry& signal_registry,
      std::size_t history_capacity = 128U);

  StepperValidationResult validate_descriptor(
      const StepperDescriptor& descriptor,
      std::optional<std::string> existing_stepper_id = std::nullopt) const;

  StepperOperationResult register_stepper(const StepperDescriptor& descriptor);
  bool has_stepper(const std::string& id) const;
  StepperResult<StepperDescriptor> get_descriptor(const std::string& id) const;
  std::vector<StepperDescriptor> list_descriptors() const;

  StepperOperationResult set_enabled(
      const std::string& id,
      bool enabled,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  StepperOperationResult command_home(
      const std::string& id,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  StepperOperationResult move_to_steps(
      const std::string& id,
      std::int64_t target_steps,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  StepperOperationResult move_to_percent(
      const std::string& id,
      double target_percent,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  StepperOperationResult start_jog(
      const std::string& id,
      controller::hal::StepperDirection direction,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  StepperOperationResult stop(
      const std::string& id,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  StepperOperationResult emergency_stop(
      const std::string& id,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  StepperOperationResult clear_fault(
      const std::string& id,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);

  StepperOperationResult tick(StepperTimestampMs now_ms);

  StepperResult<StepperSnapshot> get_snapshot(const std::string& id) const;
  std::vector<StepperSnapshot> list_snapshots() const;

  StepperResult<std::vector<StepperHistoryEntry>> read_history(std::optional<std::string> id = std::nullopt) const;
  void clear_history();

 private:
  struct OptionalSignalRead {
    bool configured{false};
    bool available{false};
    bool missing{false};
    bool unreadable{false};
    bool value_bool{false};
    StepperStatus status{};
  };

  struct StepperRecord {
    StepperDescriptor descriptor;
    bool service_enabled{true};
    bool homed{false};
    bool fault{false};
    std::string fault_reason;
    StepperRuntimeState runtime_state{StepperRuntimeState::disabled};
    std::int64_t position_steps{0};
    double position_exact_steps{0.0};
    std::optional<std::int64_t> target_steps;
    controller::hal::StepperDirection direction{controller::hal::StepperDirection::forward};
    double command_speed_steps_per_sec{0.0};
    std::optional<bool> home_signal_value;
    std::optional<bool> limit_min_value;
    std::optional<bool> limit_max_value;
    std::optional<bool> fault_signal_value;
    std::string active_source{"stepper_service"};
    std::string active_reason{"registered"};
    std::string last_reason{"registered"};
    StepperUpdateCounter update_counter{0U};
    std::optional<StepperTimestampMs> last_tick_ms;
  };

  StepperRecord* find_record(const std::string& id);
  const StepperRecord* find_record(const std::string& id) const;

  StepperSnapshot build_snapshot(const StepperRecord& record) const;
  bool effective_enabled(const StepperRecord& record) const;
  bool needs_homing(const StepperRecord& record) const;
  bool runtime_is_moving(const StepperRecord& record) const;

  StepperOperationResult ensure_stepper_signals_registered(const StepperDescriptor& descriptor);
  StepperOperationResult publish_stepper_signals(const StepperRecord& record, StepperTimestampMs now_ms);

  OptionalSignalRead read_optional_bool_signal(const std::optional<std::string>& path, StepperTimestampMs now_ms) const;

  StepperOperationResult apply_motion_command(
      StepperRecord& record,
      controller::hal::StepperDirection direction,
      double step_rate_hz,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      StepperRuntimeState motion_state);
  StepperOperationResult apply_stop(
      StepperRecord& record,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      bool emergency);
  StepperOperationResult enter_fault(
      StepperRecord& record,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      bool emergency,
      bool publish_before_return = true);
  void set_position(StepperRecord& record, double exact_steps);
  void increment_update_counter(StepperRecord& record);
  void record_history(
      const std::string& stepper_id,
      StepperHistoryEventType event_type,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      std::optional<StepperRuntimeState> from_state = std::nullopt,
      std::optional<StepperRuntimeState> to_state = std::nullopt,
      std::optional<double> value = std::nullopt);
  StepperOperationResult reject_command(
      StepperRecord& record,
      StepperErrorCode code,
      StepperTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      const std::string& message);

  controller::hal::StepperHal& stepper_hal_;
  controller::signals::SignalRegistry& signal_registry_;
  StepperHistoryBuffer history_;
  std::vector<std::string> stepper_order_;
  std::unordered_map<std::string, StepperRecord> steppers_by_id_;
};

}  // namespace controller::actuators
