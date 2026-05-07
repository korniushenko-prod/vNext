#include <iostream>

#include "api_test_support.hpp"
#include "api/web_dashboard_adapter.hpp"

int main() {
  using namespace api_test;

  {
    controller::api::DashboardSourceData source;

    controller::api::ProgramSummaryDto program;
    program.id = "pump1";
    program.name = "Pump 1";
    program.type = controller::sequence::SequenceProgramType::pump;
    program.enabled = true;
    source.programs.push_back(program);

    source.status.program_id = "pump1";
    source.status.program_registered = true;
    source.status.is_active = true;
    source.status.enabled = true;
    source.status.name = "Pump 1";
    source.status.type = controller::sequence::SequenceProgramType::pump;
    source.status.active_program_id = "pump1";
    source.status.lifecycle = controller::sequence::SequenceLifecycle::running;
    source.status.current_state_id = "run";
    source.status.current_state_type = controller::sequence::SequenceStateType::run;
    source.status.state_elapsed_ms = 4200U;
    source.status.last_reason = "waiting for airflow";
    source.status.transition_candidates.push_back(controller::api::TransitionCandidateDto{
        "to_stop",
        "stop",
        false,
        "Blocked: air_flow_ok is false",
        true,
        false,
    });

    source.status.actuators.push_back(controller::api::ActuatorSummaryDto{
        "relay.main",
        controller::actuators::ActuatorTargetKind::relay,
        controller::actuators::ActuatorRole::pump,
        false,
        "program:pump1:state:run",
        "run relay",
        controller::actuators::ActuatorPriority::sequence,
        controller::hal::RelayState::on,
        std::nullopt,
        std::nullopt,
    });
    source.status.actuators.push_back(controller::api::ActuatorSummaryDto{
        "pwm.main",
        controller::actuators::ActuatorTargetKind::pwm,
        controller::actuators::ActuatorRole::generic,
        true,
        "",
        "safe fallback applied",
        controller::actuators::ActuatorPriority::default_priority,
        std::nullopt,
        false,
        0.0,
    });

    const auto view_model = controller::api::WebDashboardAdapter::build_view_model(source);
    expect_true(view_model.transition_candidates.size() == 1U, "view model should keep transition candidates");
    expect_true(view_model.blocked_transitions.size() == 1U, "blocked transition list should be preserved when nothing is eligible");
    expect_true(
        view_model.blocked_transitions.front().reason == "Blocked: air_flow_ok is false",
        "blocked transition reason should remain human readable");
    expect_true(
        view_model.next_transition_target_state_id == std::optional<std::string>{"stop"},
        "view model should still expose the next target state id");
    expect_true(view_model.actuator_summaries.size() == 2U, "actuator summaries should be mapped");
    expect_true(
        view_model.actuator_summaries.front().is_on && view_model.actuator_summaries.front().emphasis == "sequence_owned",
        "sequence-owned active relay should be highlighted");
    expect_true(
        view_model.actuator_summaries.back().safe_fallback &&
            view_model.actuator_summaries.back().emphasis == "safe_fallback",
        "safe fallback actuator should be visible in the model");
    expect_true(
        view_model.actuator_summaries.back().state_text.find("PWM disabled") != std::string::npos,
        "PWM safe fallback should expose a readable state");
  }

  {
    controller::api::DashboardSourceData source;

    controller::api::ProgramSummaryDto program;
    program.id = "pump1";
    program.name = "Pump 1";
    program.type = controller::sequence::SequenceProgramType::pump;
    program.enabled = true;
    source.programs.push_back(program);

    source.status.lifecycle = controller::sequence::SequenceLifecycle::idle;
    source.status.current_state_type = controller::sequence::SequenceStateType::generic;
    source.selected_program_status = controller::api::ProgramStatusDto{};
    source.selected_program_status->program_id = "pump1";
    source.selected_program_status->program_registered = true;
    source.selected_program_status->enabled = true;
    source.selected_program_status->name = "Pump 1";
    source.selected_program_status->type = controller::sequence::SequenceProgramType::pump;
    source.selected_program_status->lifecycle = controller::sequence::SequenceLifecycle::idle;
    source.selected_program_status->current_state_type = controller::sequence::SequenceStateType::generic;
    source.selected_program_status->can_start = true;

    const auto idle_view = controller::api::WebDashboardAdapter::build_view_model(source);
    expect_true(!idle_view.alarms_any_active, "no active alarms should stay false");
    expect_true(idle_view.alarms_active_count == 0U, "no active alarms count should be zero");
    expect_true(idle_view.alarms_highest_severity == "none", "no active alarms should expose a clear none severity");
    expect_true(idle_view.active_alarm_entries.empty(), "no active alarms should produce an empty list");
    expect_true(idle_view.can_start, "selected startable program should enable start");
    expect_true(!idle_view.can_stop, "idle dashboard should disable stop");
    expect_true(!idle_view.can_trip, "idle dashboard should disable trip");
    expect_true(
        idle_view.stop_reason == "No active program to stop.",
        "disabled stop should include a visible explanation");
  }

  {
    controller::api::DashboardSourceData source;

    controller::api::ProgramSummaryDto program;
    program.id = "pump1";
    program.name = "Pump 1";
    program.type = controller::sequence::SequenceProgramType::pump;
    program.enabled = true;
    program.is_active = true;
    source.programs.push_back(program);

    source.status.program_id = "pump1";
    source.status.program_registered = true;
    source.status.is_active = true;
    source.status.enabled = true;
    source.status.name = "Pump 1";
    source.status.type = controller::sequence::SequenceProgramType::pump;
    source.status.active_program_id = "pump1";
    source.status.lifecycle = controller::sequence::SequenceLifecycle::lockout;
    source.status.current_state_id = "lockout";
    source.status.current_state_type = controller::sequence::SequenceStateType::lockout;
    source.status.lockout = true;
    source.status.can_reset = false;

    const auto lockout_view = controller::api::WebDashboardAdapter::build_view_model(source);
    expect_true(!lockout_view.can_stop, "lockout should disable normal stop");
    expect_true(!lockout_view.can_trip, "lockout should disable trip");
    expect_true(!lockout_view.can_reset, "blocked reset should remain disabled");
    expect_true(
        lockout_view.reset_reason == "Reset is blocked until the reset condition becomes true.",
        "disabled reset should keep a visible explanation");
  }

  if (failures != 0) {
    std::cerr << "test_web_dashboard_view_model failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_web_dashboard_view_model passed\n";
  return 0;
}
