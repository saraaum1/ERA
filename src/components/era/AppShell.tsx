import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { AssistantChat } from "./AssistantChat";
import { useScrolled } from "./Motion";
import { cn } from "@/lib/utils";
import { useEra, homeFor } from "@/lib/era/use-era";
import { logout, type Role, type User } from "@/lib/era/store";

const NAV: Record<Role | "guest", { to: string; label: string }[]> = {
  guest: [
    { to: "/", label: "Home" },
    { to: "/activities", label: "Explore" },
  ],
  customer: [
    { to: "/activities", label: "Explore" },
    { to: "/my-bookings", label: "My Bookings" },
    { to: "/passport", label: "My Passport" },
  ],
  provider: [
    { to: "/provider", label: "Dashboard" },
    { to: "/provider/bookings", label: "Bookings" },
    { to: "/activities", label: "Explore" },
  ],
};

function TopNavbar({ user, overlay = false }: { user: User | null; overlay?: boolean }) {
  const scrolled = useScrolled(60);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    setMenu(false);
    setMobile(false);
  }, [pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) =>
      ref.current && !ref.current.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);
  const doLogout = async () => {
    await logout();
    navigate({ to: "/login", search: { redirect: undefined } });
  };
  const items = NAV[user?.role ?? "guest"];
  const linkCls = "nav-link text-[0.74rem] uppercase tracking-[0.2em] py-2";
  const active = { className: "is-active" };
  const exact = (to: string) => to === "/provider" || to === "/";

  return (
    <header
      className={cn(
        "site-header no-print top-0 z-40 transition-[background-color,border-color,color,box-shadow] duration-500",
        overlay ? "fixed inset-x-0" : "sticky",
        overlay && !scrolled && !mobile ? "is-clear" : "is-solid",
      )}
    >
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 md:px-8">
        <Link
          to={user ? homeFor(user.role) : "/"}
          aria-label="ERA home"
          className="brand flex shrink-0 items-center gap-3"
        >
          <Logo className="site-logo h-14" />
          <span className="brand-divider" aria-hidden="true" />
          <span className="flex flex-col leading-none">
            <span className="brand-word">ERA</span>
            <span className="brand-tag">Heritage Experiences</span>
          </span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={linkCls}
              activeProps={active}
              activeOptions={{ exact: exact(i.to) }}
            >
              {i.label}
            </Link>
          ))}
          {user ? (
            <div className="relative" ref={ref}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
                className="nav-user flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-display text-base text-primary-foreground">
                  {user.fullName.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-32 truncate">{user.fullName.split(" ")[0]}</span>
              </button>
              {menu && (
                <div
                  role="menu"
                  className="panel fade-up absolute right-0 mt-2 w-56 text-foreground overflow-hidden py-1 shadow-sm"
                >
                  <p className="border-b px-4 py-2.5 text-xs text-muted-foreground">
                    {user.role === "provider" ? "Service Provider" : "Customer"} · @{user.username}
                  </p>
                  <Link
                    role="menuitem"
                    to="/profile"
                    className="block px-4 py-2.5 text-sm hover:bg-muted"
                  >
                    Profile Settings
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={doLogout}
                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-muted"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" search={{ redirect: undefined }} className={linkCls}>
                Log In
              </Link>
              <Link to="/signup" className="btn nav-cta !px-5 !py-2.5">
                Sign Up
              </Link>
            </div>
          )}
        </nav>
        <button
          type="button"
          className="nav-user rounded border px-3 py-2 text-xs uppercase tracking-[0.16em] md:hidden"
          aria-expanded={mobile}
          aria-controls="mobile-nav"
          onClick={() => setMobile((m) => !m)}
        >
          {mobile ? "Close" : "Menu"}
        </button>
      </div>
      {mobile && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t bg-background px-5 pb-4 text-foreground md:hidden"
        >
          {[...items, ...(user ? [{ to: "/profile", label: "Profile Settings" }] : [])].map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className="block border-b py-3 text-sm"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: exact(i.to) }}
            >
              {i.label}
            </Link>
          ))}
          {user ? (
            <button type="button" onClick={doLogout} className="block py-3 text-sm">
              Log Out
            </button>
          ) : (
            <>
              <Link
                to="/login"
                search={{ redirect: undefined }}
                className="block border-b py-3 text-sm"
              >
                Log In
              </Link>
              <Link to="/signup" className="block py-3 text-sm text-primary">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter({ user }: { user: User | null }) {
  return (
    <footer className="site-footer no-print relative mt-24 overflow-hidden">
      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div>
          <Logo className="h-28" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Where heritage becomes an experience. Book cultural activities and collect a unique
            stamp for every one you complete.
          </p>
        </div>
        <FooterCol
          title="Discover"
          links={[
            { to: "/activities", label: "All Experiences" },
            { to: "/activities", label: "Sport", search: { type: "Sport" } },
            { to: "/activities", label: "Wellness", search: { type: "Wellness" } },
            { to: "/activities", label: "Entertainment", search: { type: "Entertainment" } },
          ]}
        />
        {user?.role === "provider" ? (
          <FooterCol
            title="Provider"
            links={[
              { to: "/provider", label: "Dashboard" },
              { to: "/provider/activities/new", label: "Add Activity" },
              { to: "/provider/bookings", label: "Bookings" },
            ]}
          />
        ) : (
          <FooterCol
            title="Traveller"
            links={
              user
                ? [
                    { to: "/my-bookings", label: "My Bookings" },
                    { to: "/passport", label: "My Passport" },
                  ]
                : [
                    { to: "/signup", label: "Create an Account" },
                    { to: "/login", label: "Log In" },
                  ]
            }
          />
        )}
        <FooterCol
          title="Account"
          links={
            user
              ? [{ to: "/profile", label: "Profile Settings" }]
              : [{ to: "/signup", label: "Become a Provider" }]
          }
        />
      </div>
      <div className="relative border-t border-primary/10">
        <p className="mx-auto max-w-6xl px-5 py-6 text-xs tracking-[0.18em] text-muted-foreground md:px-8">
          © {new Date().getFullYear()} ERA · Culture · Activities · Experiences ·{" "}
          <Link to="/credits" className="underline-offset-4 hover:text-primary hover:underline">
            Photo credits
          </Link>
        </p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string; search?: Record<string, string> }[];
}) {
  return (
    <div>
      <p className="mb-5 text-[0.65rem] uppercase tracking-[0.3em] text-mauve">{title}</p>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              to={l.to}
              search={l.search as never}
              className="text-foreground/80 transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DbError({ error }: { error: string }) {
  return (
    <div className="mx-auto max-w-2xl px-5 pt-10" role="alert">
      <p className="notice notice-error">
        Cannot load ERA database: {error}. Check that MySQL is running and the .env file is correct,
        then refresh.
      </p>
    </div>
  );
}

/** Layout for pages anyone can open (guests and signed-in users). */
export function Public({
  children,
  bare,
  overlay,
}: {
  children: (user: User | null) => ReactNode;
  bare?: boolean;
  overlay?: boolean;
}) {
  const { ready, user, error } = useEra();
  if (!ready) return <div className="min-h-screen" aria-busy="true" />;
  return (
    <div className="flex min-h-screen flex-col">
      <TopNavbar user={user} overlay={overlay} />
      {error && <DbError error={error} />}
      <main
        className={`flex-1 ${bare ? "" : "fade-up mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16"}`}
      >
        {children(user)}
      </main>
      <SiteFooter user={user} />
      <AssistantChat />
    </div>
  );
}

/** Route guard + layout for authenticated areas. */
export function Protected({
  role,
  children,
}: {
  role?: Role;
  children: (user: User) => ReactNode;
}) {
  const { ready, user, error } = useEra();
  const pathname = useLocation({ select: (l) => l.pathname });
  const navigate = useNavigate();
  const blocked = ready && !error && (!user || (role && user.role !== role));
  const target = !user ? "/login" : homeFor(user.role);
  useEffect(() => {
    if (!blocked || pathname.startsWith("/login")) return;
    if (target === "/login")
      navigate({ to: "/login", search: { redirect: pathname }, replace: true });
    else navigate({ to: target, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, target]);
  if (ready && error) return <DbError error={error} />;
  if (!ready || blocked || !user) return <div className="min-h-screen" aria-busy="true" />;
  return (
    <div className="flex min-h-screen flex-col">
      <TopNavbar user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 md:px-8 md:py-16 fade-up">
        {children(user)}
      </main>
      <SiteFooter user={user} />
      <AssistantChat />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="min-w-0">
        {eyebrow && <p className="section-kicker">{eyebrow}</p>}
        <h1 className="mt-3 font-display text-4xl leading-[1.08] text-primary md:text-5xl">
          {title}
        </h1>
        {text && (
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
            {text}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-3">{children}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="panel px-6 py-16 text-center">
      <p className="font-display text-2xl text-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`status-pill ${status === "Completed" ? "status-completed" : status === "Past" ? "status-past" : "status-confirmed"}`}
    >
      {status}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="panel p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-4xl text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  id,
  error,
  hint,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
