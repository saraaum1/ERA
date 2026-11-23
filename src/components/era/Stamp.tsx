import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  STAMP_COLORS,
  stampIdentity,
  stampPlace,
  stampTitle,
  type StampIcon,
  type StampIdentity,
  type StampShape,
} from "@/lib/era/stamps";
import type { Activity } from "@/lib/era/store";

const PAPER = "#FBF9F5";
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function stampDate(d?: string | null) {
  if (!d) return "";
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return !y || !m || !day ? "" : `${String(day).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/* ---------- shapes (200 × 200 canvas, centre 100,100) ---------- */
const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(100 + r * Math.cos(a)).toFixed(2)} ${(100 + r * Math.sin(a)).toFixed(2)}`;
};
const polygon = (sides: number, r: number, offset: number) =>
  `M${Array.from({ length: sides }, (_, i) => pt(r, offset + (360 / sides) * i)).join("L")}Z`;

function scalloped() {
  const n = 22,
    r = 88;
  const chord = 2 * r * Math.sin(Math.PI / n);
  const br = (chord / 2) * 1.08;
  let d = `M${pt(r, -90)}`;
  for (let i = 1; i <= n; i++)
    d += `A${br.toFixed(2)} ${br.toFixed(2)} 0 0 1 ${pt(r, -90 + (360 / n) * i)}`;
  return d + "Z";
}
function sunburst() {
  const n = 40;
  return `M${Array.from({ length: n * 2 }, (_, i) => pt(i % 2 ? 88 : 97, -90 + (180 / n) * i)).join("L")}Z`;
}
const SHIELD = "M100 5L187 27V98C191 160 160 187 100 197C40 187 9 160 13 98V27Z";

const SHAPE_PATH: Record<StampShape, string> = {
  circle: "M100 6A94 94 0 1 1 99.99 6Z",
  scalloped: scalloped(),
  sunburst: sunburst(),
  hexagon: polygon(6, 99, -90),
  octagon: polygon(8, 98, -112.5),
  shield: SHIELD,
};
/** Shapes with a round inner border; the others repeat their own outline inside. */
const ROUND_INNER = new Set<StampShape>(["circle", "scalloped", "sunburst"]);

/* ---------- emblems (48 × 48 box) ---------- */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

export function Emblem({ icon, ink }: { icon: StampIcon; ink: string }) {
  const f = { fill: ink, stroke: "none" } as const;
  const soft = { opacity: 0.55 } as const;
  const shapes: Record<StampIcon, ReactNode> = {
    matcha: (
      <>
        <path d="M6 24h36c0 9.4-8 16-18 16S6 33.4 6 24z" />
        <path d="M17 43.5h14" />
        <path d="M18 19c-2.5-3 2.5-5 0-9M24 19c-2.5-3 2.5-5 0-9M30 19c-2.5-3 2.5-5 0-9" />
        <path d="M12.5 29.5c3 3 7 4.2 11.5 4.2" style={soft} />
      </>
    ),
    coffee: (
      <>
        <path d="M9 20h24v9a12 12 0 0 1-24 0z" />
        <path d="M33 23h3a5 5 0 0 1 0 10h-4" />
        <path d="M6 44h30" />
        <path d="M16 15c-2-3 2-5 0-8M24 15c-2-3 2-5 0-8" />
      </>
    ),
    stars: (
      <>
        <path
          d="M19.9 10.2A14 14 0 1 0 35.2 28.6A12 12 0 0 1 19.9 10.2z"
          fill={ink}
          fillOpacity={0.18}
        />
        <path d={sparkle(37, 10, 4.5)} {...f} />
        <path d={sparkle(43, 20, 2.6)} {...f} />
        <path d={sparkle(31.5, 17, 1.8)} {...f} />
        <path d="M4 44c7-4 13-4 20 0s13 4 20 0" />
      </>
    ),
    sun: (
      <>
        <circle cx="24" cy="22" r="8" fill={ink} fillOpacity={0.18} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <path
              key={i}
              d={`M${24 + 12 * Math.cos(a)} ${22 + 12 * Math.sin(a)}L${24 + 16.5 * Math.cos(a)} ${22 + 16.5 * Math.sin(a)}`}
            />
          );
        })}
        <path d="M5 44c6-3 12-3 19 0s13 3 19 0" style={soft} />
      </>
    ),
    tennis: (
      <>
        <ellipse cx="18" cy="18" rx="11" ry="13" transform="rotate(-45 18 18)" />
        <path d="M11 14h14M11 22h14M14 11v14M22 11v14" style={soft} strokeWidth={1.4} />
        <path d="M27 27l12 12" strokeWidth={4.5} />
        <circle cx="38.5" cy="10.5" r="5" fill={ink} fillOpacity={0.18} />
        <path d="M34 8.5c3 .5 5.5 3 6.3 6.5" strokeWidth={1.4} />
      </>
    ),
    ball: (
      <>
        <circle cx="24" cy="24" r="17" />
        <path d="M24 18L29.7 22.1L27.5 28.9H20.5L18.3 22.1Z" {...f} />
        <path
          d="M24 18V7M29.7 22.1L40.2 18.7M27.5 28.9L34 37.8M20.5 28.9L14 37.8M18.3 22.1L7.8 18.7"
          strokeWidth={1.6}
        />
      </>
    ),
    horseshoe: (
      <>
        <path d="M13 8v14a11 11 0 0 0 22 0V8" strokeWidth={5} />
        <path d="M9.5 8h7M31.5 8h7" strokeWidth={2.4} />
        <path d={sparkle(24, 10, 3.5)} {...f} />
        <path d="M8 44h32" style={soft} />
      </>
    ),
    pyramids: (
      <>
        <path d="M3 41L19 14l16 27" fill={ink} fillOpacity={0.12} />
        <path d="M19 14l3.5 27" style={soft} />
        <path d="M28 41l9-14 9 14" />
        <path d="M2 41h44" />
        <circle cx="38" cy="10" r="4" fill={ink} fillOpacity={0.25} />
      </>
    ),
    palette: (
      <>
        <path d="M24 6C13 6 5 14 5 23.5 5 33 12 40 21 40c3 0 4.5-1.6 4.5-3.8 0-2.6 1.8-4.2 4.6-4.2H34c5.5 0 9-3.6 9-9C43 13 35 6 24 6z" />
        <circle cx="14" cy="22" r="2.6" {...f} />
        <circle cx="19" cy="14" r="2.6" {...f} />
        <circle cx="28" cy="12.5" r="2.6" {...f} />
        <circle cx="36" cy="18.5" r="2.6" {...f} />
        <path d="M34 46l9-12" strokeWidth={3} />
      </>
    ),
    mask: (
      <>
        <path d="M10 9h28v13c0 10-6.3 17-14 17S10 32 10 22z" />
        <path d="M15.5 19.5c2-2 4.5-2 6.5 0M26 19.5c2-2 4.5-2 6.5 0" />
        <path d="M17 27c3.5 3.5 10.5 3.5 14 0" />
        <path d="M10 12L4.5 8.5M38 12l5.5-3.5" style={soft} />
      </>
    ),
    music: (
      <>
        <path d="M18 36V11l20-5v25" />
        <path d="M18 17l20-5" />
        <circle cx="13.5" cy="36" r="4.5" {...f} />
        <circle cx="33.5" cy="31" r="4.5" {...f} />
      </>
    ),
    book: (
      <>
        <path d="M24 13c-5-3.5-12-3.5-18-.5V39c6-3 13-3 18 .5 5-3.5 12-3.5 18-.5V12.5c-6-3-13-3-18 .5zM24 13v26.5" />
        <path
          d="M10 18c3-1 7-1 10 .5M10 24c3-1 7-1 10 .5M28 18.5c3-1.5 7-1.5 10-.5M28 24.5c3-1.5 7-1.5 10-.5"
          style={soft}
          strokeWidth={1.4}
        />
      </>
    ),
    lotus: (
      <>
        <path d="M24 10c5 6 5.5 16 0 26-5.5-10-5-20 0-26z" fill={ink} fillOpacity={0.15} />
        <path d="M24 36c-7-1.5-14-8-15-17 7 .5 12 5 14.5 11.5" />
        <path d="M24 36c7-1.5 14-8 15-17-7 .5-12 5-14.5 11.5" />
        <path d="M23 36C15 36.5 7.5 34 4 28.5c5.5-1.5 11 .5 15.5 4" />
        <path d="M25 36c8 .5 15.5-2 19-7.5-5.5-1.5-11 .5-15.5 4" />
        <path d="M12 42h24" style={soft} />
      </>
    ),
    wave: (
      <>
        <path d="M4 16c4.5-5 9-5 13.5 0S26.5 21 31 16s9-5 13.5 0" />
        <path d="M4 25c4.5-5 9-5 13.5 0S26.5 30 31 25s9-5 13.5 0" />
        <path d="M4 34c4.5-5 9-5 13.5 0S26.5 39 31 34s9-5 13.5 0" style={soft} />
      </>
    ),
    palm: (
      <>
        <path d="M25 44c-1-9 0-17 2-25" strokeWidth={3} />
        <path d="M27 19c-4-7-12-9-19-6M27 19c3-7 11-10 18-7M27 19c-7-2-14 1-17 8M27 19c7-2 14 1 16 8M27 19c-1-5-4-10-8-12" />
        <circle cx="24.5" cy="22.5" r="1.8" {...f} />
        <circle cx="29" cy="22.5" r="1.8" {...f} />
        <path d="M10 44h30" style={soft} />
      </>
    ),
    mountain: (
      <>
        <path d="M3 41l13-22 8 11 6-8 15 19z" fill={ink} fillOpacity={0.12} />
        <path d="M12 26l4-2 3 3" style={soft} />
        <circle cx="37" cy="10" r="4" fill={ink} fillOpacity={0.25} />
      </>
    ),
    landmark: (
      <>
        <path d="M8 43V21a16 16 0 0 1 32 0v22" />
        <path d="M16 43V23a8 8 0 0 1 16 0v20" fill={ink} fillOpacity={0.12} />
        <path d="M4 43h40" />
        <path d="M14 7v3M24 3v3M34 7v3" style={soft} />
      </>
    ),
    compass: (
      <>
        <circle cx="24" cy="24" r="17" />
        <path d="M24 11l5 13-5 13-5-13z" />
        <path d="M24 11l5 13h-10z" {...f} />
        <path d="M24 2v4M24 42v4M2 24h4M42 24h4" />
      </>
    ),
  };
  return (
    <g fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      {shapes[icon]}
    </g>
  );
}

/* ---------- the stamp ---------- */
export type StampProps = {
  identity: StampIdentity;
  title: string;
  place: string;
  category?: string;
  date?: string | null;
  size?: number | string;
  tilt?: number;
  /** inked = collected; ghost = not yet collected (outline only) */
  variant?: "inked" | "ghost";
  animate?: boolean;
  className?: string;
  label?: string;
  /** Print the stamp in a single custom ink (e.g. cream over photos). */
  inkColor?: string;
};

export function Stamp({
  identity,
  title,
  place,
  category,
  date,
  size = 160,
  tilt = 0,
  variant = "inked",
  animate,
  className,
  label,
  inkColor,
}: StampProps) {
  const raw = useId();
  const id = `s${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
  const ink = inkColor ?? STAMP_COLORS[identity.color].ink;
  const ghost = variant === "ghost";
  const top = stampTitle(title).toUpperCase();
  const bottom = place.toUpperCase();
  const fit = (len: number, arc: number, max: number) =>
    Math.max(7, Math.min(max, (arc / Math.max(len, 1) - 1.2) / 0.7));
  const topSize = fit(top.length, 207, 12.5);
  const bottomSize = fit(bottom.length, 230, 10.5);
  const shape = SHAPE_PATH[identity.shape];
  const seed = [...title].reduce((s, c) => s + c.charCodeAt(0), 0) % 97;
  const when = stampDate(date) || "ERA PASSPORT";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? `${ghost ? "Uncollected" : ""} stamp: ${title}, ${place}`.trim()}
      className={cn("era-stamp shrink-0 select-none", animate && "stamp-in", className)}
      style={
        {
          "--tilt": `${tilt}deg`,
          transform: animate ? undefined : `rotate(${tilt}deg)`,
          opacity: ghost ? 0.42 : 1,
        } as CSSProperties
      }
    >
      <defs>
        <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed={seed}
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4.6 0 0 0 4"
            result="wear"
          />
          <feComposite in="SourceGraphic" in2="wear" operator="in" result="worn" />
          <feTurbulence
            type="turbulence"
            baseFrequency="0.04"
            numOctaves="1"
            seed={seed + 3}
            result="warp"
          />
          <feDisplacementMap
            in="worn"
            in2="warp"
            scale="2.2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <path id={`${id}-top`} d="M34 100A66 66 0 0 1 166 100" />
        <path id={`${id}-bot`} d="M24 100A76 76 0 0 0 176 100" />
      </defs>
      <g filter={ghost ? undefined : `url(#${id}-ink)`}>
        <path
          d={shape}
          fill={ink}
          fillOpacity={ghost ? 0 : 0.07}
          stroke={ink}
          strokeWidth={ghost ? 2 : 4}
          strokeDasharray={ghost ? "6 5" : undefined}
          strokeLinejoin="round"
        />
        {ROUND_INNER.has(identity.shape) ? (
          <circle cx="100" cy="100" r="82" fill="none" stroke={ink} strokeWidth="1.4" />
        ) : (
          <path
            d={shape}
            transform={`translate(100 100) scale(${identity.shape === "shield" ? 0.93 : 0.91}) translate(-100 -100)`}
            fill="none"
            stroke={ink}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}
        <circle cx="100" cy="100" r="60" fill="none" stroke={ink} strokeWidth="1.4" />
        <g fill={ink} fontFamily="Jost, system-ui, sans-serif" fontWeight={500}>
          <text fontSize={topSize} letterSpacing="1.2">
            <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
              {top}
            </textPath>
          </text>
          <text fontSize={bottomSize} letterSpacing="1.6">
            <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">
              {bottom}
            </textPath>
          </text>
          <text x="100" y="54" fontSize="8" letterSpacing="3" textAnchor="middle">
            ✦ ERA ✦
          </text>
          {category && (
            <text
              x="100"
              y="146.5"
              fontSize={category.length > 10 ? 6.2 : 7}
              letterSpacing="2.2"
              textAnchor="middle"
            >
              {category.toUpperCase()}
            </text>
          )}
        </g>
        <g transform="translate(74.8 61) scale(1.05)">
          <Emblem icon={identity.icon} ink={ink} />
        </g>
        <path d="M50 116H150L144 125L150 134H50L56 125Z" fill={ink} />
        <text
          x="100"
          y="128.2"
          fontSize="8.6"
          letterSpacing="1.6"
          textAnchor="middle"
          fill={inkColor ? "#3b2750" : PAPER}
          fontFamily="Jost, system-ui, sans-serif"
          fontWeight={500}
        >
          {when}
        </text>
      </g>
    </svg>
  );
}

/** Stamp for a given activity, using its saved identity (or its signature/auto identity). */
export type StampActivity = Pick<
  Activity,
  "name" | "type" | "destination" | "image" | "stampShape" | "stampColor" | "stampIcon"
> & { date?: string };

export function ActivityStamp({
  a,
  date,
  ...rest
}: { a: StampActivity; date?: string | null } & Omit<
  StampProps,
  "identity" | "title" | "place" | "category" | "date"
>) {
  return (
    <Stamp
      identity={stampIdentity(a)}
      title={a.name}
      place={stampPlace(a.destination)}
      category={a.type}
      date={date ?? a.date}
      {...rest}
    />
  );
}

export function ActivitySeal({
  a,
  ...rest
}: {
  a: StampActivity;
  size?: number;
  className?: string;
  muted?: boolean;
}) {
  return <StampSeal identity={stampIdentity(a)} {...rest} />;
}

/** Tiny emblem-only seal (for lists and tables). */
export function StampSeal({
  identity,
  size = 40,
  className,
  muted,
}: {
  identity: StampIdentity;
  size?: number;
  className?: string;
  muted?: boolean;
}) {
  const ink = STAMP_COLORS[identity.color].ink;
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0", className)}
      style={{ opacity: muted ? 0.4 : 1 }}
    >
      <path
        d={SHAPE_PATH[identity.shape]}
        fill={ink}
        fillOpacity={0.08}
        stroke={ink}
        strokeWidth={9}
        strokeLinejoin="round"
        strokeDasharray={muted ? "14 10" : undefined}
      />
      <g transform="translate(46 46) scale(2.25)">
        <Emblem icon={identity.icon} ink={ink} />
      </g>
    </svg>
  );
}
