/** A published option is a research lead, never confirmed project suitability.
 * Numeric MOQ disclosure and internal research flags are not small-run evidence.
 */
/** @returns {{ kind: "small-batch" | "pilot" | "private-label", evidence: string, sourceUrls: string[] } | undefined} */
export function publishedSmallRunOption(capabilities, minimums, sourceUrls) {
  if (!sourceUrls?.length) return undefined;
  const statements = [capabilities, minimums].filter(Boolean).flatMap((value) => value.split(/;|\n|\.(?:\s|$)/));
  for (const statement of statements) {
    if (/\b(?:not|unused|unknown|unpublished|unverified|unconfirmed|possible|might|whether|rather than|more than)\b/i.test(statement)) continue;
    if (/\bno\b(?! minimum)/i.test(statement)) continue;
    const pilot = /\b(?:pilot(?:[- ](?:runs?|batches?|production))?|test[- ](?:runs?|batches?)|trial[- ]batches?)\b/i.test(statement);
    const small = /\b(?:small[- ](?:batches|batch|runs?|scale)|small- or large-batch|short[- ]runs?|low[- ]volume)\b/i.test(statement);
    if (!pilot && !small) continue;
    // Equipment size, warehouse rental and wholesale orders do not describe a production offer.
    if (/\b(?:kettles?|capacity|storage|warehouse|wholesale|shipping)\b/i.test(statement)) continue;
    const kind = /private[- ]label|custom label/i.test(statement) ? "private-label" : pilot ? "pilot" : "small-batch";
    return { kind, evidence: statement.trim(), sourceUrls };
  }
  return undefined;
}

export function smallRunOptionLabel(kind) {
  return kind === "pilot" ? "Pilot or test option listed"
    : kind === "private-label" ? "Small-batch private label listed"
      : "Small-batch option listed";
}
