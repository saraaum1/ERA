import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Public, PageHeader, EmptyState } from "@/components/era/AppShell";
import { ActivityCard } from "@/components/era/ActivityBits";
import { getActiveActivities, isPast, today } from "@/lib/era/store";
import { isSaudi, saudiFirst } from "@/lib/era/places";
import { cn } from "@/lib/utils";
import { useEra } from "@/lib/era/use-era";

const TYPES = ["Sport", "Wellness", "Entertainment"] as const;
type Search = {
  q?: string;
  type?: string;
  dest?: string;
  past?: boolean;
  region?: "saudi" | "world";
};

export const Route = createFileRoute("/activities/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    type:
      typeof s.type === "string" && (TYPES as readonly string[]).includes(s.type)
        ? s.type
        : undefined,
    dest: typeof s.dest === "string" && s.dest ? s.dest : undefined,
    past: s.past === true || s.past === "true" ? true : undefined,
    region: s.region === "saudi" || s.region === "world" ? s.region : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Explore Experiences — ERA" },
      {
        name: "description",
        content: "Browse curated cultural experiences at heritage destinations.",
      },
      { property: "og:title", content: "Explore Experiences — ERA" },
      {
        property: "og:description",
        content: "Browse curated cultural experiences at heritage destinations.",
      },
    ],
  }),
  component: () => <Public>{() => <Explore />}</Public>,
});

function Explore() {
  const { v } = useEra();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/activities/" });
  const all = useMemo(() => getActiveActivities(), [v]);
  const q = search.q ?? "";
  const type = search.type ?? "All";
  const dest = search.dest ?? "All";
  const showPast = !!search.past;
  const update = (patch: Partial<Search>) =>
    navigate({ search: (prev: Search) => ({ ...prev, ...patch }), replace: true });

  const region = search.region;
  const destinations = useMemo(
    () => [...new Set(saudiFirst(all, today()).map((a) => a.destination))],
    [all],
  );
  const term = q.trim().toLowerCase();
  const pastCount = all.filter(isPast).length;
  const list = saudiFirst(all, today()).filter(
    (a) =>
      (showPast || !isPast(a)) &&
      (!region || (region === "saudi" ? isSaudi(a) : !isSaudi(a))) &&
      (type === "All" || a.type === type) &&
      (dest === "All" || a.destination === dest) &&
      (!term ||
        [a.name, a.location, a.destination, a.description].some((s) =>
          s.toLowerCase().includes(term),
        )),
  );
  const reset = () => navigate({ search: {}, replace: true });
  const filtered = !!(q || search.type || search.dest || region);

  return (
    <>
      <PageHeader
        eyebrow="Heritage, lived"
        title="Explore Experiences"
        text="Each experience comes with its own passport stamp. Book, take part, and collect it."
      />
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Region">
        {(
          [
            [undefined, "All"],
            ["saudi", "Saudi Arabia"],
            ["world", "Around the World"],
          ] as const
        ).map(([val, label]) => (
          <button
            key={label}
            type="button"
            aria-pressed={region === val}
            onClick={() => update({ region: val })}
            className={cn("region-chip", region === val && "is-on")}
          >
            {val === "saudi" && (
              <span className="font-arabic mr-2 text-base" lang="ar">
                السعودية
              </span>
            )}
            {label}
          </button>
        ))}
      </div>
      <div className="panel mb-8 grid gap-4 p-5 md:grid-cols-[1fr_200px_240px_auto] md:items-end">
        <div>
          <label htmlFor="search" className="field-label">
            Search
          </label>
          <input
            id="search"
            type="search"
            className="field"
            placeholder="Name, location or destination"
            value={q}
            onChange={(e) => update({ q: e.target.value || undefined })}
          />
        </div>
        <div>
          <label htmlFor="type" className="field-label">
            Activity Type
          </label>
          <select
            id="type"
            className="field"
            value={type}
            onChange={(e) =>
              update({ type: e.target.value === "All" ? undefined : e.target.value })
            }
          >
            <option value="All">All Types</option>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dest" className="field-label">
            Destination
          </label>
          <select
            id="dest"
            className="field"
            value={dest}
            onChange={(e) =>
              update({ dest: e.target.value === "All" ? undefined : e.target.value })
            }
          >
            <option value="All">All Destinations</option>
            {destinations.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={reset}
          disabled={!filtered && !showPast}
        >
          ↻ Reset
        </button>
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {list.length} {list.length === 1 ? "experience" : "experiences"}
        </p>
        {pastCount > 0 && (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showPast}
              onChange={(e) => update({ past: e.target.checked || undefined })}
              className="accent-[var(--plum)]"
            />
            Show ended experiences ({pastCount})
          </label>
        )}
      </div>
      {list.length === 0 ? (
        <EmptyState
          title="No experiences found"
          text="Try a different search or clear the filters."
        >
          <button type="button" className="btn btn-outline" onClick={reset}>
            Clear Filters
          </button>
        </EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((a, i) => (
            <ActivityCard key={a.activityId} a={a} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
