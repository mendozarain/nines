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
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="grid gap-1">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.04em] text-foreground">{title}</h1>
        {description ? <p className="max-w-2xl text-[14px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Money({ value, className }: { value: string; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatCentavos(value)}</span>;
}

export function OverShort({ value, className }: { value: string; className?: string }) {
  const described = describeOverShort(value);
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        described.tone === "short" && "text-destructive",
        described.tone === "over" && "text-success-fg",
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
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  testId?: string;
}) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-[26px] font-bold tracking-[-0.04em] tabular-nums" data-testid={testId}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link to={href} className="nines-metric block rounded-2xl border border-border/80 bg-card p-5 hover:bg-surface-hover/50">
        {body}
      </Link>
    );
  }
  return <div className="rounded-2xl border border-border/80 bg-card p-5">{body}</div>;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-[14px] text-muted-foreground" role="status">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50" />
      {label}
    </div>
  );
}

export function EntityCell({
  name,
  subtitle,
}: {
  name: string;
  subtitle?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[14px] font-semibold text-foreground">{name}</p>
      {subtitle ? <p className="truncate text-[12px] text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
