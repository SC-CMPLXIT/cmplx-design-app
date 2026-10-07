import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "paper";
}) {
  const styles = {
    primary: "bg-ink text-paper hover:bg-copper-deep",
    ghost: "border border-rule bg-transparent text-ink hover:bg-paper-2",
    danger: "border border-rose-300 text-rose-900 hover:bg-rose-50",
    paper: "bg-paper-2 text-ink hover:bg-rule",
  } as const;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export const fieldControlClass =
  "w-full rounded-sm border border-rule bg-white px-3 py-2 text-sm text-ink outline-none ring-copper/30 focus:border-copper focus:ring-2";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 no-print">{actions}</div> : null}
    </div>
  );
}

export function Banner({
  children,
  tone = "paper",
}: {
  children: ReactNode;
  tone?: "paper" | "warn" | "ok" | "danger";
}) {
  const tones = {
    paper: "border-rule bg-paper-2 text-ink-soft",
    warn: "border-amber-300 bg-amber-50 text-amber-950",
    ok: "border-emerald-300 bg-emerald-50 text-emerald-950",
    danger: "border-rose-300 bg-rose-50 text-rose-950",
  };
  return (
    <div className={cn("rounded-sm border px-3 py-2 text-sm", tones[tone])}>{children}</div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-dashed border-rule bg-white/50 px-6 py-12 text-center">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-rose-800">{children}</p>;
}
