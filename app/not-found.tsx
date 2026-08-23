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
            Start with the <Link href="/find-manufacturers/wizard">matching questions</Link> or
            browse the <Link href="/find-manufacturers">manufacturer directory</Link>.
          </p>
        </article>
      </main>
    </>
  );
}
