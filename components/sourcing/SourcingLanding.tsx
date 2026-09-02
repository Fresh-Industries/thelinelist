"use client";

import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildSourcingAgentState } from "@/lib/sourcing/agent-state";
import { SOURCING_FIELD_KEYS, type AgentFieldUpdate, type SourcingWorkspace } from "@/lib/sourcing/types";

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
  const [agentConnected, setAgentConnected] = useState(false);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const creatingRef = useRef(false);
  const creationAttemptRef = useRef<{ payloadKey: string; mutationId: string } | null>(null);

  function seedIdea(seed: string) {
    setIdea(seed);
    requestAnimationFrame(() => {
      const input = ideaRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(seed.length, seed.length);
    });
  }

  const createWorkspace = useCallback(async (rawIdea: string, initialUpdates?: AgentFieldUpdate[], navigate = true, requestedMutationId?: string) => {
    const trimmed = rawIdea.trim();
    if (!trimmed || creatingRef.current) return;
    const payloadKey = JSON.stringify({ idea: trimmed, initialUpdates: initialUpdates ?? [] });
    if (creationAttemptRef.current?.payloadKey !== payloadKey || (requestedMutationId && creationAttemptRef.current.mutationId !== requestedMutationId)) {
      creationAttemptRef.current = { payloadKey, mutationId: requestedMutationId ?? createMutationId() };
    }
    const mutationId = creationAttemptRef.current.mutationId;
    creatingRef.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: trimmed, mutationId, ...(initialUpdates?.length ? { initialUpdates } : {}) }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(failure?.error || `Your product workspace could not be created (${response.status}).`);
      }
      const payload = await response.json().catch(() => null) as {
        workspace?: SourcingWorkspace;
        receipt?: CreationReceipt;
        error?: string;
      } | null;
      if (!payload?.workspace || !payload.receipt?.authoritative || payload.receipt.currentWorkspaceId !== payload.workspace.id) {
        throw new Error(payload?.error || "Your product workspace could not be created with an authoritative receipt.");
      }
      if (navigate) router.push(payload.receipt.workspaceUrl);
      return payload;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your product workspace could not be created.");
      setPending(false);
      creatingRef.current = false;
      throw caught;
    }
  }, [router]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createWorkspace(idea, undefined, true).catch(() => undefined);
  }

  useEffect(() => {
    const modelContext = document.modelContext ?? navigator.modelContext;
    if (!modelContext) return;
    const controller = new AbortController();
    const tool: WebMcpToolDefinition = {
      name: "create_sourcing_workspace",
      title: "Start a Line List product workspace",
      description: "Create the founder's canonical Line List Product Workspace as soon as they describe a food or beverage idea. Preserve the exact idea, capture every explicitly stated fact in initialUpdates, and add useful inferences only as proposed with clear reasons. Do not ask about an optional brand or stage packaging before the next material product decision. The result exposes one blocking founder question at a time; persist the answer and read again before continuing. Never create outreach or contact anyone during creation.",
      inputSchema: {
        type: "object",
        properties: {
          idea: { type: "string", minLength: 2, maxLength: 1500 },
          mutationId: { type: "string", minLength: 20, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$" },
          initialUpdates: {
            type: "array",
            maxItems: SOURCING_FIELD_KEYS.length,
            items: {
              type: "object",
              properties: {
                key: { type: "string", enum: [...SOURCING_FIELD_KEYS] },
                value: { type: ["string", "null"] },
                status: { type: "string", enum: ["confirmed", "proposed", "needs_decision"] },
                explicitlyStated: { type: "boolean" },
                reason: { type: "string", maxLength: 1000 },
                source: { type: "string", maxLength: 500 },
                suggestedSharing: { type: "boolean" },
              },
              required: ["key", "value", "status"],
              additionalProperties: false,
            },
          },
        },
        required: ["idea", "mutationId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input) {
        const args = input as { idea?: unknown; mutationId?: unknown; initialUpdates?: AgentFieldUpdate[] };
        const rawIdea = args.idea;
        if (typeof rawIdea !== "string" || rawIdea.trim().length < 2) throw new Error("Tell me the product idea in at least two characters.");
        if (typeof args.mutationId !== "string" || !/^[A-Za-z0-9_-]{20,128}$/.test(args.mutationId)) {
          throw new Error("Create one opaque mutationId and reuse it if this exact workspace creation is retried.");
        }
        const payload = await createWorkspace(rawIdea, args.initialUpdates, false, args.mutationId);
        if (!payload?.workspace || !payload.receipt) throw new Error("The product workspace could not be created.");
        window.setTimeout(() => router.push(payload.receipt!.workspaceUrl), 0);
        return {
          ...buildSourcingAgentState(payload.workspace),
          receipt: payload.receipt,
          workspaceUrl: payload.receipt.workspaceUrl,
          created: payload.receipt.outcome === "created",
        };
      },
    };
    try {
      void Promise.resolve(modelContext.registerTool(tool, { signal: controller.signal }))
        .then(() => { if (!controller.signal.aborted) setAgentConnected(true); })
        .catch((caught) => {
          if (!controller.signal.aborted) console.warn("[webmcp] sourcing entry unavailable", caught);
        });
    } catch (caught) {
      if (!controller.signal.aborted) console.warn("[webmcp] sourcing entry unavailable", caught);
    }
    return () => controller.abort();
  }, [createWorkspace, router]);

  return (
    <section className="sourcing-entry" aria-labelledby="sourcing-entry-heading">
      <div className="sourcing-entry-copy">
        <p className="document-kicker"><Sparkle aria-hidden="true" weight="fill" /> First Run · Product collaborator</p>
        <h1 id="sourcing-entry-heading">Tell your agent what you want to make.</h1>
        <p>Your agent turns what you said into a first-pass brief, keeps suggestions visibly separate from confirmed facts, and brings you here for visual decisions and approval. You stay in control of every manufacturer introduction.</p>
      </div>
      <div className={`agent-start-state${agentConnected ? " is-connected" : ""}`}><span aria-hidden="true" /><div><strong>{agentConnected ? "Agent connected" : "Agent start available"}</strong><p>{agentConnected ? "Describe your idea in chat. Your agent can create this workspace now." : "Open this page with a WebMCP-capable agent, or start manually below."}</p></div></div>
      <details className="manual-start" open={!agentConnected}>
        <summary>Or start here yourself</summary>
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
      </details>
      <div className="sourcing-journey" aria-label="Product workspace journey">
        <span>Living brief</span><i aria-hidden="true">→</i><span>Package mockup</span><i aria-hidden="true">→</i><span>Evidence-backed matches</span><i aria-hidden="true">→</i><span>Founder-reviewed introductions</span>
      </div>
    </section>
  );
}

interface CreationReceipt {
  authoritative: true;
  mutation: "create_sourcing_workspace";
  outcome: "created" | "replayed";
  workspaceId: string;
  currentWorkspaceId: string;
  revision: number;
  workspaceUrl: string;
}

function createMutationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
