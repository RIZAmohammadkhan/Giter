import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import {
  DEFAULT_OLLAMA_BASE_URL,
  PROVIDER_API_ENV_VARS,
  PROVIDER_LABELS,
} from "../constants";
import type { GiterConfig, ProviderId } from "../types";

export interface ResolvedProviderSelection {
  providerId: ProviderId;
  providerLabel: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
}

function resolveApiKey(config: GiterConfig, providerId: ProviderId): string | undefined {
  const saved = config.providers[providerId].apiKey;
  if (saved) {
    return saved;
  }

  const envVar = PROVIDER_API_ENV_VARS[providerId];
  return envVar ? process.env[envVar] : undefined;
}

export function resolveProviderSelection(
  config: GiterConfig,
  providerOverride?: ProviderId,
  modelOverride?: string,
): ResolvedProviderSelection {
  const providerId = providerOverride ?? config.currentProvider;
  const providerConfig = config.providers[providerId];

  return {
    providerId,
    providerLabel: PROVIDER_LABELS[providerId],
    modelId: modelOverride ?? providerConfig.model,
    apiKey: resolveApiKey(config, providerId),
    baseUrl: providerId === "ollama" ? providerConfig.baseUrl ?? DEFAULT_OLLAMA_BASE_URL : undefined,
  };
}

export function createLanguageModelForConfig(
  config: GiterConfig,
  providerOverride?: ProviderId,
  modelOverride?: string,
): { model: LanguageModel; selection: ResolvedProviderSelection } {
  const selection = resolveProviderSelection(config, providerOverride, modelOverride);

  switch (selection.providerId) {
    case "openai": {
      if (!selection.apiKey) {
        throw new Error("OpenAI API key is missing. Run `giter setup` or set OPENAI_API_KEY.");
      }

      const provider = createOpenAI({ apiKey: selection.apiKey });
      return { model: provider(selection.modelId), selection };
    }
    case "anthropic": {
      if (!selection.apiKey) {
        throw new Error("Anthropic API key is missing. Run `giter setup` or set ANTHROPIC_API_KEY.");
      }

      const provider = createAnthropic({ apiKey: selection.apiKey });
      return { model: provider(selection.modelId), selection };
    }
    case "google": {
      if (!selection.apiKey) {
        throw new Error(
          "Google API key is missing. Run `giter setup` or set GOOGLE_GENERATIVE_AI_API_KEY.",
        );
      }

      const provider = createGoogleGenerativeAI({ apiKey: selection.apiKey });
      return { model: provider(selection.modelId), selection };
    }
    case "groq": {
      if (!selection.apiKey) {
        throw new Error("Groq API key is missing. Run `giter setup` or set GROQ_API_KEY.");
      }

      const provider = createGroq({ apiKey: selection.apiKey });
      return { model: provider(selection.modelId), selection };
    }
    case "ollama": {
      const provider = createOpenAICompatible({
        name: "ollama",
        baseURL: selection.baseUrl ?? DEFAULT_OLLAMA_BASE_URL,
        apiKey: selection.apiKey,
        includeUsage: true,
      });

      return { model: provider(selection.modelId), selection };
    }
  }
}
