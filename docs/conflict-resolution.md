# Conflict Resolution

## Goal

Giter's conflict-resolution path is designed to handle the whole job instead of stopping at "these files conflict."

## How It Works

When a merge, rebase, or cherry-pick is in progress, the agent can:

1. Detect the operation state with `merge_state`.
2. List unresolved files with `list_conflicts`.
3. Read each conflicted file with `read_file`.
4. Reason about the two sides using the system prompt and the raw conflict markers.
5. Rewrite the final file with `write_file`.
6. Stage the file with `stage_files`.
7. Finish the in-progress Git operation with `run_git`.

## Design Choices

- Conflict work is file-based, not patch-based. That makes it easier for the model to reason over complete source files.
- The final file content is written directly to disk, which mirrors how a developer would resolve the conflict manually.
- Repo-scoped path resolution prevents the model from editing files outside the active repository.

## Safety Expectations

The agent prompt tells the model to:

- preserve both sides when they are compatible
- remove all conflict markers before staging
- keep code style consistent with surrounding files
- verify repo state again if a Git command fails

## Known Constraints

- Binary conflicts are not currently handled specially.
- Very large files may need ranged reads if the model wants more detail than a single read provides.
- Whether the model produces a perfect merge depends on the provider, model, and clarity of the surrounding code.
