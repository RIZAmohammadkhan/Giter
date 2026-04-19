import ora, { type Ora } from "ora";

import type { ActivityEvent, GiterConfig, RepoContext, UiConfig, WorkspaceContext } from "../types";
import { getConfigFilePath } from "../utils/paths";
import { pluralize } from "../utils/text";
import { createTheme, renderBanner, renderPanel } from "./theme";

const ASCII_SPINNER = {
  interval: 90,
  frames: ["[    ]", "[=   ]", "[==  ]", "[=== ]", "[ ===]", "[  ==]", "[   =]"],
};

export class CliReporter {
  private readonly theme;
  private spinner: Ora | null = null;
  private readonly events: ActivityEvent[] = [];
  private nextStepHint: string | null = null;

  constructor(private readonly accent: UiConfig["accent"], private readonly compact = false) {
    this.theme = createTheme(accent);
  }

  private formatStatus(message: string) {
    if (!this.nextStepHint || message.includes("Next:")) {
      return message;
    }

    return `${message}  Next: ${this.nextStepHint}`;
  }

  printBanner() {
    if (!this.compact) {
      console.log(renderBanner(this.accent));
    }
  }

  start(message: string) {
    this.spinner = ora({
      text: this.theme.secondary(this.formatStatus(message)),
      spinner: ASCII_SPINNER,
    }).start();
  }

  update(message: string) {
    if (!this.spinner) {
      this.start(message);
      return;
    }

    this.spinner.text = this.theme.secondary(this.formatStatus(message));
  }

  announce(current: string, next: string) {
    this.nextStepHint = next.trim();
    this.update(`${current.trim()}  Next: ${this.nextStepHint}`);
  }

  clearPlan() {
    this.nextStepHint = null;
  }

  succeed(message: string) {
    this.clearPlan();
    if (this.spinner) {
      this.spinner.succeed(this.theme.success(message));
      this.spinner = null;
      return;
    }

    console.log(this.theme.success(message));
  }

  fail(message: string) {
    this.clearPlan();
    if (this.spinner) {
      this.spinner.fail(this.theme.danger(message));
      this.spinner = null;
      return;
    }

    console.error(this.theme.danger(message));
  }

  info(message: string) {
    this.clearPlan();
    if (this.spinner) {
      this.spinner.info(this.theme.muted(message));
      this.spinner = null;
      return;
    }

    console.log(this.theme.muted(message));
  }

  record(event: ActivityEvent) {
    this.events.push(event);
  }

  getEvents(): ActivityEvent[] {
    return [...this.events];
  }

  printSetupComplete(config: GiterConfig) {
    console.log(
      renderPanel(
        "Setup Complete",
        [
          `Provider: ${config.currentProvider}`,
          `Model: ${config.providers[config.currentProvider].model}`,
          `Git identity: ${config.git.name} <${config.git.email}>`,
          `Default branch: ${config.git.defaultBranch}`,
          `Config path: ${getConfigFilePath()}`,
        ],
        this.accent,
        this.theme.palette.success,
      ),
    );
  }

  printDoctor(data: {
    gitVersion: string | null;
    configStatus: string;
    providerLine: string;
    repo: RepoContext | null;
  }) {
    console.log(
      renderPanel(
        "Doctor",
        [
          `Git: ${data.gitVersion ?? "not installed"}`,
          `Config: ${data.configStatus}`,
          `Provider: ${data.providerLine}`,
          `Repository: ${data.repo ? data.repo.repoRoot : "not inside a git repository"}`,
          `Branch: ${data.repo ? data.repo.branch : "n/a"}`,
          `Merge state: ${
            data.repo
              ? data.repo.mergeState.isMerging
                ? "merge"
                : data.repo.mergeState.isRebasing
                  ? "rebase"
                  : data.repo.mergeState.isCherryPicking
                    ? "cherry-pick"
                    : "clean"
              : "n/a"
          }`,
        ],
        this.accent,
      ),
    );
  }

  printRunSummary(details: {
    workspace: WorkspaceContext;
    providerLabel: string;
    modelId: string;
    summary: string;
    steps: number;
  }) {
    const repo = details.workspace.repo;
    const recentEvents = this.events
      .slice(-6)
      .map((event) => `${event.title}${event.detail ? `: ${event.detail}` : ""}`);

    console.log(
      renderPanel(
        "Run Summary",
        [
          `Provider: ${details.providerLabel}`,
          `Model: ${details.modelId}`,
          `Directory: ${details.workspace.cwd}`,
          `Repo: ${repo?.repoRoot ?? "not a git repository"}`,
          `Branch: ${repo?.branch ?? "n/a"}`,
          `Agent steps: ${details.steps}`,
          `Recorded actions: ${pluralize(this.events.length, "event")}`,
          ...(recentEvents.length > 0 ? ["", "Recent activity:", ...recentEvents] : []),
        ],
        this.accent,
        this.theme.palette.secondary,
      ),
    );

    if (details.summary.trim()) {
      console.log(details.summary.trim());
    }
  }
}
