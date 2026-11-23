import { Link } from "@tanstack/react-router";
import {
  formatDate,
  formatTime,
  getCurrentUser,
  isPast,
  remaining,
  type Activity,
} from "@/lib/era/store";
import { optimisedImage } from "@/lib/era/media";
import { STAMP_COLORS, stampIdentity } from "@/lib/era/stamps";
import { arabicCity, city } from "@/lib/era/places";
import { cn } from "@/lib/utils";
import { ActivityStamp, Emblem } from "./Stamp";

const BRASS = "#d2b49e";
const CREAM = "#f8f3ee";

export function ActivityImage({
  a,
  className,
  size = "lg",
}: {
  a: Activity;
  className?: string;
  size?: "lg" | "sm";
}) {
  const src = optimisedImage(a.image, size);
  if (src)
    return (
      <img
        src={src}
        alt={a.imageAlt ?? a.name}
        loading="lazy"
        decoding="async"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  return <ActivityArt a={a} className={className} />;
}

/** Editorial poster for experiences without a photo: ink colour, Sadu pattern, emblem and the Arabic place name. */
export function ActivityArt({ a, className }: { a: Activity; className?: string }) {
  const id = stampIdentity(a);
  const ink = STAMP_COLORS[id.color].ink;
  const pid = `art-${a.activityId}`;
  const ar = arabicCity(a.destination);
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={a.name}
      className={cn("block h-full w-full", className)}
    >
      <defs>
        <linearGradient id={`${pid}-bg`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={ink} />
          <stop offset="1" stopColor="#2d1d3d" />
        </linearGradient>
        <radialGradient id={`${pid}-glow`} cx="0.5" cy="0.38" r="0.55">
          <stop offset="0" stopColor={CREAM} stopOpacity="0.22" />
          <stop offset="1" stopColor={CREAM} stopOpacity="0" />
        </radialGradient>
        <pattern id={`${pid}-sadu`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M20 2L38 20 20 38 2 20Z M20 12L28 20 20 28 12 20Z"
            fill="none"
            stroke={BRASS}
            strokeWidth="0.8"
          />
        </pattern>
        <pattern id={`${pid}-band`} width="24" height="16" patternUnits="userSpaceOnUse">
          <path d="M0 16L12 0 24 16Z" fill={BRASS} fillOpacity="0.6" />
          <path d="M6 16L12 8 18 16Z" fill={ink} />
        </pattern>
      </defs>
      <rect width="400" height="500" fill={`url(#${pid}-bg)`} />
      <rect width="400" height="500" fill={`url(#${pid}-sadu)`} opacity="0.12" />
      <rect width="400" height="500" fill={`url(#${pid}-glow)`} />
      <rect x="0" y="58" width="400" height="16" fill={`url(#${pid}-band)`} />
      <rect
        x="18"
        y="18"
        width="364"
        height="464"
        rx="6"
        fill="none"
        stroke={BRASS}
        strokeOpacity="0.45"
      />
      <circle cx="200" cy="168" r="80" fill="none" stroke={BRASS} strokeOpacity="0.75" />
      <circle
        cx="200"
        cy="168"
        r="71"
        fill="none"
        stroke={BRASS}
        strokeOpacity="0.35"
        strokeDasharray="2 5"
      />
      <g transform="translate(148 116) scale(2.15)">
        <Emblem icon={id.icon} ink={CREAM} />
      </g>
      {ar && (
        <text
          x="200"
          y="296"
          textAnchor="middle"
          fill="#e6cdb7"
          fontFamily="Amiri, serif"
          fontSize="40"
        >
          {ar}
        </text>
      )}
      <text
        x="200"
        y={ar ? 326 : 296}
        textAnchor="middle"
        fill={CREAM}
        fillOpacity="0.75"
        fontFamily="Jost, sans-serif"
        fontSize="12"
        letterSpacing="6"
      >
        {city(a.destination).toUpperCase()}
      </text>
    </svg>
  );
}

export function ActivityCard({ a, index = 0 }: { a: Activity; index?: number }) {
  const left = remaining(a);
  const past = isPast(a);
  const [day, month] = formatDate(a.date).split(" ");
  const status = past ? "Ended" : left === 0 ? "Sold out" : left <= 10 ? `Only ${left} left` : null;
  return (
    <div
      className="reveal h-full"
      style={{ "--d": `${(index % 4) * 90}ms` } as React.CSSProperties}
    >
      <article className="event-card group relative flex h-full flex-col">
        <Link
          to="/activities/$activityId"
          params={{ activityId: a.activityId }}
          className="absolute inset-0 z-10 rounded-[18px]"
          aria-label={`View ${a.name}`}
        />
        <div className="event-media relative aspect-[4/3] overflow-hidden rounded-[14px] bg-muted">
          <ActivityImage
            a={a}
            size="lg"
            className="transition-transform duration-[1.2s] ease-out group-hover:scale-[1.05]"
          />
          <div className="card-shade absolute inset-0" />
          <div className="card-stamp absolute bottom-2 right-2 transition-transform duration-700 ease-out group-hover:-rotate-12 group-hover:scale-105">
            <ActivityStamp a={a} size={66} tilt={-8} inkColor="#fdfaf7" />
          </div>
          {status && (
            <span className={cn("event-flag absolute left-3 top-3", past && "is-muted")}>
              {status}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col px-1.5 pb-1 pt-4">
          <p className="event-meta">
            <span>{city(a.destination)}</span>
            <span aria-hidden>·</span>
            <span>
              {day} {month?.slice(0, 3)}
            </span>
            <span aria-hidden>·</span>
            <span>{formatTime(a.time)}</span>
          </p>
          <h3 className="event-title mt-1.5 line-clamp-2">{a.name}</h3>
          <p className="mt-2 text-xs text-mauve">{a.type}</p>
          <div className="mt-auto pt-4">
            <BookButton a={a} />
          </div>
        </div>
      </article>
    </div>
  );
}

/** Book button on cards: sits above the card's full-size link. */
function BookButton({ a }: { a: Activity }) {
  const user = getCurrentUser();
  if (isPast(a)) return <span className="btn btn-outline book-old is-off w-full">Ended</span>;
  if (remaining(a) === 0)
    return <span className="btn btn-outline book-old is-off w-full">Fully Booked</span>;
  if (user?.role === "provider")
    return (
      <Link
        to="/activities/$activityId"
        params={{ activityId: a.activityId }}
        className="btn btn-outline book-old w-full"
      >
        View Details
      </Link>
    );
  if (!user)
    return (
      <Link
        to="/login"
        search={{ redirect: "/booking/" + a.activityId + "/review" }}
        className="btn btn-outline book-old w-full"
      >
        Book Now
      </Link>
    );
  return (
    <Link
      to="/booking/$id/review"
      params={{ id: a.activityId }}
      className="btn btn-outline book-old w-full"
    >
      Book Now
    </Link>
  );
}

export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 border-b py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
