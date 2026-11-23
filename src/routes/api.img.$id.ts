import { createFileRoute } from "@tanstack/react-router";

/** Serves provider-uploaded cover images stored in the database: /api/img/<id> */
export const Route = createFileRoute("/api/img/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => (await import("@/lib/era/api.server")).handleImageGet(params.id),
    },
  },
});
