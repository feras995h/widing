/**
 * Standalone payment-receipt print utility.
 * Renders a compact, formal receipt for a single payment against a booking,
 * suitable for printing or sharing.
 */

export interface PaymentReceiptData {
  hallName: string;
  hallTagline?: string;
  logoUrl?: string;
  receiptNo: string;
  issuedAt: string; // ISO

  customerName: string;
  customerPhone: string;

  eventDate: string; // ISO/yyyy-mm-dd
  eventType: string;

  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string; // localized label
  paymentNotes?: string | null;

  totalPrice: number;
  paidBefore: number;
  paidAfter: number;
  remainingAfter: number;
}

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} د.ل`;
}

function formatDate(dateIso: string): string {
  return new Intl.DateTimeFormat("ar-LY-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateIso));
}

function formatDateTime(dateIso: string): string {
  const d = new Date(dateIso);
  const dt = new Intl.DateTimeFormat("ar-LY-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
  const tm = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${dt} — ${tm}`;
}

function renderHtml(d: PaymentReceiptData): string {
  const status = d.remainingAfter <= 0 ? "مدفوع كامل" : "مدفوع جزئي";
  const statusColor = d.remainingAfter <= 0 ? "#0a8a3a" : "#b8860b";

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>وصل دفعة — ${esc(d.receiptNo)}</title>
  <style>
    @page { size: A5; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Amiri", "Tahoma", "Segoe UI", Arial, sans-serif;
      margin: 0; color: #1a1a1a; background: #f5f4ef;
      direction: rtl; line-height: 1.6;
    }
    .page {
      max-width: 720px; margin: 18px auto; background: #fff;
      border: 1.5px solid #c9a96b; border-radius: 12px;
      padding: 22px 26px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .head { display: flex; align-items: center; gap: 14px; border-bottom: 1px dashed #c9a96b; padding-bottom: 12px; margin-bottom: 14px; }
    .head img { width: 56px; height: 56px; object-fit: contain; }
    .brand { flex: 1; }
    .brand h1 { margin: 0; font-size: 22px; letter-spacing: 1px; color: #6b4f1d; }
    .brand p { margin: 2px 0 0; font-size: 12px; color: #888; }
    .receipt-meta { text-align: left; font-size: 12px; color: #555; }
    .receipt-meta strong { display: block; font-size: 14px; color: #6b4f1d; }
    .title { text-align: center; font-size: 20px; margin: 8px 0 14px; color: #6b4f1d; font-weight: 700; }
    .subtitle { text-align: center; font-size: 12px; color: #777; margin-top: -10px; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 14px; margin-bottom: 14px; }
    .grid .row { display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; border-bottom: 1px dotted #eadcb8; }
    .grid .row span:first-child { color: #777; }
    .grid .row span:last-child { font-weight: 600; color: #1a1a1a; }
    .amount-card {
      background: linear-gradient(135deg, #fff7e3 0%, #fff 100%);
      border: 1px solid #c9a96b; border-radius: 10px;
      padding: 14px 18px; text-align: center; margin: 10px 0 14px;
    }
    .amount-card .label { font-size: 13px; color: #6b4f1d; }
    .amount-card .value { font-size: 30px; font-weight: 800; color: #0a8a3a; margin-top: 4px; }
    .amount-card .method { font-size: 12px; color: #555; margin-top: 4px; }
    .summary { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    .summary td { padding: 8px 6px; border-bottom: 1px solid #eee; }
    .summary tr:last-child td { border-bottom: 0; font-weight: 700; }
    .summary td:last-child { text-align: left; font-family: "Segoe UI", Tahoma, Arial; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; color: #fff; }
    .notes { margin-top: 10px; font-size: 12px; color: #555; padding: 8px 10px; background: #faf6ec; border-right: 3px solid #c9a96b; border-radius: 4px; }
    .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 22px; padding-top: 14px; border-top: 1px dashed #c9a96b; }
    .signs .box { font-size: 13px; }
    .signs .box .line { margin-top: 30px; border-bottom: 1px solid #999; }
    .signs .box .label { color: #777; font-size: 11px; margin-top: 4px; text-align: center; }
    .footer { text-align: center; font-size: 11px; color: #999; margin-top: 14px; }
    .controls { max-width: 720px; margin: 8px auto 24px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .controls button {
      background: #6b4f1d; color: #fff; border: 0; border-radius: 8px;
      padding: 8px 18px; font-size: 14px; cursor: pointer; font-family: inherit;
    }
    .controls button.secondary { background: #aaa; }
    @media print {
      body { background: #fff; }
      .controls { display: none !important; }
      .page { border: 0; box-shadow: none; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="head">
      ${d.logoUrl ? `<img src="${esc(d.logoUrl)}" alt="logo" />` : ""}
      <div class="brand">
        <h1>${esc(d.hallName)}</h1>
        ${d.hallTagline ? `<p>${esc(d.hallTagline)}</p>` : ""}
      </div>
      <div class="receipt-meta">
        <strong>رقم الوصل</strong>${esc(d.receiptNo)}
        <div style="margin-top:6px">${esc(formatDateTime(d.issuedAt))}</div>
      </div>
    </div>

    <div class="title">وصل استلام دفعة</div>
    <div class="subtitle">سند مالي معتمد من ${esc(d.hallName)}</div>

    <div class="grid">
      <div class="row"><span>اسم العميل</span><span>${esc(d.customerName)}</span></div>
      <div class="row"><span>رقم الهاتف</span><span dir="ltr">${esc(d.customerPhone)}</span></div>
      <div class="row"><span>نوع المناسبة</span><span>${esc(d.eventType)}</span></div>
      <div class="row"><span>تاريخ المناسبة</span><span>${esc(formatDate(d.eventDate))}</span></div>
    </div>

    <div class="amount-card">
      <div class="label">المبلغ المستلم</div>
      <div class="value">${esc(formatMoney(d.paymentAmount))}</div>
      <div class="method">طريقة الدفع: ${esc(d.paymentMethod)} · بتاريخ ${esc(formatDate(d.paymentDate))}</div>
    </div>

    <table class="summary">
      <tr><td>إجمالي قيمة الحجز</td><td>${esc(formatMoney(d.totalPrice))}</td></tr>
      <tr><td>المسدد قبل هذه الدفعة</td><td>${esc(formatMoney(d.paidBefore))}</td></tr>
      <tr><td>هذه الدفعة</td><td>${esc(formatMoney(d.paymentAmount))}</td></tr>
      <tr><td>إجمالي المسدد بعد هذه الدفعة</td><td>${esc(formatMoney(d.paidAfter))}</td></tr>
      <tr><td>المتبقي</td><td>${esc(formatMoney(d.remainingAfter))}</td></tr>
      <tr><td>الحالة</td><td><span class="status" style="background:${statusColor}">${esc(status)}</span></td></tr>
    </table>

    ${d.paymentNotes?.trim() ? `<div class="notes"><strong>ملاحظات:</strong> ${esc(d.paymentNotes)}</div>` : ""}

    <div class="signs">
      <div class="box">
        <div class="line"></div>
        <div class="label">توقيع العميل</div>
      </div>
      <div class="box">
        <div class="line"></div>
        <div class="label">توقيع الموظف / إدارة الصالة</div>
      </div>
    </div>

    <div class="footer">شكراً لتعاملكم معنا — هذا الوصل وثيقة مالية يرجى الاحتفاظ بها</div>
  </div>

  <div class="controls">
    <button onclick="window.print()">طباعة</button>
    <button class="secondary" onclick="window.close()">إغلاق</button>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => { try { window.print(); } catch (e) {} }, 350);
    });
  </script>
</body>
</html>`;
}

export function openPaymentPrintWindow(): Window | null {
  if (typeof window === "undefined") return null;
  const w = window.open("", "_blank", "width=720,height=900");
  if (w) {
    w.document.open();
    w.document.write(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>جاري تجهيز الوصل...</title></head><body style="font-family:Tahoma,Arial,sans-serif;padding:24px;text-align:center;">جاري تجهيز الوصل للطباعة...</body></html>`,
    );
    w.document.close();
  }
  return w;
}

export function printPaymentReceipt(
  data: PaymentReceiptData,
  preparedWindow?: Window | null,
): void {
  if (typeof window === "undefined") return;
  const w = preparedWindow ?? window.open("", "_blank", "width=720,height=900");
  if (!w) {
    throw new Error("تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.");
  }
  const html = renderHtml(data);
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}
