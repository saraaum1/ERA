import { createFileRoute } from "@tanstack/react-router";

/** ERA Guide: POST { messages: [{ role, content }] } → { ok, reply, recommendations, engine } */
const hits = new Map<string, number[]>();
const LIMIT = 20; // requests
const WINDOW = 10 * 60 * 1000; // per 10 minutes per visitor

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        const site = request.headers.get("sec-fetch-site");
        const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
        const proto =
          request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
          new URL(request.url).protocol.replace(":", "");
        if (
          origin &&
          origin !== new URL(request.url).origin &&
          origin !== `${proto}://${host}` &&
          site !== "same-origin"
        )
          return json({ ok: false, error: "Cross-origin request blocked." }, 403);

        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          "local";
        const now = Date.now();
        const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
        if (recent.length >= LIMIT)
          return json({ ok: false, error: "Too many questions — please wait a few minutes." }, 429);
        recent.push(now);
        hits.set(ip, recent);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "Expected JSON body." }, 400);
        }
        const messages = (body as { messages?: unknown })?.messages;
        if (!Array.isArray(messages) || !messages.length)
          return json({ ok: false, error: "Please write a message." }, 400);
        try {
          const { recommend } = await import("@/lib/era/assistant.server");
          return json({ ok: true, ...(await recommend(messages)) });
        } catch (e) {
          console.error("ERA Guide error", e);
          return json(
            { ok: false, error: "The guide is unavailable right now. Please try again." },
            503,
          );
        }
      },
    },
  },
});
