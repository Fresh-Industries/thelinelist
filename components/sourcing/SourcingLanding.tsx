"use client";

import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildSourcingAgentState } from "@/lib/sourcing/agent-state";
import { SOURCING_FIELD_KEYS, type AgentFieldUpdate, type SourcingWorkspace } from "@/lib/sourcing/types";
import { FOUNDER_STAGES, type FounderStage } from "@/lib/sourcing/preparation";
import { rememberActivePlan } from "@/lib/sourcing/active-plan";
import { track } from "@/lib/analytics/client";

const PROMPT_STARTERS = [
  { label: "Drink", seed: "I want to make a packaged drink...", image: "/images/clay-v2/products/functional-beverages.webp" },
  { label: "Sauce or condiment", seed: "I want to make a packaged sauce...", image: "/images/clay-v2/products/sauce.webp" },
  { label: "Baked good", seed: "I want to package a baked good...", image: "/images/clay-v2/packaging/bakery-bag-mini-loaf.png" },
  { label: "Snack", seed: "I want to turn my snack idea into a packaged product...", image: "/images/clay-v2/products/dips-hummus.webp" },
  { label: "Prepared food", seed: "I want to make a packaged prepared food...", image: "/images/clay-v2/products/prepared-refrigerated-foods.webp" },
  { label: "Something else", seed: "I have an idea for a food or beverage product...", image: "/images/clay-v2/support/question-mark.webp" },
] as const;

export function SourcingLanding({ returnGuide }: { returnGuide?: { slug: string; title: string } }) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [stage, setStage] = useState<FounderStage | "">("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [agentConnected, setAgentConnected] = useState(false);
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const creationAttemptRef = useRef<{ payloadKey: string; mutationId: string } | null>(null);
  const creationPayloadsRef = useRef(new Map<string, string>());
  const creationRequestsRef = useRef(new Map<string, Promise<CreationPayload>>());

  function seedIdea(seed: string) {
    setIdea(seed);
    requestAnimationFrame(() => {
      const input = ideaRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(seed.length, seed.length);
    });
  }

  const createWorkspace = useCallback(async (rawIdea: string, initialUpdates?: AgentFieldUpdate[], navigate = true, requestedMutationId?: string, startingStage?: FounderStage) => {
    const trimmed = rawIdea.trim();
    if (!trimmed) return;
    const payloadKey = stableJsonStringify({ idea: trimmed, initialUpdates: initialUpdates ?? [], ...(startingStage ? { startingStage } : {}) });
    if (creationAttemptRef.current?.payloadKey !== payloadKey || (requestedMutationId && creationAttemptRef.current.mutationId !== requestedMutationId)) {
      creationAttemptRef.current = { payloadKey, mutationId: requestedMutationId ?? createMutationId() };
    }
    const mutationId = creationAttemptRef.current.mutationId;
    const priorPayload = creationPayloadsRef.current.get(mutationId);
    if (priorPayload && priorPayload !== payloadKey) {
      throw new Error("That mutationId belongs to a different workspace creation payload. Use a new mutationId instead of changing an idempotent retry.");
    }
    creationPayloadsRef.current.set(mutationId, payloadKey);

    let request = creationRequestsRef.current.get(mutationId);
    if (!request) {
      setPending(true);
      setError("");
      request = requestWorkspaceCreation({ trimmed, mutationId, initialUpdates, startingStage });
      creationRequestsRef.current.set(mutationId, request);
    }
    try {
      const payload = await request;
      if (creationRequestsRef.current.get(mutationId) === request) creationRequestsRef.current.delete(mutationId);
      setPending(false);
      rememberActivePlan(payload.workspace.id);
      if (payload.receipt.outcome === "created") track("product_plan_created");
      if (navigate) router.push(payload.receipt.workspaceUrl);
      return payload;
    } catch (caught) {
      creationRequestsRef.current.delete(mutationId);
      setError(caught instanceof Error ? caught.message : "Your product workspace could not be created.");
      setPending(false);
      throw caught;
    }
  }, [router]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = await createWorkspace(idea, undefined, !returnGuide, undefined, stage || undefined).catch(() => undefined);
    if (payload && returnGuide) router.push(`/guides/${returnGuide.slug}#checklist`);
  }

  useEffect(() => {
    const modelContext = document.modelContext ?? navigator.modelContext;
    if (!modelContext) return;
    const controller = new AbortController();
    const ensureActiveEntry = () => {
      const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
      if (controller.signal.aborted || currentPath !== "/sourcing") {
        throw new Error("This WebMCP tool handle is stale. Refetch the tools on the current page before retrying; no workspace creation was attempted.");
      }
    };
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
        ensureActiveEntry();
        const args = input as { idea?: unknown; mutationId?: unknown; initialUpdates?: AgentFieldUpdate[] };
        const rawIdea = args.idea;
        if (typeof rawIdea !== "string" || rawIdea.trim().length < 2) throw new Error("Tell me the product idea in at least two characters.");
        if (typeof args.mutationId !== "string" || !/^[A-Za-z0-9_-]{20,128}$/.test(args.mutationId)) {
          throw new Error("Create one opaque mutationId and reuse it if this exact workspace creation is retried.");
        }
        const payload = await createWorkspace(rawIdea, args.initialUpdates, false, args.mutationId);
        if (!payload?.workspace || !payload.receipt) throw new Error("The product workspace could not be created.");
        const result = {
          ...buildSourcingAgentState(payload.workspace),
          receipt: {
            ...payload.receipt,
            replaySafe: true,
            exactPayloadRequired: true,
            reuseMutationIdForExactRetry: true,
            navigationTarget: payload.receipt.workspaceUrl,
            navigationDeferred: true,
            refetchToolsAfterNavigation: true,
          },
          workspaceUrl: payload.receipt.workspaceUrl,
          created: payload.receipt.outcome === "created",
        };
        deferToolNavigation(() => {
          const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
          if (!controller.signal.aborted && currentPath === "/sourcing") router.push(payload.receipt.workspaceUrl);
        });
        return result;
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
        <p className="document-kicker"><Sparkle aria-hidden="true" weight="fill" /> From idea to first conversation</p>
        <h1 id="sourcing-entry-heading">Start your food or drink brand.</h1>
        <p>Start with what you know. Keep your decisions, useful lessons, and first-run estimates in one private product plan. You can edit it yourself or work with your connected agent.</p>
      </div>
      {agentConnected ? <div className="agent-start-state is-connected"><span aria-hidden="true" /><div><strong>Agent connected</strong><p>Describe your idea in chat. Your agent can create your product plan now.</p></div></div> : null}
      <details className="manual-start" open={manualOpen ?? (!agentConnected || Boolean(returnGuide))}>
        <summary onClick={(event) => { event.preventDefault(); setManualOpen(!(manualOpen ?? (!agentConnected || Boolean(returnGuide)))); }}>{agentConnected ? "Or start here yourself" : "Start with your idea"}</summary>
      <form className="idea-composer" onSubmit={start} onFocusCapture={() => setManualOpen(true)}>
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
        <fieldset className="founder-stage-picker">
          <legend>Where are you starting? <span>Optional</span></legend>
          <div>{FOUNDER_STAGES.map((item) => <label key={item.value} className={stage === item.value ? "is-selected" : ""}><input type="radio" name="starting-stage" value={item.value} checked={stage === item.value} onChange={() => setStage(item.value)} /><strong>{item.label}</strong><span>{item.description}</span></label>)}</div>
          <label className="stage-unsure"><input type="radio" name="starting-stage" value="" checked={stage === ""} onChange={() => setStage("")} /> I’m not sure yet</label>
        </fieldset>
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
          <p>These are only starting points. You can change any part of your idea.</p>
        </fieldset>
        <div>
          <span>No manufacturing experience needed. “I’m not sure” is always a valid answer.</span>
          <button type="submit" disabled={pending || idea.trim().length < 2}>{pending ? "Starting your plan…" : <>Create my product plan <ArrowRight aria-hidden="true" weight="bold" /></>}</button>
        </div>
        {returnGuide ? <p>Then return to {returnGuide.title} to save your work.</p> : null}
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

interface CreationPayload {
  workspace: SourcingWorkspace;
  receipt: CreationReceipt;
}

async function requestWorkspaceCreation({
  trimmed,
  mutationId,
  initialUpdates,
  startingStage,
}: {
  trimmed: string;
  mutationId: string;
  initialUpdates?: AgentFieldUpdate[];
  startingStage?: FounderStage;
}): Promise<CreationPayload> {
  const response = await fetch("/api/sourcing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea: trimmed, mutationId, ...(initialUpdates?.length ? { initialUpdates } : {}), ...(startingStage ? { startingStage } : {}) }),
  });
  const payload = await response.json().catch(() => null) as (Partial<CreationPayload> & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error || `Your product workspace could not be created (${response.status}).`);
  if (!payload?.workspace || !payload.receipt?.authoritative || payload.receipt.currentWorkspaceId !== payload.workspace.id) {
    throw new Error(payload?.error || "Your product workspace could not be created with an authoritative receipt.");
  }
  return payload as CreationPayload;
}

function deferToolNavigation(navigate: () => void) {
  window.setTimeout(navigate, 250);
}

function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`)
    .join(",")}}`;
}

function createMutationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
