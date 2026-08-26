import { randomBytes, randomUUID } from "node:crypto";
import { FIELD_DEFINITION_BY_KEY, SOURCING_FIELD_DEFINITIONS } from "./fields";
import type { AgentFieldUpdate, SourcingField, SourcingFieldKey, SourcingFieldStatus, SourcingWorkspace, WorkspaceActivity } from "./types";

function now(): string {
  return new Date().toISOString();
}

function activity(kind: WorkspaceActivity["kind"], message: string): WorkspaceActivity {
  return { id: randomUUID(), kind, message, at: now() };
}

function blankField(key: SourcingFieldKey, timestamp: string): SourcingField {
  return {
    key,
    value: null,
    status: "unknown",
    reason: null,
    source: null,
    explicitlyStated: false,
    shareWithManufacturer: false,
    updatedAt: timestamp,
    updatedBy: "system",
  };
}

export function createWorkspace(options: { demo?: boolean; idea?: string } = {}): SourcingWorkspace {
  const timestamp = now();
  const fields = Object.fromEntries(
    SOURCING_FIELD_DEFINITIONS.map(({ key }) => [key, blankField(key, timestamp)]),
  ) as Record<SourcingFieldKey, SourcingField>;

  const workspace: SourcingWorkspace = {
    id: randomBytes(18).toString("base64url"),
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    fields,
    selectedManufacturerSlugs: [],
    matches: [],
    matchesUpdatedAt: null,
    outreachDrafts: [],
    inquiries: [],
    activity: [activity("created", options.demo ? "Energy-drink demo plan created." : "Product plan created.")],
  };

  const idea = options.idea?.trim();
  if (!options.demo) {
    if (!idea) return workspace;
    const founderIdea = (key: "product_type" | "product_description"): SourcingField => ({
      ...workspace.fields[key],
      value: idea,
      status: "confirmed",
      source: "Founder starting idea",
      explicitlyStated: true,
      shareWithManufacturer: true,
      updatedAt: timestamp,
      updatedBy: "founder",
    });
    return touch({
      ...workspace,
      fields: { ...workspace.fields, product_type: founderIdea("product_type"), product_description: founderIdea("product_description") },
      activity: [activity("founder_updated", "Your starting idea was added to the plan."), ...workspace.activity],
    }, timestamp);
  }

  return applyAgentUpdates(workspace, [
    { key: "product_type", value: "Healthier energy drink", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "packaging_format", value: "Cans", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "packaging_size", value: "12 oz", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "budget", value: "About $15,000", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: false },
    { key: "target_launch_date", value: "Within six months", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "preferred_geography", value: "Near Texas", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "formulation_assistance", value: "Required", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "carbonation", value: "Carbonated", explicitlyStated: false, source: "Agent inference from energy drink", reason: "Many energy drinks are carbonated, but this needs founder confirmation.", suggestedSharing: true },
    { key: "production_volume", value: null, explicitlyStated: false, source: "Sourcing readiness check", reason: "Manufacturers need an estimated first-run volume.", suggestedSharing: true },
  ]);
}

export function applyAgentUpdates(workspace: SourcingWorkspace, updates: AgentFieldUpdate[]): SourcingWorkspace {
  const timestamp = now();
  const fields = { ...workspace.fields };
  for (const update of updates) {
    const definition = FIELD_DEFINITION_BY_KEY[update.key];
    const hasValue = typeof update.value === "string" && update.value.trim().length > 0;
    const status: SourcingFieldStatus = hasValue
      ? update.explicitlyStated ? "confirmed" : "proposed"
      : "needs_decision";
    fields[update.key] = {
      ...fields[update.key],
      value: hasValue ? update.value!.trim() : null,
      status,
      reason: update.reason?.trim() || null,
      source: update.source?.trim() || null,
      explicitlyStated: update.explicitlyStated,
      shareWithManufacturer: hasValue && !definition.privateByDefault
        ? (update.suggestedSharing ?? definition.shareByDefault)
        : false,
      updatedAt: timestamp,
      updatedBy: "agent",
    };
  }
  const suggestedCount = updates.filter((update) => update.value?.trim() && !update.explicitlyStated).length;
  const detailCount = updates.filter((update) => update.value?.trim()).length;
  const suggestionNote = suggestedCount
    ? ` ${suggestedCount} suggestion${suggestedCount === 1 ? " needs" : "s need"} your review.`
    : "";
  return touch({
    ...workspace,
    fields,
    activity: addActivity(workspace.activity, activity("agent_proposed", `ChatGPT added ${detailCount} detail${detailCount === 1 ? "" : "s"} from your conversation.${suggestionNote}`)),
  }, timestamp);
}

export function applyFounderFieldUpdate(
  workspace: SourcingWorkspace,
  input: { key: SourcingFieldKey; value: string | null; status: SourcingFieldStatus; shareWithManufacturer?: boolean },
): SourcingWorkspace {
  const timestamp = now();
  const definition = FIELD_DEFINITION_BY_KEY[input.key];
  const value = input.value?.trim() || null;
  const status = value ? input.status : input.status === "rejected" ? "rejected" : "unknown";
  const field: SourcingField = {
    ...workspace.fields[input.key],
    value,
    status,
    reason: status === "confirmed" ? null : workspace.fields[input.key].reason,
    explicitlyStated: status === "confirmed",
    shareWithManufacturer: Boolean(value && status === "confirmed" && !definition.privateByDefault && input.shareWithManufacturer),
    updatedAt: timestamp,
    updatedBy: "founder",
  };
  return touch({
    ...workspace,
    fields: { ...workspace.fields, [input.key]: field },
    activity: addActivity(workspace.activity, activity("founder_updated", `${definition.label} updated by founder.`)),
  }, timestamp);
}

export function touch(workspace: SourcingWorkspace, timestamp = now()): SourcingWorkspace {
  return { ...workspace, revision: workspace.revision + 1, updatedAt: timestamp };
}

export function addWorkspaceActivity(workspace: SourcingWorkspace, kind: WorkspaceActivity["kind"], message: string): SourcingWorkspace {
  return touch({ ...workspace, activity: addActivity(workspace.activity, activity(kind, message)) });
}

function addActivity(current: WorkspaceActivity[], next: WorkspaceActivity): WorkspaceActivity[] {
  return [next, ...current].slice(0, 20);
}
