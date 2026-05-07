#include <iostream>

#include "sim/sim_clock.hpp"
#include "sim_test_support.hpp"

int main() {
  using controller::sim::SimClock;

  {
    SimClock clock;
    sim_test::expect_true(clock.now_ms() == 0U, "clock should start at zero by default");
    clock.advance_ms(125U);
    sim_test::expect_true(clock.now_ms() == 125U, "advance_ms should move time deterministically");
    clock.advance_ms(0U);
    sim_test::expect_true(clock.now_ms() == 125U, "zero advance should keep the same-step timestamp stable");
  }

  {
    SimClock clock{500U};
    sim_test::expect_true(clock.now_ms() == 500U, "clock should honor explicit initial time");
    clock.set_time_ms(42U);
    sim_test::expect_true(clock.now_ms() == 42U, "set_time_ms should replace the current time deterministically");
    clock.set_time_ms(42U);
    sim_test::expect_true(clock.now_ms() == 42U, "repeating set_time_ms should remain stable");
  }

  if (sim_test::failures != 0) {
    std::cerr << "test_sim_clock failed with " << sim_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sim_clock passed\n";
  return 0;
}
