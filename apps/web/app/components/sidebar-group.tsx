import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router";
import { cn } from "~/lib/utils";

export type SidebarLink = {
  to: string;
  label: string;
  end?: boolean;
  icon?: LucideIcon;
};

export function SidebarGroup({
  label,
  icon: Icon,
  links,
  defaultOpen = true,
  onNavigate,
}: {
  label: string;
  icon?: LucideIcon;
  links: SidebarLink[];
  defaultOpen?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (links.length === 0) return null;

  return (
    <div className="grid gap-0.5">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
        <span className="flex-1 truncate">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open ? "rotate-0" : "-rotate-90")} />
      </button>
      {open ? (
        <div className="grid gap-0.5 pl-1">
          {links.map((link) => {
            const LinkIcon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
                    isActive
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-accent/60 hover:text-foreground",
                  )
                }
              >
                {LinkIcon ? <LinkIcon className="h-4 w-4 shrink-0 opacity-70" /> : null}
                <span className="truncate">{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
