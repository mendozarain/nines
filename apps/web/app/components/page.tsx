import type { ReactNode } from "react";
import { Link } from "react-router";
import { describeOverShort, formatCentavos } from "@nines/shared";
import { EmptyState } from "~/components/empty-state";
import { cn } from "~/lib/utils";

export { EmptyState };

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-1">
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Money({ value, className }: { value: string; className?: string }) {
  return <span className={cn("font-money tabular-nums", className)}>{formatCentavos(value)}</span>;
}

export function OverShort({ value, className }: { value: string; className?: string }) {
  const described = describeOverShort(value);
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        described.tone === "short" && "text-destructive",
        described.tone === "over" && "text-success",
        described.tone === "even" && "text-muted-foreground",
        className,
      )}
    >
      {described.label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  testId,
  delta,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  testId?: string;
  delta?: string;
  tone?: "default" | "warn" | "good";
}) {
  const body = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-xl font-semibold tracking-tight font-money",
          tone === "warn" && "text-destructive",
          tone === "good" && "text-success",
        )}
        data-testid={testId}
      >
        {value}
      </p>
      {delta ? <p className="mt-1 text-xs text-muted-foreground">{delta}</p> : null}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );
  const className =
    "rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/15";
  if (href) {
    return (
      <Link to={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            {title ? <h2 className="text-sm font-semibold tracking-tight">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full min-w-[480px] text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={cn(
        "border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = "left", className }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <td className={cn("border-b border-border px-3 py-2.5", align === "right" && "text-right font-money", className)}>
      {children}
    </td>
  );
}
