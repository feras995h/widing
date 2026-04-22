import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setSessionToken, sessionHeaders } from "@/lib/client-session";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  /** `null` = جارٍ التحقق من الخادم — لا نعرض زر التهيئة حتى نعرف */
  const [allowSeedOwner, setAllowSeedOwner] = useState<boolean | null>(null);
  const [requiresSetupKey, setRequiresSetupKey] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { getCurrentAuthUserFn } = await import("@/lib/coolify-auth");
        const res = await getCurrentAuthUserFn({ headers: sessionHeaders() });
        if (res.user) navigate({ to: "/dashboard", replace: true });
      } catch {
        /* تجاهل: يبقى المستخدم على /login (مثلاً إن فشل الاتصال بقاعدة البيانات) */
      }
    })();
  }, [navigate]);

  useEffect(() => {
    import("@/lib/coolify-auth")
      .then(({ getLoginBootstrapInfoFn }) => getLoginBootstrapInfoFn())
      .then((b) => {
        setAllowSeedOwner(!b.hasOwner);
        setRequiresSetupKey(Boolean(b.requiresSetupKey));
      })
      .catch(() => {
        setAllowSeedOwner(false);
        setRequiresSetupKey(false);
      });
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const { loginWithPasswordFn } = await import("@/lib/coolify-auth");
      const res = await loginWithPasswordFn({
        data: { email, password },
      });
      setSessionToken(res.token);
      toast.success("تم تسجيل الدخول بنجاح");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const description = err instanceof Error ? err.message : "Invalid login credentials";
      toast.error("فشل تسجيل الدخول", { description });
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedOwner() {
    if (!email.trim() || !password.trim()) {
      toast.error("أدخل البريد وكلمة المرور أولًا");
      return;
    }
    setSeeding(true);
    try {
      const { ensureOwnerAccountFn, getLoginBootstrapInfoFn } = await import("@/lib/coolify-auth");
      const res = await ensureOwnerAccountFn({
        data: {
          email,
          password,
          fullName: "مدير النظام",
          setupKey: setupKey.trim() || undefined,
        },
      });
      if (res.created) {
        toast.success("تم إنشاء حساب المدير بنجاح");
        setAllowSeedOwner(false);
      } else {
        toast.info(res.message);
      }
      const boot = await getLoginBootstrapInfoFn();
      if (boot.hasOwner) setAllowSeedOwner(false);
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل إنشاء الحساب";
      toast.error("تعذر تهيئة حساب المدير", { description });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 w-44 h-20 overflow-hidden rounded-2xl border border-gold/40 shadow-gold">
            <img
              src={logo}
              alt="VELOURA VENUE"
              className="w-full h-full object-cover object-center scale-[1.03]"
            />
          </div>
          <h1 className="text-xl font-bold">تسجيل الدخول</h1>
          <p className="text-sm text-muted-foreground">أدخل حسابك للمتابعة إلى النظام</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            دخول
          </Button>
          {allowSeedOwner === true && requiresSetupKey && (
            <div className="space-y-2">
              <Label htmlFor="setupKey">رمز التهيئة</Label>
              <Input
                id="setupKey"
                type="password"
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                placeholder="أدخل OWNER_SETUP_KEY"
                dir="ltr"
              />
            </div>
          )}
          {allowSeedOwner === true && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={seeding || (requiresSetupKey && !setupKey.trim())}
              onClick={() => void handleSeedOwner()}
            >
              {seeding && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              تهيئة أول حساب مدير
            </Button>
          )}
        </form>
      </Card>
    </div>
  );
}
