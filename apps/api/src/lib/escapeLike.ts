/**
 * Escape PostgreSQL LIKE/ILIKE metacharacters in a user-supplied search term
 * (BL-108).
 *
 * Prisma builds `contains` / `startsWith` / `endsWith` into a LIKE pattern with
 * the term interpolated verbatim, so an unescaped `%` matches every row and `_`
 * becomes a single-character wildcard. Backslash has to be escaped too, and
 * first: it is PostgreSQL's default LIKE escape character, so a term ending in
 * a lone backslash makes the engine reject the pattern outright ("LIKE pattern
 * must not end with escape character") — a 500 on any public search box. The
 * single character-class pass covers all three without re-escaping the
 * backslashes it just inserted.
 */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}
