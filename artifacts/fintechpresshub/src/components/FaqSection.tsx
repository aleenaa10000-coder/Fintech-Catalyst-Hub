import { FadeInView } from "@/components/FadeInView";
import { HelpCircle, Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  items: FaqItem[];
  heading?: string;
  subtitle?: string;
  id?: string;
  valuePrefix?: string;
  className?: string;
  testId?: string;
}

export function FaqSection({
  items,
  heading = "Frequently Asked Questions",
  subtitle,
  id,
  valuePrefix = "faq",
  className,
  testId,
}: FaqSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section
      className={className ?? "py-20 border-t bg-muted/20"}
      id={id}
      aria-label={heading}
      data-testid={testId}
    >
      <div className="container mx-auto px-4 max-w-3xl">
        <FadeInView className="text-center mb-12">
          <HelpCircle className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-3">{heading}</h2>
          {subtitle && (
            <p className="text-muted-foreground max-w-xl mx-auto">{subtitle}</p>
          )}
        </FadeInView>
        <Accordion
          type="single"
          collapsible
          className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 overflow-hidden"
        >
          {items.map((faq, idx) => (
            <AccordionItem
              key={faq.question}
              value={`${valuePrefix}-${idx}`}
              className="border-b-0 group"
            >
              <AccordionTrigger className="px-6 py-5 text-base md:text-lg font-semibold text-left text-slate-900 hover:text-[#0052FF] hover:no-underline transition-colors [&>svg]:hidden">
                <span className="flex-1 pr-4">{faq.question}</span>
                <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#0052FF]/10 text-[#0052FF] transition-transform duration-300 group-data-[state=open]:rotate-45">
                  <Plus className="w-5 h-5" />
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5 pt-0 text-muted-foreground text-base leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
