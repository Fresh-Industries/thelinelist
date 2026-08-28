"use client";

import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SourcingWorkspace } from "@/lib/sourcing/types";

const PROMPT_STARTERS = [
  { label: "Drink", seed: "I want to make a packaged drink...", image: "/images/clay-v2/products/functional-beverages.webp" },
  { label: "Sauce or condiment", seed: "I want to make a packaged sauce...", image: "/images/clay-v2/products/sauce.webp" },
  { label: "Baked good", seed: "I want to package a baked good...", image: "/images/clay-v2/packaging/bakery-bag-mini-loaf.png" },
  { label: "Snack", seed: "I want to turn my snack idea into a packaged product...", image: "/images/clay-v2/products/dips-hummus.webp" },
  { label: "Prepared food", seed: "I want to make a packaged prepared food...", image: "/images/clay-v2/products/prepared-refrigerated-foods.webp" },
  { label: "Something else", seed: "I have an idea for a food or beverage product...", image: "/images/clay-v2/support/question-mark.webp" },
] as const;

export function SourcingLanding() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ideaRef = useRef<HTMLTextAreaElement>(null);

  function seedIdea(seed: string) {
    setIdea(seed);
    requestAnimationFrame(() => {
      const input = ideaRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(seed.length, seed.length);
    });
  }

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = idea.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: trimmed }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(failure?.error || `Your product workspace could not be created (${response.status}).`);
      }
      const payload = await response.json().catch(() => null) as { workspace?: SourcingWorkspace; error?: string } | null;
      if (!payload?.workspace) throw new Error(payload?.error || "Your product workspace could not be created.");
      router.push(`/sourcing/${payload.workspace.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your product workspace could not be created.");
      setPending(false);
    }
  }

  return (
    <section className="sourcing-entry" aria-labelledby="sourcing-entry-heading">
      <div className="sourcing-entry-copy">
        <p className="document-kicker"><Sparkle aria-hidden="true" weight="fill" /> Product collaborator</p>
        <h1 id="sourcing-entry-heading">Start with the product in your head.</h1>
        <p>Tell your agent what you want to make. The Line List turns what you know into a living product brief, then helps with the decisions that come next.</p>
      </div>
      <form className="idea-composer" onSubmit={start}>
        <label htmlFor="product-idea">What do you want to make?</label>
        <textarea
          id="product-idea"
          ref={ideaRef}
          rows={4}
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="I make banana bread and want to sell it in stores…"
          maxLength={1_500}
          required
        />
        <fieldset className="prompt-starters">
          <legend>Start with an idea</legend>
          <div>
            {PROMPT_STARTERS.map((starter) => (
              <button key={starter.label} type="button" aria-controls="product-idea" onClick={() => seedIdea(starter.seed)}>
                <Image src={starter.image} alt="" width={52} height={52} sizes="52px" />
                <span>{starter.label}</span>
              </button>
            ))}
          </div>
          <p>These are only starting points. Your agent will help you narrow the idea.</p>
        </fieldset>
        <div>
          <span>No manufacturing experience needed. “I’m not sure” is always a valid answer.</span>
          <button type="submit" disabled={pending || idea.trim().length < 2}>{pending ? "Starting your brief…" : <>Build with your agent <ArrowRight aria-hidden="true" weight="bold" /></>}</button>
        </div>
        {error ? <p className="sourcing-error" role="alert">{error}</p> : null}
      </form>
      <div className="sourcing-journey" aria-label="Product workspace journey">
        <span>Living brief</span><i aria-hidden="true">→</i><span>Package mockup</span><i aria-hidden="true">→</i><span>Evidence-backed matches</span><i aria-hidden="true">→</i><span>Founder-reviewed introductions</span>
      </div>
    </section>
  );
}
