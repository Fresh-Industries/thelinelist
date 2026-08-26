import { FIELD_DEFINITION_BY_KEY } from "@/lib/sourcing/fields";
import { getWorkspaceByPacketToken, packetIsActive } from "@/lib/sourcing/store";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private product brief",
  description: "A private product brief shared through The Line List.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default async function PacketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) notFound();
  const workspace = await getWorkspaceByPacketToken(token);
  const draft = workspace?.outreachDrafts.find((candidate) => candidate.packet.token === token);
  if (!draft || !packetIsActive(draft.packet)) notFound();
  const packet = draft.packet;
  const sharedBy = packet.fieldValues.company_name || packet.fieldValues.founder_name || "a founder";
  const contactEmail = packet.fieldValues.contact_email;

  return (
    <main id="main" className="packet-shell">
      <header className="packet-brand">
        <Image src="/brand/line-list-logo.webp" alt="The Line List" width={640} height={315} priority />
        <span>Private product brief</span>
      </header>
      <section className="packet-hero">
        <p className="kicker">A new product conversation</p>
        <h1>Product brief for {packet.manufacturerName}</h1>
        <p className="packet-company">Shared by {sharedBy} through The Line List.</p>
        {packet.fieldValues.product_description || packet.fieldValues.product_type ? <p>{packet.fieldValues.product_description || packet.fieldValues.product_type}</p> : null}
        {contactEmail ? <a className="packet-contact" href={`mailto:${contactEmail}`}>Reply to {packet.fieldValues.founder_name || sharedBy} ↗</a> : null}
      </section>

      <section className="packet-details" aria-labelledby="packet-details-heading">
        <h2 id="packet-details-heading">Product details</h2>
        <dl>
          {packet.includedFieldKeys.flatMap((key) => {
            const value = packet.fieldValues[key];
            if (!value) return [];
            return [<div key={key}><dt>{packetFieldLabel(key)}</dt><dd>{value}</dd></div>];
          })}
        </dl>
      </section>

      {packet.questions.length ? (
        <section className="packet-questions" aria-labelledby="packet-questions-heading">
          <h2 id="packet-questions-heading">A few questions</h2>
          <ol>{packet.questions.map((question) => <li key={question}>{question}</li>)}</ol>
        </section>
      ) : null}

      <footer className="packet-footer">
        <p><strong>Shared through The Line List</strong><br />Capabilities and availability should be confirmed for the exact facility and production line.</p>
        <p>Link expires {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(packet.expiresAt))}</p>
      </footer>
    </main>
  );
}

function packetFieldLabel(key: keyof typeof FIELD_DEFINITION_BY_KEY): string {
  const labels: Partial<Record<keyof typeof FIELD_DEFINITION_BY_KEY, string>> = {
    formula_status: "Recipe readiness",
    formulation_assistance: "Recipe help requested",
    production_volume: "First production amount",
    preferred_geography: "Preferred manufacturer location",
  };
  return labels[key] ?? FIELD_DEFINITION_BY_KEY[key].label;
}
