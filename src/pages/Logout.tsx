import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Logout | Everlaunch";

    let cancelled = false;
    (async () => {
      try {
        await supabase.auth.signOut();
        if (cancelled) return;
        toast.success("Logged out");
      } catch {
        if (cancelled) return;
        toast.error("Couldn't log out — please try again");
      } finally {
        if (cancelled) return;
        navigate("/auth", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <section className="text-center">
        <h1 className="text-xl font-semibold text-foreground">Logging you out…</h1>
        <p className="mt-2 text-sm text-muted-foreground">You’ll be redirected to sign in.</p>
      </section>
    </main>
  );
}
