import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { formatLYD, paymentMethodLabels } from "@/lib/format";
import { deletePaymentFn, updatePaymentFn } from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";

export interface EditablePayment {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  notes: string | null;
}

interface PaymentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: EditablePayment | null;
  /** أقصى مبلغ مسموح به = (الإجمالي - المدفوعات الأخرى). يتيح للمستخدم رفع/خفض المبلغ بحدود المتبقي. */
  maxAllowed: number;
  onSaved: () => void;
}

export function PaymentEditDialog({
  open,
  onOpenChange,
  payment,
  maxAllowed,
  onSaved,
}: PaymentEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [method, setMethod] = useState<string>("cash");

  useEffect(() => {
    if (payment) setMethod(payment.method || "cash");
  }, [payment]);

  if (!payment) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!payment) return;
    const fd = new FormData(e.currentTarget);
    const amount = parseFloat(fd.get("amount") as string);
    if (!(amount > 0)) {
      toast.error("المبلغ يجب أن يكون أكبر من صفر");
      return;
    }
    if (amount > maxAllowed + 0.0001) {
      toast.error("المبلغ يتجاوز المتبقي على الحجز", {
        description: `الحد الأقصى المسموح: ${formatLYD(maxAllowed)}`,
      });
      return;
    }
    setLoading(true);
    try {
      await updatePaymentFn({
        headers: sessionHeaders(),
        data: {
          paymentId: payment.id,
          amount,
          paymentDate: fd.get("payment_date") as string,
          method,
          notes: ((fd.get("notes") as string) || "").trim() || null,
        },
      });
      toast.success("تم تحديث الدفعة");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل تحديث الدفعة";
      toast.error("فشل تحديث الدفعة", { description });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!payment) return;
    const ok = window.confirm(
      `هل تريد حذف دفعة بقيمة ${formatLYD(payment.amount)}؟ لا يمكن التراجع.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deletePaymentFn({
        headers: sessionHeaders(),
        data: { paymentId: payment.id },
      });
      toast.success("تم حذف الدفعة");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل حذف الدفعة";
      toast.error("فشل حذف الدفعة", { description });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل الدفعة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-secondary/40 rounded-lg text-sm">
            <span className="text-muted-foreground">الحد الأقصى المسموح: </span>
            <span className="font-bold text-primary">{formatLYD(maxAllowed)}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">مبلغ الدفعة (د.ل) *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              defaultValue={payment.amount}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_date">تاريخ الدفع *</Label>
            <Input
              id="payment_date"
              name="payment_date"
              type="date"
              required
              defaultValue={payment.payment_date.slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label>طريقة الدفع *</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentMethodLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={payment.notes ?? ""} />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || loading}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Trash2 className="w-4 h-4 ml-2" />
              )}
              حذف الدفعة
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading || deleting} className="bg-gradient-primary">
                {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                حفظ التعديلات
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
