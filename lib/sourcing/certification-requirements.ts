export type CertificationPriority = "required" | "preferred" | "negated" | "unknown";

export interface NormalizedCertificationRequirements {
  required: string[];
  preferred: string[];
  negated: string[];
  unknown: string[];
}

interface CertificationDefinition {
  label: string;
  pattern: RegExp;
}

const CERTIFICATIONS: CertificationDefinition[] = [
  { label: "Organic", pattern: /\b(?:usda\s+)?organic\b/gi },
  { label: "Gluten-free", pattern: /\bgluten[-\s]?free\b/gi },
  { label: "Non-GMO", pattern: /\bnon[-\s]?gmo\b/gi },
  { label: "Kosher", pattern: /\bkosher\b/gi },
  { label: "Halal", pattern: /\bhalal\b/gi },
  { label: "SQF", pattern: /\bsqf\b/gi },
];

export function normalizeCertificationRequirements(
  value: string | null | undefined,
  defaultPriority: Exclude<CertificationPriority, "negated" | "unknown"> | null = "required",
): NormalizedCertificationRequirements {
  const result: NormalizedCertificationRequirements = { required: [], preferred: [], negated: [], unknown: [] };
  if (!value?.trim()) return result;

  for (const definition of CERTIFICATIONS) {
    definition.pattern.lastIndex = 0;
    for (const match of value.matchAll(definition.pattern)) {
      const index = match.index ?? 0;
      const clause = surroundingClause(value, index, match[0].length);
      const priority = certificationPriority(clause, match[0], defaultPriority);
      if (!priority) continue;
      const list = result[priority];
      if (!list.includes(definition.label)) list.push(definition.label);
    }
  }

  for (const rawClause of value.split(/[;.\n]+/)) {
    const clause = rawClause.trim();
    if (!clause || !/\bcertif(?:ication|ied)\b/i.test(clause)) continue;
    if (CERTIFICATIONS.some((definition) => {
      definition.pattern.lastIndex = 0;
      return definition.pattern.test(clause);
    })) continue;
    const label = clause
      .replace(/\b(?:is|are|facility|line|certification|certified|required|requirement|preferred|optional|not|no|currently)\b/gi, " ")
      .replace(/[-–—]\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!label) continue;
    const priority = certificationPriority(clause, label, defaultPriority);
    if (priority && !result[priority].includes(label)) result[priority].push(label);
  }

  for (const negated of result.negated) {
    result.required = result.required.filter((item) => item !== negated);
    result.preferred = result.preferred.filter((item) => item !== negated);
    result.unknown = result.unknown.filter((item) => item !== negated);
  }
  for (const unknown of result.unknown) {
    result.required = result.required.filter((item) => item !== unknown);
    result.preferred = result.preferred.filter((item) => item !== unknown);
  }
  return result;
}

export function certificationEvidenceSpans(value: string): Array<{ start: number; end: number; text: string }> {
  const spans: Array<{ start: number; end: number; text: string }> = [];
  for (const definition of CERTIFICATIONS) {
    definition.pattern.lastIndex = 0;
    for (const match of value.matchAll(definition.pattern)) {
      const index = match.index ?? 0;
      const bounds = surroundingClauseBounds(value, index, match[0].length);
      if (!spans.some((span) => span.start === bounds.start && span.end === bounds.end)) {
        spans.push({ ...bounds, text: value.slice(bounds.start, bounds.end) });
      }
    }
  }
  return spans.sort((left, right) => left.start - right.start);
}

function certificationPriority(
  clause: string,
  matchedText: string,
  defaultPriority: Exclude<CertificationPriority, "negated" | "unknown"> | null,
): CertificationPriority | null {
  const localClause = contrastSegment(clause, matchedText);
  const escaped = escapeRegExp(matchedText);
  if (/\b(?:unknown|undecided|unconfirmed|not\s+sure|to\s+be\s+determined|tbd)\b/i.test(localClause)) return "unknown";
  if (
    new RegExp(`(?:\\bno\\b|\\bwithout\\b)[^.;]{0,35}${escaped}`, "i").test(localClause)
    || new RegExp(`\\bnot\\s+required\\b[^.;]{0,35}${escaped}`, "i").test(localClause)
    || new RegExp(`${escaped}[^.;]{0,35}\\b(?:not|required\\s+no)\\s+(?:currently\\s+)?required\\b`, "i").test(localClause)
    || new RegExp(`${escaped}[^.;]{0,35}\\bnot\\s+needed\\b`, "i").test(localClause)
    || new RegExp(`\\bno\\b[^.;]{0,20}${escaped}[^.;]{0,20}\\brequirement\\b`, "i").test(localClause)
  ) return "negated";
  if (/\b(?:preferred|preference|nice to have|would be nice|optional)\b/i.test(localClause)) return "preferred";
  if (/\b(?:required|requirement|must|need(?:ed)?|certified)\b/i.test(localClause)) return "required";
  return defaultPriority;
}

function contrastSegment(clause: string, matchedText: string): string {
  const matchIndex = clause.toLowerCase().indexOf(matchedText.toLowerCase());
  if (matchIndex < 0) return clause;
  const before = clause.slice(0, matchIndex);
  const after = clause.slice(matchIndex + matchedText.length);
  const previousContrasts = [...before.matchAll(/\b(?:but|while)\b\s*/gi)];
  const previousContrast = previousContrasts.at(-1);
  const nextContrastOffsets = [after.toLowerCase().indexOf(" but "), after.toLowerCase().indexOf(" while ")].filter((offset) => offset >= 0);
  const start = previousContrast ? (previousContrast.index ?? 0) + previousContrast[0].length : 0;
  const end = nextContrastOffsets.length ? matchIndex + matchedText.length + Math.min(...nextContrastOffsets) : clause.length;
  return clause.slice(start, end);
}

function surroundingClause(value: string, index: number, length: number): string {
  const bounds = surroundingClauseBounds(value, index, length);
  return value.slice(bounds.start, bounds.end);
}

function surroundingClauseBounds(value: string, index: number, length: number): { start: number; end: number } {
  const preceding = value.slice(0, index);
  const following = value.slice(index + length);
  const previousSeparator = Math.max(preceding.lastIndexOf(";"), preceding.lastIndexOf("."), preceding.lastIndexOf("\n"));
  const nextOffsets = [following.indexOf(";"), following.indexOf("."), following.indexOf("\n")].filter((offset) => offset >= 0);
  const start = previousSeparator + 1;
  const end = nextOffsets.length ? index + length + Math.min(...nextOffsets) : value.length;
  const raw = value.slice(start, end);
  const leading = raw.match(/^\s*/)?.[0].length ?? 0;
  const trailing = raw.match(/\s*$/)?.[0].length ?? 0;
  return { start: start + leading, end: end - trailing };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
