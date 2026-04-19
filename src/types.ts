export type ProviderId = "openai" | "anthropic" | "google" | "groq" | "ollama";

export interface ProviderModelPreset {
  label: string;
  value: string;
  hint: string;
}

export interface ProviderConfig {
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface GitIdentityConfig {
  name: string;
  email: string;
  defaultBranch: string;
}

export interface UiConfig {
  accent: "ice" | "sunset" | "mint";
  compact: boolean;
}

export interface GiterConfig {
  version: number;
  currentProvider: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;
  git: GitIdentityConfig;
  ui: UiConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CommandResult {
  command: string[];
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  ok: boolean;
  durationMs: number;
}

export interface RepositoryMergeState {
  isMerging: boolean;
  isRebasing: boolean;
  isCherryPicking: boolean;
  gitDir: string;
}

export interface RepoContext {
  repoRoot: string;
  branch: string;
  statusShort: string;
  statusPorcelain: string[];
  remotes: string[];
  mergeState: RepositoryMergeState;
}

export interface WorkspaceContext {
  cwd: string;
  repo: RepoContext | null;
  hasGitMetadataInCwd: boolean;
}

export interface ActivityEvent {
  title: string;
  detail?: string;
  timestamp: string;
}

export interface AgentRunOptions {
  userPrompt: string;
  config: GiterConfig;
  workspace: WorkspaceContext;
  providerOverride?: ProviderId;
  modelOverride?: string;
}

export interface ToolReporter {
  update(message: string): void;
  record(event: ActivityEvent): void;
  announce(current: string, next: string): void;
  clearPlan(): void;
}
