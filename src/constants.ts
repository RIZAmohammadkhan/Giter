import type { ProviderId, ProviderModelPreset } from "./types";

export const APP_NAME = "Giter";
export const APP_TAGLINE =
  "Autonomous Git operations in plain English, powered by the AI provider you already use.";

export const CONFIG_DIRECTORY_NAME = ".giter";
export const CONFIG_FILE_NAME = "config.json";
export const CONFIG_VERSION = 1;
export const DEFAULT_BRANCH = "main";
export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";
export const MAX_TOOL_OUTPUT_CHARS = 24_000;
export const MAX_READ_FILE_CHARS = 120_000;
export const DEFAULT_AGENT_STEP_LIMIT = 24;

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  groq: "Groq",
  ollama: "Ollama",
};

export const PROVIDER_API_ENV_VARS: Record<ProviderId, string | null> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  groq: "GROQ_API_KEY",
  ollama: null,
};

export const MODEL_PRESETS: Record<ProviderId, ProviderModelPreset[]> = {
  openai: [
    {
      label: "GPT-5.4 mini",
      value: "gpt-5.4-mini",
      hint: "Fast, strong default for tool-heavy repo work.",
    },
    {
      label: "GPT-5.4",
      value: "gpt-5.4",
      hint: "Best quality when you want the most capable coding model.",
    },
    {
      label: "GPT-4.1 mini",
      value: "gpt-4.1-mini",
      hint: "Lower-cost option with solid tool calling.",
    },
  ],
  anthropic: [
    {
      label: "Claude Sonnet 4.5",
      value: "claude-sonnet-4-5",
      hint: "Balanced speed and reasoning for repo tasks.",
    },
    {
      label: "Claude Sonnet 4.6",
      value: "claude-sonnet-4-6",
      hint: "Latest Sonnet-class Anthropic option in the SDK types.",
    },
    {
      label: "Claude Opus 4.5",
      value: "claude-opus-4-5",
      hint: "Higher-end reasoning for thorny merge resolution.",
    },
  ],
  google: [
    {
      label: "Gemini 2.5 Flash",
      value: "gemini-2.5-flash",
      hint: "Fast, affordable, and well-supported in the AI SDK.",
    },
    {
      label: "Gemini 2.5 Pro",
      value: "gemini-2.5-pro",
      hint: "Stronger reasoning when speed matters less.",
    },
    {
      label: "Gemini 3.1 Pro Preview",
      value: "gemini-3.1-pro-preview",
      hint: "Preview-tier Google option for advanced use.",
    },
  ],
  groq: [
    {
      label: "Llama 3.3 70B Versatile",
      value: "llama-3.3-70b-versatile",
      hint: "Groq's strongest broadly available tool-capable default.",
    },
    {
      label: "Llama 3.1 8B Instant",
      value: "llama-3.1-8b-instant",
      hint: "Extremely fast and inexpensive.",
    },
    {
      label: "Qwen3 32B",
      value: "qwen/qwen3-32b",
      hint: "Reasoning-heavy Groq option with good tool support.",
    },
  ],
  ollama: [
    {
      label: "Qwen3 8B",
      value: "qwen3:8b",
      hint: "Good local default for low-friction offline use.",
    },
    {
      label: "Llama 3.1 8B",
      value: "llama3.1:8b",
      hint: "Common lightweight local fallback.",
    },
    {
      label: "DeepSeek R1 8B",
      value: "deepseek-r1:8b",
      hint: "Local reasoning-oriented choice if installed.",
    },
  ],
};

export const DEFAULT_PROVIDER_MODELS: Record<ProviderId, string> = {
  openai: MODEL_PRESETS.openai[0]!.value,
  anthropic: MODEL_PRESETS.anthropic[0]!.value,
  google: MODEL_PRESETS.google[0]!.value,
  groq: MODEL_PRESETS.groq[0]!.value,
  ollama: MODEL_PRESETS.ollama[0]!.value,
};
