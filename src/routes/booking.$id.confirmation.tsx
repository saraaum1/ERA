import { createFileRoute, Link } from "@tanstack/react-router";
import { Protected, EmptyState, StatusPill } from "@/components/era/AppShell";
import { DetailRow } from "@/components/era/ActivityBits";
import { ActivityStamp } from "@/components/era/Stamp";
import {
  formatDate,
  formatTime,
  getActivity,
  getBooking,
  getStampForBooking,
  getTicketForBooking,
  type User,
} from "@/lib/era/store";
import { useEra } from "@/lib/era/use-era";

export const Route = createFileRoute("/booking/$id/confirmation")({
  head: () => ({
    meta: [
      { title: "Booking Confirmed — ERA" },
      { name: "description", content: "Your ERA booking is confirmed." },
      { property: "og:title", content: "Booking Confirmed — ERA" },
      { property: "og:description", content: "Your ERA booking is confirmed." },
    ],
  }),
  component: () => <Protected role="customer">{(u) => <Confirmation user={u} />}</Protected>,
});

function Confirmation({ user }: { user: User }) {
  useEra();
  const { id } = Route.useParams();
  const b = getBooking(id);
  const a = b && getActivity(b.activityId);
  const t = b && getTicketForBooking(b.bookingId);
  if (!b || !a || !t || b.customerId !== user.userId)
    return (
      <EmptyState title="Booking not found" text="We couldn't find this booking.">
        <Link to="/my-bookings" className="btn btn-outline">
          My Bookings
        </Link>
      </EmptyState>
    );
  const stamp = getStampForBooking(b.bookingId);
  const completed = b.status === "Completed";
  return (
    <div className="mx-auto max-w-xl text-center">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary text-2xl text-primary"
        aria-hidden
      >
        ✓
      </div>
      <p className="eyebrow mt-6">{completed ? "Experience completed" : "Step 3 of 3"}</p>
      <h1 className="mt-2 text-5xl text-primary">
        {completed ? "Stamp Collected" : "Booking Confirmed"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {completed
          ? "This stamp is now in your ERA passport."
          : "Your place is reserved. Your digital ticket is ready."}
      </p>
      <div className="panel mt-10 p-8 text-left">
        <dl>
          <DetailRow label="Experience" value={a.name} />
          <DetailRow label="Date" value={formatDate(a.date)} />
          <DetailRow label="Time" value={formatTime(a.time)} />
          <DetailRow label="Location" value={a.location} />
          <DetailRow label="Status" value={<StatusPill status={b.status} />} />
          <DetailRow
            label="Booking No."
            value={<span className="font-mono text-xs">#{b.bookingId}</span>}
          />
          <DetailRow
            label="Ticket Code"
            value={<span className="font-mono text-xs">{t.ticketCode ?? t.ticketId}</span>}
          />
        </dl>
      </div>
      <div className="passport-page panel mt-6 flex items-center gap-6 p-6 text-left">
        <ActivityStamp
          a={a}
          date={stamp?.awardedAt}
          size={110}
          tilt={-6}
          variant={completed ? "inked" : "ghost"}
        />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {completed
            ? "Collected! Open your passport to see it among your stamps."
            : "Complete this experience and your host will award you this stamp."}
        </p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/tickets/$ticketId" params={{ ticketId: t.ticketId }} className="btn btn-primary">
          View Digital Ticket
        </Link>
        <Link to={completed ? "/passport" : "/my-bookings"} className="btn btn-outline">
          {completed ? "My Passport" : "My Bookings"}
        </Link>
      </div>
    </div>
  );
}
