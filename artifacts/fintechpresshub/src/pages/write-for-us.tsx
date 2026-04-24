import { useDocumentTitle } from "@/hooks/use-document-title";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, FileText, Globe, Link as LinkIcon, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHero } from "@/components/PageHero";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  topic: z.string().min(4, "Topic must be at least 4 characters").max(200),
  category: z.string().optional(),
  pitch: z.string().min(30, "Please provide more detail in your pitch (min 30 chars)").max(4000),
  sampleUrl: z.string().url("Please enter a valid URL").optional().or(z.literal(""))
});

export default function WriteForUs() {
  useDocumentTitle("Write For Us | FintechPressHub", "Submit a guest post pitch to FintechPressHub.");
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      website: "",
      topic: "",
      category: "",
      pitch: "",
      sampleUrl: "",
    },
  });

  const [successOpen, setSuccessOpen] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(true);

  const submitPost = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data && typeof data.error === "string" ? data.error : null) ||
            `Submission failed (${res.status})`,
        );
      }
      return { status: res.status, data } as { status: number; data: { ok?: boolean; emailed?: boolean } | null };
    },
  });

  const watchedName = form.watch("name");
  const watchedEmail = form.watch("email");
  const watchedPitch = form.watch("pitch");
  const requiredFilled =
    watchedName.trim().length > 0 &&
    watchedEmail.trim().length > 0 &&
    watchedPitch.trim().length > 0;
  const isSubmitDisabled = !requiredFilled || submitPost.isPending;

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitPost.mutate(values, {
      onSuccess: ({ status, data }) => {
        if (status === 200) {
          setEmailDelivered(Boolean(data?.emailed));
          setSuccessOpen(true);
          form.reset();
        } else {
          setEmailDelivered(false);
          setSuccessOpen(true);
          form.reset();
        }
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "Please try again later.";
        toast.error("Failed to submit pitch.", { description: message });
      },
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="Write For Us"
        title={<>Write for FintechPressHub</>}
        description="We accept high-quality guest contributions from established fintech operators, marketers, and founders. Read the editorial guidelines below, then send us your pitch."
      />

      <section className="py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* Guidelines */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Editorial Guidelines</h2>
                <p className="text-muted-foreground mb-6">
                  We maintain strict editorial standards to ensure our audience receives actionable, expert-led insights. Please read carefully before pitching.
                </p>
              </div>

              <Card className="bg-card">
                <CardContent className="pt-6 space-y-3">
                  <div
                    className="flex gap-4 p-3 -m-1 rounded-xl hover:bg-blue-50/60 transition-colors duration-200"
                    data-testid="guideline-depth"
                  >
                    <div className="bg-primary/10 p-3 rounded-xl h-fit">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-1">Depth & Originality</h3>
                      <p className="text-sm text-muted-foreground">1,200+ words. No fluff. Must include unique data, personal experience, or case studies. AI-generated content will be rejected immediately.</p>
                    </div>
                  </div>
                  <div
                    className="flex gap-4 p-3 -m-1 rounded-xl hover:bg-blue-50/60 transition-colors duration-200"
                    data-testid="guideline-fintech"
                  >
                    <div className="bg-primary/10 p-3 rounded-xl h-fit">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-1">Strict Fintech Focus</h3>
                      <p className="text-sm text-muted-foreground">Topics must cover B2B/B2C fintech marketing, SEO, compliance marketing, Open Banking, or payments infrastructure.</p>
                    </div>
                  </div>
                  <div
                    className="flex gap-4 p-3 -m-1 rounded-xl hover:bg-blue-50/60 transition-colors duration-200"
                    data-testid="guideline-link"
                  >
                    <div className="bg-primary/10 p-3 rounded-xl h-fit">
                      <LinkIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-1">Dofollow Link Policy</h3>
                      <p className="text-sm text-muted-foreground">You receive one (1) dofollow contextual link to your site and one in the author bio. Links must add value to the article.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-900">
                <h3 className="font-bold mb-4">What we do NOT accept:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><span className="text-red-600 font-bold">×</span> Generic marketing advice</li>
                  <li className="flex items-center gap-2"><span className="text-red-600 font-bold">×</span> Promotional press releases</li>
                  <li className="flex items-center gap-2"><span className="text-red-600 font-bold">×</span> Casino, CBD, or payday loan links</li>
                  <li className="flex items-center gap-2"><span className="text-red-600 font-bold">×</span> Plagiarized or spun content</li>
                </ul>
              </div>
            </div>

            {/* Pitch Form */}
            <div className="lg:col-span-7">
              <div className="bg-card border rounded-2xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold mb-6">Submit Your Pitch</h2>
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
                              <Input placeholder="Jane Doe" {...field} />
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
                              <Input type="email" placeholder="jane@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Website (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a topic area" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="seo">SEO Strategy</SelectItem>
                                <SelectItem value="content">Content Marketing</SelectItem>
                                <SelectItem value="growth">Growth & Acquisition</SelectItem>
                                <SelectItem value="technical">Technical Marketing</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proposed Working Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., How to Scale SEO for a Payment Gateway" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pitch"
                      render={({ field }) => {
                        const length = field.value?.length ?? 0;
                        const min = 30;
                        const max = 4000;
                        const underMin = length > 0 && length < min;
                        const nearMax = length >= max - 200;
                        const overMax = length > max;
                        const counterColor = overMax
                          ? "text-red-600"
                          : underMin
                          ? "text-amber-600"
                          : nearMax
                          ? "text-amber-600"
                          : "text-muted-foreground";
                        const counterText = underMin
                          ? `${min - length} more character${
                              min - length === 1 ? "" : "s"
                            } needed · ${length} / ${max}`
                          : `${length.toLocaleString()} / ${max.toLocaleString()}`;
                        return (
                          <FormItem>
                            <FormLabel>The Pitch</FormLabel>
                            <FormDescription>Outline your thesis, key takeaways, and why you are the right person to write this.</FormDescription>
                            <FormControl>
                              <Textarea 
                                placeholder="Briefly outline your article structure..." 
                                className="min-h-[150px] resize-y" 
                                {...field} 
                              />
                            </FormControl>
                            <div className="flex items-center justify-between gap-3 mt-1.5">
                              <FormMessage className="m-0" />
                              <span
                                className={`text-xs tabular-nums ml-auto ${counterColor}`}
                                data-testid="pitch-char-counter"
                                aria-live="polite"
                              >
                                {counterText}
                              </span>
                            </div>
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="sampleUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Writing Sample URL (Optional)</FormLabel>
                          <FormDescription>Link to a published article that demonstrates your writing style.</FormDescription>
                          <FormControl>
                            <Input placeholder="https://example.com/blog/my-post" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isSubmitDisabled}
                      data-testid="button-submit-pitch"
                    >
                      {submitPost.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Pitch"
                      )}
                    </Button>
                    {!requiredFilled && !submitPost.isPending && (
                      <p className="text-xs text-muted-foreground text-center -mt-2">
                        Fill in your name, email, and pitch to submit.
                      </p>
                    )}
                  </form>
                </Form>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-pitch-success">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-2xl">Thank you for your pitch!</DialogTitle>
            <DialogDescription className="text-center">
              {emailDelivered
                ? "We've received your submission and forwarded it to our editorial team. Expect a reply within 3–5 business days."
                : "We've received your submission. Our editorial team will review it and reach out within 3–5 business days."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              onClick={() => setSuccessOpen(false)}
              data-testid="button-close-success"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
