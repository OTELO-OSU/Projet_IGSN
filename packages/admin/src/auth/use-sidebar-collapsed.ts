import { useState } from "react";

const STORAGE_KEY = "sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const toggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ponytail: storage blocked (private mode), the state then lasts the session
    }
  };

  return [isCollapsed, toggle];
}
