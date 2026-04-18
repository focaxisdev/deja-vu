export function lexicalSimilarity(a: string, b: string): number {
  const tokensA = new Set((a.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((token) => token.length > 2));
  const tokensB = new Set((b.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((token) => token.length > 2));

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
