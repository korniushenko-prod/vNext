#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include "signals/signal_registry.hpp"
#include "timers/timer_descriptor.hpp"
#include "timers/timer_snapshot.hpp"

namespace controller::timers {

class TimerService {
 public:
  explicit TimerService(signals::SignalRegistry* signal_registry = nullptr);

  TimerOperationResult register_timer(const TimerDescriptor& descriptor);

  bool has_timer(const std::string& id) const;
  TimerResult<TimerDescriptor> get_descriptor(const std::string& id) const;
  std::vector<TimerDescriptor> list_descriptors() const;

  TimerOperationResult set_input(const std::string& id, bool input, TimerTimestampMs now_ms);

  TimerOperationResult start_timer(const std::string& id, TimerTimestampMs now_ms);
  TimerOperationResult stop_timer(const std::string& id, TimerTimestampMs now_ms);

  TimerOperationResult arm_watchdog(const std::string& id, TimerTimestampMs now_ms);
  TimerOperationResult kick_watchdog(const std::string& id, TimerTimestampMs now_ms);
  TimerOperationResult disarm_watchdog(const std::string& id, TimerTimestampMs now_ms);

  TimerOperationResult reset_timer(const std::string& id);
  TimerOperationResult tick(TimerTimestampMs now_ms);

  TimerResult<TimerSnapshot> get_snapshot(const std::string& id, TimerTimestampMs now_ms);
  TimerResult<std::vector<TimerSnapshot>> list_snapshots(TimerTimestampMs now_ms);

 private:
  struct TimerEntry {
    TimerDescriptor descriptor;
    RuntimeTimerState state;
  };

  TimerStatus apply_state_update(
      const TimerDescriptor& descriptor,
      RuntimeTimerState& state,
      const RuntimeTimerState& candidate,
      bool has_now_ms,
      TimerTimestampMs now_ms);
  TimerStatus sync_entry(
      const TimerDescriptor& descriptor,
      RuntimeTimerState& state,
      TimerTimestampMs now_ms,
      bool allow_auto_start);
  TimerOperationResult register_timer_signals(const TimerDescriptor& descriptor, const RuntimeTimerState& state);
  TimerOperationResult publish_timer_signals(
      const TimerDescriptor& descriptor,
      const RuntimeTimerState& state,
      TimerTimestampMs now_ms);

  signals::SignalRegistry* signal_registry_{nullptr};
  std::vector<std::string> registration_order_;
  std::unordered_map<std::string, TimerEntry> timers_by_id_;
};

}  // namespace controller::timers
