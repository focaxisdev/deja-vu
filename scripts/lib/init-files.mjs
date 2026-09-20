import * as nodeFs from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export function plannedFile(plan, operation, path, content, reason) {
  const entry = { operation, path, ...(reason ? { reason } : {}) };
  // The JSON plan must never echo rules or existing memory contents.
  Object.defineProperty(entry, "content", { value: content });
  plan.push(entry);
}

export function executePlan(plan, { cwd, dryRun = false, fs = nodeFs } = {}) {
  const writes = plan.filter((item) => ["create", "overwrite", "append"].includes(item.operation));
  const check = (path) => {
    let cursor = path;
    while (true) {
      if (fs.existsSync(cursor)) {
        const stat = fs.lstatSync(cursor);
        if (stat.isSymbolicLink()) throw new Error(`Refusing symlink initialization target: ${cursor}`);
        if (cursor !== path && !stat.isDirectory()) throw new Error(`Parent is not a directory: ${cursor}`);
        if (cursor === path && !stat.isFile()) throw new Error(`Target is not a regular file: ${cursor}`);
      }
      const parent = dirname(cursor);
      if (parent === cursor) break;
      cursor = parent;
    }
  };
  // Preflight every target, even skipped files, before any file changes.
  for (const item of plan) check(item.path);
  const snapshots = new Map(writes.map((item) => [item.path, fs.existsSync(item.path) ? fs.readFileSync(item.path) : null]));
  for (const item of writes) {
    let parent = dirname(item.path);
    while (!fs.existsSync(parent)) parent = dirname(parent);
    fs.accessSync(parent, nodeFs.constants.W_OK);
    if (snapshots.get(item.path)) fs.accessSync(item.path, nodeFs.constants.W_OK);
  }
  if (dryRun) return { backup_directory: null, backups_required: [...snapshots.values()].filter(Boolean).length };

  let backupDirectory = null;
  const staged = new Map();
  const completed = [];
  const changedDirectories = new Set();
  const ensureDirectory = (path) => {
    if (fs.existsSync(path)) return;
    ensureDirectory(dirname(path));
    fs.mkdirSync(path);
    changedDirectories.add(path);
  };
  try {
    const originals = writes.filter((item) => snapshots.get(item.path) !== null);
    if (originals.length) {
      const backupRoot = join(cwd, ".deja-vu-backups");
      if (fs.existsSync(backupRoot) && (fs.lstatSync(backupRoot).isSymbolicLink() || !fs.statSync(backupRoot).isDirectory())) throw new Error("Invalid backup directory");
      fs.mkdirSync(backupRoot, { recursive: true });
      const ignorePath = join(backupRoot, ".gitignore");
      if (!fs.existsSync(ignorePath)) fs.writeFileSync(ignorePath, "*\n", { flag: "wx", mode: 0o600 });
      else if (fs.lstatSync(ignorePath).isSymbolicLink() || fs.readFileSync(ignorePath, "utf8").trim() !== "*") throw new Error("Backup directory requires a private '*' .gitignore");
      backupDirectory = fs.mkdtempSync(join(backupRoot, "init-"));
      const manifest = originals.map((item, index) => {
        const name = `${index}.bak`;
        fs.writeFileSync(join(backupDirectory, name), snapshots.get(item.path), { flag: "wx", mode: 0o600 });
        return { path: item.path, backup: name };
      });
      fs.writeFileSync(join(backupDirectory, "manifest.json"), JSON.stringify({ files: manifest }, null, 2), { flag: "wx", mode: 0o600 });
    }
    for (const item of writes) {
      ensureDirectory(dirname(item.path));
      const path = `${item.path}.deja-vu-${randomUUID()}.tmp`;
      staged.set(item.path, path);
      fs.writeFileSync(path, item.content, { flag: "wx", mode: 0o600 });
      if (snapshots.get(item.path)) fs.chmodSync(path, fs.statSync(item.path).mode);
    }
    for (const item of writes) {
      const before = snapshots.get(item.path);
      const current = fs.existsSync(item.path) ? fs.readFileSync(item.path) : null;
      if ((before === null) !== (current === null) || (before && !before.equals(current))) throw new Error(`Target changed during initialization: ${item.path}`);
      fs.renameSync(staged.get(item.path), item.path);
      staged.delete(item.path);
      completed.push(item);
    }
    return { backup_directory: backupDirectory, backups_required: originals.length };
  } catch (cause) {
    const recoveryErrors = [];
    for (const item of completed.reverse()) {
      try {
        if (!fs.readFileSync(item.path).equals(Buffer.from(item.content, "utf8"))) throw new Error("Target changed after write; manual recovery required");
        const before = snapshots.get(item.path);
        if (before === null) fs.unlinkSync(item.path);
        else {
          const temp = `${item.path}.deja-vu-${randomUUID()}.tmp`;
          staged.set(item.path, temp);
          fs.writeFileSync(temp, before, { flag: "wx", mode: fs.statSync(item.path).mode });
          fs.renameSync(temp, item.path);
          staged.delete(item.path);
        }
      } catch (error) { recoveryErrors.push({ path: item.path, message: error.message }); }
    }
    const error = new Error(`Initialization failed: ${cause.message}`, { cause });
    error.backup_directory = backupDirectory;
    error.recovery_errors = recoveryErrors;
    throw error;
  } finally {
    for (const path of staged.values()) { try { fs.unlinkSync(path); } catch {} }
    // Only remove empty directories created by this operation.
    for (const path of [...changedDirectories].reverse()) { try { fs.rmdirSync(path); } catch {} }
  }
}
