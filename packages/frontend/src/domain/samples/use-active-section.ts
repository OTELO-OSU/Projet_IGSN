import { useEffect, useState } from "react";

const READING_BAND_BELOW_HEADER = "-140px 0px -60% 0px";

export function useActiveSection(ids: string[]): string | undefined {
  const [activeId, setActiveId] = useState(ids[0]);
  const key = ids.join(",");

  useEffect(() => {
    const sectionIds = key.split(",");
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }
        const first = sectionIds.find((id) => visible.has(id));
        if (first) {
          setActiveId(first);
        }
      },
      { rootMargin: READING_BAND_BELOW_HEADER },
    );
    for (const id of sectionIds) {
      const section = document.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    }
    return () => observer.disconnect();
  }, [key]);

  return activeId;
}
