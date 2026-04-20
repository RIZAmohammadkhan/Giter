# Giter

Giter is an autonomous Git CLI agent built with Bun, TypeScript, and the Vercel AI SDK. You tell it what you want in plain English, and it works through the Git and file-level steps needed to get there, including merge-conflict cleanup.

## Why Giter

- Natural-language Git workflows instead of memorizing flags and edge-case syntax.
- Provider-agnostic AI layer with OpenAI, Anthropic, Google, Groq, and Ollama support.
- First-run setup that stores everything in `~/.giter/config.json`.
- File read/write tools for fully autonomous merge-conflict resolution.
- A polished TUI with a live spinner, status panels, and compact summaries.

## What It Can Do

- Commit, branch, checkout, push, pull, diff, log, undo, and inspect repository state from plain English.
- Detect Git automatically and attempt installation on macOS, Linux, and Windows when missing.
- Configure Git author name, email, and default branch during setup.
- Resolve merge conflicts by reading conflicted files, rewriting them cleanly, staging the results, and finishing the in-progress operation.
- Work with hosted API providers or a local Ollama endpoint.

## Install

```bash
bun install -g .
```

This project is built for Bun. The published CLI entrypoint uses a Bun shebang, so Bun should be available on the target machine.

## Quick Start

```bash
bun install
bun run src/cli.ts setup
```

Then, in any folder:

```bash
giter "commit everything with a message about fixing the auth bug"
giter "show me what changed in the last 5 commits"
giter "create a new branch called feature/payments and switch to it"
giter "undo my last commit but keep the changes"
giter "resolve these merge conflicts and finish the merge"
giter "make this folder a git repo"
```

## Commands

- `giter "<request>"`: run a natural-language Git task in the current folder. If it is not a repo yet, the agent can still inspect the folder, initialize Git, or remove `.git` when explicitly asked.
- `giter setup`: rerun the provider and Git identity setup wizard.
- `giter doctor`: inspect Git availability, config status, and current repository health.
- `giter --provider <provider> --model <model> "<request>"`: temporarily override the saved provider or model.
- `giter --compact "<request>"`: use tighter terminal output.

## Supported Providers

| Provider | Default Model | Notes |
| --- | --- | --- |
| OpenAI | `gpt-5.4-mini` | Strong default for tool-heavy repo work |
| Anthropic | `claude-sonnet-4-5` | Balanced reasoning and speed |
| Google | `gemini-2.5-flash` | Fast and cost-effective |
| Groq | `llama-3.3-70b-versatile` | Fast hosted tool-capable option |
| Ollama | `qwen3:8b` | Local OpenAI-compatible workflow |

## Safety Model

- Destructive Git commands are blocked unless the model explicitly marks them as intentional.
- The prompt instructs the agent to inspect repo state before changing history.
- Conflict resolution uses repository-scoped file tools only; file access is constrained to the current repo root.
- The CLI never assumes success after a failed Git command. It feeds the failure back into the agent loop so the model can recover.

## Project Layout

```text
src/
  ai/        Provider selection, system prompts, tool loop, and repo tools
  cli/       Command handlers for setup, doctor, and natural-language runs
  config/    Config schema, disk storage, and interactive setup wizard
  git/       Git execution, repo discovery, and installation helpers
  tui/       Banner, panels, and live terminal reporting
  utils/     Shared path and text utilities
docs/
  architecture.md
  conflict-resolution.md
  development.md
  getting-started.md
tests/
  config-schema.test.ts
  git-exec.test.ts
```

## Development

```bash
bun install
bun run typecheck
bun test
bun run src/cli.ts doctor
```

Useful scripts:

- `bun run dev`
- `bun run typecheck`
- `bun test`
- `bun run doctor`
- `bun run build`

## Documentation

- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Conflict Resolution](docs/conflict-resolution.md)
- [Development Notes](docs/development.md)
