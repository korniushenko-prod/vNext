#pragma once

#include <string>
#include <variant>

#include "hal/relay_hal.hpp"
#include "logic/logic_types.hpp"
#include "signals/signal_value.hpp"

namespace controller::logic {

struct RuleRelayRequestAction {
  std::string target_id;
  controller::hal::RelayState state{controller::hal::RelayState::off};
  std::string reason;
};

struct RulePwmRequestAction {
  std::string target_id;
  double duty_percent{0.0};
  bool enabled{false};
  std::string reason;
};

struct RuleTimerStartAction {
  std::string timer_id;
};

struct RuleTimerStopAction {
  std::string timer_id;
};

struct RuleAlarmSetConditionAction {
  std::string alarm_id;
  bool condition_active{false};
};

struct RuleWriteVirtualSignalAction {
  std::string signal_path;
  controller::signals::SignalValue value{false};
};

struct RuleProgramStartAction {
  std::string program_id;
};

struct RuleProgramRequestNormalStopAction {};

struct RuleProgramRequestTripAction {};

struct RuleProgramResetActiveAction {};

struct RuleLogNoteAction {
  std::string note;
};

using RuleActionPayload = std::variant<
    RuleRelayRequestAction,
    RulePwmRequestAction,
    RuleTimerStartAction,
    RuleTimerStopAction,
    RuleAlarmSetConditionAction,
    RuleWriteVirtualSignalAction,
    RuleProgramStartAction,
    RuleProgramRequestNormalStopAction,
    RuleProgramRequestTripAction,
    RuleProgramResetActiveAction,
    RuleLogNoteAction>;

struct RuleAction {
  std::string id;
  std::string description;
  RuleActionKind kind{RuleActionKind::log_note};
  RuleActionPayload payload{RuleLogNoteAction{}};
};

RuleActionKind action_kind_from_payload(const RuleActionPayload& payload);

}  // namespace controller::logic
