import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLoginAdminWithPassword,
  getGetCurrentAuthUserQueryKey,
} from "@workspace/api-client-react";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const loginMut = useLoginAdminWithPassword();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg("Email and password are required.");
      return;
    }
    try {
      await loginMut.mutateAsync({
        data: { email: email.trim(), password },
      });
      // Refresh the cached current user so `useAuth()` sees the new
      // session and the admin shell renders without a hard reload.
      await qc.invalidateQueries({ queryKey: getGetCurrentAuthUserQueryKey() });
      toast.success("Signed in");
      navigate("/admin/blog");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 403) {
        setErrorMsg("This email is not authorized for admin access.");
      } else if (status === 401) {
        setErrorMsg("Email or password is incorrect.");
      } else if (status === 400) {
        setErrorMsg("Email and password are required.");
      } else {
        setErrorMsg("Could not sign in. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-secondary/30 px-4 py-16">
      <PageMeta
        title="Admin sign in | FintechPressHub"
        description="Sign in to the FintechPressHub admin dashboard."
        noindex
      />
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-12 w-12 rounded-full bg-[#0052FF]/10 text-[#0052FF] flex items-center justify-center mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Admin sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with your admin email and password.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  data-testid="admin-login-email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your admin password"
                  className="pl-9"
                  data-testid="admin-login-password"
                />
              </div>
            </div>

            {errorMsg ? (
              <p
                className="text-sm text-destructive"
                role="alert"
                data-testid="admin-login-error"
              >
                {errorMsg}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={loginMut.isPending}
              className="w-full bg-[#0052FF] hover:bg-[#0040cc]"
              data-testid="admin-login-submit"
            >
              {loginMut.isPending ? "Signing in…" : "Sign in"}
              {loginMut.isPending ? null : (
                <ArrowRight className="w-4 h-4 ml-2" />
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Need help accessing the admin dashboard?{" "}
            <Link
              href="/contact"
              className="text-[#0052FF] hover:underline"
            >
              Contact support
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
