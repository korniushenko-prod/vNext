#pragma once

#include <string>

namespace controller::web {

struct WebResult {
  int http_status{200};
  const char* content_type{"application/json; charset=utf-8"};
  std::string body;
};

}  // namespace controller::web
