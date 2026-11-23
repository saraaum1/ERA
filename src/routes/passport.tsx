import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Protected, PageHeader } from "@/components/era/AppShell";
import { Logo } from "@/components/era/Logo";
import { Modal } from "@/components/era/Modal";
import { ActivityStamp } from "@/components/era/Stamp";
import {
  ensurePassport,
  formatDate,
  getActivity,
  getCustomerBookings,
  getPassportStamps,
  type Activity,
  type DigitalStamp,
  type User,
} from "@/lib/era/store";
import { STAMP_COLORS, STAMP_ICONS, stampIdentity } from "@/lib/era/stamps";
import { useEra } from "@/lib/era/use-era";

export const Route = createFileRoute("/passport")({
  head: () => ({
    meta: [
      { title: "My Passport — ERA" },
      { name: "description", content: "Your digital heritage passport and collected stamps." },
      { property: "og:title", content: "My Passport — ERA" },
      {
        property: "og:description",
        content: "Your digital heritage passport and collected stamps.",
      },
    ],
  }),
  component: () => <Protected role="customer">{(u) => <Passport user={u} />}</Protected>,
});

const TILTS = [-6, 4, -2, 7, -4, 2, -8, 5];
const LEVELS = [
  { min: 0, name: "Newcomer" },
  { min: 1, name: "Explorer" },
  { min: 3, name: "Voyager" },
  { min: 6, name: "Heritage Ambassador" },
];

function Passport({ user }: { user: User }) {
  useEra();
  const passport = ensurePassport(user.userId);
  const stamps = getPassportStamps(passport.passportId)
    .map((s) => ({ s, a: getActivity(s.activityId) }))
    .filter((x): x is { s: DigitalStamp; a: Activity } => !!x.a)
    .sort((x, y) => (x.s.awardedAt ?? "").localeCompare(y.s.awardedAt ?? ""));
  const pending = getCustomerBookings(user.userId)
    .filter((b) => b.status === "Confirmed")
    .map((b) => ({ b, a: getActivity(b.activityId) }))
    .filter((x): x is typeof x & { a: Activity } => !!x.a);
  const [open, setOpen] = useState<{ s: DigitalStamp; a: Activity } | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const [book, setBook] = useState<"closed" | "open" | "done">("closed");
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("era_passport_opened") === "1";
      sessionStorage.setItem("era_passport_opened", "1");
    } catch {
      /* storage unavailable */
    }
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBook("done");
      return;
    }
    const t1 = window.setTimeout(() => setBook("open"), 700);
    const t2 = window.setTimeout(() => setBook("done"), 3100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);
  const count = stamps.length;
  const level = [...LEVELS].reverse().find((l) => count >= l.min)!;
  const next = LEVELS.find((l) => l.min > count);
  const destinations = new Set(stamps.map((x) => x.a.destination)).size;

  return (
    <>
      <PageHeader
        eyebrow="Digital Activity Passport"
        title="My Passport"
        text="Every experience you complete adds its own stamp to these pages."
      />
      <div
        className={[
          "book relative",
          book !== "closed" ? "is-open" : "",
          book === "done" ? "is-done" : "",
        ].join(" ")}
      >
        <button
          type="button"
          className="book-cover"
          onClick={() => setBook("open")}
          aria-label="Open passport"
          tabIndex={book === "closed" ? 0 : -1}
        >
          <div className="book-front">
            <p className="gold-emboss text-[0.65rem] uppercase tracking-[0.5em]">
              Digital Activity
            </p>
            <p className="gold-emboss mt-2 font-display text-4xl tracking-[0.3em] md:text-5xl">
              PASSPORT
            </p>
            <svg viewBox="0 0 100 100" className="my-8 h-28 w-28" aria-hidden="true">
              <g fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="50" cy="50" r="44" />
                <circle cx="50" cy="50" r="38" strokeDasharray="2 3" />
                <path d="M30 66V44a20 20 0 0 1 40 0v22M38 66V46a12 12 0 0 1 24 0v20M24 66h52" />
                <path
                  d="M50 16l2 5 5 .5-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3 5-.5z"
                  fill="currentColor"
                />
              </g>
            </svg>
            <p className="gold-emboss font-display text-5xl tracking-[0.25em]">ERA</p>
            <p className="gold-emboss mt-3 text-[0.6rem] uppercase tracking-[0.4em]">
              Culture · Activities · Experiences
            </p>
          </div>
          <div className="book-back" />
        </button>
        <div className="passport">
          <div className="grid overflow-hidden rounded-lg md:grid-cols-[2fr_3fr]">
            <div className="passport-page passport-spine flex flex-col items-center justify-center gap-6 p-10 text-center">
              <Logo className="h-32 mix-blend-multiply" />
              <div className="rule w-full" />
              <div>
                <p className="eyebrow">Holder</p>
                <p className="mt-1 font-display text-3xl text-primary">{user.fullName}</p>
                <p className="mt-1 text-xs text-muted-foreground">@{user.username}</p>
              </div>
              <div className="grid w-full grid-cols-2 gap-4">
                <div>
                  <p className="eyebrow">Passport No.</p>
                  <p className="mt-1 font-mono text-xs">
                    ERA-{passport.passportId.padStart(6, "0")}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Rank</p>
                  <p className="mt-1 font-display text-lg text-primary">{level.name}</p>
                </div>
                <div>
                  <p className="eyebrow">Stamps</p>
                  <p className="mt-1 font-display text-2xl text-primary">{count}</p>
                </div>
                <div>
                  <p className="eyebrow">Destinations</p>
                  <p className="mt-1 font-display text-2xl text-primary">{destinations}</p>
                </div>
              </div>
              {next && (
                <div className="w-full">
                  <div className="h-1.5 overflow-hidden rounded-full bg-sand/50">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (count / next.min) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {next.min - count} more {next.min - count === 1 ? "stamp" : "stamps"} to become{" "}
                    {next.name}
                  </p>
                </div>
              )}
            </div>
            <div className="passport-page border-t p-8 md:border-l md:border-t-0 md:p-10">
              <p className="eyebrow mb-6 text-center">Stamps</p>
              {count === 0 ? (
                <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
                  <p className="font-display text-2xl text-primary">Your pages await</p>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    Stamps appear here once your host confirms you completed an experience.
                  </p>
                  <Link to="/activities" className="btn btn-primary mt-6">
                    Find an Experience
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-wrap justify-center gap-6">
                  {stamps.map((x, i) => (
                    <li key={x.s.stampId} className="flex w-[42%] justify-center sm:w-[30%]">
                      <button
                        type="button"
                        onClick={() => setOpen(x)}
                        className="rounded-full transition-transform hover:scale-105"
                        aria-label={`Open stamp: ${x.a.name}`}
                      >
                        <ActivityStamp
                          a={x.a}
                          date={x.s.awardedAt}
                          size="100%"
                          className="max-w-40"
                          tilt={TILTS[i % TILTS.length]}
                          animate
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="mt-14">
          <p className="eyebrow mb-2">Waiting to be stamped</p>
          <h2 className="text-3xl text-primary">Stamps on the way</h2>
          <ul className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {pending.map(({ b, a }) => (
              <li key={b.bookingId} className="panel flex flex-col items-center p-5 text-center">
                <ActivityStamp a={a} size={120} variant="ghost" tilt={-4} />
                <p className="mt-3 font-display text-lg leading-tight text-primary">{a.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(a.date)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open && (
        <Modal
          onClose={close}
          labelledBy="stamp-title"
          className="passport-page max-w-md p-8 text-center"
        >
          <ActivityStamp
            a={open.a}
            date={open.s.awardedAt}
            size={260}
            tilt={-4}
            className="mx-auto"
          />
          <h2 id="stamp-title" className="mt-6 text-3xl text-primary">
            {open.a.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{open.a.location}</p>
          <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="eyebrow">Collected</dt>
              <dd className="mt-1">
                {open.s.awardedAt ? formatDate(open.s.awardedAt.slice(0, 10)) : "—"}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Emblem</dt>
              <dd className="mt-1">{STAMP_ICONS[stampIdentity(open.a).icon]}</dd>
            </div>
            <div>
              <dt className="eyebrow">Ink</dt>
              <dd className="mt-1">{STAMP_COLORS[stampIdentity(open.a).color].label}</dd>
            </div>
          </dl>
          <button type="button" autoFocus className="btn btn-outline mt-8" onClick={close}>
            Close
          </button>
        </Modal>
      )}
    </>
  );
}
