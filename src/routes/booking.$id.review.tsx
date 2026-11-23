import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Protected, EmptyState, PageHeader } from "@/components/era/AppShell";
import { DetailRow } from "@/components/era/ActivityBits";
import { ActivityStamp } from "@/components/era/Stamp";
import {
  createBooking,
  formatDate,
  formatTime,
  getActivity,
  isPast,
  remaining,
  type User,
} from "@/lib/era/store";
import { useEra } from "@/lib/era/use-era";

export const Route = createFileRoute("/booking/$id/review")({
  head: () => ({
    meta: [
      { title: "Review Booking — ERA" },
      { name: "description", content: "Review your ERA booking before confirming." },
      { property: "og:title", content: "Review Booking — ERA" },
      { property: "og:description", content: "Review your ERA booking before confirming." },
    ],
  }),
  component: () => <Protected role="customer">{(u) => <Review user={u} />}</Protected>,
});

function Review({ user }: { user: User }) {
  useEra();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const a = getActivity(id);
  if (!a || a.isDeleted)
    return (
      <EmptyState title="Experience unavailable" text="This experience can no longer be booked.">
        <Link to="/activities" className="btn btn-outline">
          Explore Experiences
        </Link>
      </EmptyState>
    );
  const full = remaining(a) === 0;
  const past = isPast(a);

  const confirm = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const r = await createBooking(user.userId, a.activityId);
    if (!r.ok) {
      setError(r.error);
      setBusy(false);
      lock.current = false;
      return;
    }
    navigate({
      to: "/booking/$id/confirmation",
      params: { id: r.data.booking.bookingId },
      replace: true,
    });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Step 2 of 3" title="Review Your Booking" />
      <div className="grid gap-8 md:grid-cols-[1fr_260px]">
        <div className="panel p-8">
          <dl>
            <DetailRow label="Experience" value={a.name} />
            <DetailRow label="Location" value={a.location} />
            <DetailRow label="Date" value={formatDate(a.date)} />
            <DetailRow label="Time" value={formatTime(a.time)} />
            <DetailRow label="Guest" value={user.fullName} />
            <DetailRow label="Seats" value="1" />
            <DetailRow label="Places remaining" value={remaining(a)} />
          </dl>
          {error && (
            <p className="notice notice-error mt-6" role="alert">
              {error}
            </p>
          )}
          {past && !error && (
            <p className="notice notice-error mt-6" role="alert">
              This experience has already taken place.
            </p>
          )}
          {full && !past && !error && (
            <p className="notice notice-error mt-6" role="alert">
              This experience is fully booked.
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/activities/$activityId"
              params={{ activityId: a.activityId }}
              className="btn btn-outline"
            >
              Back
            </Link>
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={confirm}
              disabled={busy || full || past}
            >
              {busy ? "Confirming…" : "Confirm Booking"}
            </button>
          </div>
        </div>
        <aside className="passport-page panel flex flex-col items-center p-6 text-center">
          <p className="eyebrow mb-3">Stamp to collect</p>
          <ActivityStamp a={a} size={190} tilt={-5} variant="ghost" />
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Take part in this experience and your host will print this stamp into your passport.
          </p>
        </aside>
      </div>
    </div>
  );
}
