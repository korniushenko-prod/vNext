# config-studio

Initial vNext authoring application shell migrated from `universal_plc`.

## Current state
- static HTML/CSS/JS baseline lives in `public/`
- this is a migration checkpoint, not the final modular app structure
- canonical shared contracts already live in `/packages`

## Next migration steps
- start replacing inline model/types logic with imports aligned to shared packages
- split project model, materialization, and app surface concerns
- keep runtime integration out of the app layer
