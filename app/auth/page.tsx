import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { AuthForm } from "@/components/auth/AuthForm";
import { getSession } from "@/lib/auth/server";
import { workspaceIdSchema } from "@/lib/sourcing/schemas";
import "./auth.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Save your product",
  description: "Create an account or sign in to keep your Line List product workspace.",
  robots: { index: false, follow: false },
};

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ workspaceId?: string }> }) {
  const query = await searchParams;
  const workspaceId = workspaceIdSchema.safeParse(query.workspaceId).success ? query.workspaceId : undefined;
  const session = await getSession();
  return (
    <>
      <SiteHeader current="/sourcing" />
      <main id="main" className="auth-page">
        <AuthForm workspaceId={workspaceId} alreadySignedIn={Boolean(session)} />
      </main>
    </>
  );
}
