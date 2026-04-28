import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetNotificationSettings,
  useUpdateNotificationSettings,
  useTestSlackNotification,
  getGetNotificationSettingsQueryKey,
  type PublicNotificationSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Bell,
  Slack as SlackIcon,
  Save,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";

const SLACK_PREFIX = "https://hooks.slack.com/services/";

function formatDateTime(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TestStatusPill({
  settings,
}: {
  settings: PublicNotificationSettings;
}) {
  if (!settings.slackConfigured) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not configured
      </Badge>
    );
  }
  if (settings.lastTestAt == null) {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground">
        Never tested
      </Badge>
    );
  }
  if (settings.lastTestOk) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200"
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Test OK · {formatDateTime(settings.lastTestAt)}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-rose-50 text-rose-700 border-rose-200"
      title={settings.lastTestError ?? undefined}
    >
      <XCircle className="w-3 h-3 mr-1" />
      Test failed · {formatDateTime(settings.lastTestAt)}
    </Badge>
  );
}

export default function AdminNotifications() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Local form state — seeded from the server response on first load.
  // We keep `webhookUrl` separate from the server's `slackWebhookHint`
  // because the server never returns the full URL (it's a bearer
  // secret); the input starts blank and only sends a value when the
  // admin types a new one.
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  /** True when the local form differs from what we last saved. Lets us
   *  disable the Save button until there's something to send. */
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, navigate]);

  const settingsQuery = useGetNotificationSettings({
    query: {
      enabled: !!user?.isAdmin,
      queryKey: getGetNotificationSettingsQueryKey(),
    },
  });

  // Sync server state into the form on first load and after a save.
  useEffect(() => {
    if (settingsQuery.data) {
      setEnabled(settingsQuery.data.slackEnabled);
      setDirty(false);
    }
  }, [settingsQuery.data]);

  const updateMutation = useUpdateNotificationSettings({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(
          getGetNotificationSettingsQueryKey(),
          data,
        );
        setWebhookUrl("");
        setDirty(false);
        toast.success("Notification settings saved.");
      },
      onError: (err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Failed to save settings.";
        toast.error(msg);
      },
    },
  });

  const testMutation = useTestSlackNotification({
    mutation: {
      onSuccess: (result) => {
        // Re-fetch to pick up the recorded test status.
        void queryClient.invalidateQueries({
          queryKey: getGetNotificationSettingsQueryKey(),
        });
        if (result.ok) {
          toast.success("Slack test ping sent — check the channel.");
        } else {
          toast.error(`Slack test failed: ${result.error ?? "unknown error"}`);
        }
      },
      onError: (err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Test request failed";
        toast.error(msg);
      },
    },
  });

  const validation = useMemo(() => {
    if (webhookUrl.trim() === "") return { ok: true, message: "" };
    if (!webhookUrl.trim().startsWith(SLACK_PREFIX)) {
      return {
        ok: false,
        message: `Webhook URL must start with ${SLACK_PREFIX}`,
      };
    }
    return { ok: true, message: "" };
  }, [webhookUrl]);

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const settings = settingsQuery.data;
  const canSave =
    dirty &&
    validation.ok &&
    !updateMutation.isPending &&
    // If the admin is enabling Slack but has never set a URL and isn't
    // typing one now, block the save — same backend constraint, but
    // showing the "Add a webhook URL first" hint inline is friendlier
    // than a 400 toast.
    !(enabled && !settings?.slackConfigured && webhookUrl.trim() === "");

  function handleSave() {
    if (!validation.ok) return;
    updateMutation.mutate({
      data: {
        slackEnabled: enabled,
        // null = leave existing URL alone; empty string clears it.
        // Trimmed string overwrites.
        slackWebhookUrl:
          webhookUrl.trim() === "" ? null : webhookUrl.trim(),
      },
    });
  }

  function handleClear() {
    if (
      !window.confirm(
        "Remove the saved Slack webhook? Persistent-failure alerts will stop posting to Slack until a new URL is added.",
      )
    ) {
      return;
    }
    updateMutation.mutate({
      data: {
        slackEnabled: false,
        // The PUT route treats empty string as "clear" — see route handler.
        slackWebhookUrl: "",
      },
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/admin/blog"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to admin
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="w-7 h-7" /> Notifications
        </h1>
        <p className="text-muted-foreground mt-1">
          Mirror admin-email alerts (persistent broken URLs, DB outages,
          and on-demand bulk-probe results) into a Slack channel of your
          choice using an incoming webhook. The webhook URL is treated as
          a secret — once saved, only the last 4 characters are shown.
        </p>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-3">
            <SlackIcon className="w-6 h-6 text-violet-700" />
            <div className="flex-1">
              <h2 className="font-semibold flex items-center gap-2">
                Slack incoming webhook
                {settingsQuery.isFetching && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                Create one at{" "}
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  api.slack.com/messaging/webhooks
                </a>{" "}
                — Slack binds it to a single channel.
              </p>
            </div>
            {settings && <TestStatusPill settings={settings} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="password"
              placeholder={
                settings?.slackConfigured
                  ? `Saved (ends in ${settings.slackWebhookHint ?? "…"}) — paste a new URL to replace`
                  : `${SLACK_PREFIX}T000…/B000…/abc123…`
              }
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setDirty(true);
              }}
              data-testid="notifications-webhook-input"
              autoComplete="off"
              spellCheck={false}
            />
            {!validation.ok && (
              <p className="text-xs text-rose-600">{validation.message}</p>
            )}
            {settings?.slackConfigured && (
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the saved URL. Use{" "}
                <button
                  type="button"
                  className="text-rose-600 hover:underline inline-flex items-center gap-1"
                  onClick={handleClear}
                  data-testid="notifications-clear"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>{" "}
                to remove it entirely.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="enabled-toggle" className="font-medium">
                Send Slack alerts
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When off, the webhook stays saved but no messages are
                posted (handy for muting during a known incident).
              </p>
            </div>
            <Switch
              id="enabled-toggle"
              checked={enabled}
              onCheckedChange={(v) => {
                setEnabled(v);
                setDirty(true);
              }}
              disabled={!settings?.slackConfigured && webhookUrl.trim() === ""}
              data-testid="notifications-enabled-toggle"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleSave}
              disabled={!canSave}
              data-testid="notifications-save"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" /> Save settings
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={
                !settings?.slackConfigured ||
                dirty ||
                testMutation.isPending
              }
              title={
                dirty
                  ? "Save your changes before testing"
                  : !settings?.slackConfigured
                    ? "Add a webhook URL first"
                    : "Send a test ping to the configured channel"
              }
              data-testid="notifications-test"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Testing…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" /> Send test ping
                </>
              )}
            </Button>
          </div>

          {settings?.lastTestError && !settings.lastTestOk && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              <strong>Last test failure:</strong> {settings.lastTestError}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 text-sm space-y-2 text-muted-foreground">
          <p className="font-medium text-foreground">What gets posted</p>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>
              <strong>Persistent failure alert</strong> — once a URL has
              been broken longer than <code>HEALTH_ALERT_HOURS</code>{" "}
              (default 48h), the daily link-check job mirrors the email
              digest into Slack.
            </li>
            <li>
              <strong>DB outage</strong> — when the daily probe can't
              reach Postgres, an alert is posted alongside the email.
            </li>
            <li>
              <strong>On-demand bulk-probe</strong> — the "Send to Slack"
              button on the broken-URL summary strip on{" "}
              <Link href="/admin/blog" className="text-primary hover:underline">
                /admin/blog
              </Link>{" "}
              lets you push the current sweep result into the channel
              with one click.
            </li>
          </ul>
          <p className="pt-2">
            Email recipients (configured via the <code>ADMIN_EMAILS</code>{" "}
            env var) continue to receive the same alerts in parallel —
            Slack is additive, not a replacement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
