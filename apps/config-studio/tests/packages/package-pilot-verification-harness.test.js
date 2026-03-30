const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const workspaceRoot = path.resolve(__dirname, "../../../../");
let workspaceModulesPromise;

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
}

function importWorkspaceModule(relativePath) {
  return import(pathToFileURL(path.join(workspaceRoot, relativePath)).href);
}

async function loadWorkspaceModules() {
  if (!workspaceModulesPromise) {
    workspaceModulesPromise = Promise.all([
      importWorkspaceModule("packages/materializer-core/dist/src/index.js"),
      importWorkspaceModule("targets/esp32-target-adapter/dist/src/index.js")
    ]).then(([materializer, targetAdapter]) => ({
      materializeProject: materializer.materializeProject,
      emitShipControllerConfigArtifact: targetAdapter.emitShipControllerConfigArtifact,
      createEsp32TargetAdapter: targetAdapter.createEsp32TargetAdapter
    }));
  }

  return workspaceModulesPromise;
}

function materialize(modules, project, generatedAt) {
  const result = modules.materializeProject(project, {
    pack_id: "pump-skid-supervisor-verification-pack",
    generated_at: generatedAt
  });

  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
  return result.pack;
}

function normalizeReadback(snapshot) {
  return sortJson({
    ...snapshot,
    request_id: "__normalized__"
  });
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce((accumulator, key) => {
        accumulator[key] = sortJson(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function collectChangedPaths(left, right, basePath = "$") {
  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLength = Math.max(left.length, right.length);
    const paths = [];
    for (let index = 0; index < maxLength; index += 1) {
      paths.push(...collectChangedPaths(left[index], right[index], `${basePath}[${index}]`));
    }
    return paths;
  }

  if (left && right && typeof left === "object" && typeof right === "object") {
    const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort((a, b) => a.localeCompare(b));
    const paths = [];
    for (const key of keys) {
      paths.push(...collectChangedPaths(left[key], right[key], `${basePath}.${key}`));
    }
    return paths;
  }

  return JSON.stringify(left) === JSON.stringify(right) ? [] : [basePath];
}

test("pilot verification harness keeps fresh deploy, no-op reapply, diff rules, and reboot-style restore explicit", async () => {
  const modules = await loadWorkspaceModules();
  const baseProject = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.project.e2e.json");
  const basePack = materialize(modules, structuredClone(baseProject), "2026-03-30T00:00:00Z");
  const baseArtifact = modules.emitShipControllerConfigArtifact(basePack);
  const adapter = modules.createEsp32TargetAdapter();

  const freshApply = await adapter.apply({
    request_id: "verification-fresh-apply",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: basePack.pack_id,
      schema_version: basePack.schema_version
    },
    options: {
      runtime_pack: basePack
    }
  });
  const freshReadback = await adapter.readback({
    request_id: "verification-fresh-readback",
    adapter_id: adapter.manifest.id,
    target_id: "esp32.shipcontroller.v1",
    scope: "full"
  });

  assert.equal(freshApply.success, true);
  assert.match(freshApply.artifacts.shipcontroller_config.meta.checksum_sha256, /^[a-f0-9]{64}$/);
  assert.equal(
    freshApply.artifacts.shipcontroller_config.meta.checksum_sha256,
    freshReadback.resources.apply_status.checksum_sha256
  );
  assert.equal(freshReadback.resources.apply_status.config_version, "2026-03-30T00:00:00Z");

  const noopApply = await adapter.apply({
    request_id: "verification-noop-apply",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: basePack.pack_id,
      schema_version: basePack.schema_version
    },
    options: {
      runtime_pack: basePack
    }
  });
  const noopReadback = await adapter.readback({
    request_id: "verification-noop-readback",
    adapter_id: adapter.manifest.id,
    target_id: "esp32.shipcontroller.v1",
    scope: "full"
  });

  assert.equal(noopApply.success, true);
  assert.equal(
    noopApply.artifacts.shipcontroller_config.meta.checksum_sha256,
    freshApply.artifacts.shipcontroller_config.meta.checksum_sha256
  );
  assert.deepEqual(normalizeReadback(noopReadback), normalizeReadback(freshReadback));

  const explicitParamProject = structuredClone(baseProject);
  explicitParamProject.system.packages.pump_skid_supervisor_1.member_overrides.run_hours_1.param_values.persist_period_s.value = 45;
  const explicitParamPack = materialize(modules, explicitParamProject, "2026-03-30T00:05:00Z");
  const explicitParamArtifact = modules.emitShipControllerConfigArtifact(explicitParamPack);
  const explicitParamDiff = collectChangedPaths(baseArtifact, explicitParamArtifact);

  assert.ok(explicitParamDiff.includes("$.artifacts.run_hours_counters[0].persist_period_s"));

  const explicitParamApply = await adapter.apply({
    request_id: "verification-explicit-param-apply",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: explicitParamPack.pack_id,
      schema_version: explicitParamPack.schema_version
    },
    options: {
      runtime_pack: explicitParamPack
    }
  });

  assert.equal(explicitParamApply.success, true);
  assert.notEqual(
    explicitParamApply.artifacts.shipcontroller_config.meta.checksum_sha256,
    freshApply.artifacts.shipcontroller_config.meta.checksum_sha256
  );
  assert.equal(explicitParamApply.artifacts.shipcontroller_config.meta.config_version, "2026-03-30T00:05:00Z");

  const templateDerivedProject = structuredClone(baseProject);
  delete templateDerivedProject.system.packages.pump_skid_supervisor_1.member_overrides.maintenance_counter_1.param_values.warning_before;
  templateDerivedProject.definitions.templates.maintenance_pilot_template.defaults.param_values.warning_before.value = 120;
  const templateDerivedPack = materialize(modules, templateDerivedProject, "2026-03-30T00:10:00Z");
  const templateDerivedArtifact = modules.emitShipControllerConfigArtifact(templateDerivedPack);
  const templateDerivedDiff = collectChangedPaths(baseArtifact, templateDerivedArtifact);

  assert.ok(templateDerivedDiff.includes("$.artifacts.maintenance_counters[0].warning_before"));

  const templateDerivedApply = await adapter.apply({
    request_id: "verification-template-derived-apply",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: templateDerivedPack.pack_id,
      schema_version: templateDerivedPack.schema_version
    },
    options: {
      runtime_pack: templateDerivedPack
    }
  });
  const templateDerivedReadback = await adapter.readback({
    request_id: "verification-template-derived-readback",
    adapter_id: adapter.manifest.id,
    target_id: "esp32.shipcontroller.v1",
    scope: "full"
  });

  assert.equal(templateDerivedApply.success, true);
  assert.equal(templateDerivedApply.artifacts.shipcontroller_config.meta.config_version, "2026-03-30T00:10:00Z");
  assert.ok(Object.keys(templateDerivedPack.persistence_slots).length > 0);

  const rebootRestoredAdapter = modules.createEsp32TargetAdapter();
  const restoredApply = await rebootRestoredAdapter.apply({
    request_id: "verification-reboot-restore-apply",
    adapter_id: rebootRestoredAdapter.manifest.id,
    pack: {
      pack_id: templateDerivedPack.pack_id,
      schema_version: templateDerivedPack.schema_version
    },
    options: {
      runtime_pack: templateDerivedPack
    }
  });
  const restoredReadback = await rebootRestoredAdapter.readback({
    request_id: "verification-reboot-readback",
    adapter_id: rebootRestoredAdapter.manifest.id,
    target_id: "esp32.shipcontroller.v1",
    scope: "full"
  });

  assert.equal(restoredApply.success, true);
  assert.equal(
    restoredApply.artifacts.shipcontroller_config.meta.checksum_sha256,
    templateDerivedApply.artifacts.shipcontroller_config.meta.checksum_sha256
  );
  assert.deepEqual(normalizeReadback(restoredReadback), normalizeReadback(templateDerivedReadback));
});
