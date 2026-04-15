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
    settings: "/settings",
    signalDefinition: "/signal-definition",
    signalDelete: "/signal-delete",
    channelBinding: "/channel-binding",
    channelDelete: "/channel-delete",
    sequenceDefinition: "/sequence",
    sequenceDelete: "/sequence-delete",
    sequenceReset: "/sequence-reset",
    sequenceState: "/sequence-state",
    sequenceStateDelete: "/sequence-state-delete",
    sequenceTransition: "/sequence-transition",
    sequenceTransitionDelete: "/sequence-transition-delete",
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
