#include "api/web_template_adapter.hpp"

#include <sstream>

namespace controller::api {

namespace {

std::string join_text(const std::vector<std::string>& values) {
  std::ostringstream stream;
  for (std::size_t index = 0; index < values.size(); ++index) {
    if (index != 0U) {
      stream << ", ";
    }
    stream << values[index];
  }
  return stream.str();
}

std::string parameter_value_text(const controller::templates::TemplateParameterValue& value) {
  return std::visit(
      [](const auto& candidate) -> std::string {
        std::ostringstream stream;
        stream << candidate;
        return stream.str();
      },
      value);
}

std::string issue_severity_text(const controller::templates::TemplateIssueSeverity severity) {
  return controller::templates::to_string(severity);
}

std::string slot_kind_text(const controller::templates::TemplateSlotKind kind) {
  return controller::templates::to_string(kind);
}

std::string parameter_type_text(const controller::templates::TemplateParameterType type) {
  return controller::templates::to_string(type);
}

std::string actuator_constraints_text(const controller::templates::TemplateSlotDefinition& slot) {
  std::vector<std::string> parts;
  if (!slot.allowed_actuator_kinds.empty()) {
    std::vector<std::string> kinds;
    for (const auto kind : slot.allowed_actuator_kinds) {
      kinds.push_back(controller::actuators::to_string(kind));
    }
    parts.push_back("kinds: " + join_text(kinds));
  }
  if (!slot.preferred_actuator_roles.empty()) {
    std::vector<std::string> roles;
    for (const auto role : slot.preferred_actuator_roles) {
      roles.push_back(controller::actuators::to_string(role));
    }
    parts.push_back("preferred roles: " + join_text(roles));
  }
  return join_text(parts);
}

std::string slot_constraints_text(const controller::templates::TemplateSlotDefinition& slot) {
  switch (slot.slot_kind) {
    case controller::templates::TemplateSlotKind::signal: {
      std::vector<std::string> signal_types;
      for (const auto type : slot.allowed_signal_types) {
        signal_types.push_back(controller::signals::to_string(type));
      }
      return signal_types.empty() ? std::string{} : "types: " + join_text(signal_types);
    }
    case controller::templates::TemplateSlotKind::actuator:
      return actuator_constraints_text(slot);
    case controller::templates::TemplateSlotKind::timer: {
      std::vector<std::string> timer_kinds;
      for (const auto kind : slot.allowed_timer_kinds) {
        timer_kinds.push_back(controller::timers::to_string(kind));
      }
      return timer_kinds.empty() ? std::string{} : "kinds: " + join_text(timer_kinds);
    }
    case controller::templates::TemplateSlotKind::alarm:
      return {};
  }
  return {};
}

std::string parameter_constraints_text(const controller::templates::TemplateParameterDefinition& parameter) {
  std::vector<std::string> parts;
  if (parameter.min_int64_value.has_value()) {
    parts.push_back("min " + std::to_string(*parameter.min_int64_value));
  }
  if (parameter.max_int64_value.has_value()) {
    parts.push_back("max " + std::to_string(*parameter.max_int64_value));
  }
  if (parameter.min_double_value.has_value()) {
    std::ostringstream stream;
    stream << "min " << *parameter.min_double_value;
    parts.push_back(stream.str());
  }
  if (parameter.max_double_value.has_value()) {
    std::ostringstream stream;
    stream << "max " << *parameter.max_double_value;
    parts.push_back(stream.str());
  }
  if (!parameter.allowed_string_values.empty()) {
    parts.push_back("allowed: " + join_text(parameter.allowed_string_values));
  }
  if (!parameter.unit.empty()) {
    parts.push_back("unit: " + parameter.unit);
  }
  return join_text(parts);
}

WebTemplateViewModel build_model(
    const controller::templates::TemplateCatalog& catalog,
    const controller::templates::TemplateDefinition* definition,
    const controller::templates::TemplateDraft* draft,
    const controller::templates::TemplatePreview* preview) {
  WebTemplateViewModel model;
  model.will_create_disabled = true;
  model.disabled_note = "Generated programs, rules and PID controllers are created disabled by default.";

  for (const auto& item : catalog.supported_templates) {
    std::size_t required_binding_count = 0U;
    std::size_t required_parameter_count = 0U;
    for (const auto& slot : item.slot_definitions) {
      required_binding_count += slot.required ? 1U : 0U;
    }
    for (const auto& parameter : item.parameter_definitions) {
      required_parameter_count += parameter.required ? 1U : 0U;
    }
    model.templates.push_back(TemplateSelectorOptionViewModel{
        controller::templates::to_string(item.kind),
        item.label,
        item.description,
        item.supervisory_only,
        required_binding_count,
        required_parameter_count,
    });
  }

  if (definition != nullptr) {
    model.selected_kind = controller::templates::to_string(definition->kind);
    model.selected_label = definition->label;
    model.description = definition->description;
    model.supervisory_only = definition->supervisory_only;
    if (definition->supervisory_only) {
      model.supervisory_note = "Supervisory-only template. Review carefully before any enable/start actions.";
    }
  }

  if (definition != nullptr && draft != nullptr) {
    for (const auto& slot : definition->slot_definitions) {
      const auto it = draft->bindings.find(slot.slot_id);
      const auto value = it == draft->bindings.end() ? std::string{} : it->second;
      model.binding_fields.push_back(TemplateBindingFieldViewModel{
          slot.slot_id,
          slot.label,
          slot_kind_text(slot.slot_kind),
          slot.required,
          slot.description,
          value,
          slot_constraints_text(slot),
          slot.required && value.empty(),
      });
    }
    for (const auto& parameter : definition->parameter_definitions) {
      const auto it = draft->parameters.find(parameter.parameter_id);
      model.parameter_fields.push_back(TemplateParameterFieldViewModel{
          parameter.parameter_id,
          parameter.label,
          parameter_type_text(parameter.type),
          parameter.required,
          parameter.description + (parameter_constraints_text(parameter).empty() ? std::string{} : " (" + parameter_constraints_text(parameter) + ")"),
          it == draft->parameters.end() ? std::string{} : parameter_value_text(it->second),
          parameter.required && it == draft->parameters.end(),
      });
    }
  }

  if (preview != nullptr) {
    model.preview_valid = preview->preview_valid;
    model.apply_allowed = preview->apply_allowed;
    model.warnings = preview->warnings;
    for (const auto& issue : preview->validation_issues) {
      model.issues.push_back(TemplateIssueViewModel{
          issue.path,
          issue.code,
          issue_severity_text(issue.severity),
          issue.message,
      });
    }
    for (const auto& program : preview->bundle_summary.generated_programs) {
      model.preview_artifacts.push_back(TemplateArtifactPreviewViewModel{"program", program.id, program.name, program.state_ids.empty() ? std::string{} : program.state_ids.front()});
    }
    for (const auto& rule : preview->bundle_summary.generated_rules) {
      model.preview_artifacts.push_back(TemplateArtifactPreviewViewModel{"rule", rule.id, rule.name, rule.description});
    }
    for (const auto& alarm : preview->bundle_summary.generated_alarms) {
      model.preview_artifacts.push_back(TemplateArtifactPreviewViewModel{"alarm", alarm.id, alarm.name, alarm.description});
    }
    for (const auto& pid : preview->bundle_summary.generated_pids) {
      model.preview_artifacts.push_back(TemplateArtifactPreviewViewModel{"pid", pid.id, pid.name, pid.pv_signal_path});
    }
  }

  return model;
}

}  // namespace

WebTemplateAdapter::WebTemplateAdapter(TemplateApiService& api_service) : api_service_(api_service) {}

TemplateViewResponse<WebTemplateViewModel> WebTemplateAdapter::load_template_catalog(ApiTimestampMs now_ms) const {
  TemplateViewResponse<WebTemplateViewModel> response;
  const auto catalog = api_service_.get_template_catalog(now_ms);
  response.success = catalog.ok();
  response.code = catalog.status.code;
  response.message = catalog.status.message;
  response.refresh_timestamp_ms = now_ms;
  if (catalog.value.has_value()) {
    response.value = build_model(*catalog.value, nullptr, nullptr, nullptr);
  }
  return response;
}

TemplateViewResponse<WebTemplateViewModel> WebTemplateAdapter::load_template_schema(controller::templates::TemplateKind kind, ApiTimestampMs now_ms) const {
  TemplateViewResponse<WebTemplateViewModel> response;
  const auto catalog = api_service_.get_template_catalog(now_ms);
  const auto schema = api_service_.get_template_schema(kind, now_ms);
  response.success = catalog.ok() && schema.ok();
  response.code = schema.status.code;
  response.message = schema.status.message;
  response.refresh_timestamp_ms = now_ms;
  if (catalog.value.has_value() && schema.value.has_value()) {
    const auto draft = api_service_.create_template_draft(kind);
    response.value = build_model(*catalog.value, &schema.value->definition, draft.value ? &*draft.value : nullptr, nullptr);
  }
  return response;
}

TemplateViewResponse<WebTemplateViewModel> WebTemplateAdapter::preview_template(const TemplateDraftDto& draft, ApiTimestampMs now_ms) const {
  TemplateViewResponse<WebTemplateViewModel> response;
  const auto catalog = api_service_.get_template_catalog(now_ms);
  const auto schema = api_service_.get_template_schema(draft.template_kind, now_ms);
  const auto preview = api_service_.preview_template_draft(draft, now_ms);
  response.success = preview.ok();
  response.code = preview.status.code;
  response.message = preview.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = preview.status.validation_issues;
  if (catalog.value.has_value() && schema.value.has_value()) {
    response.value = build_model(*catalog.value, &schema.value->definition, &draft, preview.value ? &*preview.value : nullptr);
  }
  return response;
}

TemplateApplyDto WebTemplateAdapter::apply_template(const TemplateDraftDto& draft, const CommandContext& context) {
  return api_service_.apply_template_draft(draft, context);
}

}  // namespace controller::api
