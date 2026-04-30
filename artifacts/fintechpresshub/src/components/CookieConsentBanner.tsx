import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookieConsentBanner() {
  const { hasDecided, save } = useCookieConsent();
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  if (hasDecided) return null;

  const acceptAll = () => save(true);
  const rejectNonEssential = () => save(false);
  const savePreferences = () => save(analytics);

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
      data-testid="cookie-consent-banner"
    >
      <div className="mx-auto max-w-3xl rounded-lg border bg-background shadow-lg p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="text-sm text-foreground">
            <p className="font-semibold">We value your privacy</p>
            <p className="mt-1 text-muted-foreground">
              We use strictly necessary cookies to run this site and, with your
              permission, analytics cookies to understand how it's used. Read
              our{" "}
              <Link
                href="/cookie-policy"
                className="underline underline-offset-2 hover:text-foreground"
              >
                cookie policy
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomize((v) => !v)}
              data-testid="cookie-consent-customize"
            >
              {showCustomize ? "Hide options" : "Customize"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={rejectNonEssential}
              data-testid="cookie-consent-reject"
            >
              Reject non-essential
            </Button>
            <Button
              size="sm"
              onClick={acceptAll}
              data-testid="cookie-consent-accept"
            >
              Accept all
            </Button>
          </div>
        </div>

        {showCustomize && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">
                  Strictly necessary
                </Label>
                <p className="text-xs text-muted-foreground">
                  Required for the site to work. Always on.
                </p>
              </div>
              <Switch checked disabled aria-label="Strictly necessary cookies (always on)" />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="cookie-consent-analytics" className="text-sm font-medium">
                  Analytics
                </Label>
                <p className="text-xs text-muted-foreground">
                  Helps us understand which pages and articles are useful so we
                  can improve them. No personal profiles.
                </p>
              </div>
              <Switch
                id="cookie-consent-analytics"
                checked={analytics}
                onCheckedChange={setAnalytics}
                aria-label="Analytics cookies opt-in"
                data-testid="cookie-consent-analytics-switch"
              />
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={savePreferences}
                data-testid="cookie-consent-save"
              >
                Save preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
