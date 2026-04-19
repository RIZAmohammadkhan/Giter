import { z } from "zod";

import {
  CONFIG_VERSION,
  DEFAULT_BRANCH,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_PROVIDER_MODELS,
} from "../constants";
import type { GiterConfig, ProviderId } from "../types";

const providerConfigSchema = z.object({
  model: z.string().min(1),
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
});

const gitIdentitySchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  defaultBranch: z.string().min(1),
});

const uiConfigSchema = z.object({
  accent: z.enum(["ice", "sunset", "mint"]),
  compact: z.boolean(),
});

export const giterConfigSchema = z.object({
  version: z.number().int().positive(),
  currentProvider: z.enum(["openai", "anthropic", "google", "groq", "ollama"]),
  providers: z.object({
    openai: providerConfigSchema,
    anthropic: providerConfigSchema,
    google: providerConfigSchema,
    groq: providerConfigSchema,
    ollama: providerConfigSchema,
  }),
  git: gitIdentitySchema,
  ui: uiConfigSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

function createDefaultProviders() {
  return {
    openai: {
      model: DEFAULT_PROVIDER_MODELS.openai,
    },
    anthropic: {
      model: DEFAULT_PROVIDER_MODELS.anthropic,
    },
    google: {
      model: DEFAULT_PROVIDER_MODELS.google,
    },
    groq: {
      model: DEFAULT_PROVIDER_MODELS.groq,
    },
    ollama: {
      model: DEFAULT_PROVIDER_MODELS.ollama,
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
    },
  };
}

export function createDefaultConfig(): GiterConfig {
  const now = new Date().toISOString();

  return {
    version: CONFIG_VERSION,
    currentProvider: "openai",
    providers: createDefaultProviders(),
    git: {
      name: "",
      email: "",
      defaultBranch: DEFAULT_BRANCH,
    },
    ui: {
      accent: "ice",
      compact: false,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function mergeProviderConfig(
  provider: ProviderId,
  rawProvider: unknown,
  defaults: GiterConfig["providers"][ProviderId],
) {
  if (!rawProvider || typeof rawProvider !== "object") {
    return defaults;
  }

  const candidate = rawProvider as Partial<GiterConfig["providers"][ProviderId]>;

  return {
    ...defaults,
    ...candidate,
    model: candidate.model ?? defaults.model,
    baseUrl:
      provider === "ollama"
        ? candidate.baseUrl ?? defaults.baseUrl ?? DEFAULT_OLLAMA_BASE_URL
        : candidate.baseUrl ?? defaults.baseUrl,
  };
}

export function normalizeConfig(raw: unknown): GiterConfig {
  const defaults = createDefaultConfig();

  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const candidate = raw as Partial<GiterConfig> & {
    providers?: Partial<Record<ProviderId, Partial<GiterConfig["providers"][ProviderId]>>>;
  };

  const merged: GiterConfig = {
    ...defaults,
    ...candidate,
    currentProvider: candidate.currentProvider ?? defaults.currentProvider,
    providers: {
      openai: mergeProviderConfig("openai", candidate.providers?.openai, defaults.providers.openai),
      anthropic: mergeProviderConfig(
        "anthropic",
        candidate.providers?.anthropic,
        defaults.providers.anthropic,
      ),
      google: mergeProviderConfig("google", candidate.providers?.google, defaults.providers.google),
      groq: mergeProviderConfig("groq", candidate.providers?.groq, defaults.providers.groq),
      ollama: mergeProviderConfig("ollama", candidate.providers?.ollama, defaults.providers.ollama),
    },
    git: {
      ...defaults.git,
      ...(candidate.git ?? {}),
    },
    ui: {
      ...defaults.ui,
      ...(candidate.ui ?? {}),
    },
    createdAt: candidate.createdAt ?? defaults.createdAt,
    updatedAt: candidate.updatedAt ?? defaults.updatedAt,
  };

  return giterConfigSchema.parse(merged);
}
