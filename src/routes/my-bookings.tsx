import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Protected, EmptyState, PageHeader, StatusPill } from "@/components/era/AppShell";
import { ActivitySeal } from "@/components/era/Stamp";
import {
  formatDate,
  formatTime,
  getActivity,
  getCustomerBookings,
  getTicketForBooking,
  isPast,
  type User,
} from "@/lib/era/store";
import { useEra } from "@/lib/era/use-era";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — ERA" },
      { name: "description", content: "Your ERA bookings and digital tickets." },
      { property: "og:title", content: "My Bookings — ERA" },
      { property: "og:description", content: "Your ERA bookings and digital tickets." },
    ],
  }),
  component: () => <Protected role="customer">{(u) => <MyBookings user={u} />}</Protected>,
});

const TABS = ["Upcoming", "Completed", "All"] as const;

function MyBookings({ user }: { user: User }) {
  useEra();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Upcoming");
  const rows = getCustomerBookings(user.userId)
    .map((b) => ({ b, a: getActivity(b.activityId), t: getTicketForBooking(b.bookingId) }))
    .filter((r): r is typeof r & { a: NonNullable<typeof r.a> } => !!r.a)
    .sort((x, y) => `${x.a.date}${x.a.time}`.localeCompare(`${y.a.date}${y.a.time}`));
  const counts = {
    Upcoming: rows.filter((r) => r.b.status === "Confirmed").length,
    Completed: rows.filter((r) => r.b.status === "Completed").length,
    All: rows.length,
  };
  const list = rows.filter(
    (r) =>
      tab === "All" ||
      (tab === "Upcoming" ? r.b.status === "Confirmed" : r.b.status === "Completed"),
  );

  return (
    <>
      <PageHeader eyebrow="Your journeys" title="My Bookings">
        <Link to="/activities" className="btn btn-outline">
          Book an Experience
        </Link>
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyState title="No bookings yet" text="Your reserved experiences will appear here.">
          <Link to="/activities" className="btn btn-primary">
            Explore Experiences
          </Link>
        </EmptyState>
      ) : (
        <>
          <div role="tablist" className="mb-6 flex gap-2 border-b">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "-mb-px border-b-2 px-4 py-3 text-xs uppercase tracking-[0.16em] transition-colors",
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-primary",
                )}
              >
                {t} <span className="ml-1 opacity-60">({counts[t]})</span>
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <EmptyState
              title={tab === "Completed" ? "No completed experiences yet" : "Nothing upcoming"}
              text={
                tab === "Completed"
                  ? "Completed experiences — and their stamps — will show here."
                  : "Book your next heritage experience."
              }
            />
          ) : (
            <ul className="panel divide-y">
              {list.map(({ b, a, t }) => {
                const done = b.status === "Completed";
                const awaiting = !done && isPast(a);
                return (
                  <li
                    key={b.bookingId}
                    className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center md:p-6"
                  >
                    <ActivitySeal a={a} size={52} muted={!done} className="mt-1 md:mt-0" />
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl text-primary md:text-2xl">{a.name}</h2>
                        <StatusPill status={b.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(a.date)} · {formatTime(a.time)} · {a.location}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Booking #{b.bookingId} ·{" "}
                        {done
                          ? "Stamp collected ✓"
                          : awaiting
                            ? "Awaiting your host's confirmation for the stamp"
                            : "Stamp available after the experience"}
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1">
                      <Link
                        to="/booking/$id/confirmation"
                        params={{ id: b.bookingId }}
                        className="btn btn-outline !px-4 !py-2"
                      >
                        Details
                      </Link>
                      {t && (
                        <Link
                          to="/tickets/$ticketId"
                          params={{ ticketId: t.ticketId }}
                          className="btn btn-primary !px-4 !py-2"
                        >
                          Ticket
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}
