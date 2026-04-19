import { mkdir } from "node:fs/promises";

import type { GiterConfig } from "../types";
import { getConfigDirectoryPath, getConfigFilePath } from "../utils/paths";
import { normalizeConfig } from "./schema";

export async function ensureConfigDirectory(): Promise<string> {
  const directoryPath = getConfigDirectoryPath();
  await mkdir(directoryPath, { recursive: true });
  return directoryPath;
}

export async function configExists(): Promise<boolean> {
  const file = Bun.file(getConfigFilePath());
  return file.exists();
}

export async function loadConfig(): Promise<GiterConfig | null> {
  const file = Bun.file(getConfigFilePath());

  if (!(await file.exists())) {
    return null;
  }

  const rawText = await file.text();

  try {
    return normalizeConfig(JSON.parse(rawText));
  } catch (error) {
    throw new Error(
      `Giter config is invalid at ${getConfigFilePath()}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export async function saveConfig(config: GiterConfig): Promise<string> {
  await ensureConfigDirectory();

  const normalized = normalizeConfig({
    ...config,
    updatedAt: new Date().toISOString(),
  });

  const filePath = getConfigFilePath();
  await Bun.write(filePath, `${JSON.stringify(normalized, null, 2)}\n`);
  return filePath;
}
