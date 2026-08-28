import { toNextJsHandler } from "better-auth/next-js";
import { auth, authConfigured } from "@/lib/auth/server";

const handlers = toNextJsHandler(auth);

function unavailable(): Response {
  return Response.json({ error: "Authentication is not configured." }, { status: 503 });
}

export function GET(request: Request): Promise<Response> | Response {
  if (!authConfigured()) return unavailable();
  return handlers.GET(request);
}

export function POST(request: Request): Promise<Response> | Response {
  if (!authConfigured()) return unavailable();
  return handlers.POST(request);
}
