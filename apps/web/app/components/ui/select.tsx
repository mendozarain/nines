import * as React from "react";
import { cn } from "~/lib/utils";

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-lg border border-border/70 bg-card px-3 text-[15px] outline-none transition-colors hover:border-border focus:border-ring/40 focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-[14px]",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
