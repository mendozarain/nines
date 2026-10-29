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
  label: string;
  icon?: LucideIcon;
  links: SidebarLink[];
  defaultOpen?: boolean;
  onNavigate?: () => void;
}) {
  if (links.length === 0) return null;

  return (
    <div className="grid gap-0.5">
      <p className="px-2.5 pb-1 pt-4 text-[11px] font-medium text-muted-foreground/75">{label}</p>
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
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                isActive
                  ? "bg-accent font-medium text-foreground"
                  : "text-sidebar-foreground hover:bg-surface-hover hover:text-foreground",
              )
            }
          >
            {LinkIcon ? <LinkIcon className="h-4 w-4 shrink-0 opacity-55" /> : <span className="w-4 shrink-0" />}
            <span className="truncate">{link.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
