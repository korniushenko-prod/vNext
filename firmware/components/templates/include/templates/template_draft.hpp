#pragma once

#include <cstddef>
#include <map>
#include <optional>
#include <string>

#include "templates/template_binding.hpp"
#include "templates/template_parameter.hpp"
#include "templates/template_types.hpp"

namespace controller::templates {

struct TemplateDraft {
  std::string instance_id;
  TemplateKind template_kind{TemplateKind::pressure_pump};
  std::string display_name;
  TemplateBindingMap bindings;
  std::map<std::string, TemplateParameterValue> parameters;
  bool create_disabled{true};
  std::optional<std::string> notes;
};

struct TemplateDraftSummary {
  TemplateKind template_kind{TemplateKind::pressure_pump};
  std::string instance_id;
  std::string display_name;
  std::size_t required_binding_count{0U};
  std::size_t bound_binding_count{0U};
  std::size_t required_parameter_count{0U};
  std::size_t provided_parameter_count{0U};
  bool supervisory_only{false};
};

}  // namespace controller::templates
