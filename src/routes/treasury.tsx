import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LatinDigits } from "@/components/LatinDigits";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Users as UsersIcon,
  Search,
  FileText,
  ChevronLeft,
  Printer,
  Pencil,
} from "lucide-react";
import { PaymentEditDialog, type EditablePayment } from "@/components/PaymentEditDialog";
import {
  formatLYD,
  eventTypeLabels,
  paymentMethodLabels,
  expenseCategoryLabels,
  partsFromYmd,
} from "@/lib/format";

/** DD/MM/YYYY plain — no locale bidi marks. */
function formatPlainDate(value: string | Date | null | undefined): string {
  const p = partsFromYmd(value as any);
  if (!p) return "—";
  const dd = String(p.d).padStart(2, "0");
  const mm = String(p.m0 + 1).padStart(2, "0");
  return `${dd}/${mm}/${p.y}`;
}
import { getReportsDataFn } from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";
import { toast } from "sonner";

export const Route = createFileRoute("/treasury")({
  component: () => (
    <AppLayout allowedRoles={["owner", "accountant"]}>
      <TreasuryPage />
    </AppLayout>
  ),
});

interface BookingRow {
  id: string;
  customer_id: string;
  event_date: string;
  event_type: string;
  total_price: number;
  status: string;
  customers: { full_name: string };
  payments: { amount: number }[];
}
interface PaymentRow {
  id: string;
  booking_id: string;
  amount: number;
  payment_date: string;
  method: string;
  notes: string | null;
}
interface ExpenseRow {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string | null;
}
interface WorkerPaymentRow {
  id: string;
  worker_id: string;
  amount: number;
  payment_date: string;
  payment_period: string | null;
  notes: string | null;
  workers: { full_name: string; job_title: string };
}
interface GeneralReceiptRow {
  id: string;
  category: string;
  amount: number;
  receipt_date: string;
  description: string;
  method: "cash" | "bank_transfer";
}

const ARABIC_MONTHS = [
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

function TreasuryPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number | "all">(now.getMonth());

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [workerPayments, setWorkerPayments] = useState<WorkerPaymentRow[]>([]);
  const [generalReceipts, setGeneralReceipts] = useState<GeneralReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [debtorSearch, setDebtorSearch] = useState("");
  // فلاتر سجل المصروفات الإضافية
  const [expFrom, setExpFrom] = useState<string>("");
  const [expTo, setExpTo] = useState<string>("");
  const [expCategory, setExpCategory] = useState<string>("all");
  const [expKind, setExpKind] = useState<"all" | "expense" | "salary">("all");
  // تعديل دفعات الزبائن من الخزينة
  const [editingPayment, setEditingPayment] = useState<EditablePayment | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  function loadData() {
    return getReportsDataFn({ headers: sessionHeaders() })
      .then((res: any) => {
        setBookings(res.bookings ?? []);
        setPayments(res.payments ?? []);
        setExpenses(res.expenses ?? []);
        setWorkerPayments(res.workerPayments ?? []);
        setGeneralReceipts(res.generalReceipts ?? []);
      })
      .catch((err: unknown) => {
        const description = err instanceof Error ? err.message : "تعذر تحميل البيانات";
        toast.error("فشل تحميل بيانات الخزينة", { description });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function inRange(dateStr: string) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    if (d.getFullYear() !== year) return false;
    if (month !== "all" && d.getMonth() !== month) return false;
    return true;
  }

  const years = useMemo(() => {
    const set = new Set<number>([now.getFullYear()]);
    const push = (s?: string) => {
      if (!s) return;
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) set.add(d.getFullYear());
    };
    bookings.forEach((b) => push(b.event_date));
    payments.forEach((p) => push(p.payment_date));
    expenses.forEach((e) => push(e.expense_date));
    workerPayments.forEach((w) => push(w.payment_date));
    generalReceipts.forEach((r) => push(r.receipt_date));
    return Array.from(set).sort((a, b) => b - a);
  }, [bookings, payments, expenses, workerPayments, generalReceipts]);

  const bookingById = useMemo(() => {
    const map = new Map<string, BookingRow>();
    bookings.forEach((b) => map.set(String(b.id), b));
    return map;
  }, [bookings]);

  const activeBookingIds = useMemo(
    () => new Set(bookings.filter((b) => b.status !== "cancelled").map((b) => String(b.id))),
    [bookings],
  );

  const filteredReceipts = useMemo(() => {
    return payments
      .filter((p) => activeBookingIds.has(String(p.booking_id)))
      .filter((p) => inRange(p.payment_date))
      .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1));
  }, [payments, activeBookingIds, year, month]);

  const filteredGeneralReceipts = useMemo(
    () =>
      generalReceipts
        .filter((r) => inRange(r.receipt_date))
        .sort((a, b) => (a.receipt_date < b.receipt_date ? 1 : -1)),
    [generalReceipts, year, month],
  );

  type ReceiptItem = {
    id: string;
    date: string;
    kind: "booking" | "general";
    title: string;
    subtitle: string;
    method: string;
    notes: string;
    amount: number;
  };

  const receiptItems: ReceiptItem[] = useMemo(() => {
    const a: ReceiptItem[] = filteredReceipts.map((p) => {
      const b = bookingById.get(String(p.booking_id));
      return {
        id: `p-${p.id}`,
        date: p.payment_date,
        kind: "booking",
        title: b?.customers?.full_name ?? "—",
        subtitle: b
          ? `${eventTypeLabels[b.event_type] ?? b.event_type} · ${formatPlainDate(b.event_date)}`
          : "—",
        method: p.method,
        notes: p.notes ?? "",
        amount: Number(p.amount),
      };
    });
    const b: ReceiptItem[] = filteredGeneralReceipts.map((r) => ({
      id: `g-${r.id}`,
      date: r.receipt_date,
      kind: "general",
      title: r.category || "قبض عام",
      subtitle: r.description || "—",
      method: r.method,
      notes: "",
      amount: Number(r.amount),
    }));
    return [...a, ...b].sort((x, y) => (x.date < y.date ? 1 : -1));
  }, [filteredReceipts, filteredGeneralReceipts, bookingById]);

  const filteredGeneralExpenses = useMemo(
    () =>
      expenses
        .filter((e) => inRange(e.expense_date))
        .sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1)),
    [expenses, year, month],
  );

  const filteredWorkerPayments = useMemo(
    () =>
      workerPayments
        .filter((w) => inRange(w.payment_date))
        .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1)),
    [workerPayments, year, month],
  );

  type DisbursementRow = {
    id: string;
    date: string;
    kind: "expense" | "salary";
    title: string;
    subtitle: string;
    amount: number;
    notes: string | null;
    category: string | null;
  };

  const disbursements: DisbursementRow[] = useMemo(() => {
    const a: DisbursementRow[] = filteredGeneralExpenses.map((e) => ({
      id: `e-${e.id}`,
      date: e.expense_date,
      kind: "expense",
      title: expenseCategoryLabels[e.category] ?? e.category ?? "—",
      subtitle: e.description ?? "—",
      amount: Number(e.amount),
      notes: null,
      category: e.category ?? null,
    }));
    const b: DisbursementRow[] = filteredWorkerPayments.map((w) => ({
      id: `w-${w.id}`,
      date: w.payment_date,
      kind: "salary",
      title: w.workers.full_name,
      subtitle: `${w.workers.job_title}${w.payment_period ? ` · ${w.payment_period}` : ""}`,
      amount: Number(w.amount),
      notes: w.notes,
      category: null,
    }));
    return [...a, ...b].sort((x, y) => (x.date < y.date ? 1 : -1));
  }, [filteredGeneralExpenses, filteredWorkerPayments]);

  const filteredDisbursements = useMemo(() => {
    return disbursements.filter((d) => {
      if (expKind !== "all" && d.kind !== expKind) return false;
      if (expCategory !== "all") {
        if (d.kind !== "expense") return false;
        if ((d.category ?? "") !== expCategory) return false;
      }
      if (expFrom) {
        const ds = String(d.date).slice(0, 10);
        if (ds < expFrom) return false;
      }
      if (expTo) {
        const ds = String(d.date).slice(0, 10);
        if (ds > expTo) return false;
      }
      return true;
    });
  }, [disbursements, expKind, expCategory, expFrom, expTo]);

  const filteredDisbursementsTotal = useMemo(
    () => filteredDisbursements.reduce((s, d) => s + Number(d.amount), 0),
    [filteredDisbursements],
  );

  const totals = useMemo(() => {
    const receipts = receiptItems.reduce((s, r) => s + Number(r.amount), 0);
    const receiptsBank = receiptItems
      .filter((r) => r.method === "bank_transfer")
      .reduce((s, r) => s + Number(r.amount), 0);
    const receiptsCash = receipts - receiptsBank;
    const generalExp = filteredGeneralExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const salaries = filteredWorkerPayments.reduce((s, w) => s + Number(w.amount), 0);
    const disbursementsTotal = generalExp + salaries;
    return {
      receipts,
      receiptsBank,
      receiptsCash,
      disbursements: disbursementsTotal,
      net: receipts - disbursementsTotal,
    };
  }, [receiptItems, filteredGeneralExpenses, filteredWorkerPayments]);

  // صافي الخزينة الكلي — لا يتأثر بفلتر الشهر/السنة (رصيد لحظي للنقدية)
  const treasuryBalance = useMemo(() => {
    const receipts = payments
      .filter((p) => activeBookingIds.has(String(p.booking_id)))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const generalRec = generalReceipts.reduce((s, r) => s + Number(r.amount || 0), 0);
    const generalExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const salaries = workerPayments.reduce((s, w) => s + Number(w.amount || 0), 0);
    return receipts + generalRec - generalExp - salaries;
  }, [payments, generalReceipts, expenses, workerPayments, activeBookingIds]);

  type DebtorRow = {
    bookingId: string;
    customerId: string;
    customerName: string;
    eventDate: string;
    eventType: string;
    total: number;
    paid: number;
    remaining: number;
  };

  const debtors: DebtorRow[] = useMemo(() => {
    const rows: DebtorRow[] = [];
    bookings.forEach((b) => {
      if (b.status === "cancelled") return;
      const total = Number(b.total_price) || 0;
      const paid = Array.isArray(b.payments)
        ? b.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
        : 0;
      const remaining = total - paid;
      if (remaining > 0) {
        rows.push({
          bookingId: String(b.id),
          customerId: String(b.customer_id),
          customerName: b.customers?.full_name ?? "—",
          eventDate: b.event_date,
          eventType: b.event_type,
          total,
          paid,
          remaining,
        });
      }
    });
    return rows.sort((a, b) => b.remaining - a.remaining);
  }, [bookings]);

  const filteredDebtors = useMemo(() => {
    const q = debtorSearch.trim().toLowerCase();
    if (!q) return debtors;
    return debtors.filter(
      (d) =>
        d.customerName.toLowerCase().includes(q) ||
        d.bookingId.toLowerCase().includes(q),
    );
  }, [debtors, debtorSearch]);

  const debtorsTotals = useMemo(() => {
    const totalDue = debtors.reduce((s, d) => s + d.remaining, 0);
    const uniqueCustomers = new Set(debtors.map((d) => d.customerId)).size;
    return { totalDue, uniqueCustomers, bookingsCount: debtors.length };
  }, [debtors]);

  const periodLabel = month === "all" ? `سنة ${year}` : `${ARABIC_MONTHS[month]} ${year}`;

  const editMaxAllowed = useMemo(() => {
    if (!editingPayment || !editingBookingId) return 0;
    const b = bookingById.get(String(editingBookingId));
    if (!b) return 0;
    const otherPaid = (payments || [])
      .filter((p) => String(p.booking_id) === String(editingBookingId) && p.id !== editingPayment.id)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    return Math.max(0, Number(b.total_price) - otherPaid);
  }, [editingPayment, editingBookingId, bookingById, payments]);

  function handlePrintExpenses() {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error("تعذر فتح نافذة الطباعة", { description: "تأكد من السماح بالنوافذ المنبثقة" });
      return;
    }
    const esc = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const rows = filteredDisbursements
      .map(
        (d) => `<tr>
          <td class="date">${formatPlainDate(d.date)}</td>
          <td>${d.kind === "expense" ? "مصروف عام" : "راتب عامل"}</td>
          <td>${esc(d.title)}</td>
          <td>${esc(d.subtitle)}</td>
          <td>${esc(d.notes ?? "—")}</td>
          <td class="amount neg">${esc(formatLYD(d.amount))}</td>
        </tr>`,
      )
      .join("");
    const filterParts: string[] = [`الفترة: ${esc(periodLabel)}`];
    if (expFrom) filterParts.push(`من: ${esc(expFrom)}`);
    if (expTo) filterParts.push(`إلى: ${esc(expTo)}`);
    if (expKind !== "all") filterParts.push(`النوع: ${expKind === "expense" ? "مصروف عام" : "راتب عامل"}`);
    if (expCategory !== "all") filterParts.push(`التصنيف: ${esc(expenseCategoryLabels[expCategory] ?? expCategory)}`);
    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>سجل المصروفات</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "Segoe UI", "Tahoma", Arial, sans-serif; color: #111; margin: 0; padding: 0; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f3ead4; color: #5a4310; text-align: right; padding: 6px 8px; border: 1px solid #d8c98b; font-weight: 700; }
  tbody td { padding: 6px 8px; border: 1px solid #e3e3e3; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .amount { text-align: left; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .date { white-space: nowrap; direction: ltr; unicode-bidi: isolate; text-align: right; }
  .neg { color: #b03030; font-weight: 700; }
  tfoot td { background: #f3ead4; font-weight: 700; border: 1px solid #d8c98b; padding: 6px 8px; }
  .empty { padding: 16px; text-align: center; color: #777; border: 1px dashed #ddd; border-radius: 6px; }
</style>
</head>
<body>
  <h1>سجل المصروفات</h1>
  <div class="meta">${filterParts.join(" · ")}</div>
  <div class="meta">تاريخ الطباعة: ${formatPlainDate(new Date())}</div>
  ${
    filteredDisbursements.length === 0
      ? '<div class="empty">لا توجد مصروفات مطابقة للفلاتر</div>'
      : `<table>
          <thead><tr>
            <th>التاريخ</th><th>النوع</th><th>البيان</th><th>التفاصيل</th><th>ملاحظات</th><th>المبلغ</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="5">الإجمالي</td><td class="amount neg">${esc(formatLYD(filteredDisbursementsTotal))}</td></tr></tfoot>
        </table>`
  }
  <script>
    window.addEventListener('load', function () { setTimeout(function () { window.focus(); window.print(); }, 150); });
  </script>
</body></html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function handlePrint() {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error("تعذر فتح نافذة الطباعة", { description: "تأكد من السماح بالنوافذ المنبثقة" });
      return;
    }
    const esc = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const receiptsRows = receiptItems
      .map((r) => {
        return `<tr>
          <td class="date">${formatPlainDate(r.date)}</td>
          <td>${esc(r.title)}</td>
          <td>${esc(r.subtitle)}</td>
          <td>${esc(r.method === "bank_transfer" ? "مصرف" : paymentMethodLabels[r.method] ?? "كاش")}</td>
          <td>${esc(r.notes || "—")}</td>
          <td class="amount pos">${esc(formatLYD(r.amount))}</td>
        </tr>`;
      })
      .join("");

    const disbursementRows = disbursements
      .map(
        (d) => `<tr>
          <td class="date">${formatPlainDate(d.date)}</td>
          <td>${d.kind === "expense" ? "مصروف عام" : "راتب عامل"}</td>
          <td>${esc(d.title)}</td>
          <td>${esc(d.subtitle)}</td>
          <td>${esc(d.notes ?? "—")}</td>
          <td class="amount neg">${esc(formatLYD(d.amount))}</td>
        </tr>`,
      )
      .join("");

    const debtorsRows = debtors
      .map(
        (d) => `<tr>
          <td>${esc(d.customerName)}</td>
          <td>${esc(eventTypeLabels[d.eventType] ?? d.eventType)}</td>
          <td class="date">${formatPlainDate(d.eventDate)}</td>
          <td class="amount">${esc(formatLYD(d.total))}</td>
          <td class="amount pos">${esc(formatLYD(d.paid))}</td>
          <td class="amount neg">${esc(formatLYD(d.remaining))}</td>
        </tr>`,
      )
      .join("");

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>كشف الخزينة — ${esc(periodLabel)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", "Tahoma", Arial, sans-serif; color: #111; margin: 0; padding: 0; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 22px 0 8px; border-bottom: 2px solid #b48a2b; padding-bottom: 4px; color: #5a4310; }
  .meta { color: #555; font-size: 12px; margin-bottom: 12px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; }
  .kpi .label { font-size: 11px; color: #666; }
  .kpi .value { font-size: 14px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f3ead4; color: #5a4310; text-align: right; padding: 6px 8px; border: 1px solid #d8c98b; font-weight: 700; }
  tbody td { padding: 6px 8px; border: 1px solid #e3e3e3; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .amount { text-align: left; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .date { white-space: nowrap; direction: ltr; unicode-bidi: isolate; text-align: right; }
  .pos { color: #1f7a3d; font-weight: 700; }
  .neg { color: #b03030; font-weight: 700; }
  tfoot td { background: #f3ead4; font-weight: 700; border: 1px solid #d8c98b; padding: 6px 8px; }
  .empty { padding: 16px; text-align: center; color: #777; border: 1px dashed #ddd; border-radius: 6px; }
  .note { font-size: 11px; color: #777; margin-top: 4px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <h1>كشف الخزينة — ${esc(periodLabel)}</h1>
  <div class="meta">تاريخ الطباعة: ${formatPlainDate(new Date())}</div>

  <div class="kpis">
    <div class="kpi"><div class="label">إجمالي المقبوضات</div><div class="value pos">${esc(formatLYD(totals.receipts))}</div><div class="label">مصرف: ${esc(formatLYD(totals.receiptsBank))} · كاش: ${esc(formatLYD(totals.receiptsCash))}</div></div>
    <div class="kpi"><div class="label">إجمالي المصروفات</div><div class="value neg">${esc(formatLYD(totals.disbursements))}</div></div>
    <div class="kpi"><div class="label">صافي الخزينة (رصيد كلي)</div><div class="value">${esc(formatLYD(treasuryBalance))}</div><div class="label">صافي الفترة: ${esc(formatLYD(totals.net))}</div></div>
    <div class="kpi"><div class="label">إجمالي المديونيات</div><div class="value neg">${esc(formatLYD(debtorsTotals.totalDue))}</div></div>
  </div>

  <h2>سجل المقبوضات (${receiptItems.length})</h2>
  ${
    receiptItems.length === 0
      ? '<div class="empty">لا توجد مقبوضات في هذه الفترة</div>'
      : `<table>
          <thead><tr>
            <th>التاريخ</th><th>العميل</th><th>المناسبة</th><th>طريقة الدفع</th><th>ملاحظات</th><th>المبلغ</th>
          </tr></thead>
          <tbody>${receiptsRows}</tbody>
          <tfoot>
            <tr><td colspan="5">إجمالي المقبوضات المصرفية</td><td class="amount pos">${esc(formatLYD(totals.receiptsBank))}</td></tr>
            <tr><td colspan="5">إجمالي المقبوضات النقدية</td><td class="amount pos">${esc(formatLYD(totals.receiptsCash))}</td></tr>
            <tr><td colspan="5">الإجمالي</td><td class="amount pos">${esc(formatLYD(totals.receipts))}</td></tr>
          </tfoot>
        </table>`
  }

  <h2>سجل المصروفات (${disbursements.length})</h2>
  ${
    disbursements.length === 0
      ? '<div class="empty">لا توجد مصروفات في هذه الفترة</div>'
      : `<table>
          <thead><tr>
            <th>التاريخ</th><th>النوع</th><th>البيان</th><th>التفاصيل</th><th>ملاحظات</th><th>المبلغ</th>
          </tr></thead>
          <tbody>${disbursementRows}</tbody>
          <tfoot><tr><td colspan="5">الإجمالي</td><td class="amount neg">${esc(formatLYD(totals.disbursements))}</td></tr></tfoot>
        </table>`
  }

  <h2>المديونيات القائمة (${debtors.length})</h2>
  <div class="note">* المديونيات رصيد لحظي لكل الحجوزات النشطة بصرف النظر عن الفترة المختارة.</div>
  ${
    debtors.length === 0
      ? '<div class="empty">لا توجد مديونيات</div>'
      : `<table>
          <thead><tr>
            <th>العميل</th><th>المناسبة</th><th>تاريخ الحجز</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th>
          </tr></thead>
          <tbody>${debtorsRows}</tbody>
          <tfoot><tr><td colspan="5">إجمالي المديونيات</td><td class="amount neg">${esc(formatLYD(debtorsTotals.totalDue))}</td></tr></tfoot>
        </table>`
  }

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.focus(); window.print(); }, 150);
    });
  </script>
</body>
</html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">جارٍ تحميل الخزينة...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            الخزينة
          </h1>
          <p className="text-sm text-muted-foreground">
            سجل المقبوضات والمصروفات وإجمالي المديونيات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأشهر</SelectItem>
              {ARABIC_MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[110px]">
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
          <Button
            onClick={handlePrint}
            variant="outline"
            className="gap-1"
            title="طباعة كشف الفترة المحددة"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={ArrowDownCircle}
          label="إجمالي المقبوضات"
          value={formatLYD(totals.receipts)}
          tone="success"
          hint={`مصرف: ${formatLYD(totals.receiptsBank)} · كاش: ${formatLYD(totals.receiptsCash)}`}
        />
        <KpiCard
          icon={ArrowUpCircle}
          label="إجمالي المصروفات"
          value={formatLYD(totals.disbursements)}
          tone="warning"
        />
        <KpiCard
          icon={Wallet}
          label="صافي الخزينة"
          value={formatLYD(treasuryBalance)}
          tone={treasuryBalance >= 0 ? "primary" : "destructive"}
          hint={`صافي الفترة: ${formatLYD(totals.net)}`}
        />
        <KpiCard
          icon={UsersIcon}
          label="إجمالي المديونيات"
          value={formatLYD(debtorsTotals.totalDue)}
          tone="destructive"
          hint={`${debtorsTotals.uniqueCustomers} عميل · ${debtorsTotals.bookingsCount} حجز`}
        />
      </div>

      <Tabs defaultValue="receipts" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="receipts">
            <ArrowDownCircle className="w-4 h-4 ml-1" /> القبض
          </TabsTrigger>
          <TabsTrigger value="disbursements">
            <ArrowUpCircle className="w-4 h-4 ml-1" /> الصرف
          </TabsTrigger>
          <TabsTrigger value="debtors">
            <UsersIcon className="w-4 h-4 ml-1" /> المديونيات
          </TabsTrigger>
        </TabsList>

        {/* القبض */}
        <TabsContent value="receipts" className="mt-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b bg-secondary/30 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">سجل المقبوضات</h3>
              <Badge variant="secondary">
                <LatinDigits>{receiptItems.length}</LatinDigits> عملية ·{" "}
                {formatLYD(totals.receipts)}
              </Badge>
            </div>
            {receiptItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                لا توجد مقبوضات في الفترة المحددة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-right">
                      <th className="p-3 font-semibold">التاريخ</th>
                      <th className="p-3 font-semibold">النوع</th>
                      <th className="p-3 font-semibold">البيان</th>
                      <th className="p-3 font-semibold">التفاصيل</th>
                      <th className="p-3 font-semibold">طريقة الدفع</th>
                      <th className="p-3 font-semibold text-left">المبلغ</th>
                      <th className="p-3 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptItems.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-secondary/20">
                        <td className="p-3 whitespace-nowrap">
                          <span dir="ltr" className="inline-block">
                            {formatPlainDate(r.date)}
                          </span>
                        </td>
                        <td className="p-3">
                          {r.kind === "booking" ? (
                            <Badge variant="outline">دفعة حجز</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-primary/5">
                              قبض عام
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 font-medium">{r.title}</td>
                        <td className="p-3 text-muted-foreground">{r.subtitle}</td>
                        <td className="p-3">
                          {r.method === "bank_transfer"
                            ? "مصرف"
                            : paymentMethodLabels[r.method] ?? "كاش"}
                        </td>
                        <td className="p-3 font-bold text-success text-left">
                          {formatLYD(r.amount)}
                        </td>
                        <td className="p-3 text-left">
                          {r.kind === "booking" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="تعديل الدفعة"
                              onClick={() => {
                                const realId = r.id.startsWith("p-") ? r.id.slice(2) : r.id;
                                const p = payments.find((x) => String(x.id) === String(realId));
                                if (!p) return;
                                setEditingBookingId(String(p.booking_id));
                                setEditingPayment({
                                  id: String(p.id),
                                  amount: Number(p.amount),
                                  payment_date: p.payment_date,
                                  method: p.method,
                                  notes: p.notes,
                                });
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td className="p-3" colSpan={5}>
                        إجمالي المقبوضات المصرفية
                      </td>
                      <td className="p-3 text-left font-semibold text-success">
                        {formatLYD(totals.receiptsBank)}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="p-3" colSpan={5}>
                        إجمالي المقبوضات النقدية
                      </td>
                      <td className="p-3 text-left font-semibold text-success">
                        {formatLYD(totals.receiptsCash)}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="border-t bg-muted/40 font-bold">
                      <td className="p-3" colSpan={5}>
                        الإجمالي
                      </td>
                      <td className="p-3 text-left text-success">{formatLYD(totals.receipts)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* الصرف */}
        <TabsContent value="disbursements" className="mt-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b bg-secondary/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">سجل المصروفات</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <LatinDigits>{filteredDisbursements.length}</LatinDigits> عملية ·{" "}
                    {formatLYD(filteredDisbursementsTotal)}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={handlePrintExpenses}
                    title="طباعة سجل المصروفات (بحسب الفلاتر)"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة المصروفات
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">من تاريخ</label>
                  <Input type="date" value={expFrom} onChange={(e) => setExpFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">إلى تاريخ</label>
                  <Input type="date" value={expTo} onChange={(e) => setExpTo(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">النوع</label>
                  <Select value={expKind} onValueChange={(v) => setExpKind(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="expense">مصروف عام</SelectItem>
                      <SelectItem value="salary">راتب عامل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">تصنيف المصروف</label>
                  <Select value={expCategory} onValueChange={setExpCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {Object.entries(expenseCategoryLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">&nbsp;</label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setExpFrom("");
                      setExpTo("");
                      setExpKind("all");
                      setExpCategory("all");
                    }}
                  >
                    إعادة تعيين الفلاتر
                  </Button>
                </div>
              </div>
            </div>
            {filteredDisbursements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                لا توجد مصروفات في الفترة المحددة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-right">
                      <th className="p-3 font-semibold">التاريخ</th>
                      <th className="p-3 font-semibold">النوع</th>
                      <th className="p-3 font-semibold">البيان</th>
                      <th className="p-3 font-semibold">التفاصيل</th>
                      <th className="p-3 font-semibold">ملاحظات</th>
                      <th className="p-3 font-semibold text-left">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDisbursements.map((d) => (
                      <tr key={d.id} className="border-t hover:bg-secondary/20">
                        <td className="p-3 whitespace-nowrap">
                          <span dir="ltr" className="inline-block">
                            {formatPlainDate(d.date)}
                          </span>
                        </td>
                        <td className="p-3">
                          {d.kind === "expense" ? (
                            <Badge variant="outline">مصروف عام</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-primary/5">
                              راتب عامل
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 font-medium">{d.title}</td>
                        <td className="p-3 text-muted-foreground">{d.subtitle}</td>
                        <td className="p-3 text-muted-foreground">{d.notes ?? "—"}</td>
                        <td className="p-3 font-bold text-warning text-left">
                          {formatLYD(d.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/40 font-bold">
                      <td className="p-3" colSpan={5}>
                        الإجمالي
                      </td>
                      <td className="p-3 text-left text-warning">
                        {formatLYD(filteredDisbursementsTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* المديونيات */}
        <TabsContent value="debtors" className="mt-6 space-y-4">
          <div className="text-xs text-muted-foreground">
            * المديونيات تُحسب على كل الحجوزات النشطة بصرف النظر عن فلتر الشهر/السنة (رصيد لحظي).
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث باسم العميل..."
              value={debtorSearch}
              onChange={(e) => setDebtorSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          {filteredDebtors.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              لا توجد مديونيات مطابقة
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-right">
                      <th className="p-3 font-semibold">العميل</th>
                      <th className="p-3 font-semibold">المناسبة</th>
                      <th className="p-3 font-semibold">تاريخ الحجز</th>
                      <th className="p-3 font-semibold text-left">الإجمالي</th>
                      <th className="p-3 font-semibold text-left">المدفوع</th>
                      <th className="p-3 font-semibold text-left">المتبقي</th>
                      <th className="p-3 font-semibold">الحالة</th>
                      <th className="p-3 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDebtors.map((d) => {
                      const isUnpaid = d.paid <= 0;
                      return (
                        <tr key={d.bookingId} className="border-t hover:bg-secondary/20">
                          <td className="p-3 font-medium">{d.customerName}</td>
                          <td className="p-3 text-muted-foreground">
                            {eventTypeLabels[d.eventType] ?? d.eventType}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span dir="ltr" className="inline-block">
                              {formatPlainDate(d.eventDate)}
                            </span>
                          </td>
                          <td className="p-3 text-left">{formatLYD(d.total)}</td>
                          <td className="p-3 text-left text-success">{formatLYD(d.paid)}</td>
                          <td className="p-3 text-left font-bold text-destructive">
                            {formatLYD(d.remaining)}
                          </td>
                          <td className="p-3">
                            <Badge
                              className={
                                isUnpaid
                                  ? "bg-destructive/15 text-destructive border-destructive/30 border"
                                  : "bg-warning/15 text-warning border-warning/30 border"
                              }
                            >
                              {isUnpaid ? "غير مدفوع" : "جزئي"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Button variant="ghost" size="sm" asChild>
                              <Link
                                to="/customers/$customerId"
                                params={{ customerId: d.customerId }}
                                className="inline-flex items-center gap-1"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                ملف العميل
                                <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/40 font-bold">
                      <td className="p-3" colSpan={5}>
                        إجمالي المديونيات
                      </td>
                      <td className="p-3 text-left text-destructive">
                        {formatLYD(debtorsTotals.totalDue)}
                      </td>
                      <td className="p-3" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <PaymentEditDialog
        open={!!editingPayment}
        onOpenChange={(o) => {
          if (!o) {
            setEditingPayment(null);
            setEditingBookingId(null);
          }
        }}
        payment={editingPayment}
        maxAllowed={editMaxAllowed}
        onSaved={() => {
          setEditingPayment(null);
          setEditingBookingId(null);
          loadData();
        }}
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof Wallet;
  label: string;
  value: React.ReactNode;
  tone: "primary" | "success" | "warning" | "destructive";
  hint?: string;
}) {
  const toneClasses: Record<typeof tone, string> = {
    primary: "from-primary/10 to-primary/5 text-primary border-primary/20",
    success: "from-success/10 to-success/5 text-success border-success/20",
    warning: "from-warning/10 to-warning/5 text-warning border-warning/20",
    destructive: "from-destructive/10 to-destructive/5 text-destructive border-destructive/20",
  };
  return (
    <Card className={`p-4 bg-gradient-to-br border ${toneClasses[tone]}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-background/60 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-bold text-lg leading-tight">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}
