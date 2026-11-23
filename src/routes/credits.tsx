import { createFileRoute } from "@tanstack/react-router";
import { Public, PageHeader } from "@/components/era/AppShell";
import credits from "@/lib/era/photo-credits.json";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "Photo Credits — ERA" },
      { name: "description", content: "Credits for photography used on ERA." },
    ],
  }),
  component: () => <Public>{() => <Credits />}</Public>,
});

function Credits() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="With thanks"
        title="Photo Credits"
        text="Saudi experience posters are made from photographs shared on Wikimedia Commons under open licences. Titles and colour grading were added by ERA."
      />
      <ul className="panel divide-y">
        {credits.map((c) => (
          <li key={c.image} className="flex items-center gap-5 p-5">
            <img
              src={c.image.replace(".webp", "-sm.webp")}
              alt=""
              className="h-16 w-16 shrink-0 rounded object-cover"
              loading="lazy"
            />
            <div className="min-w-0 text-sm">
              <p className="font-display text-lg text-primary">{c.experience}</p>
              <p className="text-muted-foreground">
                Photo: {c.author || "Unknown"} · {c.license} ·{" "}
                <a href={c.source} target="_blank" rel="noreferrer" className="link-quiet">
                  Wikimedia Commons
                </a>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
