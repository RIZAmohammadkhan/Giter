import { ToolLoopAgent, stepCountIs, type GenerateTextResult } from "ai";

import { DEFAULT_AGENT_STEP_LIMIT } from "../constants";
import type { AgentRunOptions, ToolReporter } from "../types";
import { createLanguageModelForConfig, type ResolvedProviderSelection } from "./providers";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { createGiterTools } from "./tools";

export async function runGiterAgent(
  options: AgentRunOptions,
  reporter: ToolReporter,
): Promise<{
  result: GenerateTextResult<ReturnType<typeof createGiterTools>, never>;
  selection: ResolvedProviderSelection;
}> {
  const { model, selection } = createLanguageModelForConfig(
    options.config,
    options.providerOverride,
    options.modelOverride,
  );

  const tools = createGiterTools({
    cwd: options.workspace.cwd,
    defaultBranch: options.config.git.defaultBranch,
    reporter,
  });

  const agent = new ToolLoopAgent({
    model,
    instructions: buildSystemPrompt(options.config, options.workspace),
    tools,
    temperature: 0.1,
    stopWhen: stepCountIs(DEFAULT_AGENT_STEP_LIMIT),
    onStepFinish: ({ toolCalls }) => {
      reporter.update(
        toolCalls.length > 0
          ? `Completed ${toolCalls.length} tool call(s); deciding the next move...`
          : "Thinking through the next move...",
      );
    },
  });

  reporter.update(`Working with ${selection.providerLabel} / ${selection.modelId}...`);

  const result = await agent.generate({
    prompt: buildUserPrompt(options.userPrompt, options.workspace),
  });

  return { result, selection };
}
