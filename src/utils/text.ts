const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export function extractKeywords(text: string, limit = 24): string[] {
  const counts = new Map<string, number>();
  const tokens = text.toLowerCase().match(TOKEN_PATTERN) ?? [];

  for (const token of tokens) {
    if (token.length <= 1) {
      continue;
    }
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

export function lexicalSimilarity(a: string, b: string): number {
  const tokensA = new Set(extractKeywords(a, 200));
  const tokensB = new Set(extractKeywords(b, 200));

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.min(tokensA.size, tokensB.size);
}
