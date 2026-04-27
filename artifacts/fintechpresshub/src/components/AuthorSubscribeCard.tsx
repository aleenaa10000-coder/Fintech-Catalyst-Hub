import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubscribeToAuthor } from "@workspace/api-client-react";
import type { Author } from "@/data/authors";

type Props = {
  author: Pick<Author, "slug" | "name" | "role" | "photo">;
  className?: string;
};

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authorInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AuthorSubscribeCard({ author, className }: Props) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<null | { alreadySubscribed: boolean }>(null);

  const mutation = useSubscribeToAuthor({
    mutation: {
      onSuccess: (data) => {
        setDone({ alreadySubscribed: data.alreadySubscribed });
        setEmail("");
        toast.success(
          data.alreadySubscribed
            ? `You're already on ${author.name.split(" ")[0]}'s list — thanks!`
            : `You're in. You'll hear from ${author.name.split(" ")[0]} when the next piece drops.`,
        );
      },
      onError: () => {
        toast.error("Something went wrong. Please try again.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_RX.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    mutation.mutate({
      slug: author.slug,
      data: { email: trimmed },
    });
  };

  const firstName = author.name.split(" ")[0];

  return (
    <Card
      className={`relative overflow-hidden border-slate-200 bg-gradient-to-br from-[#0052FF] to-[#003BCC] text-white ${className ?? ""}`}
      data-testid={`card-author-subscribe-${author.slug}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-[hsl(190_95%_70%)]/30 blur-2xl"
      />

      <CardContent className="relative p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-sm">
            {author.photo ? (
              <img
                src={author.photo}
                alt={`${author.name} headshot`}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              authorInitials(author.name)
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Follow {firstName}
            </div>
            <div className="text-base font-bold leading-tight truncate">
              Get {firstName}'s next piece in your inbox
            </div>
          </div>
        </div>

        <p className="text-sm text-white/85 leading-relaxed mb-5">
          A focused mailing list — only emails when {firstName} publishes a new
          article or field report. No agency cross-promotion, no daily digests.
          Unsubscribe with one click.
        </p>

        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-lg border border-white/25 bg-white/10 backdrop-blur p-4"
              data-testid={`subscribe-success-${author.slug}`}
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[hsl(150_85%_75%)] shrink-0 mt-0.5" />
                <div className="text-sm leading-relaxed">
                  {done.alreadySubscribed ? (
                    <>
                      You're already on {firstName}'s list — we won't email you
                      twice.{" "}
                    </>
                  ) : (
                    <>
                      You're subscribed to {firstName}'s mailing list.{" "}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setDone(null)}
                    className="underline underline-offset-2 hover:text-white/90"
                  >
                    Use another email
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-2.5"
              noValidate
            >
              <label
                htmlFor={`author-email-${author.slug}`}
                className="sr-only"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id={`author-email-${author.slug}`}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={mutation.isPending}
                  required
                  className="bg-white text-slate-900 placeholder:text-slate-400 border-0 pl-9 h-11 focus-visible:ring-2 focus-visible:ring-white/60"
                  data-testid={`input-author-subscribe-email-${author.slug}`}
                />
              </div>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full h-11 bg-white text-[#0052FF] hover:bg-white/90 font-semibold"
                data-testid={`button-author-subscribe-${author.slug}`}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subscribing…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Subscribe to {firstName}
                  </>
                )}
              </Button>
              <p className="text-[11px] text-white/65 leading-relaxed pt-1">
                We'll only use your email for {firstName}'s articles. See our{" "}
                <a
                  href="/privacy-policy"
                  className="underline underline-offset-2 hover:text-white"
                >
                  privacy policy
                </a>
                .
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default AuthorSubscribeCard;
