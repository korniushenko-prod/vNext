#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "pid/pid_core.hpp"
#include "pid/pid_service_descriptor.hpp"
#include "pid/pid_service_history.hpp"
#include "pid/pid_service_result.hpp"
#include "pid/pid_service_snapshot.hpp"
#include "signals/signal_registry.hpp"

namespace controller::pid {

class PidService {
 public:
  PidService(
      controller::signals::SignalRegistry& signal_registry,
      controller::actuators::ActuatorManager& actuator_manager,
      std::size_t history_capacity = 128U);

  PidServiceValidationResult validate_descriptor(
      const PidServiceDescriptor& descriptor,
      std::optional<std::string> existing_pid_id = std::nullopt) const;

  PidServiceOperationResult register_pid(const PidServiceDescriptor& descriptor);
  PidServiceOperationResult remove_pid(const std::string& id, PidServiceTimestampMs now_ms);
  bool has_pid(const std::string& id) const;
  PidServiceResult<PidServiceDescriptor> get_descriptor(const std::string& id) const;
  std::vector<PidServiceDescriptor> list_descriptors() const;

  PidServiceOperationResult tick(PidServiceTimestampMs now_ms);

  PidServiceResult<PidServiceSnapshot> get_snapshot(const std::string& id) const;
  std::vector<PidServiceSnapshot> list_snapshots() const;

  PidServiceOperationResult set_enabled(const std::string& id, bool enabled, PidServiceTimestampMs now_ms);
  PidServiceOperationResult set_requested_mode(
      const std::string& id,
      PidServiceMode mode,
      PidServiceTimestampMs now_ms);
  PidServiceOperationResult set_constant_setpoint(
      const std::string& id,
      double value,
      PidServiceTimestampMs now_ms);
  PidServiceOperationResult set_manual_output(
      const std::string& id,
      double value,
      PidServiceTimestampMs now_ms);
  PidServiceOperationResult reset_integral(const std::string& id, PidServiceTimestampMs now_ms);

  PidServiceResult<std::vector<PidServiceHistoryEntry>> read_history(
      std::optional<std::string> id = std::nullopt) const;
  void clear_history();

 private:
  struct SignalResolution {
    bool ok{false};
    bool fault{false};
    PidServiceErrorCode code{PidServiceErrorCode::ok};
    std::optional<double> value;
    std::string reason;
  };

  struct PidRecord {
    PidServiceDescriptor descriptor;
    PidCore core;
    PidServiceMode requested_mode{PidServiceMode::disabled};
    PidServiceMode effective_mode{PidServiceMode::disabled};
    bool runtime_fault{false};
    std::string runtime_fault_reason;
    std::optional<double> last_pv;
    std::optional<double> last_sp;
    double commanded_output{0.0};
    bool command_active{false};
    bool updated{false};
  };

  PidRecord* find_record(const std::string& id);
  const PidRecord* find_record(const std::string& id) const;
  SignalResolution resolve_numeric_signal(
      const std::string& path,
      PidServiceTimestampMs now_ms,
      bool stale_as_fault,
      bool invalid_as_fault,
      const std::string& source_name) const;
  PidServiceMode compute_effective_mode(const PidRecord& record) const;
  PidServiceSnapshot build_snapshot(const PidRecord& record) const;
  PidServiceOperationResult ensure_global_signals_registered();
  PidServiceOperationResult ensure_pid_signals_registered(const PidServiceDescriptor& descriptor);
  PidServiceOperationResult publish_pid_signals(const PidRecord& record, PidServiceTimestampMs now_ms);
  PidServiceOperationResult publish_global_signals(PidServiceTimestampMs now_ms);
  PidServiceOperationResult publish_runtime_state(const PidRecord& record, PidServiceTimestampMs now_ms);
  PidServiceOperationResult clear_owner_output(
      PidRecord& record,
      PidServiceTimestampMs now_ms,
      const std::string& reason,
      bool record_history_entry,
      bool& actuator_dirty);
  PidServiceOperationResult submit_pwm_output(
      PidRecord& record,
      double output,
      PidServiceTimestampMs now_ms,
      const std::string& reason,
      bool& actuator_dirty);
  void record_history(
      const std::string& pid_id,
      PidServiceHistoryEventType event_type,
      PidServiceTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      std::optional<double> value = std::nullopt);

  controller::signals::SignalRegistry& signal_registry_;
  controller::actuators::ActuatorManager& actuator_manager_;
  PidServiceHistoryBuffer history_;
  bool global_signals_registered_{false};
  std::vector<std::string> pid_order_;
  std::unordered_map<std::string, PidRecord> pids_by_id_;
};

}  // namespace controller::pid
