import os from "node:os";
import path from "node:path";

import { CONFIG_DIRECTORY_NAME, CONFIG_FILE_NAME } from "../constants";

export function getConfigDirectoryPath(): string {
  return path.join(os.homedir(), CONFIG_DIRECTORY_NAME);
}

export function getConfigFilePath(): string {
  return path.join(getConfigDirectoryPath(), CONFIG_FILE_NAME);
}

export function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function resolvePathInsideRoot(root: string, target: string): string {
  const resolved = path.resolve(root, target);

  if (!isPathInside(root, resolved)) {
    throw new Error(`Path escapes repository root: ${target}`);
  }

  return resolved;
}

export function relativeToRoot(root: string, candidate: string): string {
  const relative = path.relative(root, candidate);
  return relative === "" ? "." : relative;
}
