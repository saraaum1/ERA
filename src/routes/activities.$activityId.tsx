import { createFileRoute, Link } from "@tanstack/react-router";
import { Public, EmptyState } from "@/components/era/AppShell";
import { ActivityImage, DetailRow } from "@/components/era/ActivityBits";
import { ActivityStamp } from "@/components/era/Stamp";
import {
  formatDate,
  formatTime,
  getActivity,
  getCustomerBookings,
  isPast,
  remaining,
  type User,
} from "@/lib/era/store";
import { STAMP_COLORS, STAMP_ICONS, SHAPE_LABELS, stampIdentity } from "@/lib/era/stamps";
import { useEra } from "@/lib/era/use-era";

export const Route = createFileRoute("/activities/$activityId")({
  head: () => ({
    meta: [
      { title: "Experience Details — ERA" },
      { name: "description", content: "Details for a curated ERA heritage experience." },
      { property: "og:title", content: "Experience Details — ERA" },
      { property: "og:description", content: "Details for a curated ERA heritage experience." },
    ],
  }),
  component: () => <Public>{(u) => <Details user={u} />}</Public>,
});

function Details({ user }: { user: User | null }) {
  useEra();
  const { activityId } = Route.useParams();
  const a = getActivity(activityId);
  if (!a || a.isDeleted)
    return (
      <EmptyState
        title="Experience unavailable"
        text="This experience no longer exists or has been removed."
      >
        <Link to="/activities" className="btn btn-outline">
          Explore Experiences
        </Link>
      </EmptyState>
    );
  const left = remaining(a);
  const past = isPast(a);
  const mine =
    user?.role === "customer"
      ? getCustomerBookings(user.userId).filter((b) => b.activityId === a.activityId)
      : [];
  const identity = stampIdentity(a);
  const ownActivity = user?.role === "provider" && a.providerId === user.userId;

  let action: React.ReactNode;
  if (past)
    action = (
      <button type="button" className="btn btn-primary mt-8" disabled>
        This experience has ended
      </button>
    );
  else if (left === 0)
    action = (
      <button type="button" className="btn btn-primary mt-8" disabled>
        Fully Booked
      </button>
    );
  else if (!user)
    action = (
      <Link
        to="/login"
        search={{ redirect: `/booking/${a.activityId}/review` }}
        className="btn btn-primary mt-8"
      >
        Log In to Book
      </Link>
    );
  else if (user.role === "provider")
    action = ownActivity ? (
      <Link
        to="/provider/activities/$activityId/edit"
        params={{ activityId: a.activityId }}
        className="btn btn-outline mt-8"
      >
        Edit This Activity
      </Link>
    ) : (
      <p className="notice mt-8 bg-muted text-muted-foreground">
        Bookings are made from a customer account.
      </p>
    );
  else
    action = (
      <Link to="/booking/$id/review" params={{ id: a.activityId }} className="btn btn-primary mt-8">
        {mine.length ? "Book Another Seat" : "Book Now"}
      </Link>
    );

  return (
    <>
      <Link to="/activities" className="eyebrow mb-8 inline-block hover:text-primary">
        ← All experiences
      </Link>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="panel aspect-square overflow-hidden">
          <ActivityImage a={a} />
        </div>
        <div className="flex flex-col justify-center">
          <p className="eyebrow">
            {a.type} · {a.destination}
          </p>
          <h1 className="mt-3 text-4xl leading-tight text-primary md:text-5xl">{a.name}</h1>
          <p className="mt-6 leading-relaxed">{a.description}</p>
          <dl className="mt-8">
            <DetailRow label="Destination" value={a.destination} />
            <DetailRow label="Location" value={a.location} />
            <DetailRow label="Date" value={formatDate(a.date)} />
            <DetailRow label="Time" value={formatTime(a.time)} />
            <DetailRow
              label="Places remaining"
              value={past ? "Ended" : left === 0 ? "Fully Booked" : left}
            />
          </dl>
          {mine.length > 0 && (
            <p className="notice notice-success mt-6">
              You have {mine.length} {mine.length === 1 ? "booking" : "bookings"} for this
              experience.{" "}
              <Link to="/my-bookings" className="underline underline-offset-4">
                View my bookings
              </Link>
            </p>
          )}
          {action}
        </div>
      </div>

      <section className="passport mt-16">
        <div className="passport-page grid items-center gap-8 rounded-lg p-8 md:grid-cols-[auto_1fr] md:p-12">
          <ActivityStamp a={a} size={220} tilt={-6} className="mx-auto" />
          <div>
            <p className="eyebrow">The stamp you'll collect</p>
            <h2 className="mt-2 text-3xl text-primary md:text-4xl">{a.name}</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              This experience has its own stamp identity. Once your host confirms you took part,
              this stamp is printed into your ERA passport with the date you completed it.
            </p>
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="eyebrow">Emblem</dt>
                <dd className="mt-1">{STAMP_ICONS[identity.icon]}</dd>
              </div>
              <div>
                <dt className="eyebrow">Ink</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: STAMP_COLORS[identity.color].ink }}
                  />
                  {STAMP_COLORS[identity.color].label}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Shape</dt>
                <dd className="mt-1">{SHAPE_LABELS[identity.shape]}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
