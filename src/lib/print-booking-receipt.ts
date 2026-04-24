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
  customerPhone2?: string | null;
  customerIdentityNumber?: string | null;
  eventStartTime?: string | null;
  eventEndTime?: string | null;
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

function formatSlashDate(dateIso: string): string {
  const date = new Date(dateIso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function formatWeekday(dateIso: string): string {
  return new Intl.DateTimeFormat("ar-LY", { weekday: "long" }).format(new Date(dateIso));
}

function valueOrBlank(value?: string | null, blank = "_____________________"): string {
  const trimmed = value?.trim();
  return trimmed ? esc(trimmed) : blank;
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
  const contractHtml = `
        <section class="contract">
          <h3>عقد حجز صالة مناسبات</h3>
          <div class="contract-body">
            <p><strong>الطرف الأول ( الصالة ) :</strong><br/>إدارة صالة فيلورا للمناسبات ويشار إليها لاحقاً بـ الصالة .</p>
            <p><strong>الطرف الثاني ( العميل ) :</strong></p>
            <p class="contract-line">الإسم : <span class="fill">${esc(data.customerName)}</span> .</p>
            <p class="contract-line">رقم الهاتف 1 : <span class="fill">${esc(data.customerPhone)}</span> .</p>
            <p class="contract-line">رقم الهاتف 2 : <span class="fill">${valueOrBlank(data.customerPhone2)}</span> .</p>
            <p class="contract-line">رقم الهوية : <span class="fill">${valueOrBlank(data.customerIdentityNumber, "______________________")}</span> .</p>

            <section class="contract-clause">
              <h4>البند الأول :</h4>
              <p>اتفق الطرف الثاني ( العميل ) مع الطرف الأول ( الصالة ) على حجز صالة فيلورا لإقامة مناسبة للطرف الثاني .</p>
              <p class="contract-line">المناسبة : ( <span class="fill">${esc(data.eventType)}</span> ) .</p>
              <p class="contract-line">وذلك في يوم : ( <span class="fill">${esc(formatWeekday(data.eventDate))}</span> ) الموافق : ( <span class="fill">${esc(formatSlashDate(data.eventDate))}</span> ) .</p>
              <p class="contract-line">وذلك من الساعة : <span class="fill">${valueOrBlank(data.eventStartTime, "_______")}</span> إلى الساعة : <span class="fill">${valueOrBlank(data.eventEndTime, "_______")}</span> .</p>
              <p class="contract-line">العدد الاجمالي للضيوف : <span class="fill">${data.guestsCount ?? "____________"}</span> .</p>
            </section>

            <section class="contract-clause">
              <h4>البند الثاني :</h4>
              <p class="contract-line">القيمة الإجمالية للحجز : <span class="fill">${esc(formatMoney(data.totalPrice))}</span> .</p>
              <p class="contract-line">العربون المدفوع : <span class="fill">${esc(formatMoney(data.paidAmount))}</span> .</p>
              <p class="contract-line">المبلغ المتبقي : <span class="fill">${esc(formatMoney(data.remainingAmount))}</span> .</p>
              <p>ويتعهد الطرف الثاني ( العميل ) بسداد المبلغ المتبقي قبل موعد المناسبة بـ ( 7 ) أيام كحد أقصى .</p>
            </section>

            <section class="contract-clause">
              <h4>البند الثالث :</h4>
              <p>يلتزم الطرف الثاني ( العميل ) بدفع مبلغ تأمين قدره 1000 دينار ليبي كضمانة ، وذلك صباح يوم المناسبة أو قبل موعد بدء المناسبة بساعتين على الأقل ، وفي حال عدم السداد يحق للطرف الأول ( الصالة ) تعليق التسليم أو عدم بدء الخدمة إلى حين استلام المبلغ ، ويتم استرجاع هذا المبلغ بعد انتهاء المناسبة في حال عدم وجود اي أضرار أو خسائر داخل الصالة ، وفي حال وجود أضرار أو خسائر يحق للطرف الأول ( الصالة ) خصم قيمتها من مبلغ التأمين ، مع احتفاظه بحقه في المطالبة بأي مبلغ إضافي إذا تجاوزت قيمة الأضرار مبلغ التأمين .</p>
            </section>

            <section class="contract-clause">
              <h4>البند الرابع :</h4>
              <p>1_ يتم دفع العربون عند توقيع العقد ويعد تأكيداً نهائياً للحجز .</p>
              <p>2_ العربون غير قابل للإسترجاع في حال الإلغاء من قبل الطرف الثاني ( العميل ) .</p>
              <p>3_ في حال الإلغاء قبل يومين أو ثلاثة أيام من موعد المناسبة ، يلتزم الطرف الثاني ( العميل ) بدفع غرامة تعادل (40%) من إجمالي قيمة الحجز .</p>
              <p>4_ يسمح بتغيير أو تأجيل موعد الحجز لمرة واحدة فقط قبل موعد المناسبة بشهر كحد أقصى ، وذلك حسب توفر المواعيد لدى الصالة .</p>
              <p>5_ لا يحق للطرف الثاني ( العميل ) التنازل عن الحجز أو نقله إلى طرف ثالث إلا بعد موافقة خطية من إدارة الصالة .</p>
            </section>

            <section class="contract-clause">
              <h4>البند الخامس :</h4>
              <p>1_ يتحمل الطرف الثاني ( العميل ) كامل المسؤولية عن أي أضرار أو خسائر أو كسر يحدث داخل الصالة من قبل الضيوف ، ويتم تقدير قيمة الأضرار وفق السعر السوقي أو فاتورة الإصلاح أو الاستبدال ، ويحق لإدارة الصالة المطالبة بأي مبلغ إضافي إذا تجاوزت الأضرار قيمة التأمين .</p>
              <p>2_ يلتزم الطرف الثاني ( العميل ) بالوقت المحدد ، وأي تأخير بعد انتهاء المدة المتفق عليها تحتسب رسوم إضافية قدرها 150 دينار عن كل ساعة أو جزء منها .</p>
              <p>3_ عدم إدخال أي تجهيزات أو ديكورات أو معدات خارجية إلا بعد موافقة خطية من إدارة الصالة .</p>
              <p>4_ الإلتزام بالنظام العام والآداب العامة وعدم إحداث إزعاج أو فوضى .</p>
              <p>5_ يمنع إدخال مواد خطرة أو قابلة للاشتعال أو استخدام أي أدوات قد تسبب ضرراً للمكان كالألعاب النارية مثلا دون استثناء وغيرها من المواد الخطرة .</p>
              <p>6_ يلتزم الطرف الثاني ( العميل ) بتسليم الصالة بحالة مناسبة ، وفي حال وجود اتساخ غير طبيعي أو مخلفات زائدة يحق للصالة خصم رسوم تنظيف من مبلغ التأمين .</p>
            </section>

            <section class="contract-clause">
              <h4>البند السادس :</h4>
              <p>1_ تلتزم الصالة بتجهيز المكان وفق الاتفاق المسبق .</p>
              <p>2_ توفير النظافة والترتيب في الموعد المحدد .</p>
              <p>3_ الالتزام بالوقت والخدمات المتفق عليها دون إخلال .</p>
            </section>

            <section class="contract-clause">
              <h4>البند السابع :</h4>
              <p>1_ يلتزم الطرف الثاني ( العميل ) بتحديد العدد النهائي للضيوف قبل موعد المناسبة ، وأي زيادة غير مبلغ عنها يحق لإدارة الصالة فرض رسوم إضافية تصل إلى 100 دينار ليبي عن كل ضيف .</p>
              <p>2_ يسمح بحضور عدد أقصاه (4) أطفال ضمن العدد الإجمالي للضيوف ، وفي حال الزيادة يحق لإدارة الصالة :</p>
              <p>_ رفض دخول أكثر من 4 أطفال .</p>
              <p>_ أو فرض رسوم إضافية 150 دينار ليبي لكل طفل يزيد عن العدد المسموح به .</p>
            </section>

            <section class="contract-clause">
              <h4>البند الثامن :</h4>
              <p>يقر الطرف الثاني ( العميل ) بأنه قام بمعاينة المكان معاينة تامة قبل توقيع هذا العقد واطلع على كافة مرافقها وتجهيزاتها بما في ذلك ( الصالة ، أماكن الجلوس ، الحمامات ، المطبخ ، الأدوات والمواعين ، غرفة العروس ، وكافة التفاصيل المتعلقة بالمكان ) ويؤكد بموجب توقيعه أنه موافق على حالتها دون اي تحفظ ولا توجد لديه أي ملاحظات أو اعتراضات ولا يحق له المطالبة بأي تعديلات أو تقديم شكاوى لاحقاً فيما يتعلق بالأمور الظاهرة التي تمت معاينتها وقت التوقيع .</p>
            </section>

            <section class="contract-clause">
              <h4>البند التاسع :</h4>
              <p>لا يتحمل الطرف الأول ( الصالة ) أي مسؤولية في حال حدوث ظروف قاهرة خارجة عن الإرادة مثل : ( الحروب ، الكوارث طبيعية ، القرارات الحكومية ) ويتم في هذه الحالة الاتفاق على تأجيل الموعد دون تعويض .</p>
            </section>

            <section class="contract-clause">
              <h4>البند العاشر :</h4>
              <p>1_ يحق لإدارة الصالة إلغاء الحجز في حال مخالفة الشروط دون استرجاع العربون .</p>
              <p>2_ هذا العقد ملزم للطرفين قانونياً بعد التوقيع عليه .</p>
              <p>3_ أي نزاع ينشأ يتم حله وديًا ، وفي حال التعذر يحال إلى الجهات القضائية المختصة .</p>
              <p>4_ لا تتحمل إدارة الصالة مسؤولية فقدان أو سرقة أي أموال أو هواتف أو مقتنيات تخص الطرف الثاني أو الضيوف .</p>
            </section>

            <section class="contract-clause contract-signatures">
              <p>توقيع الطرف الأول ( صالة فيلورا ) :</p>
              <p class="contract-line">الاسم: <span class="fill">__________________</span></p>
              <p class="contract-line">التوقيع: <span class="fill">________________</span></p>
              <p>توقيع الطرف الثاني ( العميل ) :</p>
              <p class="contract-line">الاسم: <span class="fill">__________________</span></p>
              <p class="contract-line">التوقيع: <span class="fill">________________</span></p>
              <p class="contract-line">تاريخ توقيع العقد: ( <span class="fill">_________/______/______</span> )</p>
              <p>يقر الطرف الثاني بأنه استلم نسخة من هذا العقد بعد التوقيع :</p>
              <p>نعم ☐   لا ☐</p>
              <p class="contract-line">توقيع الطرف الأول ( الصالة ) : <span class="fill">_______</span></p>
              <p class="contract-line">توقيع الطرف الثاني ( العميل ) : <span class="fill">_______</span></p>
            </section>
          </div>
        </section>`;

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
      @page { size: A4; margin: 6mm; }
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
      .contract {
        margin-top: 14px;
        border: 1px solid #d4c4a4;
        border-radius: 4px;
        background: #fffef9;
        overflow: hidden;
      }
      .contract > h3 {
        margin: 0;
        font-size: 0.92rem;
        font-weight: 800;
        padding: 10px 14px;
        color: #4a3b1c;
        background: linear-gradient(180deg, #f2e8d2, #ebe0cc);
        border-bottom: 1px solid #d4c4a4;
      }
      .contract-body {
        padding: 12px 14px;
        font-size: 0.83rem;
        line-height: 1.72;
        color: #322816;
      }
      .contract-body p {
        margin: 0 0 7px;
      }
      .contract-clause {
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px dashed #e4d7bd;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .contract-clause h4 {
        margin: 0 0 6px;
        color: #4a3b1c;
        font-size: 0.84rem;
        font-weight: 800;
      }
      .contract-line {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .fill {
        font-weight: 700;
      }
      .contract-signatures {
        border-top-style: solid;
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
        .paper-inner { margin: 0; border: 0; padding: 4.5mm; }
        .header-brand { -webkit-print-color-adjust: exact; }
        .header-brand {
          padding: 8px 10px 10px;
          border-radius: 2px;
        }
        .logo-wrap {
          min-height: 120px;
          max-height: 170px;
          padding: 2px 0 4px;
        }
        .logo {
          max-height: 150px;
        }
        .doc-block { margin-top: 12px; }
        .orn { margin-bottom: 4px; }
        .receipt-title { font-size: 1.32rem; }
        .subtitle { margin-top: 3px; font-size: 0.76rem; }
        .tagline { margin-top: 2px; font-size: 0.64rem; }
        .stamp-wrap { margin-top: 10px; }
        .meta { margin-top: 12px; gap: 8px; }
        .meta .badge { padding: 8px 10px; }
        .section { margin-top: 10px; }
        .section h3 { padding: 8px 12px; }
        .item { padding: 8px 12px; }
        .chips { padding: 8px 12px; gap: 6px; }
        .totals { margin-top: 10px; }
        .row { padding: 8px 12px; }
        .notes { margin-top: 10px; padding: 9px 11px; }
        .contract { margin-top: 10px; }
        .contract > h3 { padding: 8px 11px; }
        .contract-body {
          padding: 9px 11px;
          font-size: 0.78rem;
          line-height: 1.6;
        }
        .contract-clause {
          margin-top: 9px;
          padding-top: 6px;
        }
        .staff-signature { margin-top: 12px; padding: 9px 11px; }
        .sig-preview { min-height: 52px; padding-top: 8px; }
        .footer-note { margin-top: 12px; font-size: 0.64rem; }
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
        ${contractHtml}

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
