# Getting Started

## Prerequisites

- Bun `>= 1.3.12`
- A Git repository for normal task execution
- An API key for OpenAI, Anthropic, Google, or Groq, unless you plan to use Ollama locally

## First Run

Run:

```bash
giter setup
```

The setup wizard will:

1. Check whether Git is installed and attempt installation if it is missing.
2. Ask which AI provider you want as your default.
3. Ask for the model id you want Giter to use.
4. Collect your Git author name, email, and default branch.
5. Save the result to `~/.giter/config.json`.
6. Apply the Git identity globally with `git config --global`.

## Natural-Language Requests

Inside a Git repository, you can ask for tasks directly:

```bash
giter "commit everything with a message about fixing the auth bug"
giter "show me what changed in the last 5 commits"
giter "push my branch and set the upstream"
giter "what files have I changed since yesterday"
giter "undo my last commit but keep the changes"
```

If you do not pass a request and your terminal is interactive, Giter will prompt for one.

When you are not inside a repository yet, Giter can still handle initialization requests directly:

```bash
giter "make this folder a git repo"
giter "initialize this directory as a git repository"
```

## Temporary Overrides

Use a different provider or model for a single run:

```bash
giter --provider groq "summarize the current repository state"
giter --provider openai --model gpt-5.4 "resolve these conflicts and finish the merge"
```

## Ollama Notes

When using Ollama, Giter expects an OpenAI-compatible base URL. The default is:

```text
http://127.0.0.1:11434/v1
```

Make sure the model you choose is already available to your local Ollama instance.

## Doctor Command

Run:

```bash
giter doctor
```

This prints:

- Git availability and version
- Whether a Giter config file exists
- The currently configured provider and model
- Whether the current directory is inside a Git repository
- Whether a merge, rebase, or cherry-pick is in progress
