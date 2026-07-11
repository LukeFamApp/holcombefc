import { type ReactNode } from "react";

export function GlassCard({
  children,
  className = "",
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`${strong ? "glass-strong" : "glass"} rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/70 font-(family-name:--font-ui-mono) tracking-wide uppercase text-xs">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="rounded-lg bg-black/30 border border-white/10 px-3.5 py-2.5 text-white placeholder-white/30 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
      />
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/70 font-(family-name:--font-ui-mono) tracking-wide uppercase text-xs">
        {label}
      </span>
      <textarea
        name={name}
        required={required}
        placeholder={placeholder}
        rows={3}
        className="rounded-lg bg-black/30 border border-white/10 px-3.5 py-2.5 text-white placeholder-white/30 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  required = false,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/70 font-(family-name:--font-ui-mono) tracking-wide uppercase text-xs">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="rounded-lg bg-black/30 border border-white/10 px-3.5 py-2.5 text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0a0f0c]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Button({
  children,
  type = "submit",
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  type?: "submit" | "button";
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-5 py-2.5 font-semibold text-sm transition-all disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-accent text-black hover:bg-accent-dim hover:text-white shadow-[0_0_24px_rgba(41,209,122,0.25)]"
      : "border border-white/15 text-white hover:bg-white/10";
  return (
    <button type={type} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
      {message}
    </p>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-blue/15 text-blue-200 border-blue/40",
    active: "bg-accent/15 text-accent border-accent/30",
    withdrawn: "bg-red-500/15 text-red-300 border-red-500/30",
    paid: "bg-accent/15 text-accent border-accent/30",
    failed: "bg-red-500/15 text-red-300 border-red-500/30",
    not_required: "bg-white/10 text-white/50 border-white/15",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-(family-name:--font-ui-mono) uppercase tracking-wide ${
        styles[status] ?? "bg-white/10 text-white/60 border-white/15"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
