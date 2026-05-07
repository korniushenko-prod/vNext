#pragma once

#include "api/template_api_types.hpp"

namespace controller::api {

class TemplateApiService {
 public:
  TemplateApiService(
      controller::signals::SignalRegistry& signal_registry,
      controller::actuators::ActuatorManager& actuator_manager,
      controller::timers::TimerService& timer_service,
      controller::alarms::AlarmService& alarm_service,
      controller::logic::LogicService& logic_service,
      controller::sequence::SequenceService& sequence_service,
      controller::pid::PidService& pid_service);

  TemplateUiResult<TemplateListDto> list_templates(ApiTimestampMs now_ms) const;
  TemplateUiResult<TemplateCatalogDto> get_template_catalog(ApiTimestampMs now_ms) const;
  TemplateUiResult<TemplateSchemaDto> get_template_schema(controller::templates::TemplateKind kind, ApiTimestampMs now_ms) const;
  TemplateUiResult<TemplateDraftDto> create_template_draft(controller::templates::TemplateKind kind) const;
  TemplateUiResult<TemplateValidationDto> validate_template_draft(const TemplateDraftDto& draft, ApiTimestampMs now_ms) const;
  TemplateUiResult<TemplatePreviewDto> preview_template_draft(const TemplateDraftDto& draft, ApiTimestampMs now_ms) const;
  TemplateApplyDto apply_template_draft(const TemplateDraftDto& draft, const CommandContext& context);

  controller::templates::TemplateEngine& engine();

 private:
  controller::templates::TemplateCommandContext map_context(const CommandContext& context) const;
  TemplateUiStatus map_status(const controller::templates::TemplateStatus& status, std::vector<TemplateIssueDto> issues = {}) const;

  controller::templates::TemplateEngine engine_;
};

}  // namespace controller::api
