import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import About from "@/pages/about";
import Services from "@/pages/services";
import ServiceDetail from "@/pages/service-detail";
import Pricing from "@/pages/pricing";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import AuthorPage from "@/pages/author";
import AuthorsIndex from "@/pages/authors";
import WriteForUs from "@/pages/write-for-us";
import Contact from "@/pages/contact";
import PrivacyPolicy from "@/pages/privacy-policy";
import RefundPolicy from "@/pages/refund-policy";
import CookiePolicy from "@/pages/cookie-policy";
import Terms from "@/pages/terms";
import EditorialGuidelines from "@/pages/editorial-guidelines";
import FinancialHealthScoreCalculator from "@/pages/tools/financial-health-score-calculator";
import AdminLogin from "@/pages/admin-login";
import AdminServices from "@/pages/admin-services";
import AdminBlog from "@/pages/admin-blog";
import AdminAuthorsSubscribers from "@/pages/admin-authors-subscribers";
import AdminAuthorSubscribers from "@/pages/admin-author-subscribers";
import AdminCommissioningTopics from "@/pages/admin-commissioning-topics";
import NotFound from "@/pages/not-found";

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

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop />
      <Header />
      <main className="flex-grow pt-16">
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
          <Route
            path="/tools/financial-health-score-calculator"
            component={FinancialHealthScoreCalculator}
          />
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
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
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
