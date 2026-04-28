import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lock,
  LogOut,
  Inbox,
  FileText,
  MessageSquare,
  Users,
  BookOpen,
  Newspaper,
  ScrollText,
  Bell,
  Settings,
  RefreshCw,
  TrendingUp,
  Eye,
  Star,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface RecentPitch {
  id: number;
  name: string;
  email: string;
  topic: string;
  category: string | null;
  createdAt: string;
}

interface RecentContact {
  id: number;
  name: string;
  email: string;
  company: string | null;
  service: string | null;
  createdAt: string;
}

interface RecentPost {
  id: number;
  slug: string;
  title: string;
  category: string;
  publishedAt: string;
  viewCount: number;
  featured: boolean;
}

interface DashboardData {
  pitchSubmissions: { total: number; recent: RecentPitch[] };
  contactSubmissions: { total: number; recent: RecentContact[] };
  blogPosts: { total: number; recent: RecentPost[] };
  newsletterSubscribers: { total: number };
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow group">
        <CardContent className="p-6 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardContent>
      </Card>
    </Link>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  href,
  linkLabel,
}: {
  icon: React.ElementType;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      </div>
      <Link href={href}>
        <Button variant="ghost" size="sm" className="text-xs gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchDashboard() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#0052FF]/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#0052FF]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin sign in required</h1>
            <p className="text-muted-foreground mb-6">
              Sign in to access the admin dashboard.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                onClick={() => { window.location.href = "/admin/login"; }}
                className="bg-[#0052FF] hover:bg-[#0040cc]"
              >
                Sign in with email & password
              </Button>
              <Button size="sm" variant="ghost" onClick={login} className="text-muted-foreground">
                Or sign in with Replit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
            <p className="text-muted-foreground mb-6">
              You're signed in as{" "}
              <strong className="text-foreground">
                {user?.email ?? user?.firstName ?? "this account"}
              </strong>
              , but this account is not on the admin allowlist.
            </p>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminBlog" />
      <div className="container mx-auto px-4 max-w-5xl">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="w-5 h-5 text-[#0052FF]" />
              <h1 className="text-3xl font-bold">Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              Overview of submissions, content, and growth — all in one place.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboard}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/admin/blog">
                <BookOpen className="w-4 h-4 mr-1.5" /> Blog
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/admin/moderation">
                <Inbox className="w-4 h-4 mr-1.5" /> Submissions
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/admin/audit-log">
                <ScrollText className="w-4 h-4 mr-1.5" /> Audit log
              </a>
            </Button>
            <span className="text-muted-foreground hidden sm:inline">
              Signed in as{" "}
              <strong className="text-foreground">
                {user?.firstName ?? user?.email ?? "Admin"}
              </strong>
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-muted animate-pulse mb-3" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={FileText}
                label="Guest Pitches"
                value={data.pitchSubmissions.total}
                href="/admin/moderation"
                color="bg-blue-100 text-blue-600"
              />
              <StatCard
                icon={MessageSquare}
                label="Contact Enquiries"
                value={data.contactSubmissions.total}
                href="/admin/moderation"
                color="bg-orange-100 text-orange-600"
              />
              <StatCard
                icon={Newspaper}
                label="Blog Posts"
                value={data.blogPosts.total}
                href="/admin/blog"
                color="bg-green-100 text-green-600"
              />
              <StatCard
                icon={Users}
                label="Subscribers"
                value={data.newsletterSubscribers.total}
                href="/admin/newsletter"
                color="bg-purple-100 text-purple-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Recent Pitch Submissions */}
              <Card>
                <CardContent className="pt-5 pb-4 px-5">
                  <SectionHeader
                    icon={FileText}
                    title="Recent guest pitches"
                    href="/admin/moderation"
                    linkLabel="View all"
                  />
                  {data.pitchSubmissions.recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No pitches yet.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {data.pitchSubmissions.recent.map((p) => (
                        <li key={p.id} className="py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.topic}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {p.category && (
                              <Badge variant="secondary" className="text-xs mb-0.5">
                                {p.category}
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Recent Contact Enquiries */}
              <Card>
                <CardContent className="pt-5 pb-4 px-5">
                  <SectionHeader
                    icon={MessageSquare}
                    title="Recent contact enquiries"
                    href="/admin/moderation"
                    linkLabel="View all"
                  />
                  {data.contactSubmissions.recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No enquiries yet.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {data.contactSubmissions.recent.map((c) => (
                        <li key={c.id} className="py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {c.name}
                              {c.company && (
                                <span className="text-muted-foreground font-normal">
                                  {" "}· {c.company}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {c.service && (
                              <Badge variant="secondary" className="text-xs mb-0.5">
                                {c.service}
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Blog Posts */}
            <Card className="mb-6">
              <CardContent className="pt-5 pb-4 px-5">
                <SectionHeader
                  icon={Newspaper}
                  title="Recent blog posts"
                  href="/admin/blog"
                  linkLabel="Manage posts"
                />
                {data.blogPosts.recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No posts yet.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {data.blogPosts.recent.map((post) => (
                      <li key={post.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2">
                          {post.featured && (
                            <Star className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                          )}
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium hover:underline truncate"
                          >
                            {post.title}
                          </a>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                            {post.category}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="w-3 h-3" /> {post.viewCount.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(post.publishedAt)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Quick nav */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Admin sections
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Blog", icon: BookOpen, href: "/admin/blog" },
                  { label: "Submissions", icon: Inbox, href: "/admin/moderation" },
                  { label: "Newsletter", icon: TrendingUp, href: "/admin/newsletter" },
                  { label: "Services", icon: Settings, href: "/admin/services" },
                  { label: "Audit log", icon: ScrollText, href: "/admin/audit-log" },
                  { label: "Notifications", icon: Bell, href: "/admin/notifications" },
                ].map(({ label, icon: Icon, href }) => (
                  <a
                    key={href}
                    href={href}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-center group"
                  >
                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="text-xs font-medium">{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
