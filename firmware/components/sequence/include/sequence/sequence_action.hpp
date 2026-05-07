#pragma once

#include <string>
#include <variant>

#include "hal/relay_hal.hpp"
#include "sequence/sequence_types.hpp"
#include "signals/signal_value.hpp"

namespace controller::sequence {

struct SequenceRelayRequestAction {
  std::string target_id;
  controller::hal::RelayState state{controller::hal::RelayState::off};
  std::string reason;
};

struct SequencePwmRequestAction {
  std::string target_id;
  double duty_percent{0.0};
  bool enabled{false};
  std::string reason;
};

struct SequenceTimerStartAction {
  std::string timer_id;
};

struct SequenceTimerStopAction {
  std::string timer_id;
};

struct SequenceAlarmSetConditionAction {
  std::string alarm_id;
  bool condition_active{false};
};

struct SequenceWriteVirtualSignalAction {
  std::string signal_path;
  controller::signals::SignalValue value{false};
};

struct SequenceLogNoteAction {
  std::string note;
};

using SequenceActionPayload = std::variant<
    SequenceRelayRequestAction,
    SequencePwmRequestAction,
    SequenceTimerStartAction,
    SequenceTimerStopAction,
    SequenceAlarmSetConditionAction,
    SequenceWriteVirtualSignalAction,
    SequenceLogNoteAction>;

struct SequenceAction {
  std::string id;
  std::string description;
  SequenceActionKind kind{SequenceActionKind::log_note};
  SequenceActionPayload payload{SequenceLogNoteAction{}};
};

SequenceActionKind action_kind_from_payload(const SequenceActionPayload& payload);

}  // namespace controller::sequence
