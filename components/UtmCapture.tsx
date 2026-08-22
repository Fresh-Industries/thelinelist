"use client";

import { useEffect } from "react";
import {
  hasUtm,
  parseUtmSearch,
  UTM_COOKIE,
  UTM_COOKIE_MAX_AGE,
} from "@/lib/utm";

export function UtmCapture() {
  useEffect(() => {
    const utm = parseUtmSearch(window.location.search);
    if (!hasUtm(utm)) return;
    document.cookie = `${UTM_COOKIE}=${encodeURIComponent(JSON.stringify(utm))}; Max-Age=${UTM_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  }, []);
  return null;
}
