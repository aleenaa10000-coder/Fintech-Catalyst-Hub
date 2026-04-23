import { useDocumentTitle } from "@/hooks/use-document-title";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart2, Home } from "lucide-react";

export default function NotFound() {
  useDocumentTitle("Page Not Found | FintechPressHub");

  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6 text-primary">
          <BarChart2 className="w-16 h-16" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground mb-4">
          404
        </h1>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">
          The page you are looking for doesn't exist or has been moved. 
          Let's get you back on track to scale your organic growth.
        </p>
        <Link href="/">
          <Button size="lg" className="w-full sm:w-auto gap-2">
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
