export function truncateText(
  value: string,
  maxChars: number,
): {
  text: string;
  truncated: boolean;
} {
  if (value.length <= maxChars) {
    return { text: value, truncated: false };
  }

  const keep = Math.max(200, Math.floor((maxChars - 64) / 2));
  const start = value.slice(0, keep);
  const end = value.slice(-keep);

  return {
    text: `${start}\n\n... output truncated (${value.length - keep * 2} chars omitted) ...\n\n${end}`,
    truncated: true,
  };
}

export function summarizeValue(value: unknown): string {
  if (value == null) {
    return "none";
  }

  if (typeof value === "string") {
    return value.length > 96 ? `${value.slice(0, 93)}...` : value;
  }

  try {
    const json = JSON.stringify(value);
    return json.length > 120 ? `${json.slice(0, 117)}...` : json;
  } catch {
    return String(value);
  }
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function toBulletList(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

export function compactLines(lines: Array<string | undefined | null>): string {
  return lines.filter(Boolean).join("\n");
}

export function trimTrailingWhitespace(value: string): string {
  return value
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n");
}
