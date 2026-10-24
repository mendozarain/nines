import type { ReactNode } from "react";
import { Link } from "react-router";
import { describeOverShort, formatCentavos } from "@nines/shared";
import { cn } from "~/lib/utils";

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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
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
        described.tone === "over" && "text-green-700",
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
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums" data-testid={testId}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </>
  );
  const className = "rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40";
  if (href) {
    return (
      <Link to={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}
