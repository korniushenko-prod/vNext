#include "api/web_program_builder_adapter.hpp"

#include <algorithm>
#include <sstream>
#include <utility>

namespace controller::api {

namespace {

bool has_text(const std::string& value) {
  return !value.empty();
}

std::string signal_type_text(const controller::signals::SignalType type) {
  return controller::signals::to_string(type);
}

std::string actuator_kind_text(const controller::actuators::ActuatorTargetKind kind) {
  return controller::actuators::to_string(kind);
}

std::string actuator_role_text(const controller::actuators::ActuatorRole role) {
  return controller::actuators::to_string(role);
}

std::string sequence_type_text(const controller::sequence::SequenceProgramType type) {
  return controller::sequence::to_string(type);
}

std::string sequence_state_type_text(const controller::sequence::SequenceStateType type) {
  return controller::sequence::to_string(type);
}

std::string severity_text(const controller::sequence::ProgramBuilderIssueSeverity severity) {
  return controller::sequence::to_string(severity);
}

std::string skeleton_kind_text(const controller::sequence::ProgramSkeletonKind kind) {
  return controller::sequence::to_string(kind);
}

std::string parameter_type_text(const controller::sequence::ProgramBuilderParameterType type) {
  return controller::sequence::to_string(type);
}

std::string parameter_value_text(const controller::sequence::ProgramBuilderParameterValue& value) {
  return std::visit(
      [](const auto& candidate) -> std::string {
        std::ostringstream stream;
        stream << candidate;
        return stream.str();
      },
      value);
}

std::string join_items(const std::vector<std::string>& items) {
  std::ostringstream stream;
  for (std::size_t index = 0; index < items.size(); ++index) {
    if (index != 0U) {
      stream << ", ";
    }
    stream << items[index];
  }
  return stream.str();
}

const controller::sequence::ProgramSkeletonCatalogEntry* find_definition(
    const controller::sequence::ProgramBuilderCatalog& catalog,
    const controller::sequence::ProgramSkeletonKind kind) {
  for (const auto& definition : catalog.supported_skeletons) {
    if (definition.kind == kind) {
      return &definition;
    }
  }
  return nullptr;
}

std::vector<ProgramBuilderIssueViewModel> map_issue_view_models(
    const std::vector<ProgramBuilderIssueDto>& issues) {
  std::vector<ProgramBuilderIssueViewModel> mapped;
  mapped.reserve(issues.size());
  for (const auto& issue : issues) {
    mapped.push_back(ProgramBuilderIssueViewModel{
        issue.path,
        issue.code,
        severity_text(issue.severity),
        issue.message,
        issue.severity == controller::sequence::ProgramBuilderIssueSeverity::error,
    });
  }
  return mapped;
}

std::string signal_constraints(const controller::sequence::ProgramBuilderSignalSlotDefinition& slot) {
  std::vector<std::string> items;
  for (const auto type : slot.allowed_types) {
    items.push_back(signal_type_text(type));
  }
  return join_items(items);
}

std::string actuator_constraints(const controller::sequence::ProgramBuilderActuatorSlotDefinition& slot) {
  std::vector<std::string> items;
  for (const auto kind : slot.allowed_kinds) {
    items.push_back(actuator_kind_text(kind));
  }
  for (const auto role : slot.allowed_roles) {
    items.push_back(actuator_role_text(role));
  }
  if (slot.allow_generic_role_fallback) {
    items.push_back("generic role allowed");
  }
  return join_items(items);
}

std::string parameter_range_text(const controller::sequence::ProgramBuilderParameterDefinition& parameter) {
  std::vector<std::string> items;
  if (parameter.min_int64_value.has_value()) {
    items.push_back(">=" + std::to_string(*parameter.min_int64_value));
  }
  if (parameter.max_int64_value.has_value()) {
    items.push_back("<=" + std::to_string(*parameter.max_int64_value));
  }
  if (parameter.min_double_value.has_value()) {
    std::ostringstream stream;
    stream << ">=" << *parameter.min_double_value;
    items.push_back(stream.str());
  }
  if (parameter.max_double_value.has_value()) {
    std::ostringstream stream;
    stream << "<=" << *parameter.max_double_value;
    items.push_back(stream.str());
  }
  if (!parameter.unit.empty()) {
    items.push_back(parameter.unit);
  }
  return join_items(items);
}

std::vector<std::string> matching_signal_options(
    const ProgramBuilderCatalogDto& catalog,
    const controller::sequence::ProgramBuilderSignalSlotDefinition& slot) {
  std::vector<std::string> options;
  for (const auto& signal : catalog.signals) {
    if (!slot.allowed_types.empty() &&
        std::find(slot.allowed_types.begin(), slot.allowed_types.end(), signal.type) == slot.allowed_types.end()) {
      continue;
    }
    options.push_back(signal.path + " (" + signal_type_text(signal.type) + ")");
  }
  return options;
}

std::vector<std::string> matching_actuator_options(
    const ProgramBuilderCatalogDto& catalog,
    const controller::sequence::ProgramBuilderActuatorSlotDefinition& slot) {
  std::vector<std::string> options;
  for (const auto& actuator : catalog.actuators) {
    if (!slot.allowed_kinds.empty() &&
        std::find(slot.allowed_kinds.begin(), slot.allowed_kinds.end(), actuator.kind) == slot.allowed_kinds.end()) {
      continue;
    }

    const auto role_it = std::find(slot.allowed_roles.begin(), slot.allowed_roles.end(), actuator.role);
    const bool allow_generic =
        slot.allow_generic_role_fallback && actuator.role == controller::actuators::ActuatorRole::generic;
    if (!slot.allowed_roles.empty() && role_it == slot.allowed_roles.end() && !allow_generic) {
      continue;
    }

    options.push_back(
        actuator.id + " (" + actuator_kind_text(actuator.kind) + ", " + actuator_role_text(actuator.role) + ")");
  }
  return options;
}

template <typename EntryType>
std::vector<std::string> named_catalog_options(const std::vector<EntryType>& entries) {
  std::vector<std::string> options;
  options.reserve(entries.size());
  for (const auto& entry : entries) {
    options.push_back(entry.id + (entry.name.empty() ? std::string{} : " (" + entry.name + ")"));
  }
  return options;
}

}  // namespace

WebProgramBuilderAdapter::WebProgramBuilderAdapter(ProgramBuilderApiService& api_service) : api_service_(api_service) {}

ProgramBuilderViewResponse<WebProgramBuilderViewModel> WebProgramBuilderAdapter::load_builder_catalog(
    const ApiTimestampMs now_ms) const {
  const auto catalog = api_service_.get_builder_catalog(now_ms);
  if (!catalog.ok()) {
    return make_error(catalog.status.code, catalog.status.message, now_ms, catalog.status.validation_issues);
  }

  const auto draft = api_service_.create_empty_draft(controller::sequence::ProgramSkeletonKind::custom_blank);
  if (!draft.ok()) {
    return make_error(draft.status.code, draft.status.message, now_ms, draft.status.validation_issues);
  }

  ProgramBuilderWizardSourceData source;
  source.catalog = *catalog.value;
  source.draft = *draft.value;

  ProgramBuilderViewResponse<WebProgramBuilderViewModel> response;
  response.success = true;
  response.code = ProgramBuilderUiResultCode::builder_ui_ok;
  response.message = "Program builder catalog loaded.";
  response.refresh_timestamp_ms = now_ms;
  response.value = build_view_model(source);
  return response;
}

ProgramBuilderViewResponse<WebProgramBuilderViewModel> WebProgramBuilderAdapter::new_draft(
    const controller::sequence::ProgramSkeletonKind skeleton_kind,
    const ApiTimestampMs now_ms) const {
  const auto catalog = api_service_.get_builder_catalog(now_ms);
  if (!catalog.ok()) {
    return make_error(catalog.status.code, catalog.status.message, now_ms, catalog.status.validation_issues);
  }

  const auto draft = api_service_.create_empty_draft(skeleton_kind);
  if (!draft.ok()) {
    return make_error(draft.status.code, draft.status.message, now_ms, draft.status.validation_issues);
  }

  ProgramBuilderWizardSourceData source;
  source.catalog = *catalog.value;
  source.draft = *draft.value;

  ProgramBuilderViewResponse<WebProgramBuilderViewModel> response;
  response.success = true;
  response.code = ProgramBuilderUiResultCode::builder_ui_ok;
  response.message = "Program builder draft initialized.";
  response.refresh_timestamp_ms = now_ms;
  response.value = build_view_model(source);
  return response;
}

ProgramBuilderViewResponse<WebProgramBuilderViewModel> WebProgramBuilderAdapter::preview_draft(
    const ProgramBuilderDraftDto& draft,
    const ApiTimestampMs now_ms) const {
  const auto catalog = api_service_.get_builder_catalog(now_ms);
  if (!catalog.ok()) {
    return make_error(catalog.status.code, catalog.status.message, now_ms, catalog.status.validation_issues);
  }

  const auto preview = api_service_.preview_draft(draft, now_ms);
  ProgramBuilderWizardSourceData source;
  source.catalog = *catalog.value;
  source.draft = draft;
  source.preview = preview.value;

  ProgramBuilderViewResponse<WebProgramBuilderViewModel> response;
  response.success = preview.status.ok();
  response.code = preview.status.code;
  response.message = preview.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = preview.status.validation_issues;
  response.value = build_view_model(source);
  return response;
}

WebProgramBuilderCreateResponse WebProgramBuilderAdapter::create_program(
    const ProgramBuilderDraftDto& draft,
    const CommandContext& context) {
  const auto catalog = api_service_.get_builder_catalog(context.now_ms);
  ProgramBuilderWizardSourceData source;
  source.draft = draft;
  if (catalog.ok()) {
    source.catalog = *catalog.value;
  }

  const auto created = api_service_.create_program_from_draft(draft, context);
  source.preview = created.preview;

  WebProgramBuilderCreateResponse response;
  response.accepted = created.accepted;
  response.code = created.status.code;
  response.message = created.status.message;
  response.refresh_timestamp_ms = context.now_ms;
  response.created_program = created.created_program;
  response.validation_issues = created.status.validation_issues;
  if (catalog.ok()) {
    response.value = build_view_model(source);
  }
  return response;
}

WebProgramBuilderViewModel WebProgramBuilderAdapter::build_view_model(const ProgramBuilderWizardSourceData& source) {
  WebProgramBuilderViewModel view_model;
  view_model.skeleton_kind = skeleton_kind_text(source.draft.skeleton_kind);
  view_model.program_type = sequence_type_text(source.draft.program_type);
  view_model.will_create_disabled = true;
  view_model.create_disabled_note = "Created programs are disabled by default in Stage 20 and do not auto-start.";
  view_model.advanced_editor_note = "Custom state editing and output matrix editing arrive in later stages.";

  for (const auto& skeleton : source.catalog.supported_skeletons) {
    std::size_t required_binding_count = 0U;
    std::size_t required_parameter_count = 0U;
    for (const auto& slot : skeleton.signal_slots) {
      required_binding_count += slot.required ? 1U : 0U;
    }
    for (const auto& slot : skeleton.actuator_slots) {
      required_binding_count += slot.required ? 1U : 0U;
    }
    for (const auto& slot : skeleton.timer_slots) {
      required_binding_count += slot.required ? 1U : 0U;
    }
    for (const auto& slot : skeleton.alarm_slots) {
      required_binding_count += slot.required ? 1U : 0U;
    }
    for (const auto& parameter : skeleton.parameter_slots) {
      required_parameter_count += parameter.required ? 1U : 0U;
    }

    view_model.skeleton_options.push_back(ProgramBuilderSkeletonOptionViewModel{
        skeleton_kind_text(skeleton.kind),
        skeleton.label,
        skeleton.description,
        sequence_type_text(skeleton.default_program_type),
        required_binding_count,
        required_parameter_count,
    });
  }

  const auto* definition = find_definition(source.catalog, source.draft.skeleton_kind);
  if (definition != nullptr) {
    view_model.skeleton_label = definition->label;
    for (const auto& slot : definition->signal_slots) {
      const auto it = source.draft.signal_bindings.find(slot.slot_name);
      const auto value = it == source.draft.signal_bindings.end() ? std::string{} : it->second;
      view_model.binding_fields.push_back(ProgramBuilderBindingFieldViewModel{
          slot.slot_name,
          slot.label,
          "signal",
          slot.required,
          slot.description,
          value,
          signal_constraints(slot),
          matching_signal_options(source.catalog, slot),
          slot.required && value.empty(),
      });
    }
    for (const auto& slot : definition->actuator_slots) {
      const auto it = source.draft.actuator_bindings.find(slot.slot_name);
      const auto value = it == source.draft.actuator_bindings.end() ? std::string{} : it->second;
      view_model.binding_fields.push_back(ProgramBuilderBindingFieldViewModel{
          slot.slot_name,
          slot.label,
          "actuator",
          slot.required,
          slot.description,
          value,
          actuator_constraints(slot),
          matching_actuator_options(source.catalog, slot),
          slot.required && value.empty(),
      });
    }
    for (const auto& slot : definition->timer_slots) {
      const auto it = source.draft.timer_bindings.find(slot.slot_name);
      const auto value = it == source.draft.timer_bindings.end() ? std::string{} : it->second;
      view_model.binding_fields.push_back(ProgramBuilderBindingFieldViewModel{
          slot.slot_name,
          slot.label,
          "timer",
          slot.required,
          slot.description,
          value,
          "registered timer id",
          named_catalog_options(source.catalog.timers),
          slot.required && value.empty(),
      });
    }
    for (const auto& slot : definition->alarm_slots) {
      const auto it = source.draft.alarm_bindings.find(slot.slot_name);
      const auto value = it == source.draft.alarm_bindings.end() ? std::string{} : it->second;
      view_model.binding_fields.push_back(ProgramBuilderBindingFieldViewModel{
          slot.slot_name,
          slot.label,
          "alarm",
          slot.required,
          slot.description,
          value,
          "registered alarm id",
          named_catalog_options(source.catalog.alarms),
          slot.required && value.empty(),
      });
    }
    for (const auto& parameter : definition->parameter_slots) {
      const auto it = source.draft.parameters.find(parameter.parameter_name);
      const auto has_value = it != source.draft.parameters.end();
      view_model.parameter_fields.push_back(ProgramBuilderParameterFieldViewModel{
          parameter.parameter_name,
          parameter.label,
          parameter_type_text(parameter.type),
          parameter.required,
          parameter.description,
          has_value ? parameter_value_text(it->second) : "",
          parameter_range_text(parameter),
          parameter.required && !has_value,
      });
    }
  }

  if (source.preview.has_value()) {
    view_model.preview_valid = source.preview->generated_program.has_value();
    view_model.create_allowed = source.preview->generated_program.has_value();
    view_model.warnings = source.preview->required_review_warnings;
    view_model.issues = map_issue_view_models(source.preview->validation_issues);
    for (const auto& state : source.preview->generated_states) {
      view_model.preview_states.push_back(ProgramBuilderPreviewStateViewModel{
          state.state_id,
          state.state_name,
          sequence_state_type_text(state.type),
          state.non_skippable,
          state.active_binding_slots.empty() ? "No active outputs in this stage" : join_items(state.active_binding_slots),
      });
    }
    for (const auto& transition : source.preview->generated_transitions) {
      std::string line = transition.source_state_id + " -> " + transition.target_state_id;
      if (transition.require_min_time_done) {
        line += " (min-time review gate)";
      }
      if (transition.placeholder) {
        line += " placeholder";
      }
      view_model.preview_transitions.push_back(std::move(line));
    }
  }

  return view_model;
}

ProgramBuilderViewResponse<WebProgramBuilderViewModel> WebProgramBuilderAdapter::make_error(
    const ProgramBuilderUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms,
    std::vector<ProgramBuilderIssueDto> validation_issues) {
  ProgramBuilderViewResponse<WebProgramBuilderViewModel> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = std::move(validation_issues);
  return response;
}

}  // namespace controller::api
