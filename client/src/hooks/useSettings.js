import { useCallback, useState } from "react";

const STORAGE_KEY = "tradex_settings";

const DEFAULT_SETTINGS = {
  // Trading preferences
  defaultQuantity: 1,
  confirmBeforeSell: true,
  autoRefreshEnabled: true,
  defaultWatchlistView: "list", // "list" | "compact"

  // Appearance
  theme: "dark", // "dark" | "light" (light is future)
  compactLayout: false,
};

const readFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const writeToStorage = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable in some environments
  }
};

const useSettings = () => {
  const [settings, setSettings] = useState(readFromStorage);

  const updateSetting = useCallback((key, value) => {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      writeToStorage(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    writeToStorage(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSetting, resetSettings };
};

export { DEFAULT_SETTINGS, STORAGE_KEY };
export default useSettings;
