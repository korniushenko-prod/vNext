#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "signals/signal_descriptor.hpp"
#include "signals/signal_value.hpp"

namespace controller::signals {

struct RuntimeSignalState {
  std::optional<SignalValue> value;
  bool initialized{false};
  bool valid{false};
  bool fault{false};
  SignalTimestampMs last_update_ms{0U};
  SignalUpdateCounter update_counter{0U};
};

struct SignalSnapshot {
  SignalDescriptor descriptor;
  std::optional<SignalValue> value;
  bool valid{false};
  bool fault{false};
  bool stale{false};
  bool initialized{false};
  SignalTimestampMs last_update_ms{0U};
  SignalUpdateCounter update_counter{0U};
};

class SignalRegistry {
 public:
  SignalOperationResult register_signal(
      const SignalDescriptor& descriptor,
      std::optional<SignalValue> initial_value = std::nullopt,
      SignalTimestampMs initial_now_ms = 0U,
      bool initial_valid = true,
      bool initial_fault = false);

  bool has_signal(const std::string& path) const;

  SignalResult<SignalDescriptor> get_descriptor(const std::string& path) const;

  std::vector<SignalDescriptor> list_descriptors() const;
  std::vector<std::string> list_signal_paths() const;

  SignalOperationResult update_signal(
      const std::string& path,
      const SignalValue& value,
      SignalTimestampMs now_ms,
      bool valid = true,
      bool fault = false);

  SignalResult<SignalSnapshot> read_signal(const std::string& path, SignalTimestampMs now_ms) const;
  SignalResult<bool> read_bool(const std::string& path, SignalTimestampMs now_ms) const;
  SignalResult<std::int64_t> read_int64(const std::string& path, SignalTimestampMs now_ms) const;
  SignalResult<double> read_double(const std::string& path, SignalTimestampMs now_ms) const;
  SignalResult<std::string> read_string(const std::string& path, SignalTimestampMs now_ms) const;

  SignalOperationResult write_virtual_signal(const std::string& path, const SignalValue& value, SignalTimestampMs now_ms);

  SignalOperationResult clear_signal(const std::string& path);

  std::vector<SignalSnapshot> list_signal_snapshots(SignalTimestampMs now_ms) const;

 private:
  struct SignalEntry {
    SignalDescriptor descriptor;
    RuntimeSignalState state;
  };

  std::vector<std::string> registration_order_;
  std::unordered_map<std::string, SignalEntry> signals_by_path_;
};

}  // namespace controller::signals
