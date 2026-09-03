export function sourcingExportUrl(workspaceId: string, timeZone = "UTC", origin = ""): string {
  const path = `/api/sourcing/${workspaceId}/export`;
  const query = timeZone ? `?timeZone=${encodeURIComponent(timeZone)}` : "";
  return origin ? new URL(`${path}${query}`, origin).toString() : `${path}${query}`;
}

export function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
