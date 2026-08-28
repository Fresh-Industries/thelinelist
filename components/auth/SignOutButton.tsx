"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  return <button className="products-signout" type="button" onClick={async () => { await authClient.signOut(); router.push("/sourcing"); router.refresh(); }}>Sign out</button>;
}
