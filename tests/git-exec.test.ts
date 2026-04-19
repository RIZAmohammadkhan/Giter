import { describe, expect, test } from "bun:test";

import { getDestructiveGitReason } from "../src/git/exec";

describe("git safety", () => {
  test("flags destructive hard resets", () => {
    expect(getDestructiveGitReason(["reset", "--hard", "HEAD~1"])).toContain("hard reset");
  });

  test("flags force pushes", () => {
    expect(getDestructiveGitReason(["push", "--force-with-lease", "origin", "main"])).toContain(
      "force push",
    );
  });

  test("allows non-destructive resets", () => {
    expect(getDestructiveGitReason(["reset", "--soft", "HEAD~1"])).toBeNull();
  });
});
