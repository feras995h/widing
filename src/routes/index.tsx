import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { getCurrentAuthUserFn } from "@/lib/coolify-auth";
import { sessionHeaders } from "@/lib/client-session";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const routeBySession = async () => {
      const res = await getCurrentAuthUserFn({ headers: sessionHeaders() });
      navigate({ to: res.user ? "/dashboard" : "/login", replace: true });
    };
    void routeBySession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold animate-pulse">
          <Sparkles className="w-10 h-10 text-gold-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-primary-foreground">VELOURA VENUE</h1>
        <p className="text-primary-foreground/80">جارٍ التحميل...</p>
      </div>
    </div>
  );
}
