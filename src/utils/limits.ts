/** Resource limits are validated before adapters are called; zero means no results. */
export const MAX_RECALL_LIMIT = 1000;

export function boundedInteger(name: string, value: number, max: number, min = 0): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}
