import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getSession } from "@/lib/auth/server";
import { databaseConfigured, prisma } from "@/lib/db/prisma";
import "./products.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your products",
  description: "Return to your saved product workspaces.",
  robots: { index: false, follow: false },
};

export default async function ProductsPage() {
  const session = await getSession();
  if (!session?.user.id || !databaseConfigured()) redirect("/auth");
  const products = await prisma.productWorkspace.findMany({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: { id: true, name: true, category: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <>
      <SiteHeader current="/sourcing" />
      <main id="main" className="products-page">
        <header>
          <div><p>Your workspace</p><h1>Your products</h1><span>Pick up where you left off.</span></div>
          <SignOutButton />
        </header>
        {products.length ? (
          <ul className="product-list">
            {products.map((product) => (
              <li key={product.id}><Link href={`/sourcing/${product.id}`}><strong>{product.name}</strong><span>{product.category || "Category still open"}</span><small>Updated {product.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small></Link></li>
            ))}
          </ul>
        ) : (
          <section className="products-empty"><h2>No saved products yet</h2><p>Start with the idea in your head. The product collaborator will help shape the rest.</p><Link href="/sourcing">Start a product</Link></section>
        )}
      </main>
    </>
  );
}
