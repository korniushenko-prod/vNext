#pragma once

#include <optional>
#include <string_view>

#include "web/web_types.hpp"

namespace controller::web {

class WebAssetRegistry {
 public:
  static std::optional<WebAsset> find(std::string_view path);
};

}  // namespace controller::web
