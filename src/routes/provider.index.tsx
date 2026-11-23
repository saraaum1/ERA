import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Protected, PageHeader, EmptyState, StatCard, StatusPill } from "@/components/era/AppShell";
import { ActivitySeal } from "@/components/era/Stamp";
import { Modal } from "@/components/era/Modal";
import {
  formatDate,
  formatTime,
  getActivityBookings,
  getProviderActivities,
  getProviderBookings,
  isPast,
  remaining,
  softDeleteActivity,
  type Activity,
  type User,
} from "@/lib/era/store";
import { useEra } from "@/lib/era/use-era";

export const Route = createFileRoute("/provider/")({
  head: () => ({
    meta: [
      { title: "Provider Dashboard — ERA" },
      { name: "description", content: "Manage your ERA heritage experiences." },
      { property: "og:title", content: "Provider Dashboard — ERA" },
      { property: "og:description", content: "Manage your ERA heritage experiences." },
    ],
  }),
  component: () => <Protected role="provider">{(u) => <Dashboard user={u} />}</Protected>,
});

function Dashboard({ user }: { user: User }) {
  useEra();
  const list = getProviderActivities(user.userId);
  const bookings = getProviderBookings(user.userId);
  const [toDelete, setToDelete] = useState<Activity | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const closeDelete = useCallback(() => setToDelete(null), []);
  const awaiting = bookings.filter((b) => b.status === "Confirmed").length;
  const completed = bookings.filter((b) => b.status === "Completed").length;
  const add = (
    <Link to="/provider/activities/new" className="btn btn-primary">
      Add New Activity
    </Link>
  );

  const doDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    const r = await softDeleteActivity(user.userId, toDelete.activityId);
    setMsg(
      r.ok
        ? { ok: true, text: "Activity deleted." }
        : { ok: false, text: `Cannot delete activity: ${r.error}` },
    );
    setBusy(false);
    setToDelete(null);
  };

  return (
    <>
      <PageHeader eyebrow={`Welcome, ${user.fullName.split(" ")[0]}`} title="Provider Dashboard">
        {list.length > 0 && add}
      </PageHeader>
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Active experiences"
          value={list.length}
          hint={`${list.filter((a) => !isPast(a)).length} upcoming`}
        />
        <StatCard label="Total bookings" value={bookings.length} />
        <StatCard label="Awaiting completion" value={awaiting} hint="Confirm to award stamps" />
        <StatCard label="Stamps awarded" value={completed} />
      </div>
      {msg && (
        <p className={`notice ${msg.ok ? "notice-success" : "notice-error"} mb-6`} role="status">
          {msg.text}
        </p>
      )}
      {list.length === 0 ? (
        <EmptyState
          title="No activities yet"
          text="Create your first heritage experience and design its passport stamp."
        >
          {add}
        </EmptyState>
      ) : (
        <ul className="panel divide-y">
          {list.map((a) => {
            const bs = getActivityBookings(a.activityId);
            const open = bs.filter((b) => b.status === "Confirmed").length;
            return (
              <li
                key={a.activityId}
                className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center md:p-6"
              >
                <ActivitySeal a={a} size={52} className="mt-1 md:mt-0" />
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="eyebrow">{a.type}</p>
                    {isPast(a) && <StatusPill status="Past" />}
                  </div>
                  <h2 className="mt-1 text-xl text-primary md:text-2xl">{a.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(a.date)} · {formatTime(a.time)} · {remaining(a)} places remaining ·{" "}
                    {bs.length} booked{open ? ` · ${open} awaiting completion` : ""}
                  </p>
                </div>
                <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1">
                  <Link
                    to="/activities/$activityId"
                    params={{ activityId: a.activityId }}
                    className="btn btn-outline !px-4 !py-2"
                  >
                    View
                  </Link>
                  <Link
                    to="/provider/activities/$activityId/edit"
                    params={{ activityId: a.activityId }}
                    className="btn btn-outline !px-4 !py-2"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn btn-outline !px-4 !py-2"
                    onClick={() => setToDelete(a)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {toDelete && (
        <Modal onClose={closeDelete} labelledBy="del-title" className="max-w-md p-8">
          <h2 id="del-title" className="text-3xl text-primary">
            Delete activity?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            “{toDelete.name}” will be removed from Explore and can no longer be booked. Activities
            with active (Confirmed) bookings cannot be deleted. Existing tickets and stamps are
            kept.
          </p>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" autoFocus className="btn btn-outline" onClick={closeDelete}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={doDelete}>
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
