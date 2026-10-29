import * as React from "react";
import { cn } from "~/lib/utils";

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-[10px] border border-border bg-card px-3 text-[14px] outline-none transition-colors hover:border-border focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
