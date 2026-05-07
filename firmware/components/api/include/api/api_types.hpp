#pragma once

#include <cstdint>
#include <optional>
#include <string>

namespace controller::api {

using ApiTimestampMs = std::uint64_t;
using ApiHistoryLimit = std::int32_t;

constexpr ApiHistoryLimit kDefaultHistoryLimit = 50;

struct CommandContext {
  ApiTimestampMs now_ms{0U};
  std::string source;
  std::string reason;
  std::optional<std::string> actor;
};

}  // namespace controller::api
