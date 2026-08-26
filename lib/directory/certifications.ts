import type { CertificationFilter, Plant } from "./types";

export interface CertificationGroups {
  regulatoryStatus: string[];
  foodSafetySystems: string[];
  thirdPartyCertifications: string[];
  productFacilityCertifications: string[];
  facilityClaims: string[];
  otherPublishedClaims: string[];
}

const emptyGroups = (): CertificationGroups => ({
  regulatoryStatus: [],
  foodSafetySystems: [],
  thirdPartyCertifications: [],
  productFacilityCertifications: [],
  facilityClaims: [],
  otherPublishedClaims: [],
});

function normalizedClaim(value: string): string {
  return value
    .replace(/FDA[- ]approved/gi, "FDA status claimed; confirm current registration or inspection scope")
    .replace(/FDA[- ]certified/gi, "FDA status claimed; confirm current registration or inspection scope")
    .replace(/FDA certified facility/gi, "FDA status claimed; confirm current registration or inspection scope")
    .trim();
}

function addUnique(values: string[], value: string) {
  if (!values.some((candidate) => candidate.toLowerCase() === value.toLowerCase())) values.push(value);
}

export function classifyCertificationClaims(claims: string[]): CertificationGroups {
  const groups = emptyGroups();

  for (const rawClaim of claims) {
    const claim = normalizedClaim(rawClaim);
    if (!claim) continue;
    let matched = false;
    const isOrganicCertification = /certified organic|organic certified|USDA organic|Oregon Tilth|CCOF/i.test(claim);
    const hasSpecificRegulatoryStatus = /\bFDA\b|FSIS|USDA[-– ]?(?:AMS|FSIS)|USDA (?:inspected|licensed|registered|on[- ]site)|department of (?:agriculture|health)|state inspection/i.test(claim);

    if (hasSpecificRegulatoryStatus || (/\bUSDA\b/i.test(claim) && !isOrganicCertification)) {
      addUnique(groups.regulatoryStatus, claim);
      matched = true;
    }
    if (/\bHACCP\b/i.test(claim)) {
      const qualifiedHaccp = /\b(?:training|compliant|compliance|program|based(?: system)?)\b/i.test(claim);
      addUnique(groups.foodSafetySystems, qualifiedHaccp ? claim : "HACCP");
      matched = true;
    }
    if (/\bHARPC\b/i.test(claim)) {
      addUnique(groups.foodSafetySystems, "HARPC");
      matched = true;
    }
    if (/\bGMPs?\b|good manufacturing|preventive controls|PCQI/i.test(claim)) {
      addUnique(groups.foodSafetySystems, claim);
      matched = true;
    }
    if (/\bSQF\b|\bBRCGS?\b|FSSC ?22000|AIB audit/i.test(claim)) {
      const thirdPartyClaim = claim
        .replace(/\bBRC\b/g, "BRCGS")
        .replace(/\s*[,;/]?\s*\b(?:HACCP|HARPC)\b.*$/i, "")
        .trim();
      addUnique(groups.thirdPartyCertifications, thirdPartyClaim || claim);
      matched = true;
    }
    if (/certified organic|organic certified|USDA organic|Oregon Tilth|CCOF|\bkosher\b|KOF-K|STAR-K|\bhalal\b|non[- ]GMO project|GFCO/i.test(claim)) {
      addUnique(groups.productFacilityCertifications, claim);
      matched = true;
    }
    if (/allergen[- ]free|gluten[- ]free|nut[- ]free|peanut[- ]free|dairy[- ]free|soy[- ]free|sesame[- ]free/i.test(claim)) {
      addUnique(groups.facilityClaims, claim);
      matched = true;
    }
    if (!matched) addUnique(groups.otherPublishedClaims, claim);
  }

  return groups;
}

export function certificationClaimCount(groups: CertificationGroups): number {
  return Object.values(groups).reduce((total, values) => total + values.length, 0);
}

export function certificationCardClaims(plant: Plant): string[] {
  const groups = classifyCertificationClaims(plant.certs);
  const orderedClaims = [
    ...groups.thirdPartyCertifications,
    ...groups.productFacilityCertifications,
    ...groups.regulatoryStatus,
    ...groups.foodSafetySystems,
    ...groups.facilityClaims,
    ...groups.otherPublishedClaims,
  ];
  return orderedClaims.filter((claim, index) => (
    orderedClaims.findIndex((candidate) => candidate.toLowerCase() === claim.toLowerCase()) === index
  ));
}

export function matchesCertificationClaim(plant: Plant, filter: CertificationFilter): boolean {
  const groups = classifyCertificationClaims(plant.certs);
  const searchable = Object.values(groups).flat().join(" ");
  const patterns: Record<CertificationFilter, RegExp> = {
    organic: /\borganic\b/i,
    kosher: /\bkosher\b|KOF-K|STAR-K/i,
    halal: /\bhalal\b/i,
    "gluten-free": /gluten[- ]?free|GFCO/i,
    "non-gmo": /non[- ]?GMO/i,
    sqf: /\bSQF\b/i,
  };
  return patterns[filter].test(searchable);
}

export function claimSourceLabel(plant: Plant): string {
  if (!plant.claimSource) {
    return plant.listingStatus === "LISTABLE"
      ? "Reported by a public directory; confirm with the company"
      : "Public sources listed below";
  }

  switch (plant.claimSource) {
    case "company-published": return "Company-published information";
    case "directory-reported": return "Reported by a public directory; confirm with the company";
    case "mixed-public-sources": return "Company pages and other public sources";
  }
}
