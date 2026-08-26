import { CORNERSTONE_GUIDES, getCornerstoneGuide } from "@/lib/guides/cornerstones";
import { describe, expect, it } from "vitest";

describe("cornerstone guides", () => {
  it("keeps each direct answer within the 40 to 60 word answer-engine target", () => {
    for (const guide of CORNERSTONE_GUIDES) {
      const wordCount = guide.directAnswer.trim().split(/\s+/).length;
      expect(wordCount, guide.slug).toBeGreaterThanOrEqual(40);
      expect(wordCount, guide.slug).toBeLessThanOrEqual(60);
    }
  });

  it("gives the hot-sauce guide a beginner path and authoritative safety source", () => {
    const guide = getCornerstoneGuide("start-hot-sauce");

    expect(guide).toMatchObject({
      title: "How to start a hot sauce brand",
      diagram: "hot-sauce",
      reviewedLabel: "25 Aug 2026",
    });
    expect(guide?.steps.map((step) => step.title)).toEqual([
      "Pick your starting route",
      "Turn the idea into a clear brief",
      "Have a food-safety expert review it",
      "Choose the process and bottle together",
      "Make a trial batch on real equipment",
      "Compare the right manufacturers",
      "Plan the launch after fill day",
    ]);
    expect(guide?.sources.some((source) => source.href.startsWith("https://www.fda.gov/"))).toBe(true);
  });

  it("publishes the Drive-backed foundation guides without planning placeholders", () => {
    expect(getCornerstoneGuide("co-packer-vs-private-label")).toBeDefined();
    expect(getCornerstoneGuide("how-to-find-a-co-packer")).toBeDefined();
    expect(getCornerstoneGuide("private-label-bottled-water")).toBeDefined();
    expect(getCornerstoneGuide("food-manufacturing-certifications")).toBeDefined();
    expect(JSON.stringify(CORNERSTONE_GUIDES)).not.toMatch(/\[S\d+\]|fantasy list|only a vibe|dump CSV/i);
  });
});
