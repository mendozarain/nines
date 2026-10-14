import type * as React from "react";
import { cn } from "~/lib/utils";

// A native <select>: on phones it opens the OS picker, which is easier with a thumb.
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-muted px-3 text-[15px] text-foreground outline-none sm:h-9 sm:text-sm",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
