import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Watches the whole document: any element with class "reveal" (or "reveal-words")
 * gets "is-in" when it scrolls into view. Mounted once in the root layout.
 */
export function RevealObserver() {
  useEffect(() => {
    const show = (el: Element) => el.classList.add("is-in");
    if (reduced() || !("IntersectionObserver" in window)) {
      const all = () =>
        document.querySelectorAll(".reveal:not(.is-in), .reveal-words:not(.is-in)").forEach(show);
      all();
      const mo = new MutationObserver(all);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = () =>
      document
        .querySelectorAll(".reveal:not(.is-in), .reveal-words:not(.is-in)")
        .forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}

/** Splits text into words that slide up one after another. */
export function RevealWords({
  text,
  className,
  delay = 0,
  step = 70,
  italic = [],
}: {
  text: string;
  className?: string;
  delay?: number;
  step?: number;
  italic?: string[];
}) {
  return (
    <span className={cn("reveal-words", className)} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <Fragment key={i}>
          <span className="rw" aria-hidden="true">
            <span
              className={cn("rw-in", italic.includes(w) && "italic-accent")}
              style={{ "--d": `${delay + i * step}ms` } as CSSProperties}
            >
              {w}
            </span>
          </span>{" "}
        </Fragment>
      ))}
    </span>
  );
}

/** 3D tilt that follows the pointer. */
export function Tilt({
  children,
  className,
  max = 7,
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || reduced()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * max).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * max).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div
      ref={ref}
      style={style}
      className={cn("tilt", className)}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      {children}
    </div>
  );
}

/** Endless horizontal ticker. */
export function Marquee({
  items,
  reverse,
  className,
  speed = 45,
}: {
  items: string[];
  reverse?: boolean;
  className?: string;
  speed?: number;
}) {
  const row = (
    <div
      className="marquee-track"
      style={{ animationDuration: `${speed}s`, animationDirection: reverse ? "reverse" : "normal" }}
      aria-hidden="true"
    >
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-[0.6em]">
          {t}
          <span className="marquee-star">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={cn("marquee", className)} role="marquee" aria-label={items.join(", ")}>
      {row}
      {row}
    </div>
  );
}

/** Number that counts up when it becomes visible. */
export function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      setN(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return <span ref={ref}>{n}</span>;
}

/** True once the page has scrolled past `offset` pixels. */
export function useScrolled(offset = 40) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > offset);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [offset]);
  return scrolled;
}

/** Gentle scroll parallax: moves its content by `speed` × the element's distance from the viewport centre. */
export function Parallax({
  children,
  speed = -0.08,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.parentElement!.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [speed]);
  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
