#!/usr/bin/env bun

import { Command } from "commander";

import { APP_NAME, APP_TAGLINE } from "./constants";
import {
  handleDoctorCommand,
  handleNaturalLanguageCommand,
  handleSetupCommand,
} from "./cli/run";

const program = new Command();

program
  .name("giter")
  .description(`${APP_NAME}: ${APP_TAGLINE}`)
  .option("-p, --provider <provider>", "temporarily override the configured provider")
  .option("-m, --model <model>", "temporarily override the configured model")
  .option("--compact", "use tighter output with less chrome")
  .argument("[request...]", "natural language git request")
  .action(async (requestParts: string[], options) => {
    await handleNaturalLanguageCommand({
      requestParts,
      provider: options.provider,
      model: options.model,
      compact: options.compact,
    });
  });

program
  .command("setup")
  .description("run the first-run setup wizard again")
  .option("-p, --provider <provider>", "preselect the provider in the setup wizard")
  .option("--compact", "use tighter output with less chrome")
  .action(async (options) => {
    await handleSetupCommand({
      provider: options.provider,
      compact: options.compact,
    });
  });

program
  .command("doctor")
  .description("inspect git, config, and repository health")
  .action(async () => {
    await handleDoctorCommand();
  });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
