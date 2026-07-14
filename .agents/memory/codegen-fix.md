---
name: Codegen fix — Orval index.ts conflict
description: Orval regenerates the barrel index file with duplicate exports; how to prevent it.
---

## Problem
Orval (zod client, split mode) regenerates `lib/api-zod/src/index.ts` on every codegen run, adding:
```
export * from './generated/api';
export * from './generated/types';
```
This causes TS2308 because `ListMessagesParams` (and others) are exported both as a Zod const (from `api.ts`) and a TypeScript type (from `types/`).

## Fix
The codegen script in `lib/api-spec/package.json` uses `printf` to overwrite the file immediately after Orval runs:
```json
"codegen": "orval --config ./orval.config.ts && printf 'export * from \"./generated/api\";\\n' > ../api-zod/src/index.ts && pnpm -w run typecheck:libs"
```

**Why:** Orval always regenerates the barrel. Writing the file after Orval (not before) ensures the correct content survives.
**How to apply:** Any time the codegen script is changed or Orval is upgraded, verify this printf step is still present.
