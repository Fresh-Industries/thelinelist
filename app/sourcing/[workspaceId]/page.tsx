import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { SourcingWorkspace } from "@/components/sourcing/SourcingWorkspace";
import { isNotifyConfigured } from "@/lib/notify/email";
import { getDemoRecipient } from "@/lib/sourcing/outreach";
import { workspaceIdSchema } from "@/lib/sourcing/schemas";
import { getSourcingWorkspace, sourcingStoreAdapter } from "@/lib/sourcing/store";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your product plan",
  description: "A private product plan shared with ChatGPT through The Line List.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function WorkspacePage({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ chatgpt?: string }> }) {
  const { workspaceId } = await params;
  const query = await searchParams;
  if (!workspaceIdSchema.safeParse(workspaceId).success) notFound();
  const workspace = await getSourcingWorkspace(workspaceId);
  if (!workspace) notFound();

  return (
    <>
      <SiteHeader current="/sourcing" />
      <main id="main" className="wrap sourcing-workspace">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Product planning", href: "/sourcing" }, { name: "Your product plan", href: `/sourcing/${workspace.id}` }]} />
        <SourcingWorkspace initialWorkspace={workspace} storageAdapter={sourcingStoreAdapter()} demoRecipient={getDemoRecipient()} emailConfigured={isNotifyConfigured()} chatGptReady={query.chatgpt === "ready"} />
      </main>
    </>
  );
}
