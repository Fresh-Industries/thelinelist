import { evidenceClauses } from "./evidence-text.mjs";
import { publishedCapabilityStatus } from "./capability-evidence.mjs";

const CUSTOM_PROGRAM = /\b(?:co[- ]?pack(?:ing|er|s)?|co[- ]?manufactur\w*|contract (?:manufactur\w*|packag\w*)|toll(?:ing)?|customer(?:s|['’]s)? (?:recipes?|formulas?|specification)|client recipes?|for other (?:[\w-]+ )?brands|order and specification of others|commercial production|custom (?:spice )?blending|processing services|manufacturing services)\b/gi;
const PRIVATE_PROGRAM = /\b(?:private[- ]label(?:ing)?|white label(?:ing)?|custom label(?:s|ing)?)\b/gi;
const PILOT = /\b(?:pilot|test[- ](?:runs?|batches)|trial[- ]batches?)\b/gi;
const SMALL = /\b(?:small[- ](?:batches|batch|runs?|scale)|small- or large-batch|small (?:and|or) large[- ]batch|short[- ]runs?|low[- ]volume)\b/gi;
const OWN_BRAND = /\b(?:(?:our|their|its) (?:own )?brand|for (?:our|their|its) (?:own )?(?:brand|line)|story page)\b/i;
const OWN_PRODUCT = /\b(?:our|their|its) (?:own )?(?:formulas?|recipes?|products?)\b/i;
const CLIENT_RECIPE = /\b(?:customer|client)(?:s|['’]s)? (?:recipes?|formulas?|specifications?)\b/gi;

function supportedTerms(text, pattern) {
  const terms = text.match(pattern) ?? [];
  return terms.length && publishedCapabilityStatus(text, terms) === "supported";
}

/** A source-backed external program is a research lead, never confirmed fit.
 * A reviewed program can replace lossy source text without changing that older
 * snapshot or its dates. Unresolved program applicability suppresses only the label.
 * @param {{decision?: string, publicProgram?: {evidence: string, sourceUrls: string[], reviewedAt: string}} | null} review
 * @returns {{kind: "small-batch" | "pilot" | "private-label", evidence: string, sourceUrls: string[], reviewedAt?: string} | undefined}
 */
export function publishedSmallRunOption(capabilities, minimums, sourceUrls, review = null) {
  if (review?.decision === "needs-verification") return undefined;
  if (review?.publicProgram) {
    const program = review.publicProgram;
    const option = publishedSmallRunOption(program.evidence, null, program.sourceUrls);
    return option ? { ...option, evidence: program.evidence, reviewedAt: program.reviewedAt } : undefined;
  }
  if (!sourceUrls?.length) return undefined;
  const clauses = evidenceClauses([capabilities, minimums].filter(Boolean).join("; "));
  const custom = clauses.filter((text) => supportedTerms(text, CUSTOM_PROGRAM));
  const privateLabel = clauses.filter((text) => supportedTerms(text, PRIVATE_PROGRAM));
  const restrictions = clauses.filter((text) => /\b(?:own (?:formulas?|products?)|their (?:award-winning )?products|not a stated third-party|existing products|our product|your label)\b/i.test(text));
  for (const text of clauses) {
    if (/\b(?:unused|unknown|unpublished|unverified|unconfirmed|possible|might|whether|rather than|more than)\b/i.test(text)) continue;
    const pilot = supportedTerms(text, PILOT);
    const small = supportedTerms(text, SMALL);
    if (!pilot && !small) continue;
    if (OWN_BRAND.test(text)) continue;
    if (/\b(?:kettles?|capacity|storage|warehouse|shipping)\b/i.test(text)) continue;
    if (/\bpilot (?:plant|unit|facility)\b/i.test(text) && !/\b(?:runs?|batches|customer|client)\b/i.test(text)) continue;
    const directCustom = supportedTerms(text, CUSTOM_PROGRAM);
    const directPrivate = supportedTerms(text, PRIVATE_PROGRAM);
    const clientRecipe = supportedTerms(text, CLIENT_RECIPE);
    if (!directCustom && !directPrivate && !custom.length && !privateLabel.length) continue;
    if (OWN_PRODUCT.test(text) && !clientRecipe && !privateLabel.length) continue;
    // Own-formula/custom-label restrictions persist across the source paragraph.
    // They cannot turn into an unrestricted commercial production claim.
    const privateOnly = Boolean(privateLabel.length) && !clientRecipe && (restrictions.length > 0 || (!directCustom && !custom.length));
    const kind = privateOnly ? "private-label" : pilot ? "pilot" : "small-batch";
    const program = privateOnly ? privateLabel[0] : directCustom || directPrivate ? text : custom[0] ?? privateLabel[0];
    return { kind, evidence: [...new Set([program, text, ...(privateOnly ? restrictions : [])])].join(". "), sourceUrls };
  }
  return undefined;
}

export function smallRunOptionLabel(kind) {
  return kind === "pilot" ? "Pilot or test option listed"
    : kind === "private-label" ? "Small-batch private label listed"
      : "Small-batch option listed";
}
