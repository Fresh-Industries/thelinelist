"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, type Dispatch, type ReactNode, type SetStateAction, useCallback, useContext, useMemo, useRef, useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { packageConfigs } from "@/components/product-visuals/package-config";
import { formatPackageDirection } from "@/lib/sourcing/package-presentation";
import { getProductIdentity } from "@/lib/sourcing/product-identity";
import type { PackageDesign, PackageDesignPreviewInput, SourcingWorkspace } from "@/lib/sourcing/types";
import { WebMcpSourcingTools } from "./WebMcpSourcingTools";

const PackageWorkbench = dynamic(
  () => import("./SourcingPackageWorkbench").then((module) => module.SourcingPackageWorkbench),
  { ssr: false, loading: () => <div className="workbench-loading" role="status">Opening the 3D packaging workbench…</div> },
);

export type SourcingBusyState = "answer" | "match" | "select" | "outreach" | "undo" | null;

interface SourcingWorkspaceContextValue {
  workspace: SourcingWorkspace;
  ownership: "user" | "guest" | "development";
  busy: SourcingBusyState;
  setBusy: Dispatch<SetStateAction<SourcingBusyState>>;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  agentNote: string;
  setAgentNote: Dispatch<SetStateAction<string>>;
  acceptWorkspace: (workspace: SourcingWorkspace) => void;
  openPackageWorkbench: (preview?: PackageDesign | null) => void;
}

export interface PackageStageResult {
  workspace: SourcingWorkspace;
  preview: PackageDesign;
  receipt: Record<string, unknown>;
}

const SourcingWorkspaceContext = createContext<SourcingWorkspaceContextValue | null>(null);

export function SourcingWorkspaceProvider({
  initialWorkspace,
  ownership,
  children,
}: {
  initialWorkspace: SourcingWorkspace;
  ownership: "user" | "guest" | "development";
  children: ReactNode;
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [busy, setBusy] = useState<SourcingBusyState>(null);
  const [error, setError] = useState("");
  const [agentNote, setAgentNote] = useState("I’ve turned what you told me into a first-pass brief. Confirmed facts, suggestions, and open decisions stay visibly separate.");
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [workbenchSession, setWorkbenchSession] = useState(0);
  const [packagePreview, setPackagePreview] = useState<PackageDesign | null>(initialWorkspace.stagedPackageDesign?.design ?? null);
  const workspaceRef = useRef(initialWorkspace);
  const stageQueueRef = useRef<Promise<void>>(Promise.resolve());
  const router = useRouter();
  const pathname = usePathname();
  const manufacturerPath = `/sourcing/${workspace.id}/manufacturers`;

  const acceptWorkspace = useCallback((next: SourcingWorkspace) => {
    const current = workspaceRef.current;
    if (next.id !== current.id || next.revision < current.revision) return;
    workspaceRef.current = next;
    setWorkspace(next);
    setPackagePreview(next.stagedPackageDesign?.design ?? null);
  }, []);

  const openPackageWorkbench = useCallback((preview: PackageDesign | null = null) => {
    setPackagePreview(preview ?? workspaceRef.current.stagedPackageDesign?.design ?? null);
    setWorkbenchSession((current) => current + 1);
    setWorkbenchOpen(true);
  }, []);

  const persistPackageDesign = useCallback((design: PackageDesign, stagedBy: "agent" | "founder", requestedStageId?: string): Promise<PackageStageResult> => {
    const stageId = requestedStageId ?? createOpaqueMutationId();
    const task = stageQueueRef.current.then(async () => {
      let current = workspaceRef.current;
      let response = await patchWorkspace(current.id, {
        revision: current.revision,
        stagePackageDesign: { stageId, packageDesign: design, stagedBy },
      });
      if (response.status === 409 && response.body.workspace) {
        acceptWorkspace(response.body.workspace);
        current = response.body.workspace;
        response = await patchWorkspace(current.id, {
          revision: current.revision,
          stagePackageDesign: { stageId, packageDesign: design, stagedBy },
        });
      }
      if (!response.ok || !response.body.workspace?.stagedPackageDesign || !response.body.receipt) {
        throw new Error(response.body.error || "The staged package direction could not be persisted.");
      }
      acceptWorkspace(response.body.workspace);
      return {
        workspace: response.body.workspace,
        preview: response.body.workspace.stagedPackageDesign.design,
        receipt: response.body.receipt,
      };
    });
    stageQueueRef.current = task.then(() => undefined, () => undefined);
    return task;
  }, [acceptWorkspace]);

  const commitPackageDesign = useCallback(async (design: PackageDesign): Promise<SourcingWorkspace> => {
    const staged = await persistPackageDesign(design, "founder");
    const commitId = createOpaqueMutationId();
    let response = await patchWorkspace(staged.workspace.id, {
      revision: staged.workspace.revision,
      founderPackageCommit: {
        commitId,
        stagedPackageId: staged.workspace.stagedPackageDesign!.id,
      },
    });
    if (response.status === 409 && response.body.workspace?.stagedPackageDesign?.id === staged.workspace.stagedPackageDesign!.id) {
      acceptWorkspace(response.body.workspace);
      response = await patchWorkspace(staged.workspace.id, {
        revision: response.body.workspace.revision,
        founderPackageCommit: {
          commitId,
          stagedPackageId: staged.workspace.stagedPackageDesign!.id,
        },
      });
    }
    if (!response.ok || !response.body.workspace || !response.body.receipt) {
      throw new Error(response.body.error || "The package direction could not be committed.");
    }
    acceptWorkspace(response.body.workspace);
    return response.body.workspace;
  }, [acceptWorkspace, persistPackageDesign]);

  const stageFounderPackage = useCallback(
    (design: PackageDesign) => persistPackageDesign(design, "founder").then((result) => result.workspace),
    [persistPackageDesign],
  );

  const revealManufacturerMatches = useCallback(() => {
    setWorkbenchOpen(false);
    if (pathname !== manufacturerPath) {
      window.sessionStorage.setItem(routeFocusKey(workspace.id), "manufacturer-results");
      router.push(manufacturerPath);
      return;
    }
    revealHeading("manufacturer-possibilities-heading");
  }, [manufacturerPath, pathname, router, workspace.id]);

  const openIntroductionReview = useCallback(() => {
    setWorkbenchOpen(false);
    if (pathname !== manufacturerPath) {
      window.sessionStorage.setItem(routeFocusKey(workspace.id), "manufacturer-introductions");
      router.push(`${manufacturerPath}#manufacturer-introductions`);
      return;
    }
    revealHeading("manufacturer-introductions-heading");
  }, [manufacturerPath, pathname, router, workspace.id]);

  const previewPackageDesign = useCallback(async (patch: PackageDesignPreviewInput, currentWorkspace?: SourcingWorkspace, stageId?: string, stagedBy: "agent" | "founder" = "agent") => {
    const source = currentWorkspace ?? workspaceRef.current;
    const stagedPreview = mergePackagePreview(source, patch, source.stagedPackageDesign?.design ?? packagePreview);
    const staged = await persistPackageDesign(stagedPreview, stagedBy, stageId);
    openPackageWorkbench(staged.preview);
    setAgentNote("Your agent staged a packaging preview in the 3D workbench. Review it visually; matching will not change unless you use this direction.");
    return staged;
  }, [openPackageWorkbench, packagePreview, persistPackageDesign]);

  const { brandName, productDescriptor } = getProductIdentity(workspace);
  const contextValue = useMemo<SourcingWorkspaceContextValue>(() => ({
    workspace,
    ownership,
    busy,
    setBusy,
    error,
    setError,
    agentNote,
    setAgentNote,
    acceptWorkspace,
    openPackageWorkbench,
  }), [acceptWorkspace, agentNote, busy, error, openPackageWorkbench, ownership, workspace]);

  return (
    <SourcingWorkspaceContext.Provider value={contextValue}>
      <div className="product-workspace-shell">
        <WebMcpSourcingTools
          workspaceId={workspace.id}
          onWorkspaceChanged={acceptWorkspace}
          onOpenManufacturerMatches={revealManufacturerMatches}
          onOpenIntroductionReview={openIntroductionReview}
          onPreviewPackageDesign={previewPackageDesign}
        />
        <header className="workspace-masthead">
          <Link className="workspace-product-name" href={`/sourcing/${workspace.id}`} prefetch={false}>{brandName || productDescriptor}</Link>
          <nav className="workspace-view-nav" aria-label="Product workspace">
            <Link href={`/sourcing/${workspace.id}`} prefetch={false} aria-current={pathname === `/sourcing/${workspace.id}` ? "page" : undefined}>Product brief</Link>
            <Link href={manufacturerPath} prefetch={false} aria-current={pathname === manufacturerPath ? "page" : undefined}>Manufacturers</Link>
          </nav>
          <nav className="workspace-utility-nav" aria-label="Workspace actions">
            <a href={`/api/sourcing/${workspace.id}/export`} download><DownloadSimple aria-hidden="true" /> Export PDF</a>
            {ownership === "guest" ? <Link href={`/auth?workspaceId=${workspace.id}`}>Save product</Link> : ownership === "user" ? <Link href="/products">Your products</Link> : null}
          </nav>
        </header>
        {children}
      </div>
      {workbenchOpen ? <PackageWorkbench
        key={`${workspace.id}:${workbenchSession}`}
        workspace={workspace}
        initialPreview={packagePreview}
        onClose={() => { setWorkbenchOpen(false); }}
        onWorkspaceChanged={acceptWorkspace}
        onStage={stageFounderPackage}
        onCommit={commitPackageDesign}
        onSaved={(next) => {
          acceptWorkspace(next);
          if (!next.matches.length && next.selectedManufacturerSlugs.length) {
            setAgentNote("Your package direction is saved. I kept your shortlist, but its fit evidence needs a fresh manufacturer search before outreach.");
          }
        }}
      /> : null}
    </SourcingWorkspaceContext.Provider>
  );
}

export function useSourcingWorkspace(): SourcingWorkspaceContextValue {
  const value = useContext(SourcingWorkspaceContext);
  if (!value) throw new Error("useSourcingWorkspace must be used inside SourcingWorkspaceProvider.");
  return value;
}

function revealHeading(id: string) {
  const reveal = () => {
    const heading = document.getElementById(id);
    if (!(heading instanceof HTMLElement)) return false;
    heading.scrollIntoView({ behavior: "smooth", block: "start" });
    heading.focus({ preventScroll: true });
    return true;
  };
  window.requestAnimationFrame(() => window.requestAnimationFrame(reveal));
  window.setTimeout(reveal, 300);
}

export function mergePackagePreview(workspace: SourcingWorkspace, patch: PackageDesignPreviewInput, stagedPreview: PackageDesign | null = null): PackageDesign {
  const inferredType: PackageDesign["packagingType"] = /jar/i.test(workspace.fields.packaging_format.value || "")
    ? "jar"
    : /bottle/i.test(workspace.fields.packaging_format.value || "")
      ? "bottle"
      : /bakery|bread|loaf/i.test(`${workspace.fields.packaging_format.value || ""} ${workspace.fields.product_description.value || ""}`)
        ? "bakery-bag"
        : /pouch|bag/i.test(`${workspace.fields.packaging_format.value || ""} ${workspace.fields.product_description.value || ""}`)
          ? "stand-up-pouch"
          : "slim-can";
  const defaultFrontText = {
    brand: workspace.fields.brand_name.value ?? "",
    product: workspace.fields.product_type.value ?? workspace.fields.product_name.value ?? "",
  };
  const base = stagedPreview ?? workspace.packageDesign ?? {
    packagingType: inferredType,
    finish: "colored" as const,
    baseColor: inferredType === "bakery-bag" ? "#b98a5f" : "#b64d2c",
    labelColor: "#f2e8d5",
    artworkId: workspace.artwork?.id ?? null,
    previewAssetId: null,
    frontText: inferredType === "bakery-bag" ? defaultFrontText : null,
    windowScale: inferredType === "bakery-bag" ? 0.72 : 0,
    closure: null,
    logoAspect: 1345 / 662,
    logoScale: packageConfigs[inferredType].logo.defaultScale,
    logoPosition: { x: 0, y: 0 },
    dimensions: { width: null, height: null, depth: null },
    summary: formatPackageDirection(inferredType, { width: null, height: null, depth: null }),
    placeholder: true,
    source: "system_defaults" as const,
  };
  const explicitVisualDirection = patch.finish !== undefined
    || patch.baseColor !== undefined
    || patch.labelColor !== undefined
    || patch.artworkId != null
    || patch.frontText != null
    || patch.windowScale !== undefined
    || patch.closure != null
    || patch.logoAspect !== undefined
    || patch.logoScale !== undefined
    || patch.logoPosition !== undefined;
  const packagingType = patch.packagingType ?? base.packagingType;
  const packagingTypeChanged = packagingType !== base.packagingType;
  const config = packageConfigs[packagingType];
  const dimensions = { ...base.dimensions, ...patch.dimensions };
  const requestedLogoPosition = { ...base.logoPosition, ...patch.logoPosition };
  const requestedWindowScale = patch.windowScale === undefined
    ? packagingType === "bakery-bag" ? packagingTypeChanged ? 0.72 : base.windowScale : 0
    : patch.windowScale;
  const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
  return {
    ...base,
    ...patch,
    packagingType,
    finish: config.appearance.supportsClearFinish ? patch.finish ?? base.finish : "colored",
    baseColor: patch.baseColor ?? (packagingTypeChanged && packagingType === "bakery-bag" ? "#b98a5f" : base.baseColor),
    frontText: patch.frontText === undefined
      ? packagingType === "bakery-bag" ? base.frontText ?? defaultFrontText : null
      : patch.frontText,
    windowScale: config.window ? clamp(requestedWindowScale, config.window.scale.min, config.window.scale.max) : 0,
    closure: patch.closure === undefined ? base.closure : patch.closure,
    logoScale: clamp(patch.logoScale ?? base.logoScale, config.logo.scale.min, config.logo.scale.max),
    logoPosition: {
      x: clamp(requestedLogoPosition.x, config.logo.horizontal.min, config.logo.horizontal.max),
      y: clamp(requestedLogoPosition.y, config.logo.vertical.min, config.logo.vertical.max),
    },
    dimensions,
    summary: patch.summary || formatPackageDirection(packagingType, dimensions),
    placeholder: patch.placeholder ?? (explicitVisualDirection ? false : base.placeholder),
    source: patch.source ?? (explicitVisualDirection ? "agent_direction" : base.source),
  };
}

interface WorkspacePatchBody {
  workspace?: SourcingWorkspace;
  receipt?: Record<string, unknown>;
  error?: string;
}

async function patchWorkspace(workspaceId: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; body: WorkspacePatchBody }> {
  const response = await fetch(`/api/sourcing/${workspaceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) as WorkspacePatchBody };
}

function createOpaqueMutationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function routeFocusKey(workspaceId: string): string {
  return `the-line-list:sourcing-route-focus:${workspaceId}`;
}
