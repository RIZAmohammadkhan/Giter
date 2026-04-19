import boxen from "boxen";
import chalk from "chalk";

import { APP_NAME, APP_TAGLINE } from "../constants";
import type { UiConfig } from "../types";

type Palette = {
  primary: string;
  secondary: string;
  tertiary: string;
  muted: string;
  success: string;
  warning: string;
  danger: string;
};

const PALETTES: Record<UiConfig["accent"], Palette> = {
  ice: {
    primary: "#55d7ff",
    secondary: "#8df0dd",
    tertiary: "#ffe08a",
    muted: "#8aa1b5",
    success: "#6de3a8",
    warning: "#ffbf69",
    danger: "#ff7b7b",
  },
  sunset: {
    primary: "#ff8a5b",
    secondary: "#ffd56f",
    tertiary: "#7fe7c6",
    muted: "#9a8f87",
    success: "#7fe7c6",
    warning: "#ffd56f",
    danger: "#ff7b7b",
  },
  mint: {
    primary: "#42d392",
    secondary: "#7ee8fa",
    tertiary: "#ffd479",
    muted: "#7f8b90",
    success: "#42d392",
    warning: "#ffd479",
    danger: "#ff7b7b",
  },
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(value: { r: number; g: number; b: number }) {
  return `#${[value.r, value.g, value.b]
    .map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function blendHex(start: string, end: string, ratio: number): string {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  return rgbToHex({
    r: startRgb.r + (endRgb.r - startRgb.r) * ratio,
    g: startRgb.g + (endRgb.g - startRgb.g) * ratio,
    b: startRgb.b + (endRgb.b - startRgb.b) * ratio,
  });
}

function gradientText(text: string, start: string, end: string): string {
  const chars = [...text];
  return chars
    .map((char, index) => chalk.hex(blendHex(start, end, chars.length <= 1 ? 0 : index / (chars.length - 1)))(char))
    .join("");
}

export function createTheme(accent: UiConfig["accent"]) {
  const palette = PALETTES[accent];

  return {
    palette,
    title: (value: string) => chalk.bold.hex(palette.primary)(value),
    secondary: (value: string) => chalk.hex(palette.secondary)(value),
    tertiary: (value: string) => chalk.hex(palette.tertiary)(value),
    muted: (value: string) => chalk.hex(palette.muted)(value),
    success: (value: string) => chalk.bold.hex(palette.success)(value),
    warning: (value: string) => chalk.bold.hex(palette.warning)(value),
    danger: (value: string) => chalk.bold.hex(palette.danger)(value),
  };
}

export function renderBanner(accent: UiConfig["accent"]): string {
  const theme = createTheme(accent);
  const logo = [
    "   ____ _ _            ",
    "  / ___(_) |_ ___ _ __ ",
    " | |  _| | __/ _ \\ '__|",
    " | |_| | | ||  __/ |   ",
    "  \\____|_|\\__\\___|_|   ",
  ].map((line, index, all) =>
    gradientText(line, theme.palette.primary, index === all.length - 1 ? theme.palette.tertiary : theme.palette.secondary),
  );

  return boxen(
    [logo.join("\n"), "", theme.secondary(APP_NAME), theme.muted(APP_TAGLINE)].join("\n"),
    {
      padding: { top: 0, right: 1, bottom: 0, left: 1 },
      borderStyle: "round",
      borderColor: theme.palette.primary,
      margin: { bottom: 1 },
    },
  );
}

export function renderPanel(
  title: string,
  lines: string[],
  accent: UiConfig["accent"],
  borderColor?: string,
): string {
  const theme = createTheme(accent);
  return boxen([theme.title(title), "", ...lines].join("\n"), {
    padding: { top: 0, right: 1, bottom: 0, left: 1 },
    borderStyle: "round",
    borderColor: borderColor ?? theme.palette.secondary,
    margin: { top: 0, bottom: 1 },
  });
}
