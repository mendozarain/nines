import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
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
  /** Hide as its own tab below this Tailwind breakpoint; links fold into More. */
  foldBelow?: "2xl";
};

/** Items that fold into More on mid-width desktops so the bar stays one row. */
const FOLD_IDS = new Set(["expenses", "books"]);

function pathActive(pathname: string, item: TopNavItem) {
  if (item.match) return item.match(pathname);
  if (item.to) {
    if (item.end) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  }
  return (item.children ?? []).some((child) => pathname === child.to || pathname.startsWith(`${child.to}/`));
}

function itemLinks(item: TopNavItem): TopNavLink[] {
  if (item.children && item.children.length > 0) return item.children;
  if (item.to) return [{ to: item.to, label: item.label, end: item.end }];
  return [];
}

function NavDropdown({
  item,
  active,
  compact,
}: {
  item: TopNavItem;
  active: boolean;
  compact?: boolean;
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
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        title={item.label}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md text-sm transition-colors",
          compact ? "px-2" : "px-2.5",
          active || open
            ? "bg-secondary font-medium text-foreground"
            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={item.label}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-70" />
        <span className={cn(compact ? "hidden min-[1200px]:inline" : undefined)}>{item.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-[min(70vh,420px)] min-w-[220px] overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-lg"
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

function NavItem({ item, compact }: { item: TopNavItem; compact?: boolean }) {
  const { pathname } = useLocation();
  const active = pathActive(pathname, item);
  const Icon = item.icon;

  if (item.children && item.children.length > 0) {
    return <NavDropdown item={item} active={active} compact={compact} />;
  }

  return (
    <NavLink
      to={item.to ?? "/"}
      end={item.end}
      title={item.label}
      aria-label={item.label}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md text-sm transition-colors",
        compact ? "px-2" : "px-2.5",
        active
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      <span className={cn(compact ? "hidden min-[1200px]:inline" : undefined)}>{item.label}</span>
    </NavLink>
  );
}

/**
 * Single-row top nav. On mid-width desktops, Expenses + Books fold into More
 * so the bar never wraps to two rows.
 */
export function TopNav({ items, className }: { items: TopNavItem[]; className?: string }) {
  const { pathname } = useLocation();

  const { pinned, foldable, moreBase } = useMemo(() => {
    const pinnedItems: TopNavItem[] = [];
    const foldableItems: TopNavItem[] = [];
    let more: TopNavItem | undefined;

    for (const item of items) {
      if (item.id === "more") {
        more = item;
        continue;
      }
      if (FOLD_IDS.has(item.id) || item.foldBelow === "2xl") {
        foldableItems.push(item);
      } else {
        pinnedItems.push(item);
      }
    }

    return { pinned: pinnedItems, foldable: foldableItems, moreBase: more };
  }, [items]);

  const wideMore: TopNavItem | null = moreBase
    ? {
        ...moreBase,
        icon: moreBase.icon ?? MoreHorizontal,
      }
    : null;

  const compactMore: TopNavItem | null = moreBase
    ? {
        id: "more-compact",
        label: "More",
        icon: moreBase.icon ?? MoreHorizontal,
        match: (path) =>
          Boolean(moreBase.match?.(path)) || foldable.some((item) => pathActive(path, item)),
        children: [
          ...foldable.flatMap((item) =>
            itemLinks(item).map((link) => ({
              ...link,
              description: link.description ?? item.label,
            })),
          ),
          ...(moreBase.children ?? []),
        ],
      }
    : foldable.length > 0
      ? {
          id: "more-compact",
          label: "More",
          icon: MoreHorizontal,
          match: (path) => foldable.some((item) => pathActive(path, item)),
          children: foldable.flatMap((item) => itemLinks(item)),
        }
      : null;

  // Highlight compact More when a folded destination is active
  const compactMoreActive = compactMore ? pathActive(pathname, compactMore) : false;
  const wideMoreActive = wideMore ? pathActive(pathname, wideMore) : false;

  return (
    <nav
      className={cn("flex min-w-0 flex-nowrap items-center gap-0.5 overflow-hidden", className)}
      aria-label="Main"
    >
      {pinned.map((item) => (
        <NavItem key={item.id} item={item} compact />
      ))}

      {/* Full Expenses / Books — wide screens only */}
      {foldable.map((item) => (
        <div key={item.id} className="hidden 2xl:contents">
          <NavItem item={item} compact />
        </div>
      ))}

      {/* Wide More (reports / tax / settings only) */}
      {wideMore ? (
        <div className="hidden 2xl:contents">
          <NavDropdown item={wideMore} active={wideMoreActive} compact />
        </div>
      ) : null}

      {/* Mid-width More absorbs Expenses + Books */}
      {compactMore ? (
        <div className="contents 2xl:hidden">
          <NavDropdown item={compactMore} active={compactMoreActive} compact />
        </div>
      ) : null}
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
