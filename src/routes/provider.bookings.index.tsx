import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Protected, PageHeader, EmptyState, StatusPill } from "@/components/era/AppShell";
import { ActivitySeal } from "@/components/era/Stamp";
import {
  formatDate,
  getActivity,
  getProviderActivities,
  getProviderBookings,
  getUser,
  type User,
} from "@/lib/era/store";
import { useEra } from "@/lib/era/use-era";

export const Route = createFileRoute("/provider/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings — ERA Provider" },
      { name: "description", content: "Bookings for your ERA activities." },
      { property: "og:title", content: "Bookings — ERA Provider" },
      { property: "og:description", content: "Bookings for your ERA activities." },
    ],
  }),
  component: () => <Protected role="provider">{(u) => <Bookings user={u} />}</Protected>,
});

function Bookings({ user }: { user: User }) {
  useEra();
  const all = getProviderBookings(user.userId);
  const activities = getProviderActivities(user.userId);
  const [status, setStatus] = useState("All");
  const [activity, setActivity] = useState("All");
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const list = all.filter((b) => {
    const a = getActivity(b.activityId);
    const name = getUser(b.customerId)?.fullName ?? "";
    return (
      (status === "All" || b.status === status) &&
      (activity === "All" || b.activityId === activity) &&
      (!term ||
        name.toLowerCase().includes(term) ||
        b.bookingId.includes(term) ||
        (a?.name.toLowerCase().includes(term) ?? false))
    );
  });

  return (
    <>
      <PageHeader
        eyebrow="Service Provider"
        title="Bookings"
        text="Confirm completion after each experience to award the customer that activity's stamp."
      />
      {all.length === 0 ? (
        <EmptyState title="No bookings yet" text="Bookings for your activities will appear here." />
      ) : (
        <>
          <div className="panel mb-6 grid gap-4 p-5 md:grid-cols-[1fr_200px_260px]">
            <div>
              <label htmlFor="q" className="field-label">
                Search
              </label>
              <input
                id="q"
                type="search"
                className="field"
                placeholder="Customer, activity or booking no."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="status" className="field-label">
                Status
              </label>
              <select
                id="status"
                className="field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option>All</option>
                <option>Confirmed</option>
                <option>Completed</option>
              </select>
            </div>
            <div>
              <label htmlFor="act" className="field-label">
                Activity
              </label>
              <select
                id="act"
                className="field"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              >
                <option value="All">All activities</option>
                {activities.map((a) => (
                  <option key={a.activityId} value={a.activityId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {list.length === 0 ? (
            <EmptyState title="No matching bookings" text="Try a different filter." />
          ) : (
            <>
              {/* Phones: stacked cards */}
              <ul className="panel divide-y md:hidden">
                {list.map((b) => {
                  const a = getActivity(b.activityId);
                  return (
                    <li key={b.bookingId}>
                      <Link
                        to="/provider/bookings/$bookingId"
                        params={{ bookingId: b.bookingId }}
                        className="flex items-center gap-4 p-4"
                      >
                        {a && <ActivitySeal a={a} size={40} />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-primary">{a?.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {getUser(b.customerId)?.fullName ?? "Customer"} ·{" "}
                            {a && formatDate(a.date)}
                          </span>
                          <span className="mt-1.5 flex items-center gap-2">
                            <StatusPill status={b.status} />
                            <span className="font-mono text-[0.68rem] text-muted-foreground">
                              #{b.bookingId}
                            </span>
                          </span>
                        </span>
                        <span className="text-primary" aria-hidden>
                          →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {/* Tablets & desktop: table */}
              <div className="panel hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      {["No.", "Customer", "Activity", "Date", "Status", ""].map((h) => (
                        <th key={h} className="eyebrow px-6 py-4 font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {list.map((b) => {
                      const a = getActivity(b.activityId);
                      return (
                        <tr key={b.bookingId}>
                          <td className="px-6 py-4 font-mono text-xs">#{b.bookingId}</td>
                          <td className="px-6 py-4">
                            {getUser(b.customerId)?.fullName ?? "Customer"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-3">
                              {a && <ActivitySeal a={a} size={30} />}
                              {a?.name}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">{a && formatDate(a.date)}</td>
                          <td className="px-6 py-4">
                            <StatusPill status={b.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              to="/provider/bookings/$bookingId"
                              params={{ bookingId: b.bookingId }}
                              className="link-quiet whitespace-nowrap"
                            >
                              {b.status === "Confirmed" ? "Review & Complete" : "View Details"}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
