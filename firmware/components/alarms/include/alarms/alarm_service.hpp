#pragma once

#include <cstddef>
#include <string>
#include <unordered_map>
#include <vector>

#include "alarms/alarm_history.hpp"
#include "alarms/alarm_snapshot.hpp"
#include "signals/signal_registry.hpp"

namespace controller::alarms {

class AlarmService {
 public:
  explicit AlarmService(signals::SignalRegistry* signal_registry = nullptr, std::size_t history_capacity = 128U);

  AlarmOperationResult register_alarm(const AlarmDescriptor& descriptor);
  AlarmOperationResult remove_alarm(const std::string& id, AlarmTimestampMs now_ms = 0U);

  bool has_alarm(const std::string& id) const;
  AlarmResult<AlarmDescriptor> get_descriptor(const std::string& id) const;
  std::vector<AlarmDescriptor> list_descriptors() const;

  AlarmOperationResult set_condition(
      const std::string& id,
      bool condition_active,
      AlarmTimestampMs now_ms,
      std::string source = {},
      std::string reason = {});
  AlarmOperationResult raise_alarm(
      const std::string& id,
      AlarmTimestampMs now_ms,
      std::string source = {},
      std::string reason = {});
  AlarmOperationResult clear_condition(
      const std::string& id,
      AlarmTimestampMs now_ms,
      std::string source = {},
      std::string reason = {});
  AlarmOperationResult reset_alarm(
      const std::string& id,
      AlarmTimestampMs now_ms,
      std::string source = {},
      std::string reason = {});

  AlarmResult<AlarmSnapshot> get_snapshot(const std::string& id) const;
  std::vector<AlarmSnapshot> list_snapshots() const;
  AggregateAlarmStatus get_aggregate_status() const;

  std::vector<AlarmHistoryEntry> read_history() const;
  void clear_history();

 private:
  struct AlarmEntry {
    AlarmDescriptor descriptor;
    RuntimeAlarmState state;
  };

  AlarmOperationResult ensure_aggregate_signals_registered();
  AlarmOperationResult register_alarm_signals(const AlarmDescriptor& descriptor, const RuntimeAlarmState& state);
  AlarmOperationResult publish_alarm_signals(
      const AlarmDescriptor& descriptor,
      const RuntimeAlarmState& state,
      AlarmTimestampMs now_ms);
  AlarmOperationResult publish_aggregate_signals(AlarmTimestampMs now_ms);
  AggregateAlarmStatus compute_aggregate_status() const;
  void update_aggregate_status(AlarmTimestampMs now_ms, AlarmStatus* first_error);
  void record_history(
      const AlarmDescriptor& descriptor,
      AlarmEventType event_type,
      AlarmTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);

  signals::SignalRegistry* signal_registry_{nullptr};
  AlarmHistoryBuffer history_;
  bool aggregate_signals_registered_{false};
  AggregateAlarmStatus aggregate_status_{};
  std::vector<std::string> registration_order_;
  std::unordered_map<std::string, AlarmEntry> alarms_by_id_;
};

}  // namespace controller::alarms
