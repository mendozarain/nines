import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "~/lib/utils";

// Status colors only ever report; they never ask for action.
const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border border-input text-subtle-foreground",
        info: "bg-info-tint text-link",
        success: "bg-success-tint text-success-foreground",
        warning: "bg-warning-tint text-warning",
        destructive: "bg-destructive-tint text-destructive-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
