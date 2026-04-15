"use strict";

(() => {
  const endpoints = Object.freeze({
    runtime: "/runtime",
    boards: "/boards",
    hardware: "/hardware",
    channels: "/channels",
    signals: "/signals",
    blocks: "/blocks",
    display: "/display",
    alarms: "/alarms",
    sequences: "/sequences",
    buses: "/buses",
    devices: "/devices",
    externalResources: "/external-resources",
    status: "/status",
    diagnostics: "/diagnostics",
    inspector: "/inspector",
    chip: "/chip",
    templateLibrary: "/template-library",
    templateSelection: "/template-selection",
    templateDelete: "/template-delete",
    builtInTemplate: "/template"
  });

  function endpoint(name) {
    return endpoints[name] || name;
  }

  window.SHIP_API = Object.freeze({
    endpoints,
    endpoint
  });
})();
