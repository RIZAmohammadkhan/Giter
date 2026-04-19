import { access, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

import { MAX_READ_FILE_CHARS, MAX_TOOL_OUTPUT_CHARS } from "../constants";
import {
  getRepoContext,
  getRepositoryMergeState,
  getWorkspaceContext,
  initializeRepository,
} from "../git/repository";
import { runGitCommand } from "../git/exec";
import type { ToolReporter } from "../types";
import { resolvePathInsideRoot, relativeToRoot } from "../utils/paths";
import { summarizeValue, truncateText } from "../utils/text";

interface CreateToolsOptions {
  cwd: string;
  defaultBranch: string;
  reporter: ToolReporter;
}

function recordToolEvent(reporter: ToolReporter, title: string, detail?: string) {
  reporter.update(detail ? `${title}: ${detail}` : title);
  reporter.record({
    title,
    detail,
    timestamp: new Date().toISOString(),
  });
}

function formatCommandOutput(stdout: string, stderr: string, maxChars: number) {
  const truncatedStdout = truncateText(stdout, maxChars);
  const truncatedStderr = truncateText(stderr, maxChars);

  return {
    stdout: truncatedStdout.text,
    stderr: truncatedStderr.text,
    truncated: truncatedStdout.truncated || truncatedStderr.truncated,
  };
}

async function listFilesystemEntries(
  root: string,
  directory: string,
  query: string | undefined,
  limit: number,
): Promise<string[]> {
  const basePath = resolvePathInsideRoot(root, directory);
  const matches: string[] = [];
  const queryLower = query?.toLowerCase();

  async function walk(currentPath: string) {
    if (matches.length >= limit) {
      return;
    }

    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (matches.length >= limit) {
        return;
      }

      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = relativeToRoot(root, absolutePath);
      const normalized = entry.isDirectory() ? `${relativePath}/` : relativePath;

      if (!queryLower || normalized.toLowerCase().includes(queryLower)) {
        matches.push(normalized);
      }

      if (entry.isDirectory()) {
        await walk(absolutePath);
      }
    }
  }

  await walk(basePath);
  return matches;
}

export function createGiterTools({ cwd, defaultBranch, reporter }: CreateToolsOptions) {
  const getCurrentRepo = () => getRepoContext(cwd);
  const getCurrentWorkspace = () => getWorkspaceContext(cwd);
  const getWorkingRoot = async () => (await getCurrentRepo())?.repoRoot ?? cwd;
  const pathExists = async (targetPath: string) => {
    try {
      await access(targetPath);
      return true;
    } catch {
      return false;
    }
  };

  return {
    report_progress: tool({
      description:
        "Tell the user what you are doing now and what you will do next. Call this before the first substantial action and whenever the plan changes or a long step begins.",
      inputSchema: z.object({
        current: z.string().min(3),
        next: z.string().min(3),
      }),
      execute: async ({ current, next }) => {
        reporter.announce(current, next);
        reporter.record({
          title: "Progress update",
          detail: `${current} -> ${next}`,
          timestamp: new Date().toISOString(),
        });

        return {
          acknowledged: true,
          current,
          next,
        };
      },
    }),

    workspace_overview: tool({
      description:
        "Get the current working directory, whether it is already in a git repo, and whether the current directory contains a .git entry.",
      inputSchema: z.object({}),
      execute: async () => {
        const workspace = await getCurrentWorkspace();
        recordToolEvent(reporter, "Inspecting workspace", workspace.cwd);
        return workspace;
      },
    }),

    repo_overview: tool({
      description: "Get the current repository root, branch, status, remotes, and merge state if a repo exists.",
      inputSchema: z.object({}),
      execute: async () => {
        const currentRepo = await getCurrentRepo();
        recordToolEvent(
          reporter,
          "Inspecting repository overview",
          currentRepo?.repoRoot ?? "no repository yet",
        );
        return currentRepo;
      },
    }),

    initialize_repository: tool({
      description:
        "Initialize the current working directory as a git repository. Use this when the user asks to make the current folder a git repo.",
      inputSchema: z.object({
        branch: z.string().optional(),
      }),
      execute: async ({ branch }) => {
        const currentBranch = branch?.trim() || defaultBranch;
        recordToolEvent(reporter, "Initializing repository", currentBranch);
        const result = await initializeRepository(cwd, currentBranch);
        const workspace = await getCurrentWorkspace();

        return {
          ...result,
          workspace,
        };
      },
    }),

    remove_git_metadata: tool({
      description:
        "Remove the .git metadata from the current directory or the current repository root. Use only when the user explicitly asks to remove Git from the folder.",
      inputSchema: z.object({
        scope: z.enum(["current_directory", "repository_root"]).default("current_directory"),
      }),
      execute: async ({ scope }) => {
        const currentRepo = await getCurrentRepo();
        const targetRoot =
          scope === "repository_root" && currentRepo ? currentRepo.repoRoot : cwd;
        const gitMetadataPath = path.join(targetRoot, ".git");
        const relativeGitPath = relativeToRoot(targetRoot, gitMetadataPath);
        recordToolEvent(reporter, "Removing git metadata", `${scope}: ${targetRoot}`);

        if (!(await pathExists(gitMetadataPath))) {
          return {
            removed: false,
            scope,
            targetRoot,
            reason: `No .git entry exists at ${gitMetadataPath}.`,
            workspace: await getCurrentWorkspace(),
          };
        }

        await rm(gitMetadataPath, { recursive: true, force: true });

        return {
          removed: true,
          scope,
          targetRoot,
          path: relativeGitPath,
          workspace: await getCurrentWorkspace(),
        };
      },
    }),

    merge_state: tool({
      description: "Check whether a merge, rebase, or cherry-pick is currently in progress.",
      inputSchema: z.object({}),
      execute: async () => {
        const currentRepo = await getCurrentRepo();
        if (!currentRepo) {
          recordToolEvent(reporter, "Checked merge state", "no repository");
          return {
            repoAvailable: false,
            reason: "The current working directory is not inside a git repository.",
          };
        }

        const mergeState = await getRepositoryMergeState(currentRepo.repoRoot);
        recordToolEvent(
          reporter,
          "Checked merge state",
          mergeState.isMerging
            ? "merge"
            : mergeState.isRebasing
              ? "rebase"
              : mergeState.isCherryPicking
                ? "cherry-pick"
                : "clean",
        );
        return mergeState;
      },
    }),

    git_status: tool({
      description: "Get git status with branch information.",
      inputSchema: z.object({}),
      execute: async () => {
        recordToolEvent(reporter, "Reading git status");
        const result = await runGitCommand(["status", "--short", "--branch"], {
          cwd,
          allowFailure: true,
          timeoutMs: 10_000,
        });

        const { stdout, stderr, truncated } = formatCommandOutput(
          result.stdout,
          result.stderr,
          MAX_TOOL_OUTPUT_CHARS,
        );

        return {
          ok: result.ok,
          exitCode: result.exitCode,
          stdout,
          stderr,
          truncated,
        };
      },
    }),

    git_log: tool({
      description: "Read recent commit history.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(40).default(10),
        ref: z.string().optional(),
        showPatch: z.boolean().default(false),
      }),
      execute: async ({ limit, ref, showPatch }) => {
        recordToolEvent(reporter, "Reading git history", `last ${limit} commit(s)`);
        const args = [
          "log",
          "--decorate",
          showPatch ? "--patch" : "--stat",
          "--oneline",
          `-${limit}`,
        ];

        if (ref) {
          args.push(ref);
        }

        const result = await runGitCommand(args, {
          cwd,
          allowFailure: true,
          timeoutMs: 20_000,
        });

        const { stdout, stderr, truncated } = formatCommandOutput(
          result.stdout,
          result.stderr,
          MAX_TOOL_OUTPUT_CHARS,
        );

        return {
          ok: result.ok,
          exitCode: result.exitCode,
          stdout,
          stderr,
          truncated,
        };
      },
    }),

    git_diff: tool({
      description: "Read diffs for working tree, staged changes, or a commit range.",
      inputSchema: z.object({
        range: z.string().optional(),
        path: z.string().optional(),
        staged: z.boolean().default(false),
        statOnly: z.boolean().default(false),
        maxChars: z.number().int().min(1_000).max(MAX_READ_FILE_CHARS).default(MAX_TOOL_OUTPUT_CHARS),
      }),
      execute: async ({ range, path: targetPath, staged, statOnly, maxChars }) => {
        recordToolEvent(
          reporter,
          "Reading git diff",
          summarizeValue({ range, path: targetPath, staged, statOnly }),
        );

        const args = ["diff", "--no-ext-diff"];
        if (staged) {
          args.push("--cached");
        }
        if (statOnly) {
          args.push("--stat");
        }
        if (range) {
          args.push(range);
        }
        if (targetPath) {
          args.push("--", targetPath);
        }

        const result = await runGitCommand(args, {
          cwd,
          allowFailure: true,
          timeoutMs: 20_000,
        });

        const { stdout, stderr, truncated } = formatCommandOutput(result.stdout, result.stderr, maxChars);

        return {
          ok: result.ok,
          exitCode: result.exitCode,
          stdout,
          stderr,
          truncated,
        };
      },
    }),

    run_git: tool({
      description:
        "Run a git command from the current working directory. Pass only the arguments after `git`. Set allowDestructive to true only if the user explicitly asked for a destructive action.",
      inputSchema: z.object({
        args: z.array(z.string()).min(1),
        allowDestructive: z.boolean().default(false),
        timeoutMs: z.number().int().min(1_000).max(15 * 60 * 1_000).default(60_000),
        maxChars: z.number().int().min(1_000).max(MAX_READ_FILE_CHARS).default(MAX_TOOL_OUTPUT_CHARS),
      }),
      execute: async ({ args, allowDestructive, timeoutMs, maxChars }) => {
        if (args[0] === "git") {
          throw new Error("run_git expects arguments after `git`, not a full git command.");
        }

        recordToolEvent(reporter, "Running git command", args.join(" "));
        const result = await runGitCommand(args, {
          cwd,
          timeoutMs,
          allowFailure: true,
          allowDestructive,
        });

        const { stdout, stderr, truncated } = formatCommandOutput(result.stdout, result.stderr, maxChars);

        return {
          ok: result.ok,
          exitCode: result.exitCode,
          stdout,
          stderr,
          truncated,
        };
      },
    }),

    list_files: tool({
      description:
        "List files from the current repository if one exists, otherwise from the current working directory filesystem.",
      inputSchema: z.object({
        directory: z.string().default("."),
        query: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      }),
      execute: async ({ directory, query, limit }) => {
        recordToolEvent(reporter, "Listing files", directory);
        const currentRepo = await getCurrentRepo();
        let files: string[];

        if (currentRepo) {
          const args = ["ls-files", "--cached", "--others", "--exclude-standard", "--", directory];
          const result = await runGitCommand(args, {
            cwd: currentRepo.repoRoot,
            timeoutMs: 15_000,
          });

          files = result.stdout
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        } else {
          const workingRoot = await getWorkingRoot();
          files = await listFilesystemEntries(workingRoot, directory, query, limit + 1);
        }

        if (query && currentRepo) {
          const queryLower = query.toLowerCase();
          files = files.filter((file) => file.toLowerCase().includes(queryLower));
        }

        return {
          files: files.slice(0, limit),
          totalMatches: files.length,
          truncated: files.length > limit,
        };
      },
    }),

    list_conflicts: tool({
      description: "List files that currently have unresolved merge conflicts.",
      inputSchema: z.object({}),
      execute: async () => {
        const currentRepo = await getCurrentRepo();
        if (!currentRepo) {
          recordToolEvent(reporter, "Listing conflicted files", "no repository");
          return {
            repoAvailable: false,
            files: [],
          };
        }

        recordToolEvent(reporter, "Listing conflicted files");
        const result = await runGitCommand(["diff", "--name-only", "--diff-filter=U"], {
          cwd: currentRepo.repoRoot,
          timeoutMs: 10_000,
        });

        return {
          files: result.stdout
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        };
      },
    }),

    read_file: tool({
      description:
        "Read a file from the current repository root if one exists, otherwise from the current working directory. Use optional startLine/endLine to inspect only part of a large file.",
      inputSchema: z.object({
        path: z.string(),
        startLine: z.number().int().min(1).optional(),
        endLine: z.number().int().min(1).optional(),
        maxChars: z.number().int().min(1_000).max(MAX_READ_FILE_CHARS).default(48_000),
      }),
      execute: async ({ path: targetPath, startLine, endLine, maxChars }) => {
        const workingRoot = await getWorkingRoot();
        const absolutePath = resolvePathInsideRoot(workingRoot, targetPath);
        const relativePath = relativeToRoot(workingRoot, absolutePath);
        recordToolEvent(reporter, "Reading file", relativePath);

        const file = Bun.file(absolutePath);
        if (!(await file.exists())) {
          throw new Error(`File does not exist: ${relativePath}`);
        }

        const rawContent = await file.text();
        const lines = rawContent.split("\n");
        const lineStart = startLine ?? 1;
        const lineEnd = endLine ?? lines.length;
        const slice = lines.slice(lineStart - 1, lineEnd).join("\n");
        const truncated = truncateText(slice, maxChars);

        return {
          path: relativePath,
          totalLines: lines.length,
          startLine: lineStart,
          endLine: Math.min(lineEnd, lines.length),
          content: truncated.text,
          truncated: truncated.truncated,
        };
      },
    }),

    write_file: tool({
      description:
        "Write a file in the current repository root if one exists, otherwise in the current working directory. Use after inspecting a file and deciding on the exact resolved content.",
      inputSchema: z.object({
        path: z.string(),
        content: z.string(),
      }),
      execute: async ({ path: targetPath, content }) => {
        const workingRoot = await getWorkingRoot();
        const absolutePath = resolvePathInsideRoot(workingRoot, targetPath);
        const relativePath = relativeToRoot(workingRoot, absolutePath);
        recordToolEvent(reporter, "Writing file", relativePath);

        await mkdir(path.dirname(absolutePath), { recursive: true });
        await Bun.write(absolutePath, content);

        return {
          path: relativePath,
          bytesWritten: Buffer.byteLength(content, "utf8"),
          lineCount: content.split("\n").length,
        };
      },
    }),

    delete_path: tool({
      description:
        "Delete a path in the current repository root if one exists, otherwise in the current working directory. Use only when the user explicitly asked for deletion or when resolving a conflict requires removing a file.",
      inputSchema: z.object({
        path: z.string(),
        recursive: z.boolean().default(false),
      }),
      execute: async ({ path: targetPath, recursive }) => {
        const workingRoot = await getWorkingRoot();
        const absolutePath = resolvePathInsideRoot(workingRoot, targetPath);
        const relativePath = relativeToRoot(workingRoot, absolutePath);
        recordToolEvent(reporter, "Deleting path", relativePath);

        await rm(absolutePath, { recursive, force: true });

        return {
          path: relativePath,
          deleted: true,
        };
      },
    }),

    stage_files: tool({
      description: "Stage one or more files with git add.",
      inputSchema: z.object({
        paths: z.array(z.string()).min(1),
      }),
      execute: async ({ paths }) => {
        const currentRepo = await getCurrentRepo();
        if (!currentRepo) {
          throw new Error("Cannot stage files because the current working directory is not inside a git repository.");
        }

        recordToolEvent(reporter, "Staging files", paths.join(", "));
        const result = await runGitCommand(["add", "--", ...paths], {
          cwd: currentRepo.repoRoot,
          timeoutMs: 15_000,
        });

        return {
          ok: result.ok,
          exitCode: result.exitCode,
          staged: paths,
        };
      },
    }),
  };
}
