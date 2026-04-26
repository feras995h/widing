import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, ShieldCheck } from "lucide-react";
import type { CoolifyRole } from "@/lib/auth-types";
import { sessionHeaders } from "@/lib/client-session";

export const Route = createFileRoute("/access")({
  component: () => (
    <AppLayout requireOwner>
      <AccessManagementPage />
    </AppLayout>
  ),
});

interface MergedUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  role: CoolifyRole | null;
  isActive: boolean;
}

const roleLabels: Record<CoolifyRole, string> = {
  owner: "مدير النظام",
  staff: "موظف حجوزات",
  accountant: "محاسب",
};

function AccessManagementPage() {
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, CoolifyRole>>({});
  const [draftPasswords, setDraftPasswords] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<CoolifyRole>("staff");

  async function loadData() {
    setLoading(true);
    const { getCurrentAuthUserFn, listUsersWithRolesFn } = await import("@/lib/coolify-auth");
    const me = await getCurrentAuthUserFn({ headers: sessionHeaders() });
    setCurrentUserId(me.user?.id ?? null);
    try {
      const usersRes = await listUsersWithRolesFn({ headers: sessionHeaders() });
      const merged = usersRes.users.map((u) => ({
        id: u.id,
        fullName: u.fullName?.trim() || "بدون اسم",
        email: u.email?.trim() || "—",
        createdAt: u.createdAt,
        role: u.role,
        isActive: u.isActive,
      }));
      const initialDrafts: Record<string, CoolifyRole> = {};
      merged.forEach((u) => {
        initialDrafts[u.id] = u.role ?? "staff";
      });
      setUsers(merged);
      setDraftRoles(initialDrafts);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : "فشل تحميل الصلاحيات";
      toast.error("فشل تحميل المستخدمين", { description: message });
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q),
    );
  }, [users, search]);

  async function saveRole(userId: string) {
    const nextRole = draftRoles[userId];
    if (!nextRole) return;

    if (currentUserId === userId && nextRole !== "owner") {
      toast.error("لا يمكن خفض صلاحية حسابك الحالي");
      return;
    }

    setSavingUserId(userId);

    try {
      const { updateUserRoleFn } = await import("@/lib/coolify-auth");
      await updateUserRoleFn({
        data: { userId, role: nextRole },
        headers: sessionHeaders(),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)));
      toast.success("تم تحديث الصلاحية");
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل حفظ الصلاحية";
      setSavingUserId(null);
      toast.error("فشل تحديث الصلاحية", { description: message });
      return;
    }

    setSavingUserId(null);
  }

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error("أدخل البريد وكلمة المرور");
      return;
    }
    setCreating(true);
    try {
      const { createUserByOwnerFn } = await import("@/lib/coolify-auth");
      const res = await createUserByOwnerFn({
        headers: sessionHeaders(),
        data: {
          fullName: newUserName.trim() || undefined,
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole,
        },
      });
      const u = res.user;
      setUsers((prev) => [
        {
          id: u.id,
          fullName: u.fullName?.trim() || "بدون اسم",
          email: u.email?.trim() || "—",
          createdAt: u.createdAt,
          role: u.role,
          isActive: true,
        },
        ...prev,
      ]);
      setDraftRoles((prev) => ({ ...prev, [u.id]: u.role }));
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("staff");
      toast.success("تم إنشاء المستخدم بنجاح");
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر إنشاء المستخدم";
      toast.error("فشل إنشاء المستخدم", { description: message });
    } finally {
      setCreating(false);
    }
  }

  async function toggleUserActive(user: MergedUser) {
    if (currentUserId === user.id && user.isActive) {
      toast.error("لا يمكن تعطيل حسابك الحالي");
      return;
    }
    const actionLabel = user.isActive ? "تعطيل" : "إعادة تفعيل";
    const ok = window.confirm(`هل تريد ${actionLabel} حساب ${user.fullName}؟`);
    if (!ok) return;

    setTogglingUserId(user.id);
    try {
      const { setUserActiveByOwnerFn } = await import("@/lib/coolify-auth");
      await setUserActiveByOwnerFn({
        headers: sessionHeaders(),
        data: { userId: user.id, isActive: !user.isActive },
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)),
      );
      toast.success(user.isActive ? "تم تعطيل الحساب" : "تمت إعادة تفعيل الحساب");
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر تحديث حالة الحساب";
      toast.error("فشل العملية", { description: message });
    } finally {
      setTogglingUserId(null);
    }
  }

  async function resetUserPassword(user: MergedUser) {
    const newPassword = (draftPasswords[user.id] || "").trim();
    if (newPassword.length < 6) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    const ok = window.confirm(`تأكيد إعادة تعيين كلمة مرور ${user.fullName}؟`);
    if (!ok) return;

    setResettingUserId(user.id);
    try {
      const { resetUserPasswordByOwnerFn } = await import("@/lib/coolify-auth");
      await resetUserPasswordByOwnerFn({
        headers: sessionHeaders(),
        data: { userId: user.id, newPassword },
      });
      setDraftPasswords((prev) => ({ ...prev, [user.id]: "" }));
      toast.success("تمت إعادة تعيين كلمة المرور");
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر إعادة تعيين كلمة المرور";
      toast.error("فشل إعادة التعيين", { description: message });
    } finally {
      setResettingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            إدارة المستخدمين والصلاحيات
          </h1>
          <p className="text-sm text-muted-foreground">هذه الصفحة متاحة لمدير النظام فقط.</p>
        </div>
        <Button variant="outline" onClick={() => void loadData()}>
          تحديث
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
            placeholder="ابحث بالاسم أو البريد أو المعرف..."
          />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">إضافة مستخدم جديد</h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="الاسم (اختياري)"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <Input
            type="email"
            dir="ltr"
            placeholder="البريد الإلكتروني"
            required
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />
          <Input
            type="password"
            dir="ltr"
            placeholder="كلمة المرور"
            required
            minLength={6}
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
          />
          <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as CoolifyRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">موظف حجوزات</SelectItem>
              <SelectItem value="accountant">محاسب</SelectItem>
              <SelectItem value="owner">مدير النظام</SelectItem>
            </SelectContent>
          </Select>
          <div className="md:col-span-4 flex justify-end">
            <Button type="submit" disabled={creating}>
              {creating ? "جارٍ الإنشاء..." : "إضافة المستخدم"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">جارٍ تحميل المستخدمين...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">لا يوجد مستخدمون مطابقون.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">البريد الإلكتروني</TableHead>
                  <TableHead className="text-right">الدور الحالي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الدور الجديد</TableHead>
                  <TableHead className="text-right">الصلاحية</TableHead>
                  <TableHead className="text-right">الحساب</TableHead>
                  <TableHead className="text-right">إعادة تعيين كلمة المرور</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const selectedRole = draftRoles[u.id] ?? "staff";
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-right">{u.fullName}</TableCell>
                      <TableCell className="text-right" dir="ltr">
                        {u.email}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.role ? (
                          <Badge variant={u.role === "owner" ? "default" : "secondary"}>
                            {roleLabels[u.role]}
                          </Badge>
                        ) : (
                          <Badge variant="outline">غير محددة</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={u.isActive ? "default" : "outline"}>
                          {u.isActive ? "نشط" : "معطل"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={selectedRole}
                          onValueChange={(v) =>
                            setDraftRoles((prev) => ({ ...prev, [u.id]: v as CoolifyRole }))
                          }
                        >
                          <SelectTrigger className="w-full min-w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">موظف حجوزات</SelectItem>
                            <SelectItem value="accountant">محاسب</SelectItem>
                            <SelectItem value="owner">مدير النظام</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => void saveRole(u.id)}
                          disabled={
                            savingUserId === u.id ||
                            u.role === selectedRole ||
                            (currentUserId === u.id && selectedRole !== "owner")
                          }
                        >
                          {savingUserId === u.id ? "جارٍ الحفظ..." : "حفظ"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={u.isActive ? "destructive" : "outline"}
                          onClick={() => void toggleUserActive(u)}
                          disabled={togglingUserId === u.id || (currentUserId === u.id && u.isActive)}
                        >
                          {togglingUserId === u.id
                            ? "جارٍ التنفيذ..."
                            : u.isActive
                              ? "تعطيل"
                              : "إعادة تفعيل"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                          <Input
                            type="password"
                            dir="ltr"
                            minLength={6}
                            placeholder="كلمة مرور جديدة"
                            value={draftPasswords[u.id] ?? ""}
                            onChange={(e) =>
                              setDraftPasswords((prev) => ({ ...prev, [u.id]: e.target.value }))
                            }
                            className="min-w-[180px]"
                          />
                          <Button
                            size="sm"
                            onClick={() => void resetUserPassword(u)}
                            disabled={
                              resettingUserId === u.id || (draftPasswords[u.id] ?? "").trim().length < 6
                            }
                          >
                            {resettingUserId === u.id ? "جارٍ التحديث..." : "إعادة التعيين"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
