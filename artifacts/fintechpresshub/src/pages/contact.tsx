import { PageMeta } from "@/components/PageMeta";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSubmitContactForm } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { MapPin, Mail, Phone, Clock, HelpCircle, Plus } from "lucide-react";
import { PageHero } from "@/components/PageHero";

const contactFaqs = [
  {
    question: "What happens after I submit this form?",
    answer:
      "A senior strategist reviews your submission within one business day, then emails you 2-3 time slots for a 30-minute discovery call. There is no automated funnel and no junior SDR — you go straight to someone who will scope and price your engagement.",
  },
  {
    question: "Is the discovery call free, and is there any pressure to commit?",
    answer:
      "The 30-minute call is free and consultative. We'll review your funnel, surface 2-3 quick wins you can act on regardless of whether we work together, and only propose an engagement if there's a clear fit. No obligation, no aggressive follow-up sequences.",
  },
  {
    question: "How fast can we kick off if we decide to move forward?",
    answer:
      "Typical kickoff is 7-10 business days from signed agreement. That covers contract, access provisioning (GA4, GSC, CMS), kickoff workshop, and the first sprint plan. For audits we can sometimes start within 3-5 days if your data access is ready.",
  },
  {
    question: "What's the smallest engagement you take on?",
    answer:
      "Our minimum is the SEO audit (one-time, 30-day delivery). For ongoing retainers we typically work with fintech companies investing $5k+/month so we can resource a senior strategist plus a fintech writer or outreach lead — anything smaller doesn't move the needle in this vertical.",
  },
  {
    question: "Do you sign NDAs before the discovery call?",
    answer:
      "Yes. If you're discussing pre-launch products, regulatory positioning, or sensitive funnel data, send your NDA with the form submission and we'll have it countersigned before the call.",
  },
  {
    question: "Can you work with our in-house SEO or content team?",
    answer:
      "Absolutely — about 40% of our retainers run alongside an in-house team. We slot in as the fintech-specialist layer (writers, link builders, technical SEO) and report into your head of growth or content lead. We're comfortable with shared GSC, shared editorial calendars, and joint sprint reviews.",
  },
];

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  service: z.string().max(80).optional(),
  budget: z.string().max(80).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(4000),
});

export default function Contact() {
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      service: "",
      budget: "",
      message: "",
    },
  });

  const submitContact = useSubmitContactForm();

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitContact.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Message sent successfully!", {
            description: "One of our strategists will be in touch within 24 hours.",
          });
          form.reset();
        },
        onError: () => {
          toast.error("Failed to send message.", {
            description: "Please try again later or email us directly.",
          });
        }
      }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageMeta page="contact" faq={contactFaqs} />
      <PageHero
        eyebrow="Contact Us"
        title={<>Let's Scale Your Organic Growth</>}
        description="Request a free SEO audit or talk to our strategy team about building a defensible content and link-building moat for your fintech."
      />

      <section className="py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            
            {/* Contact Info */}
            <div className="lg:col-span-4 space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
                <p className="text-muted-foreground mb-8">
                  Fill out the form and our team will get back to you with a customized strategy based on your current search footprint.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Email</h3>
                    <p className="text-muted-foreground">hello@fintechpresshub.com</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Office</h3>
                    <p className="text-muted-foreground">100 Financial District<br/>New York, NY 10005</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Hours</h3>
                    <p className="text-muted-foreground">Mon-Fri, 9am - 6pm EST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-8">
              <div className="bg-card border rounded-2xl p-8 shadow-sm">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Acme Fintech" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (555) 000-0000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="service"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Interest</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a service" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="seo-content">SEO Content Creation</SelectItem>
                                <SelectItem value="link-building">High-DR Link Building</SelectItem>
                                <SelectItem value="technical-seo">Technical SEO Audit</SelectItem>
                                <SelectItem value="full-managed">Fully Managed Retainer</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Budget</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select budget range" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="2k-5k">$2,000 - $5,000</SelectItem>
                                <SelectItem value="5k-10k">$5,000 - $10,000</SelectItem>
                                <SelectItem value="10k+">$10,000+</SelectItem>
                                <SelectItem value="unsure">Not Sure Yet</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How can we help?</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us about your current challenges and goals..." 
                              className="min-h-[120px] resize-y" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" size="lg" className="w-full" disabled={submitContact.isPending}>
                      {submitContact.isPending ? "Sending..." : "Request Consultation"}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="py-16 border-t bg-muted/20" data-testid="section-contact-faq">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <HelpCircle className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Before you reach out
            </h2>
            <p className="text-muted-foreground">
              The most common questions we get from fintech teams considering a
              first conversation with us.
            </p>
          </div>
          <Accordion
            type="single"
            collapsible
            className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 overflow-hidden"
          >
            {contactFaqs.map((faq, idx) => (
              <AccordionItem
                key={faq.question}
                value={`contact-faq-${idx}`}
                data-testid={`accordion-contact-faq-${idx}`}
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
    </div>
  );
}
