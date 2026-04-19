import { input, password, select } from "@inquirer/prompts";

import {
  DEFAULT_BRANCH,
  DEFAULT_OLLAMA_BASE_URL,
  MODEL_PRESETS,
  PROVIDER_API_ENV_VARS,
  PROVIDER_LABELS,
} from "../constants";
import { applyGlobalGitIdentity } from "../git/repository";
import type { GiterConfig, ProviderId } from "../types";
import { createDefaultConfig, normalizeConfig } from "./schema";
import { saveConfig } from "./store";

interface SetupWizardOptions {
  existingConfig?: GiterConfig | null;
  preferredProvider?: ProviderId;
}

function isValidProviderId(value: string): value is ProviderId {
  return value in PROVIDER_LABELS;
}

async function promptForProvider(defaultProvider: ProviderId): Promise<ProviderId> {
  const value = await select({
    message: "Choose the AI provider Giter should use by default",
    default: defaultProvider,
    choices: Object.entries(PROVIDER_LABELS).map(([provider, label]) => ({
      name: label,
      value: provider,
      description:
        provider === "ollama"
          ? "Use a local OpenAI-compatible endpoint for offline workflows."
          : `Use ${label} with the provider's API key.`,
    })),
  });

  if (!isValidProviderId(value)) {
    throw new Error(`Unsupported provider: ${value}`);
  }

  return value;
}

async function promptForModel(provider: ProviderId, currentValue: string): Promise<string> {
  const presets = MODEL_PRESETS[provider];

  const selected = await select({
    message: `Pick a default ${PROVIDER_LABELS[provider]} model`,
    default: presets.some((preset) => preset.value === currentValue) ? currentValue : "__custom__",
    choices: [
      ...presets.map((preset) => ({
        name: preset.label,
        value: preset.value,
        description: `${preset.value} - ${preset.hint}`,
      })),
      {
        name: "Custom model id",
        value: "__custom__",
        description: "Enter any provider model string supported by your account.",
      },
    ],
  });

  if (selected !== "__custom__") {
    return selected;
  }

  return input({
    message: `Enter the ${PROVIDER_LABELS[provider]} model id`,
    default: currentValue,
    validate: (value) => (value.trim().length > 0 ? true : "Model id is required."),
  });
}

async function promptForApiKey(
  provider: ProviderId,
  existingValue?: string,
): Promise<string | undefined> {
  if (provider === "ollama") {
    return existingValue;
  }

  const envVar = PROVIDER_API_ENV_VARS[provider];
  const enteredValue = await password({
    message: existingValue
      ? `Enter your ${PROVIDER_LABELS[provider]} API key (leave blank to keep the saved key)`
      : `Enter your ${PROVIDER_LABELS[provider]} API key${
          envVar ? ` or leave it blank to rely on ${envVar}` : ""
        }`,
    mask: "*",
    validate: (value) => {
      if (value.trim().length > 0 || existingValue || envVar) {
        return true;
      }

      return "An API key is required unless you plan to use an environment variable.";
    },
  });

  return enteredValue.trim() || existingValue;
}

export async function runSetupWizard(
  options: SetupWizardOptions = {},
): Promise<{ config: GiterConfig; configPath: string }> {
  const base = options.existingConfig ?? createDefaultConfig();
  const provider =
    options.preferredProvider && isValidProviderId(options.preferredProvider)
      ? options.preferredProvider
      : await promptForProvider(base.currentProvider);

  const currentProviderConfig = base.providers[provider];
  const model = await promptForModel(provider, currentProviderConfig.model);
  const apiKey = await promptForApiKey(provider, currentProviderConfig.apiKey);

  const baseUrl =
    provider === "ollama"
      ? await input({
          message: "Enter the Ollama OpenAI-compatible base URL",
          default: currentProviderConfig.baseUrl ?? DEFAULT_OLLAMA_BASE_URL,
          validate: (value) => {
            try {
              new URL(value);
              return true;
            } catch {
              return "Please enter a valid URL.";
            }
          },
        })
      : undefined;

  const gitName = await input({
    message: "Git author name",
    default: base.git.name,
    validate: (value) => (value.trim().length > 0 ? true : "Git author name is required."),
  });

  const gitEmail = await input({
    message: "Git author email",
    default: base.git.email,
    validate: (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : "Enter a valid email."),
  });

  const defaultBranch = await input({
    message: "Default branch name for new repositories",
    default: base.git.defaultBranch || DEFAULT_BRANCH,
    validate: (value) => (value.trim().length > 0 ? true : "Default branch is required."),
  });

  const config = normalizeConfig({
    ...base,
    currentProvider: provider,
    providers: {
      ...base.providers,
      [provider]: {
        ...base.providers[provider],
        model,
        apiKey,
        baseUrl: provider === "ollama" ? baseUrl : undefined,
      },
    },
    git: {
      name: gitName.trim(),
      email: gitEmail.trim(),
      defaultBranch: defaultBranch.trim(),
    },
  });

  const configPath = await saveConfig(config);
  await applyGlobalGitIdentity(config.git);

  return { config, configPath };
}
