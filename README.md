# Sourcebook

Sourcebook is an agent skill that generates Markdown documentation for an application, library, or design system from a workspace's `sourcebook.config.*` file.

## How it works

The skill loads the config with [c12](https://unjs.io/packages/c12), selects instructions by `type`, inspects the configured source paths, and writes documentation. The reader prints the validated config as JSON; the agent writes the prose.

## Configure a workspace

Create `sourcebook.config.ts` in the workspace root:

```ts
import { defineConfig } from "@sourcebook/config";

export default defineConfig({
  type: "application",
  frontend: "apps/web/src",
  backend: "apps/api/src",
  outputPath: "docs",
  useLocalOutput: true,
  displayName: "Example",
  instructions: "Include a developer setup guide."
});
```

`type` is `application`, `library`, or `design-system`. Application configs accept `src`, `frontend`, and `backend`; library configs accept `packages`; design system configs accept `fonts`, `icons`, `illustrations`, `components`, `blocks`, and `layouts`. Each path field accepts a workspace-relative string or array of strings. Shared options are `outputPath` (default `docs`), `useLocalOutput` (default `true`), `displayName`, `homepage`, `description`, and `instructions`. The config may also be an array of project configs.

With local output, the skill writes under each identified project directory; otherwise it writes under the workspace root. c12 also supports JavaScript, JSON, YAML, TOML, and other config formats.

## Run

Install dependencies with `pnpm install`, then invoke the [Sourcebook skill](skills/sourcebook/SKILL.md) in the target workspace. To inspect the resolved config:

```sh
node skills/sourcebook/scripts/read-config.mjs /path/to/workspace
```

The command prints `{ workspace, configFile, config }` as JSON. When copying the skill outside this repository, keep its complete folder and install its runtime dependency there with `npm install --omit=dev`.

## Develop

```sh
pnpm test:sourcebook
pnpm typecheck:sourcebook
```

The TypeScript config contract is in [`packages/config`](packages/config/src/index.ts). Run `pnpm --filter @sourcebook/config build` to build it.
