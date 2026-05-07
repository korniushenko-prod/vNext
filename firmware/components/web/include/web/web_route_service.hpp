#pragma once

#include <functional>
#include <string>

#include "api/api_types.hpp"
#include "api/web_dashboard_adapter.hpp"
#include "api/web_flow_adapter.hpp"
#include "api/web_rules_adapter.hpp"
#include "esp_http_server.h"
#include "web/web_result.hpp"
#include "web/web_types.hpp"

namespace controller::web {

struct WebRouteDependencies {
  controller::api::WebDashboardAdapter* dashboard_adapter{nullptr};
  controller::api::WebFlowAdapter* flow_adapter{nullptr};
  controller::api::WebRulesAdapter* rules_adapter{nullptr};
  std::function<controller::api::ApiTimestampMs()> now_ms_fn;
};

class WebRouteService {
 public:
  WebRouteService(WebServerConfig config, WebRouteDependencies dependencies);

  bool start(std::string& error_message);
  void stop();
  bool started() const;

 private:
  static esp_err_t handle_asset(httpd_req_t* req);
  static esp_err_t handle_dashboard_data(httpd_req_t* req);
  static esp_err_t handle_dashboard_start(httpd_req_t* req);
  static esp_err_t handle_dashboard_stop(httpd_req_t* req);
  static esp_err_t handle_dashboard_trip(httpd_req_t* req);
  static esp_err_t handle_dashboard_reset(httpd_req_t* req);
  static esp_err_t handle_flow_route(httpd_req_t* req);
  static esp_err_t handle_rules_route(httpd_req_t* req);

  esp_err_t serve_asset(httpd_req_t* req) const;
  esp_err_t serve_dashboard_data(httpd_req_t* req) const;
  esp_err_t serve_dashboard_start(httpd_req_t* req) const;
  esp_err_t serve_dashboard_stop(httpd_req_t* req) const;
  esp_err_t serve_dashboard_trip(httpd_req_t* req) const;
  esp_err_t serve_dashboard_reset(httpd_req_t* req) const;
  esp_err_t serve_flow_route(httpd_req_t* req) const;
  esp_err_t serve_rules_route(httpd_req_t* req) const;

  esp_err_t send_result(httpd_req_t* req, const WebResult& result) const;

  WebServerConfig config_;
  WebRouteDependencies dependencies_;
  httpd_handle_t server_{nullptr};
};

}  // namespace controller::web
