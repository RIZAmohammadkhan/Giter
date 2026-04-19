import { access } from "node:fs/promises";
import path from "node:path";

import type {
  GitIdentityConfig,
  RepoContext,
  RepositoryMergeState,
  WorkspaceContext,
} from "../types";
import { runGitCommand } from "./exec";

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function findRepositoryRoot(cwd = process.cwd()): Promise<string | null> {
  const result = await runGitCommand(["rev-parse", "--show-toplevel"], {
    cwd,
    allowFailure: true,
    timeoutMs: 5_000,
  });

  return result.ok ? result.stdout.trim() : null;
}

export async function getRepositoryMergeState(repoRoot: string): Promise<RepositoryMergeState> {
  const gitDirResult = await runGitCommand(["rev-parse", "--git-dir"], {
    cwd: repoRoot,
    allowFailure: true,
    timeoutMs: 5_000,
  });

  const gitDir = gitDirResult.ok
    ? path.resolve(repoRoot, gitDirResult.stdout.trim())
    : path.join(repoRoot, ".git");

  const [isMerging, hasRebaseMerge, hasRebaseApply, isCherryPicking] = await Promise.all([
    pathExists(path.join(gitDir, "MERGE_HEAD")),
    pathExists(path.join(gitDir, "rebase-merge")),
    pathExists(path.join(gitDir, "rebase-apply")),
    pathExists(path.join(gitDir, "CHERRY_PICK_HEAD")),
  ]);

  return {
    isMerging,
    isRebasing: hasRebaseMerge || hasRebaseApply,
    isCherryPicking,
    gitDir,
  };
}

export async function getRepoContext(cwd = process.cwd()): Promise<RepoContext | null> {
  const repoRoot = await findRepositoryRoot(cwd);

  if (!repoRoot) {
    return null;
  }

  const [branchResult, statusResult, remotesResult, mergeState] = await Promise.all([
    runGitCommand(["branch", "--show-current"], {
      cwd: repoRoot,
      allowFailure: true,
      timeoutMs: 5_000,
    }),
    runGitCommand(["status", "--short", "--branch"], {
      cwd: repoRoot,
      allowFailure: true,
      timeoutMs: 10_000,
    }),
    runGitCommand(["remote", "-v"], {
      cwd: repoRoot,
      allowFailure: true,
      timeoutMs: 5_000,
    }),
    getRepositoryMergeState(repoRoot),
  ]);

  return {
    repoRoot,
    branch: branchResult.ok ? branchResult.stdout.trim() || "HEAD" : "HEAD",
    statusShort: statusResult.stdout.trim(),
    statusPorcelain: statusResult.stdout
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean),
    remotes: Array.from(
      new Set(
        remotesResult.stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      ),
    ),
    mergeState,
  };
}

export async function getWorkspaceContext(cwd = process.cwd()): Promise<WorkspaceContext> {
  const absoluteCwd = path.resolve(cwd);
  const repo = await getRepoContext(absoluteCwd);

  return {
    cwd: absoluteCwd,
    repo,
    hasGitMetadataInCwd: await pathExists(path.join(absoluteCwd, ".git")),
  };
}

export async function initializeRepository(
  cwd = process.cwd(),
  defaultBranch = "main",
): Promise<{
  repoRoot: string;
  branch: string;
  usedFallback: boolean;
}> {
  const initWithBranch = await runGitCommand(["init", "-b", defaultBranch], {
    cwd,
    allowFailure: true,
    timeoutMs: 15_000,
  });

  let usedFallback = false;

  if (!initWithBranch.ok) {
    usedFallback = true;
    await runGitCommand(["init"], {
      cwd,
      timeoutMs: 15_000,
    });

    await runGitCommand(["branch", "-m", defaultBranch], {
      cwd,
      allowFailure: true,
      timeoutMs: 15_000,
    });
  }

  const repo = await getRepoContext(cwd);

  if (!repo) {
    throw new Error("Git initialization completed, but the directory is still not recognized as a repository.");
  }

  return {
    repoRoot: repo.repoRoot,
    branch: repo.branch,
    usedFallback,
  };
}

export async function applyGlobalGitIdentity(identity: GitIdentityConfig): Promise<void> {
  await runGitCommand(["config", "--global", "user.name", identity.name], {
    timeoutMs: 10_000,
  });

  await runGitCommand(["config", "--global", "user.email", identity.email], {
    timeoutMs: 10_000,
  });

  await runGitCommand(["config", "--global", "init.defaultBranch", identity.defaultBranch], {
    timeoutMs: 10_000,
  });
}
