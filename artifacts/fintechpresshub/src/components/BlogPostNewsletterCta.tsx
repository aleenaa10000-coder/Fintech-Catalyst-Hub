import { useState } from "react";
import { toast } from "sonner";
import { Mail, Check, Loader2 } from "lucide-react";
import { useSubscribeToNewsletter } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { trackEvent } from "@/lib/analytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  postSlug: string;
}

export function BlogPostNewsletterCta({ postSlug }: Props) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribeMutation = useSubscribeToNewsletter({
    mutation: {
      onSuccess: (data) => {
        setSubscribed(true);
        setEmail("");
        trackEvent("newsletter_subscribe", {
          source: "blog-post",
          postSlug,
          alreadySubscribed: data.alreadySubscribed,
        });
        toast.success(
          data.alreadySubscribed
            ? "You're already on the list — thanks!"
            : "You're in. Watch your inbox for the next issue.",
        );
      },
      onError: () => {
        toast.error("Something went wrong. Please try again.");
      },
    },
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    subscribeMutation.mutate({
      data: { email: trimmed, source: `blog-post:${postSlug}` },
    });
  };

  return (
    <section
      className="mt-12 rounded-2xl border border-slate-200 bg-gradient-to-br from-[#0b1e4d] via-[#102a6b] to-[#0a1633] p-8 sm:p-10 text-white shadow-sm"
      aria-labelledby="post-newsletter-cta-heading"
      data-testid="blog-post-newsletter-cta"
    >
      <div className="grid gap-6 md:grid-cols-[1fr,auto] md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 mb-4">
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Fintech SEO Newsletter
          </div>
          <h2
            id="post-newsletter-cta-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
          >
            Liked this article? Get the next one in your inbox.
          </h2>
          <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed">
            Practical fintech SEO and content tactics, delivered every other
            Tuesday. No fluff, no spam, unsubscribe anytime.
          </p>
        </div>

        <div className="md:min-w-[320px]">
          {subscribed ? (
            <div
              className="flex items-center gap-2 rounded-md border border-emerald-300/40 bg-emerald-400/15 px-4 py-3 text-sm text-emerald-100"
              data-testid="blog-post-newsletter-success"
              role="status"
            >
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              <span>Subscribed. See you in your inbox.</span>
            </div>
          ) : (
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col sm:flex-row gap-2"
              data-testid="blog-post-newsletter-form"
            >
              <label htmlFor="post-newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="post-newsletter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={subscribeMutation.isPending}
                className="bg-white/95 text-slate-900 placeholder:text-slate-500 border-white/20 h-11"
                data-testid="blog-post-newsletter-email"
              />
              <Button
                type="submit"
                size="lg"
                disabled={subscribeMutation.isPending}
                className="h-11 bg-white text-blue-700 hover:bg-blue-50"
                data-testid="blog-post-newsletter-submit"
              >
                {subscribeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Subscribing…
                  </>
                ) : (
                  "Subscribe"
                )}
              </Button>
            </form>
          )}
          <p className="mt-3 text-xs text-blue-100/70">
            By subscribing you agree to our{" "}
            <Link
              href="/privacy-policy"
              className="underline underline-offset-2 hover:text-white"
            >
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
