import { performance } from "node:perf_hooks";

import type { CommandResult } from "../types";

export interface RunCommandOptions {
  cwd?: string;
  allowFailure?: boolean;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
}

export function renderCommand(command: string[]): string {
  return command.map((part) => (/\s/.test(part) ? JSON.stringify(part) : part)).join(" ");
}

function buildFailureMessage(result: CommandResult): string {
  const output = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
  return `${renderCommand(result.command)} failed with exit code ${result.exitCode}${
    output ? `\n${output}` : ""
  }`;
}

export async function runCommand(
  command: string[],
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  const cwd = options.cwd ?? process.cwd();
  const startedAt = performance.now();
  let stdout = "";
  let stderr = "";
  let exitCode = -1;
  let timedOut = false;

  try {
    const processHandle = Bun.spawn({
      cmd: command,
      cwd,
      env: { ...process.env, ...(options.env ?? {}) },
      stdout: "pipe",
      stderr: "pipe",
    });

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    if (options.timeoutMs) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        processHandle.kill();
      }, options.timeoutMs);
    }

    const [processStdout, processStderr, processExitCode] = await Promise.all([
      processHandle.stdout ? new Response(processHandle.stdout).text() : Promise.resolve(""),
      processHandle.stderr ? new Response(processHandle.stderr).text() : Promise.resolve(""),
      processHandle.exited,
    ]);

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    stdout = processStdout;
    stderr = timedOut
      ? `${processStderr}\nCommand timed out after ${options.timeoutMs}ms.`
      : processStderr;
    exitCode = typeof processExitCode === "number" ? processExitCode : -1;
  } catch (error) {
    stderr = error instanceof Error ? error.message : String(error);
  }

  const result: CommandResult = {
    command,
    cwd,
    stdout,
    stderr,
    exitCode,
    ok: exitCode === 0,
    durationMs: performance.now() - startedAt,
  };

  if (!result.ok && !options.allowFailure) {
    throw new Error(buildFailureMessage(result));
  }

  return result;
}

export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const result = await runCommand([command, "--version"], {
      allowFailure: true,
      timeoutMs: 3_000,
    });
    return result.ok;
  } catch {
    return false;
  }
}

export function getDestructiveGitReason(args: string[]): string | null {
  const normalized = args.map((part) => part.toLowerCase());
  const [subcommand = ""] = normalized;

  if (subcommand === "reset" && normalized.includes("--hard")) {
    return "hard reset discards working tree changes";
  }

  if (subcommand === "clean") {
    return "git clean deletes untracked files";
  }

  if (subcommand === "push" && normalized.some((part) => part.startsWith("--force"))) {
    return "force push rewrites remote history";
  }

  if (subcommand === "push" && normalized.includes("--delete")) {
    return "push --delete removes remote refs";
  }

  if (subcommand === "branch" && normalized.includes("-d")) {
    return "branch deletion removes local branches";
  }

  if (subcommand === "tag" && normalized.includes("-d")) {
    return "tag deletion removes local tags";
  }

  if (subcommand === "stash" && (normalized[1] === "drop" || normalized[1] === "clear")) {
    return "stash drop/clear removes saved work";
  }

  if (subcommand === "restore" && !normalized.includes("--staged")) {
    return "restore without --staged discards working tree changes";
  }

  if (subcommand === "checkout" && normalized.includes("--")) {
    return "checkout -- discards file changes";
  }

  return null;
}

export interface RunGitOptions extends RunCommandOptions {
  allowDestructive?: boolean;
}

export async function runGitCommand(args: string[], options: RunGitOptions = {}) {
  const reason = getDestructiveGitReason(args);
  if (reason && !options.allowDestructive) {
    throw new Error(
      `Refusing to run destructive git command without explicit approval: ${renderCommand([
        "git",
        ...args,
      ])} (${reason})`,
    );
  }

  return runCommand(["git", ...args], options);
}
