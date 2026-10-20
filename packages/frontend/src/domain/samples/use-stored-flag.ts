import { useEffect, useState } from "react";

export function useStoredFlag(key: string): [boolean, (isOn: boolean) => void] {
  const [isOn, setIsOn] = useState(false);

  useEffect(() => {
    setIsOn(localStorage.getItem(key) === "true");
  }, [key]);

  return [
    isOn,
    (next) => {
      setIsOn(next);
      localStorage.setItem(key, String(next));
    },
  ];
}
