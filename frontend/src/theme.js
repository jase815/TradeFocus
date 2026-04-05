const lightTheme = {
  mode: "light",
  colors: {
    bg: "#eef4ff",
    bgGradientTop: "#f8fbff",
    bgGradientBottom: "#e8f0ff",
    surface: "rgba(255,255,255,0.82)",
    surfaceAlt: "#f8fbff",
    card: "#ffffff",
    cardMuted: "#f8fbff",
    cardBorder: "#dbe7ff",
    text: "#0f172a",
    textSoft: "#64748b",
    textMuted: "#94a3b8",
    nav: "#0f172a",
    navAccent: "#2563eb",
    navText: "#ffffff",
    navMuted: "#cbd5e1",
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    primarySoft: "#eaf2ff",
    primaryBorder: "#c7dcff",
    success: "#16a34a",
    successBg: "#dcfce7",
    successBorder: "#86efac",
    danger: "#dc2626",
    dangerBg: "#fee2e2",
    dangerBorder: "#fca5a5",
    warning: "#f59e0b",
    warningBg: "#fef3c7",
    warningBorder: "#fcd34d",
    inputBg: "#ffffff",
    inputBorder: "#cbd5e1",
    inputRange: "#2563eb",
    chip: "#dbeafe",
    chipText: "#1d4ed8",
    overlay: "rgba(15, 23, 42, 0.32)",
  },
  radius: {
    xl: "24px",
    lg: "18px",
    md: "14px",
    pill: "999px",
  },
  shadow: {
    card: "0 18px 40px rgba(37, 99, 235, 0.10)",
    soft: "0 10px 25px rgba(15, 23, 42, 0.06)",
    nav: "0 12px 30px rgba(15, 23, 42, 0.20)",
    glow: "0 18px 38px rgba(37, 99, 235, 0.18)",
  },
};

const darkTheme = {
  mode: "dark",
  colors: {
    bg: "#07111f",
    bgGradientTop: "#0b1728",
    bgGradientBottom: "#06101d",
    surface: "rgba(7,17,31,0.84)",
    surfaceAlt: "#0d1a2c",
    card: "#101d31",
    cardMuted: "#12233a",
    cardBorder: "#223655",
    text: "#e5eefc",
    textSoft: "#9bb0cf",
    textMuted: "#7d90ae",
    nav: "#07111f",
    navAccent: "#60a5fa",
    navText: "#f8fbff",
    navMuted: "#9bb0cf",
    primary: "#60a5fa",
    primaryHover: "#3b82f6",
    primarySoft: "#10223d",
    primaryBorder: "#284773",
    success: "#4ade80",
    successBg: "#102a20",
    successBorder: "#1f6b43",
    danger: "#f87171",
    dangerBg: "#32141a",
    dangerBorder: "#7f2837",
    warning: "#fbbf24",
    warningBg: "#33270f",
    warningBorder: "#7d5a15",
    inputBg: "#0b1728",
    inputBorder: "#29415f",
    inputRange: "#60a5fa",
    chip: "#10223d",
    chipText: "#93c5fd",
    overlay: "rgba(1, 7, 18, 0.62)",
  },
  radius: {
    xl: "24px",
    lg: "18px",
    md: "14px",
    pill: "999px",
  },
  shadow: {
    card: "0 22px 42px rgba(2, 10, 24, 0.42)",
    soft: "0 12px 28px rgba(2, 10, 24, 0.28)",
    nav: "0 18px 38px rgba(1, 7, 18, 0.45)",
    glow: "0 20px 44px rgba(96, 165, 250, 0.18)",
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};

export function getTheme(mode = "dark") {
  return themes[mode] || darkTheme;
}

export function applyThemeMode(mode = "dark") {
  if (typeof document === "undefined") return;

  const theme = getTheme(mode);
  const root = document.documentElement;

  root.setAttribute("data-theme", theme.mode);
  root.style.setProperty("--app-bg", theme.colors.bg);
  root.style.setProperty("--app-bg-gradient-top", theme.colors.bgGradientTop);
  root.style.setProperty("--app-bg-gradient-bottom", theme.colors.bgGradientBottom);
  root.style.setProperty("--app-surface", theme.colors.surface);
  root.style.setProperty("--app-surface-alt", theme.colors.surfaceAlt);
  root.style.setProperty("--app-card", theme.colors.card);
  root.style.setProperty("--app-card-muted", theme.colors.cardMuted);
  root.style.setProperty("--app-card-border", theme.colors.cardBorder);
  root.style.setProperty("--app-text", theme.colors.text);
  root.style.setProperty("--app-text-soft", theme.colors.textSoft);
  root.style.setProperty("--app-text-muted", theme.colors.textMuted);
  root.style.setProperty("--app-nav", theme.colors.nav);
  root.style.setProperty("--app-nav-accent", theme.colors.navAccent);
  root.style.setProperty("--app-nav-text", theme.colors.navText);
  root.style.setProperty("--app-nav-muted", theme.colors.navMuted);
  root.style.setProperty("--app-primary", theme.colors.primary);
  root.style.setProperty("--app-primary-hover", theme.colors.primaryHover);
  root.style.setProperty("--app-primary-soft", theme.colors.primarySoft);
  root.style.setProperty("--app-primary-border", theme.colors.primaryBorder);
  root.style.setProperty("--app-success", theme.colors.success);
  root.style.setProperty("--app-success-bg", theme.colors.successBg);
  root.style.setProperty("--app-success-border", theme.colors.successBorder);
  root.style.setProperty("--app-danger", theme.colors.danger);
  root.style.setProperty("--app-danger-bg", theme.colors.dangerBg);
  root.style.setProperty("--app-danger-border", theme.colors.dangerBorder);
  root.style.setProperty("--app-warning", theme.colors.warning);
  root.style.setProperty("--app-warning-bg", theme.colors.warningBg);
  root.style.setProperty("--app-warning-border", theme.colors.warningBorder);
  root.style.setProperty("--app-input-bg", theme.colors.inputBg);
  root.style.setProperty("--app-input-border", theme.colors.inputBorder);
  root.style.setProperty("--app-input-range", theme.colors.inputRange);
  root.style.setProperty("--app-chip", theme.colors.chip);
  root.style.setProperty("--app-chip-text", theme.colors.chipText);
  root.style.setProperty("--app-overlay", theme.colors.overlay);
  root.style.setProperty("--app-shadow-card", theme.shadow.card);
  root.style.setProperty("--app-shadow-soft", theme.shadow.soft);
  root.style.setProperty("--app-shadow-nav", theme.shadow.nav);
  root.style.setProperty("--app-shadow-glow", theme.shadow.glow);
  root.style.setProperty("--app-radius-xl", theme.radius.xl);
  root.style.setProperty("--app-radius-lg", theme.radius.lg);
  root.style.setProperty("--app-radius-md", theme.radius.md);
  root.style.setProperty("--app-radius-pill", theme.radius.pill);
  root.style.setProperty("color-scheme", theme.mode);
}

export default darkTheme;
