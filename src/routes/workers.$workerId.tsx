import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LatinDigits } from "@/components/LatinDigits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Phone, ChevronLeft, Banknote, TrendingUp } from "lucide-react";
import { formatLYD, formatShortDate } from "@/lib/format";
import { getWorkerDetailFn } from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";
import { toast } from "sonner";

export const Route = createFileRoute("/workers/$workerId")({
  component: () => (
    <AppLayout requireOwner>
      <WorkerDetailPage />
    </AppLayout>
  ),
});

interface WorkerPayRow {
  id: string;
  amount: number;
  payment_date: string;
  payment_period: string | null;
  notes: string | null;
}

function WorkerDetailPage() {
  const { workerId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [worker, setWorker] = useState<{
    id: string;
    full_name: string;
    job_title: string;
    phone: string | null;
    monthly_salary: number;
    is_active: boolean;
    created_at: string;
  } | null>(null);
  const [payments, setPayments] = useState<WorkerPayRow[]>([]);

  useEffect(() => {
    getWorkerDetailFn({ headers: sessionHeaders(), data: { workerId } })
      .then((res: any) => {
        setWorker(res.worker as (typeof worker) & { id: string });
        setPayments((res.payments as WorkerPayRow[]) ?? []);
        setLoading(false);
      })
      .catch((e: unknown) => {
        toast.error("تعذر تحميل بيانات العامل", {
          description: e instanceof Error ? e.message : "",
        });
        setLoading(false);
      });
  }, [workerId]);

  const totalWithdrawn = useMemo(
    () => payments.reduce((s, p) => s + Number(p.amount), 0),
    [payments],
  );

  const accrual = useMemo(() => {
    if (!worker) return { months: 0, approxDue: 0, balance: 0 };
    const start = new Date(worker.created_at);
    const now = new Date();
    const months = Math.max(
      1,
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1,
    );
    const approxDue = months * Number(worker.monthly_salary);
    const balance = approxDue - totalWithdrawn;
    return { months, approxDue, balance };
  }, [worker, totalWithdrawn]);

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">جارٍ التحميل...</div>;
  }
  if (!worker) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">العامل غير موجود</p>
        <Button asChild variant="outline">
          <Link to="/expenses">العودة للمصروفات</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/expenses" className="gap-1">
            <ChevronLeft className="w-4 h-4" /> المصروفات
          </Link>
        </Button>
      </div>

      <Card className="p-5 sm:p-6 shadow-elegant">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-gold text-gold-foreground flex items-center justify-center shrink-0">
              <Briefcase className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{worker.full_name}</h1>
              <p className="text-muted-foreground">{worker.job_title}</p>
              {worker.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1" dir="ltr">
                  <Phone className="w-3.5 h-3.5" />
                  <LatinDigits>{worker.phone}</LatinDigits>
                </p>
              )}
            </div>
          </div>
          <Badge variant={worker.is_active ? "default" : "secondary"}>
            {worker.is_active ? "نشط" : "غير نشط"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground">الراتب الشهري</p>
            <p className="text-lg font-bold text-primary">{formatLYD(worker.monthly_salary)}</p>
          </div>
          <div className="p-3 rounded-lg bg-success/5 border border-success/10">
            <p className="text-xs text-muted-foreground">إجمالي المسحوبات (مدفوع)</p>
            <p className="text-lg font-bold text-success">{formatLYD(totalWithdrawn)}</p>
          </div>
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/10">
            <p className="text-xs text-muted-foreground">مستحق تراكمي تقريباً</p>
            <p className="text-lg font-bold text-warning">
              {formatLYD(Math.max(0, accrual.balance))}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              ~<LatinDigits>{accrual.months}</LatinDigits> شهر × راتب (تقدير)
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 border-dashed">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground mb-1">
          <TrendingUp className="w-4 h-4" />
          شرح المستحق
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          يُحسب المستحق التراكمي تقديرياً بضرب الراتب الشهري في عدد الأشهر منذ تسجيل العامل، ثم
          طرح إجمالي المسحوبات. يلزم التحقق فعلياً حسب فترات الاستحقاق.
        </p>
      </Card>

      <h2 className="text-lg font-bold flex items-center gap-2">
        <Banknote className="w-5 h-5" />
        سجل المسحوبات
      </h2>

      {payments.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">لا توجد مسحوبات مسجّلة</Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-success">{formatLYD(p.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(p.payment_date)}
                  {p.payment_period && (
                    <>
                      {" "}
                      · فترة <LatinDigits>{p.payment_period}</LatinDigits>
                    </>
                  )}
                </p>
                {p.notes && <p className="text-xs mt-1">{p.notes}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="pb-4">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/expenses" className="gap-1">
            العودة لقسم العمال
          </Link>
        </Button>
      </div>
    </div>
  );
}
