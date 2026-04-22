import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Calendar, Wallet, BarChart3, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clearSessionToken, sessionHeaders } from "@/lib/client-session";
import type { CoolifyRole } from "@/lib/auth-types";

const navItems = [
  { to: "/dashboard", label: "الحجوزات", icon: Calendar },
  { to: "/customers", label: "العملاء", icon: Users, ownerOnly: true },
  { to: "/expenses", label: "المصروفات", icon: Wallet, ownerOnly: true },
  { to: "/reports", label: "التقارير", icon: BarChart3, ownerOnly: true },
  { to: "/access", label: "الصلاحيات", icon: ShieldCheck, ownerOnly: true },
];

export function AppLayout({
  children,
  requireOwner = false,
}: {
  children: ReactNode;
  requireOwner?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<CoolifyRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const { getCurrentAuthUserFn } = await import("@/lib/coolify-auth");
        const res = await getCurrentAuthUserFn({ headers: sessionHeaders() });
        setIsAuthenticated(Boolean(res.user));
        setRole(res.user?.role ?? null);
      } catch {
        setIsAuthenticated(false);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    void loadAuth();
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const visibleItems = useMemo(
    () => navItems.filter((item) => !item.ownerOnly || role === "owner"),
    [role],
  );

  const roleLabel = role === "owner" ? "مدير النظام" : "موظف حجوزات";

  async function handleLogout() {
    try {
      const { logoutFn } = await import("@/lib/coolify-auth");
      await logoutFn({ headers: sessionHeaders() });
    } catch {
      /* تجاهل فشل الخادم — نمسح الجلسة محلياً */
    }
    clearSessionToken();
    navigate({ to: "/login", replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        جارٍ التحقق من الجلسة...
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">الحساب غير مهيأ</h2>
          <p className="text-muted-foreground mb-4">
            لا توجد صلاحية مرتبطة بهذا الحساب. يرجى التواصل مع مدير النظام.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            تسجيل الخروج
          </Button>
        </Card>
      </div>
    );
  }

  if (requireOwner && role !== "owner") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="bg-card border-b border-border shadow-elegant sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="w-[180px] h-[64px] sm:w-[240px] sm:h-[86px] overflow-hidden rounded-xl border border-gold/40 shadow-gold">
              <img
                src={logo}
                alt="VELOURA VENUE"
                className="w-full h-full object-cover object-center scale-[1.04]"
              />
            </div>
            <Button variant="outline" onClick={handleLogout}>
              تسجيل الخروج
            </Button>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
            <p className="text-muted-foreground">هذا القسم متاح لمدير النظام فقط.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-card border-b border-border shadow-elegant sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 sm:h-24">
            <div className="flex items-center gap-3">
              <div className="w-[180px] h-[64px] sm:w-[240px] sm:h-[86px] overflow-hidden rounded-xl border border-gold/40 shadow-gold">
                <img
                  src={logo}
                  alt="VELOURA VENUE"
                  className="w-full h-full object-cover object-center scale-[1.04]"
                />
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {visibleItems.map((item) => {
                const active = location.pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      active
                        ? "bg-gradient-gold text-gold-foreground shadow-gold"
                        : "text-foreground/70 hover:text-primary hover:bg-secondary",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                {roleLabel}
              </span>
              <Button size="sm" variant="outline" onClick={handleLogout}>
                خروج
              </Button>
            </div>
          </div>

          {/* Mobile nav */}
          <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
            {visibleItems.map((item) => {
              const active = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                    active
                      ? "bg-gradient-gold text-gold-foreground"
                      : "text-foreground/70 bg-secondary",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}
