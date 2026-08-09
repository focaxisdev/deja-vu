#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "dist", "node_modules"]);
const markdownFiles = [];

function collect(path) {
  if (!existsSync(path)) return;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    if (ignoredDirectories.has(basename(path))) return;
    for (const entry of readdirSync(path)) collect(resolve(path, entry));
    return;
  }
  if (path.endsWith(".md")) markdownFiles.push(path);
}

collect(repoRoot);

const missing = [];
const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;

for (const file of markdownFiles) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
    else target = target.split(/\s+["']/u, 1)[0];

    if (!target || target.startsWith("#") || target.startsWith("//") || /^[a-z][a-z0-9+.-]*:/iu.test(target)) {
      continue;
    }

    target = target.split(/[?#]/u, 1)[0];
    try {
      target = decodeURIComponent(target);
    } catch {
      missing.push({ file: relative(repoRoot, file), target: match[1], reason: "invalid URL encoding" });
      continue;
    }

    const resolved = resolve(dirname(file), target);
    const fromRoot = relative(repoRoot, resolved);
    if (fromRoot.startsWith("..") || isAbsolute(fromRoot) || !existsSync(resolved)) {
      missing.push({ file: relative(repoRoot, file), target: match[1], reason: "target not found" });
    }
  }
}

if (missing.length > 0) {
  console.error("Broken local Markdown links:");
  for (const item of missing) console.error(`- ${item.file}: ${item.target} (${item.reason})`);
  process.exitCode = 1;
} else {
  console.log(`Markdown links: ok (${markdownFiles.length} files checked)`);
}
