import * as React from "react";
import { cn } from "~/lib/utils";

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
