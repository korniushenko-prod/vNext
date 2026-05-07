#pragma once

#include <cstdint>
#include <string>

namespace controller::sim {

using SimTimestampMs = std::uint64_t;
using SimDurationMs = std::uint64_t;

class SimHarness;
struct SimStatus;

class SimComponent {
 public:
  virtual ~SimComponent() = default;

  virtual std::string component_id() const = 0;
  virtual bool is_initialized() const = 0;
  virtual SimStatus initialize(SimHarness& harness, SimTimestampMs now_ms) = 0;
  virtual SimStatus step(SimHarness& harness, SimTimestampMs now_ms, SimDurationMs dt_ms) = 0;
};

}  // namespace controller::sim
