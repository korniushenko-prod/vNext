#include "signals/signal_registry.hpp"

#include <cctype>

namespace controller::signals {

namespace {

bool is_path_character_valid(const char ch) {
  const auto byte = static_cast<unsigned char>(ch);
  return std::isalnum(byte) != 0 || ch == '_' || ch == '.';
}

bool compute_stale(const SignalDescriptor& descriptor, const RuntimeSignalState& state, SignalTimestampMs now_ms) {
  if (!state.initialized || descriptor.max_age_ms == 0U || now_ms < state.last_update_ms) {
    return false;
  }

  return (now_ms - state.last_update_ms) > descriptor.max_age_ms;
}

SignalSnapshot make_snapshot(const SignalDescriptor& descriptor, const RuntimeSignalState& state, SignalTimestampMs now_ms) {
  return SignalSnapshot{
      descriptor,
      state.value,
      state.valid,
      state.fault,
      compute_stale(descriptor, state, now_ms),
      state.initialized,
      state.last_update_ms,
      state.update_counter,
  };
}

SignalOperationResult update_entry_state(
    const SignalDescriptor& descriptor,
    RuntimeSignalState& state,
    const SignalValue& value,
    SignalTimestampMs now_ms,
    bool valid,
    bool fault) {
  if (!signal_value_matches_type(value, descriptor.type)) {
    return SignalOperationResult{
        SignalStatus::error(
            SignalErrorCode::signal_type_mismatch,
            "Signal '" + descriptor.path + "' expects " + to_string(descriptor.type) + " values.")};
  }

  state.value = value;
  state.initialized = true;
  state.valid = valid;
  state.fault = fault;
  state.last_update_ms = now_ms;
  ++state.update_counter;
  return SignalOperationResult{SignalStatus::success()};
}

template <typename T>
SignalResult<T> read_typed_value(const SignalResult<SignalSnapshot>& snapshot_result) {
  SignalResult<T> result;
  result.status = snapshot_result.status;
  if (!snapshot_result.ok()) {
    return result;
  }

  const auto* typed_value = std::get_if<T>(&snapshot_result.value->value.value());
  if (typed_value == nullptr) {
    result.status = SignalStatus::error(
        SignalErrorCode::signal_type_mismatch,
        "Typed read does not match the registered signal type.");
    return result;
  }

  result.value = *typed_value;
  return result;
}

}  // namespace

bool is_supported_signal_type(const SignalType type) {
  switch (type) {
    case SignalType::boolean:
    case SignalType::int64:
    case SignalType::float64:
    case SignalType::string:
      return true;
  }

  return false;
}

bool is_supported_access_mode(const SignalAccessMode mode) {
  switch (mode) {
    case SignalAccessMode::read_only:
    case SignalAccessMode::writable_virtual:
      return true;
  }

  return false;
}

const char* to_string(const SignalType type) {
  switch (type) {
    case SignalType::boolean:
      return "bool";
    case SignalType::int64:
      return "int64";
    case SignalType::float64:
      return "double";
    case SignalType::string:
      return "string";
  }

  return "unknown";
}

const char* to_string(const SignalAccessMode mode) {
  switch (mode) {
    case SignalAccessMode::read_only:
      return "read_only";
    case SignalAccessMode::writable_virtual:
      return "writable_virtual";
  }

  return "unknown";
}

const char* to_string(const SignalErrorCode code) {
  switch (code) {
    case SignalErrorCode::ok:
      return "OK";
    case SignalErrorCode::signal_already_registered:
      return "SIGNAL_ALREADY_REGISTERED";
    case SignalErrorCode::signal_not_found:
      return "SIGNAL_NOT_FOUND";
    case SignalErrorCode::signal_type_mismatch:
      return "SIGNAL_TYPE_MISMATCH";
    case SignalErrorCode::signal_write_denied:
      return "SIGNAL_WRITE_DENIED";
    case SignalErrorCode::signal_not_initialized:
      return "SIGNAL_NOT_INITIALIZED";
    case SignalErrorCode::signal_invalid_descriptor:
      return "SIGNAL_INVALID_DESCRIPTOR";
    case SignalErrorCode::signal_invalid_path:
      return "SIGNAL_INVALID_PATH";
  }

  return "UNKNOWN_SIGNAL_ERROR";
}

SignalType signal_type_from_value(const SignalValue& value) {
  return std::visit([](const auto& candidate) { return signal_type_for<decltype(candidate)>(); }, value);
}

bool signal_value_matches_type(const SignalValue& value, const SignalType expected_type) {
  return signal_type_from_value(value) == expected_type;
}

bool is_valid_signal_path(const std::string_view path) {
  if (path.empty() || path.front() == '.' || path.back() == '.') {
    return false;
  }

  char previous = '\0';
  for (const char ch : path) {
    if (!is_path_character_valid(ch)) {
      return false;
    }
    if (ch == '.' && previous == '.') {
      return false;
    }
    previous = ch;
  }

  return true;
}

SignalOperationResult validate_signal_descriptor(const SignalDescriptor& descriptor) {
  if (!is_valid_signal_path(descriptor.path)) {
    return SignalOperationResult{
        SignalStatus::error(
            SignalErrorCode::signal_invalid_path,
            "Signal path '" + descriptor.path + "' must use dot-separated alphanumeric or underscore segments.")};
  }

  if (!is_supported_signal_type(descriptor.type)) {
    return SignalOperationResult{
        SignalStatus::error(
            SignalErrorCode::signal_invalid_descriptor,
            "Signal descriptor '" + descriptor.path + "' uses an unsupported type.")};
  }

  if (!is_supported_access_mode(descriptor.access_mode)) {
    return SignalOperationResult{
        SignalStatus::error(
            SignalErrorCode::signal_invalid_descriptor,
            "Signal descriptor '" + descriptor.path + "' uses an unsupported access mode.")};
  }

  return SignalOperationResult{SignalStatus::success()};
}

SignalOperationResult SignalRegistry::register_signal(
    const SignalDescriptor& descriptor,
    std::optional<SignalValue> initial_value,
    const SignalTimestampMs initial_now_ms,
    const bool initial_valid,
    const bool initial_fault) {
  const auto validation = validate_signal_descriptor(descriptor);
  if (!validation.ok()) {
    return validation;
  }

  if (signals_by_path_.count(descriptor.path) != 0U) {
    return SignalOperationResult{
        SignalStatus::error(
            SignalErrorCode::signal_already_registered,
            "Signal '" + descriptor.path + "' is already registered.")};
  }

  SignalEntry entry;
  entry.descriptor = descriptor;

  if (initial_value.has_value()) {
    const auto update_result =
        update_entry_state(entry.descriptor, entry.state, *initial_value, initial_now_ms, initial_valid, initial_fault);
    if (!update_result.ok()) {
      return update_result;
    }
  }

  registration_order_.push_back(descriptor.path);
  signals_by_path_.emplace(descriptor.path, std::move(entry));
  return SignalOperationResult{SignalStatus::success()};
}

bool SignalRegistry::has_signal(const std::string& path) const {
  return signals_by_path_.count(path) != 0U;
}

SignalResult<SignalDescriptor> SignalRegistry::get_descriptor(const std::string& path) const {
  SignalResult<SignalDescriptor> result;
  const auto entry = signals_by_path_.find(path);
  if (entry == signals_by_path_.end()) {
    result.status = SignalStatus::error(
        SignalErrorCode::signal_not_found,
        "Signal '" + path + "' is not registered.");
    return result;
  }

  result.value = entry->second.descriptor;
  return result;
}

std::vector<SignalDescriptor> SignalRegistry::list_descriptors() const {
  std::vector<SignalDescriptor> descriptors;
  descriptors.reserve(registration_order_.size());
  for (const auto& path : registration_order_) {
    descriptors.push_back(signals_by_path_.at(path).descriptor);
  }
  return descriptors;
}

std::vector<std::string> SignalRegistry::list_signal_paths() const {
  return registration_order_;
}

SignalOperationResult SignalRegistry::update_signal(
    const std::string& path,
    const SignalValue& value,
    const SignalTimestampMs now_ms,
    const bool valid,
    const bool fault) {
  const auto entry = signals_by_path_.find(path);
  if (entry == signals_by_path_.end()) {
    return SignalOperationResult{
        SignalStatus::error(
            SignalErrorCode::signal_not_found,
            "Signal '" + path + "' is not registered.")};
  }

  return update_entry_state(entry->second.descriptor, entry->second.state, value, now_ms, valid, fault);
}

SignalResult<SignalSnapshot> SignalRegistry::read_signal(const std::string& path, const SignalTimestampMs now_ms) const {
  SignalResult<SignalSnapshot> result;
  const auto entry = signals_by_path_.find(path);
  if (entry == signals_by_path_.end()) {
    result.status = SignalStatus::error(
        SignalErrorCode::signal_not_found,
        "Signal '" + path + "' is not registered.");
    return result;
  }

  if (!entry->second.state.initialized || !entry->second.state.value.has_value()) {
    result.status = SignalStatus::error(
        SignalErrorCode::signal_not_initialized,
        "Signal '" + path + "' has not been initialized.");
    return result;
  }

  result.value = make_snapshot(entry->second.descriptor, entry->second.state, now_ms);
  return result;
}

SignalResult<bool> SignalRegistry::read_bool(const std::string& path, const SignalTimestampMs now_ms) const {
  return read_typed_value<bool>(read_signal(path, now_ms));
}

SignalResult<std::int64_t> SignalRegistry::read_int64(const std::string& path, const SignalTimestampMs now_ms) const {
  return read_typed_value<std::int64_t>(read_signal(path, now_ms));
}

SignalResult<double> SignalRegistry::read_double(const std::string& path, const SignalTimestampMs now_ms) const {
  return read_typed_value<double>(read_signal(path, now_ms));
}

SignalResult<std::string> SignalRegistry::read_string(const std::string& path, const SignalTimestampMs now_ms) const {
  return read_typed_value<std::string>(read_signal(path, now_ms));
}

SignalOperationResult SignalRegistry::write_virtual_signal(
    const std::string& path,
    const SignalValue& value,
    const SignalTimestampMs now_ms) {
  const auto entry = signals_by_path_.find(path);
  if (entry == signals_by_path_.end()) {
    return SignalOperationResult{
        SignalStatus::error(
            SignalErrorCode::signal_not_found,
            "Signal '" + path + "' is not registered.")};
  }

  if (entry->second.descriptor.access_mode != SignalAccessMode::writable_virtual) {
    return SignalOperationResult{
        SignalStatus::error(
            SignalErrorCode::signal_write_denied,
            "Signal '" + path + "' is not writable_virtual.")};
  }

  return update_entry_state(entry->second.descriptor, entry->second.state, value, now_ms, true, false);
}

SignalOperationResult SignalRegistry::clear_signal(const std::string& path) {
  const auto entry = signals_by_path_.find(path);
  if (entry == signals_by_path_.end()) {
    return SignalOperationResult{
        SignalStatus::error(
            SignalErrorCode::signal_not_found,
            "Signal '" + path + "' is not registered.")};
  }

  entry->second.state = RuntimeSignalState{};
  return SignalOperationResult{SignalStatus::success()};
}

std::vector<SignalSnapshot> SignalRegistry::list_signal_snapshots(const SignalTimestampMs now_ms) const {
  std::vector<SignalSnapshot> snapshots;
  snapshots.reserve(registration_order_.size());
  for (const auto& path : registration_order_) {
    const auto& entry = signals_by_path_.at(path);
    snapshots.push_back(make_snapshot(entry.descriptor, entry.state, now_ms));
  }
  return snapshots;
}

}  // namespace controller::signals
