import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Field } from "./AppShell";
import { Stamp, StampSeal } from "./Stamp";
import { CoverUpload } from "./CoverUpload";
import type { ActivityInput } from "@/lib/era/store";
import {
  autoIdentity,
  isStampColor,
  isStampIcon,
  isStampShape,
  SHAPE_LABELS,
  STAMP_COLOR_KEYS,
  STAMP_COLORS,
  STAMP_ICON_KEYS,
  STAMP_ICONS,
  STAMP_SHAPES,
  stampPlace,
  type StampIdentity,
} from "@/lib/era/stamps";
import { cn } from "@/lib/utils";

export const emptyActivity: ActivityInput = {
  name: "",
  type: "" as never,
  description: "",
  destination: "",
  location: "",
  date: "",
  time: "",
  availableCapacity: "",
  image: "",
  stampShape: "",
  stampColor: "",
  stampIcon: "",
};

export function ActivityForm({
  initial,
  submitLabel,
  onSubmit,
  hint,
}: {
  initial: ActivityInput;
  submitLabel: string;
  hint?: string;
  onSubmit: (
    v: ActivityInput,
  ) => Promise<Record<string, string> | null> | Record<string, string> | null;
}) {
  const [f, setF] = useState<ActivityInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const auto = autoIdentity({
    name: f.name || "New Experience",
    type: f.type || "Entertainment",
    image: f.image || null,
  });
  const identity: StampIdentity = {
    shape: isStampShape(f.stampShape) ? f.stampShape : auto.shape,
    color: isStampColor(f.stampColor) ? f.stampColor : auto.color,
    icon: isStampIcon(f.stampIcon) ? f.stampIcon : auto.icon,
  };
  const set = (patch: Partial<ActivityInput>) => setF((prev) => ({ ...prev, ...patch }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Freeze the identity that the provider sees in the preview.
      const errs = await onSubmit({
        ...f,
        stampShape: identity.shape,
        stampColor: identity.color,
        stampIcon: identity.icon,
      });
      if (errs) {
        setErrors(errs);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setErrors({ form: "Cannot save activity right now." });
    } finally {
      setBusy(false);
    }
  };
  const bind = (k: keyof ActivityInput) => ({
    id: k,
    className: "field",
    value: String(f[k]),
    "aria-invalid": !!errors[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      set({ [k]: e.target.value } as Partial<ActivityInput>),
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <section className="panel space-y-5 p-8">
          <p className="eyebrow">1 · The experience</p>
          {errors.form && (
            <p className="notice notice-error" role="alert">
              {errors.form}
            </p>
          )}
          <Field label="Activity Name" id="name" error={errors.name}>
            <input {...bind("name")} />
          </Field>
          <Field label="Activity Type" id="type" error={errors.type}>
            <select {...bind("type")}>
              <option value="">Select a type</option>
              <option>Sport</option>
              <option>Wellness</option>
              <option>Entertainment</option>
            </select>
          </Field>
          <Field label="Description" id="description" error={errors.description}>
            <textarea rows={4} {...bind("description")} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Destination" id="destination" error={errors.destination}>
              <input placeholder="City, Country" {...bind("destination")} />
            </Field>
            <Field label="Location" id="location" error={errors.location}>
              <input {...bind("location")} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Date" id="date" error={errors.date}>
              <input type="date" {...bind("date")} />
            </Field>
            <Field label="Time" id="time" error={errors.time}>
              <input type="time" {...bind("time")} />
            </Field>
            <Field
              label="Available Capacity"
              id="availableCapacity"
              error={errors.availableCapacity}
            >
              <input
                type="number"
                min={submitLabel === "Save Activity" ? 1 : 0}
                step={1}
                {...bind("availableCapacity")}
              />
            </Field>
          </div>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </section>

        <section className="panel space-y-5 p-8">
          <p className="eyebrow">2 · Cover image</p>
          <CoverUpload value={f.image} onChange={(image) => set({ image })} error={errors.image} />
        </section>

        <section className="panel space-y-6 p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="eyebrow">3 · Stamp identity</p>
            <button
              type="button"
              className="link-quiet text-xs"
              onClick={() => set({ stampShape: "", stampColor: "", stampIcon: "" })}
            >
              Reset to suggested
            </button>
          </div>
          <p className="-mt-3 text-sm text-muted-foreground">
            Every ERA experience has its own passport stamp. Customers collect it when you confirm
            they completed the activity.
          </p>

          <div>
            <p className="field-label">Emblem</p>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
              {STAMP_ICON_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  title={STAMP_ICONS[k]}
                  aria-label={STAMP_ICONS[k]}
                  aria-pressed={identity.icon === k}
                  onClick={() => set({ stampIcon: k })}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded border bg-card transition",
                    identity.icon === k
                      ? "border-primary ring-2 ring-lavender/50"
                      : "hover:border-lavender",
                  )}
                >
                  <StampSeal identity={{ ...identity, icon: k }} size={38} />
                </button>
              ))}
            </div>
            {errors.stampIcon && <p className="field-error">{errors.stampIcon}</p>}
          </div>

          <div>
            <p className="field-label">Ink colour</p>
            <div className="flex flex-wrap gap-2">
              {STAMP_COLOR_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  title={STAMP_COLORS[k].label}
                  aria-label={STAMP_COLORS[k].label}
                  aria-pressed={identity.color === k}
                  onClick={() => set({ stampColor: k })}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition",
                    identity.color === k
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ background: STAMP_COLORS[k].ink }}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {STAMP_COLORS[identity.color].label}
            </p>
          </div>

          <div>
            <p className="field-label">Shape</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {STAMP_SHAPES.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={identity.shape === k}
                  onClick={() => set({ stampShape: k })}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded border bg-card p-2 text-[0.65rem] uppercase tracking-wider transition",
                    identity.shape === k
                      ? "border-primary ring-2 ring-lavender/50"
                      : "hover:border-lavender",
                  )}
                >
                  <StampSeal identity={{ ...identity, shape: k }} size={40} />
                  {SHAPE_LABELS[k]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link to="/provider" className="btn btn-outline">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="passport-page panel flex flex-col items-center p-8 text-center">
          <p className="eyebrow mb-4">Live stamp preview</p>
          <Stamp
            identity={identity}
            title={f.name || "Your Experience"}
            place={stampPlace(f.destination) || "Destination"}
            category={f.type || "Experience"}
            date={f.date}
            size={230}
            tilt={-5}
          />
          <p className="mt-5 font-display text-xl text-primary">{f.name || "Your Experience"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {STAMP_ICONS[identity.icon]} · {STAMP_COLORS[identity.color].label} ·{" "}
            {SHAPE_LABELS[identity.shape]}
          </p>
        </div>
      </aside>
    </form>
  );
}
