import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LatinDigits } from "@/components/LatinDigits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Users,
  DollarSign,
  FileDown,
  CalendarRange,
} from "lucide-react";
import {
  formatLYD,
  eventTypeLabels,
  expenseCategoryLabels,
  statusLabels,
  statusColors,
} from "@/lib/format";
import { exportMonthlyReportPdf } from "@/lib/pdf-report";
import { toast } from "sonner";
import { getReportsDataFn } from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";

export const Route = createFileRoute("/reports")({
  component: () => (
    <AppLayout requireOwner>
      <ReportsPage />
    </AppLayout>
  ),
});

function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "all">(now.getMonth());

  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [workerPayments, setWorkerPayments] = useState<any[]>([]);

  useEffect(() => {
    getReportsDataFn({ headers: sessionHeaders() })
      .then((res) => {
        setBookings(res.bookings ?? []);
        setPayments(res.payments ?? []);
        setExpenses(res.expenses ?? []);
        setWorkerPayments(res.workerPayments ?? []);
      })
      .catch((err) => {
        const description = err instanceof Error ? err.message : "تعذر تحميل البيانات";
        toast.error("فشل تحميل التقارير", { description });
      });
  }, []);

  function inRange(dateStr: string) {
    const d = new Date(dateStr);
    if (d.getFullYear() !== year) return false;
    if (month !== "all" && d.getMonth() !== month) return false;
    return true;
  }

  const filtered = useMemo(() => {
    const fb = bookings.filter((b) => inRange(b.event_date));
    const fbActive = fb.filter((b: any) => b.status !== "cancelled");
    const fbCancelled = fb.filter((b: any) => b.status === "cancelled");
    const activeBookingIds = new Set(fbActive.map((b: any) => String(b.id)));
    const fp = payments.filter((p) => inRange(p.payment_date));
    const fpActive = fp.filter((p: any) => activeBookingIds.has(String(p.booking_id)));
    const fe = expenses.filter((e) => inRange(e.expense_date));
    const fwp = workerPayments.filter((w) => inRange(w.payment_date));

    const revenue = fpActive.reduce((s, p) => s + Number(p.amount), 0);
    const totalExpenses = fe.reduce((s, e) => s + Number(e.amount), 0);
    const totalSalaries = fwp.reduce((s, w) => s + Number(w.amount), 0);
    const profit = revenue - totalExpenses - totalSalaries;

    let bookingContracted = 0;
    let bookingPaidOnBookings = 0;
    for (const b of fbActive) {
      const total = Number(b.total_price);
      const paid = Array.isArray(b.payments)
        ? b.payments.reduce((s: number, p: { amount: number | string }) => s + Number(p.amount), 0)
        : 0;
      bookingContracted += total;
      bookingPaidOnBookings += paid;
    }
    const bookingDue = Math.max(0, bookingContracted - bookingPaidOnBookings);

    return {
      fb,
      fbActive,
      fbCancelled,
      fp,
      fpActive,
      fe,
      fwp,
      revenue,
      totalExpenses,
      totalSalaries,
      profit,
      bookingContracted,
      bookingPaidOnBookings,
      bookingDue,
    };
  }, [bookings, payments, expenses, workerPayments, year, month]);

  // Year-wide monthly breakdown of general expenses + worker payments
  const monthlyBreakdown = useMemo(() => {
    const monthsArr = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      monthLabel: [
        "يناير",
        "فبراير",
        "مارس",
        "أبريل",
        "مايو",
        "يونيو",
        "يوليو",
        "أغسطس",
        "سبتمبر",
        "أكتوبر",
        "نوفمبر",
        "ديسمبر",
      ][i],
      generalExpenses: 0,
      workerPayments: 0,
      total: 0,
    }));
    expenses.forEach((e: any) => {
      const d = new Date(e.expense_date);
      if (d.getFullYear() === year) monthsArr[d.getMonth()].generalExpenses += Number(e.amount);
    });
    workerPayments.forEach((w: any) => {
      const d = new Date(w.payment_date);
      if (d.getFullYear() === year) monthsArr[d.getMonth()].workerPayments += Number(w.amount);
    });
    monthsArr.forEach((m) => {
      m.total = m.generalExpenses + m.workerPayments;
    });
    return monthsArr;
  }, [expenses, workerPayments, year]);

  const yearTotals = useMemo(() => {
    return monthlyBreakdown.reduce(
      (acc, m) => ({
        generalExpenses: acc.generalExpenses + m.generalExpenses,
        workerPayments: acc.workerPayments + m.workerPayments,
        total: acc.total + m.total,
      }),
      { generalExpenses: 0, workerPayments: 0, total: 0 },
    );
  }, [monthlyBreakdown]);

  // Detailed expenses for the selected year (for the PDF detail tables)
  const yearExpensesDetail = useMemo(
    () => expenses.filter((e: any) => new Date(e.expense_date).getFullYear() === year),
    [expenses, year],
  );
  const yearWorkerPaymentsDetail = useMemo(
    () => workerPayments.filter((w: any) => new Date(w.payment_date).getFullYear() === year),
    [workerPayments, year],
  );

  async function handleExportPdf() {
    try {
      const result = await exportMonthlyReportPdf({
        year,
        monthlyBreakdown,
        yearTotals,
        expensesDetail: yearExpensesDetail.map((e: any) => ({
          date: e.expense_date,
          category: expenseCategoryLabels[e.category] ?? e.category,
          description: e.description,
          amount: Number(e.amount),
        })),
        workerPaymentsDetail: yearWorkerPaymentsDetail.map((w: any) => ({
          date: w.payment_date,
          worker: w.workers?.full_name ?? "-",
          period: w.payment_period ?? "-",
          amount: Number(w.amount),
        })),
      });
      if (result.fontSource === "none") {
        toast.success("تم تصدير التقرير", {
          description: "تم التصدير بخط احتياطي لأن الخط العربي لم يتم تحميله.",
        });
      } else if (result.fontSource === "cdn") {
        toast.success("تم تصدير التقرير", {
          description: "تم استخدام خط عربي احتياطي عبر الإنترنت.",
        });
      } else {
        toast.success("تم تصدير التقرير");
      }
    } catch (err: any) {
      toast.error("فشل التصدير", { description: err?.message });
    }
  }

  // Customer report
  const customerStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number; paid: number }>();
    filtered.fbActive.forEach((b: any) => {
      const key = b.customer_id;
      const existing = map.get(key) ?? { name: b.customers.full_name, count: 0, total: 0, paid: 0 };
      existing.count += 1;
      existing.total += Number(b.total_price);
      existing.paid += b.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered.fb]);

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.fe.forEach((e: any) => {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered.fe]);

  // Bookings by event type
  const bookingsByType = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filtered.fbActive.forEach((b: any) => {
      const existing = map.get(b.event_type) ?? { count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(b.total_price);
      map.set(b.event_type, existing);
    });
    return Array.from(map.entries());
  }, [filtered.fbActive]);

  const cancelledBookings = useMemo(() => filtered.fbCancelled, [filtered.fbCancelled]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">التقارير</h1>
          <p className="text-sm text-muted-foreground">تحليل شامل للأداء المالي والتشغيلي</p>
        </div>
        <Button
          onClick={handleExportPdf}
          className="bg-gradient-gold text-gold-foreground shadow-gold"
        >
          <FileDown className="w-4 h-4 ml-2" /> تصدير PDF
        </Button>
      </div>

      {/* Period selector */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <span className="font-semibold text-sm">الفترة:</span>
        <Select
          value={String(month)}
          onValueChange={(v) => setMonth(v === "all" ? "all" : parseInt(v))}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">السنة كاملة</SelectItem>
            {months.map((m, i) => (
              <SelectItem key={i} value={String(i)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                <LatinDigits>{y}</LatinDigits>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Financial summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={TrendingUp}
          label="الإيرادات"
          value={formatLYD(filtered.revenue)}
          color="success"
        />
        <SummaryCard
          icon={TrendingDown}
          label="مصروفات عامة"
          value={formatLYD(filtered.totalExpenses)}
          color="warning"
        />
        <SummaryCard
          icon={Users}
          label="رواتب العمال"
          value={formatLYD(filtered.totalSalaries)}
          color="primary"
        />
        <SummaryCard
          icon={Wallet}
          label="صافي الربح"
          value={formatLYD(filtered.profit)}
          color={filtered.profit >= 0 ? "success" : "destructive"}
        />
        <Card className="p-3 col-span-2 lg:col-span-4 bg-gradient-to-br from-amber-50/80 to-amber-100/20 dark:from-amber-950/20 dark:to-amber-900/5 border-amber-200/50">
          <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            الحجوزات في الفترة — القيمة والمحصّل والمستحق
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">قيمة الحجوزات (تعاقد)</p>
              <p className="font-bold text-primary">{formatLYD(filtered.bookingContracted)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المدفوع على حجوزات الفترة</p>
              <p className="font-bold text-success">{formatLYD(filtered.bookingPaidOnBookings)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المتبقي المستحق</p>
              <p className="font-bold text-amber-700 dark:text-amber-300">
                {formatLYD(filtered.bookingDue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="financial">مالي</TabsTrigger>
          <TabsTrigger value="monthly">ملخص شهري</TabsTrigger>
          <TabsTrigger value="bookings">الحجوزات</TabsTrigger>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
          <TabsTrigger value="customers">العملاء</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="mt-4 space-y-4">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-gold/5 border-primary/20">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> الملخص المالي
            </h3>
            <div className="space-y-3">
              <Row
                label="إجمالي الإيرادات (المحصّل)"
                value={formatLYD(filtered.revenue)}
                positive
              />
              <Row label="عدد الحجوزات النشطة" value={<LatinDigits>{filtered.fbActive.length}</LatinDigits>} />
              <Row
                label="عدد الحجوزات الملغاة (مؤرشفة)"
                value={<LatinDigits>{filtered.fbCancelled.length}</LatinDigits>}
              />
              <Row
                label="عدد دفعات الحجوزات النشطة"
                value={<LatinDigits>{filtered.fpActive.length}</LatinDigits>}
              />
              <hr />
              <Row label="مصروفات عامة" value={`- ${formatLYD(filtered.totalExpenses)}`} negative />
              <Row label="رواتب العمال" value={`- ${formatLYD(filtered.totalSalaries)}`} negative />
              <hr />
              <Row
                label="صافي الربح"
                value={formatLYD(filtered.profit)}
                positive={filtered.profit >= 0}
                negative={filtered.profit < 0}
                bold
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4 space-y-4">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold flex items-center gap-2">
                <CalendarRange className="w-5 h-5" /> ملخص شهري — سنة{" "}
                <LatinDigits>{year}</LatinDigits>
              </h3>
              <p className="text-xs text-muted-foreground">
                يتحدّث تلقائياً مع كل مصروف أو راتب جديد
              </p>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-secondary text-secondary-foreground">
                    <th className="p-3 text-right font-semibold">الشهر</th>
                    <th className="p-3 text-right font-semibold">مصروفات عامة</th>
                    <th className="p-3 text-right font-semibold">رواتب العمال</th>
                    <th className="p-3 text-right font-semibold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyBreakdown.map((m) => (
                    <tr key={m.monthIndex} className="border-b border-border hover:bg-secondary/40">
                      <td className="p-3 font-medium">{m.monthLabel}</td>
                      <td className="p-3">
                        {m.generalExpenses ? (
                          formatLYD(m.generalExpenses)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {m.workerPayments ? (
                          formatLYD(m.workerPayments)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-primary">
                        {m.total ? (
                          formatLYD(m.total)
                        ) : (
                          <span className="text-muted-foreground font-normal">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-gold text-gold-foreground font-bold">
                    <td className="p-3">إجمالي السنة</td>
                    <td className="p-3">{formatLYD(yearTotals.generalExpenses)}</td>
                    <td className="p-3">{formatLYD(yearTotals.workerPayments)}</td>
                    <td className="p-3">{formatLYD(yearTotals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-4 space-y-4">
          <Card className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> الحجوزات حسب النوع
            </h3>
            {bookingsByType.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">لا توجد حجوزات في هذه الفترة</p>
            ) : (
              <div className="space-y-3">
                {bookingsByType.map(([type, stats]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{eventTypeLabels[type] ?? type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        <LatinDigits>{stats.count}</LatinDigits> حجز
                      </span>
                    </div>
                    <span className="font-bold text-primary">{formatLYD(stats.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h3 className="font-bold mb-4">الحجوزات الملغاة (مؤرشفة)</h3>
            {cancelledBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                لا توجد حجوزات ملغاة في هذه الفترة
              </p>
            ) : (
              <div className="space-y-2">
                {cancelledBookings.map((b: any) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{b.customers?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(b.event_date).toLocaleDateString("ar-LY", { numberingSystem: "latn" })}{" "}
                        • {eventTypeLabels[b.event_type] ?? b.event_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`border ${statusColors.cancelled}`}>
                        {statusLabels.cancelled}
                      </Badge>
                      <span className="font-bold text-primary">{formatLYD(Number(b.total_price))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4 space-y-4">
          <Card className="p-6">
            <h3 className="font-bold mb-4">المصروفات حسب الفئة</h3>
            {expensesByCategory.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">لا توجد مصروفات</p>
            ) : (
              <div className="space-y-3">
                {expensesByCategory.map(([cat, amount]) => {
                  const pct = (amount / filtered.totalExpenses) * 100;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{expenseCategoryLabels[cat]}</span>
                        <span className="font-bold">{formatLYD(amount)}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="mt-4 space-y-4">
          <Card className="p-6">
            <h3 className="font-bold mb-4">أكثر العملاء حجزاً</h3>
            {customerStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
            ) : (
              <div className="space-y-2">
                {customerStats.slice(0, 10).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-gold text-gold-foreground flex items-center justify-center text-sm font-bold shrink-0">
                      <LatinDigits>{i + 1}</LatinDigits>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <LatinDigits>{c.count}</LatinDigits> حجز • مدفوع {formatLYD(c.paid)}
                      </p>
                    </div>
                    <span className="font-bold text-primary">{formatLYD(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  label,
  value,
  positive,
  negative,
  bold,
}: {
  label: string;
  value: ReactNode;
  positive?: boolean;
  negative?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center ${bold ? "text-lg" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-bold ${positive ? "text-success" : ""} ${negative ? "text-destructive" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  color: "success" | "warning" | "primary" | "destructive";
}) {
  const map = {
    success: "from-success/10 to-success/5 border-success/30 text-success",
    warning: "from-warning/10 to-warning/5 border-warning/30 text-warning",
    primary: "from-primary/10 to-primary/5 border-primary/30 text-primary",
    destructive: "from-destructive/10 to-destructive/5 border-destructive/30 text-destructive",
  };
  return (
    <Card className={`p-3 sm:p-4 bg-gradient-to-br border ${map[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 opacity-70" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-base sm:text-lg font-bold leading-tight">{value}</p>
    </Card>
  );
}
