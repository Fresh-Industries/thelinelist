"use client";

// This is only a navigation pointer. The server still authorizes every plan read and write.
export const ACTIVE_PLAN_KEY = "the-line-list:active-plan:v1";
const CHANGE_EVENT = "line-list-active-plan";

export function readActivePlanId(): string | null {
  try {
    const value = window.localStorage.getItem(ACTIVE_PLAN_KEY);
    return value && /^[A-Za-z0-9_-]{20,64}$/.test(value) ? value : null;
  } catch { return null; }
}

export function rememberActivePlan(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_PLAN_KEY, id);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch { /* Saving the canonical plan does not depend on browser storage. */ }
}

export function subscribeActivePlan(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACTIVE_PLAN_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}
