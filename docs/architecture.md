# Architecture

## Overview

Giter is a local CLI agent with five layers:

1. `cli/`: Parses commands and coordinates setup, doctor, and task execution.
2. `config/`: Validates and persists provider/Git settings in `~/.giter/config.json`.
3. `git/`: Wraps Bun-powered process execution, repository discovery, and Git installation logic.
4. `ai/`: Builds the provider-backed language model, system prompt, and tool loop.
5. `tui/`: Renders the banner, spinner, progress updates, and result panels.

## Runtime Flow

For a normal `giter "<request>"` run:

1. The CLI checks whether Git exists.
2. If no config exists, the setup wizard runs automatically.
3. Giter inspects the current repository and captures branch, remotes, status, and merge state.
4. It creates a provider-specific language model using the saved configuration.
5. It constructs a `ToolLoopAgent` from the Vercel AI SDK with repo-scoped Git and file tools.
6. The model decides which tools to call until the task is complete.
7. The CLI prints a compact summary and the agent's final response.

## AI Layer

The AI runtime uses:

- `ToolLoopAgent` from `ai`
- Provider adapters from `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/groq`
- `@ai-sdk/openai-compatible` for Ollama
- `zod` schemas for tool input validation

The prompt is designed to keep the model focused on execution rather than explanation. It emphasizes:

- inspect first
- avoid destructive operations unless explicit
- resolve conflicts fully
- recover from command failures
- keep the final answer short

## Tooling Strategy

Giter exposes both specialized and general-purpose tools:

- `repo_overview`, `merge_state`, `git_status`, `git_log`, `git_diff`
- `list_files`, `list_conflicts`, `read_file`, `write_file`, `delete_path`, `stage_files`
- `run_git` as the escape hatch when the model needs a command not covered by a specialized tool

The generic Git tool still carries safeguards. It refuses destructive commands unless the model marks them as intentional.

## File Safety

Repository file tools are constrained to the current repo root:

- paths are resolved to absolute paths
- attempts to escape the root are rejected
- the model can only read or rewrite files inside the active repository

This matters most for merge-conflict resolution, where the agent may need to inspect and rewrite several files autonomously.

## Terminal Experience

The TUI is intentionally lightweight:

- ASCII banner for broad terminal compatibility
- custom spinner frames
- box panels for doctor/setup/run summaries
- recent tool activity log in the final summary

The UI is meant to make the agent feel active without turning the CLI into a full-screen app.
