import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import { cn } from "~/lib/utils";

export type TopNavLink = {
  to: string;
  label: string;
  description?: string;
  end?: boolean;
};

export type TopNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  end?: boolean;
  match?: (pathname: string) => boolean;
  children?: TopNavLink[];
};

function pathActive(pathname: string, item: TopNavItem) {
  if (item.match) return item.match(pathname);
  if (item.to) {
    if (item.end) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  }
  return (item.children ?? []).some((child) => pathname === child.to || pathname.startsWith(`${child.to}/`));
}

function NavDropdown({
  item,
  active,
}: {
  item: TopNavItem;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const Icon = item.icon;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
          active || open
            ? "bg-secondary font-medium text-foreground"
            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon className="h-4 w-4 opacity-70" />
        <span>{item.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-50 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[220px] rounded-lg border border-border bg-popover p-1.5 shadow-lg"
        >
          {(item.children ?? []).map((child) => (
            <Link
              key={`${child.to}-${child.label}`}
              to={child.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 hover:bg-secondary"
            >
              <p className="text-sm font-medium text-foreground">{child.label}</p>
              {child.description ? <p className="text-xs text-muted-foreground">{child.description}</p> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TopNav({ items, className }: { items: TopNavItem[]; className?: string }) {
  const { pathname } = useLocation();

  return (
    <nav className={cn("flex items-center gap-0.5", className)} aria-label="Main">
      {items.map((item) => {
        const active = pathActive(pathname, item);
        const Icon = item.icon;
        if (item.children && item.children.length > 0) {
          return <NavDropdown key={item.id} item={item} active={active} />;
        }
        return (
          <NavLink
            key={item.id}
            to={item.to ?? "/"}
            end={item.end}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
              active
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 opacity-70" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function MobileNavList({
  items,
  onNavigate,
}: {
  items: TopNavItem[];
  onNavigate?: () => void;
}) {
  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        if (item.children && item.children.length > 0) {
          return (
            <div key={item.id} className="grid gap-1">
              <p className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </p>
              <div className="grid gap-0.5">
                {item.children.map((child) => (
                  <Link
                    key={`${child.to}-${child.label}`}
                    to={child.to}
                    onClick={onNavigate}
                    className="rounded-md px-3 py-2 text-sm hover:bg-secondary"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        }
        return (
          <NavLink
            key={item.id}
            to={item.to ?? "/"}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                isActive ? "bg-secondary font-medium" : "hover:bg-secondary/70",
              )
            }
          >
            <Icon className="h-4 w-4 opacity-70" />
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );
}
