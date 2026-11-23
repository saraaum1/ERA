import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Protected, PageHeader, EmptyState, StatusPill } from "@/components/era/AppShell";
import { DetailRow } from "@/components/era/ActivityBits";
import { ActivityStamp } from "@/components/era/Stamp";
import {
  confirmCompletion,
  formatDate,
  formatTime,
  getActivity,
  getBooking,
  getUser,
  isPast,
  today,
  type User,
} from "@/lib/era/store";
import { useEra } from "@/lib/era/use-era";

export const Route = createFileRoute("/provider/bookings/$bookingId")({
  head: () => ({
    meta: [
      { title: "Booking Details — ERA Provider" },
      { name: "description", content: "Review a booking and confirm completion." },
      { property: "og:title", content: "Booking Details — ERA Provider" },
      { property: "og:description", content: "Review a booking and confirm completion." },
    ],
  }),
  component: () => <Protected role="provider">{(u) => <BookingDetails user={u} />}</Protected>,
});

function BookingDetails({ user }: { user: User }) {
  useEra();
  const { bookingId } = Route.useParams();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [justAwarded, setJustAwarded] = useState(false);
  const b = getBooking(bookingId);
  const a = b && getActivity(b.activityId);
  if (!b || !a || a.providerId !== user.userId)
    return (
      <EmptyState
        title="Booking not found"
        text="You can only view bookings for your own activities."
      >
        <Link to="/provider/bookings" className="btn btn-outline">
          Bookings
        </Link>
      </EmptyState>
    );
  const done = b.status === "Completed";
  const early = !isPast(a) && a.date !== today();
  const customer = getUser(b.customerId)?.fullName ?? "Customer";

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    const r = await confirmCompletion(user.userId, b.bookingId);
    if (r.ok) setJustAwarded(true);
    setMsg(
      r.ok
        ? {
            ok: true,
            text: `Completion confirmed. The “${a.name}” stamp has been added to ${customer}'s passport.`,
          }
        : { ok: false, text: r.error },
    );
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/provider/bookings" className="eyebrow mb-8 inline-block hover:text-primary">
        ← Bookings
      </Link>
      <PageHeader eyebrow={`Booking #${b.bookingId}`} title="Booking Details" />
      <div className="grid gap-8 md:grid-cols-[1fr_280px]">
        <div className="panel p-8">
          {msg && (
            <p
              className={`notice mb-6 ${msg.ok ? "notice-success" : "notice-error"}`}
              role="status"
            >
              {msg.text}
            </p>
          )}
          <dl>
            <DetailRow label="Customer" value={customer} />
            <DetailRow label="Activity" value={a.name} />
            <DetailRow label="Location" value={a.location} />
            <DetailRow label="Date" value={formatDate(a.date)} />
            <DetailRow label="Time" value={formatTime(a.time)} />
            <DetailRow label="Status" value={<StatusPill status={b.status} />} />
          </dl>
          {!done ? (
            <>
              {early && (
                <p className="notice mt-6 bg-muted text-muted-foreground">
                  This experience takes place on {formatDate(a.date)}. You can confirm completion
                  and award the stamp on or after that date.
                </p>
              )}
              <button
                type="button"
                className="btn btn-primary mt-8 w-full"
                onClick={confirm}
                disabled={busy || early}
              >
                {busy
                  ? "Confirming…"
                  : early
                    ? "Available on " + formatDate(a.date)
                    : "Confirm Completion & Award Stamp"}
              </button>
            </>
          ) : (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              This booking is completed. The stamp is in the customer's passport.
            </p>
          )}
        </div>
        <aside className="passport-page panel flex flex-col items-center p-6 text-center">
          <p className="eyebrow mb-3">{done ? "Stamp awarded" : "Stamp to award"}</p>
          <ActivityStamp
            key={String(done)}
            a={a}
            date={a.date}
            size={200}
            tilt={-6}
            variant={done ? "inked" : "ghost"}
            animate={justAwarded}
          />
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            {done
              ? "Printed into the customer's ERA passport."
              : "Confirming completion prints this stamp into the customer's passport."}
          </p>
        </aside>
      </div>
    </div>
  );
}
