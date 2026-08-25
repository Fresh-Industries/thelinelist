"use client";

import type { MouseEvent } from "react";

const RESULTS_HEADING_ID = "manufacturer-results-heading";

export function JumpToManufacturers() {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const heading = document.getElementById(RESULTS_HEADING_ID);
    if (!(heading instanceof HTMLElement)) return;

    event.preventDefault();
    heading.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    heading.focus({ preventScroll: true });
  }

  return (
    <a className="category-jump-link" href={`#${RESULTS_HEADING_ID}`} onClick={handleClick}>
      Jump to manufacturers
    </a>
  );
}
