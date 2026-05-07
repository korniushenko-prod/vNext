#include "api/web_program_matrix_adapter.hpp"

#include <optional>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

namespace controller::api {

namespace {

std::string bool_text(const bool value) {
  return value ? "Yes" : "No";
}

std::string sequence_type_text(const controller::sequence::SequenceProgramType type) {
  return controller::sequence::to_string(type);
}

std::string sequence_state_type_text(const controller::sequence::SequenceStateType type) {
  return controller::sequence::to_string(type);
}

std::string lifecycle_text(const controller::sequence::SequenceLifecycle lifecycle) {
  return controller::sequence::to_string(lifecycle);
}

std::string actuator_kind_text(const controller::actuators::ActuatorTargetKind kind) {
  return controller::actuators::to_string(kind);
}

std::string actuator_role_text(const controller::actuators::ActuatorRole role) {
  return controller::actuators::to_string(role);
}

std::string issue_severity_text(const controller::sequence::ProgramMatrixIssueSeverity severity) {
  return controller::sequence::to_string(severity);
}

std::string cell_type_text(const controller::sequence::ProgramMatrixCellType cell_type) {
  return controller::sequence::to_string(cell_type);
}

std::string duration_text(const std::optional<controller::sequence::SequenceDurationMs>& value) {
  return value.has_value() ? std::to_string(*value) : std::string{};
}

std::string badge_text(const ProgramMatrixProgramListItemDto& program) {
  if (program.active) {
    return "active";
  }
  return program.enabled ? "idle" : "disabled";
}

std::string runtime_banner_text(
    const ProgramMatrixUiResultCode code,
    const ProgramMatrixPayloadDto* payload) {
  if (code == ProgramMatrixUiResultCode::matrix_ui_no_active_program) {
    return "No active program";
  }
  if (payload == nullptr) {
    return "Matrix unavailable";
  }
  if (payload->runtime_summary.selected_program_active) {
    return "Active state highlighted. Matrix remains a descriptor view.";
  }
  if (payload->matrix.has_value()) {
    return payload->runtime_summary.active_program_id.has_value() ? "Selected program is not active" : "Program not active";
  }
  return "Matrix unavailable";
}

std::string selected_state_id_for_view(
    const ProgramMatrixSourceData& source,
    const controller::sequence::ProgramMatrix& matrix) {
  if (source.selected_state_id.has_value()) {
    for (const auto& detail : matrix.state_details) {
      if (detail.state_id == *source.selected_state_id) {
        return detail.state_id;
      }
    }
  }

  for (const auto& row : matrix.state_rows) {
    if (row.currently_active) {
      return row.state_id;
    }
  }

  return matrix.state_rows.empty() ? std::string{} : matrix.state_rows.front().state_id;
}

std::string row_badge_line(const ProgramMatrixRowViewModel& row) {
  std::ostringstream stream;
  for (std::size_t index = 0; index < row.badges.size(); ++index) {
    if (index != 0U) {
      stream << ", ";
    }
    stream << row.badges[index];
  }
  return stream.str();
}

}  // namespace

WebProgramMatrixAdapter::WebProgramMatrixAdapter(ProgramMatrixApiService& api_service) : api_service_(api_service) {}

ProgramMatrixViewResponse<std::vector<ProgramMatrixProgramListItemViewModel>> WebProgramMatrixAdapter::load_program_list(
    const ApiTimestampMs now_ms) const {
  const auto programs = api_service_.list_programs(now_ms);
  return make_list_response(programs.status, programs.value.value_or(std::vector<ProgramMatrixProgramListItemDto>{}), now_ms);
}

ProgramMatrixViewResponse<WebProgramMatrixViewModel> WebProgramMatrixAdapter::load_program_matrix(
    const std::string& program_id,
    const ApiTimestampMs now_ms) const {
  const auto programs = api_service_.list_programs(now_ms);
  const auto payload = api_service_.get_program_matrix(program_id, now_ms);

  ProgramMatrixSourceData source;
  source.program_list = programs.value.value_or(std::vector<ProgramMatrixProgramListItemDto>{});
  source.payload = payload.value;
  source.status = payload.status;
  if (!programs.status.ok() && source.program_list.empty() && !payload.value.has_value()) {
    source.status = programs.status;
  }

  return make_view_response(source, now_ms);
}

ProgramMatrixViewResponse<WebProgramMatrixViewModel> WebProgramMatrixAdapter::load_active_program_matrix(
    const ApiTimestampMs now_ms) const {
  const auto programs = api_service_.list_programs(now_ms);
  const auto payload = api_service_.get_active_program_matrix(now_ms);

  ProgramMatrixSourceData source;
  source.program_list = programs.value.value_or(std::vector<ProgramMatrixProgramListItemDto>{});
  source.payload = payload.value;
  source.status = payload.status;
  if (!programs.status.ok() && source.program_list.empty() && !payload.value.has_value()) {
    source.status = programs.status;
  }

  return make_view_response(source, now_ms);
}

std::vector<ProgramMatrixProgramListItemViewModel> WebProgramMatrixAdapter::build_program_list_view_model(
    const std::vector<ProgramMatrixProgramListItemDto>& program_list) {
  std::vector<ProgramMatrixProgramListItemViewModel> mapped;
  mapped.reserve(program_list.size());
  for (const auto& program : program_list) {
    mapped.push_back(ProgramMatrixProgramListItemViewModel{
        program.id,
        program.name,
        sequence_type_text(program.type),
        program.enabled,
        program.active,
        badge_text(program),
        program.current_state_id.value_or(""),
        program.state_count,
        program.actuator_count,
        program.issue_count,
    });
  }
  return mapped;
}

WebProgramMatrixViewModel WebProgramMatrixAdapter::build_view_model(const ProgramMatrixSourceData& source) {
  WebProgramMatrixViewModel view_model;
  view_model.result_code = to_string(source.status.code);
  view_model.message = source.status.message;
  view_model.read_only_note =
      "Read-only descriptor view. Matrix cells come only from state active_actions, not runtime arbitration.";
  view_model.programs = build_program_list_view_model(source.program_list);
  view_model.legend = {
      {"blank", "Blank", "No persistent actuator action in that state."},
      {"ON", "ON", "Relay is held ON by an active_action."},
      {"OFF", "OFF", "Relay is held OFF explicitly by an active_action."},
      {"PWM", "PWM 45%", "PWM output is enabled and held at the shown duty."},
      {"ACTIVE", "Highlighted row", "Current active state when the selected program is running."},
  };

  const ProgramMatrixPayloadDto* payload = source.payload.has_value() ? &*source.payload : nullptr;
  view_model.runtime_summary.code = view_model.result_code;
  view_model.runtime_summary.banner = runtime_banner_text(source.status.code, payload);
  view_model.runtime_summary.active = payload != nullptr && payload->runtime_summary.active_program_id.has_value();
  view_model.runtime_summary.selected_program_active =
      payload != nullptr && payload->runtime_summary.selected_program_active;
  view_model.runtime_summary.active_program_id =
      payload != nullptr ? payload->runtime_summary.active_program_id.value_or("none") : "none";
  view_model.runtime_summary.lifecycle =
      payload != nullptr ? lifecycle_text(payload->runtime_summary.lifecycle)
                         : lifecycle_text(controller::sequence::SequenceLifecycle::idle);
  view_model.runtime_summary.current_state =
      payload != nullptr ? payload->runtime_summary.current_state_id.value_or("Program not active") : "Program not active";
  view_model.runtime_summary.lockout = payload != nullptr ? bool_text(payload->runtime_summary.lockout) : bool_text(false);
  view_model.runtime_summary.last_reason = payload != nullptr ? payload->runtime_summary.last_reason : "";

  if (payload == nullptr || !payload->matrix.has_value()) {
    switch (source.status.code) {
      case ProgramMatrixUiResultCode::matrix_ui_no_programs:
        view_model.empty_title = "No programs registered";
        view_model.empty_message = "Register a sequence program to inspect its output matrix.";
        break;
      case ProgramMatrixUiResultCode::matrix_ui_program_not_found:
        view_model.empty_title = "Program not found";
        view_model.empty_message = source.status.message;
        break;
      case ProgramMatrixUiResultCode::matrix_ui_no_active_program:
        view_model.empty_title = "No active program";
        view_model.empty_message = "Start a program or choose one from the selector to inspect its matrix.";
        break;
      default:
        view_model.empty_title = "Matrix unavailable";
        view_model.empty_message = source.status.message.empty() ? "Program matrix data is unavailable." : source.status.message;
        break;
    }
    return view_model;
  }

  const auto& matrix = *payload->matrix;
  view_model.has_matrix = true;
  view_model.matrix_title = matrix.program_name + " Output Matrix";

  for (const auto& issue : matrix.issues) {
    view_model.issues.push_back(ProgramMatrixIssueViewModel{
        issue.path,
        issue.code,
        issue_severity_text(issue.severity),
        issue.message,
        issue.severity == controller::sequence::ProgramMatrixIssueSeverity::error,
    });
  }
  view_model.has_warnings = !view_model.issues.empty();

  for (const auto& column : matrix.actuator_columns) {
    view_model.columns.push_back(ProgramMatrixColumnViewModel{
        column.actuator_id,
        column.actuator_name.empty() ? column.actuator_id : column.actuator_name,
        column.actuator_id,
        actuator_kind_text(column.actuator_kind),
        actuator_role_text(column.actuator_role),
        column.metadata_found,
    });
  }

  const auto selected_state_id = selected_state_id_for_view(source, matrix);
  for (const auto& row : matrix.state_rows) {
    ProgramMatrixRowViewModel row_view;
    row_view.state_id = row.state_id;
    row_view.state_name = row.state_name;
    row_view.state_type = sequence_state_type_text(row.state_type);
    row_view.currently_active = row.currently_active;
    row_view.enabled = row.enabled;
    row_view.non_skippable = row.non_skippable;
    row_view.manual_allowed = row.manual_allowed;
    row_view.min_time_ms = duration_text(row.min_time_ms);
    row_view.max_time_ms = duration_text(row.max_time_ms);
    if (row.is_initial) {
      row_view.badges.push_back("initial");
    }
    if (row.is_normal_stop) {
      row_view.badges.push_back("stop");
    }
    if (row.is_trip) {
      row_view.badges.push_back("trip");
    }
    if (row.is_lockout) {
      row_view.badges.push_back("lockout");
    }

    for (const auto& cell : matrix.matrix_cells) {
      if (cell.state_id != row.state_id) {
        continue;
      }
      row_view.cells.push_back(ProgramMatrixCellViewModel{
          cell.state_id,
          cell.actuator_id,
          cell.label,
          cell_type_text(cell.cell_type),
          cell.cell_type == controller::sequence::ProgramMatrixCellType::none,
          cell.cell_type == controller::sequence::ProgramMatrixCellType::relay_off ||
              cell.cell_type == controller::sequence::ProgramMatrixCellType::pwm_disabled,
          row.currently_active,
          cell.warning.value_or(""),
      });
    }

    view_model.rows.push_back(std::move(row_view));
  }

  for (const auto& detail : matrix.state_details) {
    ProgramMatrixStateDetailViewModel detail_view;
    detail_view.state_id = detail.state_id;
    detail_view.state_name = detail.state_name;
    detail_view.state_type = sequence_state_type_text(detail.state_type);
    detail_view.guard_summary = detail.guard_summary;
    detail_view.timeout_summary = detail.timeout_summary;
    detail_view.guard_fail_summary = detail.guard_fail_summary;

    for (const auto& row : view_model.rows) {
      if (row.state_id == detail.state_id) {
        detail_view.badge_line = row_badge_line(row);
        break;
      }
    }

    for (const auto& action : detail.entry_actions) {
      detail_view.entry_actions.push_back(ProgramMatrixActionViewModel{
          action.action_id,
          action.kind_text,
          action.summary,
          action.reason,
          action.persistent,
      });
    }
    for (const auto& action : detail.active_actions) {
      detail_view.active_actions.push_back(ProgramMatrixActionViewModel{
          action.action_id,
          action.kind_text,
          action.summary,
          action.reason,
          action.persistent,
      });
    }
    for (const auto& action : detail.exit_actions) {
      detail_view.exit_actions.push_back(ProgramMatrixActionViewModel{
          action.action_id,
          action.kind_text,
          action.summary,
          action.reason,
          action.persistent,
      });
    }
    for (const auto& transition : detail.transitions) {
      std::string summary = transition.target_state_id;
      if (!transition.condition_summary.empty() && transition.condition_summary != "none") {
        summary += " if " + transition.condition_summary;
      }
      if (transition.require_min_time_done) {
        summary += " (min-time gate)";
      }
      detail_view.transitions.push_back(ProgramMatrixTransitionViewModel{
          transition.id,
          transition.target_state_id,
          summary,
          transition.enabled,
      });
    }

    if (detail.state_id == selected_state_id) {
      view_model.selected_state = detail_view;
    }
    view_model.state_details.push_back(std::move(detail_view));
  }

  return view_model;
}

ProgramMatrixViewResponse<WebProgramMatrixViewModel> WebProgramMatrixAdapter::make_view_response(
    const ProgramMatrixSourceData& source,
    const ApiTimestampMs now_ms) {
  ProgramMatrixViewResponse<WebProgramMatrixViewModel> response;
  response.success = source.status.ok();
  response.code = source.status.code;
  response.message = source.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.value = build_view_model(source);
  return response;
}

ProgramMatrixViewResponse<std::vector<ProgramMatrixProgramListItemViewModel>> WebProgramMatrixAdapter::make_list_response(
    const ProgramMatrixUiStatus& status,
    const std::vector<ProgramMatrixProgramListItemDto>& program_list,
    const ApiTimestampMs now_ms) {
  ProgramMatrixViewResponse<std::vector<ProgramMatrixProgramListItemViewModel>> response;
  response.success = status.ok();
  response.code = status.code;
  response.message = status.message;
  response.refresh_timestamp_ms = now_ms;
  response.value = build_program_list_view_model(program_list);
  return response;
}

}  // namespace controller::api
