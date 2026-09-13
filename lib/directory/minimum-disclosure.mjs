/** A disclosed MOQ is separate from a small-run option and from project fit. */
export function hasPublishedMinimum(value) {
  if (!value) return false;
  return value.split(/;|\n|\.(?:\s|$)/).some(minimumStatement);
}

function minimumStatement(value) {
  if (/\b(?:no minimum(?: order)?(?: quantity)?(?:[.!]|$)|no order minimum(?:[.!]|$))/i.test(value) && !/\b(?:not|unpublished|unstated|wholesale|shipping)\b/i.test(value)) return true;
  if (/\b(?:unknown|unpublished|not (?:published|stated)|no minimum (?:is )?published|no (?:numeric|separate|custom[- ]recipe)|capacity|kettles?|per (?:day|year|quarter)|annual|standard batch|batch sizes|lowest band|contact form)\b/i.test(value)) return false;
  if (/\b(?:projects?|runs?) start(?:s)? at \$[\d,]+/i.test(value)) return true;
  if (/\b(?:minimum|MOQ|per (?:SKU|flavor|product|order)|smallest run)\b/i.test(value)) return /\d|\b(?:one|two|three|four) batches/i.test(value);
  return /^\s*\d[\d,.]*\s*(?:lb|lbs|pounds?|gallons?|gal|units?|cases?|jars?)\b/i.test(value)
    || /(?:pilot|small-scale) runs start at \$\d/i.test(value);
}
