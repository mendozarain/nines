import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  run: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.label} ${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function run(item: CommandItem) {
    onOpenChange(false);
    item.run();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="command-palette-root top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Jump to a page or run an action</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type a command…"
          className="rounded-none border-0 border-b px-4 py-6 text-base shadow-none focus-visible:ring-0"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && filtered[active]) {
              event.preventDefault();
              run(filtered[active]);
            }
          }}
        />
        <ul className="max-h-72 overflow-auto p-2" role="listbox">
          {filtered.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</li> : null}
          {filtered.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                  index === active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
                onMouseEnter={() => setActive(index)}
                onClick={() => run(item)}
              >
                <span>{item.label}</span>
                {item.hint ? <span className="text-xs text-muted-foreground">{item.hint}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}

export function useAppNavigateCommands(extra: CommandItem[] = []) {
  const navigate = useNavigate();
  return useMemo(
    () => [
      { id: "sale", label: "New sale", hint: "Sales", run: () => navigate("/sales/new") },
      { id: "expense", label: "New expense", hint: "Expenses", run: () => navigate("/expenses") },
      { id: "collection", label: "Record collection", hint: "Customers", run: () => navigate("/customers") },
      { id: "close-day", label: "Close the day", hint: "Cash", run: () => navigate("/cash") },
      { id: "customers", label: "Go to customers", run: () => navigate("/customers") },
      { id: "books", label: "Go to books", run: () => navigate("/books") },
      ...extra,
    ],
    [navigate, extra],
  );
}
