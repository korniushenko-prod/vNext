# PumpSkid v1 Deploy / Apply / Readback Harness

## Goal

Provide one repeatable bounded harness for the controlled pilot bundle.

## Canonical Inputs

- project:
  `docs/pilot/pumpskid-v1-controlled-pilot.project.json`
- artifact:
  `docs/pilot/pumpskid-v1-controlled-pilot.artifact.json`
- readback:
  `docs/pilot/pumpskid-v1-controlled-pilot.readback.json`

## Repo Harness Commands

From the repository root:

```powershell
& 'C:\Program Files\nodejs\corepack.cmd' pnpm --filter @universal-plc/config-studio run check
```

Focused rollout harness:

```powershell
Set-Location 'apps/config-studio'
& 'C:\Program Files\nodejs\node.exe' --test --test-isolation=none tests/packages/package-controlled-pilot-rollout.test.js
```

Target-side bounded apply/readback path:

```powershell
Set-Location 'targets/esp32-target-adapter'
& 'C:\Program Files\nodejs\node.exe' --test --test-isolation=none dist/tests/pilot-deploy-readback.test.js
```

## Expected Result

- rematerialized pack stays compatible with the frozen pilot path
- emitted artifact matches the canonical artifact file
- apply succeeds in the bounded adapter lane
- readback matches the canonical readback package after normalization of request id

## Bench Execution Note

For physical bench execution, the same project/artifact/readback triplet must be
used as the operator-facing source of truth. Any divergence must be recorded
before rerunning.
