"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readActivePlanId, subscribeActivePlan } from "@/lib/sourcing/active-plan";
import type { SourcingWorkspace } from "@/lib/sourcing/types";

export function useConnectedPlan() {
  const [workspace, setWorkspace] = useState<SourcingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const current = useRef<SourcingWorkspace | null>(null);
  const savingRef = useRef(false);
  const connectionVersion = useRef(0);

  useEffect(() => {
    let controller: AbortController | null = null;
    const read = async () => {
      connectionVersion.current += 1;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      const id = readActivePlanId();
      current.current = null;
      setWorkspace(null);
      setLoading(true);
      setError("");
      if (!id) { current.current = null; setWorkspace(null); setLoading(false); return; }
      try {
        const response = await fetch(`/api/sourcing/${id}`, { cache: "no-store", signal });
        const payload = await response.json();
        if (signal.aborted) return;
        const next = response.ok && payload.workspace?.id === id ? payload.workspace as SourcingWorkspace : null;
        current.current = next;
        setWorkspace(next);
        if (!response.ok && response.status !== 404) setError("Your saved plan could not be loaded. Reload to try again.");
      } catch {
        if (!signal.aborted) setError("Your saved plan could not be loaded. Reload to try again.");
      } finally { if (!signal.aborted) setLoading(false); }
    };
    void read();
    const unsubscribe = subscribeActivePlan(() => void read());
    return () => { connectionVersion.current += 1; controller?.abort(); unsubscribe(); };
  }, []);

  const save = useCallback(async (mutation: Record<string, unknown>) => {
    const source = current.current;
    const version = connectionVersion.current;
    if (!source || source.id !== readActivePlanId() || savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/sourcing/${source.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...mutation, revision: source.revision }),
      });
      const payload = await response.json();
      // A response for the previous product must never replace a newly opened plan.
      if (version !== connectionVersion.current || source.id !== readActivePlanId()) return false;
      if (payload.workspace?.id === source.id) {
        current.current = payload.workspace;
        setWorkspace(payload.workspace);
      }
      if (!response.ok) throw new Error(response.status === 409
        ? "Your plan changed in another view. Your edits are still here. Review the current plan, then save again."
        : payload.error || "Your changes could not be saved.");
      return true;
    } catch (cause) {
      if (version === connectionVersion.current) setError(cause instanceof Error ? cause.message : "Your changes could not be saved.");
      return false;
    }
    finally { savingRef.current = false; setSaving(false); }
  }, []);

  return { workspace, loading, saving, error, save };
}
