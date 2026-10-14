import type * as React from "react";
import { cn } from "~/lib/utils";

function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        "rounded-md border border-destructive/40 bg-destructive-tint px-3 py-2 text-[13px] text-destructive-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Alert };
