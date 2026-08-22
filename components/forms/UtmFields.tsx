"use client";

import { useEffect, useRef } from "react";
import { parseUtmCookie, parseUtmSearch, UTM_COOKIE } from "@/lib/utm";

export function FormMetaFields() {
  const startedAtRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLInputElement>(null);
  const mediumRef = useRef<HTMLInputElement>(null);
  const campaignRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLInputElement>(null);
  const termRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (startedAtRef.current && !startedAtRef.current.value) {
      startedAtRef.current.value = String(Date.now());
    }
    const fromQuery = parseUtmSearch(window.location.search);
    const fromCookie = parseUtmCookie(readCookie(UTM_COOKIE));
    write(sourceRef.current, fromQuery.source ?? fromCookie.source);
    write(mediumRef.current, fromQuery.medium ?? fromCookie.medium);
    write(campaignRef.current, fromQuery.campaign ?? fromCookie.campaign);
    write(contentRef.current, fromQuery.content ?? fromCookie.content);
    write(termRef.current, fromQuery.term ?? fromCookie.term);
  }, []);

  return (
    <>
      <input ref={startedAtRef} type="hidden" name="startedAt" defaultValue="" />
      <input ref={sourceRef} type="hidden" name="utm_source" defaultValue="" />
      <input ref={mediumRef} type="hidden" name="utm_medium" defaultValue="" />
      <input ref={campaignRef} type="hidden" name="utm_campaign" defaultValue="" />
      <input ref={contentRef} type="hidden" name="utm_content" defaultValue="" />
      <input ref={termRef} type="hidden" name="utm_term" defaultValue="" />
    </>
  );
}

function write(input: HTMLInputElement | null, value: string | undefined) {
  if (input) input.value = value ?? "";
}

function readCookie(name: string): string | undefined {
  const parts = document.cookie.split("; ");
  const match = parts.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}
