import { Header } from "@/components/Header";
import { AdminHealthBanner } from "@/components/AdminHealthBanner";
import { Footer } from "@/components/Footer";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useLayoutEffect, lazy, Suspense, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { useAuth } from "@workspace/replit-auth-web";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { prefetchAdminBundle, prefetchPublicBundle } from "@/lib/route-prefetch";
import { trackPageview } from "@/lib/analytics";
import { useWebVitals } from "@/hooks/useWebVitals";
import { TopProgressBar } from "@/components/TopProgressBar";
import { BackToTop } from "@/components/BackToTop";
import {
  HomeSkeleton,
  BlogListSkeleton,
  BlogPostSkeleton,
  AuthorSkeleton,
  AuthorsListSkeleton,
  GenericPageSkeleton,
} from "@/components/PageSkeletons";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Eager: home is the most common landing route — keep it in the main chunk
// so the first paint after hydration doesn't wait on a code-split fetch.
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

// Lazy-loaded routes — each becomes its own JS chunk fetched on demand.
const About = lazy(() => import("@/pages/about"));
const Services = lazy(() => import("@/pages/services"));
const ServiceDetail = lazy(() => import("@/pages/service-detail"));
const Pricing = lazy(() => import("@/pages/pricing"));
const Blog = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const AuthorPage = lazy(() => import("@/pages/author"));
const AuthorsIndex = lazy(() => import("@/pages/authors"));
const WriteForUs = lazy(() => import("@/pages/write-for-us"));
const Contact = lazy(() => import("@/pages/contact"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const RefundPolicy = lazy(() => import("@/pages/refund-policy"));
const CookiePolicy = lazy(() => import("@/pages/cookie-policy"));
const StatusPage = lazy(() => import("@/pages/status"));
const Terms = lazy(() => import("@/pages/terms"));
const EditorialGuidelines = lazy(() => import("@/pages/editorial-guidelines"));
const CommunityGuidelines = lazy(() => import("@/pages/community-guidelines"));
const ToolsIndex = lazy(() => import("@/pages/tools/index"));
const FinancialHealthScoreCalculator = lazy(
  () => import("@/pages/tools/financial-health-score-calculator"),
);
const MetaDescriptionGenerator = lazy(
  () => import("@/pages/tools/meta-description-generator"),
);
const GuestPostPitchGenerator = lazy(
  () => import("@/pages/tools/guest-post-pitch-generator"),
);
const ReadabilityChecker = lazy(
  () => import("@/pages/tools/readability-checker"),
);
const KeywordDifficultyEstimator = lazy(
  () => import("@/pages/tools/keyword-difficulty-estimator"),
);
const BacklinkValueEstimator = lazy(
  () => import("@/pages/tools/backlink-value-estimator"),
);
const ContentBriefGenerator = lazy(
  () => import("@/pages/tools/content-brief-generator"),
);
const HeadlineAnalyzer = lazy(
  () => import("@/pages/tools/headline-analyzer"),
);
const LinkProspector = lazy(
  () => import("@/pages/tools/link-prospector"),
);
const OutreachEmailGenerator = lazy(
  () => import("@/pages/tools/outreach-email-generator"),
);
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const AdminServices = lazy(() => import("@/pages/admin-services"));
const AdminBlog = lazy(() => import("@/pages/admin-blog"));
const AdminAuthorsSubscribers = lazy(
  () => import("@/pages/admin-authors-subscribers"),
);
const AdminAuthorSubscribers = lazy(
  () => import("@/pages/admin-author-subscribers"),
);
const AdminCommissioningTopics = lazy(
  () => import("@/pages/admin-commissioning-topics"),
);
const AdminNewsletter = lazy(() => import("@/pages/admin-newsletter"));
const AdminModeration = lazy(() => import("@/pages/admin-moderation"));
const AdminAuditLog = lazy(() => import("@/pages/admin-audit-log"));
const AdminNotifications = lazy(() => import("@/pages/admin-notifications"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdminAuthorPhotos = lazy(() => import("@/pages/admin-author-photos"));
const AdminAuthors = lazy(() => import("@/pages/admin-authors"));
const AdminPricing = lazy(() => import("@/pages/admin-pricing"));
const AdminAnalytics = lazy(() => import("@/pages/admin-analytics"));
const AdminSeoPerformance = lazy(() => import("@/pages/admin-seo-performance"));
const GlossaryPage = lazy(() => import("@/pages/glossary"));
const GlossaryTermPage = lazy(() => import("@/pages/glossary-term"));
const BlogCategoryPage = lazy(() => import("@/pages/blog-category"));
const LocationPage = lazy(() => import("@/pages/location"));
const Compare = lazy(() => import("@/pages/compare"));
const CompareSlug = lazy(() => import("@/pages/compare-slug"));
const FintechPublications = lazy(() => import("@/pages/resources/fintech-publications"));
const AdminGlossary = lazy(() => import("@/pages/admin-glossary"));
const AdminDisavow = lazy(() => import("@/pages/admin-disavow"));
const AdminPress = lazy(() => import("@/pages/admin-press"));
const AdminTestimonials = lazy(() => import("@/pages/admin-testimonials"));
const Press = lazy(() => import("@/pages/press"));

function RouteFallback() {
  const [location] = useLocation();
  let Skeleton: ComponentType;
  if (location === "/") {
    Skeleton = HomeSkeleton;
  } else if (location === "/blog") {
    Skeleton = BlogListSkeleton;
  } else if (location.startsWith("/blog/")) {
    Skeleton = BlogPostSkeleton;
  } else if (location === "/authors") {
    Skeleton = AuthorsListSkeleton;
  } else if (location.startsWith("/authors/")) {
    Skeleton = AuthorSkeleton;
  } else {
    Skeleton = GenericPageSkeleton;
  }
  return (
    <>
      <TopProgressBar />
      <Skeleton />
    </>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  useEffect(() => {
    trackPageview(location);
  }, [location]);
  return null;
}

function AdminBundlePrefetch() {
  const { user, isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      prefetchAdminBundle();
    }
  }, [isAuthenticated, user?.isAdmin]);
  return null;
}

function PublicBundlePrefetch() {
  useEffect(() => {
    prefetchPublicBundle();
  }, []);
  return null;
}

/**
 * Route guard for all /admin/* pages.
 *
 * - While auth is loading: shows a minimal spinner so the layout doesn't
 *   flash between states.
 * - Not signed in: immediately redirects to Replit OIDC login, preserving
 *   the intended destination so the user lands back here after sign-in.
 * - Signed in but not an admin: shows an "Access denied" screen. They can
 *   sign out and try a different account.
 * - Signed in and admin: renders the wrapped page component.
 */
function ProtectedAdminRoute({ component: Component }: { component: ComponentType }) {
  const { user, isLoading, login } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    const returnTo = encodeURIComponent(location);
    window.location.href = `/api/login?returnTo=${returnTo}`;
    return null;
  }

  if (!user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Lock className="w-10 h-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground max-w-sm">
          Your account (<strong>{user.email}</strong>) doesn't have admin
          access. Contact your team to be added to the admin allowlist.
        </p>
        <Button variant="outline" onClick={() => { window.location.href = "/api/logout"; }}>
          Sign out
        </Button>
      </div>
    );
  }

  return <Component />;
}

/**
 * Wraps a public route in its own ErrorBoundary so a crash in one page
 * doesn't take down the whole application shell. The root-level ErrorBoundary
 * in <App> is the last-resort fallback; this gives per-page isolation first.
 */
function SafeRoute({ path, component: Component }: { path: string; component: ComponentType }) {
  return (
    <Route path={path}>
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </Route>
  );
}

function AdminRoute({ path, component }: { path: string; component: ComponentType }) {
  return (
    <Route path={path}>
      <ErrorBoundary>
        <ProtectedAdminRoute component={component} />
      </ErrorBoundary>
    </Route>
  );
}

function Router() {
  useWebVitals();
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop />
      <AdminBundlePrefetch />
      <PublicBundlePrefetch />
      <Header />
      <main className="flex-grow pt-16">
        <AdminHealthBanner />
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <SafeRoute path="/" component={Home} />
            <SafeRoute path="/about" component={About} />
            <SafeRoute path="/services" component={Services} />
            <SafeRoute path="/services/:slug" component={ServiceDetail} />
            <SafeRoute path="/pricing" component={Pricing} />
            <SafeRoute path="/blog" component={Blog} />
            <SafeRoute path="/blog/:slug" component={BlogPost} />
            <SafeRoute path="/authors" component={AuthorsIndex} />
            <SafeRoute path="/authors/:slug" component={AuthorPage} />
            <SafeRoute path="/glossary/:slug" component={GlossaryTermPage} />
            <SafeRoute path="/glossary" component={GlossaryPage} />
            <SafeRoute path="/blog/category/:slug" component={BlogCategoryPage} />
            <SafeRoute path="/locations/:slug" component={LocationPage} />
            <SafeRoute path="/compare/:slug" component={CompareSlug} />
            <SafeRoute path="/compare" component={Compare} />
            <SafeRoute path="/resources/fintech-publications" component={FintechPublications} />
            <SafeRoute path="/press" component={Press} />
            <SafeRoute path="/write-for-us" component={WriteForUs} />
            <SafeRoute path="/contact" component={Contact} />
            <SafeRoute path="/privacy-policy" component={PrivacyPolicy} />
            <SafeRoute path="/refund-policy" component={RefundPolicy} />
            <SafeRoute path="/cookie-policy" component={CookiePolicy} />
            <SafeRoute path="/status" component={StatusPage} />
            <SafeRoute path="/terms" component={Terms} />
            <SafeRoute path="/editorial-guidelines" component={EditorialGuidelines} />
            <SafeRoute path="/community-guidelines" component={CommunityGuidelines} />
            <SafeRoute path="/tools" component={ToolsIndex} />
            <SafeRoute
              path="/tools/financial-health-score-calculator"
              component={FinancialHealthScoreCalculator}
            />
            <SafeRoute
              path="/tools/meta-description-generator"
              component={MetaDescriptionGenerator}
            />
            <SafeRoute
              path="/tools/guest-post-pitch-generator"
              component={GuestPostPitchGenerator}
            />
            <SafeRoute
              path="/tools/readability-checker"
              component={ReadabilityChecker}
            />
            <SafeRoute
              path="/tools/keyword-difficulty-estimator"
              component={KeywordDifficultyEstimator}
            />
            <SafeRoute
              path="/tools/backlink-value-estimator"
              component={BacklinkValueEstimator}
            />
            <SafeRoute
              path="/tools/content-brief-generator"
              component={ContentBriefGenerator}
            />
            <SafeRoute
              path="/tools/headline-analyzer"
              component={HeadlineAnalyzer}
            />
            <SafeRoute
              path="/tools/link-prospector"
              component={LinkProspector}
            />
            <SafeRoute
              path="/tools/outreach-email-generator"
              component={OutreachEmailGenerator}
            />
            {/* /admin/login is intentionally public — it's the fallback for
                non-Replit deployments and must be reachable unauthenticated. */}
            <SafeRoute path="/admin/login" component={AdminLogin} />
            <AdminRoute path="/admin" component={AdminDashboard} />
            <AdminRoute path="/admin/services" component={AdminServices} />
            <AdminRoute path="/admin/blog" component={AdminBlog} />
            <AdminRoute
              path="/admin/authors/subscribers"
              component={AdminAuthorsSubscribers}
            />
            <AdminRoute
              path="/admin/authors/:slug/subscribers"
              component={AdminAuthorSubscribers}
            />
            <AdminRoute
              path="/admin/commissioning-topics"
              component={AdminCommissioningTopics}
            />
            <AdminRoute path="/admin/newsletter" component={AdminNewsletter} />
            <AdminRoute path="/admin/moderation" component={AdminModeration} />
            <AdminRoute path="/admin/author-photos" component={AdminAuthorPhotos} />
            <AdminRoute path="/admin/authors" component={AdminAuthors} />
            <AdminRoute path="/admin/pricing" component={AdminPricing} />
            <AdminRoute path="/admin/audit-log" component={AdminAuditLog} />
            <AdminRoute path="/admin/notifications" component={AdminNotifications} />
            <AdminRoute path="/admin/analytics" component={AdminAnalytics} />
            <AdminRoute path="/admin/seo-performance" component={AdminSeoPerformance} />
            <AdminRoute path="/admin/glossary" component={AdminGlossary} />
            <AdminRoute path="/admin/disavow" component={AdminDisavow} />
            <AdminRoute path="/admin/press" component={AdminPress} />
            <AdminRoute path="/admin/testimonials" component={AdminTestimonials} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
      <CookieConsentBanner />
      <BackToTop />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
