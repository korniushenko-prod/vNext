#pragma once

#include <cstddef>
#include <cstdint>

namespace controller::web {

struct WebServerConfig {
  bool enabled{false};
  bool rules_read_only{true};
  bool bench_mode{false};
  std::uint16_t port{80U};
};

struct WebAsset {
  const char* content_type{nullptr};
  const char* data{nullptr};
  std::size_t size{0U};
};

}  // namespace controller::web
