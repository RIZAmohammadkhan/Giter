import { input } from "@inquirer/prompts";

import type { ProviderId } from "../types";
import { runGiterAgent } from "../ai/agent";
import { runSetupWizard } from "../config/wizard";
import { createDefaultConfig } from "../config/schema";
import { configExists, loadConfig } from "../config/store";
import { ensureGitAvailable, getGitVersion } from "../git/install";
import { getRepoContext, getWorkspaceContext } from "../git/repository";
import { CliReporter } from "../tui/render";

function isProviderId(value: string): value is ProviderId {
  return ["openai", "anthropic", "google", "groq", "ollama"].includes(value);
}

export async function handleSetupCommand(options: {
  provider?: string;
  compact?: boolean;
}) {
  const reporter = new CliReporter("ice", Boolean(options.compact));
  reporter.printBanner();
  reporter.start("Checking Git availability...");

  const gitStatus = await ensureGitAvailable();
  reporter.succeed(
    gitStatus.installedNow ? `Installed ${gitStatus.version}` : `Using ${gitStatus.version}`,
  );

  const existingConfig = await loadConfig();
  const preferredProvider = options.provider && isProviderId(options.provider) ? options.provider : undefined;
  const { config } = await runSetupWizard({ existingConfig, preferredProvider });
  reporter.printSetupComplete(config);
}

export async function handleDoctorCommand() {
  const configPresent = await configExists();
  const config = configPresent ? await loadConfig() : null;
  const gitVersion = await getGitVersion();
  const repo = await getRepoContext();
  const reporter = new CliReporter(config?.ui.accent ?? "ice", Boolean(config?.ui.compact));
  reporter.printBanner();
  reporter.printDoctor({
    gitVersion,
    configStatus: configPresent ? "configured" : "missing",
    providerLine: config
      ? `${config.currentProvider} (${config.providers[config.currentProvider].model})`
      : "not configured",
    repo,
  });
}

export async function handleNaturalLanguageCommand(options: {
  requestParts: string[];
  provider?: string;
  model?: string;
  compact?: boolean;
}) {
  let config = await loadConfig();
  const reporter = new CliReporter(config?.ui.accent ?? "ice", Boolean(options.compact ?? config?.ui.compact));
  reporter.printBanner();
  reporter.start("Checking Git availability...");

  const gitStatus = await ensureGitAvailable();
  reporter.succeed(gitStatus.installedNow ? `Installed ${gitStatus.version}` : `Using ${gitStatus.version}`);

  const request =
    options.requestParts.join(" ").trim() ||
    (process.stdout.isTTY
      ? (
          await input({
            message: "What should Giter do in this folder?",
            validate: (value) => (value.trim().length > 0 ? true : "Enter a request for Giter."),
          })
        ).trim()
      : "");

  if (!request) {
    throw new Error("No natural-language request was provided.");
  }

  if (!config) {
    reporter.info("First run detected. Launching setup wizard...");
    const setup = await runSetupWizard({ existingConfig: createDefaultConfig() });
    config = setup.config;
    reporter.printSetupComplete(config);
  }

  reporter.start("Inspecting workspace state...");
  const workspace = await getWorkspaceContext();

  const providerOverride =
    options.provider && isProviderId(options.provider) ? options.provider : undefined;

  const { result, selection } = await runGiterAgent(
    {
      userPrompt: request,
      config,
      workspace,
      providerOverride,
      modelOverride: options.model,
    },
    reporter,
  );

  const latestWorkspace = await getWorkspaceContext(workspace.cwd);
  reporter.succeed("Task complete.");
  reporter.printRunSummary({
    workspace: latestWorkspace,
    providerLabel: selection.providerLabel,
    modelId: selection.modelId,
    summary: result.text,
    steps: result.steps.length,
  });
}
