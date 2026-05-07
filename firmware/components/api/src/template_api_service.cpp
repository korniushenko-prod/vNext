#include "api/template_api_service.hpp"

namespace controller::api {

namespace {

TemplateUiResultCode map_code(const controller::templates::TemplateErrorCode code) {
  switch (code) {
    case controller::templates::TemplateErrorCode::ok:
      return TemplateUiResultCode::template_ui_ok;
    case controller::templates::TemplateErrorCode::template_duplicate_resulting_id:
      return TemplateUiResultCode::template_ui_duplicate_id;
    case controller::templates::TemplateErrorCode::template_active_program_present:
      return TemplateUiResultCode::template_ui_active_program_present;
    case controller::templates::TemplateErrorCode::template_invalid_argument:
      return TemplateUiResultCode::template_ui_invalid_argument;
    case controller::templates::TemplateErrorCode::template_rollback_failed:
      return TemplateUiResultCode::template_ui_rollback_failed;
    case controller::templates::TemplateErrorCode::template_apply_failed:
      return TemplateUiResultCode::template_ui_runtime_apply_failed;
    case controller::templates::TemplateErrorCode::template_data_unavailable:
      return TemplateUiResultCode::template_ui_data_unavailable;
    case controller::templates::TemplateErrorCode::template_unsupported_kind:
    case controller::templates::TemplateErrorCode::template_invalid_draft:
      return TemplateUiResultCode::template_ui_invalid_draft;
  }
  return TemplateUiResultCode::template_ui_data_unavailable;
}

}  // namespace

const char* to_string(const TemplateUiResultCode code) {
  switch (code) {
    case TemplateUiResultCode::template_ui_ok:
      return "TEMPLATE_UI_OK";
    case TemplateUiResultCode::template_ui_invalid_draft:
      return "TEMPLATE_UI_INVALID_DRAFT";
    case TemplateUiResultCode::template_ui_apply_denied:
      return "TEMPLATE_UI_APPLY_DENIED";
    case TemplateUiResultCode::template_ui_duplicate_id:
      return "TEMPLATE_UI_DUPLICATE_ID";
    case TemplateUiResultCode::template_ui_active_program_present:
      return "TEMPLATE_UI_ACTIVE_PROGRAM_PRESENT";
    case TemplateUiResultCode::template_ui_data_unavailable:
      return "TEMPLATE_UI_DATA_UNAVAILABLE";
    case TemplateUiResultCode::template_ui_runtime_apply_failed:
      return "TEMPLATE_UI_RUNTIME_APPLY_FAILED";
    case TemplateUiResultCode::template_ui_rollback_failed:
      return "TEMPLATE_UI_ROLLBACK_FAILED";
    case TemplateUiResultCode::template_ui_invalid_argument:
      return "TEMPLATE_UI_INVALID_ARGUMENT";
  }
  return "TEMPLATE_UI_UNKNOWN";
}

TemplateApiService::TemplateApiService(
    controller::signals::SignalRegistry& signal_registry,
    controller::actuators::ActuatorManager& actuator_manager,
    controller::timers::TimerService& timer_service,
    controller::alarms::AlarmService& alarm_service,
    controller::logic::LogicService& logic_service,
    controller::sequence::SequenceService& sequence_service,
    controller::pid::PidService& pid_service)
    : engine_(signal_registry, actuator_manager, timer_service, alarm_service, logic_service, sequence_service, pid_service) {}

TemplateUiStatus TemplateApiService::map_status(const controller::templates::TemplateStatus& status, std::vector<TemplateIssueDto> issues) const {
  return TemplateUiStatus{map_code(status.code), status.message, std::move(issues)};
}

controller::templates::TemplateCommandContext TemplateApiService::map_context(const CommandContext& context) const {
  return controller::templates::TemplateCommandContext{context.now_ms, context.source, context.reason, context.actor};
}

TemplateUiResult<TemplateListDto> TemplateApiService::list_templates(ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);
  TemplateUiResult<TemplateListDto> result;
  result.status = TemplateUiStatus{TemplateUiResultCode::template_ui_ok, "Template list refreshed.", {}};
  result.value = engine_.list_templates();
  return result;
}

TemplateUiResult<TemplateCatalogDto> TemplateApiService::get_template_catalog(ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);
  TemplateUiResult<TemplateCatalogDto> result;
  result.status = TemplateUiStatus{TemplateUiResultCode::template_ui_ok, "Template catalog refreshed.", {}};
  result.value = engine_.get_catalog();
  return result;
}

TemplateUiResult<TemplateSchemaDto> TemplateApiService::get_template_schema(controller::templates::TemplateKind kind, ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);
  TemplateUiResult<TemplateSchemaDto> result;
  const auto schema = engine_.get_schema(kind);
  result.status = map_status(schema.status);
  result.value = schema.value;
  return result;
}

TemplateUiResult<TemplateDraftDto> TemplateApiService::create_template_draft(controller::templates::TemplateKind kind) const {
  TemplateUiResult<TemplateDraftDto> result;
  if (!controller::templates::is_supported_template_kind(kind)) {
    result.status = TemplateUiStatus{TemplateUiResultCode::template_ui_invalid_draft, "Unsupported template kind was requested.", {}};
    return result;
  }
  result.status = TemplateUiStatus{TemplateUiResultCode::template_ui_ok, "Template draft initialized.", {}};
  result.value = engine_.create_draft(kind);
  return result;
}

TemplateUiResult<TemplateValidationDto> TemplateApiService::validate_template_draft(const TemplateDraftDto& draft, ApiTimestampMs now_ms) const {
  TemplateUiResult<TemplateValidationDto> result;
  const auto validation = engine_.validate_draft(draft, now_ms, true);
  result.status = map_status(validation.status, validation.issues);
  result.value = validation;
  return result;
}

TemplateUiResult<TemplatePreviewDto> TemplateApiService::preview_template_draft(const TemplateDraftDto& draft, ApiTimestampMs now_ms) const {
  TemplateUiResult<TemplatePreviewDto> result;
  const auto preview = engine_.preview_draft(draft, now_ms);
  result.status = map_status(preview.status, preview.value.has_value() ? preview.value->validation_issues : std::vector<TemplateIssueDto>{});
  result.value = preview.value;
  return result;
}

TemplateApplyDto TemplateApiService::apply_template_draft(const TemplateDraftDto& draft, const CommandContext& context) {
  return engine_.apply_template(draft, map_context(context));
}

controller::templates::TemplateEngine& TemplateApiService::engine() {
  return engine_;
}

}  // namespace controller::api
