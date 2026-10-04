export function isUncertainFounderAnswer(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /^(?:(?:i(?:'|’)m|i\s+am)\s+not\s+sure|not\s+sure|(?:i\s+)?(?:do\s+not|don't|don’t)\s+know|(?:i\s+)?(?:have\s+not|haven't|haven’t)\s+decided|(?:still\s+)?(?:undecided|unknown)|not\s+decided|not\s+yet|tbd)(?:\s+yet)?[.!?]?$/i.test(value.trim());
}
