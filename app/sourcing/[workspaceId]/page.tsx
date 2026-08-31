import { SourcingWorkspace } from "@/components/sourcing/SourcingWorkspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your product plan",
  description: "A private, agent-assisted product plan on The Line List.",
  robots: { index: false, follow: false, nocache: true },
};

export default function WorkspacePage() {
  return (
    <main id="main" className="sourcing-workspace-view sourcing-brief-view">
      <SourcingWorkspace />
    </main>
  );
}
