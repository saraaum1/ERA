import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatDate, formatTime } from "@/lib/era/store";
import { optimisedImage } from "@/lib/era/media";
import { cn } from "@/lib/utils";

type Rec = {
  activityId: string;
  reason: string;
  name: string;
  type: string;
  city: string;
  date: string;
  time: string;
  seatsLeft: number;
  image: string | null;
  distanceKm: number | null;
};
type Msg = { role: "user" | "assistant"; content: string; recs?: Rec[] };

const SUGGESTIONS = [
  "أنا في الرياض وأحب التراث والقهوة",
  "أنا في جدة وأحب الرياضة والبحر",
  "I'm in Riyadh and love art and music",
  "أبي شي هادي وفيه طبيعة",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "هلا! أنا مرشد ERA ✦ قل لي وين مدينتك ووش تحب، وأرشح لك أنسب الفعاليات المتاحة.\nHi! Tell me your city and interests and I'll suggest the best available experiences.",
};

/** Floating "Ask ERA" assistant. Recommendations come from the server and are always real, available experiences. */
export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => {
    if (open) input.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  const send = async (content: string) => {
    const q = content.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setText("");
    setBusy(true);
    try {
      const history = next
        .filter((m) => m !== WELCOME)
        .map(({ role, content }) => ({ role, content }));
      const r = await fetch("/api/assistant", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const body = await r.json();
      setMessages((m) => [
        ...m,
        body.ok
          ? { role: "assistant", content: body.reply, recs: body.recommendations }
          : { role: "assistant", content: body.error || "Something went wrong. Please try again." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Connection problem — please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(text);
  };

  return (
    <div className="no-print">
      <button
        type="button"
        className={cn("guide-fab", open && "is-open")}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="era-guide"
      >
        <span aria-hidden="true">{open ? "✕" : "✦"}</span>
        <span className="guide-fab-label">{open ? "Close" : "Ask ERA"}</span>
      </button>

      {open && (
        <section id="era-guide" className="guide-panel" role="dialog" aria-label="ERA Guide">
          <header className="guide-head">
            <div>
              <p className="font-display text-xl leading-none text-primary">ERA Guide</p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-mauve">
                Recommends only real, available experiences
              </p>
            </div>
            <button
              type="button"
              className="guide-close"
              onClick={() => setOpen(false)}
              aria-label="Close guide"
            >
              ✕
            </button>
          </header>

          <div ref={list} className="guide-list" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={cn("guide-msg", m.role === "user" ? "is-user" : "is-bot")}>
                {m.content.split("\n").map((line, j) => (
                  <p key={j} dir="auto" className={j ? "mt-1.5" : undefined}>
                    {line}
                  </p>
                ))}
                {m.recs && m.recs.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {m.recs.map((r) => (
                      <li key={r.activityId}>
                        <Link
                          to="/activities/$activityId"
                          params={{ activityId: r.activityId }}
                          className="guide-rec"
                          onClick={() => setOpen(false)}
                        >
                          <span className="guide-rec-img">
                            {r.image ? (
                              <img
                                src={optimisedImage(r.image, "sm") ?? r.image}
                                alt=""
                                loading="lazy"
                              />
                            ) : (
                              <span>✦</span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-primary">
                              {r.name}
                            </span>
                            <span className="block text-[0.7rem] text-muted-foreground">
                              {r.city} · {formatDate(r.date)} · {formatTime(r.time)}
                              {r.distanceKm !== null && r.distanceKm > 5
                                ? ` · ~${r.distanceKm} km`
                                : ""}
                            </span>
                            <span
                              dir="auto"
                              className="mt-0.5 block text-[0.72rem] leading-snug text-foreground/80"
                            >
                              {r.reason}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {busy && (
              <div className="guide-msg is-bot">
                <span className="guide-typing" aria-label="Thinking">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    dir="auto"
                    className="guide-chip"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={submit} className="guide-form">
            <textarea
              ref={input}
              dir="auto"
              rows={1}
              value={text}
              maxLength={1000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(text);
                }
              }}
              placeholder="مدينتك واهتماماتك… / Your city & interests…"
              aria-label="Message the ERA Guide"
            />
            <button
              type="submit"
              className="guide-send"
              disabled={busy || !text.trim()}
              aria-label="Send"
            >
              ↑
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
