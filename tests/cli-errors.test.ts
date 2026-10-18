import test from "node:test";
import assert from "node:assert/strict";
import { CliResponseError, parseExpectedCliFailure, requireSpawnResult } from "./helpers/cli-errors.js";

for (const code of ["EPERM", "EACCES", "ENOENT", "ETIMEDOUT", "ENOBUFS"]) {
  test(`expected-failure helper preserves original ${code}, even with misleading status/output`, () => {
    for (const status of [0, 1, null]) {
      const cause = new Error("original cause");
      const original = Object.assign(new Error("spawn failed", { cause }), {
        code, status, stdout: status === 1 ? '{"ok":false}' : "", stderr: "synthetic stderr",
        path: "synthetic-node", syscall: "spawnSync", spawnargs: ["synthetic-cli"],
      });
      assert.throws(() => parseExpectedCliFailure(original), error => error === original);
      assert.equal(original.cause, cause);
    }
  });
}

test("ordinary nonzero CLI JSON remains available for unchanged product assertions", () => {
  for (const status of [1, 2]) {
    const error = Object.assign(new Error("nonzero exit"), { status, signal: null, stdout: '{"ok":false,"diagnostics":[{"code":"invalid"}]}' });
    assert.deepEqual(parseExpectedCliFailure(error), { ok: false, diagnostics: [{ code: "invalid" }] });
  }
});

test("invalid or empty CLI JSON preserves both execution and parse errors", () => {
  for (const stdout of ["", " \n", "{broken", "synthetic-sensitive-output"]) {
    const original = Object.assign(new Error("nonzero exit"), { status: 1, signal: null, stdout, stderr: "synthetic stderr" });
    assert.throws(() => parseExpectedCliFailure(original), error => {
      assert.ok(error instanceof CliResponseError);
      assert.equal(error.cause, original); assert.equal(error.exitStatus, 1);
      assert.ok(error.parseError instanceof SyntaxError);
      assert.ok(!error.message.includes("synthetic-sensitive-output")); return true;
    });
  }
});

test("signals, nested operational errors and invalid statuses are not accepted as CLI responses", () => {
  for (const extra of [{ signal: "SIGTERM" }, { error: new Error("transport") },
    ...[undefined, null, 0, -1, 1.5, NaN, Infinity].map(status => ({ status })), { stdout: undefined }]) {
    const error = Object.assign(new Error("failed"), { status: 1, stdout: '{"ok":false}', ...extra });
    assert.throws(() => parseExpectedCliFailure(error), value => value === error);
  }
});

test("non-execution and non-object errors retain their identity", () => {
  for (const error of [new SyntaxError("original parse failure"), null, undefined, "failure", 42]) {
    let caught: unknown = Symbol("not thrown");
    try { parseExpectedCliFailure(error); } catch (value) { caught = value; }
    assert.equal(caught, error);
  }
});

test("spawn-result guard preserves native errors regardless of status and leaves product output unchanged", () => {
  const original = Object.assign(new Error("native spawn error"), { code: "EPERM", syscall: "spawnSync", path: "synthetic-node" });
  for (const status of [0, 1, null]) {
    assert.throws(() => requireSpawnResult({ error: original, status }), error => error === original);
  }
  // Nonzero exit status is a product response, not a spawn error. Callers still
  // assert its status and parsed output in their existing product tests.
  for (const status of [0, 1]) {
    const result = { error: undefined, status, stdout: '{"ok":false}' };
    assert.equal(requireSpawnResult(result), result);
  }
  let caught: unknown = "not thrown";
  try { requireSpawnResult({ error: null }); } catch (error) { caught = error; }
  assert.equal(caught, null); // Preserve the old strict undefined guard.
});
