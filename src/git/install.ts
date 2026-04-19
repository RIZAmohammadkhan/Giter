import { isCommandAvailable, runCommand } from "./exec";

interface GitInstallPlan {
  label: string;
  steps: string[][];
}

async function withPrivilege(command: string[]): Promise<string[]> {
  if (process.platform === "win32") {
    return command;
  }

  if (typeof process.getuid === "function" && process.getuid() === 0) {
    return command;
  }

  if (await isCommandAvailable("sudo")) {
    return ["sudo", ...command];
  }

  return command;
}

async function buildLinuxPlan(): Promise<GitInstallPlan | null> {
  if (await isCommandAvailable("apt-get")) {
    return {
      label: "apt-get",
      steps: [await withPrivilege(["apt-get", "update"]), await withPrivilege(["apt-get", "install", "-y", "git"])],
    };
  }

  if (await isCommandAvailable("dnf")) {
    return {
      label: "dnf",
      steps: [await withPrivilege(["dnf", "install", "-y", "git"])],
    };
  }

  if (await isCommandAvailable("yum")) {
    return {
      label: "yum",
      steps: [await withPrivilege(["yum", "install", "-y", "git"])],
    };
  }

  if (await isCommandAvailable("pacman")) {
    return {
      label: "pacman",
      steps: [await withPrivilege(["pacman", "-Sy", "--noconfirm", "git"])],
    };
  }

  if (await isCommandAvailable("zypper")) {
    return {
      label: "zypper",
      steps: [await withPrivilege(["zypper", "install", "-y", "git"])],
    };
  }

  if (await isCommandAvailable("apk")) {
    return {
      label: "apk",
      steps: [await withPrivilege(["apk", "add", "git"])],
    };
  }

  return null;
}

async function buildGitInstallPlan(): Promise<GitInstallPlan | null> {
  switch (process.platform) {
    case "darwin":
      if (await isCommandAvailable("brew")) {
        return { label: "Homebrew", steps: [["brew", "install", "git"]] };
      }
      return null;
    case "linux":
      return buildLinuxPlan();
    case "win32":
      if (await isCommandAvailable("winget")) {
        return {
          label: "winget",
          steps: [["winget", "install", "--id", "Git.Git", "-e", "--source", "winget"]],
        };
      }
      return null;
    default:
      return null;
  }
}

export async function getGitVersion(): Promise<string | null> {
  const result = await runCommand(["git", "--version"], {
    allowFailure: true,
    timeoutMs: 5_000,
  });

  return result.ok ? result.stdout.trim() : null;
}

export async function ensureGitAvailable(): Promise<{ installedNow: boolean; version: string }> {
  const existingVersion = await getGitVersion();

  if (existingVersion) {
    return {
      installedNow: false,
      version: existingVersion,
    };
  }

  const plan = await buildGitInstallPlan();

  if (!plan) {
    throw new Error(
      "Git is not installed and Giter could not determine an automatic installer for this system.",
    );
  }

  for (const step of plan.steps) {
    await runCommand(step, {
      timeoutMs: 15 * 60 * 1_000,
    });
  }

  const installedVersion = await getGitVersion();

  if (!installedVersion) {
    throw new Error(`Git installation via ${plan.label} completed, but git is still unavailable.`);
  }

  return {
    installedNow: true,
    version: installedVersion,
  };
}
