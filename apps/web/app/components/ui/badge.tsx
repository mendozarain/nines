import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-neutral-bg text-neutral-fg",
      outline: "border border-border text-foreground",
      destructive: "bg-warning-bg text-warning-fg",
      success: "bg-success-bg text-success-fg",
      warning: "bg-warning-bg text-warning-fg",
      neutral: "bg-neutral-bg text-neutral-fg",
      /** LYNK-style in-progress / open order */
      open: "bg-open-bg text-open-fg",
      /** Pre-flight / routed / informational success */
      info: "bg-info-bg text-info-fg",
    },
  },
  defaultVariants: { variant: "secondary" },
});
function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
