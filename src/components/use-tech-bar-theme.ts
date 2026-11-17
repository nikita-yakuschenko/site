"use client";

import { useSyncExternalStore } from "react";

/* Временная тема только технической полосы. Хранится у посетителя, на
   сервер не уходит. Снять вместе с кнопкой в meta-ряду. */
const TECH_BAR_THEME_KEY = "avgst:tech-bar-theme";
type TechBarTheme = "dark" | "light";

const techBarThemeListeners = new Set<() => void>();

function subscribeTechBarTheme(listener: () => void) {
  techBarThemeListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    techBarThemeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readTechBarTheme(): TechBarTheme {
  try {
    // Явно тёмная — иначе светлая (дефолт для сверки с маркетологом).
    return window.localStorage.getItem(TECH_BAR_THEME_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function writeTechBarTheme(theme: TechBarTheme) {
  try {
    window.localStorage.setItem(TECH_BAR_THEME_KEY, theme);
  } catch {
    // Не сохранилось — тема живёт до перезагрузки.
  }
  techBarThemeListeners.forEach((listener) => listener());
}

export function useTechBarTheme() {
  const theme = useSyncExternalStore(subscribeTechBarTheme, readTechBarTheme, () => "light" as TechBarTheme);
  return { theme, toggle: () => writeTechBarTheme(theme === "light" ? "dark" : "light") };
}
