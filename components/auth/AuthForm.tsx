"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";

type Mode = "sign-in" | "create";

export function AuthForm({ workspaceId, alreadySignedIn = false }: { workspaceId?: string; alreadySignedIn?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(alreadySignedIn && Boolean(workspaceId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!alreadySignedIn || !workspaceId) return;
    void claimAndContinue(workspaceId, router, setError).finally(() => setBusy(false));
  }, [alreadySignedIn, router, workspaceId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = mode === "create"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(result.error.message || "We could not complete that request.");
        return;
      }
      if (workspaceId) {
        await claimAndContinue(workspaceId, router, setError);
        return;
      }
      router.push("/products");
      router.refresh();
    } catch {
      setError("We could not complete that request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-heading">
      <p className="auth-kicker">{workspaceId ? "Save this product" : "Your Line List account"}</p>
      <h1 id="auth-heading">{alreadySignedIn ? "Saving your product…" : mode === "create" ? "Create your account" : "Welcome back"}</h1>
      <p>{workspaceId ? "Your current plan will stay exactly where it is." : "Keep your product plans together and return whenever you need them."}</p>
      {!alreadySignedIn ? (
        <form onSubmit={submit}>
          {mode === "create" ? (
            <label>
              Name
              <input name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
            </label>
          ) : null}
          <label>
            Email
            <input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={320} />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={200} />
          </label>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Working…" : mode === "create" ? "Create account and save" : "Sign in and save"}</button>
          <button className="auth-switch" type="button" onClick={() => setMode((current) => current === "create" ? "sign-in" : "create")}>
            {mode === "create" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </form>
      ) : error ? <p className="auth-error" role="alert">{error}</p> : <p aria-live="polite">Claiming the same workspace now.</p>}
      <Link className="auth-back" href={workspaceId ? `/sourcing/${workspaceId}` : "/sourcing"}>Back to product planning</Link>
    </section>
  );
}

async function claimAndContinue(
  workspaceId: string,
  router: ReturnType<typeof useRouter>,
  setError: (value: string) => void,
) {
  const response = await fetch(`/api/sourcing/${workspaceId}/claim`, { method: "POST" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setError(payload.error || "We could not save this product to your account.");
    return;
  }
  router.push(`/sourcing/${workspaceId}?saved=1`);
  router.refresh();
}
