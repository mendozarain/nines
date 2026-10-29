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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-1">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-foreground">{title}</h1>
        {description ? <p className="max-w-2xl text-[14px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action}
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
        described.tone === "over" && "text-emerald-700 dark:text-emerald-400",
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
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-[26px] font-semibold tracking-[-0.03em] tabular-nums" data-testid={testId}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link to={href} className="nines-metric">
        {body}
      </Link>
    );
  }
  return <div className="nines-metric">{body}</div>;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-[14px] text-muted-foreground" role="status">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50" />
      {label}
    </div>
  );
}
