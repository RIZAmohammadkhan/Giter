import { describe, expect, test } from "bun:test";

import { DEFAULT_OLLAMA_BASE_URL } from "../src/constants";
import { createDefaultConfig, normalizeConfig } from "../src/config/schema";

describe("config schema", () => {
  test("creates sane defaults", () => {
    const config = createDefaultConfig();

    expect(config.currentProvider).toBe("openai");
    expect(config.providers.ollama.baseUrl).toBe(DEFAULT_OLLAMA_BASE_URL);
    expect(config.git.defaultBranch).toBe("main");
  });

  test("normalizes partial configs with defaults", () => {
    const config = normalizeConfig({
      currentProvider: "groq",
      providers: {
        groq: {
          model: "llama-3.1-8b-instant",
        },
      },
      git: {
        name: "Riza",
        email: "riza@example.com",
      },
    });

    expect(config.currentProvider).toBe("groq");
    expect(config.providers.groq.model).toBe("llama-3.1-8b-instant");
    expect(config.providers.ollama.baseUrl).toBe(DEFAULT_OLLAMA_BASE_URL);
    expect(config.git.defaultBranch).toBe("main");
  });
});
