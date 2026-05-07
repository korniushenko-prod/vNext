#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "display/display_descriptor.hpp"
#include "display/display_frame.hpp"
#include "display/display_history.hpp"
#include "display/display_result.hpp"
#include "display/display_snapshot.hpp"
#include "hal/display_hal.hpp"
#include "signals/signal_registry.hpp"

namespace controller::alarms {
class AlarmService;
}

namespace controller::api {
class FlowApiService;
class SequenceApiService;
struct FlowStatusDto;
struct ProgramStatusDto;
}

namespace controller::mqtt {
class MqttService;
}

namespace controller::pid {
class PidService;
}

namespace controller::display {

class DisplayService {
 public:
  explicit DisplayService(
      controller::hal::DisplayHal& display_hal,
      controller::signals::SignalRegistry& signal_registry,
      std::size_t history_capacity = 128U);

  void bind_sequence_api(controller::api::SequenceApiService& sequence_api);
  void bind_flow_api(controller::api::FlowApiService& flow_api);
  void bind_pid_service(controller::pid::PidService& pid_service);
  void bind_alarm_service(controller::alarms::AlarmService& alarm_service);
  void bind_mqtt_service(controller::mqtt::MqttService& mqtt_service);

  DisplayOperationResult register_display(const DisplayDescriptor& descriptor);
  bool has_display(const std::string& id) const;
  DisplayResult<DisplayDescriptor> get_descriptor(const std::string& id) const;
  std::vector<DisplayDescriptor> list_descriptors() const;

  DisplayOperationResult set_enabled(const std::string& id, bool enabled, DisplayTimestampMs now_ms);
  DisplayOperationResult set_auto_rotate(const std::string& id, bool enabled, DisplayTimestampMs now_ms);
  DisplayOperationResult select_screen(
      const std::string& id,
      DisplayScreen screen,
      DisplayTimestampMs now_ms,
      std::string source,
      std::string reason);
  DisplayOperationResult next_screen(
      const std::string& id,
      DisplayTimestampMs now_ms,
      std::string source,
      std::string reason);
  DisplayOperationResult previous_screen(
      const std::string& id,
      DisplayTimestampMs now_ms,
      std::string source,
      std::string reason);

  DisplayOperationResult tick(DisplayTimestampMs now_ms);

  DisplayResult<DisplaySnapshot> get_snapshot(const std::string& id) const;
  DisplayResult<DisplayFrame> get_current_frame(const std::string& id) const;
  std::vector<DisplayFrame> list_frames() const;

  DisplayResult<std::vector<DisplayHistoryEntry>> read_history(std::optional<std::string> id = std::nullopt) const;
  void clear_history();

 private:
  struct DisplayRecord {
    DisplayDescriptor descriptor;
    DisplaySnapshot snapshot;
    DisplayScreen selected_screen{DisplayScreen::main};
    std::optional<DisplayFrame> current_frame;
  };

  struct FrameBuildResult {
    DisplayStatus status{};
    DisplayFrame frame;
  };

  DisplayRecord* find_record(const std::string& id);
  const DisplayRecord* find_record(const std::string& id) const;

  DisplayStatus validate_descriptor(const DisplayDescriptor& descriptor) const;
  std::vector<DisplayScreen> enabled_screens_for(const DisplayDescriptor& descriptor) const;
  std::optional<DisplayScreen> choose_next_screen(
      const std::vector<DisplayScreen>& screens,
      DisplayScreen current,
      bool forward,
      std::size_t steps = 1U) const;
  DisplayStatus ensure_display_signals_registered(const DisplayDescriptor& descriptor);
  DisplayStatus publish_snapshot_signals(const DisplayRecord& record, DisplayTimestampMs now_ms);
  void record_history(
      const std::string& display_id,
      DisplayHistoryEventType event_type,
      DisplayTimestampMs now_ms,
      std::string source,
      std::string reason,
      std::optional<DisplayScreen> from_screen = std::nullopt,
      std::optional<DisplayScreen> to_screen = std::nullopt);

  FrameBuildResult build_frame(DisplayRecord& record, DisplayScreen screen, DisplayTimestampMs now_ms) const;
  FrameBuildResult build_main_frame(const DisplayRecord& record, DisplayTimestampMs now_ms) const;
  FrameBuildResult build_program_frame(const DisplayRecord& record, DisplayTimestampMs now_ms) const;
  FrameBuildResult build_flow_frame(const DisplayRecord& record, DisplayTimestampMs now_ms) const;
  FrameBuildResult build_pid_frame(const DisplayRecord& record, DisplayTimestampMs now_ms) const;
  FrameBuildResult build_alarms_frame(const DisplayRecord& record, DisplayTimestampMs now_ms) const;
  FrameBuildResult build_mqtt_frame(const DisplayRecord& record, DisplayTimestampMs now_ms) const;

  DisplayFrame normalize_frame(const DisplayDescriptor& descriptor, DisplayFrame frame) const;
  DisplayStatus render_frame(const DisplayDescriptor& descriptor, const DisplayFrame& frame);

  controller::hal::DisplayHal& display_hal_;
  controller::signals::SignalRegistry& signal_registry_;
  controller::api::SequenceApiService* sequence_api_{nullptr};
  controller::api::FlowApiService* flow_api_{nullptr};
  controller::pid::PidService* pid_service_{nullptr};
  controller::alarms::AlarmService* alarm_service_{nullptr};
  controller::mqtt::MqttService* mqtt_service_{nullptr};
  DisplayHistoryBuffer history_;
  bool hal_initialized_{false};
  std::vector<std::string> display_order_;
  std::unordered_map<std::string, DisplayRecord> displays_by_id_;
};

}  // namespace controller::display
