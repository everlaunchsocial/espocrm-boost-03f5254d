import { useEffect, useMemo, useState } from "react";
import App from "@/App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type FatalError = {
  message: string;
  stack?: string;
  source?: string;
};

export function AppBootstrap() {
  const [fatalError, setFatalError] = useState<FatalError | null>(null);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Keep this log for mobile-only failures
      console.error("[Fatal] window.error", event.error || event.message, event);
      setFatalError({
        message: event.message || "A script error occurred",
        stack: (event.error as Error | undefined)?.stack,
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[Fatal] unhandledrejection", event.reason);
      const reason = event.reason as any;
      setFatalError({
        message: reason?.message || String(reason) || "Unhandled promise rejection",
        stack: reason?.stack,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  const debugText = useMemo(() => {
    if (!fatalError) return "";
    return [
      "Everlaunch fatal error report",
      `Time: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `UserAgent: ${navigator.userAgent}`,
      "",
      `Message: ${fatalError.message}`,
      fatalError.source ? `Source: ${fatalError.source}` : null,
      "",
      fatalError.stack || "(no stack)",
    ]
      .filter(Boolean)
      .join("\n");
  }, [fatalError]);

  if (fatalError) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-destructive/10 p-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Site crashed while loading</CardTitle>
                <CardDescription>
                  This replaces the blank white screen and captures the exact error.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="font-medium text-foreground break-words">{fatalError.message}</div>
              {fatalError.source && (
                <div className="mt-1 text-xs text-muted-foreground break-all">{fatalError.source}</div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => {
                  setFatalError(null);
                  // Attempt a clean reload after clearing state
                  window.location.reload();
                }}
                className="sm:flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(debugText);
                    toast.success("Copied crash details");
                  } catch {
                    toast.error("Couldn't copy crash details");
                  }
                }}
                className="sm:flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy error
              </Button>
            </div>

            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">Technical details</summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                {debugText}
              </pre>
            </details>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
