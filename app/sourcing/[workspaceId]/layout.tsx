import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SourcingWorkspaceProvider } from "@/components/sourcing/SourcingWorkspaceContext";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";
import { workspaceIdSchema } from "@/lib/sourcing/schemas";

export const dynamic = "force-dynamic";

export default async function ProductWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) notFound();
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) notFound();

  return (
    <SourcingWorkspaceProvider key={workspaceId} initialWorkspace={authorized.workspace} ownership={authorized.access}>
      {children}
    </SourcingWorkspaceProvider>
  );
}
