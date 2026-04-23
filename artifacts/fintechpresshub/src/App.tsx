import { useDocumentTitle } from "@/hooks/use-document-title";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import About from "@/pages/about";
import Services from "@/pages/services";
import Pricing from "@/pages/pricing";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import WriteForUs from "@/pages/write-for-us";
import Contact from "@/pages/contact";
import PrivacyPolicy from "@/pages/privacy-policy";
import RefundPolicy from "@/pages/refund-policy";
import Terms from "@/pages/terms";
import EditorialGuidelines from "@/pages/editorial-guidelines";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-16">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/services" component={Services} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
          <Route path="/write-for-us" component={WriteForUs} />
          <Route path="/contact" component={Contact} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/refund-policy" component={RefundPolicy} />
          <Route path="/terms" component={Terms} />
          <Route path="/editorial-guidelines" component={EditorialGuidelines} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
