import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] dark:bg-card"
    >
      {isDark ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
