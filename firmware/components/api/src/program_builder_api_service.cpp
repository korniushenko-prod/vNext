#include "api/program_builder_api_service.hpp"

#include <utility>

namespace controller::api {

namespace {

bool has_text(const std::string& value) {
  return !value.empty();
}

ProgramBuilderUiResultCode map_builder_error_code(const controller::sequence::ProgramBuilderErrorCode code) {
  switch (code) {
    case controller::sequence::ProgramBuilderErrorCode::ok:
      return ProgramBuilderUiResultCode::builder_ui_ok;
    case controller::sequence::ProgramBuilderErrorCode::builder_duplicate_program_id:
      return ProgramBuilderUiResultCode::builder_ui_duplicate_id;
    case controller::sequence::ProgramBuilderErrorCode::builder_invalid_draft:
    case controller::sequence::ProgramBuilderErrorCode::builder_unsupported_skeleton:
      return ProgramBuilderUiResultCode::builder_ui_invalid_draft;
    case controller::sequence::ProgramBuilderErrorCode::builder_generation_failed:
      return ProgramBuilderUiResultCode::builder_ui_create_denied;
    case controller::sequence::ProgramBuilderErrorCode::builder_data_unavailable:
      return ProgramBuilderUiResultCode::builder_ui_data_unavailable;
  }
  return ProgramBuilderUiResultCode::builder_ui_data_unavailable;
}

}  // namespace

const char* to_string(const ProgramBuilderUiResultCode code) {
  switch (code) {
    case ProgramBuilderUiResultCode::builder_ui_ok:
      return "BUILDER_UI_OK";
    case ProgramBuilderUiResultCode::builder_ui_invalid_draft:
      return "BUILDER_UI_INVALID_DRAFT";
    case ProgramBuilderUiResultCode::builder_ui_create_denied:
      return "BUILDER_UI_CREATE_DENIED";
    case ProgramBuilderUiResultCode::builder_ui_duplicate_id:
      return "BUILDER_UI_DUPLICATE_ID";
    case ProgramBuilderUiResultCode::builder_ui_data_unavailable:
      return "BUILDER_UI_DATA_UNAVAILABLE";
    case ProgramBuilderUiResultCode::builder_ui_invalid_argument:
      return "BUILDER_UI_INVALID_ARGUMENT";
    case ProgramBuilderUiResultCode::builder_ui_sequence_registration_failed:
      return "BUILDER_UI_SEQUENCE_REGISTRATION_FAILED";
  }
  return "BUILDER_UI_UNKNOWN";
}

ProgramBuilderApiService::ProgramBuilderApiService(
    controller::signals::SignalRegistry& signal_registry,
    controller::actuators::ActuatorManager& actuator_manager,
    controller::timers::TimerService& timer_service,
    controller::alarms::AlarmService& alarm_service,
    controller::sequence::SequenceService& sequence_service)
    : builder_(signal_registry, actuator_manager, timer_service, alarm_service, sequence_service),
      sequence_service_(sequence_service) {}

ProgramBuilderUiResult<ProgramBuilderCatalogDto> ProgramBuilderApiService::get_builder_catalog(const ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);
  ProgramBuilderUiResult<ProgramBuilderCatalogDto> result;
  result.status = ProgramBuilderUiStatus::success("Program builder catalog refreshed.");
  result.value = builder_.build_catalog();
  return result;
}

ProgramBuilderUiResult<ProgramBuilderDraftDto> ProgramBuilderApiService::create_empty_draft(
    const controller::sequence::ProgramSkeletonKind skeleton_kind) const {
  ProgramBuilderUiResult<ProgramBuilderDraftDto> result;
  if (!controller::sequence::is_supported_program_skeleton_kind(skeleton_kind)) {
    result.status = ProgramBuilderUiStatus::error(
        ProgramBuilderUiResultCode::builder_ui_invalid_draft,
        "Unsupported skeleton kind was requested.");
    return result;
  }
  result.status = ProgramBuilderUiStatus::success("Builder draft initialized.");
  result.value = builder_.create_empty_draft(skeleton_kind);
  return result;
}

ProgramBuilderUiResult<ProgramBuilderValidationDto> ProgramBuilderApiService::validate_draft(
    const ProgramBuilderDraftDto& draft,
    const ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);
  ProgramBuilderUiResult<ProgramBuilderValidationDto> result;
  auto validation = builder_.validate_draft(draft);
  result.status = map_builder_validation(validation);
  result.value = std::move(validation);
  return result;
}

ProgramBuilderUiResult<ProgramBuilderPreviewDto> ProgramBuilderApiService::preview_draft(
    const ProgramBuilderDraftDto& draft,
    const ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);
  ProgramBuilderUiResult<ProgramBuilderPreviewDto> result;
  const auto preview = builder_.build_preview(draft);
  result.status = map_builder_status(
      preview.status,
      preview.value.has_value() ? preview.value->validation_issues : std::vector<ProgramBuilderIssueDto>{});
  result.value = preview.value;
  return result;
}

ProgramBuilderCreateResult ProgramBuilderApiService::create_program_from_draft(
    const ProgramBuilderDraftDto& draft,
    const CommandContext& context) {
  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return ProgramBuilderCreateResult{false, context_status, std::nullopt, std::nullopt};
  }

  const auto preview = builder_.build_preview(draft);
  if (!preview.status.ok()) {
    return ProgramBuilderCreateResult{
        false,
        map_builder_status(preview.status, preview.value.has_value() ? preview.value->validation_issues : std::vector<ProgramBuilderIssueDto>{}),
        std::nullopt,
        preview.value};
  }

  const auto generated = builder_.build_program(draft);
  if (!generated.ok()) {
    return ProgramBuilderCreateResult{
        false,
        map_builder_status(generated.status, preview.value->validation_issues),
        std::nullopt,
        preview.value};
  }

  const auto operation = sequence_service_.register_program(*generated.value);
  if (!operation.ok()) {
    return ProgramBuilderCreateResult{
        false,
        map_sequence_registration_status(operation.status),
        std::nullopt,
        preview.value};
  }

  return ProgramBuilderCreateResult{
      true,
      ProgramBuilderUiStatus::success("Program '" + generated.value->id + "' created disabled for review."),
      CreatedProgramDto{
          generated.value->id,
          generated.value->name,
          generated.value->type,
          !generated.value->enabled,
          generated.value->states.size(),
      },
      preview.value};
}

ProgramBuilderUiStatus ProgramBuilderApiService::validate_command_context(const CommandContext& context) const {
  if (!has_text(context.source)) {
    return ProgramBuilderUiStatus::error(
        ProgramBuilderUiResultCode::builder_ui_invalid_argument,
        "CommandContext.source must not be empty.");
  }
  if (!has_text(context.reason)) {
    return ProgramBuilderUiStatus::error(
        ProgramBuilderUiResultCode::builder_ui_invalid_argument,
        "CommandContext.reason must not be empty.");
  }
  return ProgramBuilderUiStatus::success();
}

ProgramBuilderUiStatus ProgramBuilderApiService::map_builder_validation(
    const controller::sequence::ProgramBuilderValidationResult& validation) const {
  if (!validation.has_errors()) {
    return ProgramBuilderUiStatus::success("Draft validation refreshed.");
  }
  return map_builder_status(validation.status, validation.issues);
}

ProgramBuilderUiStatus ProgramBuilderApiService::map_builder_status(
    const controller::sequence::ProgramBuilderStatus& status,
    std::vector<ProgramBuilderIssueDto> issues) const {
  if (status.ok()) {
    return ProgramBuilderUiStatus::success(status.message);
  }
  return ProgramBuilderUiStatus::error(map_builder_error_code(status.code), status.message, std::move(issues));
}

ProgramBuilderUiStatus ProgramBuilderApiService::map_sequence_registration_status(
    const controller::sequence::SequenceStatus& status) const {
  switch (status.code) {
    case controller::sequence::SequenceErrorCode::sequence_program_already_registered:
      return ProgramBuilderUiStatus::error(ProgramBuilderUiResultCode::builder_ui_duplicate_id, status.message);
    case controller::sequence::SequenceErrorCode::sequence_invalid_program:
    case controller::sequence::SequenceErrorCode::sequence_invalid_action:
    case controller::sequence::SequenceErrorCode::sequence_invalid_state_reference:
      return ProgramBuilderUiStatus::error(ProgramBuilderUiResultCode::builder_ui_create_denied, status.message);
    case controller::sequence::SequenceErrorCode::ok:
      return ProgramBuilderUiStatus::success(status.message);
    default:
      return ProgramBuilderUiStatus::error(
          ProgramBuilderUiResultCode::builder_ui_sequence_registration_failed,
          status.message);
  }
}

}  // namespace controller::api
