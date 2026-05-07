#include "flow/flow_service.hpp"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <deque>
#include <limits>
#include <optional>
#include <string>
#include <utility>

#include "signals/signal_descriptor.hpp"
#include "signals/signal_value.hpp"
#include "storage/storage_totalizers.hpp"

namespace controller::flow {

namespace {

using controller::hal::HalErrorCode;
using controller::hal::HalStatus;
using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalType;
using controller::signals::SignalValue;
using controller::storage::ProtectedTotalizerRecord;
using controller::storage::TotalizerValueType;

bool has_text(const std::string& value) {
  return !value.empty();
}

bool is_positive_finite(const double value) {
  return std::isfinite(value) && value > 0.0;
}

bool is_non_negative_finite(const double value) {
  return std::isfinite(value) && value >= 0.0;
}

std::int64_t to_signal_int64(const std::uint64_t value) {
  constexpr auto max_value = static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
  if (value > max_value) {
    return std::numeric_limits<std::int64_t>::max();
  }
  return static_cast<std::int64_t>(value);
}

std::string to_signal_string(const std::uint64_t value) {
  return std::to_string(value);
}

void append_issue(
    FlowValidationResult& result,
    const FlowErrorCode code,
    const std::string& field,
    const std::string& message) {
  result.issues.push_back(FlowValidationIssue{code, field, message});
  if (result.status.ok()) {
    result.status = FlowStatus::error(code, message);
  }
}

std::string raw_totalizer_key(const std::string& id) {
  return "flow." + id + ".raw_pulse_lifetime";
}

std::string volume_totalizer_key(const std::string& id) {
  return "flow." + id + ".lifetime_total";
}

SignalDescriptor make_signal_descriptor(
    const std::string& path,
    const std::string& name,
    const SignalType type,
    const std::string& unit = "") {
  return SignalDescriptor{
      path,
      name,
      "Flow runtime signal",
      type,
      unit,
      "flow_service",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

FlowStatus wrap_signal_error(const controller::signals::SignalStatus& status, const std::string& context) {
  return FlowStatus::error(FlowErrorCode::flow_signal_publish_failed, context + ": " + status.message);
}

FlowStatus wrap_storage_read_error(const std::string& context) {
  return FlowStatus::error(FlowErrorCode::flow_storage_read_failed, context);
}

FlowStatus wrap_storage_write_error(const std::string& context) {
  return FlowStatus::error(FlowErrorCode::flow_storage_write_failed, context);
}

FlowStatus wrap_pulse_error(const HalStatus& status, const std::string& context) {
  return FlowStatus::error(FlowErrorCode::flow_pulse_source_error, context + ": " + status.message);
}

FlowTimestampMs safe_age(const FlowTimestampMs now_ms, const FlowTimestampMs since_ms) {
  return now_ms >= since_ms ? (now_ms - since_ms) : 0U;
}

FlowTimestampMs align_bucket_start(const FlowTimestampMs now_ms, const FlowTimestampMs bucket_ms) {
  if (bucket_ms == 0U) {
    return now_ms;
  }
  return now_ms - (now_ms % bucket_ms);
}

FlowStatus register_signal_if_missing(
    controller::signals::SignalRegistry& registry,
    const SignalDescriptor& descriptor,
    const SignalValue& initial_value,
    const FlowTimestampMs now_ms) {
  if (registry.has_signal(descriptor.path)) {
    return FlowStatus::success();
  }

  const auto result = registry.register_signal(descriptor, initial_value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_error(result.status, "Failed to register signal '" + descriptor.path + "'");
  }
  return FlowStatus::success();
}

FlowStatus update_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const SignalValue& value,
    const FlowTimestampMs now_ms) {
  const auto result = registry.update_signal(path, value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_error(result.status, "Failed to update signal '" + path + "'");
  }
  return FlowStatus::success();
}

double compute_rate_from_pulses(
    const std::uint64_t pulses,
    const double k_factor_pulses_per_unit,
    const FlowTimestampMs elapsed_ms) {
  if (pulses == 0U || !is_positive_finite(k_factor_pulses_per_unit) || elapsed_ms == 0U) {
    return 0.0;
  }

  return (static_cast<double>(pulses) / k_factor_pulses_per_unit) * (60000.0 / static_cast<double>(elapsed_ms));
}

}  // namespace

const char* to_string(const FlowRateMode mode) {
  switch (mode) {
    case FlowRateMode::time_window:
      return "time_window";
    case FlowRateMode::pulse_frequency:
      return "pulse_frequency";
    case FlowRateMode::avg_last_n_pulses:
      return "avg_last_n_pulses";
  }

  return "unknown";
}

const char* to_string(const FlowHistoryEventType event_type) {
  switch (event_type) {
    case FlowHistoryEventType::initialized:
      return "initialized";
    case FlowHistoryEventType::pulse_source_reset_detected:
      return "pulse_source_reset_detected";
    case FlowHistoryEventType::batch_started:
      return "batch_started";
    case FlowHistoryEventType::batch_stopped:
      return "batch_stopped";
    case FlowHistoryEventType::batch_completed:
      return "batch_completed";
    case FlowHistoryEventType::trip_total_reset:
      return "trip_total_reset";
    case FlowHistoryEventType::batch_total_reset:
      return "batch_total_reset";
    case FlowHistoryEventType::protected_total_save:
      return "protected_total_save";
    case FlowHistoryEventType::protected_total_reset_denied:
      return "protected_total_reset_denied";
  }

  return "unknown";
}

const char* to_string(const FlowErrorCode code) {
  switch (code) {
    case FlowErrorCode::ok:
      return "OK";
    case FlowErrorCode::flow_already_registered:
      return "FLOW_ALREADY_REGISTERED";
    case FlowErrorCode::flow_not_found:
      return "FLOW_NOT_FOUND";
    case FlowErrorCode::flow_invalid_descriptor:
      return "FLOW_INVALID_DESCRIPTOR";
    case FlowErrorCode::flow_invalid_k_factor:
      return "FLOW_INVALID_K_FACTOR";
    case FlowErrorCode::flow_invalid_mode_parameters:
      return "FLOW_INVALID_MODE_PARAMETERS";
    case FlowErrorCode::flow_pulse_source_error:
      return "FLOW_PULSE_SOURCE_ERROR";
    case FlowErrorCode::flow_storage_read_failed:
      return "FLOW_STORAGE_READ_FAILED";
    case FlowErrorCode::flow_storage_write_failed:
      return "FLOW_STORAGE_WRITE_FAILED";
    case FlowErrorCode::flow_batch_already_active:
      return "FLOW_BATCH_ALREADY_ACTIVE";
    case FlowErrorCode::flow_batch_not_active:
      return "FLOW_BATCH_NOT_ACTIVE";
    case FlowErrorCode::flow_signal_publish_failed:
      return "FLOW_SIGNAL_PUBLISH_FAILED";
    case FlowErrorCode::flow_invalid_argument:
      return "FLOW_INVALID_ARGUMENT";
    case FlowErrorCode::flow_trend_unavailable:
      return "FLOW_TREND_UNAVAILABLE";
    case FlowErrorCode::flow_not_initialized:
      return "FLOW_NOT_INITIALIZED";
  }

  return "UNKNOWN_FLOW_ERROR";
}

FlowService::FlowService(
    controller::hal::PulseInputHal& pulse_input_hal,
    controller::storage::StorageService& storage_service,
    controller::signals::SignalRegistry& signal_registry,
    const std::size_t history_capacity)
    : pulse_input_hal_(pulse_input_hal),
      storage_service_(storage_service),
      signal_registry_(signal_registry),
      history_(history_capacity) {}

FlowValidationResult FlowService::validate_descriptor(
    const FlowDescriptor& descriptor,
    const std::optional<std::string> existing_flow_id) const {
  FlowValidationResult result;

  if (!has_text(descriptor.id)) {
    append_issue(result, FlowErrorCode::flow_invalid_descriptor, "flow.id", "Flow id must not be empty.");
  } else if (!controller::signals::is_valid_signal_path(descriptor.id)) {
    append_issue(
        result,
        FlowErrorCode::flow_invalid_descriptor,
        "flow.id",
        "Flow id '" + descriptor.id + "' must use dot-separated alphanumeric or underscore segments.");
  } else if (has_flowmeter(descriptor.id) && (!existing_flow_id.has_value() || *existing_flow_id != descriptor.id)) {
    append_issue(
        result,
        FlowErrorCode::flow_already_registered,
        "flow.id",
        "Flow '" + descriptor.id + "' is already registered.");
  }

  if (!has_text(descriptor.name)) {
    append_issue(result, FlowErrorCode::flow_invalid_descriptor, "flow.name", "Flow name must not be empty.");
  }

  if (!has_text(descriptor.pulse_input_id)) {
    append_issue(
        result,
        FlowErrorCode::flow_invalid_descriptor,
        "flow.pulse_input_id",
        "Pulse input id must not be empty.");
  } else {
    const auto validity_result = pulse_input_hal_.get_validity(descriptor.pulse_input_id);
    if (!validity_result.ok()) {
      append_issue(
          result,
          FlowErrorCode::flow_invalid_descriptor,
          "flow.pulse_input_id",
          "Pulse input '" + descriptor.pulse_input_id + "' is not available: " + validity_result.status.message);
    }
  }

  if (!is_positive_finite(descriptor.k_factor_pulses_per_unit)) {
    append_issue(
        result,
        FlowErrorCode::flow_invalid_k_factor,
        "flow.k_factor_pulses_per_unit",
        "k_factor_pulses_per_unit must be a finite value greater than zero.");
  }

  if (descriptor.primary_rate_mode == FlowRateMode::time_window && descriptor.time_window_ms == 0U) {
    append_issue(
        result,
        FlowErrorCode::flow_invalid_mode_parameters,
        "flow.time_window_ms",
        "time_window_ms must be greater than zero when primary_rate_mode is time_window.");
  }

  if (descriptor.primary_rate_mode == FlowRateMode::avg_last_n_pulses && descriptor.avg_last_n_pulses == 0U) {
    append_issue(
        result,
        FlowErrorCode::flow_invalid_mode_parameters,
        "flow.avg_last_n_pulses",
        "avg_last_n_pulses must be greater than zero when primary_rate_mode is avg_last_n_pulses.");
  }

  if (descriptor.no_flow_timeout_ms.has_value() && *descriptor.no_flow_timeout_ms == 0U) {
    append_issue(
        result,
        FlowErrorCode::flow_invalid_descriptor,
        "flow.no_flow_timeout_ms",
        "no_flow_timeout_ms must be greater than zero when configured.");
  }

  if (descriptor.high_flow_threshold.has_value() && !is_positive_finite(*descriptor.high_flow_threshold)) {
    append_issue(
        result,
        FlowErrorCode::flow_invalid_descriptor,
        "flow.high_flow_threshold",
        "high_flow_threshold must be finite and greater than zero when configured.");
  }

  if (descriptor.batch_target_default.has_value() && !is_positive_finite(*descriptor.batch_target_default)) {
    append_issue(
        result,
        FlowErrorCode::flow_invalid_argument,
        "flow.batch_target_default",
        "batch_target_default must be finite and greater than zero when configured.");
  }

  if (descriptor.save_every_pulses.has_value() && *descriptor.save_every_pulses == 0U) {
    append_issue(
        result,
        FlowErrorCode::flow_invalid_descriptor,
        "flow.save_every_pulses",
        "save_every_pulses must be greater than zero when configured.");
  }

  if (descriptor.save_every_ms.has_value() && *descriptor.save_every_ms == 0U) {
    append_issue(
        result,
        FlowErrorCode::flow_invalid_descriptor,
        "flow.save_every_ms",
        "save_every_ms must be greater than zero when configured.");
  }

  if (descriptor.trend_enabled) {
    if (descriptor.trend_bucket_ms == 0U) {
      append_issue(
          result,
          FlowErrorCode::flow_invalid_descriptor,
          "flow.trend_bucket_ms",
          "trend_bucket_ms must be greater than zero when trend is enabled.");
    }
    if (descriptor.trend_bucket_count == 0U) {
      append_issue(
          result,
          FlowErrorCode::flow_invalid_descriptor,
          "flow.trend_bucket_count",
          "trend_bucket_count must be greater than zero when trend is enabled.");
    }
  }

  if (result.status.ok()) {
    result.status = FlowStatus::success();
  }
  return result;
}

FlowOperationResult FlowService::register_flowmeter(const FlowDescriptor& descriptor) {
  if (flows_by_id_.count(descriptor.id) != 0U) {
    return FlowOperationResult{
        FlowStatus::error(
            FlowErrorCode::flow_already_registered,
            "Flow '" + descriptor.id + "' is already registered.")};
  }

  const auto validation = validate_descriptor(descriptor);
  if (!validation.ok()) {
    return FlowOperationResult{FlowStatus::error(
        validation.status.code == FlowErrorCode::ok ? FlowErrorCode::flow_invalid_descriptor : validation.status.code,
        validation.status.message)};
  }

  auto status = ensure_signals_registered(descriptor);
  if (!status.ok()) {
    return FlowOperationResult{status};
  }

  FlowRecord record;
  record.descriptor = descriptor;
  record.runtime.last_reason = std::string{"registered"};

  flow_order_.push_back(descriptor.id);
  flows_by_id_.emplace(descriptor.id, std::move(record));
  return FlowOperationResult{FlowStatus::success()};
}

bool FlowService::has_flowmeter(const std::string& id) const {
  return flows_by_id_.count(id) != 0U;
}

FlowResult<FlowDescriptor> FlowService::get_descriptor(const std::string& id) const {
  FlowResult<FlowDescriptor> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = FlowStatus::error(FlowErrorCode::flow_not_found, "Flow '" + id + "' is not registered.");
    return result;
  }

  result.status = FlowStatus::success();
  result.value = record->descriptor;
  return result;
}

std::vector<FlowDescriptor> FlowService::list_descriptors() const {
  std::vector<FlowDescriptor> descriptors;
  descriptors.reserve(flow_order_.size());
  for (const auto& id : flow_order_) {
    descriptors.push_back(flows_by_id_.at(id).descriptor);
  }
  return descriptors;
}

FlowService::FlowRecord* FlowService::find_record(const std::string& id) {
  const auto it = flows_by_id_.find(id);
  return it == flows_by_id_.end() ? nullptr : &it->second;
}

const FlowService::FlowRecord* FlowService::find_record(const std::string& id) const {
  const auto it = flows_by_id_.find(id);
  return it == flows_by_id_.end() ? nullptr : &it->second;
}

FlowStatus FlowService::ensure_signals_registered(const FlowDescriptor& descriptor) {
  const auto base = "flow." + descriptor.id;

  auto status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".raw_pulse_lifetime", descriptor.name + " raw pulse lifetime", SignalType::string),
      SignalValue{std::string{"0"}},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".lifetime_total", descriptor.name + " lifetime total", SignalType::float64, descriptor.unit),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".trip_total", descriptor.name + " trip total", SignalType::float64, descriptor.unit),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".batch_total", descriptor.name + " batch total", SignalType::float64, descriptor.unit),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".batch_active", descriptor.name + " batch active", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".batch_done", descriptor.name + " batch done", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".batch_target", descriptor.name + " batch target", SignalType::float64, descriptor.unit),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".rate", descriptor.name + " primary rate", SignalType::float64, descriptor.unit + "/min"),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".rate_time_window", descriptor.name + " time-window rate", SignalType::float64, descriptor.unit + "/min"),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".rate_pulse_frequency", descriptor.name + " pulse-frequency rate", SignalType::float64, descriptor.unit + "/min"),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".rate_avg_n", descriptor.name + " avg-n rate", SignalType::float64, descriptor.unit + "/min"),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".no_flow", descriptor.name + " no flow", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".high_flow", descriptor.name + " high flow", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }

  return register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".last_pulse_age_ms", descriptor.name + " last pulse age", SignalType::int64, "ms"),
      SignalValue{std::int64_t{0}},
      0U);
}

FlowStatus FlowService::publish_signals(FlowRecord& record, const FlowTimestampMs now_ms) {
  auto status = ensure_signals_registered(record.descriptor);
  if (!status.ok()) {
    return status;
  }

  const auto base = "flow." + record.descriptor.id;
  status = update_signal(signal_registry_, base + ".raw_pulse_lifetime", SignalValue{to_signal_string(record.runtime.raw_pulse_lifetime)}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".lifetime_total", SignalValue{record.runtime.lifetime_total_units}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".trip_total", SignalValue{record.runtime.trip_total_units}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".batch_total", SignalValue{record.runtime.batch_total_units}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".batch_active", SignalValue{record.runtime.batch_active}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".batch_done", SignalValue{record.runtime.batch_done}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(
      signal_registry_,
      base + ".batch_target",
      SignalValue{record.runtime.batch_target_units.value_or(0.0)},
      now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".rate", SignalValue{record.runtime.current_rate_units_per_min}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".rate_time_window", SignalValue{record.runtime.time_window_rate_units_per_min}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".rate_pulse_frequency", SignalValue{record.runtime.pulse_frequency_rate_units_per_min}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".rate_avg_n", SignalValue{record.runtime.avg_n_rate_units_per_min}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".no_flow", SignalValue{record.runtime.no_flow}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".high_flow", SignalValue{record.runtime.high_flow}, now_ms);
  if (!status.ok()) {
    return status;
  }
  return update_signal(
      signal_registry_,
      base + ".last_pulse_age_ms",
      SignalValue{to_signal_int64(record.runtime.last_pulse_age_ms)},
      now_ms);
}

FlowStatus FlowService::load_totals_from_storage(FlowRecord& record, const FlowTimestampMs now_ms) {
  std::uint64_t loaded_raw = 0U;
  std::uint64_t raw_revision = 0U;
  double loaded_volume = 0.0;
  std::uint64_t volume_revision = 0U;

  const auto raw_result = storage_service_.read_protected_totalizer(raw_totalizer_key(record.descriptor.id));
  if (raw_result.value.has_value()) {
    if (raw_result.value->value_type != TotalizerValueType::raw_pulse_u64) {
      return wrap_storage_read_error(
          "Stored raw pulse totalizer for flow '" + record.descriptor.id + "' has the wrong value type.");
    }
    loaded_raw = raw_result.value->pulse_value;
    raw_revision = raw_result.value->revision;
  } else if (std::any_of(
                 raw_result.issues.begin(),
                 raw_result.issues.end(),
                 [](const controller::storage::StorageIssue& issue) { return issue.severity == controller::storage::StorageSeverity::error; })) {
    return wrap_storage_read_error(
        "Failed to read protected raw pulse totalizer for flow '" + record.descriptor.id + "'.");
  }

  const auto volume_result = storage_service_.read_protected_totalizer(volume_totalizer_key(record.descriptor.id));
  if (volume_result.value.has_value()) {
    if (volume_result.value->value_type != TotalizerValueType::volume_double) {
      return wrap_storage_read_error(
          "Stored volume totalizer for flow '" + record.descriptor.id + "' has the wrong value type.");
    }
    loaded_volume = volume_result.value->volume_value;
    volume_revision = volume_result.value->revision;
  } else if (std::any_of(
                 volume_result.issues.begin(),
                 volume_result.issues.end(),
                 [](const controller::storage::StorageIssue& issue) { return issue.severity == controller::storage::StorageSeverity::error; })) {
    return wrap_storage_read_error(
        "Failed to read protected volume totalizer for flow '" + record.descriptor.id + "'.");
  }

  record.runtime = RuntimeFlowState{};
  record.runtime.initialized = true;
  record.runtime.initialized_at_ms = now_ms;
  record.runtime.last_update_ms = now_ms;
  record.runtime.last_pulse_seen_ms = now_ms;
  record.runtime.raw_pulse_lifetime = loaded_raw;
  record.runtime.lifetime_total_units = loaded_volume;
  record.runtime.last_reason = std::string{"initialized_from_storage"};
  record.time_window_samples.clear();
  record.recent_pulse_timestamps.clear();
  record.trend_buckets.clear();
  record.last_saved_raw_pulse_lifetime = loaded_raw;
  record.last_saved_lifetime_total_units = loaded_volume;
  record.last_saved_at_ms = now_ms;
  record.raw_totalizer_revision = raw_revision;
  record.volume_totalizer_revision = volume_revision;

  if (record.descriptor.trend_enabled) {
    FlowRecord::TrendBucketState bucket_state;
    bucket_state.bucket.bucket_start_ms = align_bucket_start(now_ms, record.descriptor.trend_bucket_ms);
    record.trend_buckets.push_back(bucket_state);
  }

  record_history(record.descriptor.id, FlowHistoryEventType::initialized, now_ms, "flow_service", "initialized_from_storage");
  return publish_signals(record, now_ms);
}

FlowStatus FlowService::maybe_persist_totals(
    FlowRecord& record,
    const FlowTimestampMs now_ms,
    const std::uint64_t delta_pulses) {
  const bool totals_changed =
      record.runtime.raw_pulse_lifetime != record.last_saved_raw_pulse_lifetime ||
      record.runtime.lifetime_total_units != record.last_saved_lifetime_total_units;
  if (!totals_changed) {
    return FlowStatus::success();
  }

  bool should_save = false;
  if (!record.descriptor.save_every_pulses.has_value() && !record.descriptor.save_every_ms.has_value()) {
    should_save = delta_pulses > 0U;
  }
  if (record.descriptor.save_every_pulses.has_value()) {
    should_save = should_save ||
                  (record.runtime.raw_pulse_lifetime - record.last_saved_raw_pulse_lifetime) >= *record.descriptor.save_every_pulses;
  }
  if (record.descriptor.save_every_ms.has_value()) {
    should_save = should_save || safe_age(now_ms, record.last_saved_at_ms) >= *record.descriptor.save_every_ms;
  }

  if (!should_save) {
    return FlowStatus::success();
  }

  ProtectedTotalizerRecord raw_record = controller::storage::make_raw_pulse_totalizer(
      raw_totalizer_key(record.descriptor.id),
      record.runtime.raw_pulse_lifetime,
      record.descriptor.protected_lifetime_totals);
  raw_record.revision = record.raw_totalizer_revision + 1U;

  ProtectedTotalizerRecord volume_record = controller::storage::make_volume_totalizer(
      volume_totalizer_key(record.descriptor.id),
      record.runtime.lifetime_total_units,
      record.descriptor.protected_lifetime_totals);
  volume_record.revision = record.volume_totalizer_revision + 1U;

  const auto raw_write = storage_service_.write_protected_totalizer(raw_record);
  if (!raw_write.success) {
    return wrap_storage_write_error(
        "Failed to persist protected raw pulse totalizer for flow '" + record.descriptor.id + "'.");
  }

  const auto volume_write = storage_service_.write_protected_totalizer(volume_record);
  if (!volume_write.success) {
    return wrap_storage_write_error(
        "Failed to persist protected volume totalizer for flow '" + record.descriptor.id + "'.");
  }

  record.last_saved_raw_pulse_lifetime = record.runtime.raw_pulse_lifetime;
  record.last_saved_lifetime_total_units = record.runtime.lifetime_total_units;
  record.last_saved_at_ms = now_ms;
  record.raw_totalizer_revision = raw_record.revision;
  record.volume_totalizer_revision = volume_record.revision;

  record_history(
      record.descriptor.id,
      FlowHistoryEventType::protected_total_save,
      now_ms,
      "flow_service",
      "protected_total_save",
      record.runtime.lifetime_total_units);
  return FlowStatus::success();
}

FlowOperationResult FlowService::initialize_from_storage(const FlowTimestampMs now_ms) {
  for (const auto& id : flow_order_) {
    auto& record = flows_by_id_.at(id);
    const auto status = load_totals_from_storage(record, now_ms);
    if (!status.ok()) {
      return FlowOperationResult{status};
    }
  }

  return FlowOperationResult{FlowStatus::success()};
}

FlowStatus FlowService::update_flow_record(FlowRecord& record, const FlowTimestampMs now_ms) {
  const auto count_result = pulse_input_hal_.get_count(record.descriptor.pulse_input_id);
  if (!count_result.ok()) {
    return wrap_pulse_error(
        count_result.status,
        "Failed to read pulse count for flow '" + record.descriptor.id + "'");
  }

  record.runtime.pulse_source_seen = true;
  ++record.runtime.update_counter;
  record.runtime.last_update_ms = now_ms;

  const auto current_count = *count_result.value;
  std::uint64_t delta_pulses = 0U;
  if (current_count >= record.runtime.last_hal_count) {
    delta_pulses = current_count - record.runtime.last_hal_count;
  } else {
    delta_pulses = current_count;
    record.runtime.last_reason = std::string{"pulse_source_reset_detected"};
    record_history(
        record.descriptor.id,
        FlowHistoryEventType::pulse_source_reset_detected,
        now_ms,
        "pulse_input_hal",
        "counter_restart_detected",
        static_cast<double>(current_count));
  }
  record.runtime.last_hal_count = current_count;

  const double volume_delta_units = static_cast<double>(delta_pulses) / record.descriptor.k_factor_pulses_per_unit;
  if (delta_pulses > 0U) {
    record.runtime.raw_pulse_lifetime += delta_pulses;
    record.runtime.lifetime_total_units += volume_delta_units;
    record.runtime.trip_total_units += volume_delta_units;
    record.runtime.last_pulse_seen_ms = now_ms;

    if (record.runtime.batch_active) {
      record.runtime.batch_total_units += volume_delta_units;
    }

    record.time_window_samples.push_back(FlowRecord::WindowSample{now_ms, delta_pulses});

    const auto pulse_history_limit = std::max<std::size_t>(record.descriptor.avg_last_n_pulses, 2U);
    if (delta_pulses >= pulse_history_limit) {
      record.recent_pulse_timestamps.assign(pulse_history_limit, now_ms);
    } else {
      for (std::uint64_t index = 0U; index < delta_pulses; ++index) {
        record.recent_pulse_timestamps.push_back(now_ms);
      }
      while (record.recent_pulse_timestamps.size() > pulse_history_limit) {
        record.recent_pulse_timestamps.pop_front();
      }
    }
  }

  const auto cutoff_ms =
      record.descriptor.time_window_ms > now_ms ? 0U : (now_ms - record.descriptor.time_window_ms);
  while (!record.time_window_samples.empty() && record.time_window_samples.front().timestamp_ms < cutoff_ms) {
    record.time_window_samples.pop_front();
  }

  std::uint64_t pulses_in_window = 0U;
  for (const auto& sample : record.time_window_samples) {
    pulses_in_window += sample.pulses;
  }
  record.runtime.time_window_rate_units_per_min =
      compute_rate_from_pulses(pulses_in_window, record.descriptor.k_factor_pulses_per_unit, record.descriptor.time_window_ms);

  record.runtime.pulse_frequency_rate_units_per_min = 0.0;
  const auto frequency_result = pulse_input_hal_.get_frequency_hz(record.descriptor.pulse_input_id);
  if (frequency_result.ok() && is_non_negative_finite(*frequency_result.value)) {
    record.runtime.pulse_frequency_rate_units_per_min =
        (*frequency_result.value / record.descriptor.k_factor_pulses_per_unit) * 60.0;
  } else if (!frequency_result.ok() && frequency_result.status.code != HalErrorCode::unsupported) {
    record.runtime.last_reason = std::string{"pulse_frequency_unavailable"};
  }

  record.runtime.avg_n_rate_units_per_min = 0.0;
  const auto avg_n = record.descriptor.avg_last_n_pulses;
  if (avg_n > 1U && record.recent_pulse_timestamps.size() >= avg_n) {
    const auto& oldest = record.recent_pulse_timestamps[record.recent_pulse_timestamps.size() - avg_n];
    const auto& newest = record.recent_pulse_timestamps.back();
    const auto elapsed_ms = newest >= oldest ? (newest - oldest) : 0U;
    record.runtime.avg_n_rate_units_per_min = compute_rate_from_pulses(
        static_cast<std::uint64_t>(avg_n - 1U),
        record.descriptor.k_factor_pulses_per_unit,
        elapsed_ms);
  }

  switch (record.descriptor.primary_rate_mode) {
    case FlowRateMode::time_window:
      record.runtime.current_rate_units_per_min = record.runtime.time_window_rate_units_per_min;
      break;
    case FlowRateMode::pulse_frequency:
      record.runtime.current_rate_units_per_min = record.runtime.pulse_frequency_rate_units_per_min;
      break;
    case FlowRateMode::avg_last_n_pulses:
      record.runtime.current_rate_units_per_min = record.runtime.avg_n_rate_units_per_min;
      break;
  }

  record.runtime.last_pulse_age_ms = safe_age(now_ms, record.runtime.last_pulse_seen_ms);
  record.runtime.no_flow = record.descriptor.no_flow_timeout_ms.has_value()
                               ? record.runtime.last_pulse_age_ms >= *record.descriptor.no_flow_timeout_ms
                               : false;
  record.runtime.high_flow = record.descriptor.high_flow_threshold.has_value()
                                 ? record.runtime.current_rate_units_per_min > *record.descriptor.high_flow_threshold
                                 : false;

  if (record.descriptor.trend_enabled) {
    if (record.trend_buckets.empty()) {
      FlowRecord::TrendBucketState bucket_state;
      bucket_state.bucket.bucket_start_ms = align_bucket_start(now_ms, record.descriptor.trend_bucket_ms);
      record.trend_buckets.push_back(bucket_state);
    }

    const auto aligned_now = align_bucket_start(now_ms, record.descriptor.trend_bucket_ms);
    while (record.trend_buckets.back().bucket.bucket_start_ms < aligned_now) {
      FlowRecord::TrendBucketState next_bucket;
      next_bucket.bucket.bucket_start_ms =
          record.trend_buckets.back().bucket.bucket_start_ms + record.descriptor.trend_bucket_ms;
      record.trend_buckets.push_back(next_bucket);
      while (record.trend_buckets.size() > record.descriptor.trend_bucket_count) {
        record.trend_buckets.pop_front();
      }
    }

    auto& bucket = record.trend_buckets.back();
    bucket.bucket.volume_delta_units += volume_delta_units;
    bucket.rate_sum_units_per_min += record.runtime.current_rate_units_per_min;
    ++bucket.rate_sample_count;
    bucket.bucket.average_rate_units_per_min =
        bucket.rate_sum_units_per_min / static_cast<double>(bucket.rate_sample_count);
  }

  if (record.runtime.batch_active && record.runtime.batch_target_units.has_value() &&
      record.runtime.batch_total_units >= *record.runtime.batch_target_units) {
    record.runtime.batch_active = false;
    record.runtime.batch_done = true;
    record.runtime.last_reason = std::string{"batch_completed"};
    record_history(
        record.descriptor.id,
        FlowHistoryEventType::batch_completed,
        now_ms,
        "flow_service",
        "batch_target_reached",
        record.runtime.batch_total_units);
  }

  auto status = maybe_persist_totals(record, now_ms, delta_pulses);
  if (!status.ok()) {
    return status;
  }

  status = publish_signals(record, now_ms);
  if (!status.ok()) {
    return status;
  }

  if (!record.runtime.last_reason.has_value()) {
    record.runtime.last_reason = std::string{"tick"};
  }
  return FlowStatus::success();
}

FlowOperationResult FlowService::tick(const FlowTimestampMs now_ms) {
  for (const auto& id : flow_order_) {
    auto& record = flows_by_id_.at(id);
    if (!record.runtime.initialized) {
      return FlowOperationResult{
          FlowStatus::error(
              FlowErrorCode::flow_not_initialized,
              "Flow '" + id + "' must be initialized_from_storage before tick().")};
    }

    const auto status = update_flow_record(record, now_ms);
    if (!status.ok()) {
      return FlowOperationResult{status};
    }
  }

  return FlowOperationResult{FlowStatus::success()};
}

FlowResult<FlowSnapshot> FlowService::get_snapshot(const std::string& id) const {
  FlowResult<FlowSnapshot> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = FlowStatus::error(FlowErrorCode::flow_not_found, "Flow '" + id + "' is not registered.");
    return result;
  }

  result.status = FlowStatus::success();
  result.value = build_snapshot(*record);
  return result;
}

std::vector<FlowSnapshot> FlowService::list_snapshots() const {
  std::vector<FlowSnapshot> snapshots;
  snapshots.reserve(flow_order_.size());
  for (const auto& id : flow_order_) {
    snapshots.push_back(build_snapshot(flows_by_id_.at(id)));
  }
  return snapshots;
}

FlowResult<std::vector<FlowHistoryEntry>> FlowService::read_history(const std::optional<std::string> id) const {
  FlowResult<std::vector<FlowHistoryEntry>> result;
  if (id.has_value() && !has_flowmeter(*id)) {
    result.status = FlowStatus::error(FlowErrorCode::flow_not_found, "Flow '" + *id + "' is not registered.");
    return result;
  }

  const auto all_entries = history_.read();
  if (!id.has_value()) {
    result.status = FlowStatus::success();
    result.value = all_entries;
    return result;
  }

  std::vector<FlowHistoryEntry> filtered;
  for (const auto& entry : all_entries) {
    if (entry.flow_id == *id) {
      filtered.push_back(entry);
    }
  }

  result.status = FlowStatus::success();
  result.value = std::move(filtered);
  return result;
}

FlowResult<std::vector<FlowTrendBucket>> FlowService::read_trend(const std::string& id) const {
  FlowResult<std::vector<FlowTrendBucket>> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = FlowStatus::error(FlowErrorCode::flow_not_found, "Flow '" + id + "' is not registered.");
    return result;
  }
  if (!record->descriptor.trend_enabled) {
    result.status = FlowStatus::error(
        FlowErrorCode::flow_trend_unavailable,
        "Trend buffer is disabled for flow '" + id + "'.");
    return result;
  }

  std::vector<FlowTrendBucket> trend;
  trend.reserve(record->trend_buckets.size());
  for (const auto& bucket_state : record->trend_buckets) {
    auto bucket = bucket_state.bucket;
    if (bucket_state.rate_sample_count > 0U) {
      bucket.average_rate_units_per_min =
          bucket_state.rate_sum_units_per_min / static_cast<double>(bucket_state.rate_sample_count);
    }
    trend.push_back(bucket);
  }

  result.status = FlowStatus::success();
  result.value = std::move(trend);
  return result;
}

FlowOperationResult FlowService::start_batch(
    const std::string& id,
    const FlowTimestampMs now_ms,
    const std::optional<double> target_override_units,
    std::string source,
    std::string reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return FlowOperationResult{FlowStatus::error(FlowErrorCode::flow_not_found, "Flow '" + id + "' is not registered.")};
  }
  if (!record->runtime.initialized) {
    return FlowOperationResult{
        FlowStatus::error(FlowErrorCode::flow_not_initialized, "Flow '" + id + "' must be initialized before start_batch().")};
  }
  if (record->runtime.batch_active) {
    return FlowOperationResult{
        FlowStatus::error(FlowErrorCode::flow_batch_already_active, "Batch is already active for flow '" + id + "'.")};
  }
  if (target_override_units.has_value() && !is_positive_finite(*target_override_units)) {
    return FlowOperationResult{
        FlowStatus::error(FlowErrorCode::flow_invalid_argument, "Batch target override must be finite and greater than zero.")};
  }

  record->runtime.batch_total_units = 0.0;
  record->runtime.batch_active = true;
  record->runtime.batch_done = false;
  record->runtime.batch_target_units =
      target_override_units.has_value() ? target_override_units : record->descriptor.batch_target_default;
  record->runtime.last_reason = has_text(reason) ? std::optional<std::string>{reason} : std::optional<std::string>{"batch_started"};

  record_history(id, FlowHistoryEventType::batch_started, now_ms, source, reason, record->runtime.batch_target_units);
  const auto status = publish_signals(*record, now_ms);
  return FlowOperationResult{status};
}

FlowOperationResult FlowService::stop_batch(
    const std::string& id,
    const FlowTimestampMs now_ms,
    std::string source,
    std::string reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return FlowOperationResult{FlowStatus::error(FlowErrorCode::flow_not_found, "Flow '" + id + "' is not registered.")};
  }
  if (!record->runtime.initialized) {
    return FlowOperationResult{
        FlowStatus::error(FlowErrorCode::flow_not_initialized, "Flow '" + id + "' must be initialized before stop_batch().")};
  }
  if (!record->runtime.batch_active) {
    return FlowOperationResult{
        FlowStatus::error(FlowErrorCode::flow_batch_not_active, "Batch is not active for flow '" + id + "'.")};
  }

  record->runtime.batch_active = false;
  record->runtime.last_reason = has_text(reason) ? std::optional<std::string>{reason} : std::optional<std::string>{"batch_stopped"};

  record_history(id, FlowHistoryEventType::batch_stopped, now_ms, source, reason, record->runtime.batch_total_units);
  const auto status = publish_signals(*record, now_ms);
  return FlowOperationResult{status};
}

FlowOperationResult FlowService::reset_trip_total(
    const std::string& id,
    const FlowTimestampMs now_ms,
    std::string source,
    std::string reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return FlowOperationResult{FlowStatus::error(FlowErrorCode::flow_not_found, "Flow '" + id + "' is not registered.")};
  }
  if (!record->runtime.initialized) {
    return FlowOperationResult{
        FlowStatus::error(FlowErrorCode::flow_not_initialized, "Flow '" + id + "' must be initialized before reset_trip_total().")};
  }

  record->runtime.trip_total_units = 0.0;
  record->runtime.last_reason = has_text(reason) ? std::optional<std::string>{reason} : std::optional<std::string>{"trip_total_reset"};

  record_history(id, FlowHistoryEventType::trip_total_reset, now_ms, source, reason, 0.0);
  const auto status = publish_signals(*record, now_ms);
  return FlowOperationResult{status};
}

FlowOperationResult FlowService::reset_batch_total(
    const std::string& id,
    const FlowTimestampMs now_ms,
    std::string source,
    std::string reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return FlowOperationResult{FlowStatus::error(FlowErrorCode::flow_not_found, "Flow '" + id + "' is not registered.")};
  }
  if (!record->runtime.initialized) {
    return FlowOperationResult{
        FlowStatus::error(FlowErrorCode::flow_not_initialized, "Flow '" + id + "' must be initialized before reset_batch_total().")};
  }

  record->runtime.batch_total_units = 0.0;
  record->runtime.batch_done = false;
  record->runtime.last_reason = has_text(reason) ? std::optional<std::string>{reason} : std::optional<std::string>{"batch_total_reset"};

  record_history(id, FlowHistoryEventType::batch_total_reset, now_ms, source, reason, 0.0);
  const auto status = publish_signals(*record, now_ms);
  return FlowOperationResult{status};
}

FlowSnapshot FlowService::build_snapshot(const FlowRecord& record) const {
  FlowSnapshot snapshot;
  snapshot.id = record.descriptor.id;
  snapshot.name = record.descriptor.name;
  snapshot.enabled = record.descriptor.enabled;
  snapshot.pulse_input_id = record.descriptor.pulse_input_id;
  snapshot.unit = record.descriptor.unit;
  snapshot.initialized = record.runtime.initialized;
  snapshot.pulse_source_seen = record.runtime.pulse_source_seen;
  snapshot.raw_pulse_lifetime = record.runtime.raw_pulse_lifetime;
  snapshot.lifetime_total_units = record.runtime.lifetime_total_units;
  snapshot.trip_total_units = record.runtime.trip_total_units;
  snapshot.batch_total_units = record.runtime.batch_total_units;
  snapshot.batch_active = record.runtime.batch_active;
  snapshot.batch_target_units = record.runtime.batch_target_units;
  snapshot.batch_done = record.runtime.batch_done;
  snapshot.current_rate_units_per_min = record.runtime.current_rate_units_per_min;
  snapshot.time_window_rate_units_per_min = record.runtime.time_window_rate_units_per_min;
  snapshot.pulse_frequency_rate_units_per_min = record.runtime.pulse_frequency_rate_units_per_min;
  snapshot.avg_n_rate_units_per_min = record.runtime.avg_n_rate_units_per_min;
  snapshot.no_flow = record.runtime.no_flow;
  snapshot.high_flow = record.runtime.high_flow;
  snapshot.last_pulse_age_ms = record.runtime.last_pulse_age_ms;
  snapshot.update_counter = record.runtime.update_counter;
  snapshot.last_reason = record.runtime.last_reason;
  return snapshot;
}

void FlowService::record_history(
    const std::string& flow_id,
    const FlowHistoryEventType event_type,
    const FlowTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    const std::optional<double> value) {
  history_.append(FlowHistoryEntry{
      0U,
      flow_id,
      event_type,
      now_ms,
      source,
      reason,
      value,
  });
}

}  // namespace controller::flow
