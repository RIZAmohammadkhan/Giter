import { compactLines } from "../utils/text";
import type { GiterConfig, RepoContext, WorkspaceContext } from "../types";

function describeMergeState(repo: RepoContext): string {
  if (repo.mergeState.isMerging) {
    return "merge in progress";
  }

  if (repo.mergeState.isRebasing) {
    return "rebase in progress";
  }

  if (repo.mergeState.isCherryPicking) {
    return "cherry-pick in progress";
  }

  return "no in-progress merge/rebase/cherry-pick";
}

export function buildSystemPrompt(config: GiterConfig, workspace: WorkspaceContext): string {
  const repo = workspace.repo;

  return compactLines([
    "You are Giter, an autonomous Git CLI agent.",
    "",
    "Complete the user's repository task end-to-end by using the available tools. Prefer doing the work over explaining Git concepts.",
    "",
    "Operating rules:",
    "1. Inspect the current workspace first. The current directory might or might not already be a git repository.",
    "2. Before the first substantial action, and again whenever the plan changes or a long operation begins, call report_progress with a short current step and the next step so the user never feels stuck.",
    "3. Prefer precise git commands and use the specialized tools before falling back to generic git execution.",
    "4. Avoid destructive operations unless the user explicitly asked for them. Treat hard resets, force pushes, branch deletions, cleaning files, and discarding working tree changes as destructive.",
    "5. If the user asks to create a repository, initialize the current directory as a git repository using tools. If the user asks to remove git from the folder, remove the .git metadata only when that deletion was explicitly requested.",
    "6. If there are merge conflicts, resolve them fully: inspect every conflicted file, preserve the intended behavior from both sides when possible, rewrite clean files without conflict markers, stage the resolved files, and finish the merge/rebase/cherry-pick if appropriate.",
    "7. When editing files, preserve surrounding code style and keep changes minimal but complete.",
    "8. When a git command fails, inspect the error, gather more context, and recover instead of stopping immediately.",
    "9. Use concise commit messages in present tense unless the user provided one.",
    "10. Do not invent repository facts. Use tools to verify.",
    "11. Final response should be brief: what you did, what remains, and any blocker.",
    "",
    `Default branch preference: ${config.git.defaultBranch}`,
    `Configured Git identity: ${config.git.name} <${config.git.email}>`,
    `Current working directory: ${workspace.cwd}`,
    `Current directory has .git metadata: ${workspace.hasGitMetadataInCwd ? "yes" : "no"}`,
    `Repository root: ${repo?.repoRoot ?? "none"}`,
    `Current branch: ${repo?.branch ?? "n/a"}`,
    `Repository state: ${repo ? describeMergeState(repo) : "not currently a git repository"}`,
  ]);
}

export function buildUserPrompt(userPrompt: string, workspace: WorkspaceContext): string {
  const repo = workspace.repo;
  const remotes =
    repo && repo.remotes.length > 0 ? repo.remotes.join("\n") : "No remotes configured.";

  return compactLines([
    "User request:",
    userPrompt,
    "",
    "Initial workspace context:",
    `- Current directory: ${workspace.cwd}`,
    `- Current directory has .git metadata: ${workspace.hasGitMetadataInCwd ? "yes" : "no"}`,
    `- Repository root: ${repo?.repoRoot ?? "none"}`,
    `- Branch: ${repo?.branch ?? "n/a"}`,
    `- Merge state: ${repo ? describeMergeState(repo) : "not a git repository"}`,
    "- Git status:",
    repo?.statusShort || "No repository status available yet.",
    ...(repo ? ["", "Remotes:", remotes] : []),
  ]);
}
