#include "web/web_asset_registry.hpp"

#include <array>
#include <cstring>

#include "web/web_assets_generated.inc"

namespace controller::web {

namespace {

struct AssetRecord {
  const char* path;
  WebAsset asset;
};

constexpr std::size_t asset_size(const char* text) {
  return std::char_traits<char>::length(text);
}

constexpr std::array<AssetRecord, 9U> kAssets{{
    {"/", {"text/html; charset=utf-8", kDashboardHtml, asset_size(kDashboardHtml)}},
    {"/dashboard.css", {"text/css; charset=utf-8", kDashboardCss, asset_size(kDashboardCss)}},
    {"/dashboard.js", {"application/javascript; charset=utf-8", kDashboardJs, asset_size(kDashboardJs)}},
    {"/flow", {"text/html; charset=utf-8", kFlowHtml, asset_size(kFlowHtml)}},
    {"/flow.css", {"text/css; charset=utf-8", kFlowCss, asset_size(kFlowCss)}},
    {"/flow.js", {"application/javascript; charset=utf-8", kFlowJs, asset_size(kFlowJs)}},
    {"/rules", {"text/html; charset=utf-8", kRulesHtml, asset_size(kRulesHtml)}},
    {"/rules.css", {"text/css; charset=utf-8", kRulesCss, asset_size(kRulesCss)}},
    {"/rules.js", {"application/javascript; charset=utf-8", kRulesJs, asset_size(kRulesJs)}},
}};

}  // namespace

std::optional<WebAsset> WebAssetRegistry::find(const std::string_view path) {
  const auto normalized = path == "/index.html" ? std::string_view{"/"} : path;
  for (const auto& record : kAssets) {
    if (normalized == record.path) {
      return record.asset;
    }
  }
  return std::nullopt;
}

}  // namespace controller::web
