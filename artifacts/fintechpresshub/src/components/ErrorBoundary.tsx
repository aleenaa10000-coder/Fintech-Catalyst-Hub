import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4 py-16">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground max-w-sm text-sm">
            An unexpected error occurred on this page. You can try refreshing or
            navigate back to continue.
          </p>
          {this.state.error && (
            <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-3 py-2 max-w-md break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleReset}>
              Try again
            </Button>
            <Button variant="default" onClick={() => { window.location.href = "/"; }}>
              Go home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
