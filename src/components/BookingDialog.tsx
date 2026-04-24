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
import { createBookingFn, getCustomersFn } from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";

interface Customer {
  id: string;
  full_name: string;
  phone: string;
}

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  onSaved: () => void;
}

export function BookingDialog({ open, onOpenChange, defaultDate, onSaved }: BookingDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [totalPrice, setTotalPrice] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [services, setServices] = useState({
    hall: true,
    catering: false,
    decor: false,
    photography: false,
  });

  useEffect(() => {
    if (open) {
      getCustomersFn({ headers: sessionHeaders() })
        .then((res) => setCustomers((res.customers as Customer[]) ?? []))
        .catch(() => setCustomers([]));
      setServices({ hall: true, catering: false, decor: false, photography: false });
      setMode("new");
      setTotalPrice("");
      setPaidAmount("");
    }
  }, [open]);

  const remaining = useMemo(() => {
    const t = parseFloat(totalPrice) || 0;
    const p = parseFloat(paidAmount) || 0;
    return Math.max(0, t - p);
  }, [totalPrice, paidAmount]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
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

    const total = parseFloat(totalPrice) || 0;
    const paid = parseFloat(paidAmount) || 0;
    const guestsRaw = fd.get("guests_count") as string;
    const parsedGuests = Number.parseInt(guestsRaw, 10);
    const guestsCount = Number.isNaN(parsedGuests) ? null : parsedGuests;
    const eventDate = fd.get("event_date") as string;
    const eventType = fd.get("event_type") as keyof typeof eventTypeLabels;
    const customerPhone2 = ((fd.get("customer_phone2") as string) || "").trim();
    const customerIdentityNumber = ((fd.get("customer_identity_number") as string) || "").trim();
    const eventStartTime = ((fd.get("event_start_time") as string) || "").trim();
    const eventEndTime = ((fd.get("event_end_time") as string) || "").trim();
    const notes = ((fd.get("notes") as string) || "").trim();
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
          guestsCount,
          totalPrice: total,
          paidAmount: paid,
          customerPhone2: customerPhone2 || null,
          customerIdentityNumber: customerIdentityNumber || null,
          eventStartTime: eventStartTime || null,
          eventEndTime: eventEndTime || null,
          notes: notes || null,
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
            eventType: eventTypeLabels[eventType] ?? "مناسبة",
            guestsCount,
            totalPrice: total,
            paidAmount: paid,
            remainingAmount: Math.max(0, total - paid),
            paymentStatus: total - paid <= 0 ? "full" : "partial",
            services: selectedServices,
            notes: notes || null,
            customerPhone2: customerPhone2 || null,
            customerIdentityNumber: customerIdentityNumber || null,
            eventStartTime: eventStartTime || null,
            eventEndTime: eventEndTime || null,
          },
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
          <DialogTitle className="text-xl">حجز جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_date">تاريخ المناسبة *</Label>
              <Input
                id="event_date"
                name="event_date"
                type="date"
                required
                defaultValue={defaultDate}
              />
            </div>
            <div className="space-y-2">
              <Label>نوع المناسبة *</Label>
              <Select name="event_type" defaultValue="wedding">
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
              <Input id="guests_count" name="guests_count" type="number" min={1} />
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
                <Input id="customer_phone2" name="customer_phone2" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_identity_number">رقم الهوية</Label>
                <Input id="customer_identity_number" name="customer_identity_number" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_start_time">من الساعة</Label>
                <Input id="event_start_time" name="event_start_time" type="time" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_end_time">إلى الساعة</Label>
                <Input id="event_end_time" name="event_end_time" type="time" />
              </div>
            </div>
          </div>

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
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حفظ الحجز
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
