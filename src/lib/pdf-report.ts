import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatLYD } from "@/lib/format";

interface MonthlyRow {
  monthIndex: number;
  monthLabel: string;
  bookingContracted: number;
  bookingPaidOnBookings: number;
  cashRevenue: number;
  generalExpenses: number;
  workerPayments: number;
  netProfit: number;
}

interface BookingDetailRow {
  date: string;
  customer: string;
  eventType: string;
  total: number;
  paid: number;
  due: number;
}

interface ExportArgs {
  year: number;
  monthlyBreakdown: MonthlyRow[];
  yearTotals: {
    bookingContracted: number;
    bookingPaidOnBookings: number;
    cashRevenue: number;
    generalExpenses: number;
    workerPayments: number;
    netProfit: number;
    bookingDue: number;
  };
  overview: {
    activeBookingsCount: number;
    cancelledBookingsCount: number;
    activeCustomerPaymentsCount: number;
  };
  bookingDetails: BookingDetailRow[];
  expensesDetail: { date: string; category: string; description: string; amount: number }[];
  workerPaymentsDetail: { date: string; worker: string; period: string; amount: number }[];
}

interface FontLoadResult {
  base64: string | null;
  source: "local" | "cdn" | "none";
}

interface ExportResult {
  usedArabicFont: boolean;
  fontSource: "local" | "cdn" | "none";
  exportedFiles: string[];
}

let cachedFont: FontLoadResult | null = null;

async function fontToBase64(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  return btoa(binary);
}

async function loadArabicFont(): Promise<FontLoadResult> {
  if (cachedFont) return cachedFont;

  const localBase64 = await fontToBase64("/fonts/Amiri-Regular.ttf").catch(() => null);
  if (localBase64) {
    cachedFont = { base64: localBase64, source: "local" };
    return cachedFont;
  }

  const cdnBase64 = await fontToBase64(
    "https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf",
  ).catch(() => null);
  if (cdnBase64) {
    cachedFont = { base64: cdnBase64, source: "cdn" };
    return cachedFont;
  }

  cachedFont = { base64: null, source: "none" };
  return cachedFont;
}

function fmt(n: number) {
  return formatLYD(n);
}

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTodayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toArabic(doc: jsPDF, value: string): string {
  const processArabic = (doc as { processArabic?: (txt: string) => string }).processArabic;
  const text = String(value ?? "");
  return typeof processArabic === "function" ? processArabic(text) : text;
}

function createDocWithFont(font: FontLoadResult): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  if (font.base64) {
    doc.addFileToVFS("Amiri-Regular.ttf", font.base64);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    doc.setFont("Amiri", "normal");
  } else {
    doc.setFont("helvetica", "normal");
  }
  return doc;
}

function addPageNumbers(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      toArabic(doc, `صفحة ${i} من ${pageCount}`),
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }
}

export async function exportMonthlyReportPdf(args: ExportArgs): Promise<ExportResult> {
  const font = await loadArabicFont();
  const exportedFiles: string[] = [];
  const doc = createDocWithFont(font);

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.text(toArabic(doc, "التقرير المالي الشامل السنوي - Veloura Venue"), pageWidth / 2, 50, {
    align: "center",
  });
  doc.setFontSize(12);
  doc.text(toArabic(doc, `السنة: ${args.year}`), pageWidth / 2, 72, { align: "center" });
  doc.setFontSize(10);
  doc.text(toArabic(doc, `تاريخ التصدير: ${fmtTodayDate()}`), pageWidth / 2, 88, {
    align: "center",
  });
  doc.setDrawColor(201, 169, 97);
  doc.setLineWidth(1);
  doc.line(40, 100, pageWidth - 40, 100);

  // Section 1: Year financial overview
  doc.setFontSize(13);
  doc.text(toArabic(doc, "الملخص المالي السنوي"), pageWidth - 40, 124, { align: "right" });
  autoTable(doc, {
    startY: 132,
    head: [[toArabic(doc, "المؤشر"), toArabic(doc, "القيمة")]],
    body: [
      [toArabic(doc, "قيمة التعاقدات"), fmt(args.yearTotals.bookingContracted)],
      [toArabic(doc, "المدفوع على الحجوزات"), fmt(args.yearTotals.bookingPaidOnBookings)],
      [toArabic(doc, "المتبقي المستحق"), fmt(args.yearTotals.bookingDue)],
      [toArabic(doc, "الإيراد المحصل (دفعات العملاء)"), fmt(args.yearTotals.cashRevenue)],
      [toArabic(doc, "المصروفات العامة"), fmt(args.yearTotals.generalExpenses)],
      [toArabic(doc, "رواتب العمال"), fmt(args.yearTotals.workerPayments)],
      [toArabic(doc, "صافي الربح"), fmt(args.yearTotals.netProfit)],
      [
        toArabic(doc, "إحصائيات العدد"),
        toArabic(
          doc,
          `نشط: ${args.overview.activeBookingsCount} | ملغى: ${args.overview.cancelledBookingsCount} | دفعات: ${args.overview.activeCustomerPaymentsCount}`,
        ),
      ],
    ],
    styles: {
      font: "Amiri",
      fontSize: 10,
      fontStyle: "normal",
      halign: "right",
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 210 },
      1: { cellWidth: "auto" },
    },
    headStyles: {
      font: "Amiri",
      fillColor: [201, 169, 97],
      textColor: 255,
      fontStyle: "normal",
      halign: "right",
    },
    theme: "grid",
  });

  // Section 2: Monthly financial summary
  const firstSectionEndY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(13);
  doc.text(toArabic(doc, "الملخص الشهري المالي الشامل"), pageWidth - 40, firstSectionEndY, {
    align: "right",
  });

  autoTable(doc, {
    startY: firstSectionEndY + 10,
    head: [[
      toArabic(doc, "الشهر"),
      toArabic(doc, "قيمة التعاقدات"),
      toArabic(doc, "المدفوع على الحجوزات"),
      toArabic(doc, "الإيراد المحصل"),
      toArabic(doc, "المصروفات العامة"),
      toArabic(doc, "رواتب العمال"),
      toArabic(doc, "صافي الربح"),
    ]],
    body: args.monthlyBreakdown.map((m) => [
      toArabic(doc, m.monthLabel),
      m.bookingContracted ? fmt(m.bookingContracted) : "-",
      m.bookingPaidOnBookings ? fmt(m.bookingPaidOnBookings) : "-",
      m.cashRevenue ? fmt(m.cashRevenue) : "-",
      m.generalExpenses ? fmt(m.generalExpenses) : "-",
      m.workerPayments ? fmt(m.workerPayments) : "-",
      m.netProfit ? fmt(m.netProfit) : "-",
    ]),
    foot: [
      [
        toArabic(doc, "إجمالي السنة"),
        fmt(args.yearTotals.bookingContracted),
        fmt(args.yearTotals.bookingPaidOnBookings),
        fmt(args.yearTotals.cashRevenue),
        fmt(args.yearTotals.generalExpenses),
        fmt(args.yearTotals.workerPayments),
        fmt(args.yearTotals.netProfit),
      ],
    ],
    styles: {
      font: "Amiri",
      fontSize: 10,
      fontStyle: "normal",
      halign: "right",
      cellPadding: 6,
    },
    headStyles: {
      font: "Amiri",
      fillColor: [201, 169, 97],
      textColor: 255,
      fontStyle: "normal",
      halign: "right",
    },
    footStyles: {
      font: "Amiri",
      fillColor: [250, 247, 240],
      textColor: [92, 74, 42],
      fontStyle: "normal",
      halign: "right",
    },
    theme: "grid",
  });

  // Section 3: Bookings detail
  let nextY = (doc as any).lastAutoTable.finalY + 30;
  if (nextY > 500) {
    doc.addPage();
    nextY = 60;
  }
  doc.setFontSize(13);
  doc.text(toArabic(doc, "تفاصيل الحجوزات النشطة"), pageWidth - 40, nextY, {
    align: "right",
  });

  autoTable(doc, {
    startY: nextY + 10,
    head: [[
      toArabic(doc, "التاريخ"),
      toArabic(doc, "العميل"),
      toArabic(doc, "نوع المناسبة"),
      toArabic(doc, "قيمة الحجز"),
      toArabic(doc, "المدفوع"),
      toArabic(doc, "المتبقي"),
    ]],
    body:
      args.bookingDetails.length > 0
        ? args.bookingDetails.map((b) => [
            fmtDate(b.date),
            toArabic(doc, b.customer),
            toArabic(doc, b.eventType),
            fmt(b.total),
            fmt(b.paid),
            fmt(b.due),
          ])
        : [["—", "—", "—", toArabic(doc, "لا توجد حجوزات نشطة في هذه السنة"), "—", "—"]],
    foot:
      args.bookingDetails.length > 0
        ? [
            [
              "",
              "",
              "",
              fmt(args.yearTotals.bookingContracted),
              fmt(args.yearTotals.bookingPaidOnBookings),
              fmt(args.yearTotals.bookingDue),
            ],
          ]
        : undefined,
    styles: { font: "Amiri", fontSize: 9, fontStyle: "normal", halign: "right", cellPadding: 5 },
    headStyles: {
      font: "Amiri",
      fillColor: [201, 169, 97],
      textColor: 255,
      fontStyle: "normal",
      halign: "right",
    },
    footStyles: {
      font: "Amiri",
      fillColor: [250, 247, 240],
      textColor: [92, 74, 42],
      fontStyle: "normal",
      halign: "right",
    },
    theme: "grid",
  });

  // Section 4: General expenses detail
  nextY = (doc as any).lastAutoTable.finalY + 30;
  if (nextY > 500) {
    doc.addPage();
    nextY = 60;
  }
  doc.setFontSize(13);
  doc.text(toArabic(doc, "تفاصيل المصروفات العامة"), pageWidth - 40, nextY, { align: "right" });

  autoTable(doc, {
    startY: nextY + 10,
    head: [[toArabic(doc, "التاريخ"), toArabic(doc, "الفئة"), toArabic(doc, "الوصف"), toArabic(doc, "المبلغ")]],
    body:
      args.expensesDetail.length > 0
        ? args.expensesDetail.map((e) => [
            fmtDate(e.date),
            toArabic(doc, e.category),
            toArabic(doc, e.description),
            fmt(e.amount),
          ])
        : [["—", "—", toArabic(doc, "لا توجد مصروفات في هذه السنة"), "—"]],
    foot:
      args.expensesDetail.length > 0
        ? [
            [
              "",
              "",
              toArabic(doc, "الإجمالي"),
              fmt(args.yearTotals.generalExpenses),
            ],
          ]
        : undefined,
    styles: { font: "Amiri", fontSize: 9, fontStyle: "normal", halign: "right", cellPadding: 5 },
    headStyles: {
      font: "Amiri",
      fillColor: [201, 169, 97],
      textColor: 255,
      fontStyle: "normal",
      halign: "right",
    },
    footStyles: {
      font: "Amiri",
      fillColor: [250, 247, 240],
      textColor: [92, 74, 42],
      fontStyle: "normal",
      halign: "right",
    },
    theme: "grid",
  });

  // Section 5: Worker payments detail
  nextY = (doc as any).lastAutoTable.finalY + 30;
  if (nextY > 500) {
    doc.addPage();
    nextY = 60;
  }
  doc.setFontSize(13);
  doc.text(toArabic(doc, "تفاصيل مدفوعات العمال"), pageWidth - 40, nextY, { align: "right" });

  autoTable(doc, {
    startY: nextY + 10,
    head: [[toArabic(doc, "التاريخ"), toArabic(doc, "العامل"), toArabic(doc, "الفترة"), toArabic(doc, "المبلغ")]],
    body:
      args.workerPaymentsDetail.length > 0
        ? args.workerPaymentsDetail.map((w) => [
            fmtDate(w.date),
            toArabic(doc, w.worker),
            toArabic(doc, w.period),
            fmt(w.amount),
          ])
        : [["—", "—", toArabic(doc, "لا توجد مدفوعات في هذه السنة"), "—"]],
    foot:
      args.workerPaymentsDetail.length > 0
        ? [
            [
              "",
              "",
              toArabic(doc, "الإجمالي"),
              fmt(args.yearTotals.workerPayments),
            ],
          ]
        : undefined,
    styles: { font: "Amiri", fontSize: 9, fontStyle: "normal", halign: "right", cellPadding: 5 },
    headStyles: {
      font: "Amiri",
      fillColor: [201, 169, 97],
      textColor: 255,
      fontStyle: "normal",
      halign: "right",
    },
    footStyles: {
      font: "Amiri",
      fillColor: [250, 247, 240],
      textColor: [92, 74, 42],
      fontStyle: "normal",
      halign: "right",
    },
    theme: "grid",
  });

  addPageNumbers(doc);
  const comprehensiveFile = `financial-report-full-${args.year}.pdf`;
  doc.save(comprehensiveFile);
  exportedFiles.push(comprehensiveFile);

  return { usedArabicFont: Boolean(font.base64), fontSource: font.source, exportedFiles };
}