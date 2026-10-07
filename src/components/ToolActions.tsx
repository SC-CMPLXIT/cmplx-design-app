import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatDate, todayIsoDate } from "@/lib/dates";
import { copyText } from "@/lib/clipboard";
import { Button } from "./ui";

export function ToolActions({ summary }: { summary: string }) {
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function onCopy() {
    const ok = await copyText(summary);
    setNotice({
      ok,
      text: ok ? "Summary copied." : "Could not copy from this browser.",
    });
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 4000);
  }

  return (
    <div className="flex max-w-full flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={() => window.print()}>
          Print
        </Button>
        <Button type="button" variant="ghost" onClick={() => void onCopy()}>
          {notice?.ok ? "Copied" : "Copy summary"}
        </Button>
      </div>
      {notice ? (
        <p
          role="status"
          className={notice.ok ? "text-sm text-emerald-800" : "text-sm text-rose-800"}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}

export function ToolPrint({
  name,
  tone,
  label,
  children,
}: {
  name: string;
  tone: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <article className="tool-print print-only">
      <header className="border-b border-black pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
          CMPLX iT Design · {name}
        </p>
        <h1 className="mt-2 font-serif text-4xl">{name}</h1>
        <p className="mt-2 text-sm leading-6">
          {tone.toUpperCase()} · {label} · Printed {formatDate(todayIsoDate())}
        </p>
      </header>
      <div className="mt-4 space-y-4">{children}</div>
    </article>
  );
}

export function ToolPrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em]">{title}</h2>
      <div className="mt-1 space-y-1 text-sm leading-6">{children}</div>
    </section>
  );
}
