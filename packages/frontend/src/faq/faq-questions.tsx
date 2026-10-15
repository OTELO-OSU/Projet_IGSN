import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@projet-igsn/design-system/components/ui/accordion";

import type { FaqQuestion } from "./faq-categories.ts";

export function FaqQuestions({
  questions,
  expanded = false,
}: {
  questions: FaqQuestion[];
  expanded?: boolean;
}) {
  return (
    <Accordion
      type="multiple"
      defaultValue={expanded ? questions.map(({ value }) => value) : []}
    >
      {questions.map(({ value, title, answer }) => (
        <AccordionItem key={value} value={value}>
          <AccordionTrigger className="text-primary text-lg font-semibold">
            {title}
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-base">
            {answer.map((block) => {
              if (typeof block === "string") {
                return <p key={block}>{block}</p>;
              }
              const List = block.ordered ? "ol" : "ul";
              return (
                <List
                  key={block.items[0]}
                  className={`space-y-3 ps-6 ${block.ordered ? "list-decimal" : "list-disc"}`}
                >
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </List>
              );
            })}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
