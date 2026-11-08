Execute the Pixel Forge IDE AI-Gen workflow defined in `skills/pixel-forge-ai-gen/SKILL.md`:

1. If the prompt contains a `register-unit` command or `REGISTER_SPEC_JSON` block, run `python scripts/pixel-forge.py register-unit ...` to register/update `forge-roster.json` and create the `raw_ai` folder.
2. Generate all requested `#00FF00` chroma-key PNG plates (`<slug>_idle_f0.png`, etc.) and save them into the hero's `rawAiDir` directory (`public/assets/pixel-forge/...`).
3. Run `python scripts/pixel-forge.py build-unit --unit "<unit-id>"` and confirm `[PASS 100/100]` so `public/assets/pixel-forge/batch-manifest.json` updates its `buildRevision` and hot-reloads on the open Web Studio UI.
