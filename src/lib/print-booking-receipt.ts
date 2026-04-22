interface BookingReceiptData {
  hallName: string;
  hallTagline?: string;
  logoUrl?: string;
  receiptNo: string;
  issuedAt: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  eventType: string;
  guestsCount: number | null;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus?: "full" | "partial";
  services: string[];
  notes?: string | null;
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

function renderHtml(data: BookingReceiptData): string {
  const status: "full" | "partial" =
    data.paymentStatus ?? (data.remainingAmount <= 0 ? "full" : "partial");
  const statusLabel = status === "full" ? "مدفوع كامل" : "مدفوع جزئي";

  const servicesHtml =
    data.services.length > 0
      ? data.services.map((s) => `<span class="chip">${esc(s)}</span>`).join("")
      : `<span class="muted">لا توجد خدمات محددة</span>`;

  const notesHtml = data.notes?.trim()
    ? `<div class="notes"><strong>ملاحظات:</strong> ${esc(data.notes)}</div>`
    : "";

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>Receipt - ${esc(data.hallName)}</title>
    ${data.logoUrl ? `<link rel="icon" href="${esc(data.logoUrl)}" />` : ""}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        background: #ebe4d6;
        font-family: "Tajawal", "Segoe UI", Tahoma, Arial, sans-serif;
        color: #1f1a12;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        line-height: 1.45;
      }
      .page-wrap {
        max-width: 820px;
        margin: 12px auto 24px;
        padding: 0 10px;
      }
      .paper {
        position: relative;
        background:
          linear-gradient(165deg, #fffef9 0%, #fffcf5 40%, #faf6ee 100%);
        border-radius: 2px;
        box-shadow: 0 2px 0 #c4a45a, 0 0 0 1px #d4bc85, 0 16px 48px rgba(68, 52, 28, 0.12);
        padding: 0;
        overflow: hidden;
      }
      .paper-inner {
        border: 1px solid #e0cdaa;
        margin: 10px;
        padding: 18px 20px 22px;
        min-height: 200px;
      }
      .watermark {
        position: absolute;
        opacity: 0.022;
        font-size: 48px;
        font-weight: 800;
        letter-spacing: 0.12em;
        transform: rotate(-16deg);
        inset-inline: 0;
        top: 38%;
        text-align: center;
        pointer-events: none;
        user-select: none;
        color: #8a7348;
      }
      /* #FEFBEC = لون بكسلات خلفية logo.png (زوايا الصورة) لدمج الإطار مع الشعار */
      .header-brand {
        background: #fefbec;
        border: 1px solid rgba(210, 198, 170, 0.35);
        border-radius: 4px;
        padding: 16px 12px 20px;
        text-align: center;
      }
      .logo-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        max-height: 300px;
        padding: 6px 0 10px;
        background: #fefbec;
        border-radius: 2px;
      }
      .logo {
        display: block;
        max-width: 100%;
        max-height: 260px;
        width: auto;
        height: auto;
        object-fit: contain;
        object-position: center;
        image-rendering: auto;
        -ms-interpolation-mode: bicubic;
      }
      .hall-fallback {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 800;
        color: #6b5420;
        letter-spacing: 0.04em;
      }
      .doc-block {
        margin-top: 22px;
        text-align: center;
      }
      .orn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .orn::before, .orn::after {
        content: "";
        height: 1px;
        width: 64px;
        background: linear-gradient(90deg, transparent, #b89a4e, transparent);
      }
      .receipt-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 800;
        color: #3d3118;
        letter-spacing: 0.02em;
      }
      .subtitle {
        margin: 6px 0 0;
        color: #6b5e48;
        font-size: 0.82rem;
        font-weight: 500;
      }
      .tagline {
        margin-top: 4px;
        font-size: 0.7rem;
        color: #918371;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 500;
      }
      .stamp-wrap {
        margin-top: 16px;
        display: flex;
        justify-content: center;
      }
      .stamp {
        display: inline-block;
        border: 1.5px solid #9a5e18;
        color: #7a4a0f;
        border-radius: 4px;
        padding: 7px 22px;
        font-weight: 800;
        font-size: 0.78rem;
        letter-spacing: 0.12em;
        background: linear-gradient(180deg, #fffdf6, #f8f0de);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
      }
      .stamp.full {
        border-color: #1e6b42;
        color: #145c36;
        background: linear-gradient(180deg, #f0fff6, #d8f0e4);
      }
      .stamp.partial {
        border-color: #9a5e18;
        color: #7a4a0f;
      }
      .meta {
        margin-top: 20px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .meta .badge {
        border: 1px solid #d4c4a4;
        background: #fffdf8;
        border-radius: 4px;
        padding: 10px 14px;
        font-size: 0.86rem;
        text-align: center;
        font-weight: 600;
        color: #3d3118;
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
      }
      .meta .badge span {
        display: block;
        font-size: 0.68rem;
        color: #7a6d52;
        font-weight: 500;
        margin-bottom: 4px;
        letter-spacing: 0.02em;
      }
      .section {
        margin-top: 14px;
        border: 1px solid #d9caab;
        border-radius: 4px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 1px 2px rgba(80, 60, 30, 0.04);
      }
      .section h3 {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 800;
        padding: 10px 14px;
        color: #4a3b1c;
        background: linear-gradient(180deg, #f2e8d2, #ebe0cc);
        border-bottom: 1px solid #d4c4a4;
        letter-spacing: 0.03em;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0;
        padding: 4px 0;
      }
      .item {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 10px;
        padding: 10px 14px;
        border-bottom: 1px solid #f0e8da;
      }
      .item:nth-child(odd) { border-left: 1px solid #f2ebe0; }
      .item:last-child { border-bottom: 0; }
      .label {
        color: #6a5e48;
        font-size: 0.8rem;
        font-weight: 500;
      }
      .value {
        font-weight: 700;
        color: #1f1a12;
        font-size: 0.88rem;
        text-align: left;
        direction: ltr;
      }
      .chips {
        padding: 12px 14px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        background: #f5efe3;
        border: 1px solid #d4c4a4;
        color: #4a3b1c;
        border-radius: 3px;
        padding: 5px 12px;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .totals {
        margin-top: 14px;
        border: 1px solid #b89a4e;
        border-radius: 4px;
        background: #fff;
        overflow: hidden;
      }
      .totals .head {
        background: linear-gradient(90deg, #9a7b35, #c4a45a, #9a7b35);
        color: #fff;
        text-align: center;
        font-weight: 800;
        font-size: 0.78rem;
        padding: 8px 12px;
        letter-spacing: 0.15em;
      }
      .row {
        display: flex;
        justify-content: space-between;
        padding: 11px 14px;
        font-size: 0.9rem;
      }
      .row + .row { border-top: 1px solid #efe6d4; }
      .row span { color: #5c5240; font-weight: 600; }
      .row strong { font-size: 0.95rem; font-weight: 800; }
      .row.total { background: #fffdf8; }
      .row.paid { background: #f0faf3; }
      .row.remaining { background: #fff8f0; }
      .row.total strong { color: #6b5420; }
      .row.paid strong { color: #0d6e3a; }
      .row.remaining strong { color: #9a5a0e; }
      .notes {
        margin-top: 12px;
        border: 1px solid #d9caab;
        border-radius: 4px;
        background: #fffcf5;
        padding: 12px 14px;
        font-size: 0.86rem;
        line-height: 1.5;
        color: #3d3118;
      }
      .staff-signature {
        margin-top: 16px;
        border: 1px dashed #b89a4e;
        border-radius: 4px;
        background: #fffdf9;
        padding: 12px 14px;
      }
      .sig-title {
        font-weight: 800;
        color: #4a3b1c;
        margin: 0 0 8px;
        font-size: 0.86rem;
      }
      .sig-preview {
        min-height: 64px;
        border-top: 1px solid #e8dcc4;
        padding-top: 10px;
      }
      .sig-preview img {
        max-width: 260px;
        max-height: 56px;
        object-fit: contain;
      }
      .sig-placeholder {
        font-size: 0.75rem;
        color: #8a7b62;
      }
      .muted { color: #7a6d52; font-size: 0.75rem; }
      .footer-note {
        margin-top: 18px;
        text-align: center;
        font-size: 0.7rem;
        color: #9a8b72;
        letter-spacing: 0.04em;
      }
      .controls {
        margin-top: 14px;
        border: 1px solid #c9b48a;
        border-radius: 6px;
        background: linear-gradient(180deg, #fff9ec, #f5ecd8);
        padding: 16px;
      }
      .controls h3 {
        margin: 0;
        color: #4a3b1c;
        font-size: 0.95rem;
        font-weight: 800;
      }
      .controls p {
        margin: 8px 0 12px;
        color: #6b5e48;
        font-size: 0.82rem;
      }
      .signature-canvas {
        width: 100%;
        height: 160px;
        border: 1px dashed #a88d55;
        border-radius: 4px;
        background: #fff;
        touch-action: none;
      }
      .actions {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .btn {
        border: 1px solid #c4a88a;
        background: #fff;
        color: #3d3118;
        border-radius: 4px;
        padding: 9px 14px;
        font-size: 0.8rem;
        font-weight: 800;
        cursor: pointer;
        font-family: inherit;
      }
      .btn.primary {
        background: linear-gradient(180deg, #d4b56a, #a8893c);
        border-color: #8a6f32;
        color: #fff;
      }
      .btn.whatsapp {
        background: linear-gradient(180deg, #34d070, #1fa855);
        border-color: #189048;
        color: #fff;
      }
      .btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body { background: #fff; }
        .page-wrap {
          max-width: none;
          margin: 0;
          padding: 0;
        }
        .controls { display: none !important; }
        .paper { box-shadow: none; }
        .paper-inner { margin: 0; border: 0; padding: 6mm; }
        .header-brand { -webkit-print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <div class="page-wrap">
      <main class="paper" id="receiptPaper">
        <div class="watermark">${esc(data.hallName)}</div>
        <div class="paper-inner">
        <header class="header-brand">
          ${
            data.logoUrl
              ? `<div class="logo-wrap"><img class="logo" src="${esc(data.logoUrl)}" alt="${esc(data.hallName)}" loading="eager" /></div>`
              : `<h1 class="hall-fallback">${esc(data.hallName)}</h1>`
          }
        </header>

        <div class="doc-block">
          <div class="orn" aria-hidden="true"></div>
          <h1 class="receipt-title">وصل حجز رسمي</h1>
          <p class="subtitle">وثيقة مالية معتمدة — صادرة من نظام ${esc(data.hallName)}</p>
          ${data.hallTagline ? `<p class="tagline">${esc(data.hallTagline)}</p>` : ""}
        </div>
        <div class="stamp-wrap">
          <div class="stamp ${status}">${statusLabel}</div>
        </div>

        <section class="meta">
          <div class="badge"><span>رقم الوصل</span>${esc(data.receiptNo)}</div>
          <div class="badge"><span>تاريخ الإصدار</span>${esc(formatDate(data.issuedAt))}</div>
        </section>

        <section class="section">
          <h3>بيانات الحجز</h3>
          <div class="grid">
            <div class="item"><span class="label">اسم العميل</span><span class="value">${esc(data.customerName)}</span></div>
            <div class="item"><span class="label">رقم الهاتف</span><span class="value">${esc(data.customerPhone)}</span></div>
            <div class="item"><span class="label">تاريخ المناسبة</span><span class="value">${esc(formatDate(data.eventDate))}</span></div>
            <div class="item"><span class="label">نوع المناسبة</span><span class="value">${esc(data.eventType)}</span></div>
            <div class="item" style="grid-column:1/-1"><span class="label">عدد الضيوف</span><span class="value">${data.guestsCount ?? "—"}</span></div>
          </div>
        </section>

        <section class="section">
          <h3>الخدمات المشمولة</h3>
          <div class="chips">${servicesHtml}</div>
        </section>

        <section class="totals">
          <div class="head">الملخص المالي</div>
          <div class="row total"><span>الإجمالي</span><strong dir="ltr">${esc(formatMoney(data.totalPrice))}</strong></div>
          <div class="row paid"><span>المدفوع</span><strong dir="ltr">${esc(formatMoney(data.paidAmount))}</strong></div>
          <div class="row remaining"><span>المتبقي</span><strong dir="ltr">${esc(formatMoney(data.remainingAmount))}</strong></div>
        </section>

        ${notesHtml}

        <section class="staff-signature">
          <p class="sig-title">توقيع موظف الاستقبال</p>
          <div class="sig-preview" id="staffSigPreview">
            <span class="sig-placeholder">سيظهر التوقيع بعد الاعتماد</span>
          </div>
          <div class="muted" id="staffSigDate">لم يتم الاعتماد بعد</div>
        </section>
        <p class="footer-note">شكراً لثقتكم — ${esc(data.hallName)}</p>
        </div>
      </main>

      <section class="controls">
        <h3>اعتماد الوصل قبل الإرسال للعميل</h3>
        <p>وقّع بإصبعك/القلم على الشاشة، ثم اختر "اعتماد وتصدير".</p>
        <canvas id="signatureCanvas" class="signature-canvas"></canvas>
        <div class="actions">
          <button type="button" class="btn" id="clearSignBtn">مسح التوقيع</button>
          <button type="button" class="btn primary" id="approvePrintBtn">اعتماد وتصدير (PDF/طباعة)</button>
          <button type="button" class="btn whatsapp" id="sendWhatsappBtn">إرسال عبر واتساب</button>
          <button type="button" class="btn" id="printNoSignBtn">طباعة بدون توقيع</button>
        </div>
      </section>
    </div>
    <script>
      (() => {
        const canvas = document.getElementById("signatureCanvas");
        const clearBtn = document.getElementById("clearSignBtn");
        const approveBtn = document.getElementById("approvePrintBtn");
        const whatsappBtn = document.getElementById("sendWhatsappBtn");
        const noSignBtn = document.getElementById("printNoSignBtn");
        const preview = document.getElementById("staffSigPreview");
        const dateEl = document.getElementById("staffSigDate");
        if (!canvas || !clearBtn || !approveBtn || !whatsappBtn || !noSignBtn || !preview || !dateEl) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let drawing = false;
        let signed = false;

        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          const ratio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(rect.width * ratio);
          canvas.height = Math.floor(rect.height * ratio);
          ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
          ctx.lineWidth = 2.4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = "#3a2b13";
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, rect.width, rect.height);
        };

        const point = (event) => {
          const rect = canvas.getBoundingClientRect();
          return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        };

        const start = (event) => {
          drawing = true;
          const p = point(event);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          event.preventDefault();
        };

        const move = (event) => {
          if (!drawing) return;
          const p = point(event);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          signed = true;
          event.preventDefault();
        };

        const stop = () => {
          drawing = false;
          ctx.closePath();
        };

        const clear = () => {
          const rect = canvas.getBoundingClientRect();
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, rect.width, rect.height);
          signed = false;
          preview.innerHTML = '<span class="sig-placeholder">سيظهر التوقيع بعد الاعتماد</span>';
          dateEl.textContent = "لم يتم الاعتماد بعد";
        };

        const applySignature = () => {
          const url = canvas.toDataURL("image/png");
          preview.innerHTML = '<img alt="staff-signature" src="' + url + '" />';
          dateEl.textContent = "تم الاعتماد: " + new Date().toLocaleString("ar-LY-u-nu-latn");
        };

        const doPrint = () => {
          setTimeout(() => window.print(), 80);
        };

        const toWhatsappNumber = (raw) => {
          const digits = String(raw || "").replace(/\\D+/g, "");
          if (!digits) return "";
          if (digits.startsWith("218")) return digits;
          if (digits.startsWith("00")) return digits.slice(2);
          if (digits.startsWith("0")) return "218" + digits.slice(1);
          return digits;
        };

        const makeWhatsappMessage = () => {
          return [
            "وصل حجز - ${esc(data.hallName)}",
            "رقم الوصل: ${esc(data.receiptNo)}",
            "العميل: ${esc(data.customerName)}",
            "تاريخ المناسبة: ${esc(formatDate(data.eventDate))}",
            "نوع المناسبة: ${esc(data.eventType)}",
            "الإجمالي: ${esc(formatMoney(data.totalPrice))}",
            "المدفوع: ${esc(formatMoney(data.paidAmount))}",
            "المتبقي: ${esc(formatMoney(data.remainingAmount))}",
            "الحالة: ${esc(statusLabel)}",
          ].join("\\n");
        };

        canvas.addEventListener("pointerdown", start);
        canvas.addEventListener("pointermove", move);
        canvas.addEventListener("pointerup", stop);
        canvas.addEventListener("pointerleave", stop);
        canvas.addEventListener("pointercancel", stop);
        clearBtn.addEventListener("click", clear);
        noSignBtn.addEventListener("click", doPrint);
        whatsappBtn.addEventListener("click", () => {
          const phone = toWhatsappNumber("${esc(data.customerPhone)}");
          if (!phone) {
            window.alert("رقم هاتف العميل غير صالح لإرسال واتساب.");
            return;
          }
          const text = encodeURIComponent(makeWhatsappMessage());
          const url = "https://wa.me/" + phone + "?text=" + text;
          window.open(url, "_blank");
        });
        approveBtn.addEventListener("click", () => {
          if (!signed) {
            window.alert("الرجاء إضافة توقيع الموظف قبل الاعتماد.");
            return;
          }
          applySignature();
          doPrint();
        });

        resize();
        window.addEventListener("resize", resize);
      })();
    </script>
  </body>
</html>`;
}

export function openBookingPrintWindow(): Window | null {
  if (typeof window === "undefined") return null;
  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>جاري تجهيز الوصل...</title></head><body style="font-family:Segoe UI,Tahoma,Arial,sans-serif;padding:24px;text-align:center;">جاري تجهيز الوصل للطباعة...</body></html>`,
    );
    printWindow.document.close();
  }
  return printWindow;
}

export function printBookingReceipt(
  data: BookingReceiptData,
  preparedWindow?: Window | null,
): void {
  if (typeof window === "undefined") return;

  const printWindow = preparedWindow ?? window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) {
    throw new Error("تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.");
  }
  const html = renderHtml(data);

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}
