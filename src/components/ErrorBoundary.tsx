import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep this log (it’s critical for diagnosing mobile-only crashes)
    console.error("[ErrorBoundary] Uncaught render error", error, errorInfo);
    this.setState({ errorInfo });
  }

  private getDebugText() {
    const { error, errorInfo } = this.state;
    return [
      "Everlaunch crash report",
      `Time: ${new Date().toISOString()}`,
      `URL: ${typeof window !== "undefined" ? window.location.href : "(no window)"}`,
      "",
      `Error: ${error?.name ?? "Error"}: ${error?.message ?? "(no message)"}`,
      "",
      error?.stack ?? "(no stack)",
      "",
      errorInfo?.componentStack ?? "(no component stack)",
    ].join("\n");
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(this.getDebugText());
      toast.success("Copied crash details");
    } catch {
      toast.error("Couldn't copy crash details");
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-destructive/10 p-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Something went wrong</CardTitle>
                <CardDescription>
                  The page crashed while loading. This screen prevents a blank white page and helps us diagnose it.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{this.state.error?.message || "Unknown error"}</div>
              <div className="mt-1 break-all">{typeof window !== "undefined" ? window.location.pathname : ""}</div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button onClick={this.handleTryAgain} className="sm:flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
              <Button variant="outline" onClick={this.handleReload} className="sm:flex-1">
                Reload page
              </Button>
              <Button variant="outline" onClick={this.handleCopy} className="sm:flex-1">
                <Copy className="mr-2 h-4 w-4" />
                Copy error
              </Button>
            </div>

            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">Technical details</summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                {this.getDebugText()}
              </pre>
            </details>
          </CardContent>
        </Card>
      </main>
    );
  }
}
