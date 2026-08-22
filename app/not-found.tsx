import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <article className="prose wrap">
          <p className="kicker">404</p>
          <h1>That page is not on this site.</h1>
          <p>
            We do not publish thin state or category URLs yet. Start at the{" "}
            <Link href="/copackers">directory</Link> or the{" "}
            <Link href="/">finder</Link>.
          </p>
        </article>
      </main>
    </>
  );
}
