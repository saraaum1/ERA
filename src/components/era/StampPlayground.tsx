import { useEffect, useRef, useState } from "react";
import type { Activity } from "@/lib/era/store";
import { ActivityStamp } from "./Stamp";

type Placed = { id: number; a: Activity; x: number; y: number; tilt: number };

const OPENING = [
  { x: 26, y: 32, tilt: -9 },
  { x: 70, y: 40, tilt: 7 },
  { x: 36, y: 72, tilt: -3 },
];

/** A passport page the visitor can "stamp" by clicking. The first stamps press down when it scrolls into view. Nothing is saved. */
export function StampPlayground({ activities }: { activities: Activity[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [hint, setHint] = useState(false);

  const add = (a: Activity, x: number, y: number, tilt: number) => {
    seq.current += 1;
    const next: Placed = { id: seq.current, a, x, y, tilt };
    setPlaced((p) => [...p.slice(-11), next]);
  };

  // Press the opening stamps one by one when the page comes into view.
  useEffect(() => {
    const el = ref.current;
    if (!el || !activities.length) return;
    const timers: number[] = [];
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        OPENING.slice(0, activities.length).forEach((spot, i) => {
          timers.push(
            window.setTimeout(() => add(activities[i]!, spot.x, spot.y, spot.tilt), 250 + i * 450),
          );
        });
        timers.push(window.setTimeout(() => setHint(true), 250 + OPENING.length * 450));
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities.length]);

  const stamp = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !activities.length) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setHint(false);
    add(activities[seq.current % activities.length]!, x, y, Math.round(Math.random() * 30 - 15));
  };

  return (
    <div className="passport playground-book">
      <div
        ref={ref}
        onClick={stamp}
        className="passport-page relative aspect-[4/3] cursor-crosshair overflow-hidden rounded-lg"
        role="button"
        tabIndex={0}
        aria-label="Click to stamp this passport page"
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          const r = ref.current!.getBoundingClientRect();
          stamp({
            clientX: r.left + Math.random() * r.width,
            clientY: r.top + Math.random() * r.height,
          } as React.MouseEvent<HTMLDivElement>);
        }}
      >
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-sand to-transparent" />
        <p className="pointer-events-none absolute left-5 top-4 text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
          ERA · Visas & Experiences
        </p>
        <p className="pointer-events-none absolute bottom-4 right-5 font-mono text-[0.6rem] text-muted-foreground">
          P&lt;ERA&lt;&lt;HERITAGE&lt;&lt;&lt;&lt;
        </p>
        {placed.map((p) => (
          <div
            key={p.id}
            className="pointer-events-none absolute w-[26%] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <ActivityStamp a={p.a} size="100%" tilt={p.tilt} animate />
            <span className="ink-burst" />
          </div>
        ))}
        {hint && (
          <div className="pointer-events-none absolute bottom-10 right-5 flex justify-end">
            <span className="hint-pulse rounded-full bg-primary px-4 py-2 text-[0.62rem] uppercase tracking-[0.22em] text-primary-foreground shadow-lg">
              Click anywhere to stamp
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
