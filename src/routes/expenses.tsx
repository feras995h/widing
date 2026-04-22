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
  Receipt,
  Users as UsersIcon,
  Briefcase,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { formatLYD, formatShortDate, expenseCategoryLabels } from "@/lib/format";
import { toast } from "sonner";
import {
  addExpenseFn,
  addWorkerFn,
  addWorkerPaymentFn,
  deleteExpenseFn,
  getExpensesDataFn,
  toggleWorkerActiveFn,
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

function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المصروفات</h1>
        <p className="text-sm text-muted-foreground">إدارة المصروفات العامة ورواتب العمال</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general">
            <Receipt className="w-4 h-4 ml-1" /> مصروفات عامة
          </TabsTrigger>
          <TabsTrigger value="workers">
            <UsersIcon className="w-4 h-4 ml-1" /> العمال والرواتب
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <GeneralExpenses />
        </TabsContent>
        <TabsContent value="workers" className="mt-6">
          <WorkersSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await getExpensesDataFn({ headers: sessionHeaders() });
    setExpenses((res.expenses as Expense[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await addExpenseFn({
        headers: sessionHeaders(),
        data: {
          category: fd.get("category") as string,
          amount: parseFloat(fd.get("amount") as string),
          expenseDate: fd.get("expense_date") as string,
          description: fd.get("description") as string,
        },
      });
      toast.success("تم الحفظ");
      setOpen(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/20">
          <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
          <p className="text-2xl font-bold text-primary">{formatLYD(total)}</p>
        </Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 ml-1" /> مصروف جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مصروف</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>الفئة *</Label>
                <Select name="category" defaultValue="other">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(expenseCategoryLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ (د.ل) *</Label>
                  <Input id="amount" name="amount" type="number" min={0.01} step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_date">التاريخ *</Label>
                  <Input
                    id="expense_date"
                    name="expense_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف *</Label>
                <Textarea id="description" name="description" required rows={2} />
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
                      {expenseCategoryLabels[e.category]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatShortDate(e.expense_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-bold text-destructive">{formatLYD(e.amount)}</p>
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
              <div className="grid grid-cols-2 gap-3">
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
                <div className="flex flex-col sm:flex-row gap-2">
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
            <div className="grid grid-cols-2 gap-3">
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
