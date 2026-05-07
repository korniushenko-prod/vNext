#pragma once

#include <cstddef>
#include <functional>
#include <string>
#include <vector>

#include "sim/sim_clock.hpp"
#include "sim/sim_signal_injector.hpp"
#include "sim/sim_types.hpp"

namespace controller::sim {

struct SimScheduledAssertion {
  std::string id;
  SimTimestampMs at_ms{0U};
  std::string description;
  std::function<SimStatus(const SimHarness&, SimTimestampMs)> callback;
  bool processed{false};
};

class SimScenarioRunner {
 public:
  explicit SimScenarioRunner(SimHarness& harness, std::string scenario_name = {});

  SimClock& clock();
  const SimClock& clock() const;
  SimSignalInjector& injector();
  const SimSignalInjector& injector() const;

  SimStatus add_component(SimComponent& component);
  SimStatus add_assertion(const SimScheduledAssertion& assertion);

  SimScenarioRunReport run_for(SimDurationMs total_ms, SimDurationMs step_ms);

 private:
  static bool assertion_less(const SimScheduledAssertion& lhs, const SimScheduledAssertion& rhs);

  SimHarness& harness_;
  std::string scenario_name_;
  SimClock clock_;
  SimSignalInjector injector_;
  std::vector<SimComponent*> components_;
  std::vector<SimScheduledAssertion> assertions_;
};

}  // namespace controller::sim
