import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LatinDigits } from "@/components/LatinDigits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Phone, User, Calendar, ChevronLeft } from "lucide-react";
import {
  formatLYD,
  formatShortDate,
  eventTypeLabels,
  paymentMethodLabels,
  statusLabels,
  statusColors,
} from "@/lib/format";
import { getCustomerDetailFn } from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";
import { toast } from "sonner";

/* مسار /customers/$id مباشر من الجذر (customers_…) حتى يعمل التوجيه دون <Outlet> في customers.tsx */
export const Route = createFileRoute("/customers_/$customerId")({
  component: () => (
    <AppLayout requireOwner>
      <CustomerDetailPage />
    </AppLayout>
  ),
});

interface PaymentRow {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  notes: string | null;
}

interface BookingRow {
  id: string;
  event_date: string;
  event_type: string;
  guests_count: number | null;
  total_price: number;
  status: string;
  includes_hall: boolean;
  includes_catering: boolean;
  includes_decor: boolean;
  includes_photography: boolean;
  notes: string | null;
  payments: PaymentRow[];
}

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<{
    id: string;
    full_name: string;
    phone: string;
    notes: string | null;
  } | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  useEffect(() => {
    getCustomerDetailFn({ headers: sessionHeaders(), data: { customerId } })
      .then((res: any) => {
        const cu = res.customer as {
          id: string;
          full_name: string;
          phone: string;
          notes: string | null;
        };
        setCustomer(cu);
        setBookings((res.bookings as BookingRow[]) ?? []);
        setLoading(false);
      })
      .catch((e: unknown) => {
        toast.error("تعذر تحميل بيانات العميل", {
          description: e instanceof Error ? e.message : "",
        });
        setLoading(false);
      });
  }, [customerId]);

  const totals = useMemo(() => {
    const totalValue = bookings.reduce((s, b) => s + Number(b.total_price), 0);
    const totalPaid = bookings.reduce(
      (s, b) => s + b.payments.reduce((p, x) => p + Number(x.amount), 0),
      0,
    );
    return { totalValue, totalPaid, due: totalValue - totalPaid };
  }, [bookings]);

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">جارٍ التحميل...</div>;
  }
  if (!customer) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">العميل غير موجود</p>
        <Button asChild variant="outline">
          <Link to="/customers">العودة للقائمة</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/customers" className="gap-1">
            <ChevronLeft className="w-4 h-4" /> العملاء
          </Link>
        </Button>
      </div>

      <Card className="p-5 sm:p-6 shadow-elegant">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0">
            {customer.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 opacity-60" />
              {customer.full_name}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1" dir="ltr">
              <Phone className="w-4 h-4" />
              <LatinDigits>{customer.phone}</LatinDigits>
            </p>
            {customer.notes && (
              <p className="mt-3 text-sm p-3 bg-secondary/50 rounded-lg">{customer.notes}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-6 pt-6 border-t">
          <div>
            <p className="text-xs text-muted-foreground">إجمالي الحجوزات</p>
            <p className="font-bold text-primary text-sm sm:text-base">
              {formatLYD(totals.totalValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">المدفوع</p>
            <p className="font-bold text-success text-sm sm:text-base">
              {formatLYD(totals.totalPaid)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">المتبقي</p>
            <p className="font-bold text-warning text-sm sm:text-base">{formatLYD(totals.due)}</p>
          </div>
        </div>
      </Card>

      <h2 className="text-lg font-bold flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        الحجوزات والدفعات
      </h2>

      {bookings.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">لا توجد حجوزات</Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const paid = b.payments.reduce((s, p) => s + Number(p.amount), 0);
            const rem = Math.max(0, Number(b.total_price) - paid);
            return (
              <Card key={b.id} className="overflow-hidden">
                <div className="p-4 sm:p-5 border-b bg-secondary/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold">{formatShortDate(b.event_date)}</p>
                      <p className="text-sm text-muted-foreground">
                        {eventTypeLabels[b.event_type] ?? b.event_type}
                        {b.guests_count != null && (
                          <>
                            {" "}
                            · <LatinDigits>{b.guests_count}</LatinDigits> ضيف
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-left sm:text-right space-y-1">
                      <div className="flex justify-end">
                        <Badge className={`border ${statusColors[b.status] ?? statusColors.confirmed}`}>
                          {statusLabels[b.status] ?? b.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">قيمة الحجز</p>
                      <p className="font-bold text-primary">{formatLYD(b.total_price)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {b.includes_hall && <Badge variant="secondary">قاعة</Badge>}
                    {b.includes_catering && <Badge variant="secondary">ضيافة</Badge>}
                    {b.includes_decor && <Badge variant="secondary">ديكور</Badge>}
                    {b.includes_photography && <Badge variant="secondary">تصوير</Badge>}
                  </div>
                  {b.notes && (
                    <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{b.notes}</p>
                  )}
                </div>
                <div className="p-4 sm:p-5 space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">دفعات الحجز</p>
                  {b.payments.length === 0 ? (
                    <p className="text-sm text-destructive">لا توجد دفعات مسجّلة</p>
                  ) : (
                    <div className="space-y-2">
                      {b.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex flex-wrap justify-between gap-2 text-sm p-2 rounded-md bg-success/5 border border-success/10"
                        >
                          <span className="text-muted-foreground">
                            {formatShortDate(p.payment_date)} ·{" "}
                            {paymentMethodLabels[p.method] ?? p.method}
                            {p.notes && ` · ${p.notes}`}
                          </span>
                          <span className="font-bold text-success dir-ltr">{formatLYD(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span>متبقي على هذا الحجز</span>
                    <span className={`font-bold ${rem > 0 ? "text-warning" : "text-success"}`}>
                      {formatLYD(rem)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="pb-4">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/customers" className="gap-1">
            <ArrowRight className="w-4 h-4" />
            العودة لقائمة العملاء
          </Link>
        </Button>
      </div>
    </div>
  );
}
