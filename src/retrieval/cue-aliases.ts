export interface CueAlias {
  /** An exact complete query, compared after lowercase and whitespace normalization. */
  alias: string;
  /** Existing lexical cue(s), usually a distinctive tag on the intended memory. */
  cue: string;
}

export function normalizeCue(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/gu, " ");
}

/** Explicit routing, not translation, substring expansion, or a semantic model. */
export function compileCueAliases(aliases: readonly CueAlias[] = []): ReadonlyMap<string, string> {
  if (!Array.isArray(aliases) || aliases.length > 128) throw new RangeError("cueAliases must contain at most 128 entries");
  const map = new Map<string, string>();
  for (const entry of aliases) {
    if (!entry || typeof entry.alias !== "string" || typeof entry.cue !== "string" ||
        !entry.alias.trim() || !entry.cue.trim() || entry.alias.length > 256 || entry.cue.length > 256) {
      throw new TypeError("alias and cue must be non-empty strings of at most 256 characters");
    }
    const alias = normalizeCue(entry.alias);
    if (map.has(alias) && map.get(alias) !== entry.cue) throw new Error(`Conflicting cue alias: ${alias}`);
    map.set(alias, entry.cue);
  }
  return map;
}
