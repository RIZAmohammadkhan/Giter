import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import { createGiterTools } from "../src/ai/tools";

function createReporter() {
  const calls: string[] = [];
  return {
    calls,
    update(message: string) {
      calls.push(`update:${message}`);
    },
    record() {},
    announce(current: string, next: string) {
      calls.push(`announce:${current}->${next}`);
    },
    clearPlan() {},
  };
}

describe("workspace-aware tools", () => {
  test("can initialize a repository from a plain directory", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "giter-init-"));
    const reporter = createReporter();
    const tools = createGiterTools({
      cwd,
      defaultBranch: "main",
      reporter,
    }) as any;

    const before = await tools.workspace_overview.execute({});
    expect(before?.repo).toBeNull();
    expect(before?.hasGitMetadataInCwd).toBe(false);

    const initResult = await tools.initialize_repository.execute({});
    expect(initResult?.workspace.repo?.repoRoot).toBe(cwd);
    expect(initResult?.workspace.repo?.branch).toBe("main");

    const after = await tools.workspace_overview.execute({});
    expect(after?.repo?.repoRoot).toBe(cwd);
    expect(after?.hasGitMetadataInCwd).toBe(true);
  });

  test("can remove .git metadata through the tool layer", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "giter-remove-git-"));
    const reporter = createReporter();
    const tools = createGiterTools({
      cwd,
      defaultBranch: "main",
      reporter,
    }) as any;

    await tools.initialize_repository.execute({});

    const removeResult = await tools.remove_git_metadata.execute({
      scope: "current_directory",
    });

    expect(removeResult?.removed).toBe(true);

    const after = await tools.workspace_overview.execute({});
    expect(after?.repo).toBeNull();
    expect(after?.hasGitMetadataInCwd).toBe(false);
  });

  test("can announce progress and next action", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "giter-progress-"));
    const reporter = createReporter();
    const tools = createGiterTools({
      cwd,
      defaultBranch: "main",
      reporter,
    }) as any;

    const result = await tools.report_progress.execute({
      current: "Inspecting the folder",
      next: "Initialize Git if the user asked for it",
    });

    expect(result?.acknowledged).toBe(true);
    expect(reporter.calls).toContain(
      "announce:Inspecting the folder->Initialize Git if the user asked for it",
    );
  });
});
