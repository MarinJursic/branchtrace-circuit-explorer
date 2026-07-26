import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const lightRoot = css.slice(0, css.indexOf(':root[data-theme="dark"]'));

function token(name) {
  const match = lightRoot.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `missing --${name}`);
  return match[1];
}

function luminance(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [value >> 16, (value >> 8) & 255, value & 255].map(
    (channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    },
  );
  return (
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  );
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("light-theme small-text and primary-hover tokens meet WCAG AA", () => {
  const sheet = token("sheet");
  const paper = token("paper");

  for (const name of ["accent", "gold", "ink-faint"]) {
    const foreground = token(name);
    assert.ok(
      contrast(foreground, sheet) >= 4.5,
      `${name} on sheet must be at least 4.5:1`,
    );
    assert.ok(
      contrast(foreground, paper) >= 4.5,
      `${name} on paper must be at least 4.5:1`,
    );
  }

  assert.ok(
    contrast(sheet, token("accent")) >= 4.5,
    "run-button hover text must be at least 4.5:1",
  );
});
