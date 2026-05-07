#include "actuators/actuator_manager.hpp"

#include <cstdint>

namespace controller::actuators {

namespace {

ActuatorOperationResult ok_result() {
  return {ActuatorStatus::success()};
}

ActuatorOperationResult signal_error_result(const std::string& message) {
  return {ActuatorStatus::error(ActuatorErrorCode::signal_error, message)};
}

ActuatorOperationResult hal_error_result(const std::string& message) {
  return {ActuatorStatus::error(ActuatorErrorCode::hal_error, message)};
}

bool has_text(const std::string& value) {
  return !value.empty();
}

bool is_expired(const ActuatorRequest& request, const signals::SignalTimestampMs now_ms) {
  return request.expires_at_ms.has_value() && now_ms >= *request.expires_at_ms;
}

bool is_better_request(const ActuatorRequest& lhs, const ActuatorRequest& rhs) {
  if (lhs.priority != rhs.priority) {
    return static_cast<int>(lhs.priority) > static_cast<int>(rhs.priority);
  }
  if (lhs.owner != rhs.owner) {
    return lhs.owner < rhs.owner;
  }
  return lhs.reason < rhs.reason;
}

bool relay_state_is_on(const ActuatorSnapshot& snapshot) {
  const auto* relay_state = std::get_if<RelayEffectiveState>(&snapshot.effective);
  return relay_state != nullptr && relay_state->state == hal::RelayState::on;
}

std::string signal_base_path(const std::string& target_id) {
  return "actuators." + target_id;
}

signals::SignalDescriptor make_signal_descriptor(
    const std::string& path,
    const std::string& name,
    const signals::SignalType type,
    const std::string& unit) {
  return signals::SignalDescriptor{
      path,
      name,
      "Actuator runtime signal",
      type,
      unit,
      "actuators",
      signals::SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

}  // namespace

const char* to_string(const ActuatorTargetKind kind) {
  switch (kind) {
    case ActuatorTargetKind::relay:
      return "relay";
    case ActuatorTargetKind::pwm:
      return "pwm";
  }

  return "unknown";
}

const char* to_string(const ActuatorRole role) {
  switch (role) {
    case ActuatorRole::generic:
      return "generic";
    case ActuatorRole::fan:
      return "fan";
    case ActuatorRole::fuel:
      return "fuel";
    case ActuatorRole::ignition:
      return "ignition";
    case ActuatorRole::pump:
      return "pump";
    case ActuatorRole::valve:
      return "valve";
    case ActuatorRole::alarm:
      return "alarm";
    case ActuatorRole::heater:
      return "heater";
    case ActuatorRole::damper:
      return "damper";
    case ActuatorRole::motor:
      return "motor";
  }

  return "unknown";
}

const char* to_string(const ActuatorPriority priority) {
  switch (priority) {
    case ActuatorPriority::default_priority:
      return "Default";
    case ActuatorPriority::schedule:
      return "Schedule";
    case ActuatorPriority::auto_rule:
      return "AutoRule";
    case ActuatorPriority::pid:
      return "PID";
    case ActuatorPriority::sequence:
      return "Sequence";
    case ActuatorPriority::manual:
      return "Manual";
    case ActuatorPriority::service:
      return "Service";
    case ActuatorPriority::inhibit:
      return "Inhibit";
    case ActuatorPriority::trip:
      return "Trip";
    case ActuatorPriority::safety:
      return "Safety";
  }

  return "Unknown";
}

const char* to_string(const ActuatorErrorCode code) {
  switch (code) {
    case ActuatorErrorCode::ok:
      return "OK";
    case ActuatorErrorCode::actuator_already_registered:
      return "ACTUATOR_ALREADY_REGISTERED";
    case ActuatorErrorCode::actuator_not_found:
      return "ACTUATOR_NOT_FOUND";
    case ActuatorErrorCode::actuator_signal_already_registered:
      return "ACTUATOR_SIGNAL_ALREADY_REGISTERED";
    case ActuatorErrorCode::invalid_target:
      return "INVALID_TARGET";
    case ActuatorErrorCode::invalid_request:
      return "INVALID_REQUEST";
    case ActuatorErrorCode::invalid_range:
      return "INVALID_RANGE";
    case ActuatorErrorCode::request_type_mismatch:
      return "REQUEST_TYPE_MISMATCH";
    case ActuatorErrorCode::hal_error:
      return "HAL_ERROR";
    case ActuatorErrorCode::signal_error:
      return "SIGNAL_ERROR";
  }

  return "UNKNOWN_ACTUATOR_ERROR";
}

bool is_fail_safe_off_role(const ActuatorRole role) {
  return role == ActuatorRole::fuel || role == ActuatorRole::ignition;
}

ActuatorManager::ActuatorManager(
    hal::RelayHal& relay_hal,
    hal::PwmHal& pwm_hal,
    signals::SignalRegistry* signal_registry)
    : relay_hal_(relay_hal), pwm_hal_(pwm_hal), signal_registry_(signal_registry) {}

ActuatorOperationResult ActuatorManager::register_relay_target(
    const RelayActuatorTarget& target,
    const signals::SignalTimestampMs now_ms) {
  const auto validation = validate_relay_target(target);
  if (!validation.ok()) {
    return validation;
  }
  if (targets_.count(target.id) != 0U) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::actuator_already_registered,
            "Actuator target '" + target.id + "' is already registered.")};
  }

  const TargetRecord record{ActuatorTargetKind::relay, target};
  if (signal_registry_ != nullptr) {
    const auto signal_result = register_target_signals(record, now_ms);
    if (!signal_result.ok()) {
      return signal_result;
    }
  }

  target_order_.push_back(target.id);
  targets_.emplace(target.id, record);
  snapshots_[target.id] = build_safe_snapshot(record, "no_active_request");
  return evaluate(now_ms);
}

ActuatorOperationResult ActuatorManager::register_pwm_target(
    const PwmActuatorTarget& target,
    const signals::SignalTimestampMs now_ms) {
  const auto validation = validate_pwm_target(target);
  if (!validation.ok()) {
    return validation;
  }
  if (targets_.count(target.id) != 0U) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::actuator_already_registered,
            "Actuator target '" + target.id + "' is already registered.")};
  }

  const auto configure_result =
      pwm_hal_.configure_limits(target.id, target.duty_min, target.duty_max, target.duty_safe);
  if (!configure_result.ok()) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::hal_error,
            "Failed to configure PWM target '" + target.id + "': " + configure_result.message)};
  }

  const TargetRecord record{ActuatorTargetKind::pwm, target};
  if (signal_registry_ != nullptr) {
    const auto signal_result = register_target_signals(record, now_ms);
    if (!signal_result.ok()) {
      return signal_result;
    }
  }

  target_order_.push_back(target.id);
  targets_.emplace(target.id, record);
  snapshots_[target.id] = build_safe_snapshot(record, "no_active_request");
  return evaluate(now_ms);
}

ActuatorOperationResult ActuatorManager::submit_request(const ActuatorRequest& request) {
  const auto validation = validate_request(request);
  if (!validation.ok()) {
    return validation;
  }

  requests_[make_request_key(request.target_id, request.owner)] = request;
  return ok_result();
}

ActuatorOperationResult ActuatorManager::remove_request(const std::string& target_id, const std::string& owner) {
  const auto it = requests_.find(make_request_key(target_id, owner));
  if (it == requests_.end()) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::actuator_not_found,
            "No request exists for target '" + target_id + "' and owner '" + owner + "'.")};
  }

  requests_.erase(it);
  return ok_result();
}

ActuatorOperationResult ActuatorManager::clear_requests_for_owner(const std::string& owner) {
  for (auto it = requests_.begin(); it != requests_.end();) {
    if (it->second.owner == owner) {
      it = requests_.erase(it);
    } else {
      ++it;
    }
  }

  return ok_result();
}

bool ActuatorManager::has_target(const std::string& target_id) const {
  return targets_.count(target_id) != 0U;
}

std::vector<std::string> ActuatorManager::list_target_ids() const {
  return target_order_;
}

std::vector<ActuatorSnapshot> ActuatorManager::list_snapshots() const {
  std::vector<ActuatorSnapshot> snapshots;
  snapshots.reserve(target_order_.size());
  for (const auto& target_id : target_order_) {
    const auto it = snapshots_.find(target_id);
    if (it != snapshots_.end()) {
      snapshots.push_back(it->second);
    }
  }
  return snapshots;
}

ActuatorResult<ActuatorSnapshot> ActuatorManager::get_snapshot(const std::string& target_id) const {
  const auto it = snapshots_.find(target_id);
  if (it == snapshots_.end()) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::actuator_not_found,
            "Actuator target '" + target_id + "' is not registered."),
        std::nullopt};
  }

  return {ActuatorStatus::success(), it->second};
}

std::string ActuatorManager::make_request_key(const std::string& target_id, const std::string& owner) const {
  return target_id + "\n" + owner;
}

ActuatorOperationResult ActuatorManager::validate_relay_target(const RelayActuatorTarget& target) const {
  if (!has_text(target.id) || !has_text(target.name)) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::invalid_target,
            "Relay targets require non-empty id and name.")};
  }
  if (target.interlock_group.has_value() && !has_text(*target.interlock_group)) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::invalid_target,
            "Relay target '" + target.id + "' uses a blank interlock group.")};
  }
  if (is_fail_safe_off_role(target.role) && target.safe_state != hal::RelayState::off) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::invalid_target,
            "Fuel and ignition relay targets must fail safe OFF.")};
  }

  return ok_result();
}

ActuatorOperationResult ActuatorManager::validate_pwm_target(const PwmActuatorTarget& target) const {
  if (!has_text(target.id) || !has_text(target.name)) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::invalid_target,
            "PWM targets require non-empty id and name.")};
  }
  if (target.duty_min < 0.0 || target.duty_max > 100.0 || target.duty_safe < 0.0 || target.duty_safe > 100.0) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::invalid_range,
            "PWM duty limits must stay within 0..100 percent.")};
  }
  if (target.duty_max < target.duty_min) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::invalid_range,
            "PWM duty_max must be greater than or equal to duty_min.")};
  }
  if (target.duty_safe < target.duty_min || target.duty_safe > target.duty_max) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::invalid_range,
            "PWM duty_safe must be within duty_min..duty_max.")};
  }

  return ok_result();
}

ActuatorOperationResult ActuatorManager::validate_request(const ActuatorRequest& request) const {
  const auto target_it = targets_.find(request.target_id);
  if (target_it == targets_.end()) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::actuator_not_found,
            "Actuator target '" + request.target_id + "' is not registered.")};
  }
  if (!has_text(request.owner) || !has_text(request.reason)) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::invalid_request,
            "Actuator requests require non-empty owner and reason.")};
  }
  if (request.expires_at_ms.has_value() && *request.expires_at_ms < request.issued_at_ms) {
    return {
        ActuatorStatus::error(
            ActuatorErrorCode::invalid_request,
            "Actuator request expiry must be greater than or equal to issued_at_ms.")};
  }

  const auto& target = target_it->second;
  if (target.kind == ActuatorTargetKind::relay) {
    if (!std::holds_alternative<RelayActuatorCommand>(request.command)) {
      return {
          ActuatorStatus::error(
              ActuatorErrorCode::request_type_mismatch,
              "Relay target '" + request.target_id + "' requires a relay command.")};
    }
  } else {
    if (!std::holds_alternative<PwmActuatorCommand>(request.command)) {
      return {
          ActuatorStatus::error(
              ActuatorErrorCode::request_type_mismatch,
              "PWM target '" + request.target_id + "' requires a PWM command.")};
    }

    const auto& pwm_target = std::get<PwmActuatorTarget>(target.target);
    const auto& pwm_command = std::get<PwmActuatorCommand>(request.command);
    if (pwm_command.duty_percent < pwm_target.duty_min || pwm_command.duty_percent > pwm_target.duty_max) {
      return {
          ActuatorStatus::error(
              ActuatorErrorCode::invalid_range,
              "PWM request for '" + request.target_id + "' is outside the configured duty range.")};
    }
  }

  return ok_result();
}

ActuatorManager::CandidateSelection ActuatorManager::select_request_for_target(
    const TargetRecord& target,
    const signals::SignalTimestampMs now_ms) const {
  CandidateSelection selection;
  const auto target_id = target.kind == ActuatorTargetKind::relay
                             ? std::get<RelayActuatorTarget>(target.target).id
                             : std::get<PwmActuatorTarget>(target.target).id;

  for (const auto& [key, request] : requests_) {
    (void)key;
    if (request.target_id != target_id || is_expired(request, now_ms)) {
      continue;
    }

    if (!selection.has_request || is_better_request(request, *selection.request)) {
      selection.has_request = true;
      selection.request = request;
    }
  }

  return selection;
}

ActuatorSnapshot ActuatorManager::build_safe_snapshot(const TargetRecord& target, const std::string& reason) const {
  ActuatorSnapshot snapshot;
  snapshot.kind = target.kind;
  snapshot.priority = ActuatorPriority::default_priority;
  snapshot.owner = "safe_fallback";
  snapshot.reason = reason;
  snapshot.safe_fallback = true;

  if (target.kind == ActuatorTargetKind::relay) {
    const auto& relay_target = std::get<RelayActuatorTarget>(target.target);
    snapshot.target_id = relay_target.id;
    snapshot.role = relay_target.role;
    snapshot.effective = RelayEffectiveState{relay_target.safe_state};
    return snapshot;
  }

  const auto& pwm_target = std::get<PwmActuatorTarget>(target.target);
  snapshot.target_id = pwm_target.id;
  snapshot.role = pwm_target.role;
  snapshot.effective = PwmEffectiveState{pwm_target.duty_safe, false};
  return snapshot;
}

ActuatorSnapshot ActuatorManager::build_snapshot_from_request(
    const TargetRecord& target,
    const ActuatorRequest& request) const {
  ActuatorSnapshot snapshot;
  snapshot.target_id = request.target_id;
  snapshot.kind = target.kind;
  snapshot.priority = request.priority;
  snapshot.owner = request.owner;
  snapshot.reason = request.reason;
  snapshot.safe_fallback = false;

  if (target.kind == ActuatorTargetKind::relay) {
    const auto& relay_target = std::get<RelayActuatorTarget>(target.target);
    snapshot.role = relay_target.role;
    snapshot.effective = RelayEffectiveState{std::get<RelayActuatorCommand>(request.command).state};
    return snapshot;
  }

  const auto& pwm_target = std::get<PwmActuatorTarget>(target.target);
  const auto& pwm_command = std::get<PwmActuatorCommand>(request.command);
  snapshot.role = pwm_target.role;
  snapshot.effective = PwmEffectiveState{pwm_command.duty_percent, pwm_command.enabled};
  return snapshot;
}

void ActuatorManager::apply_relay_interlocks(std::map<std::string, ActuatorSnapshot>& next_snapshots) const {
  std::map<std::string, std::vector<std::string>> groups;

  for (const auto& target_id : target_order_) {
    const auto target_it = targets_.find(target_id);
    if (target_it == targets_.end() || target_it->second.kind != ActuatorTargetKind::relay) {
      continue;
    }

    const auto& relay_target = std::get<RelayActuatorTarget>(target_it->second.target);
    if (!relay_target.interlock_group.has_value()) {
      continue;
    }

    const auto snapshot_it = next_snapshots.find(target_id);
    if (snapshot_it == next_snapshots.end() || !relay_state_is_on(snapshot_it->second)) {
      continue;
    }

    groups[*relay_target.interlock_group].push_back(target_id);
  }

  for (const auto& [group_id, target_ids] : groups) {
    (void)group_id;
    if (target_ids.size() <= 1U) {
      continue;
    }

    std::string winner_id = target_ids.front();
    for (const auto& candidate_id : target_ids) {
      const auto& candidate = next_snapshots.at(candidate_id);
      const auto& winner = next_snapshots.at(winner_id);
      if (static_cast<int>(candidate.priority) > static_cast<int>(winner.priority) ||
          (candidate.priority == winner.priority && candidate_id < winner_id)) {
        winner_id = candidate_id;
      }
    }

    for (const auto& target_id : target_ids) {
      if (target_id == winner_id) {
        continue;
      }

      auto& loser = next_snapshots.at(target_id);
      loser.interlock_blocked = true;
      loser.reason = "interlock_blocked_by:" + winner_id;
      loser.effective = RelayEffectiveState{hal::RelayState::off};
    }
  }
}

ActuatorOperationResult ActuatorManager::apply_snapshot_to_hal(
    const TargetRecord& target,
    ActuatorSnapshot& snapshot) const {
  const auto fallback_snapshot = build_safe_snapshot(target, "hal_fault");

  if (target.kind == ActuatorTargetKind::relay) {
    const auto relay_state = std::get<RelayEffectiveState>(snapshot.effective).state;
    const auto write_result = relay_hal_.set_state(snapshot.target_id, relay_state);
    if (write_result.ok()) {
      return ok_result();
    }

    const auto fallback_state = std::get<RelayEffectiveState>(fallback_snapshot.effective).state;
    const auto fallback_result = relay_hal_.set_state(snapshot.target_id, fallback_state);
    if (!fallback_result.ok()) {
      return hal_error_result(
          "Failed to apply relay fallback for '" + snapshot.target_id + "': " + fallback_result.message);
    }

    snapshot = fallback_snapshot;
    return ok_result();
  }

  const auto pwm_state = std::get<PwmEffectiveState>(snapshot.effective);
  const auto duty_result = pwm_hal_.set_duty_percent(snapshot.target_id, pwm_state.duty_percent);
  if (!duty_result.ok()) {
    const auto fallback_result = pwm_hal_.apply_safe_state(snapshot.target_id);
    if (!fallback_result.ok()) {
      return hal_error_result(
          "Failed to apply PWM fallback for '" + snapshot.target_id + "': " + fallback_result.message);
    }
    snapshot = fallback_snapshot;
    return ok_result();
  }

  const auto enable_result = pwm_hal_.set_enabled(snapshot.target_id, pwm_state.enabled);
  if (!enable_result.ok()) {
    const auto fallback_result = pwm_hal_.apply_safe_state(snapshot.target_id);
    if (!fallback_result.ok()) {
      return hal_error_result(
          "Failed to apply PWM fallback for '" + snapshot.target_id + "': " + fallback_result.message);
    }
    snapshot = fallback_snapshot;
    return ok_result();
  }

  return ok_result();
}

ActuatorOperationResult ActuatorManager::publish_snapshot(
    const TargetRecord& target,
    const ActuatorSnapshot& snapshot,
    const signals::SignalTimestampMs now_ms) {
  const auto base_path = signal_base_path(snapshot.target_id);

  if (target.kind == ActuatorTargetKind::relay) {
    const auto relay_state = std::get<RelayEffectiveState>(snapshot.effective).state;
    const auto relay_update = signal_registry_->update_signal(
        base_path + ".effective.on",
        signals::SignalValue{relay_state == hal::RelayState::on},
        now_ms);
    if (!relay_update.ok()) {
      return signal_error_result(relay_update.status.message);
    }
  } else {
    const auto pwm_state = std::get<PwmEffectiveState>(snapshot.effective);
    const auto enabled_update = signal_registry_->update_signal(
        base_path + ".effective.enabled",
        signals::SignalValue{pwm_state.enabled},
        now_ms);
    if (!enabled_update.ok()) {
      return signal_error_result(enabled_update.status.message);
    }

    const auto duty_update = signal_registry_->update_signal(
        base_path + ".effective.duty_percent",
        signals::SignalValue{pwm_state.duty_percent},
        now_ms);
    if (!duty_update.ok()) {
      return signal_error_result(duty_update.status.message);
    }
  }

  const auto owner_update =
      signal_registry_->update_signal(base_path + ".meta.owner", signals::SignalValue{snapshot.owner}, now_ms);
  if (!owner_update.ok()) {
    return signal_error_result(owner_update.status.message);
  }

  const auto reason_update =
      signal_registry_->update_signal(base_path + ".meta.reason", signals::SignalValue{snapshot.reason}, now_ms);
  if (!reason_update.ok()) {
    return signal_error_result(reason_update.status.message);
  }

  const auto priority_update = signal_registry_->update_signal(
      base_path + ".meta.priority",
      signals::SignalValue{std::string(to_string(snapshot.priority))},
      now_ms);
  if (!priority_update.ok()) {
    return signal_error_result(priority_update.status.message);
  }

  const auto fallback_update = signal_registry_->update_signal(
      base_path + ".meta.safe_fallback",
      signals::SignalValue{snapshot.safe_fallback},
      now_ms);
  if (!fallback_update.ok()) {
    return signal_error_result(fallback_update.status.message);
  }

  return ok_result();
}

ActuatorOperationResult ActuatorManager::register_target_signals(
    const TargetRecord& target,
    const signals::SignalTimestampMs now_ms) {
  const auto target_id = target.kind == ActuatorTargetKind::relay
                             ? std::get<RelayActuatorTarget>(target.target).id
                             : std::get<PwmActuatorTarget>(target.target).id;
  const auto base_path = signal_base_path(target_id);

  std::vector<signals::SignalDescriptor> descriptors;
  if (target.kind == ActuatorTargetKind::relay) {
    descriptors.push_back(make_signal_descriptor(
        base_path + ".effective.on",
        target_id + " effective on",
        signals::SignalType::boolean,
        ""));
  } else {
    descriptors.push_back(make_signal_descriptor(
        base_path + ".effective.enabled",
        target_id + " effective enabled",
        signals::SignalType::boolean,
        ""));
    descriptors.push_back(make_signal_descriptor(
        base_path + ".effective.duty_percent",
        target_id + " effective duty",
        signals::SignalType::float64,
        "percent"));
  }
  descriptors.push_back(make_signal_descriptor(base_path + ".meta.owner", target_id + " owner", signals::SignalType::string, ""));
  descriptors.push_back(make_signal_descriptor(base_path + ".meta.reason", target_id + " reason", signals::SignalType::string, ""));
  descriptors.push_back(make_signal_descriptor(base_path + ".meta.priority", target_id + " priority", signals::SignalType::string, ""));
  descriptors.push_back(make_signal_descriptor(base_path + ".meta.safe_fallback", target_id + " safe fallback", signals::SignalType::boolean, ""));

  for (const auto& descriptor : descriptors) {
    if (signal_registry_->has_signal(descriptor.path)) {
      return {
          ActuatorStatus::error(
              ActuatorErrorCode::actuator_signal_already_registered,
              "Signal '" + descriptor.path + "' is already registered.")};
    }
  }

  for (const auto& descriptor : descriptors) {
    const auto result = signal_registry_->register_signal(descriptor, std::nullopt, now_ms);
    if (!result.ok()) {
      return signal_error_result(result.status.message);
    }
  }

  return ok_result();
}

ActuatorOperationResult ActuatorManager::evaluate(const signals::SignalTimestampMs now_ms) {
  std::map<std::string, ActuatorSnapshot> next_snapshots;

  for (const auto& target_id : target_order_) {
    const auto target_it = targets_.find(target_id);
    const auto& target = target_it->second;
    const auto selection = select_request_for_target(target, now_ms);

    ActuatorSnapshot snapshot = selection.has_request
                                    ? build_snapshot_from_request(target, *selection.request)
                                    : build_safe_snapshot(target, "no_active_request");

    if ((target.kind == ActuatorTargetKind::relay && !std::get<RelayActuatorTarget>(target.target).enabled) ||
        (target.kind == ActuatorTargetKind::pwm && !std::get<PwmActuatorTarget>(target.target).enabled)) {
      snapshot = build_safe_snapshot(target, "target_disabled");
    }

    next_snapshots[target_id] = snapshot;
  }

  apply_relay_interlocks(next_snapshots);

  for (const auto& target_id : target_order_) {
    auto& snapshot = next_snapshots.at(target_id);
    const auto apply_result = apply_snapshot_to_hal(targets_.at(target_id), snapshot);
    if (!apply_result.ok()) {
      return apply_result;
    }

    if (signal_registry_ != nullptr) {
      const auto publish_result = publish_snapshot(targets_.at(target_id), snapshot, now_ms);
      if (!publish_result.ok()) {
        return publish_result;
      }
    }
  }

  snapshots_ = std::move(next_snapshots);
  return ok_result();
}

}  // namespace controller::actuators
