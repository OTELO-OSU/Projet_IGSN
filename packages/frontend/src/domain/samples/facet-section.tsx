import type { ReactNode } from "react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@projet-igsn/design-system/components/ui/accordion";

export function FacetSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <AccordionItem value={title}>
      <AccordionTrigger className="text-muted-foreground items-center py-6 text-xs font-semibold tracking-wide uppercase">
        {title}
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-6">{children}</AccordionContent>
    </AccordionItem>
  );
}
