import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { SourcingWorkspace } from "@/components/sourcing/SourcingWorkspace";
import { workspaceIdSchema } from "@/lib/sourcing/schemas";
import { sourcingStoreAdapter } from "@/lib/sourcing/store";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your product plan",
  description: "A private, agent-assisted product plan on The Line List.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) notFound();
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) notFound();
  const workspace = authorized.workspace;

  return (
    <>
      <SiteHeader current="/sourcing" />
      <main id="main" className="wrap sourcing-workspace">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Product planning", href: "/sourcing" }, { name: "Your product plan", href: `/sourcing/${workspace.id}` }]} />
        <SourcingWorkspace initialWorkspace={workspace} storageAdapter={sourcingStoreAdapter()} ownership={authorized.access} />
      </main>
    </>
  );
}
