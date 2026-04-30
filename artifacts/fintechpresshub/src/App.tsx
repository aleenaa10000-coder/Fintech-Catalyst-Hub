import { Header } from "@/components/Header";
import { AdminHealthBanner } from "@/components/AdminHealthBanner";
import { Footer } from "@/components/Footer";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { useAuth } from "@workspace/replit-auth-web";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { prefetchAdminBundle, prefetchPublicBundle } from "@/lib/route-prefetch";
import { TopProgressBar } from "@/components/TopProgressBar";

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
const Terms = lazy(() => import("@/pages/terms"));
const EditorialGuidelines = lazy(() => import("@/pages/editorial-guidelines"));
const CommunityGuidelines = lazy(() => import("@/pages/community-guidelines"));
const FinancialHealthScoreCalculator = lazy(
  () => import("@/pages/tools/financial-health-score-calculator"),
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

function RouteFallback() {
  // The previous page's content stays mounted by Suspense's transition
  // semantics, so we deliberately render nothing here except the thin
  // top progress bar — no centered spinner, no min-height blank state,
  // no layout shift. Matches the in-app navigation feel of YouTube,
  // GitHub, and Vercel.
  return <TopProgressBar />;
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
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);
  return null;
}

/**
 * Once the user is detected as an admin, schedule background loading
 * of every admin route chunk during browser idle time. The prefetch
 * helper is idempotent and self-deduping, so re-runs (e.g. when the
 * auth query refetches) cost nothing.
 *
 * `useAuth` is already called from `home.tsx` and elsewhere on the
 * public site, so mounting it here adds no extra network requests —
 * the same `/api/auth/user` query is shared via React Query's cache.
 */
function AdminBundlePrefetch() {
  const { user, isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      prefetchAdminBundle();
    }
  }, [isAuthenticated, user?.isAdmin]);
  return null;
}

/**
 * After first mount, silently warm every public-page chunk during
 * browser idle time. This means clicking any nav link (or in-app link)
 * resolves instantly from cache and the Suspense fallback never shows.
 * Idempotent — guarded internally so re-renders don't re-fetch.
 */
function PublicBundlePrefetch() {
  useEffect(() => {
    prefetchPublicBundle();
  }, []);
  return null;
}

function Router() {
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
            <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/services" component={Services} />
          <Route path="/services/:slug" component={ServiceDetail} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
          <Route path="/authors" component={AuthorsIndex} />
          <Route path="/authors/:slug" component={AuthorPage} />
          <Route path="/write-for-us" component={WriteForUs} />
          <Route path="/contact" component={Contact} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/refund-policy" component={RefundPolicy} />
          <Route path="/cookie-policy" component={CookiePolicy} />
          <Route path="/terms" component={Terms} />
          <Route path="/editorial-guidelines" component={EditorialGuidelines} />
          <Route path="/community-guidelines" component={CommunityGuidelines} />
          <Route
            path="/tools/financial-health-score-calculator"
            component={FinancialHealthScoreCalculator}
          />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/services" component={AdminServices} />
          <Route path="/admin/blog" component={AdminBlog} />
          <Route
            path="/admin/authors/subscribers"
            component={AdminAuthorsSubscribers}
          />
          <Route
            path="/admin/authors/:slug/subscribers"
            component={AdminAuthorSubscribers}
          />
          <Route
            path="/admin/commissioning-topics"
            component={AdminCommissioningTopics}
          />
          <Route path="/admin/newsletter" component={AdminNewsletter} />
          <Route path="/admin/moderation" component={AdminModeration} />
          <Route path="/admin/author-photos" component={AdminAuthorPhotos} />
          <Route path="/admin/authors" component={AdminAuthors} />
          <Route path="/admin/pricing" component={AdminPricing} />
          <Route path="/admin/audit-log" component={AdminAuditLog} />
          <Route path="/admin/notifications" component={AdminNotifications} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
      <CookieConsentBanner />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
