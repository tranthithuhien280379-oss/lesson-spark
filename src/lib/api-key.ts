import { useEffect, useState } from "react";

const STORAGE_KEY = "lumi:apiKey:v1";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setApiKeyState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  function setApiKey(key: string) {
    const trimmed = key.trim();
    setApiKeyState(trimmed);
    try {
      if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return { apiKey, setApiKey };
}
