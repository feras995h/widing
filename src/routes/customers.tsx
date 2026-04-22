import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LatinDigits } from "@/components/LatinDigits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Calendar as CalIcon, User, FileText, ChevronLeft } from "lucide-react";
import { formatLYD } from "@/lib/format";
import { getCustomersReportFn } from "@/lib/coolify-data";
import { sessionHeaders } from "@/lib/client-session";

export const Route = createFileRoute("/customers")({
  component: () => (
    <AppLayout requireOwner>
      <CustomersPage />
    </AppLayout>
  ),
});

interface CustomerRow {
  id: string;
  full_name: string;
  phone: string;
  notes: string | null;
  bookings: {
    id: string;
    total_price: number;
    event_date: string;
    payments: { amount: number }[];
  }[];
}

function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomersReportFn({ headers: sessionHeaders() })
      .then((res) => {
        setCustomers((res.customers as CustomerRow[]) ?? []);
        setLoading(false);
      })
      .catch(() => {
        setCustomers([]);
        setLoading(false);
      });
  }, []);

  const filtered = customers.filter(
    (c) => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">العملاء</h1>
          <p className="text-sm text-muted-foreground">قائمة جميع العملاء وحجوزاتهم</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <User className="w-3.5 h-3.5 ml-1" />
          <LatinDigits>{customers.length}</LatinDigits> عميل
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ابحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">لا توجد نتائج</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const total = c.bookings.reduce((s, b) => s + Number(b.total_price), 0);
            const paid = c.bookings.reduce(
              (s, b) => s + b.payments.reduce((p, x) => p + Number(x.amount), 0),
              0,
            );
            return (
              <Card key={c.id} className="p-4 hover:shadow-elegant transition flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      {c.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold">{c.full_name}</p>
                      <p
                        className="text-sm text-muted-foreground flex items-center gap-1"
                        dir="ltr"
                      >
                        <Phone className="w-3 h-3" />
                        <LatinDigits>{c.phone}</LatinDigits>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    <CalIcon className="w-3 h-3 ml-1" />
                    <LatinDigits>{c.bookings.length}</LatinDigits>
                  </Badge>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t">
                  <div>
                    <p className="text-muted-foreground text-xs">إجمالي الحجوزات</p>
                    <p className="font-bold text-primary">{formatLYD(total)}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-muted-foreground text-xs">المدفوع</p>
                    <p className="font-bold text-success">{formatLYD(paid)}</p>
                  </div>
                </div>
                <Button variant="secondary" className="w-full mt-3" asChild>
                  <Link
                    to="/customers/$customerId"
                    params={{ customerId: c.id }}
                    className="inline-flex items-center justify-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    ملف العميل
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
