import { createFileRoute, Link } from "@tanstack/react-router";
import { Protected, EmptyState } from "@/components/era/AppShell";
import { ActivityImage } from "@/components/era/ActivityBits";
import { ActivityStamp } from "@/components/era/Stamp";
import {
  formatTime,
  getActivity,
  getBooking,
  getStampForBooking,
  getTicket,
  type Activity,
  type User,
} from "@/lib/era/store";
import { arabicCity, city } from "@/lib/era/places";
import { useEra } from "@/lib/era/use-era";

export const Route = createFileRoute("/tickets/$ticketId")({
  head: () => ({
    meta: [
      { title: "Digital Ticket — ERA" },
      { name: "description", content: "Your ERA heritage ticket." },
      { property: "og:title", content: "Digital Ticket — ERA" },
      { property: "og:description", content: "Your ERA heritage ticket." },
    ],
  }),
  component: () => <Protected role="customer">{(u) => <Ticket user={u} />}</Protected>,
});

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Decorative barcode derived from the ticket code (each character sets a few bar widths). */
function Barcode({ code }: { code: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of code) {
    const n = ch.charCodeAt(0);
    for (let k = 0; k < 3; k++) {
      const w = ((n >> (k * 2)) & 3) + 1;
      bars.push({ x, w });
      x += w + (((n >> (k + 1)) & 1) + 1);
    }
  }
  return (
    <svg
      viewBox={`0 0 ${x} 40`}
      preserveAspectRatio="none"
      className="h-12 w-full"
      aria-hidden="true"
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="40" fill="currentColor" />
      ))}
    </svg>
  );
}

function Ticket({ user }: { user: User }) {
  useEra();
  const { ticketId } = Route.useParams();
  const t = getTicket(ticketId);
  const b = t && getBooking(t.bookingId);
  const a = b && getActivity(b.activityId);
  if (!t || !b || !a || b.customerId !== user.userId)
    return (
      <EmptyState
        title="Ticket not found"
        text="This ticket doesn't exist or belongs to another account."
      >
        <Link to="/my-bookings" className="btn btn-outline">
          My Bookings
        </Link>
      </EmptyState>
    );

  const stamp = getStampForBooking(b.bookingId);
  const completed = b.status === "Completed";
  const code = t.ticketCode ?? `ERA-${t.ticketId}`;
  const [y, mo, dd] = a.date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y!, (mo ?? 1) - 1, dd).getDay()];
  const ar = arabicCity(a.destination);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link to="/my-bookings" className="link-arrow">
          ← My Bookings
        </Link>
      </div>

      <article className="pass">
        {/* Photo in an arch, like the logo */}
        <div className="pass-photo">
          <div className="pass-arch">
            <ActivityImage a={a} />
          </div>
          <p className="pass-admit">Admit One</p>
        </div>

        {/* Main body */}
        <div className="pass-main">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">ERA Heritage Pass · {a.type}</p>
              <h1 className="mt-2 font-display text-3xl leading-tight text-primary md:text-[2.4rem]">
                {a.name}
              </h1>
            </div>
            <span className={`pass-status ${completed ? "is-done" : ""}`}>
              {completed ? "Completed" : "Confirmed"}
            </span>
          </div>

          <div className="pass-route">
            <div>
              <p className="pass-label">Destination</p>
              <p className="pass-city">{city(a.destination)}</p>
              {ar && (
                <p className="font-arabic text-lg text-mauve" lang="ar">
                  {ar}
                </p>
              )}
            </div>
            <div className="pass-path" aria-hidden="true">
              <span>✦</span>
            </div>
            <div className="text-right">
              <p className="pass-label">Experience</p>
              <p className="pass-city">{a.type}</p>
              <p className="text-sm text-muted-foreground">{a.location.split(",")[0]}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <div className="pass-date col-span-2 sm:col-span-1">
              <span className="font-display text-5xl leading-none text-primary">{dd}</span>
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {MONTHS[(mo ?? 1) - 1]} {y}
                <br />
                {weekday}
              </span>
            </div>
            <Field label="Time" value={formatTime(a.time)} />
            <Field label="Guest" value={user.fullName} />
            <Field label="Seat" value="01 · General" />
          </div>

          <div className="pass-code">
            <div className="text-primary">
              <Barcode code={code} />
            </div>
            <p className="mt-2 flex flex-wrap justify-between gap-2 font-mono text-xs tracking-[0.2em] text-muted-foreground">
              <span>{code}</span>
              <span>Booking #{b.bookingId}</span>
            </p>
          </div>
        </div>

        {/* Tear-off stub */}
        <div className="pass-stub">
          <span className="pass-notch top" aria-hidden="true" />
          <span className="pass-notch bottom" aria-hidden="true" />
          <div className="pass-foil" aria-hidden="true" />
          <p className="pass-label text-center">
            {completed ? "Stamp collected" : "Stamp to collect"}
          </p>
          <div className={completed ? "" : "pass-stamp-wait"}>
            <ActivityStamp
              a={a}
              date={stamp?.awardedAt ?? a.date}
              size={150}
              tilt={-8}
              variant={completed ? "inked" : "ghost"}
              animate={completed}
            />
          </div>
          <div className="text-center">
            <p className="pass-label">Ticket</p>
            <p className="font-mono text-sm text-primary">#{t.ticketId}</p>
          </div>
          <p className="text-center text-[0.65rem] leading-relaxed text-muted-foreground">
            Show this pass at entry.
            <br />
            Your host confirms — the stamp is yours.
          </p>
        </div>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="pass-label">{label}</p>
      <p className="mt-1 text-[0.98rem] font-medium text-foreground">{value}</p>
    </div>
  );
}
