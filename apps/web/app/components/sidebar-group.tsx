import type { LucideIcon } from "lucide-react";
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
  links,
  onNavigate,
}: {
  label?: string;
  icon?: LucideIcon;
  links: SidebarLink[];
  defaultOpen?: boolean;
  onNavigate?: () => void;
}) {
  if (links.length === 0) return null;

  return (
    <div className="grid gap-0.5">
      {label ? <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/80">{label}</p> : null}
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <NavLink
            key={`${link.to}-${link.label}`}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                isActive
                  ? "bg-surface-hover text-foreground"
                  : "text-sidebar-foreground hover:bg-surface-hover/70 hover:text-foreground",
              )
            }
          >
            {LinkIcon ? <LinkIcon className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.75} /> : <span className="w-4 shrink-0" />}
            <span className="truncate">{link.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
