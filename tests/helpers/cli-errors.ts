/** Parse an expected CLI error response without hiding spawn/transport failures. */
export function parseExpectedCliFailure(error: unknown): any {
  if (typeof error !== "object" || error === null) throw error;
  const failure = error as { status?: unknown; signal?: unknown; code?: unknown; error?: unknown; stdout?: unknown };
  // execFileSync throws for both operational errors and ordinary nonzero exits.
  // Only the latter can be an expected JSON response. Keep the original object
  // (code, syscall, path, args, stderr and cause) for every operational failure.
  if (failure.code !== undefined || failure.error !== undefined ||
      (failure.signal !== null && failure.signal !== undefined) ||
      typeof failure.status !== "number" || !Number.isInteger(failure.status) || failure.status <= 0 ||
      typeof failure.stdout !== "string") {
    throw error;
  }
  try {
    return JSON.parse(failure.stdout);
  } catch (parseError) {
    throw new CliResponseError(failure.status, error, parseError);
  }
}

export class CliResponseError extends Error {
  constructor(readonly exitStatus: number, cause: unknown, readonly parseError: unknown) {
    // Do not copy arbitrary CLI stdout/stderr into the message. The original
    // execution error remains available to the test runner through cause.
    super(`CLI exited with status ${exitStatus} without a valid JSON response`, { cause });
    this.name = "CliResponseError";
  }
}

/** Preserve a native spawn error instead of replacing it with an assertion error. */
export function requireSpawnResult<T extends { error?: unknown }>(result: T): T {
  if (result.error !== undefined) throw result.error;
  return result;
}
