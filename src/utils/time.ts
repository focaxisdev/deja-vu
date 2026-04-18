export function isoNow(): string {
  return new Date().toISOString();
}

export function daysBetween(isoDate: string, now = new Date()): number {
  const then = new Date(isoDate).getTime();
  return Math.max(0, (now.getTime() - then) / (1000 * 60 * 60 * 24));
}
