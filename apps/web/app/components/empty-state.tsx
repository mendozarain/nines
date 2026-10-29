import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-card px-6 py-16 text-center", className)}>
      <h2 className="text-[17px] font-semibold tracking-[-0.025em]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
