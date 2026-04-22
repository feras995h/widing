import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { formatLYD, paymentMethodLabels } from "@/lib/format";
import { createPaymentFn } from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  remaining: number;
  onSaved: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  bookingId,
  remaining,
  onSaved,
}: PaymentDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await createPaymentFn({
        headers: sessionHeaders(),
        data: {
          bookingId,
          amount: parseFloat(fd.get("amount") as string),
          paymentDate: fd.get("payment_date") as string,
          method: fd.get("method") as "cash" | "bank_transfer" | "card" | "other",
          notes: (fd.get("notes") as string) || null,
        },
      });
      toast.success("تم تسجيل الدفعة");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const description = err instanceof Error ? err.message : "فشل تسجيل الدفعة";
      toast.error("فشل تسجيل الدفعة", { description });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-secondary/40 rounded-lg text-sm">
            <span className="text-muted-foreground">المبلغ المتبقي: </span>
            <span className="font-bold text-primary">{formatLYD(remaining)}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">مبلغ الدفعة (د.ل) *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0.01}
              step="0.01"
              max={remaining}
              required
              defaultValue={remaining}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_date">تاريخ الدفع *</Label>
            <Input
              id="payment_date"
              name="payment_date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label>طريقة الدفع *</Label>
            <Select name="method" defaultValue="cash">
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
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              تسجيل الدفعة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
