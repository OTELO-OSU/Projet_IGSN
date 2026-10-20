import type { ReactNode } from "react";

import { useEffect, useRef, useState } from "react";

import { FacetsPaneToggle } from "#/domain/samples/facets-pane-toggle.tsx";

const fade = (isShown: boolean, isAnimated: boolean): string => {
  const state = isShown ? "opacity-100" : "invisible opacity-0";
  if (!isAnimated) return state;
  return `${state} duration-300 motion-reduce:transition-none ${isShown ? "transition-opacity" : "transition-[opacity,visibility]"}`;
};

export function FacetsPane({
  isCollapsed,
  count,
  onCollapsedChange,
  facets,
  children,
}: {
  isCollapsed: boolean;
  count: number;
  onCollapsedChange: (isCollapsed: boolean) => void;
  facets: (header: ReactNode) => ReactNode;
  children: ReactNode;
}) {
  const [isAnimated, setIsAnimated] = useState(false);
  const showRef = useRef<HTMLButtonElement>(null);
  const hideRef = useRef<HTMLButtonElement>(null);
  const toggle = (next: boolean) => {
    setIsAnimated(true);
    onCollapsedChange(next);
  };

  useEffect(() => {
    if (isAnimated) (isCollapsed ? showRef : hideRef).current?.focus();
  }, [isCollapsed, isAnimated]);

  return (
    <div
      data-collapsed={isCollapsed || undefined}
      className={`group/facets relative grid gap-8 ${isCollapsed ? "lg:grid-cols-[3rem_minmax(0,1fr)]" : "lg:grid-cols-[24rem_minmax(0,1fr)]"} ${isAnimated ? "transition-[grid-template-columns] duration-300 ease-in-out motion-reduce:transition-none" : ""}`}
    >
      <div className="hidden overflow-x-clip lg:grid">
        <div
          inert={isCollapsed}
          aria-hidden={isCollapsed || undefined}
          className={`col-start-1 row-start-1 w-[24rem] ${fade(!isCollapsed, isAnimated)}`}
        >
          {facets(
            <div className="flex justify-end">
              <FacetsPaneToggle
                ref={hideRef}
                isCollapsed={false}
                count={count}
                onCollapsedChange={toggle}
              />
            </div>,
          )}
        </div>
        <div
          inert={!isCollapsed}
          aria-hidden={!isCollapsed || undefined}
          className={`col-start-1 row-start-1 ${fade(isCollapsed, isAnimated)}`}
        >
          <div className="h-[calc(100vh-144px)] w-fit border-r py-6 pr-2 lg:sticky lg:top-36">
            <FacetsPaneToggle
              ref={showRef}
              isCollapsed
              count={count}
              onCollapsedChange={toggle}
            />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
