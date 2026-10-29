import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { applyTheme, getStoredTheme, resolveDark, toggleTheme, type ThemePreference } from "~/lib/theme";

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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      onClick={() => {
        const next: ThemePreference = toggleTheme();
        setDark(resolveDark(next));
      }}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
