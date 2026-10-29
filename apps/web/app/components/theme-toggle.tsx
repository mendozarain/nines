import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, resolveDark, toggleTheme, type ThemePreference } from "~/lib/theme";
import { cn } from "~/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const preference = getStoredTheme();
    applyTheme(preference);
    setDark(resolveDark(preference));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") {
        applyTheme("system");
        setDark(resolveDark("system"));
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <div className={cn("inline-flex items-center rounded-full bg-muted p-1", className)}>
      <button
        type="button"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          !dark ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Light mode"
        onClick={() => {
          if (dark) {
            const next: ThemePreference = toggleTheme();
            setDark(resolveDark(next));
          }
        }}
      >
        <Sun className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          dark ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Dark mode"
        onClick={() => {
          if (!dark) {
            const next: ThemePreference = toggleTheme();
            setDark(resolveDark(next));
          }
        }}
      >
        <Moon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
