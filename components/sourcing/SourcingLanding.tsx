"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const EXAMPLES = ["Energy drink", "Hot sauce", "Packaged banana bread", "Protein snack", "Sparkling water"];

function starterPrompt(idea: string): string {
  return `I want to make ${idea.trim()}. Use The Line List to help me turn it into a manufacturer-ready product plan.

Ask me one simple question at a time and update my Line List workspace as we go. Tell me what I still need to figure out, find potential manufacturers using sourced information only, and help me prepare an introduction when I’m ready.

Do not contact or send anything to a manufacturer without showing it to me and getting my approval first.`;
}

export function SourcingLanding() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ideaInputRef = useRef<HTMLInputElement>(null);
  const [idea, setIdea] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<"manual" | "demo" | "prompt" | null>(null);
  const [error, setError] = useState("");

  function openOnboarding(example = "") {
    setIdea(example);
    setWorkspaceId("");
    setError("");
    setDialogOpen(true);
    dialogRef.current?.showModal();
    window.setTimeout(() => ideaInputRef.current?.focus(), 0);
  }

  function closeOnboarding() {
    if (pending) return;
    dialogRef.current?.close();
    setDialogOpen(false);
  }

  async function createWorkspace(input: { demo?: boolean; idea?: string }, kind: "manual" | "demo" | "prompt") {
    setPending(kind);
    setError("");
    try {
      const response = await fetch("/api/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await response.json().catch(() => null) as { workspace?: { id: string }; error?: string } | null;
      if (!response.ok || !body?.workspace) throw new Error(body?.error || "Your product plan could not be created.");
      if (kind === "prompt") setWorkspaceId(body.workspace.id);
      else router.push(`/sourcing/${body.workspace.id}`);
      return body.workspace.id;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your product plan could not be created.");
      return null;
    } finally {
      setPending(null);
    }
  }

  async function continueToPrompt() {
    const trimmed = idea.trim();
    if (!trimmed) return;
    await createWorkspace({ idea: trimmed }, "prompt");
  }

  async function copyAndOpenChatGpt() {
    if (!workspaceId) return;
    const chatGptWindow = window.open("https://chatgpt.com", "_blank", "noopener,noreferrer");
    try {
      await navigator.clipboard.writeText(starterPrompt(idea));
      router.push(`/sourcing/${workspaceId}?chatgpt=ready`);
    } catch {
      chatGptWindow?.close();
      setError("Copy did not work. Select the prompt and copy it manually.");
    }
  }

  return (
    <>
      <section className="sourcing-hero" aria-labelledby="sourcing-hero-heading">
        <div className="sourcing-hero-copy">
          <p className="kicker">Your idea, with a clear next step</p>
          <h1 id="sourcing-hero-heading">Turn your food idea into a plan manufacturers can use.</h1>
          <p className="lede">Use ChatGPT and The Line List together to build your product plan, find possible manufacturers, and prepare your first introduction.</p>
          <div className="sourcing-hero-actions">
            <button className="btn btn-gold" type="button" onClick={() => openOnboarding()}>Use with ChatGPT</button>
            <button className="btn btn-ghost" type="button" disabled={pending !== null} onClick={() => createWorkspace({}, "manual")}>{pending === "manual" ? "Starting…" : "Build it myself"}</button>
          </div>
          <p className="sourcing-reassurance"><span aria-hidden="true">✓</span> No manufacturing experience needed.</p>
        </div>

        <div className="sourcing-collaboration-demo" aria-label="ChatGPT conversation updates a product plan on The Line List">
          <p className="mini-label">Talk naturally in ChatGPT</p>
          <div className="conversation-sample">
            <p>“I want to make a sparkling drink in 12 oz cans.”</p>
            <span>ChatGPT asks one simple question at a time.</span>
          </div>
          <div className="collaboration-arrow" aria-hidden="true">→</div>
          <div className="plan-sample">
            <div><span>Product</span><strong>Sparkling drink</strong></div>
            <div><span>Package</span><strong>12 oz cans</strong></div>
            <div className="is-next"><span>Next</span><strong>First production amount</strong></div>
          </div>
          <p className="collaboration-caption">Watch your product plan come together on The Line List.</p>
        </div>
      </section>

      <section className="sourcing-examples" aria-labelledby="sourcing-examples-heading">
        <div>
          <p className="kicker">Start with an idea</p>
          <h2 id="sourcing-examples-heading">What do you want to make?</h2>
        </div>
        <div className="sourcing-example-list">
          {EXAMPLES.map((example) => <button type="button" key={example} onClick={() => openOnboarding(example)}>{example}<span aria-hidden="true">→</span></button>)}
        </div>
        <button className="sourcing-demo-link" type="button" disabled={pending !== null} onClick={() => createWorkspace({ demo: true }, "demo")}>{pending === "demo" ? "Loading the demo…" : "Or explore the ready-made energy drink demo"}</button>
      </section>

      {error && !dialogOpen ? <p className="sourcing-error" role="alert">{error}</p> : null}

      <dialog ref={dialogRef} className="chatgpt-onboarding" aria-labelledby="chatgpt-onboarding-heading" onCancel={(event) => { event.preventDefault(); closeOnboarding(); }}>
        <button className="dialog-close" type="button" aria-label="Close ChatGPT onboarding" onClick={closeOnboarding}>×</button>
        {!workspaceId ? (
          <form method="dialog" onSubmit={(event) => { event.preventDefault(); void continueToPrompt(); }}>
            <p className="kicker">Start with a sentence</p>
            <h2 id="chatgpt-onboarding-heading">Build your product plan with ChatGPT</h2>
            <p>Keep The Line List open while you talk with ChatGPT. In supported browsers, ChatGPT can build and update your product plan here as you answer questions.</p>
            <label htmlFor="sourcing-idea">What do you want to make?</label>
            <input ref={ideaInputRef} id="sourcing-idea" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="A packaged banana bread I can sell in grocery stores" maxLength={300} autoComplete="off" />
            {error ? <p className="sourcing-error" role="alert">{error}</p> : null}
            <div className="dialog-actions">
              <button className="btn btn-gold" type="submit" disabled={!idea.trim() || pending !== null}>{pending === "prompt" ? "Building your prompt…" : "Create my starter prompt"}</button>
              <button className="text-button" type="button" onClick={closeOnboarding}>Go back</button>
            </div>
          </form>
        ) : (
          <div className="prompt-step">
            <p className="kicker">Your prompt is ready</p>
            <h2 id="chatgpt-onboarding-heading">Copy this into ChatGPT</h2>
            <p>ChatGPT opens normally in a new tab—this is not a connection indicator. Keep your new Line List product plan open so ChatGPT can use the page tools when your browser supports them.</p>
            <label htmlFor="starter-prompt">Personalized starter prompt</label>
            <textarea id="starter-prompt" value={starterPrompt(idea)} readOnly rows={11} onFocus={(event) => event.currentTarget.select()} />
            {error ? <p className="sourcing-error" role="alert">{error}</p> : null}
            <div className="dialog-actions">
              <button className="btn btn-gold" type="button" onClick={copyAndOpenChatGpt}>Copy and continue in ChatGPT</button>
              <a className="btn btn-ghost" href="https://chatgpt.com" target="_blank" rel="noreferrer">Open ChatGPT</a>
              <button className="text-button" type="button" onClick={() => setWorkspaceId("")}>Go back</button>
            </div>
          </div>
        )}
        <p className="workspace-link-note">Anyone with your private workspace link can open it. Do not share the link publicly.</p>
      </dialog>
    </>
  );
}
