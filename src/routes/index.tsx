import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Public } from "@/components/era/AppShell";
import { ActivityCard } from "@/components/era/ActivityBits";
import { ActivityStamp, StampSeal } from "@/components/era/Stamp";
import { CountUp, Parallax, RevealWords } from "@/components/era/Motion";
import { StampPlayground } from "@/components/era/StampPlayground";
import { getActiveActivities, isPast, today, type User } from "@/lib/era/store";
import { isSaudi, saudiFirst } from "@/lib/era/places";
import { HERO_IMAGE } from "@/lib/era/media";
import type { StampIcon } from "@/lib/era/stamps";
import { useEra } from "@/lib/era/use-era";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ERA — Culture · Activities · Experiences" },
      {
        name: "description",
        content:
          "Discover and book unique cultural experiences that bring heritage to life — and collect a stamp for every one.",
      },
      { property: "og:title", content: "ERA — Culture · Activities · Experiences" },
      {
        property: "og:description",
        content: "Discover and book unique cultural experiences that bring heritage to life.",
      },
    ],
  }),
  component: () => <Public bare>{(u) => <Home user={u} />}</Public>,
});

const STEPS: { n: string; title: string; text: string; icon: StampIcon }[] = [
  { n: "01", title: "Discover", text: "Experiences in places with a story.", icon: "compass" },
  { n: "02", title: "Book", text: "Reserve your seat in one step.", icon: "landmark" },
  { n: "03", title: "Experience", text: "Show your ticket and enjoy.", icon: "stars" },
  { n: "04", title: "Collect", text: "Its stamp lands in your passport.", icon: "palette" },
];

const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

function SectionHead({
  kicker,
  title,
  italic,
  children,
}: {
  kicker: React.ReactNode;
  title: string;
  italic?: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="reveal section-kicker">{kicker}</p>
        <h2 className="mt-3 font-display text-4xl leading-[1.05] text-primary md:text-5xl">
          <RevealWords text={title} italic={italic} />
        </h2>
      </div>
      {children}
    </div>
  );
}

function Home({ user }: { user: User | null }) {
  const { v } = useEra();
  const all = useMemo(() => saudiFirst(getActiveActivities(), today()), [v]);
  const upcoming = all.filter((a) => !isPast(a));
  const saudi = upcoming.filter(isSaudi);
  const world = upcoming.filter((a) => !isSaudi(a)).slice(0, 4);
  const stamp = saudi[1] ?? all[0];
  const destinations = new Set(all.map((a) => a.destination.split(",")[0]!.trim())).size;

  const primaryCta =
    user?.role === "provider"
      ? { to: "/provider", label: "Open Dashboard" }
      : { to: "/activities", label: "Explore Experiences" };
  const secondaryCta = !user
    ? { to: "/signup", label: "Get Your Passport" }
    : user.role === "customer"
      ? { to: "/passport", label: "My Passport" }
      : { to: "/provider/activities/new", label: "Add an Activity" };

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero-light relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-16 pt-14 md:px-8 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <p className="reveal section-kicker flex items-center gap-3">
              <span className="text-lavender">✦</span> Culture · Activities · Experiences
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.6rem,5.4vw,4.6rem)] font-normal leading-[1.02] tracking-[-0.015em] text-primary">
              <RevealWords text="Where Heritage" delay={100} />
              <br />
              <RevealWords text="Becomes an Experience" delay={300} italic={["Experience"]} />
            </h1>
            <p
              className="reveal mt-6 max-w-md text-[1.02rem] leading-relaxed text-muted-foreground"
              style={d(650)}
            >
              {user ? (
                <>
                  Welcome back, <span className="text-primary">{user.fullName.split(" ")[0]}</span>
                  .{" "}
                </>
              ) : null}
              Book cultural experiences across Saudi Arabia and beyond — and collect a unique stamp
              for each one.
            </p>
            <div className="relative mt-8 flex flex-wrap gap-3">
              {stamp && (
                <div
                  className="pop-stamp pointer-events-none absolute -bottom-4 right-0 z-10 w-[88px] sm:right-[12%] lg:hidden"
                  style={{ "--delay": "700ms", "--tilt": "-12deg" } as React.CSSProperties}
                  aria-hidden="true"
                >
                  <ActivityStamp a={stamp} size="100%" tilt={0} />
                  <span className="pop-ring" />
                </div>
              )}
              <Link to={primaryCta.to} className="btn btn-primary">
                {primaryCta.label}
              </Link>
              <Link to={secondaryCta.to} className="btn btn-outline">
                {secondaryCta.label}
              </Link>
            </div>
            <dl className="hero-stats reveal mt-12" style={d(900)}>
              {[
                ["Experiences", all.length],
                ["Destinations", destinations],
                ["Saudi", saudi.length],
              ].map(([label, value]) => (
                <div key={label}>
                  <dd className="font-display text-3xl text-primary">
                    <CountUp to={Number(value)} />
                  </dd>
                  <dt className="mt-1 text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                    {label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <div
            className="reveal relative mx-auto w-full max-w-[420px] lg:max-w-[460px]"
            style={d(200)}
          >
            <div className="arch-rings" aria-hidden="true">
              <span />
              <span />
            </div>
            <div className="arch-frame">
              <Parallax speed={-0.06} className="absolute inset-[-8%]">
                <img
                  src={HERO_IMAGE}
                  alt="Sunset over a desert oasis and an ancient mud-brick kasbah"
                  className="arch-img h-full w-full object-cover"
                  fetchPriority="high"
                />
              </Parallax>
            </div>
            {stamp && (
              <div
                className="pop-stamp pointer-events-none absolute -left-12 top-[14%] z-10 hidden w-[140px] lg:block"
                style={{ "--delay": "900ms", "--tilt": "-10deg" } as React.CSSProperties}
                aria-hidden="true"
              >
                <ActivityStamp a={stamp} size="100%" tilt={0} />
                <span className="pop-ring" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SAUDI ARABIA ── */}
      <section id="saudi" className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
        <SectionHead
          kicker={
            <>
              <span className="font-arabic text-base normal-case tracking-normal" lang="ar">
                اكتشف السعودية
              </span>{" "}
              · Saudi Arabia
            </>
          }
          title="Discover the Kingdom"
          italic={["Kingdom"]}
        >
          <Link to="/activities" search={{ region: "saudi" }} className="reveal link-arrow">
            View all {saudi.length} <span aria-hidden>→</span>
          </Link>
        </SectionHead>
        {saudi.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {saudi.slice(0, 4).map((a, i) => (
              <ActivityCard key={a.activityId} a={a} index={i} />
            ))}
          </div>
        ) : (
          <p className="panel p-10 text-center text-sm text-muted-foreground">
            Saudi experiences are coming soon.
          </p>
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="bg-lavender-soft py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <SectionHead
            kicker="How ERA works"
            title="From discovery to your passport"
            italic={["passport"]}
          />
          <ol className="steps grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.n} className="reveal step-card" style={d(i * 120)}>
                <div className="flex items-center justify-between">
                  <StampSeal
                    identity={{ shape: "circle", color: "plum", icon: s.icon }}
                    size={46}
                    className="step-seal"
                  />
                  <span className="font-display text-2xl text-lavender">{s.n}</span>
                </div>
                <p className="mt-6 text-lg font-medium text-primary">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── STAMPS ── */}
      <section id="stamps" className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="reveal section-kicker">The ERA Passport</p>
            <h2 className="mt-3 font-display text-4xl leading-[1.05] text-primary md:text-5xl">
              <RevealWords text="Every experience has its own stamp" italic={["own"]} />
            </h2>
            <p
              className="reveal mt-5 max-w-md leading-relaxed text-muted-foreground"
              style={d(150)}
            >
              Each experience has its own shape, ink and emblem. Complete it, and its stamp is
              printed into your digital passport. Try it — click the page.
            </p>
            <Link
              to={user?.role === "customer" ? "/passport" : "/signup"}
              className="reveal btn btn-primary mt-8"
              style={d(250)}
            >
              {user?.role === "customer" ? "See My Stamps" : "Start Collecting"}
            </Link>
          </div>
          <div className="reveal" style={d(150)}>
            {all.length ? <StampPlayground activities={all} /> : null}
          </div>
        </div>
      </section>

      {/* ── AROUND THE WORLD ── */}
      {world.length > 0 && (
        <section className="border-t bg-white py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <SectionHead
              kicker="Beyond the Kingdom"
              title="Journeys around the world"
              italic={["world"]}
            >
              <Link to="/activities" search={{ region: "world" }} className="reveal link-arrow">
                View all <span aria-hidden>→</span>
              </Link>
            </SectionHead>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {world.map((a, i) => (
                <ActivityCard key={a.activityId} a={a} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="px-5 pt-20 md:px-8">
        <div className="cta-band reveal mx-auto max-w-6xl rounded-3xl px-8 py-16 text-center md:py-20">
          <p className="section-kicker">
            {user?.role === "provider" ? "For hosts" : "Your journey starts here"}
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl leading-[1.05] text-primary md:text-5xl">
            <RevealWords
              text={
                user?.role === "provider"
                  ? "Design an experience worth stamping"
                  : "Your passport is waiting"
              }
              italic={["waiting", "stamping"]}
            />
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {user?.role === "provider" ? (
              <Link to="/provider/activities/new" className="btn btn-primary">
                Create an Activity
              </Link>
            ) : (
              <>
                <Link to={user ? "/activities" : "/signup"} className="btn btn-primary">
                  {user ? "Book Your Next Stamp" : "Create Free Account"}
                </Link>
                {!user && (
                  <Link to="/signup" className="btn btn-outline">
                    Become a Host
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
