import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { applyThemeMode, getTheme } from "../theme";

const STORAGE_KEY = "trade-journal-theme";

const ThemeContext = createContext({
  themeMode: "light",
  theme: getTheme("light"),
  setThemeMode: () => {},
  toggleThemeMode: () => {},
});

function getStoredThemeMode() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(getStoredThemeMode);

  useEffect(() => {
    applyThemeMode(themeMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, themeMode);
    }
  }, [themeMode]);

  const value = useMemo(() => {
    const setThemeMode = (nextMode) => {
      setThemeModeState(nextMode === "dark" ? "dark" : "light");
    };

    return {
      themeMode,
      theme: getTheme(themeMode),
      setThemeMode,
      toggleThemeMode: () => {
        setThemeModeState((prev) => (prev === "dark" ? "light" : "dark"));
      },
    };
  }, [themeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
