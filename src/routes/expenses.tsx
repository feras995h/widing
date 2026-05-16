import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LatinDigits } from "@/components/LatinDigits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Receipt,
  ArrowDownCircle,
  Tag,
  Users as UsersIcon,
  Briefcase,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { formatLYD, formatShortDate, paymentMethodLabels } from "@/lib/format";
import { toast } from "sonner";
import {
  addExpenseFn,
  addExpenseCategoryFn,
  addGeneralReceiptFn,
  addWorkerFn,
  addWorkerPaymentFn,
  deleteExpenseFn,
  deleteExpenseCategoryFn,
  deleteGeneralReceiptFn,
  deleteWorkerFn,
  getExpensesDataFn,
  toggleWorkerActiveFn,
  updateExpenseCategoryFn,
  updateExpenseFn,
  updateGeneralReceiptFn,
} from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";

export const Route = createFileRoute("/expenses")({
  component: () => (
    <AppLayout requireOwner>
      <ExpensesPage />
    </AppLayout>
  ),
});

interface Expense {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string;
}
interface Worker {
  id: string;
  full_name: string;
  job_title: string;
  phone: string | null;
  monthly_salary: number;
  is_active: boolean;
}
interface WorkerPayment {
  id: string;
  worker_id: string;
  amount: number;
  payment_date: string;
  payment_period: string | null;
  notes: string | null;
  workers: { full_name: string; job_title: string };
}

interface Category {
  id: string;
  name: string;
  sort: number;
  is_active: boolean;
}

function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الحركة المالية</h1>
        <p className="text-sm text-muted-foreground">المقبوضات والمصروفات والرواتب وفئات الصرف</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-3xl">
          <TabsTrigger value="general">
            <Receipt className="w-4 h-4 ml-1" /> مصروفات
          </TabsTrigger>
          <TabsTrigger value="receipts">
            <ArrowDownCircle className="w-4 h-4 ml-1" /> المقبوضات
          </TabsTrigger>
          <TabsTrigger value="workers">
            <UsersIcon className="w-4 h-4 ml-1" /> العمال والرواتب
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="w-4 h-4 ml-1" /> الفئات
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <GeneralExpenses />
        </TabsContent>
        <TabsContent value="receipts" className="mt-6">
          <GeneralReceipts />
        </TabsContent>
        <TabsContent value="workers" className="mt-6">
          <WorkersSection />
        </TabsContent>
        <TabsContent value="categories" className="mt-6">
          <CategoriesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await getExpensesDataFn({ headers: sessionHeaders() });
    setExpenses((res.expenses as Expense[]) ?? []);
    setCategories(((res.categories as Category[]) ?? []).filter((c) => c.is_active));
  }
  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(exp: Expense) {
    setEditing(exp);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const payload = {
        category: fd.get("category") as string,
        amount: parseFloat(fd.get("amount") as string),
        expenseDate: fd.get("expense_date") as string,
        description: fd.get("description") as string,
      };
      if (editing) {
        await updateExpenseFn({
          headers: sessionHeaders(),
          data: { id: editing.id, ...payload },
        });
      } else {
        await addExpenseFn({ headers: sessionHeaders(), data: payload });
      }
      toast.success("تم الحفظ");
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل الحفظ";
      toast.error("فشل الحفظ", { description });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا المصروف؟")) return;
    try {
      await deleteExpenseFn({ headers: sessionHeaders(), data: { id } });
      toast.success("تم الحذف");
      await load();
    } catch {
      toast.error("فشل الحذف");
    }
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const defaultCategory =
    editing?.category ?? (categories[0]?.name ?? "أخرى");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/20">
          <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
          <p className="text-2xl font-bold text-primary">{formatLYD(total)}</p>
        </Card>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary" onClick={openAdd}>
              <Plus className="w-4 h-4 ml-1" /> مصروف جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل مصروف" : "إضافة مصروف"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id ?? "new"}>
              <div className="space-y-2">
                <Label>الفئة *</Label>
                <Select name="category" defaultValue={defaultCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                    {editing &&
                      !categories.some((c) => c.name === editing.category) && (
                        <SelectItem value={editing.category}>{editing.category}</SelectItem>
                      )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ (د.ل) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    defaultValue={editing?.amount}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_date">التاريخ *</Label>
                  <Input
                    id="expense_date"
                    name="expense_date"
                    type="date"
                    required
                    defaultValue={
                      editing?.expense_date
                        ? String(editing.expense_date).slice(0, 10)
                        : new Date().toISOString().slice(0, 10)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف *</Label>
                <Textarea
                  id="description"
                  name="description"
                  required
                  rows={2}
                  defaultValue={editing?.description ?? ""}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading} className="bg-gradient-primary">
                  {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}حفظ
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {expenses.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">لا توجد مصروفات بعد</Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <Card key={e.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{e.description}</p>
                    <Badge variant="secondary" className="text-xs">
                      {e.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatShortDate(e.expense_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-bold text-destructive">{formatLYD(e.amount)}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  title="تعديل"
                  onClick={() => openEdit(e)}
                >
                  <Pencil className="w-4 h-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface GeneralReceipt {
  id: string;
  category: string;
  amount: number;
  receipt_date: string;
  description: string;
  method: "cash" | "bank_transfer";
}

function GeneralReceipts() {
  const [receipts, setReceipts] = useState<GeneralReceipt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GeneralReceipt | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await getExpensesDataFn({ headers: sessionHeaders() });
    setReceipts((res.generalReceipts as GeneralReceipt[]) ?? []);
    setCategories(((res.categories as Category[]) ?? []).filter((c) => c.is_active));
  }
  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(r: GeneralReceipt) {
    setEditing(r);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const payload = {
        category: fd.get("category") as string,
        amount: parseFloat(fd.get("amount") as string),
        receiptDate: fd.get("receipt_date") as string,
        description: (fd.get("description") as string) || "",
        method: fd.get("method") as "cash" | "bank_transfer",
      };
      if (editing) {
        await updateGeneralReceiptFn({
          headers: sessionHeaders(),
          data: { id: editing.id, ...payload },
        });
      } else {
        await addGeneralReceiptFn({ headers: sessionHeaders(), data: payload });
      }
      toast.success("تم الحفظ");
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل الحفظ";
      toast.error("فشل الحفظ", { description });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا القبض؟")) return;
    try {
      await deleteGeneralReceiptFn({ headers: sessionHeaders(), data: { id } });
      toast.success("تم الحذف");
      await load();
    } catch {
      toast.error("فشل الحذف");
    }
  }

  const total = receipts.reduce((s, r) => s + Number(r.amount), 0);
  const defaultCategory = editing?.category ?? (categories[0]?.name ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <p className="text-xs text-muted-foreground">إجمالي المقبوضات اليدوية</p>
          <p className="text-2xl font-bold text-success">{formatLYD(total)}</p>
        </Card>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary" onClick={openAdd}>
              <Plus className="w-4 h-4 ml-1" /> قبض جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل قبض" : "إضافة قبض"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id ?? "new"}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>الفئة *</Label>
                  <Select name="category" defaultValue={defaultCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر فئة" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                      {editing &&
                        !categories.some((c) => c.name === editing.category) && (
                          <SelectItem value={editing.category}>{editing.category}</SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>طريقة الدفع *</Label>
                  <Select name="method" defaultValue={editing?.method ?? "cash"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">كاش</SelectItem>
                      <SelectItem value="bank_transfer">مصرف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="r_amount">المبلغ (د.ل) *</Label>
                  <Input
                    id="r_amount"
                    name="amount"
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    defaultValue={editing?.amount}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r_date">التاريخ *</Label>
                  <Input
                    id="r_date"
                    name="receipt_date"
                    type="date"
                    required
                    defaultValue={
                      editing?.receipt_date
                        ? String(editing.receipt_date).slice(0, 10)
                        : new Date().toISOString().slice(0, 10)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="r_description">البيان</Label>
                <Textarea
                  id="r_description"
                  name="description"
                  rows={2}
                  defaultValue={editing?.description ?? ""}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading} className="bg-gradient-primary">
                  {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}حفظ
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {receipts.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">لا توجد مقبوضات بعد</Card>
      ) : (
        <div className="space-y-2">
          {receipts.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <ArrowDownCircle className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{r.description || "—"}</p>
                    {r.category && (
                      <Badge variant="secondary" className="text-xs">
                        {r.category}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-xs bg-primary/5"
                    >
                      {r.method === "bank_transfer" ? "مصرف" : "كاش"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatShortDate(r.receipt_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-bold text-success">{formatLYD(r.amount)}</p>
                <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEdit(r)}>
                  <Pencil className="w-4 h-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await getExpensesDataFn({ headers: sessionHeaders() });
    setCategories((res.categories as Category[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addExpenseCategoryFn({ headers: sessionHeaders(), data: { name: name.trim() } });
      toast.success("تمت الإضافة");
      setName("");
      await load();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل الحفظ";
      toast.error("فشل", { description });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(c: Category) {
    if (!editingName.trim()) return;
    try {
      await updateExpenseCategoryFn({
        headers: sessionHeaders(),
        data: { id: c.id, name: editingName.trim() },
      });
      toast.success("تم الحفظ");
      setEditingId(null);
      setEditingName("");
      await load();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل الحفظ";
      toast.error("فشل", { description });
    }
  }

  async function handleToggle(c: Category) {
    try {
      await updateExpenseCategoryFn({
        headers: sessionHeaders(),
        data: { id: c.id, name: c.name, isActive: !c.is_active },
      });
      await load();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل";
      toast.error("فشل", { description });
    }
  }

  async function handleDelete(c: Category) {
    if (!confirm(`حذف الفئة "${c.name}"؟`)) return;
    try {
      await deleteExpenseCategoryFn({ headers: sessionHeaders(), data: { id: c.id } });
      toast.success("تم الحذف");
      await load();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل الحذف";
      toast.error("فشل الحذف", { description });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={handleAdd} className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[180px] space-y-2">
            <Label htmlFor="cat_name">إضافة فئة جديدة</Label>
            <Input
              id="cat_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: ضيافة"
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim()} className="bg-gradient-primary">
            {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            <Plus className="w-4 h-4 ml-1" /> إضافة
          </Button>
        </form>
      </Card>

      {categories.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">لا توجد فئات</Card>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => (
            <Card
              key={c.id}
              className={`p-3 flex items-center justify-between gap-3 ${
                !c.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Tag className="w-4 h-4 text-primary shrink-0" />
                {editingId === c.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="max-w-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(c);
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setEditingName("");
                      }
                    }}
                  />
                ) : (
                  <p className="font-semibold truncate">{c.name}</p>
                )}
                {!c.is_active && (
                  <Badge variant="outline" className="text-xs">
                    معطّلة
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch
                  checked={c.is_active}
                  onCheckedChange={() => handleToggle(c)}
                  title="نشطة/معطّلة"
                />
                {editingId === c.id ? (
                  <>
                    <Button
                      size="sm"
                      className="bg-gradient-primary"
                      onClick={() => handleSaveEdit(c)}
                    >
                      حفظ
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditingName("");
                      }}
                    >
                      إلغاء
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditingName(c.name);
                      }}
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(c)}
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkersSection() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [payments, setPayments] = useState<WorkerPayment[]>([]);
  const [workerOpen, setWorkerOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await getExpensesDataFn({ headers: sessionHeaders() });
    setWorkers((res.workers as Worker[]) ?? []);
    setPayments((res.workerPayments as WorkerPayment[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function handleAddWorker(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await addWorkerFn({
        headers: sessionHeaders(),
        data: {
          fullName: fd.get("full_name") as string,
          jobTitle: fd.get("job_title") as string,
          phone: (fd.get("phone") as string) || null,
          monthlySalary: parseFloat(fd.get("monthly_salary") as string),
        },
      });
      toast.success("تم إضافة العامل");
      setWorkerOpen(false);
      await load();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل إضافة العامل";
      toast.error("فشل", { description });
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedWorker) return;
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await addWorkerPaymentFn({
        headers: sessionHeaders(),
        data: {
          workerId: selectedWorker.id,
          amount: parseFloat(fd.get("amount") as string),
          paymentDate: fd.get("payment_date") as string,
          paymentPeriod: (fd.get("payment_period") as string) || null,
          notes: (fd.get("notes") as string) || null,
        },
      });
      toast.success("تم تسجيل الدفعة");
      setPayOpen(false);
      await load();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل تسجيل الدفعة";
      toast.error("فشل", { description });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(w: Worker) {
    await toggleWorkerActiveFn({
      headers: sessionHeaders(),
      data: { workerId: w.id, isActive: !w.is_active },
    });
    await load();
  }
  async function handleDeleteWorker(w: Worker) {
    const ok = window.confirm(
      `سيتم حذف العامل ${w.full_name} وجميع مدفوعات الرواتب المرتبطة به نهائيًا. لا يمكن التراجع. هل تريد المتابعة؟`,
    );
    if (!ok) return;
    try {
      await deleteWorkerFn({ headers: sessionHeaders(), data: { workerId: w.id } });
      toast.success("تم حذف العامل");
      await load();
    } catch (err) {
      const description = err instanceof Error ? err.message : "تعذر حذف العامل";
      toast.error("فشل الحذف", { description });
    }
  }

  
  const totalSalaries = workers
    .filter((w) => w.is_active)
    .reduce((s, w) => s + Number(w.monthly_salary), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <p className="text-xs text-muted-foreground">العمال النشطون</p>
          <p className="text-2xl font-bold text-primary">
            <LatinDigits>{workers.filter((w) => w.is_active).length}</LatinDigits>
          </p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-gold/10 to-gold/5 border-gold/30">
          <p className="text-xs text-muted-foreground">إجمالي الرواتب الشهرية</p>
          <p className="text-2xl font-bold">{formatLYD(totalSalaries)}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <p className="text-xs text-muted-foreground">
            آخر <LatinDigits>50</LatinDigits> دفعة
          </p>
          <p className="text-2xl font-bold text-success">{formatLYD(totalPaid)}</p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">العمال</h3>
        <Dialog open={workerOpen} onOpenChange={setWorkerOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 ml-1" /> إضافة عامل
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>عامل جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddWorker} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="w_name">الاسم الكامل *</Label>
                <Input id="w_name" name="full_name" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="w_job">الوظيفة *</Label>
                  <Input id="w_job" name="job_title" required placeholder="نادل، طباخ..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="w_phone">الهاتف</Label>
                  <Input id="w_phone" name="phone" dir="ltr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="w_salary">الراتب الشهري (د.ل) *</Label>
                <Input
                  id="w_salary"
                  name="monthly_salary"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setWorkerOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading} className="bg-gradient-primary">
                  {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}حفظ
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {workers.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">لم يتم إضافة عمال بعد</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {workers.map((w) => (
            <Card key={w.id} className={`p-4 ${!w.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-gold text-gold-foreground flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{w.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{w.job_title}</p>
                  </div>
                </div>
                <Switch checked={w.is_active} onCheckedChange={() => toggleActive(w)} />
              </div>
              <div className="pt-3 border-t space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">الراتب الشهري</p>
                  <p className="font-bold text-primary">{formatLYD(w.monthly_salary)}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                  <Button size="sm" variant="secondary" asChild className="flex-1">
                    <Link
                      to="/workers/$workerId"
                      params={{ workerId: w.id }}
                      className="inline-flex items-center justify-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      ملف العامل
                      <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedWorker(w);
                      setPayOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 ml-1" /> دفع راتب
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    title="حذف العامل"
                    aria-label="حذف العامل"
                    className="sm:w-9 sm:px-0 shrink-0"
                    onClick={() => handleDeleteWorker(w)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold mb-3">آخر مدفوعات الرواتب</h3>
        {payments.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">لا توجد مدفوعات</Card>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{p.workers.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.workers.job_title} • {formatShortDate(p.payment_date)}{" "}
                    {p.payment_period && (
                      <>
                        • <LatinDigits>{p.payment_period}</LatinDigits>
                      </>
                    )}
                  </p>
                </div>
                <p className="font-bold text-success">{formatLYD(p.amount)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>دفع راتب — {selectedWorker?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePay} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p_amount">المبلغ (د.ل) *</Label>
                <Input
                  id="p_amount"
                  name="amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  defaultValue={selectedWorker?.monthly_salary}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p_date">تاريخ الدفع *</Label>
                <Input
                  id="p_date"
                  name="payment_date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p_period">الفترة (مثال: YYYY-MM)</Label>
              <Input
                id="p_period"
                name="payment_period"
                defaultValue={new Date().toISOString().slice(0, 7)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p_notes">ملاحظات</Label>
              <Textarea id="p_notes" name="notes" rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading} className="bg-gradient-primary">
                {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}دفع
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
