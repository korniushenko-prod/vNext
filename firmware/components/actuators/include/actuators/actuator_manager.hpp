#pragma once

#include <map>
#include <optional>
#include <string>
#include <variant>
#include <vector>

#include "actuators/actuator_types.hpp"
#include "hal/pwm_hal.hpp"
#include "hal/relay_hal.hpp"
#include "signals/signal_registry.hpp"

namespace controller::actuators {

class ActuatorManager {
 public:
  ActuatorManager(
      hal::RelayHal& relay_hal,
      hal::PwmHal& pwm_hal,
      signals::SignalRegistry* signal_registry = nullptr);

  ActuatorOperationResult register_relay_target(
      const RelayActuatorTarget& target,
      signals::SignalTimestampMs now_ms = 0U);
  ActuatorOperationResult register_pwm_target(
      const PwmActuatorTarget& target,
      signals::SignalTimestampMs now_ms = 0U);

  ActuatorOperationResult submit_request(const ActuatorRequest& request);
  ActuatorOperationResult remove_request(const std::string& target_id, const std::string& owner);
  ActuatorOperationResult clear_requests_for_owner(const std::string& owner);

  ActuatorOperationResult evaluate(signals::SignalTimestampMs now_ms);

  bool has_target(const std::string& target_id) const;
  std::vector<std::string> list_target_ids() const;
  std::vector<ActuatorSnapshot> list_snapshots() const;
  ActuatorResult<ActuatorSnapshot> get_snapshot(const std::string& target_id) const;

 private:
  struct TargetRecord {
    ActuatorTargetKind kind{ActuatorTargetKind::relay};
    std::variant<RelayActuatorTarget, PwmActuatorTarget> target{RelayActuatorTarget{}};
  };

  struct CandidateSelection {
    bool has_request{false};
    std::optional<ActuatorRequest> request;
  };

  std::string make_request_key(const std::string& target_id, const std::string& owner) const;

  ActuatorOperationResult validate_relay_target(const RelayActuatorTarget& target) const;
  ActuatorOperationResult validate_pwm_target(const PwmActuatorTarget& target) const;
  ActuatorOperationResult validate_request(const ActuatorRequest& request) const;

  CandidateSelection select_request_for_target(
      const TargetRecord& target,
      signals::SignalTimestampMs now_ms) const;
  ActuatorSnapshot build_safe_snapshot(const TargetRecord& target, const std::string& reason) const;
  ActuatorSnapshot build_snapshot_from_request(
      const TargetRecord& target,
      const ActuatorRequest& request) const;
  void apply_relay_interlocks(std::map<std::string, ActuatorSnapshot>& next_snapshots) const;
  ActuatorOperationResult apply_snapshot_to_hal(
      const TargetRecord& target,
      ActuatorSnapshot& snapshot) const;
  ActuatorOperationResult publish_snapshot(
      const TargetRecord& target,
      const ActuatorSnapshot& snapshot,
      signals::SignalTimestampMs now_ms);
  ActuatorOperationResult register_target_signals(const TargetRecord& target, signals::SignalTimestampMs now_ms);

  hal::RelayHal& relay_hal_;
  hal::PwmHal& pwm_hal_;
  signals::SignalRegistry* signal_registry_{nullptr};
  std::vector<std::string> target_order_;
  std::map<std::string, TargetRecord> targets_;
  std::map<std::string, ActuatorRequest> requests_;
  std::map<std::string, ActuatorSnapshot> snapshots_;
};

}  // namespace controller::actuators
