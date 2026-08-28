import { FIELD_DEFINITION_BY_KEY } from "@/lib/sourcing/fields";
import { getProductCategory, getProductDescriptor } from "@/lib/sourcing/product-catalog";
import { getWorkspaceByPacketToken, packetIsActive } from "@/lib/sourcing/store";
import { ProductVisual } from "@/components/sourcing/ProductVisual";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private product brief",
  description: "A private product brief shared through The Line List.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};
const PACKET_EXPIRY_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function PacketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) notFound();
  const workspace = await getWorkspaceByPacketToken(token);
  const draft = workspace?.outreachDrafts.find((candidate) => candidate.packet.token === token);
  if (!workspace || !draft || !packetIsActive(draft.packet)) notFound();
  const packet = draft.packet;
  const sharedBy = packet.fieldValues.brand_name || packet.fieldValues.company_name || packet.fieldValues.founder_name || "a founder";
  const contactEmail = packet.fieldValues.contact_email;
  const productName = packet.fieldValues.product_type || packet.fieldValues.product_name || getProductDescriptor(workspace);
  const category = getProductCategory(workspace);
  const primaryKeys = packet.includedFieldKeys.filter((key) => ["product_format", "product_type", "storage_distribution", "packaging_format", "packaging_size", "production_volume"].includes(key));
  const requirementKeys = packet.includedFieldKeys.filter((key) => ["formulation_assistance", "manufacturing_process", "ingredient_sourcing", "packaging_sourcing", "certifications", "preferred_geography"].includes(key));

  return (
    <main id="main" className="packet-shell">
      <header className="packet-brand">
        <Image src="/brand/line-list-logo.webp" alt="The Line List" width={640} height={315} priority />
        <span>Private new product opportunity</span>
      </header>
      <section className="packet-hero">
        <div><p className="kicker">New product opportunity</p><h1>{productName}</h1><p className="packet-company">{sharedBy} is looking for a manufacturing partner.</p>{packet.fieldValues.product_description ? <p>{packet.fieldValues.product_description}</p> : null}</div>
        <ProductVisual category={category} productType={packet.fieldValues.product_type} packagingType={packet.fieldValues.packaging_format} size="large" priority />
      </section>

      <div className="packet-opportunity-grid">
      <section className="packet-details" aria-labelledby="packet-details-heading">
        <p className="kicker">The product</p><h2 id="packet-details-heading">What they want to make</h2>
        <dl>{primaryKeys.flatMap((key) => {
            const value = packet.fieldValues[key];
            if (!value) return [];
            return [<div key={key}><dt>{packetFieldLabel(key)}</dt><dd>{value}</dd></div>];
          })}</dl>
      </section>

      <section className="packet-requirements" aria-labelledby="packet-requirements-heading"><p className="kicker">What they’re looking for</p><h2 id="packet-requirements-heading">The manufacturing need</h2>{requirementKeys.length ? <ul>{requirementKeys.flatMap((key) => packet.fieldValues[key] ? [<li key={key}><strong>{packetFieldLabel(key)}</strong><span>{packet.fieldValues[key]}</span></li>] : [])}</ul> : <p>A manufacturing partner that can evaluate this product and explain the right next production steps.</p>}</section>

      <section className="packet-reason" aria-labelledby="packet-reason-heading"><p className="kicker">Why you’re receiving this</p><h2 id="packet-reason-heading">Your published capabilities may fit.</h2><p>The Line List’s reviewed public information indicates that {packet.manufacturerName} may be able to manufacture this type of product. The founder is asking your team to confirm the exact facility, line, minimum, and packaging fit.</p></section>
      </div>

      {packet.questions.length ? (
        <section className="packet-questions" aria-labelledby="packet-questions-heading">
          <p className="kicker">Questions for your team</p><h2 id="packet-questions-heading">What the founder needs to know</h2>
          <ol>{packet.questions.map((question) => <li key={question}>{question}</li>)}</ol>
        </section>
      ) : null}

      {contactEmail ? <section className="packet-next-step"><div><strong>Interested in the opportunity?</strong><p>Reply directly to the founder to ask for more information or arrange a first conversation.</p></div><a className="packet-contact" href={`mailto:${contactEmail}`}>Reply to {packet.fieldValues.founder_name || sharedBy}</a></section> : null}

      <footer className="packet-footer">
        <p><strong>Shared through The Line List</strong><br />This opportunity contains only founder-approved product details. Capabilities and availability still need direct confirmation.</p>
        <p>Link expires {PACKET_EXPIRY_FORMATTER.format(new Date(packet.expiresAt))}</p>
      </footer>
    </main>
  );
}

function packetFieldLabel(key: keyof typeof FIELD_DEFINITION_BY_KEY): string {
  const labels: Partial<Record<keyof typeof FIELD_DEFINITION_BY_KEY, string>> = {
    product_format: "Product format",
    formula_status: "Recipe readiness",
    formulation_assistance: "Recipe help requested",
    production_volume: "First production amount",
    preferred_geography: "Preferred manufacturer location",
  };
  return labels[key] ?? FIELD_DEFINITION_BY_KEY[key].label;
}
