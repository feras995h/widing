import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { eventTypeLabels } from "@/lib/format";
import { openBookingPrintWindow, printBookingReceipt } from "@/lib/print-booking-receipt";
import logo from "@/assets/logo.png";
import { createBookingFn, getCustomersFn, updateBookingFn } from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";

interface Customer {
  id: string;
  full_name: string;
  phone: string;
}

export interface EditingBooking {
  id: string;
  event_date: string;
  event_type: string;
  guests_count: number | null;
  total_price: number;
  notes: string | null;
  includes_hall: boolean;
  includes_catering: boolean;
  includes_decor: boolean;
  includes_photography: boolean;
  customer_phone2: string | null;
  customer_identity_number: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  customers: { full_name: string; phone: string };
}

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  onSaved: () => void;
  editingBooking?: EditingBooking | null;
}

export function BookingDialog({
  open,
  onOpenChange,
  defaultDate,
  onSaved,
  editingBooking,
}: BookingDialogProps) {
  const isEditMode = Boolean(editingBooking);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [totalPrice, setTotalPrice] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [eventDate, setEventDate] = useState<string>("");
  const [eventType, setEventType] = useState<string>("wedding");
  const [guestsCount, setGuestsCount] = useState<string>("");
  const [customerPhone2, setCustomerPhone2] = useState<string>("");
  const [customerIdentityNumber, setCustomerIdentityNumber] = useState<string>("");
  const [eventStartTime, setEventStartTime] = useState<string>("");
  const [eventEndTime, setEventEndTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [services, setServices] = useState({
    hall: true,
    catering: false,
    decor: false,
    photography: false,
  });

  useEffect(() => {
    if (!open) return;

    if (editingBooking) {
      setMode("existing");
      setTotalPrice(String(editingBooking.total_price ?? ""));
      setPaidAmount("");
      setEventDate(editingBooking.event_date?.slice(0, 10) ?? "");
      setEventType(editingBooking.event_type ?? "wedding");
      setGuestsCount(
        editingBooking.guests_count != null ? String(editingBooking.guests_count) : "",
      );
      setCustomerPhone2(editingBooking.customer_phone2 ?? "");
      setCustomerIdentityNumber(editingBooking.customer_identity_number ?? "");
      setEventStartTime(editingBooking.event_start_time ?? "");
      setEventEndTime(editingBooking.event_end_time ?? "");
      setNotes(editingBooking.notes ?? "");
      setServices({
        hall: editingBooking.includes_hall,
        catering: editingBooking.includes_catering,
        decor: editingBooking.includes_decor,
        photography: editingBooking.includes_photography,
      });
      return;
    }

    getCustomersFn({ headers: sessionHeaders() })
      .then((res) => setCustomers((res.customers as Customer[]) ?? []))
      .catch(() => setCustomers([]));
    setServices({ hall: true, catering: false, decor: false, photography: false });
    setMode("new");
    setTotalPrice("");
    setPaidAmount("");
    setEventDate(defaultDate ?? "");
    setEventType("wedding");
    setGuestsCount("");
    setCustomerPhone2("");
    setCustomerIdentityNumber("");
    setEventStartTime("");
    setEventEndTime("");
    setNotes("");
  }, [open, editingBooking, defaultDate]);

  const remaining = useMemo(() => {
    const t = parseFloat(totalPrice) || 0;
    const p = parseFloat(paidAmount) || 0;
    return Math.max(0, t - p);
  }, [totalPrice, paidAmount]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);

    const total = parseFloat(totalPrice) || 0;
    const paid = parseFloat(paidAmount) || 0;
    const parsedGuests = Number.parseInt(guestsCount, 10);
    const guestsCountValue = Number.isNaN(parsedGuests) ? null : parsedGuests;
    const trimmedPhone2 = customerPhone2.trim();
    const trimmedId = customerIdentityNumber.trim();
    const trimmedStart = eventStartTime.trim();
    const trimmedEnd = eventEndTime.trim();
    const trimmedNotes = notes.trim();

    // ------- EDIT MODE -------
    if (isEditMode && editingBooking) {
      try {
        await updateBookingFn({
          headers: sessionHeaders(),
          data: {
            bookingId: editingBooking.id,
            eventDate,
            eventType,
            guestsCount: guestsCountValue,
            totalPrice: total,
            customerPhone2: trimmedPhone2 || null,
            customerIdentityNumber: trimmedId || null,
            eventStartTime: trimmedStart || null,
            eventEndTime: trimmedEnd || null,
            notes: trimmedNotes || null,
            services,
          },
        });
        setLoading(false);
        toast.success("تم تحديث الحجز");
        onOpenChange(false);
        onSaved();
      } catch (err) {
        setLoading(false);
        const description = err instanceof Error ? err.message : "فشل تحديث الحجز";
        toast.error("فشل تحديث الحجز", { description });
      }
      return;
    }

    // ------- CREATE MODE -------
    // Open print window synchronously from user gesture to avoid popup blocking on subsequent prints.
    const preparedPrintWindow = openBookingPrintWindow();

    let customerId = fd.get("customer_id") as string;
    let customerName = "";
    let customerPhone = "";

    if (mode === "new") {
      customerName = (fd.get("full_name") as string).trim();
      customerPhone = (fd.get("phone") as string).trim();
    } else {
      const selectedCustomer = customers.find((c) => c.id === customerId);
      customerName = selectedCustomer?.full_name ?? "عميل";
      customerPhone = selectedCustomer?.phone ?? "-";
    }

    const selectedServices = [
      services.hall ? "إيجار القاعة" : null,
      services.catering ? "الطعام والضيافة" : null,
      services.decor ? "الديكور والزهور" : null,
      services.photography ? "التصوير والفيديو" : null,
    ].filter((s): s is string => Boolean(s));

    try {
      const newBooking = await createBookingFn({
        headers: sessionHeaders(),
        data: {
          mode,
          customerId: mode === "existing" ? customerId : undefined,
          customerName: mode === "new" ? customerName : undefined,
          customerPhone: mode === "new" ? customerPhone : undefined,
          eventDate,
          eventType,
          guestsCount: guestsCountValue,
          totalPrice: total,
          paidAmount: paid,
          customerPhone2: trimmedPhone2 || null,
          customerIdentityNumber: trimmedId || null,
          eventStartTime: trimmedStart || null,
          eventEndTime: trimmedEnd || null,
          notes: trimmedNotes || null,
          services,
        },
      });
      setLoading(false);
      toast.success("تم حفظ الحجز");

      try {
        printBookingReceipt(
          {
            hallName: "VELOURA VENUE",
            hallTagline: "FOR WEDDINGS & EVENTS",
            logoUrl: logo,
            receiptNo: newBooking.id.slice(0, 8).toUpperCase(),
            issuedAt: new Date().toISOString(),
            customerName,
            customerPhone,
            eventDate,
            eventType: eventType as keyof typeof eventTypeLabels,
            guestsCount: guestsCountValue,
            totalPrice: total,
            paidAmount: paid,
            remainingAmount: Math.max(0, total - paid),
            paymentStatus: total - paid <= 0 ? "full" : "partial",
            services: selectedServices,
            notes: trimmedNotes || null,
            customerPhone2: trimmedPhone2 || null,
            customerIdentityNumber: trimmedId || null,
            eventStartTime: trimmedStart || null,
            eventEndTime: trimmedEnd || null,
          } as Parameters<typeof printBookingReceipt>[0],
          preparedPrintWindow,
        );
      } catch (err) {
        if (preparedPrintWindow && !preparedPrintWindow.closed) preparedPrintWindow.close();
        const description = err instanceof Error ? err.message : "تعذر فتح نافذة الطباعة";
        toast.error("تم حفظ الحجز لكن فشل فتح الوصل للطباعة", { description });
      }

      onOpenChange(false);
      onSaved();
    } catch (err) {
      if (preparedPrintWindow && !preparedPrintWindow.closed) preparedPrintWindow.close();
      setLoading(false);
      const description = err instanceof Error ? err.message : "فشل حفظ الحجز";
      toast.error("فشل حفظ الحجز", { description });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditMode ? "تعديل الحجز" : "حجز جديد"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isEditMode && editingBooking ? (
            <div className="p-3 rounded-lg bg-secondary/40 text-sm">
              <span className="text-muted-foreground">العميل: </span>
              <span className="font-semibold">{editingBooking.customers.full_name}</span>
              <span className="text-muted-foreground"> — </span>
              <span dir="ltr">{editingBooking.customers.phone}</span>
            </div>
          ) : (
            <>
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${mode === "new" ? "bg-card shadow-sm" : ""}`}
                >
                  عميل جديد
                </button>
                <button
                  type="button"
                  onClick={() => setMode("existing")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${mode === "existing" ? "bg-card shadow-sm" : ""}`}
                >
                  عميل مسجل
                </button>
              </div>

              {mode === "new" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">اسم العميل *</Label>
                    <Input id="full_name" name="full_name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف *</Label>
                    <Input id="phone" name="phone" required dir="ltr" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>اختر العميل *</Label>
                  <Select name="customer_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عميل..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name} — {c.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_date">تاريخ المناسبة *</Label>
              <Input
                id="event_date"
                name="event_date"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>نوع المناسبة *</Label>
              <Select name="event_type" value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guests_count">عدد الضيوف</Label>
              <Input
                id="guests_count"
                name="guests_count"
                type="number"
                min={1}
                value={guestsCount}
                onChange={(e) => setGuestsCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_price">السعر الإجمالي (د.ل) *</Label>
              <Input
                id="total_price"
                name="total_price"
                type="number"
                min={0}
                step="0.01"
                required
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 p-4 bg-secondary/40 rounded-lg">
            <Label className="text-base">بيانات العقد الإضافية</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_phone2">رقم الهاتف 2</Label>
                <Input
                  id="customer_phone2"
                  name="customer_phone2"
                  dir="ltr"
                  value={customerPhone2}
                  onChange={(e) => setCustomerPhone2(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_identity_number">رقم الهوية</Label>
                <Input
                  id="customer_identity_number"
                  name="customer_identity_number"
                  dir="ltr"
                  value={customerIdentityNumber}
                  onChange={(e) => setCustomerIdentityNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_start_time">من الساعة</Label>
                <Input
                  id="event_start_time"
                  name="event_start_time"
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_end_time">إلى الساعة</Label>
                <Input
                  id="event_end_time"
                  name="event_end_time"
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {!isEditMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-secondary/40 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="paid_amount">المبلغ المدفوع (د.ل)</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remaining_amount">المبلغ المتبقي (د.ل)</Label>
                <Input
                  id="remaining_amount"
                  type="number"
                  value={remaining.toFixed(2)}
                  readOnly
                  className="bg-muted font-semibold"
                />
              </div>
            </div>
          )}

          <div className="space-y-3 p-4 bg-secondary/40 rounded-lg">
            <Label className="text-base">الخدمات المطلوبة</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "hall", label: "إيجار القاعة" },
                { key: "catering", label: "الطعام والضيافة" },
                { key: "decor", label: "الديكور والزهور" },
                { key: "photography", label: "التصوير والفيديو" },
              ].map((s) => (
                <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={services[s.key as keyof typeof services]}
                    onCheckedChange={(v) => setServices({ ...services, [s.key]: !!v })}
                  />
                  <span className="text-sm">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {isEditMode ? "حفظ التعديلات" : "حفظ الحجز"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
