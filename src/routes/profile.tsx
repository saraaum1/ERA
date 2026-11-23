import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { PageHeader, Protected } from "@/components/era/AppShell";
import {
  changePassword,
  ensurePassport,
  getCustomerBookings,
  getPassportStamps,
  getProviderActivities,
  getProviderBookings,
  logout,
  updateProfile,
  type User,
} from "@/lib/era/store";
import { useEra } from "@/lib/era/use-era";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile Settings — ERA" },
      { name: "description", content: "Manage your ERA profile details." },
      { property: "og:title", content: "Profile Settings — ERA" },
      { property: "og:description", content: "Manage your ERA profile details." },
    ],
  }),
  component: () => <Protected>{(u) => <Profile user={u} />}</Protected>,
});

function Profile({ user }: { user: User }) {
  useEra();
  const navigate = useNavigate();
  const provider = user.role === "provider";
  const stats: [string, number][] = provider
    ? [
        ["Experiences", getProviderActivities(user.userId).length],
        ["Bookings", getProviderBookings(user.userId).length],
      ]
    : [
        ["Bookings", getCustomerBookings(user.userId).length],
        ["Stamps", getPassportStamps(ensurePassport(user.userId).passportId).length],
      ];

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Profile Settings"
        text="Manage your details and password."
      />

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Summary card */}
        <aside className="profile-card lg:sticky lg:top-28 lg:self-start">
          <div className="profile-avatar">{user.fullName.charAt(0).toUpperCase()}</div>
          <p className="mt-4 font-display text-2xl text-primary">{user.fullName}</p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <span className="profile-role">{provider ? "Service Provider" : "Customer"}</span>
          <dl className="mt-6 grid w-full grid-cols-2 border-t pt-5">
            {stats.map(([label, value]) => (
              <div key={label} className="text-center">
                <dd className="font-display text-3xl text-primary">{value}</dd>
                <dt className="text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
          <div className="mt-6 grid w-full gap-2">
            <Link
              to={provider ? "/provider" : "/passport"}
              className="btn btn-outline w-full !py-2.5"
            >
              {provider ? "Dashboard" : "My Passport"}
            </Link>
            <button
              type="button"
              className="profile-logout"
              onClick={async () => {
                await logout();
                navigate({ to: "/login", search: { redirect: undefined } });
              }}
            >
              Log Out
            </button>
          </div>
        </aside>

        {/* Forms */}
        <div className="space-y-8">
          <DetailsForm user={user} />
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="profile-section">
      <div className="border-b px-7 py-5">
        <h2 className="font-sans text-lg font-medium tracking-normal text-primary">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="px-7 py-6">{children}</div>
    </section>
  );
}

function Input({
  id,
  label,
  error,
  ...props
}: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input id={id} className="field" aria-invalid={!!error} {...props} />
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function DetailsForm({ user }: { user: User }) {
  const [f, setF] = useState({
    fullName: user.fullName,
    username: user.username,
    email: user.email,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const changed =
    f.fullName !== user.fullName || f.username !== user.username || f.email !== user.email;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setBusy(true);
    const r = await updateProfile(user.userId, f);
    setBusy(false);
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    setSaved(true);
  };
  return (
    <Section title="Personal details" text="Your name, username and email on ERA.">
      <form onSubmit={submit} noValidate className="space-y-5">
        {errors.form && (
          <p className="notice notice-error" role="alert">
            {errors.form}
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="fullName"
            label="Full Name"
            autoComplete="name"
            value={f.fullName}
            error={errors.fullName}
            onChange={(e) => setF({ ...f, fullName: e.target.value })}
          />
          <Input
            id="username"
            label="Username"
            autoComplete="username"
            value={f.username}
            error={errors.username}
            onChange={(e) => setF({ ...f, username: e.target.value })}
          />
        </div>
        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={f.email}
          error={errors.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
        />
        <div className="flex flex-wrap items-center justify-end gap-4 pt-1">
          {saved && !changed && (
            <span className="text-sm text-primary" role="status">
              ✓ Saved
            </span>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy || !changed}>
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Section>
  );
}

function PasswordForm() {
  const [f, setF] = useState({ current: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    setBusy(true);
    const r = await changePassword(f);
    setBusy(false);
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    setF({ current: "", password: "", confirm: "" });
    setDone(true);
  };
  return (
    <Section
      title="Password"
      text="At least 8 characters with an uppercase letter, a lowercase letter and a number."
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {errors.form && (
          <p className="notice notice-error" role="alert">
            {errors.form}
          </p>
        )}
        <Input
          id="pw-current"
          label="Current Password"
          type="password"
          autoComplete="current-password"
          value={f.current}
          error={errors.current}
          onChange={(e) => setF({ ...f, current: e.target.value })}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="pw-new"
            label="New Password"
            type="password"
            autoComplete="new-password"
            value={f.password}
            error={errors.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
          />
          <Input
            id="pw-confirm"
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            value={f.confirm}
            error={errors.confirm}
            onChange={(e) => setF({ ...f, confirm: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4 pt-1">
          {done && (
            <span className="text-sm text-primary" role="status">
              ✓ Password updated
            </span>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !f.current || !f.password}
          >
            {busy ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </Section>
  );
}
