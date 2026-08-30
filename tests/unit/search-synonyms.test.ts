import { directoryFacetCounts, productComboboxSuggestions } from "@/lib/directory";
import { describe, expect, it } from "vitest";

const facetCounts = directoryFacetCounts({});

function labelsFor(query: string) {
  return productComboboxSuggestions(query, {
    isTyping: true,
    counts: {
      categories: facetCounts.categories,
      packaging: facetCounts.packaging,
      processes: facetCounts.processes,
      operationTypes: facetCounts.operationTypes,
    },
  }).map((suggestion) => suggestion.label);
}

describe("product combobox service synonyms", () => {
  it("surfaces Bottles packaging instead of a hard no-match for bottling", () => {
    const labels = labelsFor("bottling");
    expect(labels).toContain("Bottles (packaging)");
    expect(labels).toEqual(expect.arrayContaining([
      "Juice",
      "Tea and coffee drinks",
      "Energy drinks",
      "Water",
    ]));
    expect(labels.join(" ")).not.toMatch(/bottling category/i);
  });

  it("maps canning terms to the existing Cans packaging filter", () => {
    expect(labelsFor("canning")).toContain("Cans (packaging)");
    expect(labelsFor("canned")).toContain("Cans (packaging)");
    expect(labelsFor("cans")).toContain("Cans (packaging)");
  });

  it("maps filling terms to existing Hot fill and Cold fill process options", () => {
    expect(labelsFor("filling")).toEqual(expect.arrayContaining([
      "Hot fill (process)",
      "Cold fill (process)",
    ]));
    expect(labelsFor("hot fill")).toContain("Hot fill (process)");
    expect(labelsFor("cold-fill")).toContain("Cold fill (process)");
  });

  it("keeps copack searches on existing product categories instead of empty", () => {
    const labels = labelsFor("co-pack");
    expect(labels.length).toBeGreaterThan(0);
    expect(labels).toContain("Any food or drink product");
    expect(labels).toContain("Sauce");
    expect(labels.join(" ")).not.toMatch(/Contract packager|Toll processor/);
  });

  it("maps private label to the existing private-label operating model", () => {
    expect(labelsFor("private label")).toContain("Private-label producer (operating model)");
    expect(labelsFor("private-label")).toContain("Private-label producer (operating model)");
  });

  it("keeps the empty-state path for a query with no synonym or category match", () => {
    expect(labelsFor("xyzzy123")).toEqual([]);
  });
});
