import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LatinDigits } from "@/components/LatinDigits";
import { BookingDialog } from "@/components/BookingDialog";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  CalendarDays,
  DollarSign,
  Users,
  TrendingUp,
  Wallet,
  Search,
} from "lucide-react";
import {
  formatLYD,
  eventTypeLabels,
  statusLabels,
  statusColors,
  formatShortDate,
  localDateKey,
  partsFromYmd,
  eventDateYmd,
} from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { openBookingPrintWindow, printBookingReceipt } from "@/lib/print-booking-receipt";
import logo from "@/assets/logo.png";
import { cancelBookingFn, getDashboardBookingsFn } from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  ),
});

interface Booking {
  id: string;
  customer_id: string;
  event_date: string;
  event_type: string;
  guests_count: number | null;
  total_price: number;
  status: string;
  includes_hall: boolean;
  includes_catering: boolean;
  includes_decor: boolean;
  includes_photography: boolean;
  customer_phone2: string | null;
  customer_identity_number: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  notes: string | null;
  customers: { full_name: string; phone: string };
  payments: { amount: number }[];
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
const ARABIC_DAYS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookingOpen, setBookingOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  function filterBookingsByCustomerSearch(list: Booking[]) {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.customers.full_name.toLowerCase().includes(q) ||
        b.customers.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
  }

  async function loadBookings() {
    try {
      const res = await getDashboardBookingsFn({ headers: sessionHeaders() });
      setBookings((res.bookings as Booking[]) ?? []);
    } catch {
      toast.error("فشل تحميل الحجوزات");
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [currentMonth]);

  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled"),
    [bookings],
  );

  const searchMatches = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return [];
    const digitsQuery = q.replace(/\s/g, "");
    return activeBookings
      .filter(
        (b) =>
          b.customers.full_name.toLowerCase().includes(q) ||
          b.customers.phone.replace(/\s/g, "").includes(digitsQuery),
      )
      .sort((a, b) => {
        const pa = partsFromYmd(a.event_date);
        const pb = partsFromYmd(b.event_date);
        if (!pa || !pb) return 0;
        const da = new Date(pa.y, pa.m0, pa.d).getTime();
        const db = new Date(pb.y, pb.m0, pb.d).getTime();
        return da - db;
      });
  }, [activeBookings, customerSearch]);

  useEffect(() => {
    if (searchMatches.length === 0) return;
    const target = partsFromYmd(searchMatches[0].event_date);
    if (!target) return;
    if (currentMonth.getFullYear() === target.y && currentMonth.getMonth() === target.m0) return;
    setCurrentMonth(new Date(target.y, target.m0, 1));
  }, [searchMatches, currentMonth]);

  function bookingsOnDay(date: Date | null) {
    if (!date) return [];
    const key = localDateKey(date);
    return activeBookings.filter((b) => eventDateYmd(b.event_date) === key);
  }

  const monthBookings = activeBookings.filter((b) => {
    const p = partsFromYmd(b.event_date);
    if (!p) return false;
    return p.m0 === currentMonth.getMonth() && p.y === currentMonth.getFullYear();
  });

  const stats = useMemo(() => {
    const total = monthBookings.reduce((s, b) => s + Number(b.total_price), 0);
    const paid = monthBookings.reduce(
      (s, b) => s + b.payments.reduce((p, x) => p + Number(x.amount), 0),
      0,
    );
    return {
      count: monthBookings.length,
      total,
      paid,
      remaining: total - paid,
    };
  }, [monthBookings]);

  const today = new Date();
  const todayKey = localDateKey(today);

  function handleReprintReceipt(booking: Booking) {
    const paid = booking.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Math.max(0, Number(booking.total_price) - paid);
    const services = [
      booking.includes_hall ? "إيجار القاعة" : null,
      booking.includes_catering ? "الطعام والضيافة" : null,
      booking.includes_decor ? "الديكور والزهور" : null,
      booking.includes_photography ? "التصوير والفيديو" : null,
    ].filter((s): s is string => Boolean(s));

    try {
      const preparedPrintWindow = openBookingPrintWindow();
      printBookingReceipt(
        {
          hallName: "VELOURA VENUE",
          hallTagline: "FOR WEDDINGS & EVENTS",
          logoUrl: logo,
          receiptNo: booking.id.slice(0, 8).toUpperCase(),
          issuedAt: new Date().toISOString(),
          customerName: booking.customers.full_name,
          customerPhone: booking.customers.phone,
          eventDate: booking.event_date,
          eventType: eventTypeLabels[booking.event_type] ?? "مناسبة",
          guestsCount: booking.guests_count,
          totalPrice: Number(booking.total_price),
          paidAmount: paid,
          remainingAmount: remaining,
          paymentStatus: remaining <= 0 ? "full" : "partial",
          services,
          notes: booking.notes,
          customerPhone2: booking.customer_phone2,
          customerIdentityNumber: booking.customer_identity_number,
          eventStartTime: booking.event_start_time,
          eventEndTime: booking.event_end_time,
        },
        preparedPrintWindow,
      );
    } catch (err) {
      const description = err instanceof Error ? err.message : "تعذر فتح نافذة الطباعة";
      toast.error("فشل إعادة طباعة الوصل", { description });
    }
  }

  async function handleCancelBooking(booking: Booking) {
    const ok = window.confirm(
      `هل تريد إلغاء حجز ${booking.customers.full_name}؟\nسيبقى الحجز محفوظًا في السجل كـ (ملغى).`,
    );
    if (!ok) return;
    try {
      await cancelBookingFn({ headers: sessionHeaders(), data: { bookingId: booking.id } });
      toast.success("تم إلغاء الحجز وأرشفته");
      setSelectedBooking(null);
      await loadBookings();
    } catch (err) {
      const description = err instanceof Error ? err.message : "تعذر إلغاء الحجز";
      toast.error("فشل إلغاء الحجز", { description });
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={CalendarDays}
          label="حجوزات الشهر"
          value={<LatinDigits>{stats.count}</LatinDigits>}
          color="primary"
        />
        <StatCard icon={DollarSign} label="إجمالي" value={formatLYD(stats.total)} color="gold" />
        <StatCard icon={TrendingUp} label="المحصّل" value={formatLYD(stats.paid)} color="success" />
        <StatCard
          icon={Wallet}
          label="المتبقي"
          value={formatLYD(stats.remaining)}
          color="warning"
        />
      </div>

      {/* Calendar */}
      <Card className="p-4 sm:p-6 shadow-elegant">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
              }
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <h2 className="text-lg sm:text-2xl font-bold text-center">
              {ARABIC_MONTHS[currentMonth.getMonth()]}{" "}
              <LatinDigits className="font-bold">{currentMonth.getFullYear()}</LatinDigits>
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
              }
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
              اليوم
            </Button>
        </div>
        <Button
            onClick={() => {
              setDefaultDate(todayKey);
              setBookingOpen(true);
            }}
            className="bg-gradient-primary"
          >
            <Plus className="w-4 h-4 ml-1" /> حجز جديد
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="بحث عن عميل (اسم أو رقم هاتف) — يُصفّي أيام التقويم"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="pr-10 bg-background/80"
            dir="rtl"
          />
          {customerSearch.trim() && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-7 text-xs"
              onClick={() => setCustomerSearch("")}
            >
              إلغاء
            </Button>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {ARABIC_DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs sm:text-sm font-semibold text-muted-foreground py-2"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day, i) => {
            const dayBookings = filterBookingsByCustomerSearch(bookingsOnDay(day));
            const isToday = day && localDateKey(day) === todayKey;
            const hasBookings = dayBookings.length > 0;
            // Determine payment status across all bookings of the day
            let paymentState: "empty" | "paid" | "partial" | "unpaid" = "empty";
            if (hasBookings) {
              const totals = dayBookings.reduce(
                (acc, b) => {
                  const p = b.payments.reduce((s, x) => s + Number(x.amount), 0);
                  acc.total += Number(b.total_price);
                  acc.paid += p;
                  return acc;
                },
                { total: 0, paid: 0 },
              );
              if (totals.paid <= 0) paymentState = "unpaid";
              else if (totals.paid >= totals.total) paymentState = "paid";
              else paymentState = "partial";
            }
            const stateStyles: Record<typeof paymentState, string> = {
              empty: "border-[#d8d8d8] bg-[#f6f7f8] hover:border-[#b8b8b8] hover:bg-[#eef0f2]",
              paid: "border-[#67c28b] bg-[#e8f7ee] hover:border-[#3ca66a]",
              partial: "border-[#d4a53f] bg-[#fff5e2] hover:border-[#ba8a2b]",
              unpaid: "border-[#e07a7a] bg-[#fdecec] hover:border-[#cf5b5b]",
            };
            const dotColor: Record<typeof paymentState, string> = {
              empty: "bg-[#b4b7bb]",
              paid: "bg-[#2e9e5f]",
              partial: "bg-[#c58a1c]",
              unpaid: "bg-[#cf4a4a]",
            };
            const pillColor: Record<typeof paymentState, string> = {
              empty: "bg-primary text-primary-foreground",
              paid: "bg-[#2e9e5f] text-white",
              partial: "bg-[#c58a1c] text-white",
              unpaid: "bg-[#cf4a4a] text-white",
            };
            return (
              <button
                key={i}
                disabled={!day}
                onClick={() => {
                  if (!day) return;
                  if (dayBookings.length > 0) {
                    setSelectedBooking(dayBookings[0]);
                  } else {
                    setDefaultDate(localDateKey(day));
                    setBookingOpen(true);
                  }
                }}
                className={cn(
                  "aspect-square sm:min-h-[90px] p-1 sm:p-2 rounded-lg border text-right transition-all relative overflow-hidden",
                  !day && "invisible",
                  !hasBookings && !isToday && stateStyles.empty,
                  hasBookings && stateStyles[paymentState],
                  isToday && "ring-2 ring-primary ring-offset-1",
                )}
              >
                {day && (
                  <>
                    <div className={cn("text-xs sm:text-sm font-bold", isToday && "text-primary")}>
                      <LatinDigits>{day.getDate()}</LatinDigits>
                    </div>
                    {hasBookings && (
                      <div className="mt-1 space-y-0.5 hidden sm:block">
                        {dayBookings.slice(0, 2).map((b) => (
                          <div
                            key={b.id}
                            className={cn(
                              "text-[10px] rounded px-1 py-0.5 truncate",
                              pillColor[paymentState],
                            )}
                          >
                            {b.customers.full_name}
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">
                            +<LatinDigits>{dayBookings.length - 2}</LatinDigits>
                          </div>
                        )}
                      </div>
                    )}
                    {hasBookings && (
                      <div className="sm:hidden absolute bottom-1 left-1 right-1 flex justify-center">
                        <span className={cn("w-1.5 h-1.5 rounded-full", dotColor[paymentState])} />
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <LegendItem color="bg-[#2e9e5f]" label="مدفوع بالكامل" />
          <LegendItem color="bg-[#c58a1c]" label="مدفوع جزئياً" />
          <LegendItem color="bg-[#cf4a4a]" label="غير مدفوع" />
          <LegendItem color="bg-[#b4b7bb]" label="يوم فارغ" />
        </div>
      </Card>

      {/* This month list */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-bold mb-4">حجوزات الشهر</h3>
        {monthBookings.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">لا توجد حجوزات هذا الشهر</p>
        ) : (
          <div className="space-y-2">
            {monthBookings.map((b) => {
              const paid = b.payments.reduce((s, p) => s + Number(p.amount), 0);
              const remaining = Number(b.total_price) - paid;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/40 transition text-right"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-gradient-primary text-primary-foreground flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs">
                        {(() => {
                          const p = partsFromYmd(b.event_date);
                          return p ? ARABIC_MONTHS[p.m0].slice(0, 3) : "—";
                        })()}
                      </span>
                      <span className="text-base font-bold leading-none">
                        <LatinDigits>
                          {partsFromYmd(b.event_date)?.d ?? "—"}
                        </LatinDigits>
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{b.customers.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {eventTypeLabels[b.event_type]} •{" "}
                        {b.guests_count == null ? "—" : <LatinDigits>{b.guests_count}</LatinDigits>}{" "}
                        ضيف
                      </p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-bold text-primary text-sm">{formatLYD(b.total_price)}</p>
                    {remaining > 0 ? (
                      <p className="text-xs text-warning">متبقي {formatLYD(remaining)}</p>
                    ) : (
                      <p className="text-xs text-success">مدفوع بالكامل</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        defaultDate={defaultDate}
        onSaved={loadBookings}
      />

      <Sheet open={!!selectedBooking} onOpenChange={(o) => !o && setSelectedBooking(null)}>
        <SheetContent side="left" className="overflow-y-auto w-full sm:max-w-md">
          {selectedBooking &&
            (() => {
              const paid = selectedBooking.payments.reduce((s, p) => s + Number(p.amount), 0);
              const remaining = Number(selectedBooking.total_price) - paid;
              return (
                <>
                  <SheetHeader>
                    <SheetTitle className="text-xl">
                      {selectedBooking.customers.full_name}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={cn("border", statusColors[selectedBooking.status])}>
                        {statusLabels[selectedBooking.status]}
                      </Badge>
                      <Badge variant="outline">{eventTypeLabels[selectedBooking.event_type]}</Badge>
                    </div>
                    <Card className="p-4 space-y-2 bg-secondary/40">
                      <Row label="التاريخ" value={formatShortDate(selectedBooking.event_date)} />
                      <Row
                        label="الهاتف"
                        value={<LatinDigits>{selectedBooking.customers.phone}</LatinDigits>}
                      />
                      <Row
                        label="عدد الضيوف"
                        value={
                          selectedBooking.guests_count == null ? (
                            "—"
                          ) : (
                            <LatinDigits>{selectedBooking.guests_count}</LatinDigits>
                          )
                        }
                      />
                    </Card>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">الخدمات</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedBooking.includes_hall && <Badge variant="secondary">القاعة</Badge>}
                        {selectedBooking.includes_catering && (
                          <Badge variant="secondary">الطعام</Badge>
                        )}
                        {selectedBooking.includes_decor && (
                          <Badge variant="secondary">الديكور</Badge>
                        )}
                        {selectedBooking.includes_photography && (
                          <Badge variant="secondary">التصوير</Badge>
                        )}
                      </div>
                    </div>
                    <Card className="p-4 space-y-3 bg-gradient-to-br from-primary/5 to-gold/10 border-primary/20">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">السعر الإجمالي</span>
                        <span className="font-bold">{formatLYD(selectedBooking.total_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المدفوع</span>
                        <span className="font-bold text-success">{formatLYD(paid)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">المتبقي</span>
                        <span className="font-bold text-warning">{formatLYD(remaining)}</span>
                      </div>
                    </Card>
                    {selectedBooking.notes && (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
                        {selectedBooking.notes}
                      </div>
                    )}
                    {remaining > 0 && (
                      <Button
                        onClick={() => setPaymentOpen(true)}
                        className="w-full bg-gradient-gold text-gold-foreground"
                      >
                        <Plus className="w-4 h-4 ml-1" /> تسجيل دفعة
                      </Button>
                    )}
                    {selectedBooking.status !== "cancelled" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingBooking(selectedBooking);
                            setSelectedBooking(null);
                            setBookingOpen(true);
                          }}
                          className="w-full"
                        >
                          تعديل الحجز
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleCancelBooking(selectedBooking)}
                          className="w-full"
                        >
                          إلغاء الحجز (أرشفة)
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleReprintReceipt(selectedBooking)}
                      className="w-full"
                    >
                      إعادة طباعة وصل الحجز
                    </Button>
                  </div>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>

      {selectedBooking && (
        <PaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          bookingId={selectedBooking.id}
          remaining={
            Number(selectedBooking.total_price) -
            selectedBooking.payments.reduce((s, p) => s + Number(p.amount), 0)
          }
          onSaved={() => {
            loadBookings();
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium" dir="ltr">
        {value}
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-3 h-3 rounded-sm", color)} />
      <span>{label}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: ReactNode;
  color: "primary" | "gold" | "success" | "warning";
}) {
  const colorMap = {
    primary: "from-primary/10 to-primary/5 border-primary/20 text-primary",
    gold: "from-gold/15 to-gold/5 border-gold/30 text-gold-foreground",
    success: "from-success/10 to-success/5 border-success/20 text-success",
    warning: "from-warning/10 to-warning/5 border-warning/20 text-warning",
  };
  return (
    <Card className={cn("p-3 sm:p-4 bg-gradient-to-br border", colorMap[color])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 opacity-70" />
        <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-base sm:text-xl font-bold">{value}</p>
    </Card>
  );
}
