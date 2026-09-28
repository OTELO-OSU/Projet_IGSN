import { type RefObject, useEffect, useState } from "react";

export function useScrollEdges(ref: RefObject<HTMLElement | null>): {
  canScrollStart: boolean;
  canScrollEnd: boolean;
} {
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      setCanScrollStart(scrollLeft > 0);
      setCanScrollEnd(scrollLeft + clientWidth < scrollWidth - 1);
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref]);
  return { canScrollStart, canScrollEnd };
}
